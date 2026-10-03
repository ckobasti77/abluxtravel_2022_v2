// SAN TSG TourVisio B2C pages with inline JSON: Big Blue. Pages are 3–6 MB;
// the data sits in the first ~200 KB, so the read stops once the needed JSON
// object is complete (stopWhen). Never the .asmx/.ashx services the page JS
// calls (the client denylist blocks them anyway).
// Prices are TOTALS for two adults (PriceSearchCriteria.roomCriteria) → basis
// "total_2_adults"; never divided.
import { ParseError } from "../core/errors";
import { countryForPlace, findCountry, findCountryInText } from "../core/geo";
import { extractJsonAfterMarker, markerComplete } from "../core/html";
import { parseBoard } from "../core/parse/board";
import { parseDuration } from "../core/parse/duration";
import { parseTransports } from "../core/parse/transport";
import { htmlToText } from "../core/sanitize";
import { parseSitemap } from "../core/sitemap";
import { cleanLine, escapeHtml, slugify, smartTitleCase, uniqueStrings } from "../core/text";
import type {
  AdapterEnv,
  Departure,
  DiscoveredItem,
  HttpLike,
  NormalizedOffer,
  ParseResult,
  PartnerAdapter,
  PriceBasis,
  RawDetail,
} from "../core/types";

export const TOUR_MARKERS = {
  tour: "TourDetailContainer.Prm.Tour =",
  hotel: "TourDetailContainer.Prm.Hotel =",
  criteria: "TourDetailContainer.Prm.PriceSearchCriteria =",
} as const;
export const ROTATOR_MARKER = "HotelListContainer.load(";

export const tourStopWhen = (body: string) => markerComplete(body, TOUR_MARKERS.criteria);
export const rotatorStopWhen = (body: string) => markerComplete(body, ROTATOR_MARKER);

type Named = { name?: string; id?: string };
type TvRoom = { roomName?: string; accomName?: string; boardName?: string; price?: { amount?: number; oldAmount?: number; currency?: string } };
type TvOffer = {
  checkIn?: string;
  night?: number;
  isAvailable?: boolean;
  rooms?: TvRoom[];
  price?: { amount?: number; oldAmount?: number; currency?: string };
  holidayPackage?: { name?: string; code?: string };
  transportation?: unknown;
};
type TvHotel = {
  id?: string;
  name?: string;
  stars?: number;
  country?: Named;
  city?: Named;
  location?: Named;
  thumbnailFull?: string;
  themes?: Named[];
  offers?: TvOffer[];
};
type TvTour = {
  id?: string;
  name?: string;
  code?: string;
  thumbnailFull?: string;
  itineraries?: { day?: number; items?: { description?: string }[] }[];
  textCategories?: { code?: string; presentations?: { text?: string }[] }[];
};
type TvCriteria = { roomCriteria?: { adult?: number; childAges?: number[] }[] };

const htmlToTextLines = (html: string) =>
  htmlToText(html)
    .split(/\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean);

export function basisFromCriteria(criteria: TvCriteria | undefined): PriceBasis {
  const rooms = criteria?.roomCriteria ?? [];
  return rooms.length === 1 && rooms[0].adult === 2 && (rooms[0].childAges ?? []).length === 0 ? "total_2_adults" : "unknown";
}

/** "ANDALUZIJSKA TURA 11.10.2026. NOVO" → "Andaluzijska tura" (sentence case, place names kept). */
export function tourTitle(name: string): string {
  const stripped = cleanLine(
    name
      .replace(/\b\d{1,2}\.\s?\d{1,2}\.\s?(\d{4}\.?)?/g, " ")
      .replace(/\b(NOVO|NEW|AKCIJA|PROMO|LAST MINUTE|FIRST MINUTE)\b!?/gi, " ")
  ).replace(/[\s.,–-]+$/, "");
  const lower = stripped.toLowerCase();
  return lower
    .split(" ")
    .map((word, index) => {
      const capital = word.charAt(0).toUpperCase() + word.slice(1);
      return index === 0 || findCountry(capital) || countryForPlace(capital) ? capital : word;
    })
    .join(" ");
}

function departuresOf(offers: TvOffer[] | undefined, basis: PriceBasis): Departure[] {
  const out: Departure[] = [];
  for (const offer of offers ?? []) {
    const date = offer.checkIn?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const room = offer.rooms?.[0];
    const price = room?.price ?? offer.price;
    if (price?.currency && price.currency !== "EUR") continue;
    const amount = price?.amount && price.amount > 0 ? Math.round(price.amount * 100) / 100 : undefined;
    const old = price?.oldAmount && amount && price.oldAmount > amount ? price.oldAmount : undefined;
    out.push({
      date,
      nights: offer.night || undefined,
      unit: room?.roomName ? cleanLine(room.roomName) : undefined,
      board: parseBoard(room?.boardName),
      transport: "plane",
      fromCity: "Beograd",
      price: amount,
      priceOld: old,
      basis,
      availability: offer.isAvailable === false ? "sold_out" : undefined,
    });
  }
  return out;
}

