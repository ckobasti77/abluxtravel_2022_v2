// Oktopod-lineage PHP CMS: Astra Travel and Hellena Travel.
// Astra: hidden search index + town pages → /sr/putovanje/<slug>/<id>; the
//   apartment price matrix is the first table.CSSTableGenerator (per person,
//   package with bus); hotels have calculator-only prices → "na upit".
// Hellena: mega-menu villa links + hotel region pages; villa pages embed the
//   tables of every villa in the town (keep the one whose title row matches).
import { ParseError } from "../core/errors";
import { countryForPlace, findCountryInText, nominativeCity } from "../core/geo";
import type { Element } from "domhandler";
import { absUrl, blockText, dayProgram, detectMatrixLayout, listAfterHeading, load, tableToMatrix, type Cheerio$, type MatrixCell } from "../core/html";
import { matrixDepartures } from "../core/matrix";
import { parseBoard } from "../core/parse/board";
import { findDateTokens, findYearHint } from "../core/parse/dates";
import { parseAllEuro } from "../core/parse/prices";
import { cleanLine, fold, smartTitleCase, uniqueStrings } from "../core/text";
import type {
  AdapterEnv,
  DiscoveredItem,
  HttpLike,
  NormalizedOffer,
  ParseResult,
  PartnerAdapter,
  RawDetail,
  Supplement,
} from "../core/types";

const countDates = (text: string) => findDateTokens(text).length;
const ASTRA_HOTEL_CATEGORIES = new Set(["22", "23", "24", "25", "27"]);

function splitTitle(raw: string): { title: string; place?: string; stars?: number } {
  // "KUĆA AKIS / SARTI", "PORTO SANI 5* / SANI", "Calypso 2* Hanioti / Kasandra hoteli"
  const text = cleanLine(raw);
  const [left, right] = text.split(/\s+\/\s+/);
  const starred = left.match(/^(.*?)\s*(\d)\s*\*\s*(.*)$/);
  const name = starred ? starred[1] : left;
  const inlinePlace = starred?.[3]?.trim();
  // "ATLANTIS NEA KALIKRATIA 4* / / NEA KALIKRATIA": drop stray slashes.
  const place = inlinePlace || (right ? right.replace(/^[\s/]+/, "").replace(/\s+hoteli$/i, "").trim() || undefined : undefined);
  return {
    title: smartTitleCase(name.trim()),
    place: place ? smartTitleCase(place) : undefined,
    stars: starred ? Number(starred[2]) : undefined,
  };
}

function unitRowsOf(matrix: MatrixCell[][], periodRow: number, firstPeriodCol: number, nightsRow?: number): number[] {
  return matrix
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      if (index <= periodRow || index === nightsRow) return false;
      const label = fold(row[0]?.text ?? "");
      if (!label || /umanjenje|napomena|polja oznacena|koriscenje/.test(label)) return false;
      const cells = row.slice(firstPeriodCol);
      return cells.some((cell) => /\d/.test(cell.text)) && new Set(row.map((cell) => cell.text)).size > 2;
    })
    .map(({ index }) => index);
}

// ---------------------------------------------------------------- Astra

export function parseAstraIndex(html: string, base: string): { offers: { url: string; id: string; title: string }[]; categories: string[] } {
  const $ = load(html);
  const offers = new Map<string, { url: string; id: string; title: string }>();
  $('a[data-kt-searchable="true"]').each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const id = href.match(/\/sr\/putovanje\/[^/]+\/(\d+)$/)?.[1];
    if (!id) return;
    offers.set(id, { url: absUrl(base, href)!, id, title: cleanLine($(element).text()) });
  });
  const categories = new Set<string>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const path = href.replace(/^https?:\/\/[^/]+/, "");
    if (/^\/sr\/[a-z0-9-]+\/\d+$/.test(path) && !path.startsWith("/sr/putovanje/") && !path.startsWith("/sr/strana/")) {
      categories.add(absUrl(base, path)!);
    }
  });
  return { offers: [...offers.values()], categories: [...categories] };
}

