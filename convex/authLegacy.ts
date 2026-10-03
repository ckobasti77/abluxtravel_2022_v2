// Migration of pre-2026 accounts (SHA-256 hashes stored on users.passwordHash).
// Only customer accounts are migrated lazily at sign-in; legacy admin accounts
// never are (their hash is the password that was hardcoded in the old code).
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { sha256Hex, timingSafeEqualHex } from "./lib/passwords";
import { consumeRateLimit, RATE_LIMITS } from "./lib/rateLimit";

const PROVIDER = "password";

export async function findUserByEmail(
  ctx: QueryCtx,
  email: string
): Promise<Doc<"users"> | null> {
  const byEmail = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (byEmail) return byEmail;
  return await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", email))
    .first();
}

export async function findPasswordAccount(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", PROVIDER).eq("providerAccountId", email)
    )
    .first();
}

const isLegacyCustomerRole = (role: Doc<"users">["role"]) =>
  role === undefined || role === "user" || role === "customer";

export const hasPasswordAccount = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<boolean> =>
    (await findPasswordAccount(ctx, args.email)) !== null,
});

export const legacyUserExists = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await findUserByEmail(ctx, args.email);
    return Boolean(user?.passwordHash);
  },
});

export const verifyLegacyLogin = internalMutation({
  args: { email: v.string(), legacyHash: v.string() },
  handler: async (ctx, args) => {
    // Consume first and never throw afterwards, so the counter persists.
    const limit = await consumeRateLimit(
      ctx,
      `login-legacy:${(await sha256Hex(args.email)).slice(0, 32)}`,
      RATE_LIMITS.legacyLogin
    );
    if (!limit.ok) return { ok: false as const, error: "RATE_LIMITED" as const };

    const user = await findUserByEmail(ctx, args.email);
    if (
      !user ||
      !user.passwordHash ||
      user.disabled ||
      !isLegacyCustomerRole(user.role) ||
      (await findPasswordAccount(ctx, args.email)) !== null ||
      !timingSafeEqualHex(user.passwordHash, args.legacyHash)
    ) {
      return { ok: false as const, error: "INVALID" as const };
    }
    return { ok: true as const, userId: user._id };
  },
});

export const linkLegacyAccount = internalMutation({
  args: { userId: v.id("users"), email: v.string(), secretHash: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;
    const emailOwner = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (emailOwner && emailOwner._id !== user._id) return false;

    if (!(await findPasswordAccount(ctx, args.email))) {
      await ctx.db.insert("authAccounts", {
        userId: user._id,
        provider: PROVIDER,
        providerAccountId: args.email,
        secret: args.secretHash,
      });
    }
    await ctx.db.patch(user._id, {
      email: args.email,
      role: "customer",
      passwordHash: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});

// ---- QA helpers (internal, used by scripts/security/check-access.mjs) -------

export const qaSeedLegacyUser = internalMutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    if (await findUserByEmail(ctx, args.email)) return null;
    const now = Date.now();
    return await ctx.db.insert("users", {
      username: args.email,
      email: args.email,
      passwordHash: args.passwordHash,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const qaAccountState = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await findUserByEmail(ctx, args.email);
    return {
      userExists: user !== null,
      hasPasswordAccount: (await findPasswordAccount(ctx, args.email)) !== null,
      hasLegacyHash: Boolean(user?.passwordHash),
      role: user?.role ?? null,
      disabled: Boolean(user?.disabled),
    };
  },
});