function textCategory(tour: TvTour, code: string): string {
  return (tour.textCategories ?? [])
    .filter((category) => category.code === code)
    .flatMap((category) => category.presentations ?? [])
    .map((presentation) => presentation.text ?? "")
    .join("\n");
}

/** Comma list that respects parentheses: "Prevoz …, avio-takse (…, …), smeštaj …". */
function splitList(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  [...text].forEach((char, index) => {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    const decimal = /\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? "");
    if (char === "," && depth === 0 && !decimal) {
      out.push(current);
      current = "";
    } else current += char;
  });
  out.push(current);
  return out.map((item) => cleanLine(item).replace(/\.$/, "")).filter((item) => item.length > 2);
}

export function parseTourPage(body: string, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const tour = extractJsonAfterMarker(body, TOUR_MARKERS.tour)?.json as TvTour | undefined;
  if (!tour?.name) throw new ParseError("Podaci ture nisu pronađeni na stranici.");
  const hotel = extractJsonAfterMarker(body, TOUR_MARKERS.hotel)?.json as TvHotel | undefined;
  const criteria = extractJsonAfterMarker(body, TOUR_MARKERS.criteria)?.json as TvCriteria | undefined;
  return tourOffer(tour, hotel, criteria, pageUrl, env);
}

export function tourOffer(tour: TvTour, hotel: TvHotel | undefined, criteria: TvCriteria | undefined, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const title = tourTitle(tour.name ?? "");
  if (!title) throw new ParseError("Tura nema naziv.");
  const shortHtml = textCategory(tour, "SHORTINFO");
  const importantHtml = textCategory(tour, "IMPORTANT");
  const shortLines = htmlToTextLines(shortHtml);
  const importantText = htmlToTextLines(importantHtml).join("\n");
  const durationLine = shortLines.find((line) => /\d+\s*dana|\d+\s*no[cć]/i.test(line)) ?? "";
  const duration = parseDuration(durationLine);
  const transports = parseTransports(durationLine);
  const country = findCountryInText(shortLines.slice(0, 4).join(" ")) ?? findCountryInText(title);
  const routeLine = shortLines.find((line) => /[–-]/.test(line) && line === line.toUpperCase() && line.length > 10);
  const basis = basisFromCriteria(criteria);
  const included = importantText.match(/cena putovanja obuhvata:?\s*([^\n]+)/i)?.[1] ?? importantText.match(/U cenu aranžmana (?:je )?uračunato:?\s*([^\n]+)/i)?.[1];
  const excluded = importantText.match(/U cenu aranžmana nije uračunato:?\s*([^\n]+)/i)?.[1];
  const program = (tour.itineraries ?? []).map((day, index) => {
    const text = (day.items ?? []).map((item) => item.description ?? "").join("\n");
    const [first, ...rest] = text.split(/\r?\n/).map((line) => cleanLine(line)).filter(Boolean);
    const heading = cleanLine((first ?? "").replace(/^\(\d{1,2}\.\d{1,2}\.\d{4}\.?\)\s*/, ""));
    return {
      day: day.day ?? index + 1,
      title: `${day.day ?? index + 1}. dan${heading ? ` ${heading}` : ""}`,
      html: rest.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
    };
  });
  const place = hotel?.city?.name ? smartTitleCase(hotel.city.name) : undefined;
  return {
    partnerSlug: env.config.slug,
    externalId: `tour-${slugify(title, 100)}`,
    sourceUrl: pageUrl,
    kind: "trip",
    title,
    subtitle: routeLine ? smartTitleCase(routeLine) : undefined,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    categoryHints: uniqueStrings(["Ture", ...shortLines.slice(0, 3)]).slice(0, 6),
    transports: transports.length ? transports : ["plane"],
    nights: duration.nights,
    days: duration.days,
    stars: hotel?.stars ? Math.round(hotel.stars) : undefined,
    availabilityMode: "dated",
    departures: departuresOf(hotel?.offers, basis),
    priceNote: basis === "total_2_adults" ? "Ukupna cena za 2 odrasle osobe" : undefined,
    departureCities: ["Beograd"],
    supplements: [],
    coverImage: tour.thumbnailFull,
    images: uniqueStrings([tour.thumbnailFull, hotel?.thumbnailFull]),
    descriptionHtml: shortHtml || undefined,
    program,
    included: included ? splitList(included) : [],
    excluded: excluded ? splitList(excluded) : [],
    notesHtml: importantHtml || undefined,
    facts: tour.code ? [{ label: "Šifra programa", value: tour.code }] : [],
    documents: [],
    badges: /specijalna ponuda|popust/i.test(shortLines.join(" ")) ? ["promo"] : [],
    warnings: hotel ? [] : ["Cena ture nije pronađena na stranici."],
  };
}

