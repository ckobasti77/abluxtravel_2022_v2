// Catalog filters for /ponude (pure; shared by Convex `catalog.ts`, the
// Next.js pages and the search components). Serbian URL parameters:
//
//   tip=<travel type>      (alias: kategorija)
//   zemlja=<country slug>  (alias: destinacija)
//   mesec=YYYY-MM          prevoz=autobus|avion|brod|voz|sopstveni
//   trajanje=1-3|4-7|8-14|15+   cenaOd=N  cenaDo=N (EUR)
//   polazak=<city>  putnika=N  q=<text>  vrsta=ablux|partneri  partner=<slug>
//   sort=polazak|cena|novo  strana=N
import { fold } from "../../scraper/core/text";
import { isTravelTypeSlug, type TravelTypeSlug } from "../search/travel-types";

export type Transport = "bus" | "plane" | "self" | "train" | "ship";
export type DurationBucket = "1-3" | "4-7" | "8-14" | "15+";
export type CatalogSort = "polazak" | "cena" | "novo";
export type CatalogKind = "ablux" | "partner";

export type CatalogFilters = {
  tip?: TravelTypeSlug;
  zemlja?: string;
  mesec?: string;
  prevoz?: Transport;
  trajanje?: DurationBucket;
  cenaOd?: number;
  cenaDo?: number;
  polazak?: string;
  q?: string;
  vrsta?: CatalogKind;
  partner?: string;
};

export type CatalogQuery = CatalogFilters & {
  sort?: CatalogSort;
  /** 1-based "Učitaj još" page: the page shows pages 1..strana. */
  strana?: number;
  /** Travelers: not a filter (partners publish no seat counts); carried to the inquiry form. */
  putnika?: number;
};

export const TRANSPORT_PARAM: Record<Transport, string> = {
  bus: "autobus",
  plane: "avion",
  ship: "brod",
  train: "voz",
  self: "sopstveni",
};
const PARAM_TRANSPORT = Object.fromEntries(Object.entries(TRANSPORT_PARAM).map(([key, value]) => [value, key])) as Record<
  string,
  Transport
>;

export const DURATION_BUCKETS: DurationBucket[] = ["1-3", "4-7", "8-14", "15+"];
export const TRANSPORTS: Transport[] = ["bus", "plane", "ship", "train", "self"];
export const SORTS: CatalogSort[] = ["polazak", "cena", "novo"];

export const PAGE_SIZE = 24;
export const MAX_PAGES = 10;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function reader(params: ParamSource) {
  return (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? undefined;
  };
}

function positiveInt(value: string | undefined, max: number): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= max ? number : undefined;
}

function cleanText(value: string | undefined, max: number): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim().slice(0, max);
  return text ? text : undefined;
}

/** URL → validated query. Unknown or malformed values are dropped, never thrown. */
export function parseCatalogQuery(params: ParamSource): CatalogQuery {
  const get = reader(params);
  const tip = get("tip") ?? get("kategorija");
  const zemlja = (get("zemlja") ?? get("destinacija"))?.toLowerCase();
  const mesec = get("mesec");
  const prevoz = PARAM_TRANSPORT[get("prevoz") ?? ""];
  const trajanje = get("trajanje");
  const vrsta = get("vrsta");
  const partner = get("partner")?.toLowerCase();
  const sort = get("sort");
  let cenaOd = positiveInt(get("cenaOd"), 1_000_000);
  let cenaDo = positiveInt(get("cenaDo"), 1_000_000);
  if (cenaOd && cenaDo && cenaOd > cenaDo) [cenaOd, cenaDo] = [cenaDo, cenaOd];

  return {
    tip: isTravelTypeSlug(tip) ? tip : undefined,
    zemlja: zemlja && SLUG_PATTERN.test(zemlja) ? zemlja : undefined,
    mesec: mesec && MONTH_PATTERN.test(mesec) ? mesec : undefined,
    prevoz,
    trajanje: DURATION_BUCKETS.includes(trajanje as DurationBucket) ? (trajanje as DurationBucket) : undefined,
    cenaOd,
    cenaDo,
    polazak: cleanText(get("polazak"), 60),
    q: cleanText(get("q"), 80),
    vrsta: vrsta === "ablux" ? "ablux" : vrsta === "partneri" ? "partner" : undefined,
    partner: partner && SLUG_PATTERN.test(partner) ? partner : undefined,
    sort: SORTS.includes(sort as CatalogSort) && sort !== "polazak" ? (sort as CatalogSort) : undefined,
    strana: positiveInt(get("strana"), MAX_PAGES),
    putnika: positiveInt(get("putnika"), 20),
  };
}

