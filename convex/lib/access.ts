// Server-side access helpers. Never import this file from client code.
import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { hasRole, normalizeRole, type Role } from "./roles";

export type Viewer = {
  userId: Id<"users">;
  user: Doc<"users">;
  role: Role;
  email: string;
};

export type ActionViewer = {
  userId: Id<"users">;
  sessionId: Id<"authSessions">;
  role: Role;
  email: string;
};

// The caller, or null when anonymous, signed out (session deleted) or disabled.
export async function getViewer(ctx: QueryCtx | MutationCtx): Promise<Viewer | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const sessionId = await getAuthSessionId(ctx);
  if (!sessionId || !(await ctx.db.get(sessionId))) return null;
  const user = await ctx.db.get(userId);
  if (!user || user.disabled) return null;
  return {
    userId,
    user,
    role: normalizeRole(user.role),
    email: user.email ?? user.username ?? "",
  };
}

export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Viewer> {
  const viewer = await getViewer(ctx);
  if (!viewer) throw new ConvexError("UNAUTHENTICATED");
  return viewer;
}

export async function requireRole(ctx: QueryCtx | MutationCtx, min: Role): Promise<Viewer> {
  const viewer = await requireUser(ctx);
  if (!hasRole(viewer.role, min)) throw new ConvexError("FORBIDDEN");
  return viewer;
}

export async function requireRoleInAction(ctx: ActionCtx, min: Role): Promise<ActionViewer> {
  const viewer: ActionViewer | null = await ctx.runQuery(internal.users.viewerForAction, {});
  if (!viewer) throw new ConvexError("UNAUTHENTICATED");
  if (!hasRole(viewer.role, min)) throw new ConvexError("FORBIDDEN");
  return viewer;
}
