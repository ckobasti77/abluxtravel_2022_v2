import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();
  },
});

const clean = (value: string, max: number) => value.trim().slice(0, max);

/** Social links: empty clears the link; anything else must be an https address. */
const socialUrl = (value: string | undefined, previous: string | undefined) => {
  if (value === undefined) return previous;
  const url = clean(value, 300);
  if (url && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) throw new ConvexError("INVALID_URL");
  return url;
};

export const upsert = mutation({
  args: {
    workingHours: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    instagramUrl: v.string(),
    licenseNumber: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    const data = {
      key: "global" as const,
      workingHours: clean(args.workingHours, 200),
      address: clean(args.address, 200),
      phone: clean(args.phone, 60),
      email: clean(args.email, 160),
      instagramUrl: socialUrl(args.instagramUrl, "") ?? "",
      // Older clients do not send the license; keep the stored value then.
      licenseNumber:
        args.licenseNumber !== undefined ? clean(args.licenseNumber, 80) : existing?.licenseNumber,
      facebookUrl: socialUrl(args.facebookUrl, existing?.facebookUrl),
      tiktokUrl: socialUrl(args.tiktokUrl, existing?.tiktokUrl),
      youtubeUrl: socialUrl(args.youtubeUrl, existing?.youtubeUrl),
      updatedAt: Date.now(),
    };

    const id = existing ? existing._id : await ctx.db.insert("settings", data);
    if (existing) await ctx.db.patch(existing._id, data);
    await audit(ctx, viewer, { action: "settings.upsert", targetTable: "settings", targetId: id });
    return id;
  },
});
