// NeoLab MARS sites: Viva, Ski & Sun, Rapsody (variant). List endpoint
// /services/list/ (JSON {html,total}) → detail page → optional pricelist
// (/services/get_pricelists/). Never calls calc, departures or booking.
import { ParseError } from "../core/errors";
import { countryForPlace, findCountry, findCountryInText, nominativeCity, placeFromText, type Country } from "../core/geo";
import { hashValue } from "../core/hash";
import { absUrl, load, metaContent, tableToMatrix, type Cheerio$, type MatrixCell } from "../core/html";
import { matrixDepartures } from "../core/matrix";
import { findDateTokens, findYearHint } from "../core/parse/dates";
import { parseDuration } from "../core/parse/duration";
import { isOnRequest, parseOldNew } from "../core/parse/prices";
import { parseTransports } from "../core/parse/transport";
import { cleanLine, smartTitleCase, uniqueStrings } from "../core/text";
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
  Transport,
} from "../core/types";

const countryOnly = (country: Country | undefined) => (country ? { place: undefined as string | undefined, country } : undefined);

type ListSpec = { objectGroupId: number; availability?: string; idPrefix?: string };
type MarsOptions = { variant?: "rapsody"; partnerId?: number; lists: ListSpec[]; perPage: number; pricelists: boolean };

export type MarsCard = {
  url: string;
  externalId: string;
  objectGroupId: number;
  title: string;
  location?: string;
  stars?: number;
  priceText?: string;
  price?: number;
  priceOld?: number;
  basis?: PriceBasis;
  priceNote?: string;
  onRequest: boolean;
  dates: string[];
  durationText?: string;
  transports: Transport[];
  badges: string[];
  cover?: string;
  listSig: string;
};

const optionsOf = (env: AdapterEnv): MarsOptions => ({
  lists: [{ objectGroupId: 1 }],
  perPage: 40,
  pricelists: false,
  ...(env.config.options as Partial<MarsOptions> | undefined),
});

function listUrl(base: string, spec: ListSpec, page: number, opts: MarsOptions): string {
  if (opts.variant === "rapsody") return `${base}/services/list/?objectGroupId=${spec.objectGroupId}&_page=${page}`;
  const params = new URLSearchParams({
    _page: String(page),
    perPage: String(opts.perPage),
    language: "sr",
    objectGroupId: String(spec.objectGroupId),
    dynamicPackage: "0",
  });
  if (spec.availability) params.set("availability", spec.availability);
  return `${base}/services/list/?${params.toString()}`;
}

/** Card wording → price basis ("Cena po danu" → per_day, "za 7 noći" → per_stay, "po osobi" → per_person). */
export function basisFromWording(text: string): { basis: PriceBasis; note?: string } {
  const lower = text.toLowerCase();
  if (/po danu/.test(lower)) return { basis: "per_day", note: "Cena po danu" };
  const stay = lower.match(/za\s*(\d+)\s*no[cć]/);
  if (stay) return { basis: "per_stay", note: `za ${stay[1]} noći` };
  if (/po osobi/.test(lower)) return { basis: "per_person" };
  return { basis: "unknown" };
}

function idFor(href: string, sliderId: string | undefined, spec: ListSpec, opts: MarsOptions): string {
  const trailing = href.match(/\/(\d+)\/?$/)?.[1];
  if (opts.variant === "rapsody" && trailing) return trailing;
  if (trailing && spec.idPrefix) return `${spec.idPrefix}-${trailing}`;
  const slider = sliderId?.match(/card-slider-(\d+)/)?.[1];
  if (slider) return slider;
  if (trailing) return trailing;
  try {
    return new URL(href).pathname.replace(/^\/|\/$/g, "");
  } catch {
    return href;
  }
}

