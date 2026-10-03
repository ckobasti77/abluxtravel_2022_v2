// ABLux projection (plan 06 §15): ABLux programs (`trips`) and manual religious
// offers (`offers`, source "manual-verski") get an `offerCards` row with
// kind "ablux", so /ponude lists them next to partner offers. The card links to
// the ABLux page (`href`); the cart and IPS deposit stay on that page.
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { buildSearchText, NO_PRICE_SORT, UNDATED_SORT } from "../../scraper/core/derive";
import { countrySlugOf, findCountry, findCountryInText, type Country } from "../../scraper/core/geo";
import { slugify } from "../../scraper/core/text";
import { todayBelgrade } from "../../scraper/core/time";
import { mapTravelTypes } from "../../scraper/core/travel-type";
import { MANUAL_RELIGIOUS_SOURCE_SLUG } from "../../lib/religious";
import { computeIsPublic, effectiveFields, uniqueSlug, type CardDoc } from "./catalogCards";

export const ABLUX_PARTNER_SLUG = "ablux";
export const ABLUX_ORGANIZER = "ABLux Travel";

type Transport = CardDoc["transports"][number];

const RSD_ALIASES = new Set(["RSD", "DIN", "DIN.", "ДИН", "ДИН.", "DINAR", "DINARA"]);

function currencyCode(value: string) {
  const raw = value.trim().toUpperCase();
  if (RSD_ALIASES.has(raw)) return "RSD";
  if (raw === "€" || raw === "EVRO") return "EUR";
  return /^[A-Z]{3}$/.test(raw) ? raw : "EUR";
}

// "car" (Automobil) has no catalog equivalent; it is left out rather than mislabelled.
const TRIP_TRANSPORT: Record<Doc<"trips">["transport"], Transport | null> = {
  bus: "bus",
  plane: "plane",
  train: "train",
  self: "self",
  car: null,
};

type Projection = {
  externalId: string;
  slugBase: string;
  href: string;
  title: string;
  place?: string;
  country?: Country;
  travelTypes: string[];
  transports: Transport[];
  nights?: number;
  days?: number;
  departureDate?: string;
  departureCity?: string;
  price?: number;
  currency: string;
  coverStorageId?: Id<"_storage">;
  featured: boolean;
  active: boolean;
};

async function cardByExternalId(ctx: MutationCtx, externalId: string) {
  return ctx.db
    .query("offerCards")
    .withIndex("by_partner_external", (q) => q.eq("partnerSlug", ABLUX_PARTNER_SLUG).eq("externalId", externalId))
    .unique();
}

