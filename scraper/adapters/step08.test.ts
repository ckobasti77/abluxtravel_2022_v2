import { describe, expect, it } from "vitest";
import { deriveOffer } from "../core/derive";
import { BlockedError } from "../core/errors";
import { finalizeOffer } from "../core/finalize";
import { parseSitemapLastmod } from "../core/sitemap";
import type { AdapterEnv, NormalizedOffer, PartnerAdapter } from "../core/types";
import { PARTNERS_BY_SLUG } from "../registry";
import { fakeClient, fakeNet, ROBOTS_OK } from "../testing/fake-net";
import { FixtureHttp, readFixture } from "../testing/fixture-http";
import { getAdapter } from ".";
import { oktopodAdapter, parseAstraDetail, parseAstraIndex, parseAstraListing, parseHellenaDetail, parseHellenaHome, parseHellenaRegion } from "./oktopod";
import { parseCategoryPage, parsePackageDetail, tourpackageAdapter } from "./tourpackage";
import {
  parseHomeRotators,
  parseRotatorPage,
  parseTourPage,
  rotatorStopWhen,
  tourStopWhen,
  tourUrls,
  tourvisioAdapter,
  TOUR_MARKERS,
} from "./tourvisio";
import { categoryPath, parseWpPost, postItems, wpRestAdapter, type WpCategory, type WpPost } from "./wp-rest";
import { parseOrganizer, parseRoamDetail, parseTourSitemap, wpRoamAdapter } from "./wp-roam";
import { extractJsonAfterMarker } from "../core/html";
import { joomlaAdapter, parseMontesolDetail } from "./joomla";
import { parseTravelloDetail, traveloAdapter } from "./travelo";

const env = (slug: string, today = "2026-10-01"): AdapterEnv => ({ config: PARTNERS_BY_SLUG[slug], today, log: () => undefined });
const final = (offer: NormalizedOffer, slug: string) => finalizeOffer(offer, PARTNERS_BY_SLUG[slug]);
const derived = (offer: NormalizedOffer, slug: string, today = "2026-10-01") =>
  deriveOffer(offer, { today, partnerName: PARTNERS_BY_SLUG[slug].name });

describe("Astra (oktopod)", () => {
  const astra = env("astra");

  it("reads the hidden search index and the category links", () => {
    const index = parseAstraIndex(readFixture("oktopod/astra-home.html"), "https://www.astratravel.rs");
    expect(index.offers).toHaveLength(244);
    expect(new Set(index.offers.map((offer) => offer.id)).size).toBe(244);
    expect(index.categories).toHaveLength(21);
    expect(parseAstraListing(readFixture("oktopod/astra-listing-sarti.html"), "https://www.astratravel.rs")).toHaveLength(51);
  });

  it("discovers through the home page and every category (hotel categories first)", async () => {
    const http = new FixtureHttp(
      [
        { match: "https://www.astratravel.rs/", file: "oktopod/astra-home.html" },
        { match: /\/sr\/[a-z0-9-]+\/\d+$/, file: "oktopod/astra-listing-sarti.html" },
      ],
      PARTNERS_BY_SLUG.astra
    );
    const result = await oktopodAdapter.discover(http, astra);
    expect(http.requested).toHaveLength(22);
    expect(result.complete).toBe(true);
    expect(result.listedIds.length).toBeGreaterThanOrEqual(244);
    expect(result.items.every((item) => /^https:\/\/www\.astratravel\.rs\/sr\/putovanje\/[a-z0-9-]+\/\d+$/.test(item.url))).toBe(true);
  });

  it("parses the apartment price matrix (per person, package with bus)", () => {
    const offer = parseAstraDetail(readFixture("oktopod/astra-kuca-akis.html"), "https://www.astratravel.rs/sr/putovanje/kuca-akis-sarti/120", astra);
    expect(offer.title).toBe("Kuća Akis");
    expect(offer.place).toBe("Sarti");
    expect(offer.countryCode).toBe("GR");
    const periods = [...new Set(offer.departures.map((departure) => departure.date))];
    expect(periods).toHaveLength(16);
    expect(periods[0]).toBe("2026-05-20");
    expect(offer.departures.find((departure) => departure.date === "2026-09-21")?.endDate).toBe("2026-10-03");
    expect(offer.departures.slice(0, 3).map((departure) => departure.nights)).toEqual([12, 12, 7]);
    expect(offer.departures[0]).toMatchObject({ unit: "Akis 1/2 studio", price: 158, basis: "per_person", transport: "bus" });
    expect(offer.departures.some((departure) => /broj no/i.test(departure.unit ?? ""))).toBe(false);
    expect(offer.supplements[0].label).toMatch(/sopstveni prevoz/);
    expect(derived(offer, "astra").activeByDates).toBe(false);
    expect(derived(offer, "astra", "2026-06-01").activeByDates).toBe(true);
    expect(() => final(offer, "astra")).not.toThrow();
  });

  it("turns hotel pages without a static price list into Cena na upit", () => {
    const offer = parseAstraDetail(readFixture("oktopod/astra-porto-sani.html"), "https://www.astratravel.rs/sr/putovanje/porto-sani/41", astra);
    expect(offer.title).toBe("Porto Sani");
    expect(offer.stars).toBe(5);
    expect(offer.board).toBe("hb");
    expect(offer.availabilityMode).toBe("on_request");
    expect(offer.departures).toEqual([]);
    const result = derived(final(offer, "astra"), "astra");
    expect(result.activeByDates).toBe(true);
    expect(result.priceKind).toBe("on_request");
  });
});

