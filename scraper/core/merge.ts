// Merge mode (D5) for adapters that need several requests per offer.
// Within a run: union departures, incoming content fields win when present.
// First touch in a new run: departures are replaced, content fields the new
// fragment lacks are kept from the stored offer.
import type { Departure, NormalizedOffer } from "./types";

const departureKey = (departure: Departure) =>
  [departure.date, departure.endDate ?? "", departure.unit ?? "", departure.fromCity ?? "", departure.nights ?? ""].join("|");

export function unionDepartures(a: Departure[], b: Departure[]): Departure[] {
  const map = new Map<string, Departure>();
  for (const departure of [...a, ...b]) map.set(departureKey(departure), departure);
  return [...map.values()].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

const pick = <T>(incoming: T | undefined, existing: T | undefined): T | undefined =>
  incoming === undefined || incoming === "" ? existing : incoming;

const pickArray = <T>(incoming: T[], existing: T[]): T[] => (incoming.length > 0 ? incoming : existing);

function mergeContent(existing: NormalizedOffer, incoming: NormalizedOffer): NormalizedOffer {
  return {
    ...existing,
    ...incoming,
    subtitle: pick(incoming.subtitle, existing.subtitle),
    countryName: pick(incoming.countryName, existing.countryName),
    countryCode: pick(incoming.countryCode, existing.countryCode),
    place: pick(incoming.place, existing.place),
    region: pick(incoming.region, existing.region),
    categoryHints: [...new Set([...existing.categoryHints, ...incoming.categoryHints])],
    transports: [...new Set([...existing.transports, ...incoming.transports])],
    nights: pick(incoming.nights, existing.nights),
    nightsMax: pick(incoming.nightsMax, existing.nightsMax),
    days: pick(incoming.days, existing.days),
    stars: pick(incoming.stars, existing.stars),
    board: pick(incoming.board, existing.board),
    listPrice: pick(incoming.listPrice, existing.listPrice),
    priceNote: pick(incoming.priceNote, existing.priceNote),
    departureCities: [...new Set([...existing.departureCities, ...incoming.departureCities])],
    supplements: pickArray(incoming.supplements, existing.supplements),
    coverImage: pick(incoming.coverImage, existing.coverImage),
    images: [...new Set([...existing.images, ...incoming.images])].slice(0, 40),
    descriptionHtml: pick(incoming.descriptionHtml, existing.descriptionHtml),
    program: pickArray(incoming.program, existing.program),
    included: pickArray(incoming.included, existing.included),
    excluded: pickArray(incoming.excluded, existing.excluded),
    notesHtml: pick(incoming.notesHtml, existing.notesHtml),
    facts: pickArray(incoming.facts, existing.facts),
    organizer: pick(incoming.organizer, existing.organizer),
    priceListLabel: pick(incoming.priceListLabel, existing.priceListLabel),
    documents: pickArray(incoming.documents, existing.documents),
    geo: pick(incoming.geo, existing.geo),
    badges: [...new Set([...existing.badges, ...incoming.badges])],
    warnings: [...new Set([...existing.warnings, ...incoming.warnings])].slice(0, 30),
    title: incoming.title || existing.title,
  };
}

/** Second and later fragments of the same offer within one run. */
export function mergeFragments(existing: NormalizedOffer, incoming: NormalizedOffer): NormalizedOffer {
  const merged = mergeContent(existing, incoming);
  merged.departures = unionDepartures(existing.departures, incoming.departures);
  return merged;
}

/** First fragment of an offer in a new run. */
export function firstTouchMerge(existing: NormalizedOffer, incoming: NormalizedOffer): NormalizedOffer {
  const merged = mergeContent(existing, incoming);
  merged.departures = unionDepartures([], incoming.departures);
  return merged;
}

/** Group offers with the same externalId (one batch, merge-mode adapters). */
export function groupFragments(offers: NormalizedOffer[]): NormalizedOffer[] {
  const map = new Map<string, NormalizedOffer>();
  for (const offer of offers) {
    const existing = map.get(offer.externalId);
    map.set(offer.externalId, existing ? mergeFragments(existing, offer) : offer);
  }
  return [...map.values()];
}