async function upsertProjection(ctx: MutationCtx, projection: Projection) {
  const now = Date.now();
  const today = todayBelgrade(now);
  const existing = await cardByExternalId(ctx, projection.externalId);
  const date = projection.departureDate && /^\d{4}-\d{2}-\d{2}$/.test(projection.departureDate) ? projection.departureDate : undefined;
  const departureDates = date && date >= today ? [date] : [];
  const availabilityMode = date ? ("dated" as const) : ("on_request" as const);
  const isActive = projection.active && (availabilityMode === "on_request" || departureDates.length > 0);
  const hasPrice = typeof projection.price === "number" && Number.isFinite(projection.price) && projection.price > 0;
  const currency = currencyCode(projection.currency);
  const countryName = projection.country?.name;
  const imported = {
    title: projection.title,
    travelTypes: projection.travelTypes,
    coverUrl: undefined,
    coverStorageId: projection.coverStorageId,
  };
  const effective = effectiveFields(imported, existing?.overrides);
  const published = existing?.published ?? true;
  const hidden = existing?.hidden ?? false;

  const fields = {
    href: projection.href,
    offerKind: "trip" as const,
    title: effective.title,
    place: projection.place,
    countryCode: projection.country?.code,
    countryName,
    countrySlug: countrySlugOf(countryName),
    travelTypes: effective.travelTypes,
    transports: projection.transports,
    nights: projection.nights && projection.nights > 0 ? projection.nights : undefined,
    days: projection.days && projection.days > 0 ? projection.days : undefined,
    availabilityMode,
    departureDates,
    nextDepartureDate: departureDates[0],
    sortDeparture: departureDates[0] ?? UNDATED_SORT,
    departureCities: projection.departureCity?.trim() ? [projection.departureCity.trim()] : [],
    priceKind: hasPrice ? ("from" as const) : ("on_request" as const),
    priceFrom: hasPrice ? projection.price : undefined,
    priceOld: undefined,
    priceBasis: hasPrice ? ("per_person" as const) : undefined,
    priceNote: undefined,
    // Price sorting and the price filter compare euros only.
    sortPrice: hasPrice && currency === "EUR" ? (projection.price as number) : NO_PRICE_SORT,
    currency,
    coverUrl: effective.coverUrl,
    coverStorageId: effective.coverStorageId,
    organizerName: ABLUX_ORGANIZER,
    badges: [],
    imported,
    listed: true,
    isActive,
    featured: projection.featured,
    partnerEnabled: true,
    isPublic: computeIsPublic({ published, isActive, hidden, partnerEnabled: true }),
    searchText: buildSearchText([effective.title, projection.place, countryName, projection.departureCity, ABLUX_ORGANIZER, "ABLux program"]),
    updatedAt: now,
    removedAt: undefined,
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  const slug = await uniqueSlug(ctx, projection.slugBase);
  return ctx.db.insert("offerCards", {
    kind: "ablux",
    partnerSlug: ABLUX_PARTNER_SLUG,
    externalId: projection.externalId,
    slug,
    published,
    hidden,
    firstSeenAt: now,
    ...fields,
  });
}

async function removeProjection(ctx: MutationCtx, externalId: string) {
  const card = await cardByExternalId(ctx, externalId);
  // The source row is gone, so its single projected card goes with it.
  if (card) await ctx.db.delete(card._id);
}

export async function syncTripCard(ctx: MutationCtx, tripId: Id<"trips">) {
  const externalId = `trip:${tripId}`;
  const trip = await ctx.db.get(tripId);
  if (!trip) return removeProjection(ctx, externalId);
  const category = trip.categoryId ? await ctx.db.get(trip.categoryId) : null;
  const country = findCountryInText(trip.title) ?? findCountryInText(trip.description.slice(0, 400));
  const departureDates = trip.departureDate ? [trip.departureDate] : [];
  const types = new Set<string>(
    mapTravelTypes({
      title: trip.title,
      categoryHints: category ? [category.name.sr] : [],
      kind: "trip",
      country,
      days: trip.days,
      departureDates,
    })
  );
  if (category?.type === "religious") types.add("verski-turizam");
  const transport = TRIP_TRANSPORT[trip.transport];
  const heroImage = trip.heroMediaType === "image" ? trip.heroMediaStorageId : undefined;
  const firstImage = trip.detailMedia?.find((media) => media.mediaType === "image")?.storageId ?? trip.imageStorageIds[0];

  return upsertProjection(ctx, {
    externalId,
    slugBase: `ablux-${slugify(trip.slug || trip.title, 70)}`,
    href: `/aranzmani/${trip.slug}`,
    title: trip.title,
    country,
    travelTypes: [...types].slice(0, 3),
    transports: transport ? [transport] : [],
    nights: trip.nights,
    days: trip.days,
    departureDate: trip.departureDate,
    departureCity: trip.departureCity,
    price: trip.price,
    currency: trip.currency,
    coverStorageId: heroImage ?? firstImage,
    featured: trip.featured,
    active: trip.status === "active" || trip.status === "upcoming",
  });
}

export async function syncVerskiCard(ctx: MutationCtx, offerId: Id<"offers">) {
  const externalId = `verski:${offerId}`;
  const offer = await ctx.db.get(offerId);
  if (!offer || offer.sourceSlug !== MANUAL_RELIGIOUS_SOURCE_SLUG) return removeProjection(ctx, externalId);
  const country = findCountry(offer.destination) ?? findCountryInText(`${offer.destination} ${offer.title}`);
  return upsertProjection(ctx, {
    externalId,
    slugBase: `ablux-verski-${slugify(offer.title, 60) || offer.externalId}`,
    href: "/verski-turizam",
    title: offer.title,
    place: offer.destination || undefined,
    country,
    travelTypes: ["verski-turizam"],
    transports: [],
    departureDate: offer.departureDate,
    departureCity: offer.departureCity,
    price: offer.price,
    currency: offer.currency,
    coverStorageId: offer.imageStorageIds?.[0],
    featured: false,
    active: offer.isActive,
  });
}