describe("Hellena (oktopod)", () => {
  const hellena = env("hellena");

  it("reads villa links, hotel regions and region listings", () => {
    const home = parseHellenaHome(readFixture("oktopod/hellena-home.html"), "https://hellenatravel.rs");
    expect(home.villas).toHaveLength(207);
    expect(home.regions).toHaveLength(11);
    const hotels = parseHellenaRegion(readFixture("oktopod/hellena-kasandra-listing.html"), "https://hellenatravel.rs");
    expect(hotels).toHaveLength(38);
    expect(hotels[0]).toMatch(/calypso-2-hanioti$/);
  });

  it("keeps only the villa's own tables and reads the bus table", () => {
    const offer = parseHellenaDetail(
      readFixture("oktopod/hellena-vila-anastasia.html"),
      "https://hellenatravel.rs/letovanje/grcka-apartmani/polihrono/vila-anastasia",
      hellena
    );
    expect(offer.title).toBe("Vila Anastasia");
    expect(offer.place).toBe("Polihrono");
    // two matching tables of 13 periods each; the foreign table is ignored
    expect(new Set(offer.departures.map((departure) => departure.unit)).size).toBeGreaterThan(1);
    expect(offer.departures[0]).toMatchObject({ date: "2026-05-22", unit: "1/2 APT", price: 145, basis: "per_unit", note: "*" });
    expect(offer.departures.some((departure) => departure.availability === "sold_out")).toBe(true);
    expect(offer.geo).toEqual({ lat: 40.01856, lng: 23.52449 });
    expect(offer.supplements.find((supplement) => /Beograd$/.test(supplement.label))?.price).toBe(85);
    expect(offer.departureCities).toContain("Niš");
    expect(offer.departureCities.every((city) => city.length < 40)).toBe(true);
    expect(offer.priceListLabel).toMatch(/Cenovnik br\.5/);
    expect(() => final(offer, "hellena")).not.toThrow();
  });

  it("reads hotels as on request", () => {
    const offer = parseHellenaDetail(
      readFixture("oktopod/hellena-calypso.html"),
      "https://hellenatravel.rs/letovanje/grcka-hoteli/kasandra-hoteli/calypso-2-hanioti",
      hellena
    );
    expect(offer).toMatchObject({ title: "Calypso", place: "Hanioti", region: "Kasandra", stars: 2, availabilityMode: "on_request" });
    expect(offer.included.length).toBeGreaterThan(0);
    expect(derived(final(offer, "hellena"), "hellena").priceKind).toBe("on_request");
  });
});

