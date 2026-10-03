// Public catalog API (plan 06 §15): /ponude, /ponude/[slug], search counts,
// sitemap. Returns only public cards and never internal fields (hashes,
// baselines, warnings, commission, partner contacts). No auth needed.
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import { syncTripCard, syncVerskiCard, ABLUX_ORGANIZER, ABLUX_PARTNER_SLUG } from "./lib/catalogProjection";
import { transportV } from "./lib/syncValidators";
import { todayBelgrade } from "../scraper/core/time";
import { MANUAL_RELIGIOUS_SOURCE_SLUG } from "../lib/religious";
import { TRAVEL_TYPES, type TravelTypeSlug } from "../lib/search/travel-types";
import { PAGE_SIZE, searchCards, type CatalogFilters, type SearchContext } from "../lib/catalog/filters";

const MAX_CANDIDATES = 5000;

const filtersV = {
  tip: v.optional(v.string()),
  zemlja: v.optional(v.string()),
  mesec: v.optional(v.string()),
  prevoz: v.optional(transportV),
  trajanje: v.optional(v.union(v.literal("1-3"), v.literal("4-7"), v.literal("8-14"), v.literal("15+"))),
  cenaOd: v.optional(v.number()),
  cenaDo: v.optional(v.number()),
  polazak: v.optional(v.string()),
  q: v.optional(v.string()),
  vrsta: v.optional(v.union(v.literal("ablux"), v.literal("partner"))),
  partner: v.optional(v.string()),
};

type CardDoc = Doc<"offerCards">;

type PartnerInfo = { name: string; defaultCity?: string; license?: string; organizerName?: string };

async function partnerDirectory(ctx: QueryCtx): Promise<Map<string, PartnerInfo>> {
  const rows = await ctx.db.query("sources").collect();
  const map = new Map<string, PartnerInfo>();
  for (const row of rows) {
    map.set(row.slug, {
      name: row.name,
      defaultCity: row.defaultDepartureCity,
      license: row.organizerLicense,
      organizerName: row.organizerName,
    });
  }
  return map;
}

function searchContext(partners: Map<string, PartnerInfo>): SearchContext {
  const defaultCity: Record<string, string | undefined> = {};
  const partnerNames: Record<string, string> = { ablux: ABLUX_ORGANIZER };
  for (const [slug, info] of partners) {
    defaultCity[slug] = info.defaultCity;
    partnerNames[slug] = info.name;
  }
  return { defaultCity, partnerNames };
}

async function publicCards(ctx: QueryCtx) {
  const cards = await ctx.db
    .query("offerCards")
    .withIndex("by_public_departure", (q) => q.eq("isPublic", true))
    .take(MAX_CANDIDATES);
  return { cards, truncated: cards.length === MAX_CANDIDATES };
}

function isSafeImageUrl(url: string | undefined): url is string {
  return Boolean(url && url.startsWith("https://"));
}

async function coverOf(ctx: QueryCtx, card: CardDoc): Promise<string | undefined> {
  if (card.coverStorageId) {
    const url = await ctx.storage.getUrl(card.coverStorageId);
    if (url) return url;
  }
  // http:// covers are never shown (mixed content); they need a storage copy first.
  return isSafeImageUrl(card.coverUrl) ? card.coverUrl : undefined;
}

/** Organizer license shown on a card only when the organizer is the partner itself. */
function licenseFor(card: CardDoc, partner: PartnerInfo | undefined): string | undefined {
  if (!partner?.license) return undefined;
  const organizer = card.organizerName.trim().toLowerCase();
  const own = [partner.organizerName, partner.name].filter(Boolean).map((name) => (name as string).trim().toLowerCase());
  return own.includes(organizer) ? partner.license : undefined;
}

