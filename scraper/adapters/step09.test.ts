// Regressions found in the first live import (step 09), checked on fixtures.
import { describe, expect, it } from "vitest";
import { deriveOffer } from "../core/derive";
import { checkUrl } from "../core/http";
import { mapTravelTypes } from "../core/travel-type";
import { findCountry, placeFromText } from "../core/geo";
import type { AdapterEnv } from "../core/types";
import { PARTNERS_BY_SLUG } from "../registry";
import { readFixture } from "../testing/fixture-http";
import { parseDunavDetail } from "./dunavturs";
import { parseMarsDetail, parseMarsList, type MarsCard } from "./mars";
import { parseRoamDetail } from "./wp-roam";

const env = (slug: string, today = "2026-10-01"): AdapterEnv => ({ config: PARTNERS_BY_SLUG[slug], today, log: () => undefined });

describe("step 09 fixes", () => {
  it("Rapsody trips get their destination from the title or URL", () => {
    const options = PARTNERS_BY_SLUG.rapsody.options as Parameters<typeof parseMarsList>[3];
    const p1 = parseMarsList(JSON.parse(readFixture("mars/rapsody-list-p1.json")), "https://www.rapsodytravel.rs", { objectGroupId: 6 }, options);
    const card: MarsCard = { ...p1.cards[0], url: "https://www.rapsodytravel.rs/putovanja/rim/putovanje-rim-2026/1467/", externalId: "1467", dates: [] };
    const offer = parseMarsDetail(readFixture("mars/rapsody-rim-1467.html"), card.url, card, undefined, env("rapsody"));
    expect(offer.place).toBe("Rim");
    expect(offer.countryCode).toBe("IT");
    expect(placeFromText("Azurna obala (5 dana)")).toMatchObject({ place: "Azurna obala", country: { code: "FR" } });
    expect(placeFromText("Budimpešta Advent 2026")?.country.code).toBe("HU");
    expect(placeFromText("bayahibe")?.country.code).toBe("DO");
  });

  it("a trip to Turkey is not a beach holiday; Istanbul is a city break", () => {
    const offer = parseDunavDetail(
      readFixture("dunavturs/istanbul-dan-primirja.html"),
      "http://www.dunavturs.com/ponude/putovanja/turska/istanbul/istanbul-dan-primirja.html",
      env("dunavturs")
    );
    expect(offer.place).toBe("Istanbul");
    const derived = deriveOffer(offer, { today: "2026-10-01", partnerName: "Dunav Turs" });
    expect(derived.travelTypes).not.toContain("letovanje");
    expect(derived.travelTypes).toContain("evropski-gradovi");
    // stays in Greece remain beach holidays
    expect(mapTravelTypes({ title: "Vila Sakis", categoryHints: ["grcka"], kind: "stay", country: findCountry("Grčka"), departureDates: [] })).toContain("letovanje");
  });

  it("Nitravel trips whose 'Destination' is a country take the city from the title", () => {
    const offer = parseRoamDetail(readFixture("wp-roam/nitravel-prag.html"), "https://www.nitravel.rs/tour-item/prag/", env("nitravel"));
    expect(offer.place).toBe("Prag");
    expect(offer.countryCode).toBe("CZ");
  });

  it("Viva cruise pages are on the allowlist", () => {
    expect(() => checkUrl(PARTNERS_BY_SLUG.viva, "https://www.vivatravel.rs/krstarenja/italija/krstarenje-sjaj-jesenjeg-mediterana-costa-smeralda/1276/")).not.toThrow();
  });
});
