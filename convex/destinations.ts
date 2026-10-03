import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";

export const listByTrip = query({
  // Public callers get active rows only; includeInactive is for editors.
  args: { tripId: v.id("trips"), includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.includeInactive) await requireRole(ctx, "editor");
    const rows = await ctx.db
      .query("destinations")
      .withIndex("by_trip_order", (q) => q.eq("tripId", args.tripId))
      .collect();
    const items = args.includeInactive ? rows : rows.filter((item) => item.isActive);

    items.sort((a, b) => a.order - b.order);

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        imageUrls: await Promise.all(
          item.imageStorageIds.map(async (id) => {
            const url = await ctx.storage.getUrl(id);
            return url ?? "";
          }),
        ),
      })),
    );
  },
});

export const listByPage = query({
  // Public callers get active rows only; includeInactive is for editors.
  args: { pageSlug: v.string(), includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.includeInactive) await requireRole(ctx, "editor");
    const rows = await ctx.db
      .query("destinations")
      .withIndex("by_page_order", (q) => q.eq("pageSlug", args.pageSlug))
      .collect();
    const items = args.includeInactive ? rows : rows.filter((item) => item.isActive);

    items.sort((a, b) => a.order - b.order);

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        imageUrls: await Promise.all(
          item.imageStorageIds.map(async (id) => {
            const url = await ctx.storage.getUrl(id);
            return url ?? "";
          }),
        ),
      })),
    );
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("destinations")),
    tripId: v.optional(v.id("trips")),
    pageSlug: v.optional(v.string()),
    offerType: v.optional(
      v.union(v.literal("own"), v.literal("subagency"))
    ),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    departureCity: v.optional(v.string()),
    durationLabel: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    partnerOfferCode: v.optional(v.string()),
    iframeUrl: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    contactNote: v.optional(v.string()),
    imageStorageIds: v.array(v.id("_storage")),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "destinations.upsert", targetTable: "destinations", targetId: args.id, summary: args.title });
    const { id, ...data } = args;
    if (!data.tripId && !data.pageSlug) {
      throw new Error("Destination must belong to a trip or a putovanja page.");
    }
    if (data.offerType === "subagency" && !data.iframeUrl?.trim()) {
      throw new Error("Subagency destination must include an iframe URL.");
    }

    const payload = {
      ...data,
      offerType: data.offerType,
      departureDate: data.departureDate?.trim() || undefined,
      returnDate: data.returnDate?.trim() || undefined,
      departureCity: data.departureCity?.trim() || undefined,
      durationLabel: data.durationLabel?.trim() || undefined,
      partnerName: data.partnerName?.trim() || undefined,
      partnerOfferCode: data.partnerOfferCode?.trim() || undefined,
      iframeUrl: data.iframeUrl?.trim() || undefined,
      externalUrl: data.externalUrl?.trim() || undefined,
      contactNote: data.contactNote?.trim() || undefined,
      updatedAt: Date.now(),
    };

    if (id) {
      await ctx.db.patch(id, payload);
      return id;
    }

    return ctx.db.insert("destinations", payload);
  },
});

export const remove = mutation({
  args: { id: v.id("destinations") },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "destinations.remove", targetTable: "destinations", targetId: args.id });
    await ctx.db.delete(args.id);
  },
});
