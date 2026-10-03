// WordPress REST API (posts + categories): Tomash Tours. Robots.txt asks for
// Crawl-delay 10 s; the registry already sets minDelayMs 10 000 and the HTTP
// client raises it further if robots.txt asks for more.
// Content is an Elementor tab widget: Destinacija | Cena i popusti | Program
// putovanja | Smeštaj | Napomene | Opšte informacije.
import type { Element } from "domhandler";
import { ParseError } from "../core/errors";
import { countryForPlace, findCountryInText, nominativeCity, placeFromText } from "../core/geo";
import { absUrl, blockText, dayProgram, listAfterHeading, load, tableToMatrix, type Cheerio$ } from "../core/html";
import { findDateRanges, findYearHint } from "../core/parse/dates";
import { parseDuration } from "../core/parse/duration";
import { parseAllEuro } from "../core/parse/prices";
import { parseTransports } from "../core/parse/transport";
import { cleanLine, decodeEntities, fold, uniqueStrings } from "../core/text";
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

export type WpPost = {
  id: number;
  date?: string;
  modified: string;
  link: string;
  title: { rendered: string };
  categories?: number[];
  content?: { rendered: string };
};
export type WpCategory = { id: number; name: string; slug: string; parent: number };

const PER_PAGE = 100;
const POST_FIELDS = "id,link,modified,title,categories";
const DETAIL_FIELDS = "id,title,modified,link,content,categories";

/** Category names from leaf to root ("Istanbul", "Metropole"). */
export function categoryPath(ids: number[] | undefined, categories: Map<number, WpCategory>): string[] {
  const out: string[] = [];
  for (const id of ids ?? []) {
    let current = categories.get(id);
    let guard = 0;
    while (current && guard < 6) {
      out.push(decodeEntities(current.name));
      current = current.parent ? categories.get(current.parent) : undefined;
      guard += 1;
    }
  }
  return uniqueStrings(out);
}

export function postItems(posts: WpPost[], categories: Map<number, WpCategory>, base: string): DiscoveredItem[] {
  return posts.filter((post) => post && post.id && post.link && post.modified).map((post) => ({
    key: String(post.id),
    externalId: String(post.id),
    url: `${base}/wp-json/wp/v2/posts/${post.id}?_fields=${DETAIL_FIELDS}`,
    kind: "post",
    listSig: post.modified,
    sourceModifiedAt: post.modified.slice(0, 10),
    priority: 0,
    data: { link: post.link, hints: categoryPath(post.categories, categories) },
  }));
}

function elementorTabs($: Cheerio$): Map<string, Element> {
  const titles = new Map<string, string>();
  $(".elementor-tab-title[data-tab]").each((_, element) => {
    const id = $(element).attr("data-tab")!;
    if (!titles.has(id)) titles.set(id, fold(cleanLine($(element).text())));
  });
  const tabs = new Map<string, Element>();
  $(".elementor-tab-content[data-tab]").each((_, element) => {
    const title = titles.get($(element).attr("data-tab")!);
    // desktop and mobile copies: keep the first
    if (title && !tabs.has(title)) tabs.set(title, element);
  });
  return tabs;
}

const findTab = (tabs: Map<string, Element>, pattern: RegExp) => [...tabs.entries()].find(([title]) => pattern.test(title))?.[1];

/** "DOPLATA za polazak iz: Užica 20€ (…), iz Kragujevca 15€ (…), Požege 20€ (…)". */
export function cityDoplate(text: string): Supplement[] {
  const block = text.match(/DOPLATA za polazak iz:?([\s\S]{0,600}?)(?:\n\s*\n|Minimum|ARANŽMAN|$)/i)?.[1] ?? "";
  return [...block.matchAll(/(?:iz\s+)?([A-ZČĆŠŽĐ][\p{L}]+(?:\s+[A-ZČĆŠŽĐ][\p{L}]+)?)\s+(\d{1,3})\s*€\s*(\([^)]*\))?/gu)].map((match) => ({
    label: `Polazak iz mesta ${nominativeCity(match[1])}`,
    price: Number(match[2]),
    basis: "per_person" as const,
    note: match[3] ? match[3].slice(1, -1).trim() : undefined,
  }));
}