/** /services/list/ JSON → cards. */
export function parseMarsList(json: { html?: string; total?: number }, base: string, spec: ListSpec, opts: MarsOptions): { total: number; cards: MarsCard[] } {
  if (typeof json?.html !== "string") throw new ParseError("services/list: nedostaje html.");
  const $ = load(json.html);
  const cards: MarsCard[] = [];
  $("a.card").each((_, element) => {
    const card = $(element);
    const href = absUrl(base, card.attr("href"));
    if (!href) return;
    const title = cleanLine(card.find(".card-title, h4, h3, h2").first().text());
    if (!title) return;
    const text = cleanLine(card.text());
    const location = cleanLine(card.find(".location, .card-location").first().text()) || undefined;
    const stars = card.find("i.fa-star").length || undefined;
    const onRequest = isOnRequest(text);
    let price: number | undefined;
    let priceOld: number | undefined;
    let priceText: string | undefined;
    let basis: PriceBasis | undefined;
    let priceNote: string | undefined;
    if (opts.variant === "rapsody") {
      const current = cleanLine(card.find("span.h4").first().text());
      const old = cleanLine(card.find("del").first().text());
      const parsedCurrent = parseOldNew(current);
      const parsedOld = parseOldNew(old);
      price = parsedCurrent?.price;
      priceOld = parsedOld?.price && price && parsedOld.price > price ? parsedOld.price : undefined;
      priceText = price ? `Već od € ${price} po osobi` : undefined;
      basis = price ? "per_person" : undefined;
    } else {
      const match = text.match(/(Cena[^€]*?)(€\s*[\d.,]+(?:\s*€\s*[\d.,]+)?)/);
      if (match) {
        priceText = `${match[1]}${match[2]}`.trim();
        const parsed = parseOldNew(match[2]);
        price = parsed?.price;
        priceOld = parsed?.priceOld;
        const wording = basisFromWording(match[1]);
        basis = wording.basis;
        priceNote = wording.note;
      }
    }
    const dates = card
      .find(".departure-link[data-href]")
      .map((_, link) => $(link).attr("data-href")?.match(/dateFrom=(\d{4}-\d{2}-\d{2})/)?.[1])
      .get()
      .filter((date): date is string => Boolean(date));
    const durationText = text.match(/\d+\s*dana\s*\|\s*\d+\s*no[cć]i/i)?.[0];
    const transports = new Set<Transport>();
    if (card.find("i.la-bus").length) transports.add("bus");
    if (card.find("i.la-plane").length) transports.add("plane");
    if (card.find("i.la-ship").length) transports.add("ship");
    for (const t of parseTransports(text.match(/Smeštaj[^R]{0,40}/)?.[0] ?? "")) transports.add(t);
    const badges = card
      .find(".badge")
      .map((_, badge) => cleanLine($(badge).text()))
      .get()
      .filter((badge) => badge && !/popust/i.test(badge));
    const cover =
      absUrl(base, card.find("img.cover-image").attr("src") ?? card.find("img.cover-image").attr("data-src")) ??
      absUrl(base, card.find("[data-background-image]").first().attr("data-background-image"));
    const externalId = idFor(href, card.find('[id^="card-slider-"]').attr("id"), spec, opts);
    cards.push({
      url: href,
      externalId,
      objectGroupId: spec.objectGroupId,
      title,
      location,
      stars,
      priceText,
      price,
      priceOld,
      basis,
      priceNote,
      onRequest,
      dates,
      durationText,
      transports: [...transports],
      badges,
      cover,
      listSig: hashValue({ title, location, priceText, onRequest, dates, durationText }),
    });
  });
  return { total: Number(json.total) || 0, cards };
}

/** data-params of the pricelist modal (accommodations only, never skipass). */
export function findPricelistParams($: Cheerio$): Record<string, string> | undefined {
  let found: Record<string, string> | undefined;
  $("[data-params]").each((_, element) => {
    if (found) return;
    const raw = $(element).attr("data-params");
    if (!raw) return;
    try {
      const params = JSON.parse(raw) as Record<string, unknown>;
      const view = String(params.view ?? "");
      if (!/pricelist_table/.test(view) || /skipass/.test(view)) return;
      if (params.publicId === undefined) return;
      found = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)]));
    } catch {
      // ignore malformed attributes
    }
  });
  return found;
}

