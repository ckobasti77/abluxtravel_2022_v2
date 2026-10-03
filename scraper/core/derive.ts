// Derived card fields (pure, runs in Convex mutations): price "od", next
// departure, activity rule D4, travel types, country, search text.
import { countryByCode, countryForPlace, countrySlugOf, findCountry, type Country } from "./geo";
import { fold } from "./text";
import { diffDaysIso } from "./time";
import { mapTravelTypes, type CategoryMapEntry } from "./travel-type";
import type { Departure, NormalizedOffer, PriceBasis } from "./types";

export const MAX_CARD_DATES = 60;
export const UNDATED_SORT = "9999-12-31";
export const NO_PRICE_SORT = 1e9;
const ON_REQUEST_STALE_DAYS = 400;

// Daily/nightly prices above these limits are not euros: some partner cards print
// "€" next to dinar amounts (Ski & Sun, Sokobanja villas "od 4000 € po danu").
// Such a price is not shown; the offer becomes "Cena na upit".
const MAX_EUR_PER_DAY: Partial<Record<PriceBasis, number>> = {
  per_day: 1000,
  per_person_night: 1000,
  per_unit_night: 2000,
};

export function isPlausibleEurPrice(price: number, basis: PriceBasis | undefined): boolean {
  const max = basis ? MAX_EUR_PER_DAY[basis] : undefined;
  return max === undefined || price <= max;
}

export type Derived = {
  travelTypes: string[];
  country?: Country;
  countryName?: string;
  countryCode?: string;
  countrySlug?: string;
  departureDates: string[];
  nextDepartureDate?: string;
  sortDeparture: string;
  priceKind: "from" | "on_request";
  priceFrom?: number;
  priceOld?: number;
  priceBasis?: PriceBasis;
  sortPrice: number;
  activeByDates: boolean;
  searchText: string;
};

export type DeriveContext = {
  today: string;
  partnerName: string;
  categoryMap?: CategoryMapEntry[];
};

function resolveCountry(offer: Pick<NormalizedOffer, "countryName" | "countryCode" | "place" | "region">): Country | undefined {
  return (
    findCountry(offer.countryName) ??
    countryByCode(offer.countryCode) ??
    countryForPlace(offer.place) ??
    countryForPlace(offer.region)
  );
}

function primaryBasis(departures: Departure[]): PriceBasis | undefined {
  const counts = new Map<PriceBasis, number>();
  for (const departure of departures) {
    if (departure.price === undefined) continue;
    counts.set(departure.basis, (counts.get(departure.basis) ?? 0) + 1);
  }
  let best: PriceBasis | undefined;
  let bestCount = 0;
  for (const [basis, count] of counts) {
    if (count > bestCount) {
      best = basis;
      bestCount = count;
    }
  }
  return best;
}

export function activeByDates(
  mode: NormalizedOffer["availabilityMode"],
  departureDates: string[],
  sourceModifiedAt: string | undefined,
  today: string
): boolean {
  if (mode === "dated") return departureDates.length > 0;
  if (sourceModifiedAt && /^\d{4}-\d{2}-\d{2}/.test(sourceModifiedAt)) {
    return diffDaysIso(sourceModifiedAt.slice(0, 10), today) <= ON_REQUEST_STALE_DAYS;
  }
  return true;
}

export function derivePrice(
  departures: Departure[],
  listPrice: NormalizedOffer["listPrice"],
  mode: NormalizedOffer["availabilityMode"],
  today: string
): Pick<Derived, "priceKind" | "priceFrom" | "priceOld" | "priceBasis" | "sortPrice"> {
  const future = departures.filter((departure) => departure.date >= today);
  const basis = primaryBasis(future);
  let best: Departure | undefined;
  for (const departure of future) {
    if (departure.price === undefined || departure.price <= 0) continue;
    if (departure.availability === "sold_out") continue;
    if (departure.basis !== basis) continue;
    if (!isPlausibleEurPrice(departure.price, departure.basis)) continue;
    if (!best || departure.price < (best.price ?? Infinity)) best = departure;
  }
  if (best && best.price !== undefined) {
    return {
      priceKind: "from",
      priceFrom: best.price,
      priceOld: best.priceOld && best.priceOld > best.price ? best.priceOld : undefined,
      priceBasis: best.basis,
      sortPrice: best.price,
    };
  }
  const anyPriced = departures.some((departure) => departure.price !== undefined);
  if (
    listPrice &&
    listPrice.price > 0 &&
    isPlausibleEurPrice(listPrice.price, listPrice.basis) &&
    (mode === "on_request" || !anyPriced || future.length > 0)
  ) {
    return {
      priceKind: "from",
      priceFrom: listPrice.price,
      priceOld: listPrice.priceOld && listPrice.priceOld > listPrice.price ? listPrice.priceOld : undefined,
      priceBasis: listPrice.basis,
      sortPrice: listPrice.price,
    };
  }
  return { priceKind: "on_request", sortPrice: NO_PRICE_SORT };
}

export function futureDates(departures: Departure[], today: string): string[] {
  return [...new Set(departures.map((departure) => departure.date).filter((date) => date >= today))]
    .sort()
    .slice(0, MAX_CARD_DATES);
}

export function buildSearchText(parts: (string | undefined)[]): string {
  const originals = parts.filter((part): part is string => Boolean(part && part.trim()));
  const folded = originals.map(fold);
  return [...new Set([...originals, ...folded])].join(" ").slice(0, 1000);
}

export function deriveOffer(offer: NormalizedOffer, ctx: DeriveContext): Derived {
  const country = resolveCountry(offer);
  const departureDates = futureDates(offer.departures, ctx.today);
  const price = derivePrice(offer.departures, offer.listPrice, offer.availabilityMode, ctx.today);
  const travelTypes = mapTravelTypes(
    {
      title: offer.title,
      categoryHints: offer.categoryHints,
      kind: offer.kind,
      country,
      days: offer.days,
      departureDates,
    },
    ctx.categoryMap
  );
  const countryName = country?.name ?? offer.countryName;
  return {
    travelTypes,
    country,
    countryName,
    countryCode: country?.code ?? offer.countryCode,
    countrySlug: countrySlugOf(countryName),
    departureDates,
    nextDepartureDate: departureDates[0],
    sortDeparture: departureDates[0] ?? UNDATED_SORT,
    ...price,
    activeByDates: activeByDates(offer.availabilityMode, departureDates, offer.sourceModifiedAt, ctx.today),
    searchText: buildSearchText([offer.title, offer.place, offer.region, countryName, ctx.partnerName]),
  };
}