export function parseWpPost(post: WpPost, env: AdapterEnv, hints: string[] = []): NormalizedOffer {
  if (!post.content?.rendered) throw new ParseError("Objava nema sadržaj.");
  const $ = load(post.content.rendered);
  const rawTitle = cleanLine(decodeEntities(post.title.rendered));
  const [head, ...rest] = rawTitle.split(/\s*,\s*/);
  const tail = rest.join(", ");
  const subtitle = cleanLine(tail.split(/\s+[–-]\s+/).slice(1).join(" – ")) || undefined;
  const tabs = elementorTabs($);
  const priceTab = findTab(tabs, /cen/);
  const programTab = findTab(tabs, /program/);
  const destinationTab = findTab(tabs, /destinacij|opis/);
  const stayTab = findTab(tabs, /smestaj|hotel/);
  const notesTab = findTab(tabs, /napomen/);
  const priceText = priceTab ? blockText($, priceTab) : "";
  const allText = blockText($, $.root().get(0)!);
  const yearHint = findYearHint(priceText, post.modified);

  const table = priceTab ? $(priceTab).find("table").get(0) : undefined;
  const matrix = table ? tableToMatrix($, table) : [];
  const terminCol = matrix[0]?.findIndex((cell) => /termin/i.test(cell.text)) ?? -1;
  // First data row only: later rows hold notes ("POLAZAK IZ BEOGRADA U SLEDECIM TERMINIMA: 21.10 / …").
  const cellLines = (html: string | undefined) => (html ? blockText($, load(html).root().get(0)!) : "");
  const terminText = terminCol >= 0 ? cellLines(matrix[1]?.[terminCol]?.html) : priceText;
  const priceCellText =
    matrix.length > 1 ? matrix[1].filter((_, index) => index !== terminCol).map((cell) => cell.text).join(" ") : priceText;
  const ranges = findDateRanges(terminText, { today: env.today, hintYear: yearHint });
  const amounts = parseAllEuro(priceCellText).filter((amount) => amount >= 20);
  const transports = parseTransports([rawTitle, priceText.slice(0, 1500)].join(" "));
  const departures: Departure[] = ranges.map((range) => ({
    date: range.start,
    endDate: range.end,
    transport: transports[0],
    basis: "per_person",
  }));
  const byCity = /cena za polazak iz/i.test(priceCellText);
  const listPrice = amounts.length
    ? {
        price: Math.min(...amounts),
        basis: "per_person" as const,
        note: byCity ? "Cena zavisi od hotela i mesta polaska" : amounts.length > 1 ? "Cena zavisi od hotela" : undefined,
      }
    : undefined;

  const durationSource = allText.match(/\d{1,2}\s*dana\s*\/\s*\d{1,2}\s*no[cć]\w*|\d{1,2}\s*no[cć]\w*\s*\/\s*\d{1,2}\s*dana/i)?.[0] ?? rawTitle;
  const duration = parseDuration(durationSource);
  const cityLine = priceText.match(/Polazak iz:\s*([^\n]+)/i)?.[1] ?? "";
  const departureCities = uniqueStrings([
    ...cityLine
      .split(/\s*,\s*/)
      .map((city) => nominativeCity(city))
      .filter((city) => city.length > 1 && city.length < 40),
    /POLAZAK IZ BEOGRADA/i.test(priceText) ? "Beograd" : undefined,
  ]);
  // The title wins over category hints: Tomash files "Krajova Advent" under "Grčka".
  const titlePlace = placeFromText(head);
  const country = findCountryInText(rawTitle) ?? titlePlace?.country ?? findCountryInText(hints.join(", ")) ?? countryForPlace(head);
  const isStay = /^(lux\s+)?(vila|hotel|apartman|studio)/i.test(head) || hints.some((hint) => /letovanje|grcka|grčka/i.test(hint));
  const documents = $("a[href]")
    .map((_, element) => ({ label: cleanLine($(element).text()), url: absUrl(post.link, $(element).attr("href")) ?? "" }))
    .get()
    .filter((doc) => /\.pdf(\?|$)/i.test(doc.url))
    .map((doc) => ({ label: doc.label && !/ovde|link/i.test(doc.label) ? doc.label : decodeURIComponent(doc.url.split("/").pop() ?? "Cenovnik"), url: doc.url }));
  const images = uniqueStrings(
    $("img")
      .map((_, element) => $(element).attr("src"))
      .get()
      .filter((src) => src && src.includes("/wp-content/uploads/") && !/logo|icon|20god|screenshot|badge|favicon/i.test(src))
      .map((src) => absUrl(post.link, src)!)
  );
  const warnings: string[] = [];
  if (departures.length === 0) warnings.push(/u pripremi/i.test(allText) ? "Cenovnik je u pripremi kod partnera." : "Termini nisu pronađeni u cenovniku.");

  const descriptionHtml = [
    destinationTab ? $(destinationTab).html() : undefined,
    stayTab ? `<h3>Smeštaj</h3>${$(stayTab).html() ?? ""}` : undefined,
  ]
    .filter(Boolean)
    .join("");

  return {
    partnerSlug: env.config.slug,
    externalId: String(post.id),
    sourceUrl: post.link,
    kind: isStay ? "stay" : "trip",
    title: head,
    subtitle,
    countryName: country?.name,
    countryCode: country?.code,
    place: titlePlace?.place,
    categoryHints: hints,
    transports,
    nights: duration.nights,
    nightsMax: duration.nightsMax,
    days: duration.days,
    availabilityMode: "dated",
    departures,
    listPrice,
    priceNote: listPrice?.note,
    departureCities,
    supplements: cityDoplate(priceText),
    images,
    descriptionHtml: descriptionHtml || undefined,
    program: dayProgram($, programTab),
    included: listAfterHeading(priceText, /ARANŽMAN OBUHVATA:?/i, /ARANŽMAN NE OBUHVATA/i),
    excluded: listAfterHeading(priceText, /ARANŽMAN NE OBUHVATA:?/i, /CEN[AE] FAKULTATIVNIH|POPUSTI|DOPLATE ZA|NAČIN PLAĆANJA|\n\s*\n/i),
    notesHtml: notesTab ? ($(notesTab).html() ?? undefined) : undefined,
    facts: [],
    documents,
    badges: /sigurni polasci/i.test(rawTitle) ? ["guaranteed"] : [],
    sourceModifiedAt: post.modified.slice(0, 10),
    warnings,
  };
}

