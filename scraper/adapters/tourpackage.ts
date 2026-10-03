// WordPress "tourpackage" theme (GoodLayers): Mayak Tours; Jungman Travel uses
// the same theme (blocked, fixture-free: config only).
// Listed set = union of package-category archives; the package sitemap only
// supplies lastmod (listSig). Detail: .package-info lines, gdl tabs, TablePress.
import type { Element } from "domhandler";
import { ParseError } from "../core/errors";
import { countryForPlace, findCountryInText } from "../core/geo";
import { absUrl, blockText, cleanImageUrl, dayProgram, detectMatrixLayout, listAfterHeading, load, metaContent, tableToMatrix, type Cheerio$, type MatrixCell } from "../core/html";
import { matrixDepartures } from "../core/matrix";
import { parseBoard } from "../core/parse/board";
import { findDateRanges, findDateTokens, findMonthNameRanges, findYearHint } from "../core/parse/dates";
import { parseDuration } from "../core/parse/duration";
import { parseAllEuro, parseEuro } from "../core/parse/prices";
import { parseTransports } from "../core/parse/transport";
import { parseSitemapLastmod } from "../core/sitemap";
import { cleanLine, fold, smartTitleCase, uniqueStrings } from "../core/text";
import type {
  AdapterEnv,
  Badge,
  Departure,
  DiscoveredItem,
  HttpLike,
  NormalizedOffer,
  ParseResult,
  PartnerAdapter,
  PriceBasis,
  RawDetail,
} from "../core/types";

export const DEFAULT_CATEGORIES = [
  "aktuelno",
  "evropski-gradovi",
  "first-minute",
  "last-minute",
  "nova-godina",
  "krstarenja",
  "zimovanje",
  "letovanje",
];
const LOW_PRIORITY_CATEGORIES = new Set(["letovanje"]);

const countDates = (text: string) => findDateTokens(text).length;

