// Admin API for partner offers (editor). Lists, detail, ABLux overrides that
// survive re-imports, and bulk publish/hide/feature. Step 13 builds the UI.
// Ids arrive as strings and are normalized after the role check, so the
// access checker can call every function without fixtures.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { TRAVEL_TYPE_SLUGS } from "../lib/search/travel-types";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { computeIsPublic, effectiveFields } from "./lib/catalogCards";
import { recountPartnerCounts } from "./sync/ingest";

const stateV = v.union(v.literal("public"), v.literal("unpublished"), v.literal("hidden"), v.literal("inactive"), v.literal("removed"));
const bulkActionV = v.union(
  v.literal("publish"),
  v.literal("unpublish"),
  v.literal("hide"),
  v.literal("unhide"),
  v.literal("feature"),
  v.literal("unfeature")
);
const nullableString = v.optional(v.union(v.string(), v.null()));

const BULK_PATCH: Record<string, Partial<Pick<Doc<"offerCards">, "published" | "hidden" | "featured">>> = {
  publish: { published: true },
  unpublish: { published: false },
  hide: { hidden: true },
  unhide: { hidden: false },
  feature: { featured: true },
  unfeature: { featured: false },
};

const LIMITS = { title: 160, intro: 600, bulk: 200 };

async function cardOrThrow(ctx: QueryCtx | MutationCtx, rawId: string): Promise<Doc<"offerCards">> {
  const id = ctx.db.normalizeId("offerCards", rawId);
  const card = id ? await ctx.db.get(id) : null;
  if (!card) throw new ConvexError("NOT_FOUND");
  return card;
}

/** Slim admin row (no hashes, baselines or search text). */
function adminRow(card: Doc<"offerCards">) {
  return {
    _id: card._id,
    slug: card.slug,
    kind: card.kind,
    partnerSlug: card.partnerSlug,
    externalId: card.externalId,
    offerKind: card.offerKind,
    title: card.title,
    importedTitle: card.imported.title,
    place: card.place,
    countryName: card.countryName,
    travelTypes: card.travelTypes,
    nextDepartureDate: card.nextDepartureDate,
    departureCount: card.departureDates.length,
    priceKind: card.priceKind,
    priceFrom: card.priceFrom,
    priceOld: card.priceOld,
    priceBasis: card.priceBasis,
    currency: card.currency,
    coverUrl: card.coverUrl,
    organizerName: card.organizerName,
    listed: card.listed,
    isActive: card.isActive,
    published: card.published,
    hidden: card.hidden,
    featured: card.featured,
    isPublic: card.isPublic,
    hasOverrides: Boolean(card.overrides && Object.values(card.overrides).some((value) => value !== undefined)),
    firstSeenAt: card.firstSeenAt,
    updatedAt: card.updatedAt,
    removedAt: card.removedAt,
  };
}

/** Image the admin can show: storage copy first, then an https cover (http would be mixed content). */
async function coverPreview(ctx: QueryCtx, card: Doc<"offerCards">) {
  if (card.coverStorageId) return await ctx.storage.getUrl(card.coverStorageId);
  return card.coverUrl && /^https:\/\//i.test(card.coverUrl) ? card.coverUrl : null;
}

function matchesState(card: Doc<"offerCards">, state: string | undefined) {
  switch (state) {
    case "public":
      return card.isPublic;
    case "unpublished":
      return !card.published;
    case "hidden":
      return card.hidden;
    case "inactive":
      return card.listed && !card.isActive;
    case "removed":
      return !card.listed;
    default:
      return true;
  }
}

export const list = query({
  args: {
    q: v.optional(v.string()),
    partnerSlug: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("partner"), v.literal("ablux"))),
    state: v.optional(stateV),
    hasPrice: v.optional(v.boolean()),
    month: v.optional(v.string()),
    travelType: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const search = args.q?.trim().slice(0, 100);
    const page = search
      ? await ctx.db
          .query("offerCards")
          .withSearchIndex("search_text", (q) => {
            const base = q.search("searchText", search);
            const withPartner = args.partnerSlug ? base.eq("partnerSlug", args.partnerSlug) : base;
            return args.kind ? withPartner.eq("kind", args.kind) : withPartner;
          })
          .paginate(args.paginationOpts)
      : args.partnerSlug
        ? await ctx.db
            .query("offerCards")
            .withIndex("by_partner_external", (q) => q.eq("partnerSlug", args.partnerSlug!))
            .paginate(args.paginationOpts)
        : await ctx.db.query("offerCards").withIndex("by_updated").order("desc").paginate(args.paginationOpts);
    // Array fields (months, travel types) cannot be indexed: filter the page in memory.
    const items = page.page.filter(
      (card) =>
        (!args.kind || card.kind === args.kind) &&
        matchesState(card, args.state) &&
        (args.hasPrice === undefined || (card.priceKind === "from") === args.hasPrice) &&
        (!args.month || card.departureDates.some((date) => date.startsWith(args.month!))) &&
        (!args.travelType || card.travelTypes.includes(args.travelType))
    );
    const rows = await Promise.all(items.map(async (card) => ({ ...adminRow(card), coverPreview: await coverPreview(ctx, card) })));
    return { ...page, page: rows };
  },
});