export const wpRestAdapter: PartnerAdapter = {
  family: "wp-rest",
  mergeMode: false,
  listedFrom: "discover",

  async discover(http: HttpLike, env: AdapterEnv) {
    const base = env.config.website;
    const posts: WpPost[] = [];
    let complete = true;
    for (let page = 1; page <= 20; page += 1) {
      const { page: response, json } = await http.getJson<WpPost[]>(`${base}/wp-json/wp/v2/posts?per_page=${PER_PAGE}&page=${page}&_fields=${POST_FIELDS}`);
      if (response.status === 400 && page > 1) break; // rest_post_invalid_page_number
      if (response.status >= 400 || !Array.isArray(json)) {
        complete = false;
        break;
      }
      posts.push(...json);
      if (json.length < PER_PAGE) break;
    }
    const { json: categoryList } = await http.getJson<WpCategory[]>(`${base}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,parent`);
    const categories = new Map((Array.isArray(categoryList) ? categoryList : []).map((category) => [category.id, category]));
    const items = postItems(posts, categories, base);
    return { items, listedIds: items.map((item) => item.externalId!), complete: complete && items.length > 0, warnings: [] };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem): Promise<RawDetail> {
    return { item, pages: { main: await http.getText(item.url, { accept: "application/json" }) } };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], goneIds: [raw.item.externalId!], warnings: [] };
    let post: WpPost;
    try {
      post = JSON.parse(page.body) as WpPost;
    } catch {
      throw new ParseError("Odgovor nije ispravan JSON.");
    }
    const data = (raw.item.data ?? {}) as { hints?: string[] };
    return { offers: [parseWpPost(post, env, data.hints ?? [])], warnings: [] };
  },
};