describe("Mayak (tourpackage)", () => {
  const mayak = env("mayak");

  it("reads category archives and sitemap lastmod", () => {
    const page = parseCategoryPage(readFixture("tourpackage/mayak-letovanje-p1.html"), "https://mayaktours.rs");
    expect(page.links).toHaveLength(20);
    expect(page.lastPage).toBe(12);
    const sitemap = parseSitemapLastmod(readFixture("tourpackage/mayak-package-sitemap.xml"));
    expect(sitemap.size).toBe(297);
  });

  it("verifies the configured category slugs against the category sitemap", () => {
    const xml = readFixture("tourpackage/mayak-package-category-sitemap.xml");
    for (const slug of ["aktuelno", "evropski-gradovi", "first-minute", "last-minute", "nova-godina", "krstarenja", "zimovanje", "letovanje"]) {
      expect(xml).toContain(`/package-category/${slug}/<`);
    }
  });

  it("discovers the union of category archives with pagination", async () => {
    const http = new FixtureHttp(
      [
        { match: "https://mayaktours.rs/package-sitemap.xml", file: "tourpackage/mayak-package-sitemap.xml" },
        { match: /\/package-category\/[a-z-]+\/(page\/\d+\/)?$/, file: "tourpackage/mayak-letovanje-p1.html" },
      ],
      PARTNERS_BY_SLUG.mayak
    );
    const result = await tourpackageAdapter.discover(http, { ...mayak, config: { ...mayak.config, options: { categories: ["letovanje"] } } });
    expect(http.requested).toHaveLength(1 + 12);
    expect(result.items).toHaveLength(20);
    expect(result.items[0].priority).toBe(1);
  });

  it("parses a flight trip with promo prices per departure", () => {
    const offer = parsePackageDetail(
      readFixture("tourpackage/mayak-malta.html"),
      "https://mayaktours.rs/package/malta-ostrvo-vitezova-istorije-4-dana-avionom/",
      mayak
    );
    expect(offer.externalId).toBe("malta-ostrvo-vitezova-istorije-4-dana-avionom");
    expect(offer.title).toBe("Malta – ostrvo vitezova & istorije");
    expect(offer.countryCode).toBe("MT");
    expect(offer.transports).toEqual(["plane"]);
    expect(offer.categoryHints).toContain("Evropski gradovi");
    expect(offer.departures).toHaveLength(2);
    expect(offer.departures[0]).toMatchObject({ date: "2026-10-10", endDate: "2026-10-13", price: 379, priceOld: 469, basis: "per_person" });
    expect(offer.departures[1]).toMatchObject({ date: "2026-12-10", endDate: "2026-12-13", price: 359, priceOld: 469 });
    expect(offer.departures[1].note).toContain("do 01.10.");
    expect(offer.program).toHaveLength(4);
    expect(offer.coverImage).not.toMatch(/-\d+x\d+\./);
    const result = derived(final(offer, "mayak"), "mayak");
    expect(result.activeByDates).toBe(true);
    expect(result.priceFrom).toBe(359);
    expect(result.travelTypes).toContain("evropski-gradovi");
  });

  it("parses a hotel price matrix per room", () => {
    const offer = parsePackageDetail(
      readFixture("tourpackage/mayak-tropical.html"),
      "https://mayaktours.rs/package/hotel-tropical-4-hanioti-hit-ponuda/",
      mayak
    );
    expect(offer).toMatchObject({ kind: "stay", title: "Hotel Tropical", stars: 4, place: "Hanioti", board: "hb", nights: 7, nightsMax: 10 });
    const periods = [...new Set(offer.departures.map((departure) => departure.date))];
    expect(periods).toHaveLength(12);
    expect(periods[0]).toBe("2026-06-04");
    expect(offer.departures[0]).toMatchObject({ unit: "1/2 SOBA PB", price: 990, basis: "per_unit", board: "hb" });
    expect(offer.departures[0].note).toMatch(/^\*/);
    expect(offer.listPrice).toMatchObject({ price: 36, basis: "per_person_night" });
    expect(derived(final(offer, "mayak"), "mayak").activeByDates).toBe(false);
  });

  it("Jungman resolves to the same adapter but stays blocked", () => {
    const jungman = PARTNERS_BY_SLUG.jungman;
    expect(jungman.family).toBe("tourpackage");
    expect(getAdapter(jungman.family)).toBe(tourpackageAdapter);
    expect(jungman.liveFetchAllowed).toBe(false);
    expect(jungman.status).toBe("blocked");
  });
});

