import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireRole } from "./lib/access";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "owner");
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 50), 1), 200);
    return await ctx.db.query("auditLog").withIndex("by_at").order("desc").take(limit);
  },
});
