// Catalog card helpers (pure + small DB helpers). Used by sync ingest, admin
// overrides (step 08) and the ABLux projection (step 10).
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Derived } from "../../scraper/core/derive";
import type { FinalOffer, NormalizedOffer } from "../../scraper/core/types";

export type CardDoc = Doc<"offerCards">;
export type DetailDoc = Doc<"offerDetails">;

export function computeIsPublic(card: { published: boolean; isActive: boolean; hidden: boolean; partnerEnabled: boolean }) {
  return card.published && card.isActive && !card.hidden && card.partnerEnabled;
}

type Imported = CardDoc["imported"];
type Overrides = CardDoc["overrides"];

/** Effective title / travel types / cover: ABLux overrides win over imported values. */
export function effectiveFields(imported: Imported, overrides: Overrides) {
  const coverStorageId = overrides?.coverStorageId ?? (overrides?.coverUrl ? undefined : imported.coverStorageId);
  return {
    title: overrides?.title?.trim() || imported.title,
    travelTypes: overrides?.travelTypes?.length ? overrides.travelTypes : imported.travelTypes,
    coverUrl: overrides?.coverUrl ?? imported.coverUrl,
    coverStorageId,
  };
}

export type PartnerForCard = {
  slug: string;
  name: string;
  isEnabled: boolean;
  autoPublish?: boolean;
  organizerName?: string;
};

/** Imported (sync-owned) card fields. Never touches overrides/published/hidden/featured/slug. */
export function importedCardFields(
  offer: FinalOffer,
  derived: Derived,
  partner: PartnerForCard,
  existing: Pick<CardDoc, "imported" | "overrides"> | null,
  now: number
) {
  const sameCover = existing?.imported.coverUrl === offer.coverImage;
  const imported: Imported = {
    title: offer.title,
    travelTypes: derived.travelTypes,
    coverUrl: offer.coverImage,
    coverStorageId: sameCover ? existing?.imported.coverStorageId : undefined,
  };
  const effective = effectiveFields(imported, existing?.overrides);
  return {
    offerKind: offer.kind,
    title: effective.title,
    place: offer.place,
    region: offer.region,
    countryCode: derived.countryCode,
    countryName: derived.countryName,
    countrySlug: derived.countrySlug,
    travelTypes: effective.travelTypes,
    transports: offer.transports,
    nights: offer.nights,
    nightsMax: offer.nightsMax,
    days: offer.days,
    stars: offer.stars,
    board: offer.board,
    availabilityMode: offer.availabilityMode,
    departureDates: derived.departureDates,
    nextDepartureDate: derived.nextDepartureDate,
    sortDeparture: derived.sortDeparture,
    departureCities: offer.departureCities,
    priceKind: derived.priceKind,
    priceFrom: derived.priceFrom,
    priceOld: derived.priceOld,
    priceBasis: derived.priceBasis,
    priceNote: offer.priceNote ?? offer.listPrice?.note,
    sortPrice: derived.sortPrice,
    currency: "EUR",
    coverUrl: effective.coverUrl,
    coverStorageId: effective.coverStorageId,
    organizerName: offer.organizer?.name ?? partner.organizerName ?? partner.name,
    badges: offer.badges,
    imported,
    searchText: derived.searchText,
    updatedAt: now,
  };
}

/** Detail fields from a finalized offer; keeps storage ids of images already copied. */
export function detailFields(offer: FinalOffer, existing: DetailDoc | null, now: number) {
  const stored = new Map((existing?.gallery ?? []).filter((image) => image.storageId).map((image) => [image.url, image.storageId]));
  return {
    sourceUrl: offer.sourceUrl,
    subtitle: offer.subtitle,
    descriptionHtml: offer.descriptionHtml,
    program: offer.program,
    included: offer.included,
    excluded: offer.excluded,
    notesHtml: offer.notesHtml,
    departures: offer.departures,
    supplements: offer.supplements,
    gallery: offer.images.map((url) => ({ url, storageId: stored.get(url) })),
    organizer: offer.organizer ?? { name: "" },
    priceListLabel: offer.priceListLabel,
    documents: offer.documents,
    geo: offer.geo,
    facts: offer.facts,
    warnings: offer.warnings,
    updatedAt: now,
  };
}

/** Rebuild a NormalizedOffer from stored docs (merge-mode adapters). */
export function storedToOffer(card: CardDoc, detail: DetailDoc): NormalizedOffer {
  return {
    partnerSlug: card.partnerSlug,
    externalId: card.externalId,
    sourceUrl: detail.sourceUrl,
    kind: card.offerKind,
    title: card.imported.title,
    subtitle: detail.subtitle,
    countryName: card.countryName,
    countryCode: card.countryCode,
    place: card.place,
    region: card.region,
    categoryHints: [],
    transports: card.transports,
    nights: card.nights,
    nightsMax: card.nightsMax,
    days: card.days,
    stars: card.stars,
    board: card.board,
    availabilityMode: card.availabilityMode,
    departures: detail.departures,
    priceNote: card.priceNote,
    departureCities: card.departureCities,
    supplements: detail.supplements,
    coverImage: card.imported.coverUrl,
    images: detail.gallery.map((image) => image.url),
    descriptionHtml: detail.descriptionHtml,
    program: detail.program,
    included: detail.included,
    excluded: detail.excluded,
    notesHtml: detail.notesHtml,
    facts: detail.facts,
    organizer: detail.organizer.name ? detail.organizer : undefined,
    priceListLabel: detail.priceListLabel,
    documents: detail.documents,
    geo: detail.geo,
    badges: card.badges as NormalizedOffer["badges"],
    warnings: detail.warnings,
  };
}

/** Unique, immutable slug (D12). */
export async function uniqueSlug(ctx: MutationCtx, base: string): Promise<string> {
  const root = base.replace(/-+$/g, "") || "ponuda";
  for (let attempt = 1; attempt < 200; attempt += 1) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    const taken = await ctx.db
      .query("offerCards")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export type CardId = Id<"offerCards">;
