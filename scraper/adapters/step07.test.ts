import { describe, expect, it } from "vitest";
import { deriveOffer } from "../core/derive";
import { finalizeOffer } from "../core/finalize";
import { groupFragments, mergeFragments } from "../core/merge";
import type { AdapterEnv, NormalizedOffer } from "../core/types";
import { PARTNERS_BY_SLUG } from "../registry";
import { FixtureHttp, readFixture } from "../testing/fixture-http";
import { bluevendoAdapter, parseSunlineDates, parseSunlineHotel, parseSunlineLengths, parseSunlineTrips } from "./bluevendo";
import { dunavtursAdapter, parseDunavDetail, parseDunavSitemap } from "./dunavturs";
import { marsAdapter, parseMarsDetail, parseMarsList, parseMarsPricelist, type MarsCard } from "./mars";

const env = (slug: string, today = "2026-10-01"): AdapterEnv => ({
  config: PARTNERS_BY_SLUG[slug],
  today,
  log: () => undefined,
});

const final = (offer: NormalizedOffer, slug: string) => finalizeOffer(offer, PARTNERS_BY_SLUG[slug]);

describe("SunLine (bluevendo)", () => {
  const sunline = env("sunline");

  it("lists departure dates from today within the horizon", () => {
    const dates = parseSunlineDates(JSON.parse(readFixture("sunline/getdates.json")), "2026-10-01", 210);
    expect(dates).toHaveLength(59);
    expect(dates[0]).toBe("2026-10-02");
    expect(dates.at(-1)).toBe("2027-04-23");
  });

  it("parses getlength defensively", () => {
    expect(parseSunlineLengths([7, 12])).toEqual([7, 12]);
    expect(parseSunlineLengths([{ length: 10 }, { tripLength: 7 }])).toEqual([7, 10]);
    expect(parseSunlineLengths({})).toEqual([]);
  });

  it("turns gettrip rows into one offer per hotel", () => {
    const offers = parseSunlineTrips(JSON.parse(readFixture("sunline/gettrip-2026-10-02-7.json")), sunline);
    expect(offers).toHaveLength(28);
    const selima = offers.find((offer) => offer.externalId === "hotel-32")!;
    expect(selima.title).toBe("El Mouradi Club Selima");
    expect(selima.stars).toBe(3);
    expect(selima.place).toBe("Port El Kantaoui");
    expect(selima.countryCode).toBe("TN");
    expect(selima.departures[0]).toMatchObject({
      date: "2026-10-02",
      endDate: "2026-10-09",
      nights: 7,
      price: 531,
      basis: "per_person",
      board: "ai",
      unit: "Standardna Soba",
      fromCity: "Beograd",
      transport: "plane",
    });
    const prices = offers.map((offer) => offer.departures[0].price!);
    expect(Math.min(...prices)).toBe(531);
    expect(Math.max(...prices)).toBe(1171);
    expect(() => final(selima, "sunline")).not.toThrow();
  });

  it("parses gethotel content into a fragment", () => {
    const hotel = parseSunlineHotel(JSON.parse(readFixture("sunline/gethotel-32.json")), sunline);
    expect(hotel.externalId).toBe("hotel-32");
    expect(hotel.images.length).toBeGreaterThan(1);
    expect(hotel.geo?.lat).toBeCloseTo(35.9105, 3);
    expect(hotel.geo?.lng).toBeCloseTo(10.5833, 3);
    expect(hotel.descriptionHtml).toContain("Izdvojeno");
  });

  it("merges fragments of the same hotel within a run", () => {
    const [a] = parseSunlineTrips(JSON.parse(readFixture("sunline/gettrip-2026-10-02-7.json")), sunline).filter((o) => o.externalId === "hotel-32");
    const b: NormalizedOffer = { ...a, departures: [{ ...a.departures[0], date: "2026-10-07", endDate: "2026-10-14", price: 600 }] };
    const merged = mergeFragments(a, b);
    expect(merged.departures.map((d) => d.date)).toEqual(["2026-10-02", "2026-10-07"]);
    expect(deriveOffer(merged, { today: "2026-10-01", partnerName: "SunLine" }).priceFrom).toBe(531);
    expect(groupFragments([a, b])).toHaveLength(1);
  });

  it("discovers through the client and plans follow-ups", async () => {
    const http = new FixtureHttp([{ match: /getdates/, file: "sunline/getdates.json" }], PARTNERS_BY_SLUG.sunline);
    const result = await bluevendoAdapter.discover(http, sunline);
    expect(result.items[0]).toMatchObject({ key: "date:2026-10-02", kind: "date" });
    expect(http.requested).toEqual(["https://sunline.rs/search/getdates?countryId=13"]);
    const detailHttp = new FixtureHttp(
      [
        { match: /getlength/, file: "sunline/getlength-shape.json" },
        { match: /gettrip/, file: "sunline/gettrip-2026-10-02-7.json" },
      ],
      PARTNERS_BY_SLUG.sunline
    );
    const raw = await bluevendoAdapter.fetchDetail(detailHttp, result.items[0], sunline);
    const parsed = bluevendoAdapter.parse(raw, sunline);
    expect(parsed.offers.length).toBeGreaterThanOrEqual(28);
    expect(parsed.followUps?.[0]).toMatchObject({ kind: "hotel", url: expect.stringContaining("/search/gethotel?hotelId=") });
  });
});