describe("Nitravel (wp-roam)", () => {
  const nitravel = env("nitravel");

  it("lists tour items from the sitemap, newest first", () => {
    const items = parseTourSitemap(readFixture("wp-roam/nitravel-tour-item-sitemap.xml"), "2026-10-01");
    expect(items).toHaveLength(310);
    expect(items.every((item) => item.listSig && item.sourceModifiedAt)).toBe(true);
    const sorted = [...items].sort((a, b) => a.priority - b.priority);
    expect(sorted[0].sourceModifiedAt! >= sorted.at(-1)!.sourceModifiedAt!).toBe(true);
  });

  it("parses a bus trip with special prices and the real organizer", () => {
    const offer = parseRoamDetail(readFixture("wp-roam/nitravel-prag.html"), "https://www.nitravel.rs/tour-item/prag/", nitravel);
    expect(offer).toMatchObject({ title: "Prag", countryCode: "CZ", nights: 3, days: 6, transports: ["bus"], board: "bb" });
    expect(offer.departures.map((departure) => [departure.date, departure.price, departure.priceOld])).toEqual([
      ["2026-09-23", 155, 175],
      ["2026-11-11", 139, 159],
      ["2026-11-25", 155, 175],
    ]);
    expect(offer.organizer).toEqual({ name: "Plan A Travel", license: "OTP 222/2021 kategorija A" });
    expect(offer.priceListLabel).toBe("Cenovnik broj 51 od 30.4.2026.");
    expect(offer.program).toHaveLength(6);
    expect(offer.departureCities).toEqual(expect.arrayContaining(["Beograd", "Niš"]));
    const result = derived(final(offer, "nitravel"), "nitravel");
    expect(result.activeByDates).toBe(true);
    expect(result.priceFrom).toBe(139);
  });

  it("filters the town-wide villa table to the villa itself", () => {
    const offer = parseRoamDetail(readFixture("wp-roam/nitravel-vila-elpida.html"), "https://www.nitravel.rs/tour-item/vila-elpida/", nitravel);
    expect(offer.title).toBe("Vila Elpida");
    expect(offer.kind).toBe("stay");
    expect(new Set(offer.departures.map((departure) => departure.unit))).toEqual(new Set(["Vila Elpida 2S"]));
    expect(offer.departures).toHaveLength(12);
    expect(offer.departures[0]).toMatchObject({ date: "2026-05-27", price: 150, basis: "per_person", nights: 10 });
    expect(offer.organizer).toEqual(PARTNERS_BY_SLUG.nitravel.organizer);
  });

  it("parses organizer sentences", () => {
    expect(parseOrganizer("Opšti uslovi organizatora putovanja turističke agencije Plan A Travel licenca OTP 222/2021 kategorija A.")).toEqual({
      name: "Plan A Travel",
      license: "OTP 222/2021 kategorija A",
    });
    expect(parseOrganizer("Bez organizatora.")).toBeUndefined();
  });
});

