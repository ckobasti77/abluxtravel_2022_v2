// Image copies to Convex storage (D15), database side: which images a partner
// still needs, the URL-keyed cache and attaching storage ids to cards.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { effectiveFields } from "../lib/catalogCards";
import { getPartnerConfig } from "../../scraper/registry";
import { dailyCap, usedLast24h } from "./orchestrator";

const COPY_POLICY_GALLERY = 3; // Dunav: cover + 3
const FEATURED_GALLERY = 5; // featured offers: cover + 5

export type ImageJob = { cardId: string; url: string; cover: boolean };

/** Jobs ordered covers first; plus the partner's remaining request budget for today. */
export const pendingImages = internalQuery({
  args: { partnerSlug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const partner = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.partnerSlug))
      .unique();
    const config = getPartnerConfig(args.partnerSlug);
    if (!partner || !config || !config.liveFetchAllowed) return { jobs: [] as ImageJob[], budget: 0, robotsCache: undefined };
    const cards = await ctx.db
      .query("offerCards")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", args.partnerSlug))
      .collect();
    const covers: ImageJob[] = [];
    const gallery: ImageJob[] = [];
    for (const card of cards) {
      if (!card.listed) continue;
      const wanted = config.imagePolicy === "copy" ? COPY_POLICY_GALLERY : card.featured ? FEATURED_GALLERY : -1;
      if (wanted < 0) continue;
      if (card.imported.coverUrl && !card.imported.coverStorageId) covers.push({ cardId: card._id, url: card.imported.coverUrl, cover: true });
      const detail = await ctx.db
        .query("offerDetails")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .unique();
      for (const image of (detail?.gallery ?? []).slice(0, wanted + 1)) {
        if (!image.url || image.storageId || image.url === card.imported.coverUrl) continue;
        gallery.push({ cardId: card._id, url: image.url, cover: false });
      }
    }
    const now = Date.now();
    const budget = Math.max(0, dailyCap(partner, config.dailyRequestCap) - (await usedLast24h(ctx, args.partnerSlug, now)));
    return { jobs: [...covers, ...gallery].slice(0, args.limit ?? 200), budget, robotsCache: partner.robotsCache };
  },
});

export const lookupImage = internalQuery({
  args: { urlHash: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("partnerImages")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", args.urlHash))
      .collect();
    return rows.find((row) => row.url === args.url)?.storageId ?? null;
  },
});

export const saveImage = internalMutation({
  args: {
    urlHash: v.string(),
    url: v.string(),
    partnerSlug: v.string(),
    storageId: v.id("_storage"),
    contentType: v.string(),
    bytes: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("partnerImages", { ...args, fetchedAt: Date.now() });
  },
});

/** Puts a stored copy on the card (cover) and/or the detail gallery entry with the same URL. */
export const attachStorage = internalMutation({
  args: { cardId: v.id("offerCards"), url: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return;
    if (card.imported.coverUrl === args.url && card.imported.coverStorageId !== args.storageId) {
      const imported = { ...card.imported, coverStorageId: args.storageId };
      const effective = effectiveFields(imported, card.overrides);
      await ctx.db.patch(card._id, { imported, coverUrl: effective.coverUrl, coverStorageId: effective.coverStorageId });
    }
    const detail = await ctx.db
      .query("offerDetails")
      .withIndex("by_card", (q) => q.eq("cardId", card._id))
      .unique();
    if (detail && detail.gallery.some((image) => image.url === args.url && image.storageId !== args.storageId)) {
      await ctx.db.patch(detail._id, {
        gallery: detail.gallery.map((image) => (image.url === args.url ? { ...image, storageId: args.storageId } : image)),
      });
    }
  },
});

export const saveRobots = internalMutation({
  args: { partnerSlug: v.string(), robotsCache: v.string() },
  handler: async (ctx, args) => {
    const partner = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.partnerSlug))
      .unique();
    if (partner) await ctx.db.patch(partner._id, { robotsCache: args.robotsCache });
  },
});

/** Image requests that did not produce a stored copy still count toward the partner's 24 h budget (D6). */
export const recordExtraRequests = internalMutation({
  args: { partnerSlug: v.string(), count: v.number() },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("syncRunItems")
      .withIndex("by_partner_started", (q) => q.eq("partnerSlug", args.partnerSlug))
      .order("desc")
      .first();
    if (latest) await ctx.db.patch(latest._id, { requestsUsed: latest.requestsUsed + Math.max(0, args.count) });
  },
});
