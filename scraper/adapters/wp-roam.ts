// WordPress "Roam" theme (Mikado tours): Nitravel. Nitravel resells programs
// of other organizers; the organizer sentence names them ("… turističke
// agencije Plan A Travel licenca OTP 222/2021 kategorija A").
import type { Element } from "domhandler";
import { ParseError } from "../core/errors";
import { countryForPlace, findCountry, findCountryInText, nominativeCity, placeFromText } from "../core/geo";
import { absUrl, blockText, detectMatrixLayout, listAfterHeading, load, metaContent, tableToMatrix, type Cheerio$, type MatrixCell } from "../core/html";
import { matrixDepartures } from "../core/matrix";
import { parseBoard } from "../core/parse/board";
import { findDateRanges, findDateTokens, findYearHint } from "../core/parse/dates";
import { parseDuration } from "../core/parse/duration";
import { parseAllEuro, parseEuro } from "../core/parse/prices";
import { parseTransports } from "../core/parse/transport";
import { parseSitemap } from "../core/sitemap";
import { diffDaysIso } from "../core/time";
import { cleanLine, fold, smartTitleCase, uniqueStrings } from "../core/text";
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

const countDates = (text: string) => findDateTokens(text).length;
export const tourSlug = (url: string) => url.match(/\/tour-item\/([^/?#]+)\/?$/)?.[1];

export function parseTourSitemap(xml: string, today: string): DiscoveredItem[] {
  return parseSitemap(xml)
    .map((entry) => ({ entry, slug: tourSlug(entry.loc) }))
    .filter((row): row is { entry: { loc: string; lastmod?: string }; slug: string } => Boolean(row.slug))
    .map(({ entry, slug }) => {
      const modified = entry.lastmod?.slice(0, 10);
      return {
        key: slug,
        externalId: slug,
        url: entry.loc,
        listSig: entry.lastmod,
        sourceModifiedAt: modified,
        // newest first
        priority: modified ? Math.max(0, diffDaysIso(modified, today)) : 9999,
      };
    });
}

const ORGANIZER =
  /organizatora putovanja,?\s+turisti[cč]ke agencije\s+(.+?),?\s+licenc[ae]\s+(OTP\s*[\d/]+(?:,?\s*kategorij\w*\s+\w+)?)/i;

export function parseOrganizer(text: string): { name: string; license?: string } | undefined {
  const match = text.match(ORGANIZER);
  if (!match) return undefined;
  return { name: cleanLine(match[1]).replace(/[„“"]/g, ""), license: cleanLine(match[2]) };
}

const INFO_LABELS: [RegExp, string][] = [
  [/^Destination\s*/i, "destination"],
  [/^Departure Time\s*/i, "departure-time"],
  [/^Departure\s*/i, "departure"],
  [/^Return Time\s*/i, "return-time"],
  [/^Not Included\s*/i, "not-included"],
  [/^Included\s*/i, "included"],
];

/** `ul.mkdf-tour-main-info-holder > li` ("Destination Češka", "Departure Mogućnost polaska iz Niša", …). */
function mainInfo($: Cheerio$): Map<string, string> {
  const info = new Map<string, string>();
  $("ul.mkdf-tour-main-info-holder > li").each((_, element) => {
    const text = cleanLine($(element).text());
    const hit = INFO_LABELS.find(([pattern]) => pattern.test(text));
    if (hit && !info.has(hit[1])) info.set(hit[1], text.replace(hit[0], ""));
  });
  return info;
}

/** "TERMINI PUTOVANJA | HOTEL | CENA PO OSOBI | SPECIJALNA PONUDA". */
function tripTable(matrix: MatrixCell[][], opts: { today: string; hintYear?: number; transport?: Departure["transport"] }): Departure[] {
  const header = matrix[0]?.map((cell) => fold(cell.text)) ?? [];
  const terminCol = header.findIndex((text) => text.includes("termin"));
  const hotelCol = header.findIndex((text) => text.includes("hotel") || text.includes("smestaj"));
  const priceCol = header.findIndex((text) => text.startsWith("cena"));
  const specialCol = header.findIndex((text) => /specijal|promo|akcij|popust|first|last/.test(text));
  if (terminCol < 0 || priceCol < 0) return [];
  const out: Departure[] = [];
  for (const row of matrix.slice(1)) {
    const termin = row[terminCol]?.text ?? "";
    const range = findDateRanges(termin, opts)[0];
    if (!range) continue;
    const regular = parseEuro(row[priceCol]?.text ?? "");
    const special = specialCol >= 0 ? parseEuro(row[specialCol]?.text ?? "") : undefined;
    const price = special ?? regular;
    if (!price) continue;
    const label = termin.split(":")[0];
    out.push({
      date: range.start,
      endDate: range.end,
      unit: hotelCol >= 0 ? row[hotelCol]?.text || undefined : undefined,
      transport: opts.transport,
      price,
      priceOld: special && regular && regular > special ? regular : undefined,
      basis: "per_person",
      note: label && label !== termin && !/\d/.test(label) ? label : undefined,
    });
  }
  return out;
}

export function parseRoamDetail(html: string, pageUrl: string, env: AdapterEnv, sourceModifiedAt?: string): NormalizedOffer {
  const $ = load(html);
  const slug = tourSlug(pageUrl);
  if (!slug) throw new ParseError("Neočekivan URL programa.");
  const h1 = cleanLine($("h1.mkdf-tt-single, .mkdf-tour-item-title-holder h1, h1").first().text());
  if (!h1) throw new ParseError("Nedostaje naslov (h1).");
  const title = smartTitleCase(h1);
  const info = mainInfo($);
  const destination = info.get("destination") ?? "";
  const ogTitle = metaContent($, "og:title") ?? "";
  const country =
    findCountry(destination) ?? countryForPlace(destination) ?? findCountryInText(ogTitle) ?? findCountryInText(destination);
  // "Destination Češka" names the country: the place is then the city in the title ("PRAG", "Istanbul 3 noćenja").
  const place = findCountry(destination) ? placeFromText(title)?.place : destination ? smartTitleCase(destination) : undefined;
  const durationText = cleanLine($(".mkdf-tour-item-short-info, .mkdf-tsi-duration").first().text());
  const duration = parseDuration(durationText);
  const included = info.get("included") ?? "";
  const custom1 = $("#tour-item-custom1-id").get(0);
  const custom2 = $("#tour-item-custom2-id").get(0);
  const custom1Text = custom1 ? blockText($, custom1) : "";
  const pageText = blockText($, $("body").get(0)!);
  const priceListLabel = pageText.match(/Cenovnik\s+broj\s+\d+\s+od\s+\d{1,2}\.\s?\d{1,2}\.\s?\d{4}\.?/i)?.[0];
  const yearHint = findYearHint(priceListLabel, ogTitle, custom1Text);
  const transports = parseTransports([included, custom1Text.slice(0, 400), ogTitle].join(" "));
  const isStay = /^(vila|apartmani|hotel|studio)/i.test(title) || /ležaj|smeštajn\w* jedinic|studij/i.test(custom1Text.slice(0, 600));

  const warnings: string[] = [];
  const departures: Departure[] = [];
  const tables = custom1 ? $(custom1).find("table").toArray() : [];
  for (const table of tables) {
    const matrix = tableToMatrix($, table);
    const head = fold(matrix[0]?.map((cell) => cell.text).join(" ") ?? "");
    if (/termin/.test(head) && /cena/.test(head)) {
      departures.push(...tripTable(matrix, { today: env.today, hintYear: yearHint, transport: transports[0] }));
      continue;
    }
    const layout = detectMatrixLayout(matrix, countDates);
    if (!layout) continue;
    const unitRows = matrix
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row, index }) =>
          index > layout.periodRow &&
          row[1] !== row[0] &&
          row.slice(layout.firstPeriodCol).some((cell) => /\d/.test(cell.text))
      );
    const own = unitRows.filter(({ row }) => fold(row[0].text).includes(fold(h1)) || fold(h1).includes(fold(row[0].text)));
    if (!own.length && unitRows.length) warnings.push("Cenovnik ne razdvaja objekte po nazivu; prikazani su svi objekti iz tabele.");
    const defaultNights = Number(fold(custom1Text).match(/(\d{1,2})\s*nocenja/)?.[1]) || duration.nights;
    departures.push(
      ...matrixDepartures(matrix, {
        today: env.today,
        hintYear: yearHint,
        periodRow: layout.periodRow,
        firstPeriodCol: layout.firstPeriodCol,
        nightsRow: layout.nightsRow,
        unitRows: (own.length ? own : unitRows).map(({ index }) => index),
        unitLabel: (row) => (layout.firstPeriodCol > 1 && row[1].text !== row[0].text ? `${smartTitleCase(row[0].text)} ${row[1].text}` : smartTitleCase(row[0].text)),
        basis: /po osobi/i.test(custom1Text) ? "per_person" : "per_unit",
        transport: transports.includes("bus") ? "bus" : undefined,
        defaultNights,
      })
    );
  }

  const organizer = parseOrganizer(pageText) ?? env.config.organizer;
  const discounts = listAfterHeading(custom1Text, /POPUSTI I DOPLATE:?/i, /ARANŽMAN OBUHVATA|\n\s*\n/i);
  const supplements: Supplement[] = discounts
    .filter((line) => /doplat/i.test(line))
    .map((line) => ({ label: line.replace(/[,.]$/, ""), price: parseAllEuro(line)[0], basis: "per_person" as const }))
    .slice(0, 12);
  const firstDay = cleanLine($("#tour-item-plan-id .mkdf-tour-item-plan-part-title").first().text());
  const departureCities = uniqueStrings(
    [
      /beograd/i.test(firstDay) ? "Beograd" : undefined,
      ...[...(info.get("departure") ?? "").matchAll(/iz\s+([A-ZČĆŠŽĐ][\p{L}.]+(?:\s+[A-ZČĆŠŽĐ][\p{L}]+)?)/gu)].map((match) => nominativeCity(match[1])),
    ].filter(Boolean)
  );
  const program = $("#tour-item-plan-id .mkdf-tour-item-plan-part")
    .toArray()
    .map((part: Element) => {
      const heading = cleanLine($(part).find(".mkdf-tour-item-plan-part-title").text());
      const day = Number(heading.match(/^(\d{1,2})/)?.[1]) || undefined;
      return { day, title: heading.replace(/\s*:\s*/, " ").trim(), html: $(part).find(".mkdf-tour-item-plan-part-description").html() ?? "" };
    })
    .filter((part) => part.title);
  const gallery = $("#tour-item-gallery-id img")
    .map((_, element) => $(element).attr("data-src") ?? $(element).attr("src"))
    .get()
    .filter((src) => src && !src.startsWith("data:"))
    .map((src) => absUrl(pageUrl, src)!);
  const ogImage = metaContent($, "og:image");
  const notes = custom2 ? ($(custom2).html() ?? undefined) : undefined;

  return {
    partnerSlug: env.config.slug,
    externalId: slug,
    sourceUrl: pageUrl,
    kind: isStay ? "stay" : "trip",
    title,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    categoryHints: uniqueStrings(ogTitle.replace(/^.*? - Nitravel\s*/i, "").split(/,\s*/)),
    transports,
    nights: duration.nights,
    nightsMax: duration.nightsMax,
    days: duration.days,
    board: parseBoard(included),
    availabilityMode: "dated",
    departures,
    departureCities,
    supplements,
    coverImage: ogImage ?? gallery[0],
    images: uniqueStrings([ogImage, ...gallery]),
    descriptionHtml: $(".mkdf-tour-item-content").first().html() ?? undefined,
    program,
    included: listAfterHeading(custom1Text, /ARANŽMAN OBUHVATA:?/i, /ARANŽMAN NE OBUHVATA/i),
    excluded: listAfterHeading(custom1Text, /ARANŽMAN NE OBUHVATA:?/i, /CENE FAKULTATIVNIH|NAPOMEN|\n\s*\n/i),
    notesHtml: notes,
    facts: [],
    organizer,
    priceListLabel: priceListLabel ? cleanLine(priceListLabel) : undefined,
    documents: [],
    badges: [],
    sourceModifiedAt,
    warnings: departures.length === 0 ? [...warnings, "Termini nisu pronađeni u cenovniku."] : warnings,
  };
}

export const wpRoamAdapter: PartnerAdapter = {
  family: "wp-roam",
  mergeMode: false,
  listedFrom: "discover",

  async discover(http: HttpLike, env: AdapterEnv) {
    const page = await http.getText(`${env.config.website}/tour-item-sitemap.xml`);
    const items = parseTourSitemap(page.body, env.today);
    return { items, listedIds: items.map((item) => item.externalId!), complete: items.length > 0, warnings: [] };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem): Promise<RawDetail> {
    return { item, pages: { main: await http.getText(item.url) } };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], goneIds: [raw.item.externalId!], warnings: [] };
    return { offers: [parseRoamDetail(page.body, raw.item.url, env, raw.item.sourceModifiedAt)], warnings: [] };
  },
};
