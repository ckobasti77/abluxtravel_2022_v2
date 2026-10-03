// Dunav Turs (custom PHP, HTTP only). Sitemap → *.html detail pages.
// Villas: period × unit matrix (per person, accommodation only, 10 nights).
// Trips: free text (dates, "CENA ARANŽMANA: 189 € po osobi", lists).
import { ParseError } from "../core/errors";
import { findCountry, nominativeCity } from "../core/geo";
import { absUrl, blockText, listAfterHeading, load, metaContent, tableToMatrix, type Cheerio$ } from "../core/html";
import { matrixDepartures } from "../core/matrix";
import { findDateRanges, findYearHint } from "../core/parse/dates";
import { parseDuration } from "../core/parse/duration";
import { parseAllEuro, parseEuro } from "../core/parse/prices";
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
  RawDetail,
  Supplement,
} from "../core/types";

const BASE = "http://www.dunavturs.com";

export function parseDunavSitemap(xml: string): DiscoveredItem[] {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].trim());
  return locs
    .filter((loc) => /\/ponude\/[^/]+\/.+\.html$/.test(loc))
    .map((loc) => {
      const url = new URL(loc);
      const externalId = url.pathname.replace(/^\//, "").replace(/\.html$/, "");
      return {
        key: externalId,
        externalId,
        url: `${BASE}${url.pathname}`,
        kind: "detail",
        priority: url.pathname.includes("/ponude/putovanja/") ? 0 : 1,
      };
    });
}

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

function busSupplements($: Cheerio$): { supplements: Supplement[]; cities: string[] } {
  const supplements: Supplement[] = [];
  const cities: string[] = [];
  const table = $("#tabs-2-4 table").first();
  if (!table.length) return { supplements, cities };
  const matrix = tableToMatrix($, table.get(0)!);
  for (const row of matrix.slice(1)) {
    const [place, time, adult, child, surcharge] = row.map((cell) => cell.text);
    if (!place || !adult) continue;
    const city = nominativeCity(place.split(",")[0]);
    const adultPrice = parseEuro(adult) ?? parseAllEuro(`${adult} €`)[0];
    if (!adultPrice) continue;
    cities.push(city);
    const childPrice = child ? parseEuro(child) ?? parseAllEuro(`${child} €`)[0] : undefined;
    const surchargePrice = surcharge ? parseEuro(surcharge) ?? parseAllEuro(`${surcharge} €`)[0] : undefined;
    const notes = [
      time ? `polazak ${time}` : undefined,
      childPrice ? `deca do 9,99 god. ${childPrice} €` : undefined,
      surchargePrice ? `doplata za smene sa * ${surchargePrice} €` : undefined,
    ].filter(Boolean);
    supplements.push({
      label: `Autobus iz mesta ${city} (povratna karta)`,
      price: adultPrice,
      basis: "per_person",
      note: notes.join("; ") || undefined,
    });
  }
  return { supplements, cities: uniqueStrings(cities) };
}

function departureCitiesFromText(text: string): string[] {
  const match = text.match(/Polazak iz ([A-ZČĆŠŽĐ][\p{L}]+(?: [A-ZČĆŠŽĐ][\p{L}]+)?)/u);
  return match ? [nominativeCity(match[1])] : [];
}

function images($: Cheerio$, pageUrl: string): string[] {
  const urls = $('img[src*="/images/offers/"]')
    .map((_, img) => absUrl(pageUrl, $(img).attr("src")))
    .get()
    .filter((url): url is string => Boolean(url) && !url!.includes("/thumbs/"));
  const og = metaContent($, "og:image");
  return uniqueStrings([og, ...urls]);
}

function programDays($: Cheerio$): NormalizedOffer["program"] {
  const days: NormalizedOffer["program"] = [];
  $("#tabs-2-1 p").each((_, p) => {
    const text = cleanLine($(p).text());
    const match = text.match(/^(?:[A-ZČĆŠŽĐa-zčćšžđ]+\s*\(\d{1,2}\.\d{1,2}\.?\)\s*)?(\d{1,2})\.\s*dan\s*:?\s*/i);
    if (!match) return;
    const title = text.slice(0, match[0].length).replace(/:\s*$/, "").trim();
    const rest = text.slice(match[0].length).trim();
    days.push({ day: Number(match[1]), title, html: `<p>${rest.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>` });
  });
  return days;
}