/** Query → URL search string (stable key order; defaults omitted). */
export function catalogQueryString(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.tip) params.set("tip", query.tip);
  if (query.zemlja) params.set("zemlja", query.zemlja);
  if (query.mesec) params.set("mesec", query.mesec);
  if (query.prevoz) params.set("prevoz", TRANSPORT_PARAM[query.prevoz]);
  if (query.trajanje) params.set("trajanje", query.trajanje);
  if (query.cenaOd) params.set("cenaOd", String(query.cenaOd));
  if (query.cenaDo) params.set("cenaDo", String(query.cenaDo));
  if (query.polazak) params.set("polazak", query.polazak);
  if (query.putnika) params.set("putnika", String(query.putnika));
  if (query.q) params.set("q", query.q);
  if (query.vrsta) params.set("vrsta", query.vrsta === "ablux" ? "ablux" : "partneri");
  if (query.partner) params.set("partner", query.partner);
  if (query.sort && query.sort !== "polazak") params.set("sort", query.sort);
  if (query.strana && query.strana > 1) params.set("strana", String(query.strana));
  return params.toString();
}

export function catalogHref(query: CatalogQuery): string {
  const search = catalogQueryString(query);
  return search ? `/ponude?${search}` : "/ponude";
}

/** Only the filter part (what the Convex queries accept). */
export function filtersOf(query: CatalogQuery): CatalogFilters {
  const filters: CatalogFilters = {};
  for (const key of FILTER_KEYS) {
    const value = query[key];
    if (value !== undefined) (filters as Record<string, unknown>)[key] = value;
  }
  return filters;
}

export const FILTER_KEYS = ["tip", "zemlja", "mesec", "prevoz", "trajanje", "cenaOd", "cenaDo", "polazak", "q", "vrsta", "partner"] as const;