async function toPublicCard(ctx: QueryCtx, card: CardDoc, partners: Map<string, PartnerInfo>) {
  const partner = partners.get(card.partnerSlug);
  return {
    id: card._id,
    kind: card.kind,
    slug: card.slug,
    href: card.kind === "ablux" && card.href ? card.href : `/ponude/${card.slug}`,
    title: card.title,
    intro: card.overrides?.intro,
    place: card.place,
    region: card.region,
    countryName: card.countryName,
    countrySlug: card.countrySlug,
    travelTypes: card.travelTypes,
    offerKind: card.offerKind,
    transports: card.transports,
    nights: card.nights,
    nightsMax: card.nightsMax,
    days: card.days,
    stars: card.stars,
    board: card.board,
    availabilityMode: card.availabilityMode,
    nextDepartureDate: card.nextDepartureDate,
    departureCount: card.departureDates.length,
    departureMonths: [...new Set(card.departureDates.map((date) => date.slice(0, 7)))],
    departureCities: card.departureCities.slice(0, 4),
    priceKind: card.priceKind,
    priceFrom: card.priceFrom,
    priceOld: card.priceOld,
    priceBasis: card.priceBasis,
    priceNote: card.priceNote,
    currency: card.currency,
    coverUrl: await coverOf(ctx, card),
    organizerName: card.organizerName,
    organizerLicense: licenseFor(card, partner),
    partnerSlug: card.partnerSlug,
    partnerName: card.kind === "ablux" ? ABLUX_ORGANIZER : (partner?.name ?? card.organizerName),
    badges: card.badges,
    featured: card.featured,
    isPublic: card.isPublic,
    updatedAt: card.updatedAt,
  };
}

export type PublicCard = Awaited<ReturnType<typeof toPublicCard>>;

export const search = query({
  args: {
    ...filtersV,
    sort: v.optional(v.union(v.literal("polazak"), v.literal("cena"), v.literal("novo"))),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sort, page: rawPage, pageSize: rawSize, ...filters } = args;
    const pageSize = Math.min(Math.max(Math.floor(rawSize ?? PAGE_SIZE), 1), 240);
    const [{ cards, truncated }, partners] = await Promise.all([publicCards(ctx), partnerDirectory(ctx)]);
    const result = searchCards(cards, filters as CatalogFilters, sort ?? "polazak", searchContext(partners));
    const pageCount = Math.max(Math.ceil(result.total / pageSize), 1);
    const page = Math.min(Math.max(Math.floor(rawPage ?? 1), 1), pageCount);
    const slice = result.items.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: await Promise.all(slice.map((card) => toPublicCard(ctx, card, partners))),
      total: result.total,
      page,
      pageCount,
      pageSize,
      truncated,
      facets: result.facets,
    };
  },
});

/** Live count + facets without cards (search pill, mobile filter sheet). */
export const count = query({
  args: filtersV,
  handler: async (ctx, args) => {
    const [{ cards }, partners] = await Promise.all([publicCards(ctx), partnerDirectory(ctx)]);
    const result = searchCards(cards, args as CatalogFilters, "polazak", searchContext(partners));
    return { total: result.total, facets: result.facets };
  },
});

export const countsByTravelType = query({
  args: {},
  handler: async (ctx) => {
    const { cards } = await publicCards(ctx);
    const counts = Object.fromEntries(TRAVEL_TYPES.map((type) => [type.slug, 0])) as Record<TravelTypeSlug, number>;
    for (const card of cards) {
      for (const type of new Set(card.travelTypes)) {
        if (type in counts) counts[type as TravelTypeSlug] += 1;
      }
    }
    return counts;
  },
});