describe("Tomash (wp-rest)", () => {
  const tomash = env("tomash");
  const categories = new Map((JSON.parse(readFixture("wp-rest/tomash-categories.json")) as WpCategory[]).map((category) => [category.id, category]));

  it("lists posts and categories", () => {
    const posts = JSON.parse(readFixture("wp-rest/tomash-posts.json")) as WpPost[];
    expect(posts).toHaveLength(100);
    expect(categories.size).toBe(41);
    const items = postItems(posts, categories, "https://tomashtours.rs");
    expect(items[0]).toMatchObject({ externalId: "18820", listSig: "2026-09-28T19:56:06" });
    expect(items[0].url).toBe("https://tomashtours.rs/wp-json/wp/v2/posts/18820?_fields=id,title,modified,link,content,categories");
  });

  it("discovers through the REST API within the allowlist", async () => {
    const http = new FixtureHttp(
      [
        { match: /\/wp-json\/wp\/v2\/posts\?per_page=100&page=1&/, file: "wp-rest/tomash-posts.json" },
        { match: /\/wp-json\/wp\/v2\/posts\?per_page=100&page=2&/, file: "wp-rest/posts-page-out-of-range.SYNTHETIC.json", status: 400 },
        { match: /\/wp-json\/wp\/v2\/categories\?/, file: "wp-rest/tomash-categories.json" },
      ],
      PARTNERS_BY_SLUG.tomash
    );
    const result = await wpRestAdapter.discover(http, tomash);
    expect(http.requested).toHaveLength(3);
    expect(result.items).toHaveLength(100);
    expect(result.complete).toBe(true);
  });

  it("parses the Elementor tabs of a post", () => {
    const post = JSON.parse(readFixture("wp-rest/tomash-post-7082.json")) as WpPost;
    const offer = parseWpPost(post, tomash, categoryPath(post.categories, categories));
    expect(offer).toMatchObject({ title: "Istanbul", countryCode: "TR", nights: 3, days: 6, transports: ["bus"] });
    expect(offer.sourceUrl).toBe("https://tomashtours.rs/metropole/istanbul/istanbul/");
    expect(offer.categoryHints).toEqual(["Istanbul", "Metropole"]);
    expect(offer.departures.map((departure) => departure.date)).toEqual([
      "2026-09-30",
      "2026-10-14",
      "2026-10-28",
      "2026-11-04",
      "2026-11-10",
      "2026-12-09",
    ]);
    expect(offer.listPrice).toMatchObject({ price: 130, basis: "per_person" });
    expect(offer.listPrice?.note).toMatch(/mesta polaska/);
    expect(offer.departureCities).toEqual(expect.arrayContaining(["Kraljevo", "Niš"]));
    expect(offer.supplements.find((supplement) => supplement.label.endsWith("Užice"))?.price).toBe(20);
    expect(offer.included.length).toBeGreaterThan(0);
    expect(offer.documents[0].url).toMatch(/ISTANBUL-cenovnik-broj-3\.pdf$/);
    expect(offer.images.some((url) => /logo/.test(url))).toBe(false);
    const result = derived(final(offer, "tomash"), "tomash");
    expect(result.activeByDates).toBe(true);
    expect(result.priceFrom).toBe(130);
  });

  it("keeps the 10 s crawl delay in the client config", () => {
    expect(PARTNERS_BY_SLUG.tomash.minDelayMs).toBe(10_000);
  });
});

