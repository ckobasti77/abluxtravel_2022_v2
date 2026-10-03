// Montesol (Joomla). BLOCKED: the live site shows a JS bot check, so
// discover/fetch refuse (D8). The villa parser is built and tested on Wayback
// snapshots so the relay can use it once Montesol whitelists us.
// Villa pages carry two period × unit tables: "Tabela 1 - PAKET ARANŽMAN PO
// OSOBI … SA AUTOBUSKIM PREVOZOM" and "Tabela 2 - SOPSTVENI PREVOZ - NAJAM PO
// STUDIJU / APARTMANU".
import type { Element } from "domhandler";
import { ParseError } from "../core/errors";
import { countryForPlace, findCountryInText } from "../core/geo";
import { absUrl, blockText, detectMatrixLayout, listAfterHeading, load, tableToMatrix, type Cheerio$ } from "../core/html";
import { matrixDepartures } from "../core/matrix";
import { findDateTokens, findYearHint } from "../core/parse/dates";
import { cleanLine, uniqueStrings } from "../core/text";
import type { AdapterEnv, Departure, NormalizedOffer, ParseResult, RawDetail } from "../core/types";
import { blockedAdapter } from "./blocked";

const countDates = (text: string) => findDateTokens(text).length;

/** Text right before a table (its caption paragraph), looking up to 3 levels up. */
function captionOf($: Cheerio$, table: Element): string {
  let node = $(table);
  for (let level = 0; level < 3 && node.length; level += 1) {
    const before = node
      .prevAll()
      .slice(0, 3)
      .map((_, element) => cleanLine($(element).text()))
      .get()
      .join(" ");
    if (/tabela|po osobi|sopstven|najam/i.test(before)) return before;
    node = node.parent();
  }
  return "";
}

export function parseMontesolDetail(html: string, pageUrl: string, env: AdapterEnv): NormalizedOffer {
  const $ = load(html);
  const heading = cleanLine($("h1").first().text());
  if (!heading) throw new ParseError("Nedostaje naslov (h1).");
  const [title, place] = heading.split(/\s*::\s*/);
  const base = $("base").attr("href") ?? pageUrl;
  const sourceUrl = new URL(base).toString();
  const decodedPath = decodeURIComponent(new URL(sourceUrl).pathname);
  const country = countryForPlace(place) ?? findCountryInText(decodedPath.replace(/[-/]/g, " "));
  const yearHint = findYearHint(decodedPath, cleanLine($("title").text()));
  const departures: Departure[] = [];
  for (const table of $("table").toArray()) {
    const matrix = tableToMatrix($, table);
    const layout = detectMatrixLayout(matrix, countDates);
    if (!layout) continue;
    const caption = captionOf($, table);
    const ownTransport = /sopstven|najam po/i.test(caption);
    departures.push(
      ...matrixDepartures(matrix, {
        today: env.today,
        hintYear: yearHint,
        periodRow: layout.periodRow,
        firstPeriodCol: layout.firstPeriodCol,
        nightsRow: layout.nightsRow,
        unitRows: matrix.map((_, index) => index).filter((index) => index > layout.periodRow),
        unitLabel: (row) => cleanLine(row[0].text.replace(/[^\p{L}\d/+*\s]/gu, " ")),
        basis: ownTransport ? "per_unit" : "per_person",
        transport: ownTransport ? "self" : "bus",
      })
    );
  }
  const text = blockText($, $("body").get(0)!);
  const images = uniqueStrings(
    $("a.sigFreeLink")
      .map((_, element) => absUrl(sourceUrl, $(element).attr("href")))
      .get()
  );
  return {
    partnerSlug: env.config.slug,
    externalId: decodedPath.replace(/^\//, "").replace(/\.html$/, ""),
    sourceUrl,
    kind: "stay",
    title,
    countryName: country?.name,
    countryCode: country?.code,
    place,
    categoryHints: uniqueStrings(decodedPath.split("/").slice(1, -1)),
    transports: ["bus", "self"],
    availabilityMode: "dated",
    departures,
    priceNote: "Paket po osobi sa autobusom ili najam smeštajne jedinice (sopstveni prevoz)",
    departureCities: ["Beograd"],
    supplements: [],
    images,
    program: [],
    included: listAfterHeading(text, /PAKET ARANŽMAN OBUHVATA:?/i, /ARANŽMAN SOPSTVENIM|ARANŽMAN NE OBUHVATA/i),
    excluded: listAfterHeading(text, /ARANŽMAN NE OBUHVATA:?/i, /NAPOMEN|\n\s*\n/i),
    facts: [],
    documents: [],
    badges: [],
    warnings: departures.length ? [] : ["Termini nisu pronađeni u cenovniku."],
  };
}

export const joomlaAdapter = blockedAdapter("joomla", (raw: RawDetail, env: AdapterEnv): ParseResult => ({
  offers: [parseMontesolDetail(raw.pages.main.body, raw.item.url, env)],
  warnings: [],
}));
