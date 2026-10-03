// SunLine (Nuxt + BlueVendo JSON endpoints). Merge mode: one work item per
// departure date; hotel offers accumulate departures across dates (D5).
import { ParseError } from "../core/errors";
import { countryForPlace, findCountry, nominativeCity } from "../core/geo";
import { parseBoard } from "../core/parse/board";
import { addDaysIso } from "../core/time";
import { cleanLine, decodeEntities } from "../core/text";
import type {
  AdapterEnv,
  Departure,
  DiscoveredItem,
  HttpLike,
  NormalizedOffer,
  ParseResult,
  PartnerAdapter,
  RawDetail,
} from "../core/types";

const BASE = "https://sunline.rs";

export type SunlineTripRow = {
  id?: string;
  offerId?: string;
  startDate: string;
  endDate?: string;
  length?: number;
  priceBase?: number;
  priceFull?: number;
  hotel: string;
  hotelId: string;
  standard?: string;
  region?: string;
  country?: string;
  image?: string;
  maintenanceName?: string;
  roomName?: string;
  departureAllotmentFree?: string;
  departureFlightNo?: string;
  departureAirlineName?: string;
  departureNode?: string;
};

export type SunlineHotel = {
  id: string;
  name: string;
  standard?: string;
  city?: string;
  region?: string;
  country?: string;
  descriptions?: { label?: string; body?: string }[];
  images?: string[];
  lat?: number;
  lng?: number;
};

const option = <T>(env: AdapterEnv, key: string, fallback: T): T =>
  (env.config.options?.[key] as T | undefined) ?? fallback;

const iso = (value: string | undefined) => (value ? value.slice(0, 10) : undefined);

const tripUrl = (countryId: number, startDate: string, length: number) =>
  `${BASE}/search/gettrip?countryId=${countryId}&startDate=${encodeURIComponent(startDate)}&tripLength=${length}&adults=2&infants=0&l1=`;

const hotelPageUrl = (hotelId: string, startDate: string, length: number) =>
  `${BASE}/hotel?hotelId=${encodeURIComponent(hotelId)}&startDate=${encodeURIComponent(startDate)}&tripLength=${length}&adults=2&infants=0`;

/** getdates → departure dates (ISO) within the horizon. */
export function parseSunlineDates(json: unknown, today: string, horizonDays: number): string[] {
  if (!Array.isArray(json)) throw new ParseError("getdates: očekivan niz datuma.");
  const last = addDaysIso(today, horizonDays);
  return json
    .map((row) => iso((row as { startDate?: string })?.startDate))
    .filter((date): date is string => Boolean(date) && date! >= today && date! <= last);
}

/** getlength → trip lengths. The response shape is not documented: numbers or objects. */
export function parseSunlineLengths(json: unknown): number[] {
  const values: number[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "number" && value > 0 && value < 60) values.push(value);
    else if (typeof value === "string" && /^\d{1,2}$/.test(value)) values.push(Number(value));
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const row = value as Record<string, unknown>;
      for (const key of ["length", "tripLength", "nights", "value", "id"]) {
        if (row[key] !== undefined) {
          visit(row[key]);
          return;
        }
      }
    }
  };
  visit(json);
  return [...new Set(values)].sort((a, b) => a - b);
}

function availabilityOf(free: string | undefined): Departure["availability"] {
  if (free === undefined || free === "*" || free === "") return "unknown";
  const n = Number(free);
  if (!Number.isFinite(n)) return "unknown";
  if (n <= 0) return "sold_out";
  if (n <= 4) return "few";
  return "available";
}

/** gettrip rows → one offer fragment per hotel (departures of this date/length). */
export function parseSunlineTrips(rows: SunlineTripRow[], env: AdapterEnv): NormalizedOffer[] {
  const byHotel = new Map<string, NormalizedOffer>();
  for (const row of rows) {
    if (!row?.hotelId || !row.hotel) continue;
    const date = iso(row.startDate);
    if (!date) continue;
    const board = parseBoard(row.maintenanceName);
    const departure: Departure = {
      date,
      endDate: iso(row.endDate),
      nights: row.length,
      unit: row.roomName ? cleanLine(row.roomName) : undefined,
      board,
      transport: "plane",
      fromCity: row.departureNode ? nominativeCity(row.departureNode) : undefined,
      price: typeof row.priceBase === "number" ? row.priceBase : undefined,
      basis: "per_person",
      availability: availabilityOf(row.departureAllotmentFree),
      note: [row.departureAirlineName, row.departureFlightNo].filter(Boolean).join(" ") || undefined,
    };
    const externalId = `hotel-${row.hotelId}`;
    const existing = byHotel.get(externalId);
    if (existing) {
      existing.departures.push(departure);
      continue;
    }
    const country = findCountry(row.country) ?? countryForPlace(row.region);
    byHotel.set(externalId, {
      partnerSlug: env.config.slug,
      externalId,
      sourceUrl: hotelPageUrl(row.hotelId, row.startDate, row.length ?? 7),
      kind: "stay",
      title: cleanLine(row.hotel),
      countryName: country?.name ?? row.country,
      countryCode: country?.code,
      place: row.region ? cleanLine(row.region) : undefined,
      categoryHints: ["Tunis", "letovanje"],
      transports: ["plane"],
      stars: row.standard ? (row.standard.match(/\*/g) ?? []).length || undefined : undefined,
      board,
      availabilityMode: "dated",
      departures: [departure],
      departureCities: departure.fromCity ? [departure.fromCity] : [],
      supplements: [],
      coverImage: row.image,
      images: row.image ? [row.image] : [],
      program: [],
      included: [],
      excluded: [],
      facts: [],
      documents: [],
      badges: [],
      warnings: [],
    });
  }
  return [...byHotel.values()];
}