/** Number of active filter dimensions (price range counts once). Used for noindex. */
export function activeFilterCount(filters: CatalogFilters): number {
  let count = 0;
  for (const key of FILTER_KEYS) {
    if (key === "cenaDo" && filters.cenaOd !== undefined) continue;
    if (filters[key] !== undefined) count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Matching and facets

export type FilterableCard = {
  kind: CatalogKind;
  partnerSlug: string;
  travelTypes: string[];
  countrySlug?: string;
  countryName?: string;
  departureDates: string[];
  departureCities: string[];
  transports: Transport[];
  nights?: number;
  days?: number;
  priceFrom?: number;
  currency: string;
  searchText: string;
  sortDeparture: string;
  sortPrice: number;
  firstSeenAt: number;
};

export type FacetValue = { value: string; label?: string; count: number };
export type CatalogFacets = {
  tip: FacetValue[];
  zemlja: FacetValue[];
  mesec: FacetValue[];
  prevoz: FacetValue[];
  trajanje: FacetValue[];
  polazak: FacetValue[];
  vrsta: FacetValue[];
  partner: FacetValue[];
  cena: { min: number; max: number } | null;
};

export type SearchContext = {
  /** Partner slug → default departure city (used when a card lists none). */
  defaultCity?: Record<string, string | undefined>;
  partnerNames?: Record<string, string>;
};

/** Nights used for the duration filter: nights, or days − 1 for day-based programs. */
export function effectiveNights(card: Pick<FilterableCard, "nights" | "days">): number | undefined {
  if (typeof card.nights === "number" && card.nights > 0) return card.nights;
  if (typeof card.days === "number" && card.days > 0) return Math.max(card.days - 1, 0);
  return undefined;
}

export function durationBucket(nights: number | undefined): DurationBucket | undefined {
  if (nights === undefined) return undefined;
  if (nights <= 3) return "1-3";
  if (nights <= 7) return "4-7";
  if (nights <= 14) return "8-14";
  return "15+";
}

const isEur = (currency: string) => currency.toUpperCase() === "EUR";

/** A city label fit for the "Polazak iz" list (drops "Transfer: Kruševac 15€" and similar notes). */
function isCleanCity(label: string) {
  return label.length >= 2 && label.length <= 28 && !/[\d:€(]/.test(label) && !/\s(i|ili)\s/i.test(label);
}

function cardCities(card: FilterableCard, ctx: SearchContext): string[] {
  if (card.departureCities.length) return card.departureCities;
  const fallback = ctx.defaultCity?.[card.partnerSlug];
  return fallback ? [fallback] : [];
}

const DIMENSIONS = ["tip", "zemlja", "mesec", "prevoz", "trajanje", "cena", "polazak", "q", "vrsta", "partner"] as const;
type Dimension = (typeof DIMENSIONS)[number];

type Prepared = { card: FilterableCard; nights?: number; cities: string[]; foldedCities: string[] };

function prepare(card: FilterableCard, ctx: SearchContext): Prepared {
  const cities = cardCities(card, ctx);
  return { card, nights: effectiveNights(card), cities, foldedCities: cities.map(fold) };
}

function matcher(filters: CatalogFilters) {
  const polazak = filters.polazak ? fold(filters.polazak) : undefined;
  const words = filters.q ? fold(filters.q).split(" ").filter(Boolean) : [];
  return (item: Prepared, dimension: Dimension): boolean => {
    const { card } = item;
    switch (dimension) {
      case "tip":
        return !filters.tip || card.travelTypes.includes(filters.tip);
      case "zemlja":
        return !filters.zemlja || card.countrySlug === filters.zemlja;
      case "mesec":
        return !filters.mesec || card.departureDates.some((date) => date.startsWith(filters.mesec as string));
      case "prevoz":
        return !filters.prevoz || card.transports.includes(filters.prevoz);
      case "trajanje":
        return !filters.trajanje || durationBucket(item.nights) === filters.trajanje;
      case "cena": {
        if (filters.cenaOd === undefined && filters.cenaDo === undefined) return true;
        if (card.priceFrom === undefined || !isEur(card.currency)) return false;
        if (filters.cenaOd !== undefined && card.priceFrom < filters.cenaOd) return false;
        if (filters.cenaDo !== undefined && card.priceFrom > filters.cenaDo) return false;
        return true;
      }
      case "polazak":
        return !polazak || item.foldedCities.some((city) => city.includes(polazak));
      case "q": {
        if (!words.length) return true;
        const haystack = fold(card.searchText);
        return words.every((word) => haystack.includes(word));
      }
      case "vrsta":
        return !filters.vrsta || card.kind === filters.vrsta;
      case "partner":
        return !filters.partner || card.partnerSlug === filters.partner;
    }
  };
}

function bump(map: Map<string, FacetValue>, value: string, label?: string) {
  const entry = map.get(value);
  if (entry) entry.count += 1;
  else map.set(value, { value, label, count: 1 });
}

export type SearchResult<T extends FilterableCard> = {
  items: T[];
  total: number;
  facets: CatalogFacets;
};

/**
 * Filter, count facets (each dimension with all other filters applied) and sort.
 * Returns every match; the caller paginates.
 */
export function searchCards<T extends FilterableCard>(
  cards: T[],
  filters: CatalogFilters,
  sort: CatalogSort = "polazak",
  ctx: SearchContext = {}
): SearchResult<T> {
  const matches = matcher(filters);
  const prepared = cards.map((card) => prepare(card, ctx));
  const facetMaps: Record<Exclude<Dimension, "cena" | "q">, Map<string, FacetValue>> = {
    tip: new Map(),
    zemlja: new Map(),
    mesec: new Map(),
    prevoz: new Map(),
    trajanje: new Map(),
    polazak: new Map(),
    vrsta: new Map(),
    partner: new Map(),
  };
  const cityLabels = new Map<string, Map<string, number>>();
  let priceMin = Infinity;
  let priceMax = -Infinity;
  const result: T[] = [];

  for (const item of prepared) {
    const flags = DIMENSIONS.map((dimension) => matches(item, dimension));
    const failed = flags.filter((flag) => !flag).length;
    if (failed === 0) result.push(item.card as T);
    if (failed > 1) continue;
    // Counts toward dimension D when it passes every other dimension.
    const passesExcept = (dimension: Dimension) => failed === 0 || !flags[DIMENSIONS.indexOf(dimension)];
    const { card } = item;

    if (passesExcept("tip")) for (const type of new Set(card.travelTypes)) bump(facetMaps.tip, type);
    if (passesExcept("zemlja") && card.countrySlug) bump(facetMaps.zemlja, card.countrySlug, card.countryName);
    if (passesExcept("mesec")) for (const month of new Set(card.departureDates.map((date) => date.slice(0, 7)))) bump(facetMaps.mesec, month);
    if (passesExcept("prevoz")) for (const transport of new Set(card.transports)) bump(facetMaps.prevoz, transport);
    if (passesExcept("trajanje")) {
      const bucket = durationBucket(item.nights);
      if (bucket) bump(facetMaps.trajanje, bucket);
    }
    if (passesExcept("polazak")) {
      const seen = new Set<string>();
      item.cities.forEach((label, index) => {
        if (!isCleanCity(label)) return;
        const key = item.foldedCities[index];
        if (seen.has(key)) return;
        seen.add(key);
        bump(facetMaps.polazak, key);
        const labels = cityLabels.get(key) ?? new Map<string, number>();
        labels.set(label, (labels.get(label) ?? 0) + 1);
        cityLabels.set(key, labels);
      });
    }
    if (passesExcept("vrsta")) bump(facetMaps.vrsta, card.kind);
    if (passesExcept("partner") && card.kind === "partner") bump(facetMaps.partner, card.partnerSlug, ctx.partnerNames?.[card.partnerSlug]);
    if (passesExcept("cena") && card.priceFrom !== undefined && isEur(card.currency)) {
      priceMin = Math.min(priceMin, card.priceFrom);
      priceMax = Math.max(priceMax, card.priceFrom);
    }
  }

  // City label: the most frequent spelling, preferring one with diacritics ("Niš" over "Nis").
  for (const entry of facetMaps.polazak.values()) {
    const labels = [...(cityLabels.get(entry.value)?.entries() ?? [])];
    labels.sort((a, b) => b[1] - a[1] || Number(/[čćžšđ]/i.test(b[0])) - Number(/[čćžšđ]/i.test(a[0])));
    entry.label = labels[0]?.[0];
    entry.value = entry.label ?? entry.value;
  }

  const byCount = (a: FacetValue, b: FacetValue) => b.count - a.count || (a.label ?? a.value).localeCompare(b.label ?? b.value, "sr");
  const byValue = (a: FacetValue, b: FacetValue) => a.value.localeCompare(b.value);
  const facets: CatalogFacets = {
    tip: [...facetMaps.tip.values()].sort(byCount),
    zemlja: [...facetMaps.zemlja.values()].sort(byCount),
    mesec: [...facetMaps.mesec.values()].sort(byValue),
    prevoz: TRANSPORTS.map((transport) => facetMaps.prevoz.get(transport)).filter((entry): entry is FacetValue => Boolean(entry)),
    trajanje: DURATION_BUCKETS.map((bucket) => facetMaps.trajanje.get(bucket)).filter((entry): entry is FacetValue => Boolean(entry)),
    polazak: [...facetMaps.polazak.values()].sort(byCount).slice(0, 24),
    vrsta: [...facetMaps.vrsta.values()].sort(byValue),
    partner: [...facetMaps.partner.values()].sort(byCount),
    cena: Number.isFinite(priceMin) ? { min: Math.floor(priceMin), max: Math.ceil(priceMax) } : null,
  };

  const compare: Record<CatalogSort, (a: T, b: T) => number> = {
    polazak: (a, b) => a.sortDeparture.localeCompare(b.sortDeparture) || a.sortPrice - b.sortPrice,
    cena: (a, b) => a.sortPrice - b.sortPrice || a.sortDeparture.localeCompare(b.sortDeparture),
    novo: (a, b) => b.firstSeenAt - a.firstSeenAt || a.sortDeparture.localeCompare(b.sortDeparture),
  };
  result.sort(compare[sort]);
  return { items: result, total: result.length, facets };
}