describe("Big Blue (tourvisio)", () => {
  const bigblue = env("bigblue");

  it("lists tours from the sitemap and rotators from the home page", () => {
    expect(tourUrls(readFixture("tourvisio/sitemap.xml"))).toHaveLength(14);
    const rotators = parseHomeRotators(readFixture("tourvisio/home.html"), "https://bigblue.rs");
    expect(rotators.length).toBeGreaterThan(0);
    expect(rotators.every((url) => /^https:\/\/bigblue\.rs\/sr\/hotel\/rotator\/[a-z0-9-]+\/$/.test(url))).toBe(true);
  });

  it("extracts the inline JSON exactly", () => {
    const body = readFixture("tourvisio/tour-region.html");
    expect(extractJsonAfterMarker(body, TOUR_MARKERS.tour)?.json).toEqual(JSON.parse(readFixture("tourvisio/tour_detail.json")));
  });

  it("stops reading once the needed JSON is complete", async () => {
    const body = readFixture("tourvisio/tour-region.html");
    expect(tourStopWhen(body.slice(0, body.indexOf(TOUR_MARKERS.criteria) + 40))).toBe(false);
    expect(tourStopWhen(body)).toBe(true);
    // A 4 MB page: the client stops streaming right after the hotel list.
    const page = readFixture("tourvisio/rotator-region.html") + "<!-- filler -->".repeat(280_000);
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/sr/hotel/rotator/": [{ body: page, chunkSize: 16_384 }] });
    const raw = await tourvisioAdapter.fetchDetail(
      fakeClient(PARTNERS_BY_SLUG.bigblue, net),
      { key: "r", url: "https://bigblue.rs/sr/hotel/rotator/hurgada-last-minute/", kind: "rotator", priority: 1 },
      bigblue
    );
    expect(raw.pages.main.truncated).toBe(true);
    expect(raw.pages.main.body.length).toBeLessThan(page.length / 4);
    expect(rotatorStopWhen(raw.pages.main.body)).toBe(true);
  });

  it("parses a tour with a total price for two adults", () => {
    const offer = parseTourPage(readFixture("tourvisio/tour-region.html"), "https://bigblue.rs/sr/tour/andaluzijska-tura/", bigblue);
    expect(offer).toMatchObject({ externalId: "tour-andaluzijska-tura", title: "Andaluzijska tura", countryCode: "ES", days: 7, nights: 6 });
    expect(offer.facts).toContainEqual({ label: "Šifra programa", value: "11ANDAT26N" });
    expect(offer.departures).toEqual([
      expect.objectContaining({ date: "2026-10-11", nights: 6, price: 2980, basis: "total_2_adults", board: "bb", unit: "STANDARD", transport: "plane" }),
    ]);
    expect(offer.included.length).toBeGreaterThan(0);
    expect(offer.program).toHaveLength(7);
    expect(derived(final(offer, "bigblue"), "bigblue").priceBasis).toBe("total_2_adults");
  });

  it("parses rotator hotels", () => {
    const offers = parseRotatorPage(readFixture("tourvisio/rotator-region.html"), "https://bigblue.rs/sr/hotel/rotator/hurgada-last-minute/", bigblue);
    expect(offers).toHaveLength(11);
    const rewaja = offers.find((offer) => offer.externalId === "hotel-19767")!;
    expect(rewaja).toMatchObject({ title: "Rewaja Inn Resort", stars: 5, place: "Hurgada", countryName: "Egipat", kind: "stay" });
    expect(rewaja.departures[0]).toMatchObject({ date: "2026-10-13", nights: 10, price: 1772.22, priceOld: 2498, board: "ai", basis: "total_2_adults" });
    expect(() => final(rewaja, "bigblue")).not.toThrow();
  });
});