/** gethotel → content fragment for the same hotel offer. */
export function parseSunlineHotel(json: unknown, env: AdapterEnv): NormalizedOffer {
  const raw = (Array.isArray(json) ? json[0] : json && typeof json === "object" && "0" in json ? (json as Record<string, unknown>)["0"] : json) as
    | SunlineHotel
    | undefined;
  if (!raw?.id || !raw.name) throw new ParseError("gethotel: nedostaje hotel.");
  const description = (raw.descriptions ?? [])
    .map((section) => {
      const label = cleanLine(decodeEntities(section.label ?? "")).replace(/:$/, "");
      return `${label ? `<h4>${label}</h4>` : ""}${section.body ?? ""}`;
    })
    .join("");
  const country = findCountry(raw.country);
  return {
    partnerSlug: env.config.slug,
    externalId: `hotel-${raw.id}`,
    sourceUrl: `${BASE}/hotel?hotelId=${encodeURIComponent(raw.id)}`,
    kind: "stay",
    title: cleanLine(raw.name),
    countryName: country?.name ?? raw.country,
    countryCode: country?.code,
    place: raw.city ? cleanLine(raw.city) : raw.region,
    region: raw.region,
    categoryHints: [],
    transports: ["plane"],
    stars: raw.standard ? (raw.standard.match(/\*/g) ?? []).length || undefined : undefined,
    availabilityMode: "dated",
    departures: [],
    departureCities: [],
    supplements: [],
    images: (raw.images ?? []).filter((url) => typeof url === "string"),
    descriptionHtml: description || undefined,
    program: [],
    included: [],
    excluded: [],
    facts: [],
    documents: [],
    geo: typeof raw.lat === "number" && typeof raw.lng === "number" ? { lat: raw.lat, lng: raw.lng } : undefined,
    badges: [],
    warnings: [],
  };
}

export const bluevendoAdapter: PartnerAdapter = {
  family: "bluevendo",
  mergeMode: true,
  listedFrom: "touched",

  async discover(http: HttpLike, env: AdapterEnv) {
    const countryId = option(env, "countryId", 13);
    const { json } = await http.getJson<unknown>(`${BASE}/search/getdates?countryId=${countryId}`);
    const dates = parseSunlineDates(json, env.today, option(env, "horizonDays", 210));
    const items: DiscoveredItem[] = dates.map((date, index) => ({
      key: `date:${date}`,
      kind: "date",
      url: `${BASE}/search/getlength?countryId=${countryId}&regionId=&hotelId=&startDate=${encodeURIComponent(`${date}T00:00:00Z`)}`,
      priority: index,
      data: { date },
    }));
    env.log("info", `Pronađeno ${dates.length} datuma polaska.`);
    return { items, listedIds: [], complete: true, warnings: [] };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem, env: AdapterEnv): Promise<RawDetail> {
    if (item.kind === "hotel") {
      const page = await http.getText(item.url, { accept: "application/json" });
      return { item, pages: { main: page } };
    }
    const countryId = option(env, "countryId", 13);
    const date = (item.data as { date: string }).date;
    const startDate = `${date}T00:00:00Z`;
    const lengthsPage = await http.getText(item.url, { accept: "application/json" });
    let lengths: number[] = [];
    try {
      lengths = parseSunlineLengths(JSON.parse(lengthsPage.body));
    } catch {
      lengths = [];
    }
    if (lengths.length === 0) {
      env.log("warn", `getlength za ${date} nije prepoznat; koristi se 7 noći.`);
      lengths = [7];
    }
    const pages: RawDetail["pages"] = { lengths: lengthsPage };
    for (const length of lengths.slice(0, 4)) {
      pages[`trip-${length}`] = await http.getText(tripUrl(countryId, startDate, length), { accept: "application/json" });
    }
    return { item, pages };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    if (raw.item.kind === "hotel") {
      return { offers: [parseSunlineHotel(JSON.parse(raw.pages.main.body), env)], warnings: [] };
    }
    const offers: NormalizedOffer[] = [];
    for (const [key, page] of Object.entries(raw.pages)) {
      if (!key.startsWith("trip-")) continue;
      let rows: unknown;
      try {
        rows = JSON.parse(page.body);
      } catch {
        throw new ParseError(`gettrip (${key}) nije ispravan JSON.`);
      }
      if (!Array.isArray(rows)) throw new ParseError("gettrip: očekivan niz.");
      offers.push(...parseSunlineTrips(rows as SunlineTripRow[], env));
    }
    const hotelIds = [...new Set(offers.map((offer) => offer.externalId.replace(/^hotel-/, "")))];
    const followUps: DiscoveredItem[] = hotelIds.map((id) => ({
      key: `hotel:${id}`,
      kind: "hotel",
      externalId: `hotel-${id}`,
      url: `${BASE}/search/gethotel?hotelId=${encodeURIComponent(id)}`,
      priority: 1000,
    }));
    return { offers, followUps, warnings: [] };
  },
};