export function parseAstraListing(html: string, base: string): { url: string; id: string; title: string }[] {
  const $ = load(html);
  return $("div.card.js-filter-card a.fs-4")
    .map((_, element) => {
      const href = $(element).attr("href") ?? "";
      const id = href.match(/\/putovanje\/[^/]+\/(\d+)$/)?.[1];
      return id ? { url: absUrl(base, href)!, id, title: cleanLine($(element).text()) } : undefined;
    })
    .get()
    .filter(Boolean) as { url: string; id: string; title: string }[];
}

function astraSupplement(matrix: MatrixCell[][]): Supplement[] {
  const row = matrix.find((cells) => /umanjenje/i.test(cells[0]?.text ?? ""));
  if (!row) return [];
  const values = row
    .slice(1)
    .map((cell) => Number(cell.text.match(/^\d{1,3}$/)?.[0]))
    .filter((value) => value > 0);
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [
    {
      label: "Umanjenje po plativoj osobi za sopstveni prevoz",
      price: min,
      basis: "per_person",
      note: min === max ? undefined : `od ${min} do ${max} € u zavisnosti od smene`,
    },
  ];
}

export function parseAstraDetail(html: string, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const $ = load(html);
  const h1 = cleanLine($("h1").first().text());
  if (!h1) throw new ParseError("Nedostaje naslov (h1).");
  const { title, place, stars } = splitTitle(h1);
  const crumbs = $(".breadcrumb li, .breadcrumb-item")
    .map((_, element) => cleanLine($(element).text()))
    .get()
    .filter((crumb) => crumb && !/^naslovna$/i.test(crumb));
  const country = findCountryInText(crumbs.join(" ")) ?? countryForPlace(place);
  const titleTag = cleanLine($("title").text());
  const yearHint = findYearHint(titleTag);
  const id = pageUrl.match(/\/(\d+)$/)?.[1] ?? pageUrl;
  const images = uniqueStrings(
    $("img")
      .map((_, element) => $(element).attr("src") ?? $(element).attr("data-src"))
      .get()
      .filter((src) => src && src.includes("/uploaded_pictures/content/putovanja/"))
      .map((src) => absUrl(pageUrl, src)!)
  ).sort((a, b) => Number(b.includes("1000x634")) - Number(a.includes("1000x634")));
  const facts = $("span.badge")
    .map((_, element) => cleanLine($(element).text()))
    .get()
    .filter((text) => text.includes(" - "))
    .slice(0, 12)
    .map((text) => {
      const [label, ...rest] = text.split(" - ");
      return { label: label.trim(), value: rest.join(" - ").trim() };
    });
  const opisText = blockText($, $("#opis").get(0) ?? $("body").get(0)!);
  const base: NormalizedOffer = {
    partnerSlug: env.config.slug,
    externalId: id,
    sourceUrl: pageUrl,
    kind: "stay",
    title,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    region: crumbs.length >= 2 ? crumbs[crumbs.length - 2] : undefined,
    categoryHints: crumbs,
    transports: ["self"],
    stars,
    availabilityMode: "on_request",
    departures: [],
    departureCities: [],
    supplements: [],
    images,
    descriptionHtml: $("#opis").html() ?? undefined,
    program: dayProgram($, $("#programputovanja").get(0)),
    included: [],
    excluded: [],
    notesHtml: $("#napomene").html() ?? undefined,
    facts,
    documents: [],
    badges: [],
    warnings: [],
  };

  const table = $("table.CSSTableGenerator").first();
  if (!table.length) {
    const usluga = opisText.match(/USLUGA:\s*([^\n]+)/i)?.[1];
    return { ...base, board: parseBoard(usluga), priceNote: "Cena na upit (hotelski kalkulator partnera)" };
  }
  const matrix = tableToMatrix($, table.get(0)!);
  const layout = detectMatrixLayout(matrix, countDates);
  if (!layout) throw new ParseError("Cenovnik nije prepoznat (nema perioda).");
  const departures = matrixDepartures(matrix, {
    today: env.today,
    hintYear: yearHint,
    periodRow: layout.periodRow,
    firstPeriodCol: layout.firstPeriodCol,
    nightsRow: layout.nightsRow,
    unitRows: unitRowsOf(matrix, layout.periodRow, layout.firstPeriodCol, layout.nightsRow),
    unitLabel: (row) => {
      const second = row[1]?.text ?? "";
      return /^\d+$/.test(second) || layout.firstPeriodCol < 2 ? row[0].text : `${row[0].text} ${second}`;
    },
    basis: "per_person",
    transport: "bus",
  });
  return {
    ...base,
    transports: ["bus", "self"],
    availabilityMode: "dated",
    departures,
    supplements: astraSupplement(matrix),
    priceNote: "Cena po osobi, paket aranžman sa autobuskim prevozom",
    departureCities: ["Beograd"],
  };
}

