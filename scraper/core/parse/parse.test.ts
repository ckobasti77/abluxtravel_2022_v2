import { describe, expect, it } from "vitest";
import { findDateRanges, findMonthNameRanges, findYearHint, inferSequence } from "./dates";
import { isOnRequest, parseAllEuro, parseEuro, parseNumber, parseOldNew, parsePriceCell } from "./prices";
import { parseDuration } from "./duration";
import { parseBoard } from "./board";
import { parseTransports } from "./transport";

const today = "2026-10-01";

describe("dates", () => {
  it("parses ranges with the year on the end date", () => {
    expect(findDateRanges("30.09.-05.10.2026. 14.10.-19.10.2026.", { today })).toEqual([
      { start: "2026-09-30", end: "2026-10-05" },
      { start: "2026-10-14", end: "2026-10-19" },
    ]);
    expect(findDateRanges("SEPTEMBAR: 23.09– 28.09.2026.", { today })).toEqual([
      { start: "2026-09-23", end: "2026-09-28" },
    ]);
    expect(findDateRanges("10.11 - 15.11.2026.", { today })).toEqual([{ start: "2026-11-10", end: "2026-11-15" }]);
    expect(findDateRanges("10.10. – 13.10.2026.", { today })).toEqual([{ start: "2026-10-10", end: "2026-10-13" }]);
  });

  it("rolls ranges over the new year", () => {
    expect(findDateRanges("29.12. - 03.01.2027.", { today })).toEqual([{ start: "2026-12-29", end: "2027-01-03" }]);
    expect(findDateRanges("29.12.–03.01.", { today })).toEqual([{ start: "2026-12-29", end: "2027-01-03" }]);
  });

  it("does not read prices as dates", () => {
    expect(findDateRanges("Cena 1.234 € i 12.50", { today })).toEqual([]);
  });

  it("uses the hint year, else the nearest occurrence (D17)", () => {
    expect(inferSequence([{ day: 20, month: 5 }, { day: 1, month: 6 }], { today, hintYear: 2026 })).toEqual([
      "2026-05-20",
      "2026-06-01",
    ]);
    expect(inferSequence([{ day: 20, month: 5 }], { today })).toEqual(["2026-05-20"]);
    expect(
      inferSequence(
        [
          { day: 1, month: 12 },
          { day: 30, month: 12 },
          { day: 2, month: 1 },
          { day: 7, month: 3 },
        ],
        { today }
      )
    ).toEqual(["2026-12-01", "2026-12-30", "2027-01-02", "2027-03-07"]);
  });

  it("parses month names", () => {
    expect(findMonthNameRanges("Trajanje: 10. - 13. oktobar / 4 dana", { today })).toEqual([
      { start: "2026-10-10", end: "2026-10-13" },
    ]);
    expect(findMonthNameRanges("4 - 10. OKTOBAR 2026.", { today })).toEqual([{ start: "2026-10-04", end: "2026-10-10" }]);
    expect(findMonthNameRanges("Polazak: 11. oktobar 2026", { today })).toEqual([{ start: "2026-10-11" }]);
  });

  it("finds year hints", () => {
    expect(findYearHint("KUĆA AKIS / SARTI - Astra Travel, Leto 2026, Grcka apartmani")).toBe(2026);
    expect(findYearHint("/ponude/leto-2026/grcka/polihrono/x.html")).toBe(2026);
    expect(findYearHint("bez godine")).toBeUndefined();
  });
});

describe("prices", () => {
  it("parses Serbian number formats", () => {
    expect(parseNumber("1.234")).toBe(1234);
    expect(parseNumber("1.234,50")).toBe(1234.5);
    expect(parseNumber("1 365")).toBe(1365);
    expect(parseNumber("234,5")).toBe(234.5);
    expect(parseNumber("1772.22")).toBe(1772.22);
  });

  it("finds EUR amounts", () => {
    expect(parseEuro("od 1.234 €")).toBe(1234);
    expect(parseEuro("€ 169")).toBe(169);
    expect(parseEuro("€149")).toBe(149);
    expect(parseEuro("209 evra")).toBe(209);
    expect(parseEuro("FIRST MINUTE CENA - 1 365€")).toBe(1365);
    expect(parseAllEuro("135€ Cena za polazak iz Niša 130€")).toEqual([135, 130]);
  });

  it("parses old/new pairs", () => {
    expect(parseOldNew("€ 172 € 112")).toEqual({ price: 112, priceOld: 172 });
    expect(parseOldNew("479 € PROMO CENA : 379 €")).toEqual({ price: 379, priceOld: 479 });
    expect(parseOldNew("Već od € 175 po osobi")).toEqual({ price: 175 });
  });

  it("parses matrix cells", () => {
    expect(parsePriceCell("119* ")).toEqual({ price: 119, marker: "*", note: undefined });
    expect(parsePriceCell("240")).toEqual({ price: 240, marker: undefined, note: undefined });
    expect(parsePriceCell("-")).toBeNull();
    expect(parsePriceCell("")).toBeNull();
    expect(parsePriceCell("1000* 490*")?.price).toBe(490);
  });

  it("detects on-request wording", () => {
    expect(isOnRequest("Dostupno na upit")).toBe(true);
    expect(isOnRequest("Hoteli se rade na upit i konačna potvrda")).toBe(true);
    expect(isOnRequest("Cena po osobi od € 169")).toBe(false);
  });
});

describe("duration, board, transport", () => {
  it("parses durations", () => {
    expect(parseDuration("7 dana / 5 noćenja")).toEqual({ days: 7, nights: 5 });
    expect(parseDuration("3 noćenja / 6 dana")).toEqual({ days: 6, nights: 3 });
    expect(parseDuration("8 dana | 3 noći")).toEqual({ days: 8, nights: 3 });
    expect(parseDuration("7 dana (6 noćenja)")).toEqual({ days: 7, nights: 6 });
    expect(parseDuration("10 ili 7 noćenja / polupansion")).toEqual({ nights: 7, nightsMax: 10 });
  });

  it("parses boards", () => {
    expect(parseBoard("All Inclusive")).toBe("ai");
    expect(parseBoard("Ultra All Inclusive")).toBe("uai");
    expect(parseBoard("Polupansion")).toBe("hb");
    expect(parseBoard("BED & BREAKFAST")).toBe("bb");
    expect(parseBoard("noćenje sa doručkom")).toBe("bb");
    expect(parseBoard("PA")).toBe("fb");
  });

  it("parses transports", () => {
    expect(parseTransports("6 dana / 3 noćenja / autobusom")).toEqual(["bus"]);
    expect(parseTransports("avionom i autobusom").sort()).toEqual(["bus", "plane"]);
    expect(parseTransports("Smeštaj Sopstveni prevoz")).toEqual(["self"]);
  });
});
