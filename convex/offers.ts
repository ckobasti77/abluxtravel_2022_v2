import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { syncVerskiCard } from "./lib/catalogProjection";
import { MANUAL_RELIGIOUS_SOURCE_SLUG } from "../lib/religious";

const sourceStatus = v.union(
  v.literal("planned"),
  v.literal("connected"),
  v.literal("syncing"),
  v.literal("paused")
);

const sanitizeTags = (tags: string[]) =>
  Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    )
  );

export const listSources = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("sources")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
    // Only public fields; internal sync config stays on the server.
    return rows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => ({
        _id: row._id,
        _creationTime: row._creationTime,
        slug: row.slug,
        name: row.name,
        status: row.status,
        syncEverySeconds: row.syncEverySeconds,
        lastSyncAt: row.lastSyncAt,
        isEnabled: row.isEnabled,
        updatedAt: row.updatedAt,
      }));
  },
});

export const listLiveBoard = query({
  args: {
    limit: v.optional(v.number()),
    destination: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
    const destination = args.destination?.trim().toLowerCase();
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_active_updated", (q) => q.eq("isActive", true))
      .order("desc")
      .take(250);

    const filteredOffers = !destination
      ? offers.slice(0, limit)
      : offers
          .filter((offer) => offer.destination.toLowerCase().includes(destination))
          .slice(0, limit);

    return Promise.all(
      filteredOffers.map(async (offer) => {
        const [pdfUrl, imageUrls] = await Promise.all([
          offer.pdfStorageId ? ctx.storage.getUrl(offer.pdfStorageId) : Promise.resolve(null),
          offer.imageStorageIds?.length
            ? Promise.all(
                offer.imageStorageIds.map(async (storageId) => {
                  const url = await ctx.storage.getUrl(storageId);
                  return url ?? "";
                })
              ).then((urls) => urls.filter(Boolean))
            : Promise.resolve([] as string[]),
        ]);

        // Internal import fields are not part of the public payload.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { rawSnapshot, normalizedHash, score, ...publicOffer } = offer;
        return {
          ...publicOffer,
          pdfUrl: pdfUrl ?? undefined,
          imageUrls,
        };
      })
    );
  },
});

export const listForNav = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_active_updated", (q) => q.eq("isActive", true))
      .order("desc")
      .take(250);

    return offers
      .filter((o) => o.navTitle && o.navTitle.trim().length > 0)
      .map((o) => ({
        _id: o._id,
        title: o.title,
        navTitle: o.navTitle!,
        externalId: o.externalId,
        sourceSlug: o.sourceSlug,
        tags: o.tags,
        destination: o.destination,
      }));
  },
});

export const upsertSource = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    status: sourceStatus,
    syncEverySeconds: v.number(),
    apiBaseUrl: v.optional(v.string()),
    webhookSecretLabel: v.optional(v.string()),
    isEnabled: v.boolean(),
    lastSyncAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "offers.upsertSource", targetTable: "sources", targetId: args.slug });
    const now = Date.now();
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }

    return ctx.db.insert("sources", { ...args, updatedAt: now });
  },
});

export const upsertOffer = mutation({
  args: {
    sourceSlug: v.string(),
    externalId: v.string(),
    title: v.string(),
    destination: v.string(),
    departureCity: v.optional(v.string()),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    seatsLeft: v.optional(v.number()),
    tags: v.array(v.string()),
    pdfStorageId: v.optional(v.id("_storage")),
    pdfFileName: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    clearPdf: v.optional(v.boolean()),
    navTitle: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    normalizedHash: v.string(),
    score: v.optional(v.number()),
    rawSnapshot: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "offers.upsertOffer", targetTable: "offers", targetId: `${args.sourceSlug}:${args.externalId}` });
    const now = Date.now();
    const existing = await ctx.db
      .query("offers")
      .withIndex("by_source_external", (q) =>
        q.eq("sourceSlug", args.sourceSlug).eq("externalId", args.externalId)
      )
      .unique();

    const { clearPdf, ...rest } = args;
    const payload = {
      ...rest,
      tags: sanitizeTags(args.tags),
      updatedAt: now,
    };

    if (clearPdf) {
      payload.pdfStorageId = undefined;
      payload.pdfFileName = undefined;
    }

    const offerId = existing?._id ?? (await ctx.db.insert("offers", payload));
    if (existing) await ctx.db.patch(existing._id, payload);
    if (args.sourceSlug === MANUAL_RELIGIOUS_SOURCE_SLUG) await syncVerskiCard(ctx, offerId);
    return offerId;
  },
});

export const deactivateOffer = mutation({
  args: {
    sourceSlug: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    await audit(ctx, viewer, { action: "offers.deactivateOffer", targetTable: "offers", targetId: `${args.sourceSlug}:${args.externalId}` });
    const existing = await ctx.db
      .query("offers")
      .withIndex("by_source_external", (q) =>
        q.eq("sourceSlug", args.sourceSlug).eq("externalId", args.externalId)
      )
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      isActive: false,
      updatedAt: Date.now(),
    });
    if (existing.sourceSlug === MANUAL_RELIGIOUS_SOURCE_SLUG) await syncVerskiCard(ctx, existing._id);
    return existing._id;
  },
});