export function parseDunavDetail(html: string, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const $ = load(html);
  const heading = cleanLine($("h1.page-title").first().text());
  if (!heading) throw new ParseError("Nedostaje naslov (h1.page-title).");
  const segments = pathSegments(pageUrl); // ponude / leto-2026 / grcka / polihrono / slug.html
  const season = segments[1] ?? "";
  const countrySegment = segments[2];
  const placeSegment = segments[3];
  const country = findCountry(countrySegment);
  const yearHint = findYearHint(season, $("title").text());
  const comma = heading.lastIndexOf(",");
  const title = smartTitleCase(comma > 0 ? heading.slice(0, comma).trim() : heading);
  const placeFromTitle = comma > 0 ? heading.slice(comma + 1).trim() : undefined;
  // URL segments are lowercase slugs ("istanbul", "nea-kalikratija"): capitalize each word.
  const placeFromUrl = placeSegment?.replace(/-/g, " ").replace(/(^|\s)\p{L}/gu, (char) => char.toUpperCase());
  const place = placeFromTitle || placeFromUrl;
  const externalId = (() => {
    try {
      return new URL(pageUrl).pathname.replace(/^\//, "").replace(/\.html$/, "");
    } catch {
      return pageUrl;
    }
  })();

  const tab = $("#tabs-2-1");
  const tabText = blockText($, tab.get(0)!);
  const { supplements, cities } = busSupplements($);
  const description = $(".singl-fuul-opis").first().html() ?? undefined;
  const gps = $(".singl-fuul-opis").text().match(/GPS\s*KOORDINATE:?\s*([\d.]+)\s+([\d.]+)/i);
  const notesParts = [$("#tabs-2-5").html(), $("#tabs-2-3").html()].filter(Boolean) as string[];
  const base: NormalizedOffer = {
    partnerSlug: env.config.slug,
    externalId,
    sourceUrl: pageUrl,
    kind: "stay",
    title,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    categoryHints: [season, countrySegment ?? "", segments[1] === "putovanja" ? "putovanja" : ""].filter(Boolean),
    transports: [],
    availabilityMode: "dated",
    departures: [],
    departureCities: cities,
    supplements,
    images: images($, pageUrl),
    descriptionHtml: description,
    program: [],
    included: [],
    excluded: [],
    facts: [],
    documents: [],
    geo: gps ? { lat: Number(gps[1]), lng: Number(gps[2]) } : undefined,
    badges: [],
    warnings: [],
  };

  const priceTable = tab.find("table").first();
  if (priceTable.length) {
    const matrix = tableToMatrix($, priceTable.get(0)!);
    const unitRows = matrix
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => index > 0 && /\d\s*\/\s*\d|app|apt|studio|soba/i.test(row[0]?.text ?? ""))
      .map(({ index }) => index);
    const starNote = tabText.match(/^\*([^\n]{5,200})/m)?.[1]?.trim();
    const departures: Departure[] = matrixDepartures(matrix, {
      today: env.today,
      hintYear: yearHint,
      periodRow: 0,
      firstPeriodCol: 1,
      unitRows,
      unitLabel: (row) => cleanLine(row[0]?.text ?? ""),
      basis: "per_person",
      defaultNights: 10,
      markerNote: starNote,
    });
    const priceListLabel = tabText.match(/Cenovnik\s*br\.?\s*\d+[^\n]*?\d{1,2}\.\d{1,2}\.\d{4}\.?/i)?.[0];
    const notesHtml = tab
      .children("p")
      .toArray()
      .slice(1)
      .map((p) => `<p>${$(p).html() ?? ""}</p>`)
      .join("");
    return {
      ...base,
      kind: "stay",
      transports: supplements.length ? ["self", "bus"] : ["self"],
      departures,
      priceListLabel: priceListLabel ? cleanLine(priceListLabel) : undefined,
      priceNote: "Cena po osobi za smeštaj (10 noćenja), bez prevoza",
      notesHtml: [notesHtml, ...notesParts].join("") || undefined,
    };
  }

  // Trip page (free text).
  const ranges = findDateRanges(tabText.split(/PROGRAM PUTOVANJA/i)[0] ?? tabText, { today: env.today, hintYear: yearHint });
  const durationLine = tabText.match(/[^\n]*\d+\s*dana[^\n]*/i)?.[0] ?? "";
  const duration = parseDuration(durationLine);
  const priceLine = tabText.match(/CENA ARANŽMANA\s*:\s*([^\n]+)/i)?.[1] ?? "";
  const price = parseEuro(priceLine);
  const transports = parseTransports(durationLine);
  const departures: Departure[] = ranges.slice(0, 1).map((range) => ({
    date: range.start,
    endDate: range.end,
    nights: duration.nights,
    transport: transports[0],
    price,
    basis: "per_person",
  }));
  return {
    ...base,
    kind: "trip",
    place,
    transports: transports.length ? transports : ["bus"],
    nights: duration.nights,
    days: duration.days,
    departures,
    departureCities: uniqueStrings([...departureCitiesFromText(tabText), ...cities]),
    program: programDays($),
    included: listAfterHeading(tabText, /ARANŽMANA OBUHVATA:?/i, /ARANŽMANA NE OBUHVATA/i),
    excluded: listAfterHeading(tabText, /ARANŽMANA NE OBUHVATA:?/i, /Plaćanja i uslovi|NAPOMENA|Opis smeštaja/i),
    notesHtml: notesParts.join("") || undefined,
    descriptionHtml: base.descriptionHtml,
  };
}

export const dunavtursAdapter: PartnerAdapter = {
  family: "dunavturs",
  mergeMode: false,
  listedFrom: "discover",

  async discover(http: HttpLike, env: AdapterEnv) {
    const page = await http.getText(`${BASE}/sitemap.xml`, { accept: "application/xml,text/xml" });
    const items = parseDunavSitemap(page.body);
    env.log("info", `Pronađeno ${items.length} ponuda u sitemap-u.`);
    return { items, listedIds: items.map((item) => item.externalId!), complete: items.length > 0, warnings: [] };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem): Promise<RawDetail> {
    return { item, pages: { main: await http.getText(item.url) } };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], goneIds: [raw.item.externalId!], warnings: [] };
    return { offers: [parseDunavDetail(page.body, raw.item.url, env)], warnings: [] };
  },
};