// ---------------------------------------------------------------- Hellena

export function parseHellenaHome(html: string, base: string): { villas: string[]; regions: string[] } {
  const $ = load(html);
  const villas = new Set<string>();
  const regions = new Set<string>();
  $("a[href]").each((_, element) => {
    const href = ($(element).attr("href") ?? "").replace(/^https?:\/\/[^/]+/, "");
    if (/^\/letovanje\/grcka-apartmani\/[^/]+\/[^/?#]+$/.test(href)) villas.add(absUrl(base, href)!);
    if (/^\/grcka-hoteli\/[a-z0-9-]+$/.test(href)) regions.add(absUrl(base, href)!);
  });
  return { villas: [...villas], regions: [...regions] };
}

export function parseHellenaRegion(html: string, base: string): string[] {
  const $ = load(html);
  return uniqueStrings(
    $(".destination-item h3 a")
      .map((_, element) => absUrl(base, $(element).attr("href")))
      .get()
      .filter(Boolean) as string[]
  );
}

function hellenaBus($: Cheerio$): { supplements: Supplement[]; cities: string[] } {
  const table = $("table")
    .filter((_, element) => /TABELA AUTOBUSKOG PREVOZA/i.test($(element).text()))
    .first();
  if (!table.length) return { supplements: [], cities: [] };
  const supplements: Supplement[] = [];
  const cities: string[] = [];
  const euro = (text: string | undefined) => parseAllEuro(`${text ?? ""}`.replace(/eur\s*a?\b/i, "€"))[0];
  for (const row of tableToMatrix($, table.get(0)!).slice(1)) {
    // colspan rows (titles, notes) repeat the same cell across the row
    if (row.length < 2 || row[1] === row[0]) continue;
    const [place, adult, child, extra] = row.map((cell) => cell.text);
    const adultPrice = euro(adult);
    if (!place || !adultPrice || /tabela/i.test(place)) continue;
    const childPrice = euro(child);
    const extraPrice = euro(extra);
    const placeCities = place.split(",").map((city) => nominativeCity(city.trim())).filter(Boolean);
    cities.push(...placeCities);
    supplements.push({
      label: `Autobuski prevoz: ${place.replace(/,\s*$/, "")}`,
      price: adultPrice,
      basis: "per_person",
      note: [childPrice ? `deca do 9,99 god. ${childPrice} €` : undefined, extraPrice ? `uvećanje u smenama sa * ${extraPrice} €` : undefined]
        .filter(Boolean)
        .join("; ") || undefined,
    });
  }
  return { supplements, cities: uniqueStrings(cities) };
}

/** `.description.detail-box` sections keyed by folded heading → content element. */
function hellenaSections($: Cheerio$): Map<string, Element> {
  const sections = new Map<string, Element>();
  $(".description.detail-box").each((_, element) => {
    const heading = cleanLine($(element).find(".detail-title").first().text());
    const content = $(element).find(".description-content").get(0);
    if (heading && content) sections.set(fold(heading), content);
  });
  return sections;
}

export function parseHellenaDetail(html: string, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const $ = load(html);
  const heading = cleanLine($(".breadcrumb-content h2").first().text());
  if (!heading) throw new ParseError("Nedostaje naslov (.breadcrumb-content h2).");
  const isHotel = pageUrl.includes("/grcka-hoteli/");
  const { title, place, stars } = splitTitle(heading);
  // Hotels: "Calypso 2* Hanioti / Kasandra hoteli" → region from the right side.
  const right = heading.split(/\s+\/\s+/)[1];
  const region = isHotel && right ? smartTitleCase(right.replace(/\s+hoteli$/i, "").trim()) : undefined;
  const pageText = cleanLine($("body").text());
  const description = $(".product-details_short-description").first();
  const geo = pageText.match(/Latitude:\s*([\d.]+)\s*Longitude:\s*([\d.]+)/i);
  const facts = $(".popular-tag-content li")
    .map((_, element) => cleanLine($(element).text()))
    .get()
    .filter((text) => text.includes(":"))
    .slice(0, 12)
    .map((text) => {
      const [label, ...rest] = text.split(":");
      return { label: label.trim(), value: rest.join(":").trim() };
    });
  const images = uniqueStrings(
    $("img")
      .map((_, element) => $(element).attr("src") ?? $(element).attr("data-src"))
      .get()
      .filter((src) => src && src.includes("/uploaded_pictures/content/letovanje/"))
      .map((src) => absUrl(pageUrl, src)!)
  );
  const sections = hellenaSections($);
  const programRoot = sections.get("program putovanja");
  const country = findCountryInText("Grčka");
  const base: NormalizedOffer = {
    partnerSlug: env.config.slug,
    externalId: new URL(pageUrl).pathname.replace(/^\//, ""),
    sourceUrl: pageUrl,
    kind: "stay",
    title,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    region,
    categoryHints: [isHotel ? "Grčka hoteli" : "Grčka apartmani", region ?? "", place ?? ""].filter(Boolean),
    transports: ["self"],
    stars,
    availabilityMode: "on_request",
    departures: [],
    departureCities: [],
    supplements: [],
    images,
    descriptionHtml: description.html() ?? undefined,
    program: dayProgram($, programRoot),
    included: [],
    excluded: [],
    facts,
    documents: [],
    geo: geo ? { lat: Number(geo[1]), lng: Number(geo[2]) } : undefined,
    badges: [],
    warnings: [],
  };

  if (isHotel) {
    const text = blockText($, $("body").get(0)!);
    return {
      ...base,
      board: parseBoard(text.match(/USLUGA:\s*([^\n]+)/i)?.[1]),
      included: listAfterHeading(text, /U cenu aranžmana je uračunato:?/i, /U cenu aranžmana nije uračunato/i),
      excluded: listAfterHeading(text, /U cenu aranžmana nije uračunato:?/i, /\n\s*\n|NAPOMENA|Program/i).slice(0, 10),
      priceNote: /po\s+SOBI/i.test(text) ? "Cene po sobi, na upit (dinamički cenovnik partnera)" : "Cena na upit",
    };
  }

  const priceListLabel = pageText.match(/Cenovnik\s*br\.?\s*\d+\s*od\s*\d{1,2}\.\d{1,2}\.\d{4}\.?/i)?.[0];
  const yearHint = findYearHint(priceListLabel, cleanLine($("title").text()));
  const ownTables = $("table.table-hellena").filter((_, element) => {
    const first = cleanLine($(element).find("tr").first().text());
    return fold(first) === fold(heading);
  });
  if (!ownTables.length) {
    return { ...base, availabilityMode: "dated", warnings: ["Cenovnik vile nije pronađen na stranici."] };
  }
  const departures = ownTables
    .toArray()
    .flatMap((table) => {
      const matrix = tableToMatrix($, table);
      const layout = detectMatrixLayout(matrix, countDates);
      if (!layout) return [];
      return matrixDepartures(matrix, {
        today: env.today,
        hintYear: yearHint,
        periodRow: layout.periodRow,
        firstPeriodCol: layout.firstPeriodCol,
        nightsRow: layout.nightsRow,
        unitRows: unitRowsOf(matrix, layout.periodRow, layout.firstPeriodCol, layout.nightsRow),
        unitLabel: (row) => row[0].text,
        basis: "per_unit",
        transport: "bus",
        soldOut: (cell) => cell.classes.includes("bg-danger"),
      });
    });
  const bus = hellenaBus($);
  return {
    ...base,
    transports: ["bus", "self"],
    availabilityMode: "dated",
    departures,
    supplements: bus.supplements,
    departureCities: bus.cities,
    priceListLabel: priceListLabel ? cleanLine(priceListLabel) : undefined,
    priceNote: "Cena po apartmanu za ceo boravak; autobuski prevoz se plaća posebno",
  };
}

// ---------------------------------------------------------------- adapter

export const oktopodAdapter: PartnerAdapter = {
  family: "oktopod",
  mergeMode: false,
  listedFrom: "discover",

  async discover(http: HttpLike, env: AdapterEnv) {
    const base = env.config.website;
    const items = new Map<string, DiscoveredItem>();
    const home = await http.getText(`${base}/`);
    if (env.config.slug === "hellena") {
      const { villas, regions } = parseHellenaHome(home.body, base);
      let complete = regions.length > 0;
      for (const region of regions) {
        try {
          const page = await http.getText(region);
          for (const url of parseHellenaRegion(page.body, base)) {
            const id = new URL(url).pathname.replace(/^\//, "");
            items.set(id, { key: id, externalId: id, url, kind: "hotel", priority: 0 });
          }
        } catch (error) {
          complete = false;
          env.log("warn", `Region ${region} nije učitan: ${(error as Error).message}`);
          if ((error as Error).name === "BudgetExceededError" || (error as Error).name === "BlockedError") throw error;
        }
      }
      villas.forEach((url) => {
        const id = new URL(url).pathname.replace(/^\//, "");
        items.set(id, { key: id, externalId: id, url, kind: "villa", priority: 1 });
      });
      return { items: [...items.values()], listedIds: [...items.keys()], complete: complete && villas.length > 0, warnings: [] };
    }
    const index = parseAstraIndex(home.body, base);
    for (const offer of index.offers) items.set(offer.id, { key: offer.id, externalId: offer.id, url: offer.url, priority: 2 });
    let complete = index.offers.length > 0;
    for (const category of index.categories) {
      const categoryId = category.match(/\/(\d+)$/)?.[1] ?? "";
      try {
        const page = await http.getText(category);
        for (const offer of parseAstraListing(page.body, base)) {
          const priority = ASTRA_HOTEL_CATEGORIES.has(categoryId) ? 0 : 1;
          const existing = items.get(offer.id);
          items.set(offer.id, { key: offer.id, externalId: offer.id, url: offer.url, priority: Math.min(priority, existing?.priority ?? 9) });
        }
      } catch (error) {
        complete = false;
        env.log("warn", `Kategorija ${category} nije učitana: ${(error as Error).message}`);
        if ((error as Error).name === "BudgetExceededError" || (error as Error).name === "BlockedError") throw error;
      }
    }
    return { items: [...items.values()], listedIds: [...items.keys()], complete, warnings: [] };
  },

  async fetchDetail(http: HttpLike, item: DiscoveredItem): Promise<RawDetail> {
    return { item, pages: { main: await http.getText(item.url) } };
  },

  parse(raw: RawDetail, env: AdapterEnv): ParseResult {
    const page = raw.pages.main;
    if (page.status === 404 || page.status === 410) return { offers: [], goneIds: [raw.item.externalId!], warnings: [] };
    const offer =
      env.config.slug === "hellena"
        ? parseHellenaDetail(page.body, raw.item.url, env)
        : parseAstraDetail(page.body, raw.item.url, env);
    return { offers: [offer], warnings: [] };
  },
};