describe("blocked partners: parse-only adapters on Wayback fixtures", () => {
  it("Travellino: trip table with special price and day program", () => {
    const offer = parseTravelloDetail(readFixture("travelo/travellino-toskana.html"), "https://travellino.rs/tour/x/", env("travellino", "2025-12-01"));
    expect(offer).toMatchObject({ title: "Toskana", countryCode: "IT", nights: 3, transports: ["bus"] });
    expect(offer.sourceUrl).toBe("https://travellino.rs/tour/toskana-3-nocenja-nova-godina-2026/");
    expect(offer.departures).toEqual([
      expect.objectContaining({ date: "2025-12-29", endDate: "2026-01-03", price: 189, priceOld: 209, basis: "per_person", unit: "hotel 3*" }),
    ]);
    expect(offer.program).toHaveLength(6);
    expect(() => final(offer, "travellino")).not.toThrow();
  });

  it("Montesol: package per person and rental per unit tables", () => {
    const offer = parseMontesolDetail(readFixture("joomla/montesol-vila-nikos.html"), "https://www.montesol.rs/x.html", env("montesol", "2026-05-01"));
    expect(offer).toMatchObject({ title: "Vila Nikos", place: "Neos Marmaras", countryCode: "GR", kind: "stay" });
    expect(offer.departures[0]).toMatchObject({ date: "2026-05-20", endDate: "2026-05-30", nights: 10, unit: "Studio 1/2", price: 145, basis: "per_person", transport: "bus" });
    expect(offer.departures.find((departure) => departure.basis === "per_unit")).toMatchObject({ price: 270, transport: "self" });
    expect(offer.images).toHaveLength(12);
    expect(() => final(offer, "montesol")).not.toThrow();
  });

  it("never fetches: discover and fetchDetail refuse with BLOCKED", async () => {
    for (const adapter of [traveloAdapter, joomlaAdapter]) {
      await expect(adapter.discover(new FixtureHttp([]), env("travellino"))).rejects.toBeInstanceOf(BlockedError);
      await expect(adapter.fetchDetail(new FixtureHttp([]), { key: "x", url: "https://travellino.rs/", priority: 0 }, env("travellino"))).rejects.toBeInstanceOf(BlockedError);
    }
    for (const slug of ["travellino", "montesol", "jungman", "holiday", "balkanfun"]) expect(PARTNERS_BY_SLUG[slug].liveFetchAllowed).toBe(false);
  });
});

describe("shared anti-bot handling", () => {
  const CHALLENGE = { body: readFixture("antibot/travellino-home.html") };
  const cases: [string, PartnerAdapter][] = [
    ["astra", oktopodAdapter],
    ["hellena", oktopodAdapter],
    ["mayak", tourpackageAdapter],
    ["nitravel", wpRoamAdapter],
    ["bigblue", tourvisioAdapter],
  ];
  for (const [slug, adapter] of cases) {
    it(`${slug}: a challenge page stops discovery as BLOCKED`, async () => {
      const config = PARTNERS_BY_SLUG[slug];
      const net = fakeNet({ "/robots.txt": [ROBOTS_OK], [new URL(config.website).host]: [CHALLENGE] });
      await expect(adapter.discover(fakeClient(config, net), env(slug))).rejects.toBeInstanceOf(BlockedError);
    });
  }

  it("tomash: a challenge page instead of JSON is BLOCKED", async () => {
    const net = fakeNet({ "/robots.txt": [ROBOTS_OK], "/wp-json/": [CHALLENGE] });
    await expect(wpRestAdapter.discover(fakeClient(PARTNERS_BY_SLUG.tomash, net), env("tomash"))).rejects.toBeInstanceOf(BlockedError);
  });

  it("every parsed offer passes finalize with a registry-host source URL", () => {
    const offers: [NormalizedOffer, string][] = [
      [parseAstraDetail(readFixture("oktopod/astra-kuca-akis.html"), "https://www.astratravel.rs/sr/putovanje/kuca-akis-sarti/120", env("astra")), "astra"],
      [parsePackageDetail(readFixture("tourpackage/mayak-malta.html"), "https://mayaktours.rs/package/malta-ostrvo-vitezova-istorije-4-dana-avionom/", env("mayak")), "mayak"],
      [parseRoamDetail(readFixture("wp-roam/nitravel-prag.html"), "https://www.nitravel.rs/tour-item/prag/", env("nitravel")), "nitravel"],
      [parseTourPage(readFixture("tourvisio/tour-region.html"), "https://bigblue.rs/sr/tour/andaluzijska-tura/", env("bigblue")), "bigblue"],
    ];
    for (const [offer, slug] of offers) {
      const result = final(offer, slug);
      expect(PARTNERS_BY_SLUG[slug].hosts).toContain(new URL(result.sourceUrl).host);
      expect(result.images.every((url) => url.startsWith("https://"))).toBe(true);
    }
  });
});