export const get = query({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const card = await cardOrThrow(ctx, args.cardId);
    const detail = await ctx.db
      .query("offerDetails")
      .withIndex("by_card", (q) => q.eq("cardId", card._id))
      .unique();
    const meta = await ctx.db
      .query("offerSyncMeta")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", card.partnerSlug).eq("externalId", card.externalId))
      .unique();
    const changes = await ctx.db
      .query("offerChanges")
      .withIndex("by_card_at", (q) => q.eq("cardId", card._id))
      .order("desc")
      .take(20);
    const { searchText: _searchText, runBaseline: _runBaseline, ...cardFields } = card;
    void _searchText;
    void _runBaseline;
    return {
      card: { ...cardFields, overrides: card.overrides ?? {}, coverPreview: await coverPreview(ctx, card) },
      detail,
      meta: meta
        ? {
            detailFetchedAt: meta.detailFetchedAt,
            contentFetchedAt: meta.contentFetchedAt,
            lastSeenAt: meta.lastSeenAt,
            sourceModifiedAt: meta.sourceModifiedAt,
            parseErrorCount: meta.parseErrorCount,
          }
        : null,
      changes: changes.map((change) => ({
        type: change.type,
        at: change.at,
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        basis: change.basis,
        oldNextDeparture: change.oldNextDeparture,
        newNextDeparture: change.newNextDeparture,
      })),
    };
  },
});

/** ABLux overrides; `null` clears a field. Survives re-imports (sync never touches `overrides`). */
export const setOverrides = mutation({
  args: {
    cardId: v.string(),
    title: nullableString,
    intro: nullableString,
    travelTypes: v.optional(v.union(v.array(v.string()), v.null())),
    coverUrl: nullableString,
    coverStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const card = await cardOrThrow(ctx, args.cardId);
    const current = card.overrides ?? {};
    const pick = <T>(value: T | null | undefined, previous: T | undefined) => (value === null ? undefined : value === undefined ? previous : value);

    const title = pick(args.title?.trim(), current.title);
    if (title !== undefined && (title.length === 0 || title.length > LIMITS.title)) throw new ConvexError("INVALID_TITLE");
    const intro = pick(args.intro?.trim(), current.intro);
    if (intro !== undefined && intro.length > LIMITS.intro) throw new ConvexError("INVALID_INTRO");
    const travelTypes = pick(args.travelTypes, current.travelTypes);
    if (travelTypes && (travelTypes.length > 3 || travelTypes.some((slug) => !(TRAVEL_TYPE_SLUGS as string[]).includes(slug)))) {
      throw new ConvexError("INVALID_TRAVEL_TYPE");
    }
    const coverUrl = pick(args.coverUrl?.trim(), current.coverUrl);
    if (coverUrl !== undefined && !/^https:\/\/[^\s]+$/i.test(coverUrl)) throw new ConvexError("INVALID_COVER_URL");
    const coverStorageId = pick(args.coverStorageId, current.coverStorageId);

    const overrides = { title, intro: intro || undefined, travelTypes: travelTypes?.length ? travelTypes : undefined, coverUrl, coverStorageId };
    const effective = effectiveFields(card.imported, overrides);
    await ctx.db.patch(card._id, {
      overrides,
      title: effective.title,
      travelTypes: effective.travelTypes,
      coverUrl: effective.coverUrl,
      coverStorageId: effective.coverStorageId,
      updatedAt: Date.now(),
    });
    const changed = (["title", "intro", "travelTypes", "coverUrl", "coverStorageId"] as const).filter((key) => args[key] !== undefined);
    await audit(ctx, viewer, {
      action: "offer.overrides",
      targetTable: "offerCards",
      targetId: card._id,
      summary: `${card.partnerSlug}/${card.slug}: ${changed.join(", ") || "bez izmena"}`,
    });
    return { ok: true };
  },
});

export const bulkUpdate = mutation({
  args: { cardIds: v.array(v.string()), action: bulkActionV },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    if (args.cardIds.length > LIMITS.bulk) throw new ConvexError("TOO_MANY");
    const patch = BULK_PATCH[args.action];
    const partners = new Set<string>();
    let changed = 0;
    for (const rawId of new Set(args.cardIds)) {
      const id = ctx.db.normalizeId("offerCards", rawId);
      const card = id ? await ctx.db.get(id) : null;
      if (!card) continue;
      const next = { ...card, ...patch };
      const isPublic = computeIsPublic(next);
      if (next.published === card.published && next.hidden === card.hidden && next.featured === card.featured) continue;
      await ctx.db.patch(card._id, { published: next.published, hidden: next.hidden, featured: next.featured, isPublic, updatedAt: Date.now() });
      partners.add(card.partnerSlug);
      changed += 1;
    }
    for (const slug of partners) await recountPartnerCounts(ctx, slug);
    await audit(ctx, viewer, {
      action: `offer.bulk.${args.action}`,
      targetTable: "offerCards",
      summary: `${changed} ponuda (${[...partners].join(", ") || "-"})`,
    });
    // Copying featured covers to storage (D15) is wired in step 09 (sync/images).
    return { changed };
  },
});

/**
 * Hide (or show again) offers by slug from the CLI, e.g. imported cards with a wrong
 * country until the partner is read again: `npx convex run offerAdmin:setHiddenInternal
 * '{"slugs":["..."],"hidden":true}'`. Same flag as "Sakrij" / "Vrati na sajt" in admin.
 */
export const setHiddenInternal = internalMutation({
  args: { slugs: v.array(v.string()), hidden: v.boolean() },
  handler: async (ctx, args) => {
    const partners = new Set<string>();
    const changed: string[] = [];
    for (const slug of args.slugs.slice(0, LIMITS.bulk)) {
      const card = await ctx.db
        .query("offerCards")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!card || card.hidden === args.hidden) continue;
      const isPublic = computeIsPublic({ ...card, hidden: args.hidden });
      await ctx.db.patch(card._id, { hidden: args.hidden, isPublic, updatedAt: Date.now() });
      partners.add(card.partnerSlug);
      changed.push(slug);
    }
    for (const slug of partners) await recountPartnerCounts(ctx, slug);
    return { changed };
  },
});

export type OfferAdminRow = ReturnType<typeof adminRow>;
