import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    return await ctx.storage.generateUploadUrl();
  },
});

export const deleteById = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await ctx.storage.delete(args.storageId);
    await audit(ctx, viewer, {
      action: "files.deleteById",
      targetTable: "_storage",
      targetId: args.storageId,
    });
  },
});