export const countsByCountry = query({
  args: {},
  handler: async (ctx) => {
    const { cards } = await publicCards(ctx);
    const byCountry = new Map<string, { countrySlug: string; countryName: string; count: number; priceFrom?: number }>();
    for (const card of cards) {
      if (!card.countrySlug || !card.countryName) continue;
      const entry = byCountry.get(card.countrySlug) ?? { countrySlug: card.countrySlug, countryName: card.countryName, count: 0 };
      entry.count += 1;
      if (card.priceFrom && card.currency === "EUR" && card.priceBasis === "per_person") {
        entry.priceFrom = Math.min(entry.priceFrom ?? Infinity, card.priceFrom);
      }
      byCountry.set(card.countrySlug, entry);
    }
    return [...byCountry.values()].sort((a, b) => b.count - a.count);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const card = await ctx.db
      .query("offerCards")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.slice(0, 120)))
      .unique();
    // Hidden, unpublished or switched-off partner offers do not exist publicly.
    if (!card || card.hidden || !card.published || !card.partnerEnabled) return null;
    const partners = await partnerDirectory(ctx);
    const publicCard = await toPublicCard(ctx, card, partners);
    if (card.kind === "ablux") return { card: publicCard, detail: null, partner: null, notice: undefined };

    const notice: "removed" | "expired" | undefined = !card.listed ? "removed" : !card.isActive ? "expired" : undefined;
    const detailDoc = await ctx.db
      .query("offerDetails")
      .withIndex("by_card", (q) => q.eq("cardId", card._id))
      .unique();
    const source = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", card.partnerSlug))
      .unique();
    const today = todayBelgrade(Date.now());

    const detail = detailDoc
      ? {
          sourceUrl: detailDoc.sourceUrl,
          subtitle: detailDoc.subtitle,
          descriptionHtml: detailDoc.descriptionHtml,
          program: detailDoc.program,
          included: detailDoc.included,
          excluded: detailDoc.excluded,
          notesHtml: detailDoc.notesHtml,
          departures: detailDoc.departures
            .filter((departure) => departure.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date) || (a.price ?? Infinity) - (b.price ?? Infinity)),
          supplements: detailDoc.supplements,
          gallery: (
            await Promise.all(
              detailDoc.gallery.map(async (image) => {
                const url = image.storageId ? await ctx.storage.getUrl(image.storageId) : null;
                const src = url ?? (isSafeImageUrl(image.url) ? image.url : undefined);
                return src ? { src, alt: image.alt } : null;
              })
            )
          ).filter((image): image is { src: string; alt: string | undefined } => image !== null),
          organizer: {
            name: detailDoc.organizer.name || card.organizerName,
            license: detailDoc.organizer.license ?? publicCard.organizerLicense,
            termsUrl: detailDoc.organizer.termsUrl ?? source?.termsUrl,
          },
          priceListLabel: detailDoc.priceListLabel,
          documents: detailDoc.documents,
          geo: detailDoc.geo,
          facts: detailDoc.facts,
          updatedAt: detailDoc.updatedAt,
        }
      : null;

    const partner = source
      ? {
          slug: source.slug,
          name: source.name,
          logoPath: source.logoPath,
          website: source.website,
          organizerLicense: source.organizerLicense,
          termsUrl: source.termsUrl,
        }
      : null;

    return { card: publicCard, detail, partner, notice };
  },
});

/** Same country first, then a shared travel type; nearest departures first. */
export const similar = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 4), 1), 12);
    const card = await ctx.db
      .query("offerCards")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.slice(0, 120)))
      .unique();
    if (!card) return [];
    const picked: CardDoc[] = [];
    const seen = new Set<Id<"offerCards">>([card._id]);
    const add = (candidate: CardDoc) => {
      if (picked.length >= limit || seen.has(candidate._id)) return;
      seen.add(candidate._id);
      picked.push(candidate);
    };
    if (card.countrySlug) {
      const sameCountry = await ctx.db
        .query("offerCards")
        .withIndex("by_public_country_departure", (q) => q.eq("isPublic", true).eq("countrySlug", card.countrySlug))
        .take(limit + 1);
      sameCountry.forEach(add);
    }
    if (picked.length < limit) {
      const nearest = await ctx.db
        .query("offerCards")
        .withIndex("by_public_departure", (q) => q.eq("isPublic", true))
        .take(400);
      nearest.filter((candidate) => candidate.travelTypes.some((type) => card.travelTypes.includes(type))).forEach(add);
    }
    const partners = await partnerDirectory(ctx);
    return Promise.all(picked.map((candidate) => toPublicCard(ctx, candidate, partners)));
  },
});

