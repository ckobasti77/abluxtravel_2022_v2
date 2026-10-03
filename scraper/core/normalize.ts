// Pure normalization shared by finalizeOffer (Node, sanitizes HTML first) and
// finalizeManualOffer (V8 mutations, text input): validation, caps, URL
// rules, departure dedupe, default organizer, content hash.
import { ParseError } from "./errors";
import { hashValue } from "./hash";
import { cleanLine, truncate, uniqueStrings } from "./text";
import { isIsoDate } from "./time";
import type { Departure, FinalOffer, NormalizedOffer, PartnerConfig } from "./types";

export const LIMITS = {
  title: 160,
  subtitle: 300,
  listItem: 500,
  listItems: 60,
  programDays: 40,
  programHtml: 8_000,
  images: 40,
  departures: 400,
  supplements: 60,
  facts: 40,
  documents: 20,
  cities: 12,
  hints: 20,
  url: 500,
  note: 120,
  warnings: 30,
} as const;

const isHttpUrl = (value: string | undefined): value is string =>
  Boolean(value) && /^https?:\/\/[^\s]+$/i.test(value ?? "") && (value ?? "").length <= LIMITS.url;

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function normalizeDepartures(departures: Departure[]): Departure[] {
  const map = new Map<string, Departure>();
  for (const departure of departures) {
    if (!isIsoDate(departure.date)) continue;
    const clean: Departure = {
      ...departure,
      endDate: isIsoDate(departure.endDate) && departure.endDate >= departure.date ? departure.endDate : undefined,
      unit: departure.unit ? truncate(cleanLine(departure.unit), 120) : undefined,
      fromCity: departure.fromCity ? truncate(cleanLine(departure.fromCity), 60) : undefined,
      price: departure.price !== undefined && Number.isFinite(departure.price) && departure.price > 0 ? Math.round(departure.price * 100) / 100 : undefined,
      priceOld:
        departure.priceOld !== undefined && Number.isFinite(departure.priceOld) && departure.priceOld > 0
          ? Math.round(departure.priceOld * 100) / 100
          : undefined,
      note: departure.note ? truncate(cleanLine(departure.note), LIMITS.note) : undefined,
      nights: departure.nights && departure.nights > 0 && departure.nights < 400 ? departure.nights : undefined,
    };
    const key = [clean.date, clean.endDate ?? "", clean.unit ?? "", clean.fromCity ?? "", clean.nights ?? ""].join("|");
    map.set(key, clean);
  }
  return [...map.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.price ?? 0) - (b.price ?? 0)))
    .slice(0, LIMITS.departures);
}