export function parseRotatorPage(body: string, pageUrl: string, env: AdapterEnv): NormalizedOffer[] {
  const data = extractJsonAfterMarker(body, ROTATOR_MARKER)?.json as { body?: { hotels?: TvHotel[] } } | undefined;
  if (!data?.body) throw new ParseError("Lista hotela nije pronađena na stranici.");
  return rotatorOffers(data.body.hotels ?? [], pageUrl, env);
}

export function rotatorOffers(hotels: TvHotel[], pageUrl: string, env: AdapterEnv): NormalizedOffer[] {
  // Rotator searches are run for 2 adults (same B2C default as the tour pages).
  const basis: PriceBasis = "total_2_adults";
  return hotels
    .filter((hotel) => hotel.id && hotel.name)
    .map((hotel) => {
      const country = findCountry(hotel.country?.name) ?? countryForPlace(hotel.city?.name);
      const packages = uniqueStrings((hotel.offers ?? []).map((offer) => offer.holidayPackage?.name));
      return {
        partnerSlug: env.config.slug,
        externalId: `hotel-${hotel.id}`,
        sourceUrl: pageUrl,
        kind: "stay" as const,
        title: smartTitleCase(cleanLine(hotel.name)),
        countryName: country?.name,
        countryCode: country?.code,
        place: hotel.city?.name ? smartTitleCase(hotel.city.name) : undefined,
        categoryHints: uniqueStrings([...(hotel.themes ?? []).map((theme) => theme.name), ...packages].map((hint) => smartTitleCase(cleanLine(hint)))).slice(0, 8),
        transports: ["plane" as const],
        stars: hotel.stars ? Math.round(hotel.stars) : undefined,
        availabilityMode: "dated" as const,
        departures: departuresOf(hotel.offers, basis),
        priceNote: "Ukupna cena za 2 odrasle osobe",
        departureCities: ["Beograd"],
        supplements: [],
        coverImage: hotel.thumbnailFull,
        images: uniqueStrings([hotel.thumbnailFull]),
        program: [],
        included: [],
        excluded: [],
        facts: [],
        documents: [],
        badges: /last-minute/.test(pageUrl) ? ["last_minute" as const] : [],
        warnings: [],
      };
    });
}

export function parseHomeRotators(html: string, base: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/href="((?:https:\/\/bigblue\.rs)?\/sr\/hotel\/rotator\/[a-z0-9-]+)\/?"/gi)) {
    links.add(`${new URL(match[1], base).toString().replace(/\/?$/, "/")}`);
  }
  return [...links];
}

export function tourUrls(xml: string): string[] {
  return uniqueStrings(parseSitemap(xml).map((entry) => entry.loc).filter((loc) => /\/sr\/tour\/[^/]+\/$/.test(loc)));
}

export const tourvisioAdapter: PartnerAdapter = {
  family: "tourvisio",
  mergeMode: true,
  listedFrom: "touched",

  async discover(http: HttpLike, env: AdapterEnv) {
    const base = env.config.website;
    const items: DiscoveredItem[] = [];
    const sitemap = await http.getText(`${base}/sitemap.xml`);
    for (const url of tourUrls(sitemap.body)) items.push({ key: `tour:${url}`, url, kind: "tour", priority: 0 });
    const home = await http.getText(`${base}/sr`);
    for (const url of parseHomeRotators(home.body, base)) items.push({ key: `rotator:${url}`, url, kind: "rotator", priority: 1 });
    return { items, listedIds: [], complete: items.length > 0, warnings: [] };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem): Promise<RawDetail> {
    const stopWhen = item.kind === "rotator" ? rotatorStopWhen : tourStopWhen;
    return { item, pages: { main: await http.getText(item.url, { stopWhen }) } };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], warnings: [`Stranica ne postoji: ${raw.item.url}`] };
    if (raw.item.kind === "rotator") return { offers: parseRotatorPage(page.body, raw.item.url, env), warnings: [] };
    return { offers: [parseTourPage(page.body, raw.item.url, env)], warnings: [] };
  },
};