/** Featured offers (homepage); falls back to the nearest departures with a cover. */
export const featured = query({
  args: { limit: v.optional(v.number()), tip: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 6), 1), 24);
    const matchesType = (card: CardDoc) => !args.tip || card.travelTypes.includes(args.tip);
    const featuredCards = (
      await ctx.db
        .query("offerCards")
        .withIndex("by_public_featured", (q) => q.eq("isPublic", true).eq("featured", true))
        .take(200)
    ).filter(matchesType);
    let picked = featuredCards.slice(0, limit);
    if (picked.length < limit) {
      const nearest = await ctx.db
        .query("offerCards")
        .withIndex("by_public_departure", (q) => q.eq("isPublic", true))
        .take(400);
      const ids = new Set(picked.map((card) => card._id));
      const fill = nearest.filter((card) => !ids.has(card._id) && matchesType(card) && (card.coverStorageId || isSafeImageUrl(card.coverUrl)));
      picked = [...picked, ...fill.slice(0, limit - picked.length)];
    }
    const partners = await partnerDirectory(ctx);
    return Promise.all(picked.map((card) => toPublicCard(ctx, card, partners)));
  },
});

/**
 * Destination pages (/putovanja, /destinacije): every country with public
 * offers, its places, the lowest "od" price per person in EUR and one cover.
 */
export const destinationIndex = query({
  args: {},
  handler: async (ctx) => {
    const { cards } = await publicCards(ctx);
    type Entry = {
      countrySlug: string;
      countryName: string;
      count: number;
      priceFrom?: number;
      places: Map<string, number>;
      types: Map<string, number>;
      coverCard?: CardDoc;
      nextDeparture?: string;
    };
    const byCountry = new Map<string, Entry>();
    const today = todayBelgrade(Date.now());
    for (const card of cards) {
      if (!card.countrySlug || !card.countryName) continue;
      const entry: Entry =
        byCountry.get(card.countrySlug) ??
        { countrySlug: card.countrySlug, countryName: card.countryName, count: 0, places: new Map(), types: new Map() };
      entry.count += 1;
      if (card.priceFrom && card.currency === "EUR" && card.priceBasis === "per_person") {
        entry.priceFrom = Math.min(entry.priceFrom ?? Infinity, card.priceFrom);
      }
      // Some partners leave a URL fragment ("/kriopigi"); merge places case-insensitively.
      const rawPlace = card.place?.replace(/^[\s/]+/, "").trim();
      if (rawPlace) {
        const place = rawPlace.charAt(0).toLocaleUpperCase("sr") + rawPlace.slice(1);
        entry.places.set(place, (entry.places.get(place) ?? 0) + 1);
      }
      for (const type of new Set(card.travelTypes)) entry.types.set(type, (entry.types.get(type) ?? 0) + 1);
      if (!entry.coverCard && (card.coverStorageId || isSafeImageUrl(card.coverUrl))) entry.coverCard = card;
      const next = card.departureDates.find((date) => date >= today);
      if (next && (!entry.nextDeparture || next < entry.nextDeparture)) entry.nextDeparture = next;
      byCountry.set(card.countrySlug, entry);
    }
    const sorted = [...byCountry.values()].sort((a, b) => b.count - a.count || a.countryName.localeCompare(b.countryName, "sr"));
    return Promise.all(
      sorted.map(async (entry) => ({
        countrySlug: entry.countrySlug,
        countryName: entry.countryName,
        count: entry.count,
        priceFrom: entry.priceFrom ?? null,
        nextDeparture: entry.nextDeparture ?? null,
        coverUrl: entry.coverCard ? ((await coverOf(ctx, entry.coverCard)) ?? null) : null,
        places: [...entry.places.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sr"))
          .slice(0, 8)
          .map(([name, count]) => ({ name, count })),
        travelTypes: [...entry.types.entries()].sort((a, b) => b[1] - a[1]).map(([slug, count]) => ({ slug, count })),
      }))
    );
  },
});

/**
 * Homepage "Uskoro polaze": the nearest future departures from ABLux programs
 * and partner offers, at most two per organizer so one agency does not fill the row.
 */
export const upcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 6), 1), 12);
    // From tomorrow: a departure today can no longer be booked.
    const fromDate = todayBelgrade(Date.now() + 24 * 60 * 60 * 1000);
    const candidates = await ctx.db
      .query("offerCards")
      .withIndex("by_public_departure", (q) => q.eq("isPublic", true))
      .take(600);
    const dated = candidates
      .map((card) => ({ card, next: card.departureDates.find((date) => date >= fromDate) }))
      .filter((entry): entry is { card: CardDoc; next: string } => Boolean(entry.next))
      .sort((a, b) => a.next.localeCompare(b.next));

    const perPartner = new Map<string, number>();
    const picked: { card: CardDoc; next: string }[] = [];
    for (const entry of dated) {
      const used = perPartner.get(entry.card.partnerSlug) ?? 0;
      if (used >= 2) continue;
      perPartner.set(entry.card.partnerSlug, used + 1);
      picked.push(entry);
      if (picked.length === limit) break;
    }

    const partners = await partnerDirectory(ctx);
    return Promise.all(
      picked.map(async ({ card, next }) => ({ ...(await toPublicCard(ctx, card, partners)), nextDepartureDate: next }))
    );
  },
});