describe("Dunav Turs", () => {
  const dunav = env("dunavturs");

  it("reads the sitemap", () => {
    const items = parseDunavSitemap(readFixture("dunavturs/sitemap.xml"));
    expect(items).toHaveLength(29);
    expect(items.find((item) => item.externalId === "ponude/putovanja/turska/istanbul/istanbul-dan-primirja")?.priority).toBe(0);
  });

  it("parses a villa price matrix", () => {
    const offer = parseDunavDetail(
      readFixture("dunavturs/vila-sakis-polihrono.html"),
      "http://www.dunavturs.com/ponude/leto-2026/grcka/polihrono/vila-sakis-polihrono.html",
      dunav
    );
    expect(offer.title).toBe("Vila SAKIS");
    expect(offer.place).toBe("Polihrono");
    expect(offer.countryCode).toBe("GR");
    expect(offer.kind).toBe("stay");
    const first = offer.departures.filter((d) => d.date === "2026-05-22");
    expect(first.find((d) => d.unit === "1/3 APP")).toMatchObject({ price: 119, endDate: "2026-06-01", nights: 10 });
    expect(first.find((d) => d.unit === "1/3 APP")?.note).toContain("*");
    expect(first.find((d) => d.unit === "1/2 APP")).toBeUndefined();
    expect(offer.priceListLabel).toContain("Cenovnik br. 20");
    expect(offer.geo).toEqual({ lat: 40.01981, lng: 23.52267 });
    expect(offer.supplements.find((s) => s.label.includes("Subotica"))?.price).toBe(105);
    expect(offer.images.length).toBeGreaterThan(5);
    expect(deriveOffer(offer, { today: "2026-10-01", partnerName: "Dunav Turs" }).activeByDates).toBe(false);
    expect(deriveOffer(offer, { today: "2026-05-01", partnerName: "Dunav Turs" }).activeByDates).toBe(true);
    expect(() => final(offer, "dunavturs")).not.toThrow();
  });

  it("parses a free-text trip", () => {
    const offer = parseDunavDetail(
      readFixture("dunavturs/istanbul-dan-primirja.html"),
      "http://www.dunavturs.com/ponude/putovanja/turska/istanbul/istanbul-dan-primirja.html",
      dunav
    );
    expect(offer.kind).toBe("trip");
    expect(offer.title).toBe("Istanbul - Dan primirja");
    expect(offer.departures).toEqual([
      expect.objectContaining({ date: "2026-11-10", endDate: "2026-11-15", price: 189, basis: "per_person" }),
    ]);
    expect(offer.days).toBe(6);
    expect(offer.nights).toBe(3);
    expect(offer.transports).toContain("bus");
    expect(offer.included.length).toBeGreaterThan(3);
    expect(offer.excluded.length).toBeGreaterThan(3);
    expect(offer.program.length).toBeGreaterThanOrEqual(5);
    expect(offer.departureCities).toContain("Bačka Palanka");
    const derived = deriveOffer(offer, { today: "2026-10-01", partnerName: "Dunav Turs" });
    expect(derived.activeByDates).toBe(true);
    expect(derived.priceFrom).toBe(189);
    expect(final(offer, "dunavturs").contentHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("discovers through the client", async () => {
    const http = new FixtureHttp([{ match: /sitemap\.xml$/, file: "dunavturs/sitemap.xml" }], PARTNERS_BY_SLUG.dunavturs);
    const result = await dunavtursAdapter.discover(http, dunav);
    expect(result.listedIds).toHaveLength(29);
    expect(result.complete).toBe(true);
  });
});

describe("MARS (Ski & Sun, Viva, Rapsody)", () => {
  const skiOpts = PARTNERS_BY_SLUG.skiandsun.options as never;
  const vivaOpts = PARTNERS_BY_SLUG.viva.options as never;
  const rapsodyOpts = PARTNERS_BY_SLUG.rapsody.options as never;

  it("parses the Ski & Sun list", () => {
    const { total, cards } = parseMarsList(JSON.parse(readFixture("mars/skiandsun-list.json")), "https://skisun.rs", { objectGroupId: 1 }, skiOpts);
    expect(total).toBe(105);
    expect(cards).toHaveLength(10);
    expect(cards[0]).toMatchObject({ externalId: "119647", title: "Hotel SAMOKOV", price: 57, priceOld: 64, basis: "per_day" });
    expect(cards[0].url).toBe("https://skisun.rs/zima/bugarska-zimovanje/borovec/hotel-samokov-borovec/");
    const livigno = cards.find((card) => card.url.includes("casa-natale-livigno"))!;
    expect(livigno).toMatchObject({ price: 720, basis: "per_stay", priceNote: "za 7 noći" });
  });

  it("parses the Viva list", () => {
    const { total, cards } = parseMarsList(JSON.parse(readFixture("mars/viva-list.json")), "https://www.vivatravel.rs", { objectGroupId: 1, idPrefix: "acc" }, vivaOpts);
    expect(total).toBe(241);
    expect(cards).toHaveLength(10);
    const dorotea = cards.find((card) => card.externalId === "acc-71")!;
    expect(dorotea.title).toBe("Apartmani Dorotea");
    expect(dorotea.location).toBe("Grčka, Istočna Makedonija i Trakija, Tasos, Potos");
    expect(dorotea.onRequest).toBe(true);
  });

  it("parses Rapsody lists", () => {
    const p1 = parseMarsList(JSON.parse(readFixture("mars/rapsody-list-p1.json")), "https://www.rapsodytravel.rs", { objectGroupId: 6 }, rapsodyOpts);
    const p2 = parseMarsList(JSON.parse(readFixture("mars/rapsody-list-p2.json")), "https://www.rapsodytravel.rs", { objectGroupId: 6 }, rapsodyOpts);
    expect(p1.total).toBe(56);
    expect(p1.cards).toHaveLength(40);
    expect(p2.cards).toHaveLength(16);
    expect(new Set([...p1.cards, ...p2.cards].map((card) => card.externalId)).size).toBe(56);
    const atina = p1.cards.find((card) => card.externalId === "1371")!;
    expect(atina).toMatchObject({ title: "Atina Nova Godina 2027", price: 175, priceOld: 205, basis: "per_person", dates: ["2026-12-29"] });
    expect(atina.transports).toContain("bus");
    expect(atina.badges).toContain("PARTY");
  });

  it("parses a Viva trip detail without related-offer dates", () => {
    const card: MarsCard = {
      url: "https://www.vivatravel.rs/putovanja/rumunija/putovanje-drakula-tura-2-noci-autobus-2026/1266/",
      externalId: "trip-1266",
      objectGroupId: 6,
      title: "Drakula",
      onRequest: false,
      dates: [],
      transports: [],
      badges: [],
      listSig: "x",
    };
    const offer = parseMarsDetail(readFixture("mars/viva-drakula-1266.html"), card.url, card, undefined, env("viva"));
    expect(offer.title).toBe("Putovanje Drakula tura 2 noći- autobus 2026");
    expect(offer.kind).toBe("trip");
    expect(offer.departures.map((d) => [d.date, d.endDate])).toEqual([["2026-11-08", "2026-11-11"]]);
    expect(offer.departures[0]).toMatchObject({ price: 169, basis: "per_person" });
    expect(offer.days).toBe(4);
    expect(offer.nights).toBe(2);
    expect(offer.transports).toContain("bus");
    expect(offer.countryName).toBe("Rumunija");
    expect(offer.included[0]).toContain("Prevoz turističkim autobusom");
    expect(offer.program.length).toBeGreaterThanOrEqual(3);
    expect(deriveOffer(offer, { today: "2026-10-01", partnerName: "Viva" }).priceFrom).toBe(169);
    expect(() => final(offer, "viva")).not.toThrow();
  });

  it("marks a Viva accommodation without prices as on request", () => {
    const card: MarsCard = {
      url: "https://www.vivatravel.rs/smestaj/grcka/hanioti/apartmani-nikos/58/",
      externalId: "acc-58",
      objectGroupId: 1,
      title: "Apartmani Nikos",
      location: "Grčka, Halkidiki, Kasandra, Hanioti",
      onRequest: true,
      dates: [],
      transports: [],
      badges: [],
      listSig: "x",
    };
    const offer = parseMarsDetail(readFixture("mars/viva-nikos-58.html"), card.url, card, "", env("viva"));
    expect(offer.availabilityMode).toBe("on_request");
    expect(offer.kind).toBe("stay");
    expect(offer.countryCode).toBe("GR");
    expect(deriveOffer(offer, { today: "2026-10-01", partnerName: "Viva" }).activeByDates).toBe(true);
  });

  it("parses the Ski & Sun detail and pricelist", () => {
    const card: MarsCard = {
      url: "https://skisun.rs/zima/bugarska-zimovanje/bansko/grand-hotel-bansko/",
      externalId: "119629",
      objectGroupId: 1,
      title: "Grand Hotel Bansko",
      onRequest: false,
      dates: [],
      transports: ["self"],
      badges: [],
      basis: "per_day",
      listSig: "x",
    };
    const pricelist = readFixture("mars/skiandsun-pricelist-bansko.html");
    const departures = parseMarsPricelist(pricelist, "2026-10-01", "per_day");
    expect(departures).toHaveLength(20);
    expect(departures[0]).toMatchObject({ date: "2026-12-01", endDate: "2026-12-24", unit: "ONE BEDROOM APARTMENT", price: 112, priceOld: 172 });
    expect(departures.find((d) => d.date === "2026-12-30")?.endDate).toBe("2027-01-02");
    expect(departures.some((d) => d.date === "2027-03-07")).toBe(true);
    const offer = parseMarsDetail(readFixture("mars/skiandsun-grand-hotel-bansko.html"), card.url, card, pricelist, env("skiandsun"));
    expect(offer.title).toBe("Hotel Grand Hotel Bansko");
    expect(offer.place).toBe("Bansko");
    expect(offer.countryCode).toBe("BG");
    expect(offer.images.some((url) => url.includes("1600x900"))).toBe(true);
    const derived = deriveOffer(offer, { today: "2026-10-01", partnerName: "Ski & Sun" });
    expect(derived.priceFrom).toBe(100);
    expect(derived.travelTypes).toContain("zimovanje");
  });

  it("parses a Rapsody detail with card dates", () => {
    const p1 = parseMarsList(JSON.parse(readFixture("mars/rapsody-list-p1.json")), "https://www.rapsodytravel.rs", { objectGroupId: 6 }, rapsodyOpts);
    const card: MarsCard = { ...p1.cards[0], url: "https://www.rapsodytravel.rs/putovanja/rim/putovanje-rim-2026/1467/", externalId: "1467", dates: [] };
    const offer = parseMarsDetail(readFixture("mars/rapsody-rim-1467.html"), card.url, card, undefined, env("rapsody"));
    expect(offer.title).toBe("Rim 2026");
    expect(offer.program).toHaveLength(8);
    expect(offer.days).toBe(8);
    expect(offer.nights).toBe(5);
    expect(offer.included.length).toBeGreaterThan(2);
    expect(offer.departureCities).toEqual(["Beograd", "Novi Sad"]);
    expect(offer.coverImage).toContain("mcdn.pro");
    expect(offer.availabilityMode).toBe("on_request");
  });

  it("discovers Rapsody pages through the client", async () => {
    const http = new FixtureHttp(
      [
        { match: /_page=1$/, file: "mars/rapsody-list-p1.json" },
        { match: /_page=2$/, file: "mars/rapsody-list-p2.json" },
      ],
      PARTNERS_BY_SLUG.rapsody
    );
    const result = await marsAdapter.discover(http, env("rapsody"));
    expect(result.listedIds).toHaveLength(56);
    expect(result.complete).toBe(true);
    expect(http.requested).toEqual([
      "https://www.rapsodytravel.rs/services/list/?objectGroupId=6&_page=1",
      "https://www.rapsodytravel.rs/services/list/?objectGroupId=6&_page=2",
    ]);
  });
});
