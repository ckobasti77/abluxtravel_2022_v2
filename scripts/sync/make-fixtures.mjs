#!/usr/bin/env node
// Regenerates scraper/__fixtures__ from docs/partners/raw (gitignored, local only).
// Modes: copy (verbatim), strip (drop scripts/styles/svg/comments, collapse
// whitespace), strip-chrome (strip + drop site header/footer/nav),
// range (byte range of a huge page). Writes SOURCES.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAW = path.resolve("docs/partners/raw");
const OUT = path.resolve("scraper/__fixtures__");

const FIXTURES = [
  // SunLine (BlueVendo JSON)
  ["sunline/api_getdates.json", "sunline/getdates.json", "copy"],
  ["sunline/api_gettrip.json", "sunline/gettrip-2026-10-02-7.json", "copy"],
  ["sunline/api_gethotel_32.json", "sunline/gethotel-32.json", "copy"],
  // Dunav Turs
  ["dunavturs/sitemap.xml", "dunavturs/sitemap.xml", "copy"],
  ["dunavturs/detail-vila-sakis-polihrono.html", "dunavturs/vila-sakis-polihrono.html", "strip"],
  ["dunavturs/detail-istanbul-dan-primirja.html", "dunavturs/istanbul-dan-primirja.html", "strip"],
  // MARS / NeoLab
  ["skiandsun/services-list-group1.json", "mars/skiandsun-list.json", "copy"],
  ["viva/services-list-group1.json", "mars/viva-list.json", "copy"],
  ["rapsody/api_list_all.json", "mars/rapsody-list-p1.json", "copy"],
  ["rapsody/api_list_all_p2.json", "mars/rapsody-list-p2.json", "copy"],
  ["skiandsun/get_pricelists-grand-hotel-bansko.html", "mars/skiandsun-pricelist-bansko.html", "copy"],
  ["skiandsun/detail-grand-hotel-bansko.html", "mars/skiandsun-grand-hotel-bansko.html", "strip-chrome"],
  ["viva/detail-putovanje-drakula-1266.html", "mars/viva-drakula-1266.html", "strip-chrome"],
  ["viva/detail-smestaj-apartmani-nikos-58.html", "mars/viva-nikos-58.html", "strip-chrome"],
  ["rapsody/detail_rim_1467.html", "mars/rapsody-rim-1467.html", "strip-chrome"],
  // Anti-bot pages and robots.txt
  ["travellino/home.html", "antibot/travellino-home.html", "copy"],
  ["balkanfun/home.html", "antibot/balkanfun-home.html", "copy"],
  ["montesol/home.html", "antibot/montesol-home.html", "copy"],
  ["holiday/listing_putovanja.html", "antibot/holiday-listing.html", "copy"],
  ["holiday/home.html", "antibot/holiday-home-real.html", "strip-chrome"],
  ["tomash/robots.txt", "robots/tomash.txt", "copy"],
  ["bigblue/robots.txt", "robots/bigblue.txt", "copy"],
  ["hellena/robots.txt", "robots/hellena-404.html", "strip-chrome"],
  // Step 08: Oktopod (Astra, Hellena)
  ["astra/home.html", "oktopod/astra-home.html", "strip"],
  ["astra/detail_kuca_akis.html", "oktopod/astra-kuca-akis.html", "strip"],
  ["astra/detail_porto_sani.html", "oktopod/astra-porto-sani.html", "strip"],
  ["astra/listing_sarti.html", "oktopod/astra-listing-sarti.html", "strip"],
  ["hellena/home.html", "oktopod/hellena-home.html", "strip"],
  ["hellena/detail_vila_anastasia.html", "oktopod/hellena-vila-anastasia.html", "hellena-villa"],
  ["hellena/detail_hotel_calypso.html", "oktopod/hellena-calypso.html", "strip"],
  ["hellena/listing_kasandra_hoteli.html", "oktopod/hellena-kasandra-listing.html", "strip"],
  // tourpackage (Mayak)
  ["mayak/package-sitemap.xml", "tourpackage/mayak-package-sitemap.xml", "mayak-sitemap"],
  ["mayak/package-category-sitemap.xml", "tourpackage/mayak-package-category-sitemap.xml", "copy"],
  ["mayak/detail_malta.html", "tourpackage/mayak-malta.html", "strip"],
  ["mayak/detail_tropical.html", "tourpackage/mayak-tropical.html", "strip"],
  ["mayak/listing_pkgcat_letovanje.html", "tourpackage/mayak-letovanje-p1.html", "strip"],
  // WP Roam (Nitravel)
  ["nitravel/tour-item-sitemap.xml", "wp-roam/nitravel-tour-item-sitemap.xml", "copy"],
  ["nitravel/detail-prag.html", "wp-roam/nitravel-prag.html", "strip-chrome"],
  ["nitravel/detail-vila-elpida.html", "wp-roam/nitravel-vila-elpida.html", "strip-chrome"],
  // WP REST (Tomash)
  ["tomash/wp_posts.json", "wp-rest/tomash-posts.json", "copy"],
  ["tomash/wp_categories.json", "wp-rest/tomash-categories.json", "copy"],
  ["tomash/wp_post_7082.json", "wp-rest/tomash-post-7082.json", "copy"],
  // TourVisio (Big Blue)
  ["bigblue/tour_detail.json", "tourvisio/tour_detail.json", "copy"],
  ["bigblue/tour_hotel.json", "tourvisio/tour_hotel.json", "copy"],
  ["bigblue/tour_psc.json", "tourvisio/tour_psc.json", "copy"],
  ["bigblue/rotator_offers.json", "tourvisio/rotator_offers.json", "copy"],
  ["bigblue/detail_tour_andaluzija.html", "tourvisio/tour-region.html", "bigblue-tour"],
  ["bigblue/listing_rotator_lastminute.html", "tourvisio/rotator-region.html", "bigblue-rotator"],
  ["bigblue/sitemap2.xml", "tourvisio/sitemap.xml", "bigblue-sitemap"],
  ["bigblue/home.html", "tourvisio/home.html", "strip"],
  // Blocked partners: Wayback pages (parse-only adapters)
  ["travellino/wb-detail-toskana-nova-godina.html", "travelo/travellino-toskana.html", "strip-chrome"],
  ["travellino/wb-detail-ibaktech-istanbul.html", "travelo/travellino-ibaktech.html", "strip-chrome"],
  ["montesol/wb-detail-vila-nikos-neos-marmaras.html", "joomla/montesol-vila-nikos.html", "strip"],
  ["montesol/wb-evropski-gradovi.html", "joomla/montesol-evropski-gradovi.html", "strip"],
];