/** Pricelist fragment (table.table-pricelist): periods in columns, units in rows, "€ old € new" cells. */
export function parseMarsPricelist(html: string, today: string, basis: PriceBasis, yearHint?: number): Departure[] {
  if (!html.trim()) return [];
  const $ = load(html);
  const table = $("table.table-pricelist").first();
  if (!table.length) return [];
  const matrix = tableToMatrix($, table.get(0)!);
  const header = matrix.findIndex((row) => row.some((cell) => findDateTokens(cell.text).length >= 2));
  if (header < 0) return [];
  const unitRows = matrix.map((_, index) => index).filter((index) => index > header);
  return matrixDepartures(matrix, {
    today,
    hintYear: yearHint,
    periodRow: header,
    firstPeriodCol: 1,
    unitRows,
    unitLabel: (row: MatrixCell[]) => cleanLine(row[0]?.text ?? "").replace(/^Soba\s+/i, ""),
    basis,
    cellPrice: (cell) => {
      const parsed = parseOldNew(cell.text);
      return parsed ? { price: parsed.price, priceOld: parsed.priceOld } : null;
    },
  });
}

function textOf($: Cheerio$, selector: string): string {
  return cleanLine($(selector).first().text());
}

function listItems($: Cheerio$, selector: string): string[] {
  return $(selector)
    .first()
    .find("ul")
    .first()
    .find("li")
    .map((_, li) => cleanLine($(li).text()))
    .get()
    .filter(Boolean);
}

