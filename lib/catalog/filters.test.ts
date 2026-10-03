import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  catalogHref,
  durationBucket,
  effectiveNights,
  parseCatalogQuery,
  searchCards,
  type FilterableCard,
} from "./filters";

function card(overrides: Partial<FilterableCard> & { id?: string }): FilterableCard & { id: string } {
  return {
    id: "x",
    kind: "partner",
    partnerSlug: "sunline",
    travelTypes: ["letovanje"],
    countrySlug: "grcka",
    countryName: "Grčka",
    departureDates: ["2026-10-10"],
    departureCities: ["Beograd"],
    transports: ["bus"],
    nights: 7,
    priceFrom: 300,
    currency: "EUR",
    searchText: "Hotel Sunce Tasos",
    sortDeparture: "2026-10-10",
    sortPrice: 300,
    firstSeenAt: 1,
    ...overrides,
  };
}

describe("parseCatalogQuery", () => {
  it("reads Serbian params and aliases, drops invalid values", () => {
    const query = parseCatalogQuery(
      new URLSearchParams("kategorija=letovanje&destinacija=Grcka&mesec=2026-13&prevoz=avion&trajanje=4-7&cenaOd=900&cenaDo=200&sort=cena&strana=2&putnika=3&vrsta=partneri")
    );
    expect(query).toMatchObject({
      tip: "letovanje",
      zemlja: "grcka",
      mesec: undefined,
      prevoz: "plane",
      trajanje: "4-7",
      cenaOd: 200,
      cenaDo: 900,
      sort: "cena",
      strana: 2,
      putnika: 3,
      vrsta: "partner",
    });
  });

  it("ignores unknown travel types and transports", () => {
    expect(parseCatalogQuery({ tip: "svemir", prevoz: "raketa" })).toMatchObject({ tip: undefined, prevoz: undefined });
  });

  it("round-trips to a stable URL without defaults", () => {
    const href = catalogHref({ tip: "letovanje", prevoz: "plane", sort: "polazak", strana: 1 });
    expect(href).toBe("/ponude?tip=letovanje&prevoz=avion");
    expect(parseCatalogQuery(new URLSearchParams(href.split("?")[1]))).toMatchObject({ tip: "letovanje", prevoz: "plane" });
  });

  it("counts a price range as one filter", () => {
    expect(activeFilterCount({ cenaOd: 100, cenaDo: 500 })).toBe(1);
    expect(activeFilterCount({ tip: "letovanje", zemlja: "grcka" })).toBe(2);
  });
});

describe("duration", () => {
  it("uses nights, or days − 1", () => {
    expect(effectiveNights({ nights: 3 })).toBe(3);
    expect(effectiveNights({ days: 5 })).toBe(4);
    expect(effectiveNights({})).toBeUndefined();
    expect(durationBucket(1)).toBe("1-3");
    expect(durationBucket(7)).toBe("4-7");
    expect(durationBucket(10)).toBe("8-14");
    expect(durationBucket(15)).toBe("15+");
  });
});

describe("searchCards", () => {
  const cards = [
    card({ id: "a" }),
    card({ id: "b", countrySlug: "tunis", countryName: "Tunis", transports: ["plane"], priceFrom: 500, sortPrice: 500, departureDates: ["2026-11-05"], sortDeparture: "2026-11-05", firstSeenAt: 3 }),
    card({ id: "c", travelTypes: ["evropski-gradovi"], nights: undefined, days: 4, departureCities: [], partnerSlug: "mayak", priceFrom: undefined, sortPrice: 1e9, departureDates: [], sortDeparture: "9999-12-31", firstSeenAt: 2 }),
    card({ id: "d", kind: "ablux", partnerSlug: "ablux", currency: "RSD", priceFrom: 12000, sortPrice: 1e9, departureCities: ["Niš"] }),
  ];

  it("filters by every dimension and counts facets with the other filters applied", () => {
    const result = searchCards(cards, { tip: "letovanje", prevoz: "bus" });
    expect(result.items.map((item) => item.id)).toEqual(["a", "d"]);
    // Transport facet ignores the transport filter itself: plane is still offered.
    expect(result.facets.prevoz).toEqual([
      { value: "bus", count: 2 },
      { value: "plane", count: 1 },
    ]);
    // The travel type facet ignores the travel type filter: "c" is a bus trip to a city.
    expect(result.facets.tip.find((entry) => entry.value === "evropski-gradovi")?.count).toBe(1);
  });

  it("price range compares euros only and leaves out offers on request", () => {
    const result = searchCards(cards, { cenaOd: 100, cenaDo: 400 });
    expect(result.items.map((item) => item.id)).toEqual(["a"]);
    expect(result.facets.cena).toEqual({ min: 300, max: 500 });
  });

  it("month filter skips undated offers; departure city falls back to the partner default", () => {
    expect(searchCards(cards, { mesec: "2026-11" }).items.map((item) => item.id)).toEqual(["b"]);
    const fromNis = searchCards(cards, { polazak: "nis" }, "polazak", { defaultCity: { mayak: "Niš" } });
    expect(fromNis.items.map((item) => item.id).sort()).toEqual(["c", "d"]);
    expect(fromNis.facets.polazak.map((entry) => entry.label)).toContain("Niš");
  });

  it("matches free text without diacritics and sorts", () => {
    expect(searchCards(cards, { q: "sunce" }).total).toBe(4);
    expect(searchCards(cards, {}, "cena").items[0].id).toBe("a");
    expect(searchCards(cards, {}, "novo").items[0].id).toBe("b");
    expect(searchCards(cards, { trajanje: "1-3" }).items.map((item) => item.id)).toEqual(["c"]);
    expect(searchCards(cards, { trajanje: "4-7" }).total).toBe(3);
  });
});