// Hellena villa pages embed the price tables of every villa in the town:
// keep the villa's own tables, one foreign table (filter test) and the rest.
function hellenaVilla(html) {
  const stripped = stripChrome(html);
  const title = (stripped.match(/breadcrumb-content[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/) ?? [])[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  let foreignKept = 0;
  return stripped.replace(/<table\b[^>]*table-hellena[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    const firstRow = (table.match(/<tr[\s\S]*?<\/tr>/i) ?? [""])[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (title && firstRow === title) return table;
    if (foreignKept < 1) {
      foreignKept += 1;
      return table;
    }
    return "";
  });
}

function mayakSitemap(xml) {
  const urls = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  const keep = urls.filter((url, index) => index < 150 || /<lastmod>2026-/.test(url));
  const head = xml.slice(0, xml.indexOf("<url>"));
  return `${head}${keep.join("\n")}\n</urlset>\n`;
}

function bigblueSitemap(xml) {
  const urls = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  let others = 0;
  const keep = urls.filter((url) => {
    if (/\/sr\/tour\//.test(url)) return true;
    others += 1;
    return others <= 20;
  });
  const head = xml.slice(0, xml.indexOf("<url>"));
  return `${head}${keep.join("\n")}\n</urlset>\n`;
}

// Region of a huge TourVisio page around inline JSON markers (byte-for-byte slice).
function jsonRegion(html, firstMarker, lastMarker) {
  const start = html.indexOf(firstMarker);
  const lastAt = html.indexOf(lastMarker, start);
  if (start < 0 || lastAt < 0) throw new Error(`markers not found: ${firstMarker} / ${lastMarker}`);
  let depth = 0;
  let inString = false;
  let i = html.indexOf("{", lastAt);
  for (; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return `<html><head><title>fixture region</title></head><body><script>\n${html.slice(start - 200, i + 300)}\n</script></body></html>\n`;
}

const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const STYLE = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const SVG = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const LINK = /<link\b[^>]*>/gi;
const HEADER = /<header\b[\s\S]*?<\/header>/gi;
const FOOTER = /<footer\b[\s\S]*?<\/footer>/gi;
const NAV = /<nav\b[\s\S]*?<\/nav>/gi;

function strip(html) {
  return html
    .replace(SCRIPT, "")
    .replace(STYLE, "")
    .replace(SVG, "<svg></svg>")
    .replace(COMMENT, "")
    .replace(LINK, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n");
}

function stripChrome(html) {
  return strip(html).replace(HEADER, "").replace(FOOTER, "").replace(NAV, "");
}

const lines = [
  "# Fixture sources",
  "",
  "Generated by `node scripts/sync/make-fixtures.mjs` from `docs/partners/raw/` (research of 2026-09-30).",
  "",
  "| Fixture | Source | Mode | Bytes |",
  "|---|---|---|---|",
];
for (const [src, dest, mode, start, end] of FIXTURES) {
  const from = path.join(RAW, src);
  if (!existsSync(from)) {
    console.warn("missing", src);
    continue;
  }
  let body = readFileSync(from, "utf8");
  if (mode === "strip") body = strip(body);
  if (mode === "strip-chrome") body = stripChrome(body);
  if (mode === "range") body = body.slice(start, end);
  if (mode === "hellena-villa") body = hellenaVilla(body);
  if (mode === "mayak-sitemap") body = mayakSitemap(body);
  if (mode === "bigblue-sitemap") body = bigblueSitemap(body);
  if (mode === "bigblue-tour") body = jsonRegion(body, "TourDetailContainer.Prm.Tour =", "TourDetailContainer.Prm.PriceSearchCriteria =");
  if (mode === "bigblue-rotator") body = jsonRegion(body, "HotelListContainer.load(", "HotelListContainer.load(");
  const to = path.join(OUT, dest);
  mkdirSync(path.dirname(to), { recursive: true });
  writeFileSync(to, body);
  const size = Buffer.byteLength(body);
  lines.push(`| ${dest} | raw/${src} | ${mode}${mode === "range" ? ` ${start}-${end}` : ""} | ${size} |`);
  console.log(String(size).padStart(8), dest);
}
lines.push(
  "",
  "`sunline/getlength-shape.json` is not a saved response: its shape comes from the site's own client code (`chunk_search_composable.js`: `b.map(a => a.length)`); values are illustrative.",
  "",
  "`wp-rest/posts-page-out-of-range.SYNTHETIC.json` is WordPress core's documented `rest_post_invalid_page_number` error body (HTTP 400), used to end REST pagination in tests.",
  "",
  "`tourvisio/tour-region.html` and `tourvisio/rotator-region.html` are byte slices around the inline JSON of 3.1 MB / 4.2 MB pages; `travelo/` and `joomla/` come from Wayback Machine snapshots (the live sites are blocked)."
);
writeFileSync(path.join(OUT, "SOURCES.md"), lines.join("\n") + "\n");