function gallery($: Cheerio$, base: string): string[] {
  const raw = $("[data-images-gallery-main]").attr("data-images-gallery-main");
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as { src?: string }[];
    return items.map((item) => absUrl(base, item.src)).filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

function program($: Cheerio$): NormalizedOffer["program"] {
  const days: NormalizedOffer["program"] = [];
  $("section#itinerary .itineraray-day").each((index, element) => {
    const day = $(element);
    const title = cleanLine(day.find(".title").first().text()) || `${index + 1}. dan`;
    const html = day.find(".summary").first().html() ?? "";
    days.push({ day: Number(day.find(".day").first().text()) || index + 1, title, html });
  });
  if (days.length) return days;
  $(".btn-itinerary-day").each((index, element) => {
    const button = $(element);
    const label = cleanLine(button.find("div").first().text());
    const heading = cleanLine(button.find("h6").first().text());
    const n = Number(label.match(/\d+/)?.[0]) || index + 1;
    const body = $(`#collapseDay${n} .card-body`).first().html() ?? "";
    days.push({ day: n, title: heading ? `${n}. dan ${heading}` : `${n}. dan`, html: body });
  });
  return days;
}

function locationParts(location: string | undefined): { country?: ReturnType<typeof findCountry>; place?: string; region?: string } {
  if (!location) return {};
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  const country = findCountry(parts[0]) ?? countryForPlace(parts[parts.length - 1]);
  return { country, place: parts[parts.length - 1], region: parts.length > 2 ? parts[parts.length - 2] : undefined };
}

export function parseMarsDetail(html: string, pageUrl: string, card: MarsCard, pricelistHtml: string | undefined, env: AdapterEnv): NormalizedOffer {
  const $ = load(html);
  $("a.card").remove(); // related offers
  const base = new URL(pageUrl).origin;
  const h1 =
    $("section.page-type-details h1").first().text() ||
    $("h1.card-title").first().text() ||
    $("h1.details-title").first().text() ||
    $("h1")
      .filter((_, element) => $(element).closest(".modal").length === 0)
      .first()
      .text();
  const title = smartTitleCase(cleanLine(h1) || card.title);
  const pageText = cleanLine($("body").text());
  const location = textOf($, "div.location") || card.location;
  const { country: locCountry, place, region } = locationParts(location);
  // "Države: Italija, Francuska Trajanje: …" (Viva) — the page text is one line, so look for the first country name.
  const countryLine = pageText.match(/Države:\s*(.{1,120})/)?.[1];
  const country =
    locCountry ?? findCountryInText(countryLine?.split(/Trajanje|Transport|Itinerer/)[0]) ?? findCountry(card.location?.split(",")[0]);
  const isTrip = card.objectGroupId === 6 || /\/(putovanja|krstarenja)\//.test(pageUrl);
  // Trips without a location line (Rapsody): the destination starts the title or the URL ("/putovanja/budimpesta/…").
  const urlDestination = pageUrl.match(/\/putovanja\/([a-z0-9-]+)\//)?.[1]?.replace(/-/g, " ");
  const titleForPlace = title.replace(/^(Putovanje|Krstarenje)\s+/i, "");
  const inferred = isTrip
    ? (placeFromText(titleForPlace) ?? placeFromText(urlDestination) ?? countryOnly(findCountryInText(titleForPlace)))
    : undefined;
  const durationText = pageText.match(/Trajanje:\s*(\d+\s*dana\s*\|\s*\d+\s*no[cć]i)/i)?.[1] ?? $(".overview-icon-text").first().text() ?? card.durationText;
  const duration = parseDuration(durationText || card.durationText);
  const transportText = pageText.match(/Transport:\s*([A-Za-zčćšž/ ]{2,20})/)?.[1] ?? "";
  const transports = uniqueStrings([...parseTransports(transportText), ...card.transports]) as Transport[];
  if ($(".overview-icon, .overview-icon-text").length && $("i.la-bus").length && !transports.includes("bus")) transports.push("bus");
  const meeting = cleanLine($(".meeting-points-text .fw-bold").first().text());
  const departureCities = meeting ? meeting.split(",").map((city) => nominativeCity(city)) : [];
  const yearHint = findYearHint(title);

  // Departures
  const departures: Departure[] = [];
  const mainPrice = parseOldNew(cleanLine($('[id^="price-"] .unit-price-total').first().text()));
  const mainLabel = cleanLine($('[id^="price-"] .unit-price-label').first().text());
  $(".departure[data-dateFrom]").each((_, element) => {
    const from = $(element).attr("data-dateFrom") ?? $(element).attr("data-datefrom");
    const to = $(element).attr("data-dateTo") ?? $(element).attr("data-dateto");
    if (!from) return;
    departures.push({
      date: from,
      endDate: to,
      nights: duration.nights,
      transport: transports[0],
      price: mainPrice?.price,
      priceOld: mainPrice?.priceOld,
      basis: mainLabel ? basisFromWording(mainLabel).basis : "per_person",
    });
  });
  if (departures.length === 0 && card.dates.length) {
    for (const date of card.dates) {
      departures.push({
        date,
        nights: duration.nights,
        transport: transports[0],
        price: card.price,
        priceOld: card.priceOld,
        basis: card.basis ?? "per_person",
      });
    }
  }
  const pricelistDepartures = pricelistHtml ? parseMarsPricelist(pricelistHtml, env.today, card.basis ?? "unknown", yearHint) : [];
  departures.push(...pricelistDepartures);

  const listPrice =
    mainPrice && departures.every((departure) => departure.price === undefined)
      ? { price: mainPrice.price, priceOld: mainPrice.priceOld, basis: mainLabel ? basisFromWording(mainLabel).basis : ("per_person" as PriceBasis) }
      : card.price
        ? { price: card.price, priceOld: card.priceOld, basis: card.basis ?? ("unknown" as PriceBasis), note: card.priceNote }
        : undefined;

  // D4: MARS lists contain only active offers; no dates → on request.
  const availabilityMode: NormalizedOffer["availabilityMode"] = departures.length > 0 ? "dated" : "on_request";

  const description =
    $("section#description .show-more-content").first().html() ??
    $("section#description").first().html() ??
    undefined;
  const facts: NormalizedOffer["facts"] = [];
  $("section#location, section#distances")
    .find("div, li")
    .each((_, element) => {
      const text = cleanLine($(element).clone().children().remove().end().text());
      const match = text.match(/^([A-ZČĆŠŽĐa-zčćšžđ ]{3,30}):\s*(.{1,40})$/);
      if (match) facts.push({ label: match[1].trim(), value: match[2].trim() });
    });
  const mapMatch = $('iframe[data-src*="maps.google"], iframe[src*="maps.google"]').attr("data-src")?.match(/q=(-?[\d.]+),(-?[\d.]+)/);
  const notes = $(".details-price-excludes").first().children().slice(1);
  const notesHtml = notes.length ? notes.map((_, element) => $.html(element)).get().join("") : undefined;
  const images = uniqueStrings([metaContent($, "og:image"), ...gallery($, base), card.cover]);

  return {
    partnerSlug: env.config.slug,
    externalId: card.externalId,
    sourceUrl: pageUrl,
    kind: isTrip ? "trip" : "stay",
    title,
    countryName: (country ?? inferred?.country)?.name,
    countryCode: (country ?? inferred?.country)?.code,
    place: isTrip ? inferred?.place : place,
    region: isTrip ? undefined : region,
    categoryHints: uniqueStrings([...card.badges, ...(card.location ? [card.location] : [])]),
    transports: transports.length ? transports : isTrip ? [] : ["self"],
    nights: duration.nights,
    days: duration.days,
    stars: $("h1.card-title").first().parent().find("i.fa-star").length || card.stars,
    availabilityMode,
    departures,
    listPrice,
    priceNote: card.priceNote,
    departureCities,
    supplements: [],
    coverImage: images[0],
    images,
    descriptionHtml: description,
    program: program($),
    included: listItems($, ".details-price-includes"),
    excluded: listItems($, ".details-price-excludes"),
    notesHtml,
    facts: facts.slice(0, 12),
    documents: [],
    geo: mapMatch ? { lat: Number(mapMatch[1]), lng: Number(mapMatch[2]) } : undefined,
    badges: card.badges.some((badge) => /novo/i.test(badge)) ? ["new"] : [],
    warnings: [],
  };
}

export const marsAdapter: PartnerAdapter = {
  family: "mars",
  mergeMode: false,
  listedFrom: "discover",

  async discover(http: HttpLike, env: AdapterEnv) {
    const opts = optionsOf(env);
    const base = env.config.website;
    const items: DiscoveredItem[] = [];
    const warnings: string[] = [];
    let complete = true;
    let priority = 0;
    for (const spec of opts.lists) {
      let total = 0;
      for (let page = 1; page <= 50; page += 1) {
        const { json } = await http.getJson<{ html?: string; total?: number }>(listUrl(base, spec, page, opts));
        const parsed = parseMarsList(json, base, spec, opts);
        total = parsed.total;
        for (const card of parsed.cards) {
          items.push({
            key: card.externalId,
            externalId: card.externalId,
            url: card.url,
            kind: spec.objectGroupId === 6 ? "trip" : "accommodation",
            listSig: card.listSig,
            priority: priority++,
            data: card,
          });
        }
        if (parsed.cards.length === 0 || page * (opts.variant === "rapsody" ? 40 : opts.perPage) >= total) break;
      }
      if (total === 0) warnings.push(`Lista objectGroupId=${spec.objectGroupId} je prazna.`);
      const counted = items.filter((item) => (item.data as MarsCard).objectGroupId === spec.objectGroupId).length;
      if (total > 0 && counted < total * 0.9) complete = false;
    }
    env.log("info", `Pronađeno ${items.length} ponuda na listama.`);
    return { items, listedIds: items.map((item) => item.externalId!), complete: complete && items.length > 0, warnings };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem, env: AdapterEnv): Promise<RawDetail> {
    const opts = optionsOf(env);
    const main = await http.getText(item.url);
    const pages: RawDetail["pages"] = { main };
    const card = item.data as MarsCard;
    if (opts.pricelists && card.objectGroupId !== 6 && main.status < 400) {
      const params = findPricelistParams(load(main.body));
      if (params) {
        const query = new URLSearchParams(params).toString();
        pages.pricelist = await http.getText(`${env.config.website}/services/get_pricelists/?${query}`);
      }
    }
    return { item, pages };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], goneIds: [raw.item.externalId!], warnings: [] };
    const card = raw.item.data as MarsCard;
    return {
      offers: [parseMarsDetail(page.body, raw.item.url, card, raw.pages.pricelist?.body, env)],
      warnings: [],
    };
  },
};
