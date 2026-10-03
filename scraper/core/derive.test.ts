import { describe, expect, it } from "vitest";
import { deriveOffer } from "./derive";
import { hashValue, stableStringify } from "./hash";
import { firstTouchMerge, mergeFragments } from "./merge";
import { offerSlugBase, smartTitleCase, slugify, fold } from "./text";
import type { NormalizedOffer } from "./types";

const baseOffer = (overrides: Partial<NormalizedOffer> = {}): NormalizedOffer => ({
  partnerSlug: "test",
  externalId: "1",
  sourceUrl: "https://example.com/1",
  kind: "trip",
  title: "Prag",
  categoryHints: [],
  transports: ["bus"],
  availabilityMode: "dated",
  departures: [],
  departureCities: [],
  supplements: [],
  images: [],
  program: [],
  included: [],
  excluded: [],
  facts: [],
  documents: [],
  badges: [],
  warnings: [],
  ...overrides,
});

const ctx = { today: "2026-10-01", partnerName: "Test" };

describe("derive", () => {
  it("takes the lowest future price on the primary basis and ignores sold-out", () => {
    const derived = deriveOffer(
      baseOffer({
        countryName: "Češka",
        departures: [
          { date: "2026-09-23", price: 100, basis: "per_person" },
          { date: "2026-11-11", price: 139, priceOld: 159, basis: "per_person" },
          { date: "2026-11-25", price: 120, basis: "per_person", availability: "sold_out" },
          { date: "2026-12-01", price: 155, basis: "per_person" },
        ],
      }),
      ctx
    );
    expect(derived.priceFrom).toBe(139);
    expect(derived.priceOld).toBe(159);
    expect(derived.nextDepartureDate).toBe("2026-11-11");
    expect(derived.activeByDates).toBe(true);
    expect(derived.countrySlug).toBe("ceska");
    expect(derived.travelTypes).toContain("evropski-gradovi");
  });

  it("applies D4: dated without future departures is inactive, on_request stays active", () => {
    expect(deriveOffer(baseOffer({ departures: [{ date: "2026-05-20", price: 100, basis: "per_person" }] }), ctx).activeByDates).toBe(false);
    expect(deriveOffer(baseOffer({ departures: [] }), ctx).activeByDates).toBe(false);
    const onRequest = deriveOffer(baseOffer({ availabilityMode: "on_request" }), ctx);
    expect(onRequest.activeByDates).toBe(true);
    expect(onRequest.priceKind).toBe("on_request");
    expect(onRequest.sortDeparture).toBe("9999-12-31");
  });

  it("uses the list price when departures carry none", () => {
    const derived = deriveOffer(
      baseOffer({ departures: [{ date: "2026-11-08", basis: "per_person" }], listPrice: { price: 169, basis: "per_person" } }),
      ctx
    );
    expect(derived.priceFrom).toBe(169);
    expect(derived.priceKind).toBe("from");
  });

  it("does not show a daily price that cannot be in euros (dinars printed with €)", () => {
    const derived = deriveOffer(
      baseOffer({ kind: "stay", availabilityMode: "on_request", listPrice: { price: 4000, basis: "per_day" } }),
      ctx
    );
    expect(derived.priceKind).toBe("on_request");
    expect(derived.priceFrom).toBeUndefined();
    const hotel = deriveOffer(
      baseOffer({ kind: "stay", availabilityMode: "on_request", listPrice: { price: 72, basis: "per_day" } }),
      ctx
    );
    expect(hotel.priceFrom).toBe(72);
  });

  it("does not file Monastir (Tunisia) beach hotels under religious tourism", () => {
    const derived = deriveOffer(baseOffer({ kind: "stay", title: "Rosa Beach Monastir", place: "Skanes", countryName: "Tunis", countryCode: "TN" }), ctx);
    expect(derived.travelTypes).not.toContain("verski-turizam");
  });

  it("maps stays in beach countries to letovanje and NG trips to holidays", () => {
    expect(deriveOffer(baseOffer({ kind: "stay", title: "Vila Sakis", place: "Polihrono" }), ctx).travelTypes).toEqual(["letovanje"]);
    const ng = deriveOffer(baseOffer({ title: "Atina", countryName: "Grčka", departures: [{ date: "2026-12-29", basis: "per_person" }] }), ctx);
    expect(ng.travelTypes).toContain("nova-godina-i-praznici");
  });
});

describe("hash and merge", () => {
  it("is independent of key order and sensitive to prices", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(hashValue({ a: 1, b: 2 })).toBe(hashValue({ b: 2, a: 1 }));
    expect(hashValue({ price: 100 })).not.toBe(hashValue({ price: 101 }));
    expect(hashValue({ x: 1 })).toMatch(/^[0-9a-f]{16}$/);
  });

  it("unions within a run and replaces on first touch", () => {
    const stored = baseOffer({ descriptionHtml: "<p>opis</p>", departures: [{ date: "2026-10-02", price: 531, basis: "per_person" }] });
    const fragment = baseOffer({ departures: [{ date: "2026-10-07", price: 600, basis: "per_person" }] });
    expect(mergeFragments(stored, fragment).departures.map((d) => d.date)).toEqual(["2026-10-02", "2026-10-07"]);
    const fresh = firstTouchMerge(stored, fragment);
    expect(fresh.departures.map((d) => d.date)).toEqual(["2026-10-07"]);
    expect(fresh.descriptionHtml).toBe("<p>opis</p>");
  });
});

describe("text", () => {
  it("title-cases mostly-caps titles only", () => {
    expect(smartTitleCase("KUĆA AKIS")).toBe("Kuća Akis");
    expect(smartTitleCase("Hotel GRAND HOTEL BANSKO")).toBe("Hotel Grand Hotel Bansko");
    expect(smartTitleCase("PORTO SANI 5* / SANI")).toBe("Porto Sani 5* / Sani");
    expect(smartTitleCase("Vila SAKIS")).toBe("Vila SAKIS");
  });

  it("does not repeat the place in an offer slug", () => {
    expect(offerSlugBase("Vila Strmec Ohrid", "Vila Strmec Ohrid")).toBe("vila-strmec-ohrid");
    expect(offerSlugBase("Vila Strmec", "Ohrid")).toBe("vila-strmec-ohrid");
    expect(offerSlugBase("Hotel Ohridski biser", "Ohrid")).toBe("hotel-ohridski-biser-ohrid");
    expect(offerSlugBase("Prag", undefined)).toBe("prag");
  });

  it("folds and slugifies Serbian text", () => {
    expect(fold("Đurđevdan Čačak")).toBe("djurdjevdan cacak");
    expect(slugify("Istanbul - Dan primirja Dunav Turs")).toBe("istanbul-dan-primirja-dunav-turs");
  });
});
