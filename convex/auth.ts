// Convex Auth: password sign-in and sign-up for ABLux.
// Roles live on the users document (owner > editor > customer) and are never
// taken from client parameters. Legacy SHA-256 customer hashes are verified
// once and rehashed with Scrypt (see authLegacy.ts).
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { DAY, OWNER_EMAIL } from "./lib/constants";
import {
  hashPassword,
  isValidEmail,
  legacyPasswordHash,
  normalizeEmail,
  normalizeName,
  validateNewPassword,
  verifyPassword,
} from "./lib/passwords";
import { RATE_LIMITS } from "./lib/rateLimit";
import { isStaffRole } from "./lib/roles";

const PROVIDER = "password";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const password = ConvexCredentials<DataModel>({
  id: PROVIDER,
  crypto: { hashSecret: hashPassword, verifySecret: verifyPassword },
  authorize: async (params, ctx): Promise<{ userId: Id<"users"> }> => {
    const flow = params.flow;
    const email = normalizeEmail(params.email);
    const secret = typeof params.password === "string" ? params.password : "";

    if (flow === "signUp") {
      if (typeof params.website === "string" && params.website.trim()) {
        throw new ConvexError("REJECTED");
      }
      const firstName = normalizeName(params.firstName);
      const lastName = normalizeName(params.lastName);
      if (
        !isValidEmail(email) ||
        firstName.length < 2 ||
        firstName.length > 60 ||
        lastName.length < 2 ||
        lastName.length > 60
      ) {
        throw new ConvexError("INVALID_INPUT");
      }
      validateNewPassword(secret);
      if (email === OWNER_EMAIL) throw new ConvexError("USER_EXISTS");

      const limit = await ctx.runMutation(internal.rateLimits.consume, {
        key: "signup:global",
        ...RATE_LIMITS.signupGlobal,
      });
      if (!limit.ok) throw new ConvexError("TOO_MANY_ATTEMPTS");

      const legacyExists: boolean = await ctx.runQuery(internal.authLegacy.legacyUserExists, {
        email,
      });
      if (legacyExists) throw new ConvexError("USER_EXISTS");

      const now = Date.now();
      try {
        const { user } = await createAccount(ctx, {
          provider: PROVIDER,
          account: { id: email, secret },
          profile: {
            email,
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            role: "customer",
            createdAt: now,
            updatedAt: now,
          },
          shouldLinkViaEmail: false,
          shouldLinkViaPhone: false,
        });
        if (user.disabled) throw new ConvexError("ACCOUNT_DISABLED");
        return { userId: user._id };
      } catch (error) {
        if (error instanceof ConvexError) throw error;
        throw new ConvexError(
          errorMessage(error).includes("already exists") ? "USER_EXISTS" : "INVALID_INPUT"
        );
      }
    }

    if (flow !== "signIn" || !isValidEmail(email) || !secret) {
      throw new ConvexError("INVALID_CREDENTIALS");
    }

    const hasAccount: boolean = await ctx.runQuery(internal.authLegacy.hasPasswordAccount, {
      email,
    });
    if (!hasAccount) {
      // Legacy customer: verify the old SHA-256 hash once, then rehash.
      const legacy = await ctx.runMutation(internal.authLegacy.verifyLegacyLogin, {
        email,
        legacyHash: await legacyPasswordHash(secret),
      });
      if (!legacy.ok) {
        throw new ConvexError(
          legacy.error === "RATE_LIMITED" ? "TOO_MANY_ATTEMPTS" : "INVALID_CREDENTIALS"
        );
      }
      const linked: boolean = await ctx.runMutation(internal.authLegacy.linkLegacyAccount, {
        userId: legacy.userId,
        email,
        secretHash: await hashPassword(secret),
      });
      if (!linked) throw new ConvexError("INVALID_CREDENTIALS");
    }

    let retrieved;
    try {
      retrieved = await retrieveAccount(ctx, {
        provider: PROVIDER,
        account: { id: email, secret },
      });
    } catch (error) {
      throw new ConvexError(
        errorMessage(error).includes("TooManyFailedAttempts")
          ? "TOO_MANY_ATTEMPTS"
          : "INVALID_CREDENTIALS"
      );
    }
    if (!retrieved?.user) throw new ConvexError("INVALID_CREDENTIALS");
    if (retrieved.user.disabled) throw new ConvexError("ACCOUNT_DISABLED");
    return { userId: retrieved.user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
  session: {
    totalDurationMs: 14 * DAY,
    inactiveDurationMs: 7 * DAY,
  },
  signIn: {
    // Library spelling. Failed password attempts per account per hour.
    maxFailedAttempsPerHour: 10,
  },
  callbacks: {
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user || user.disabled) throw new ConvexError("ACCOUNT_DISABLED");
      if (isStaffRole(user.role)) {
        await ctx.db.insert("auditLog", {
          actorId: userId,
          actorEmail: user.email,
          actorRole: user.role,
          action: "auth.signIn",
          at: Date.now(),
        });
      }
    },
  },
});
