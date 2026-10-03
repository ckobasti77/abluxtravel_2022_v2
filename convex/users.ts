import {
  getAuthSessionId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { findPasswordAccount, findUserByEmail } from "./authLegacy";
import { getViewer, requireRole, requireRoleInAction, type ActionViewer } from "./lib/access";
import { audit } from "./lib/audit";
import { OWNER_EMAIL } from "./lib/constants";
import { profileNames } from "./lib/profile";
import {
  deriveNameFromEmail,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  validateNewPassword,
} from "./lib/passwords";
import { hasRole, normalizeRole, type Role } from "./lib/roles";

const PROVIDER = "password";
const roleValidator = v.union(v.literal("owner"), v.literal("editor"), v.literal("customer"));

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function activeOwnerCount(ctx: MutationCtx) {
  const owners = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "owner"))
    .take(50);
  return owners.filter((owner) => !owner.disabled).length;
}

// ---- Public -----------------------------------------------------------------

export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;
    const names = profileNames(viewer.user);
    return {
      _id: viewer.userId,
      ...names,
      role: viewer.role,
      isStaff: hasRole(viewer.role, "editor"),
      isOwner: viewer.role === "owner",
    };
  },
});

export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const viewer = await requireRoleInAction(ctx, "customer");
    try {
      await retrieveAccount(ctx, {
        provider: PROVIDER,
        account: { id: viewer.email, secret: args.currentPassword },
      });
    } catch (error) {
      throw new ConvexError(
        errorMessage(error).includes("TooManyFailedAttempts")
          ? "TOO_MANY_ATTEMPTS"
          : "INVALID_CURRENT_PASSWORD"
      );
    }
    validateNewPassword(args.newPassword);
    await modifyAccountCredentials(ctx, {
      provider: PROVIDER,
      account: { id: viewer.email, secret: args.newPassword },
    });
    const sessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, {
      userId: viewer.userId,
      except: sessionId ? [sessionId] : [],
    });
    await ctx.runMutation(internal.users.logAudit, {
      actorId: viewer.userId,
      action: "users.changePassword",
      targetTable: "users",
      targetId: viewer.userId,
    });
    return { ok: true };
  },
});

// ---- Staff ------------------------------------------------------------------

/** Active staff (owner + editor) for the inbox assignee picker: names only, no e-mails. */
export const staffList = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const staff: { _id: Id<"users">; displayName: string; role: Role }[] = [];
    for (const role of ["owner", "editor"] as const) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", role))
        .take(100);
      for (const user of users) {
        if (!user.disabled) staff.push({ _id: user._id, displayName: profileNames(user).displayName, role });
      }
    }
    return staff.sort((a, b) => a.displayName.localeCompare(b.displayName, "sr"));
  },
});

// ---- Owner only -------------------------------------------------------------

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "owner");
    const users = await ctx.db.query("users").take(500);
    return users
      .map((user) => {
        const role = normalizeRole(user.role);
        const { email, displayName } = profileNames(user);
        return {
          _id: user._id,
          email,
          displayName,
          role,
          disabled: Boolean(user.disabled),
          createdAt: user.createdAt ?? user._creationTime,
        };
      })
      .sort((a, b) => {
        const rank = (role: Role) => (role === "owner" ? 0 : role === "editor" ? 1 : 2);
        return rank(a.role) - rank(b.role) || a.email.localeCompare(b.email);
      });
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "owner");
    if (args.userId === viewer.userId) throw new ConvexError("FORBIDDEN");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("NOT_FOUND");
    const previous = normalizeRole(target.role);
    if (previous === "owner" && args.role !== "owner" && (await activeOwnerCount(ctx)) <= 1) {
      throw new ConvexError("LAST_OWNER");
    }
    await ctx.db.patch(args.userId, { role: args.role, updatedAt: Date.now() });
    await audit(ctx, viewer, {
      action: "users.setRole",
      targetTable: "users",
      targetId: args.userId,
      summary: `${previous} → ${args.role}`,
    });
    return args.userId;
  },
});

export const setDisabled = action({
  args: { userId: v.id("users"), disabled: v.boolean() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const viewer = await requireRoleInAction(ctx, "owner");
    if (args.userId === viewer.userId) throw new ConvexError("FORBIDDEN");
    await ctx.runMutation(internal.users.setDisabledInternal, {
      actorId: viewer.userId,
      userId: args.userId,
      disabled: args.disabled,
    });
    if (args.disabled) await invalidateSessions(ctx, { userId: args.userId });
    return { ok: true };
  },
});

// ---- Internal ---------------------------------------------------------------

export const viewerForAction = internalQuery({
  args: {},
  handler: async (ctx): Promise<ActionViewer | null> => {
    const viewer = await getViewer(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!viewer || !sessionId) return null;
    return { userId: viewer.userId, sessionId, role: viewer.role, email: viewer.email };
  },
});