/**
 * Homepage partner strip ("17 agencija, jedan potpis"): every partner agency
 * with its live public offer count. Internal sync state is never returned;
 * partners still waiting for permission are only marked as `waiting`.
 */
export const partnerStrip = query({
  args: {},
  handler: async (ctx) => {
    const [{ cards }, sources] = await Promise.all([publicCards(ctx), ctx.db.query("sources").collect()]);
    const counts = new Map<string, number>();
    for (const card of cards) counts.set(card.partnerSlug, (counts.get(card.partnerSlug) ?? 0) + 1);

    const partners = sources
      .filter((source) => source.kind !== "internal" && source.slug !== MANUAL_RELIGIOUS_SOURCE_SLUG && source.status !== "planned")
      .map((source) => ({
        slug: source.slug,
        name: source.name,
        number: source.number ?? null,
        logoPath: source.logoPath?.startsWith("/") ? source.logoPath : null,
        count: source.isEnabled ? (counts.get(source.slug) ?? 0) : 0,
        waiting: source.status === "blocked" || !source.isEnabled,
      }))
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99) || a.name.localeCompare(b.name, "sr"));

    return { partners, abluxCount: counts.get(ABLUX_PARTNER_SLUG) ?? 0, total: cards.length };
  },
});

/** Public partner offers for the sitemap (ABLux cards point to their own pages). */
export const sitemapEntries = query({
  args: {},
  handler: async (ctx) => {
    const { cards } = await publicCards(ctx);
    return cards.map((card) => ({
      path: card.kind === "ablux" && card.href ? card.href : `/ponude/${card.slug}`,
      kind: card.kind,
      updatedAt: card.updatedAt,
    }));
  },
});

/** Backfill the ABLux projection: `npx convex run catalog:backfillAbluxInternal`. Idempotent. */
export const backfillAbluxInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const trips = await ctx.db.query("trips").collect();
    for (const trip of trips) await syncTripCard(ctx, trip._id);
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_source_external", (q) => q.eq("sourceSlug", MANUAL_RELIGIOUS_SOURCE_SLUG))
      .collect();
    for (const offer of offers) await syncVerskiCard(ctx, offer._id);
    return { trips: trips.length, religious: offers.length };
  },
});
