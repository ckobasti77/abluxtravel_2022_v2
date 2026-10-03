// Travellino ("Travelo" WP tour theme). BLOCKED: the live site shows a JS bot
// check, so discover/fetch refuse (D8). The parser is built and tested on
// Wayback snapshots so the relay can use it once Travellino whitelists us.
import { ParseError } from "../core/errors";
import { countryForPlace, findCountry, findCountryInText } from "../core/geo";
import { absUrl, dayProgram, listAfterHeading, blockText, load, metaContent, tableToMatrix } from "../core/html";
import { findDateRanges, findYearHint } from "../core/parse/dates";
import { parseDuration } from "../core/parse/duration";
import { parseEuro } from "../core/parse/prices";
import { parseTransports } from "../core/parse/transport";
import { cleanLine, fold, smartTitleCase, uniqueStrings } from "../core/text";
import type { AdapterEnv, Departure, NormalizedOffer, ParseResult, RawDetail } from "../core/types";
import { blockedAdapter } from "./blocked";

const euro = (text: string | undefined) => parseEuro(`${text ?? ""}`.replace(/\bevra?\b|\beura?\b/i, "€"));

export function parseTravelloDetail(html: string, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const $ = load(html);
  const h1 = cleanLine($("h1").first().text());
  if (!h1) throw new ParseError("Nedostaje naslov (h1).");
  const sourceUrl = metaContent($, "og:url") ?? pageUrl;
  const titleTag = cleanLine($("title").text()).replace(/\s+-\s+Travellino$/i, "");
  const destination = $("h4")
    .map((_, element) => cleanLine($(element).text()))
    .get()
    .find((text) => /^DESTINACIJA\b/i.test(text))
    ?.replace(/^DESTINACIJA\s*/i, "");
  const [placeName, countryName] = (destination ?? "").split(/\s*,\s*/);
  const country = findCountry(countryName) ?? countryForPlace(placeName) ?? findCountryInText(titleTag);
  const yearHint = findYearHint(titleTag);
  const departures: Departure[] = [];
  const table = $("table.wpDataTable, table").first().get(0);
  const pageText = blockText($, $("body").get(0)!);
  const firstDay = $("h3")
    .filter((_, element) => /^\d{1,2}\.\s*DAN\b/i.test(cleanLine($(element).text())))
    .first();
  // title + first program day: later days mention ferries and cruises
  const transports = parseTransports(`${titleTag} ${cleanLine(firstDay.next().text()).slice(0, 600)}`);
  if (table) {
    const matrix = tableToMatrix($, table);
    const header = matrix[0]?.map((cell) => fold(cell.text)) ?? [];
    const terminCol = header.findIndex((text) => text.includes("termin"));
    const hotelCol = header.findIndex((text) => text.includes("hotel"));
    const priceCol = header.findIndex((text) => text.includes("cena aranzmana") || text === "cena");
    const specialCol = header.findIndex((text) => text.includes("specijal"));
    for (const row of matrix.slice(1)) {
      const range = terminCol >= 0 ? findDateRanges(row[terminCol]?.text ?? "", { today: env.today, hintYear: yearHint })[0] : undefined;
      if (!range) continue;
      const regular = euro(row[priceCol]?.text);
      const special = specialCol >= 0 ? euro(row[specialCol]?.text) : undefined;
      const price = special ?? regular;
      departures.push({
        date: range.start,
        endDate: range.end,
        unit: hotelCol >= 0 ? row[hotelCol]?.text || undefined : undefined,
        transport: transports[0],
        price,
        priceOld: special && regular && regular > special ? regular : undefined,
        basis: "per_person",
      });
    }
  }
  return {
    partnerSlug: env.config.slug,
    externalId: new URL(sourceUrl).pathname.replace(/^\/tour\//, "").replace(/\/$/, "") || h1,
    sourceUrl,
    kind: "trip",
    title: smartTitleCase(h1),
    subtitle: titleTag && fold(titleTag) !== fold(h1) ? titleTag : undefined,
    countryName: country?.name,
    countryCode: country?.code,
    place: placeName && !findCountry(placeName) ? placeName : undefined,
    categoryHints: uniqueStrings([titleTag]),
    transports,
    ...parseDuration(titleTag),
    availabilityMode: "dated",
    departures,
    departureCities: /BEOGRAD/.test(cleanLine(firstDay.text())) ? ["Beograd"] : [],
    supplements: [],
    coverImage: metaContent($, "og:image"),
    images: uniqueStrings([metaContent($, "og:image")]).map((url) => absUrl(sourceUrl, url)!),
    program: dayProgram($, firstDay.parent().get(0)),
    included: listAfterHeading(pageText, /(?:ARANŽMAN|CENA)\s+OBUHVATA:?/i, /(?:ARANŽMAN|CENA)\s+NE\s+OBUHVATA/i),
    excluded: listAfterHeading(pageText, /(?:ARANŽMAN|CENA)\s+NE\s+OBUHVATA:?/i, /NAPOMEN|FAKULTATIVN|\n\s*\n/i),
    facts: [],
    documents: [],
    badges: [],
    warnings: departures.length ? [] : ["Termini nisu pronađeni u cenovniku."],
  };
}

export const traveloAdapter = blockedAdapter("travelo", (raw: RawDetail, env: AdapterEnv): ParseResult => ({
  offers: [parseTravelloDetail(raw.pages.main.body, raw.item.url, env)],
  warnings: [],
}));