export const setDisabledInternal = internalMutation({
  args: { actorId: v.id("users"), userId: v.id("users"), disabled: v.boolean() },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("NOT_FOUND");
    if (
      args.disabled &&
      normalizeRole(target.role) === "owner" &&
      !target.disabled &&
      (await activeOwnerCount(ctx)) <= 1
    ) {
      throw new ConvexError("LAST_OWNER");
    }
    await ctx.db.patch(args.userId, { disabled: args.disabled, updatedAt: Date.now() });
    const actor = await ctx.db.get(args.actorId);
    await ctx.db.insert("auditLog", {
      actorId: args.actorId,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: "users.setDisabled",
      targetTable: "users",
      targetId: args.userId,
      summary: args.disabled ? "isključen" : "uključen",
      at: Date.now(),
    });
  },
});

export const logAudit = internalMutation({
  args: {
    actorId: v.optional(v.id("users")),
    action: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = args.actorId ? await ctx.db.get(args.actorId) : null;
    await ctx.db.insert("auditLog", {
      actorId: args.actorId,
      actorEmail: actor?.email ?? (args.actorId ? undefined : "cli"),
      actorRole: actor?.role,
      action: args.action,
      targetTable: args.targetTable,
      targetId: args.targetId,
      summary: args.summary,
      at: Date.now(),
    });
  },
});

export const findForBootstrap = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ userId: Id<"users"> | null; hasAccount: boolean }> => {
    const user = await findUserByEmail(ctx, args.email);
    const account = await findPasswordAccount(ctx, args.email);
    return { userId: user?._id ?? account?.userId ?? null, hasAccount: account !== null };
  },
});

export const applyBootstrapProfile = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    email: v.string(),
    role: roleValidator,
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    const now = Date.now();
    const profile = {
      email: args.email,
      username: args.email,
      name: `${args.firstName} ${args.lastName}`.trim(),
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      disabled: false,
      passwordHash: undefined,
      updatedAt: now,
    };
    if (args.userId) {
      await ctx.db.patch(args.userId, profile);
      return args.userId;
    }
    return await ctx.db.insert("users", { ...profile, createdAt: now });
  },
});

export const insertPasswordAccount = internalMutation({
  args: { userId: v.id("users"), email: v.string(), secretHash: v.string() },
  handler: async (ctx, args) => {
    if (await findPasswordAccount(ctx, args.email)) return;
    await ctx.db.insert("authAccounts", {
      userId: args.userId,
      provider: PROVIDER,
      providerAccountId: args.email,
      secret: args.secretHash,
    });
  },
});

// Creates or updates a staff/QA account with a password generated locally by
// scripts/bootstrap-staff.mjs. Replaces the old public ensureAdminUser.
export const bootstrapStaffAccount = internalAction({
  args: {
    email: v.string(),
    role: roleValidator,
    password: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ email: string; role: Role; created: boolean }> => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) throw new ConvexError("INVALID_INPUT");
    if (args.password.length < 16) throw new ConvexError("WEAK_PASSWORD");

    const found = await ctx.runQuery(internal.users.findForBootstrap, { email });
    const derived = deriveNameFromEmail(email);
    const isOwnerEmail = email === OWNER_EMAIL;
    const userId: Id<"users"> = await ctx.runMutation(internal.users.applyBootstrapProfile, {
      userId: found.userId ?? undefined,
      email,
      role: args.role,
      firstName: args.firstName ?? (isOwnerEmail ? "ABLux" : derived.firstName),
      lastName: args.lastName ?? (isOwnerEmail ? "Travel" : derived.lastName),
    });

    if (found.hasAccount) {
      await modifyAccountCredentials(ctx, {
        provider: PROVIDER,
        account: { id: email, secret: args.password },
      });
    } else {
      await ctx.runMutation(internal.users.insertPasswordAccount, {
        userId,
        email,
        secretHash: await hashPassword(args.password),
      });
    }
    await invalidateSessions(ctx, { userId });
    await ctx.runMutation(internal.users.logAudit, {
      action: "users.bootstrap",
      targetTable: "users",
      targetId: userId,
      summary: args.role,
    });
    return { email, role: args.role, created: found.userId === null };
  },
});

// One-time, idempotent: maps legacy roles. Run with
// `npx convex run users:migrateLegacyUsers` (DEV) after deploying this code.
export const migrateLegacyUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(1000);
    const counts = {
      scanned: users.length,
      toCustomer: 0,
      owner: 0,
      disabledLegacyAdmins: 0,
      emailBackfilled: 0,
      conflicts: 0,
    };
    for (const user of users) {
      const patch: Partial<Doc<"users">> = {};
      const identity = normalizeEmail(user.email ?? user.username ?? "");

      if (user.role === "user") {
        patch.role = "customer";
        counts.toCustomer += 1;
      } else if (user.role === "admin") {
        if (identity === OWNER_EMAIL) {
          patch.role = "owner";
          counts.owner += 1;
        } else {
          patch.role = "customer";
          patch.disabled = true;
          counts.disabledLegacyAdmins += 1;
        }
      }

      if (!user.email && user.username?.includes("@")) {
        const email = normalizeEmail(user.username);
        const taken = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .first();
        if (taken && taken._id !== user._id) counts.conflicts += 1;
        else {
          patch.email = email;
          counts.emailBackfilled += 1;
        }
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, { ...patch, updatedAt: Date.now() });
      }
    }
    await ctx.db.insert("auditLog", {
      actorEmail: "cli",
      action: "users.migrateLegacyUsers",
      summary: JSON.stringify(counts),
      at: Date.now(),
    });
    return counts;
  },
});