/** Validate and cap an offer. HTML fields must already be sanitized. */
export function normalizeOffer(
  offer: NormalizedOffer,
  config: Pick<PartnerConfig, "hosts" | "imagePolicy" | "organizer" | "slug">,
  opts: { allowEmptySourceUrl?: boolean } = {}
): FinalOffer {
  const title = truncate(cleanLine(offer.title), LIMITS.title);
  if (!title) throw new ParseError("Ponuda nema naslov.");
  const externalId = cleanLine(offer.externalId).slice(0, 120);
  if (!externalId) throw new ParseError("Ponuda nema ID.");
  const sourceUrl = offer.sourceUrl.trim();
  if (sourceUrl) {
    const host = hostOf(sourceUrl);
    if (!isHttpUrl(sourceUrl) || !host || !config.hosts.includes(host)) {
      throw new ParseError(`Link ka originalnom programu nije na domenu partnera: ${sourceUrl}`);
    }
  } else if (!opts.allowEmptySourceUrl) {
    throw new ParseError("Ponuda nema link ka originalnom programu.");
  }
  const imageOk = (url: string) => isHttpUrl(url) && (url.startsWith("https://") || config.imagePolicy === "copy");
  const images = uniqueStrings([offer.coverImage, ...offer.images].filter((url): url is string => Boolean(url) && imageOk(url ?? ""))).slice(0, LIMITS.images);
  const warnings = [...offer.warnings];
  const departures = normalizeDepartures(offer.departures);
  if (offer.availabilityMode === "dated" && departures.length === 0) warnings.push("Nisu pronađeni termini.");

  const normalized: NormalizedOffer = {
    ...offer,
    partnerSlug: config.slug,
    externalId,
    sourceUrl,
    title,
    subtitle: offer.subtitle ? truncate(cleanLine(offer.subtitle), LIMITS.subtitle) : undefined,
    place: offer.place ? truncate(cleanLine(offer.place), 80) : undefined,
    region: offer.region ? truncate(cleanLine(offer.region), 80) : undefined,
    countryName: offer.countryName ? truncate(cleanLine(offer.countryName), 60) : undefined,
    categoryHints: uniqueStrings(offer.categoryHints.map((hint) => truncate(cleanLine(hint), 80))).slice(0, LIMITS.hints),
    transports: [...new Set(offer.transports)],
    stars: offer.stars && offer.stars >= 1 && offer.stars <= 5 ? Math.round(offer.stars) : undefined,
    nights: offer.nights && offer.nights > 0 && offer.nights < 400 ? offer.nights : undefined,
    nightsMax: offer.nightsMax && offer.nightsMax > 0 && offer.nightsMax < 400 ? offer.nightsMax : undefined,
    days: offer.days && offer.days > 0 && offer.days < 400 ? offer.days : undefined,
    departures,
    listPrice: offer.listPrice && offer.listPrice.price > 0 ? offer.listPrice : undefined,
    priceNote: offer.priceNote ? truncate(cleanLine(offer.priceNote), 80) : undefined,
    departureCities: uniqueStrings(offer.departureCities.map((city) => truncate(cleanLine(city), 60))).slice(0, LIMITS.cities),
    supplements: offer.supplements
      .map((supplement) => ({
        ...supplement,
        label: truncate(cleanLine(supplement.label), 160),
        note: supplement.note ? truncate(cleanLine(supplement.note), LIMITS.note) : undefined,
      }))
      .filter((supplement) => supplement.label)
      .slice(0, LIMITS.supplements),
    coverImage: images[0],
    images,
    program: offer.program
      .map((day) => ({ day: day.day, title: truncate(cleanLine(day.title), 200), html: day.html.slice(0, LIMITS.programHtml) }))
      .filter((day) => day.title || day.html)
      .slice(0, LIMITS.programDays),
    included: uniqueStrings(offer.included.map((item) => truncate(cleanLine(item), LIMITS.listItem))).slice(0, LIMITS.listItems),
    excluded: uniqueStrings(offer.excluded.map((item) => truncate(cleanLine(item), LIMITS.listItem))).slice(0, LIMITS.listItems),
    facts: offer.facts
      .map((fact) => ({ label: truncate(cleanLine(fact.label), 80), value: truncate(cleanLine(fact.value), 200) }))
      .filter((fact) => fact.label && fact.value)
      .slice(0, LIMITS.facts),
    organizer: offer.organizer?.name ? offer.organizer : { ...config.organizer },
    priceListLabel: offer.priceListLabel ? truncate(cleanLine(offer.priceListLabel), 160) : undefined,
    documents: offer.documents
      .filter((doc) => isHttpUrl(doc.url))
      .map((doc) => ({ label: truncate(cleanLine(doc.label) || "Dokument", 120), url: doc.url }))
      .slice(0, LIMITS.documents),
    geo:
      offer.geo && Number.isFinite(offer.geo.lat) && Number.isFinite(offer.geo.lng) && Math.abs(offer.geo.lat) <= 90 && Math.abs(offer.geo.lng) <= 180
        ? offer.geo
        : undefined,
    badges: [...new Set(offer.badges)],
    warnings: uniqueStrings(warnings).slice(0, LIMITS.warnings),
  };
  const { warnings: _ignored, ...hashed } = normalized;
  void _ignored;
  return { ...normalized, contentHash: hashValue(hashed) };
}

/** Recompute the hash after a merge (merge-mode adapters). */
export function rehash(offer: NormalizedOffer): string {
  const { warnings: _ignored, ...hashed } = offer;
  void _ignored;
  return hashValue(hashed);
}