export const packageSlug = (url: string) => url.match(/\/package\/([^/?#]+)\/?$/)?.[1];

export function parseCategoryPage(html: string, base: string): { links: string[]; lastPage: number } {
  const $ = load(html);
  const links = uniqueStrings(
    $(".gdl-package-widget h2.package-title a")
      .map((_, element) => absUrl(base, $(element).attr("href")))
      .get()
      .filter((url): url is string => Boolean(url && packageSlug(url)))
  );
  const pages = $("a[href*='/page/']")
    .map((_, element) => Number(($(element).attr("href") ?? "").match(/\/page\/(\d+)\/?$/)?.[1]))
    .get()
    .filter((value) => value > 0);
  return { links, lastPage: Math.max(1, ...pages) };
}

const PROMO_SEGMENT = /^(hit ponuda|hit|promo|akcija|specijalna ponuda|last minute|first minute)$/i;
const TRANSPORT_SEGMENT = /^(avionom|autobusom|brodom|vozom|sopstvenim prevozom)$/i;
const DURATION_SEGMENT = /^\d+\s*(dana|dan|noći|noćenja|noci|nocenja)$/i;

/** "MALTA – ostrvo vitezova & istorije – 4 dana – avionom" → "Malta – ostrvo vitezova & istorije". */
export function cleanPackageTitle(raw: string): { title: string; head: string; stars?: number; segments: string[] } {
  const segments = cleanLine(raw)
    .split(/\s+[–—-]\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const kept = segments.filter(
    (segment, index) => index === 0 || !(PROMO_SEGMENT.test(segment) || TRANSPORT_SEGMENT.test(segment) || DURATION_SEGMENT.test(segment))
  );
  const stars = Number(kept[0]?.match(/(\d)\s*\*/)?.[1]) || undefined;
  const first = (kept[0] ?? raw).replace(/\s*\d\s*\*\s*$/, "").replace(/\s*\d\s*\*\s+/, " ");
  const firstWord = first.split(" ")[0];
  const head = firstWord.length > 1 && firstWord === firstWord.toUpperCase() && /[A-ZČĆŠŽĐ]/.test(firstWord)
    ? `${smartTitleCase(firstWord)}${first.slice(firstWord.length)}`
    : first;
  return { title: [head, ...kept.slice(1)].join(" – "), head, stars, segments };
}

/** `<title>`: "<name> - <cat>, <cat>, … - Turistička agencija Mayak Tours" → category hints. */
export function titleCategories(titleTag: string): string[] {
  const withoutSite = titleTag.replace(/\s+-\s+Turistička agencija [^-]+$/i, "");
  const parts = withoutSite.split(/\s+-\s+/);
  const firstList = parts.findIndex((part) => part.includes(","));
  if (firstList < 0) return [];
  return uniqueStrings(
    parts
      .slice(firstList)
      .join(" - ")
      .split(/,\s*/)
      .map((hint) => cleanLine(hint))
  );
}

function packageInfo($: Cheerio$): Map<string, Element> {
  const info = new Map<string, Element>();
  $(".package-info-wrapper .package-info").each((_, element) => {
    const head = fold(cleanLine($(element).find(".head").first().text())).replace(/:$/, "").trim();
    if (head) info.set(head, element);
  });
  return info;
}

function tabs($: Cheerio$): { title: string; element: Element }[] {
  const titles = $(".gdl-tab-title li a")
    .map((_, element) => ({ id: $(element).attr("data-tab") ?? "", title: cleanLine($(element).text()) }))
    .get();
  return titles
    .map(({ id, title }) => ({ title, element: $(`.gdl-tab-content > li[data-tab="${id}"]`).get(0) }))
    .filter((tab): tab is { title: string; element: Element } => Boolean(tab.element));
}

/** "TERMIN | BROJ I VREME LETA | CENA | PROMO CENA" tables (one departure per row). */
function tripTableDepartures(matrix: MatrixCell[][], opts: { today: string; hintYear?: number; transport?: Departure["transport"] }): Departure[] {
  const header = matrix[0]?.map((cell) => fold(cell.text)) ?? [];
  const terminCol = header.findIndex((text) => text.includes("termin"));
  const priceCol = header.findIndex((text) => /^cena/.test(text));
  const promoCol = header.findIndex((text) => /promo|specijal|akcij|popust/.test(text));
  const infoCol = header.findIndex((text) => /let|polazak|prevoz/.test(text));
  if (terminCol < 0 || priceCol < 0) return [];
  const out: Departure[] = [];
  for (const row of matrix.slice(1)) {
    const termin = row[terminCol]?.text ?? "";
    const range = findDateRanges(termin, opts)[0];
    if (!range) continue;
    const regular = parseEuro(row[priceCol]?.text ?? "");
    const promoText = promoCol >= 0 ? (row[promoCol]?.text ?? "") : "";
    const promo = parseEuro(promoText);
    const price = promo ?? regular;
    if (!price) continue;
    const suffix = promoText.replace(/^[^€]*€\s*/, "").trim();
    const label = termin.split("/").slice(1).join("/").trim();
    const note = [label, suffix, infoCol >= 0 ? row[infoCol]?.text : undefined].filter(Boolean).join("; ");
    out.push({
      date: range.start,
      endDate: range.end,
      transport: opts.transport,
      price,
      priceOld: promo && regular && regular > promo ? regular : undefined,
      basis: "per_person",
      note: note ? note.slice(0, 120) : undefined,
    });
  }
  return out;
}

function listPriceOf($: Cheerio$, element: Element | undefined): NormalizedOffer["listPrice"] {
  if (!element) return undefined;
  const normal = parseEuro(cleanLine($(element).find(".normal-price").text()));
  const discount = parseEuro(cleanLine($(element).find(".discount-price").text()));
  const text = cleanLine($(element).text()).replace(/^Cena:\s*/i, "");
  const basis: PriceBasis = /po\s+osobi\s*\/\s*no[cć]/i.test(text)
    ? "per_person_night"
    : /po\s+osobi/i.test(text)
      ? "per_person"
      : /po\s+sobi|po\s+apartmanu/i.test(text)
        ? "per_unit"
        : "per_person";
  if (discount && normal && discount < normal) return { price: discount, priceOld: normal, basis };
  const first = normal ?? parseAllEuro(text)[0];
  return first ? { price: first, basis } : undefined;
}

export function parsePackageDetail(html: string, pageUrl: string, env: AdapterEnv, sourceModifiedAt?: string): NormalizedOffer {
  const $ = load(html);
  const slug = packageSlug(pageUrl);
  if (!slug) throw new ParseError("Neočekivan URL paketa.");
  const titleTag = cleanLine($("title").text());
  const rawTitle =
    $("a.package-book-now-button").first().attr("data-title") ??
    titleTag.replace(/\s+-\s+Turistička agencija [^-]+$/i, "").split(/\s+-\s+(?=[^,]*,)/)[0];
  if (!cleanLine(rawTitle)) throw new ParseError("Nedostaje naslov paketa.");
  const cleaned = cleanPackageTitle(rawTitle);
  const stars = cleaned.stars;
  const hints = titleCategories(titleTag || metaContent($, "og:title") || "");
  const info = packageInfo($);
  const durationText = cleanLine($(info.get("trajanje")).text()).replace(/^Trajanje:\s*/i, "");
  const locationText = cleanLine($(info.get("lokacija")).text()).replace(/^Lokacija:\s*/i, "");
  const locationParts = locationText.split(/\s*[,–—]\s*|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  const place = locationParts[0] ? smartTitleCase(locationParts[0]) : undefined;
  const country = findCountryInText(rawTitle) ?? findCountryInText(hints.join(", ")) ?? countryForPlace(place);
  const duration = parseDuration(durationText);
  const pageTabs = tabs($);
  const priceTab = pageTabs.find((tab) => /cenovnik|cen[ae]/i.test(fold(tab.title)));
  const programTab = pageTabs.find((tab) => /program/i.test(fold(tab.title)));
  const notesTab = pageTabs.find((tab) => /napomen/i.test(fold(tab.title)));
  const priceText = priceTab ? blockText($, priceTab.element) : "";
  const yearHint = findYearHint(priceText, titleTag, durationText) ?? findYearHint(sourceModifiedAt);
  const transports = parseTransports([rawTitle, hints.join(" "), durationText, priceText.slice(0, 600)].join(" "));
  const ribbon = cleanLine($(".package-ribbon-wrapper").first().text());
  const badges: Badge[] = [];
  if (/last minute/i.test(hints.join(" "))) badges.push("last_minute");
  if (/first minute/i.test(hints.join(" "))) badges.push("first_minute");
  if (/promo|snižen|popust|specijaln/i.test(ribbon)) badges.push("promo");

  const tables = priceTab ? $(priceTab.element).find("table.tablepress, table").toArray() : [];
  let departures: Departure[] = [];
  let kind: NormalizedOffer["kind"] = /^(hotel|vila|apartmani|studio)/i.test(cleaned.head) ? "stay" : "trip";
  let basisNote: string | undefined;
  for (const table of tables) {
    const matrix = tableToMatrix($, table);
    const head = fold(matrix[0]?.map((cell) => cell.text).join(" ") ?? "");
    if (/termin/.test(head) && /cena/.test(head) && !/termin putovanja/.test(head)) {
      departures.push(...tripTableDepartures(matrix, { today: env.today, hintYear: yearHint, transport: transports[0] }));
      continue;
    }
    const layout = detectMatrixLayout(matrix, countDates);
    if (!layout) continue;
    kind = "stay";
    const perUnit = /po\s+sobi|po\s+apartmanu|po\s+smestajnoj/i.test(fold(priceText));
    const marker = priceText.match(/[^\n]*ozna[cč]en\w*\s+zvezdic\w*[^\n]*/i)?.[0];
    basisNote = perUnit ? "Cena po smeštajnoj jedinici za ceo boravak" : undefined;
    departures.push(
      ...matrixDepartures(matrix, {
        today: env.today,
        hintYear: yearHint,
        periodRow: layout.periodRow,
        firstPeriodCol: layout.firstPeriodCol,
        nightsRow: layout.nightsRow ?? (matrix[layout.periodRow + 1]?.slice(layout.firstPeriodCol).every((cell) => /^\d{1,2}$|^$/.test(cell.text)) ? layout.periodRow + 1 : undefined),
        unitRows: matrix
          .map((row, index) => ({ row, index }))
          .filter(({ row, index }) => index > layout.periodRow + 1 && row.slice(layout.firstPeriodCol).some((cell) => /\d/.test(cell.text)))
          .map(({ index }) => index),
        unitLabel: (row) => row[0].text,
        board: (row) => (layout.firstPeriodCol > 1 ? parseBoard(row[1]?.text) : undefined),
        basis: perUnit ? "per_unit" : "per_person",
        markerNote: marker ? cleanLine(marker.replace(/^[*\s–-]+/, "")).slice(0, 100) : undefined,
      })
    );
  }
  if (departures.length === 0 && durationText) {
    departures = findMonthNameRanges(durationText, { today: env.today, hintYear: yearHint }).map((range) => ({
      date: range.start,
      endDate: range.end,
      transport: transports[0],
      basis: "per_person" as const,
    }));
  }
  const listPrice = listPriceOf($, info.get("cena"));
  if (listPrice && departures.length > 0 && departures.every((departure) => departure.price === undefined)) {
    departures = departures.map((departure) => ({ ...departure, price: listPrice.price, priceOld: listPrice.priceOld, basis: listPrice.basis }));
  }

  const images = uniqueStrings(
    [
      $(".package-media-wrapper a").first().attr("href"),
      ...$("img")
        .map((_, element) => $(element).attr("src"))
        .get(),
    ]
      .filter((src): src is string => Boolean(src && src.includes("/wp-content/uploads/") && !/logo|icon|favicon/i.test(src)))
      .map((src) => cleanImageUrl(absUrl(pageUrl, src)!))
  );
  const ogImage = metaContent($, "og:image");
  const included = listAfterHeading(priceText, /ARANŽMAN OBUHVATA:?/i, /ARANŽMAN NE OBUHVATA/i);
  const excluded = listAfterHeading(priceText, /ARANŽMAN NE OBUHVATA:?/i, /NAPOMEN|USLOVI|NAČIN PLAĆANJA|FAKULTATIVN|\n\s*\n/i);
  const board = parseBoard(durationText) ?? departures.find((departure) => departure.board)?.board;
  // Stays are named after the object ("Hotel Tropical"); trips keep their subtitle.
  const title = kind === "stay" ? cleaned.head : cleaned.title;
  const descriptionTab = pageTabs.find(
    (tab) => tab !== priceTab && tab !== programTab && tab !== notesTab && !/slike|mapa|placanj|uslovi/i.test(fold(tab.title))
  );

  return {
    partnerSlug: env.config.slug,
    externalId: slug,
    sourceUrl: pageUrl,
    kind,
    title,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    region: locationParts[1] && kind === "stay" ? smartTitleCase(locationParts[1]) : undefined,
    categoryHints: hints,
    transports: transports.length ? transports : kind === "stay" ? ["self"] : [],
    nights: duration.nights,
    nightsMax: duration.nightsMax,
    days: duration.days,
    stars,
    board,
    availabilityMode: "dated",
    departures,
    listPrice,
    priceNote: basisNote,
    departureCities: [],
    supplements: [],
    coverImage: images[0] ?? (ogImage ? cleanImageUrl(ogImage) : undefined),
    images,
    descriptionHtml: descriptionTab ? ($(descriptionTab.element).html() ?? undefined) : undefined,
    program: dayProgram($, programTab?.element),
    included,
    excluded,
    notesHtml: notesTab ? ($(notesTab.element).html() ?? undefined) : undefined,
    facts: [],
    documents: [],
    badges,
    sourceModifiedAt,
    warnings: departures.length === 0 ? ["Termini nisu pronađeni u cenovniku."] : [],
  };
}

export const tourpackageAdapter: PartnerAdapter = {
  family: "tourpackage",
  mergeMode: false,
  listedFrom: "discover",

  async discover(http: HttpLike, env: AdapterEnv) {
    const base = env.config.website;
    const options = (env.config.options ?? {}) as { categories?: string[]; maxPagesPerCategory?: number };
    const categories = options.categories ?? DEFAULT_CATEGORIES;
    const maxPages = options.maxPagesPerCategory ?? 15;
    const sitemap = parseSitemapLastmod((await http.getText(`${base}/package-sitemap.xml`)).body);
    const items = new Map<string, DiscoveredItem>();
    const warnings: string[] = [];
    let complete = true;
    for (const category of categories) {
      let page = 1;
      let lastPage = 1;
      do {
        const url = page === 1 ? `${base}/package-category/${category}/` : `${base}/package-category/${category}/page/${page}/`;
        const response = await http.getText(url);
        if (response.status === 404) {
          warnings.push(`Kategorija ${category} ne postoji (404).`);
          break;
        }
        if (response.status >= 400) {
          complete = false;
          break;
        }
        const parsed = parseCategoryPage(response.body, base);
        lastPage = Math.min(parsed.lastPage, maxPages);
        if (parsed.lastPage > maxPages) complete = false;
        for (const link of parsed.links) {
          const slug = packageSlug(link)!;
          const lastmod = sitemap.get(link) ?? sitemap.get(link.replace(/\/?$/, "/"));
          const priority = LOW_PRIORITY_CATEGORIES.has(category) ? 1 : 0;
          const existing = items.get(slug);
          items.set(slug, {
            key: slug,
            externalId: slug,
            url: link,
            listSig: lastmod || undefined,
            sourceModifiedAt: lastmod ? lastmod.slice(0, 10) : undefined,
            priority: Math.min(priority, existing?.priority ?? 9),
          });
        }
        page += 1;
      } while (page <= lastPage);
    }
    return { items: [...items.values()], listedIds: [...items.keys()], complete: complete && items.size > 0, warnings };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem): Promise<RawDetail> {
    return { item, pages: { main: await http.getText(item.url) } };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], goneIds: [raw.item.externalId!], warnings: [] };
    return { offers: [parsePackageDetail(page.body, raw.item.url, env, raw.item.sourceModifiedAt)], warnings: [] };
  },
};
