import { describe, expect, it } from "vitest";
import { deriveOffer } from "./derive";
import { finalizeManualOffer, programFromText, type ManualOffer } from "./manual";

const base: ManualOffer = {
  title: "Atina i Meteori",
  place: "Atina",
  countryName: "Grčka",
  kind: "trip",
  transports: ["bus"],
  nights: 3,
  days: 5,
  departureCities: ["Kraljevo"],
  departures: [{ date: "2026-11-10", endDate: "2026-11-14", price: 189, basis: "per_person" }],
  included: ["Prevoz autobusom"],
  excluded: [],
  programText: "1. dan Kraljevo – Atina\nPolazak u 17 h.\n2. dan Atina\nRazgledanje.",
  descriptionText: "Prvi pasus.\n\nDrugi <pasus>.",
  organizerName: "",
};
const ctx = { partnerSlug: "holidayplus", externalId: "manual-abc", organizer: { name: "Holiday Plus KM" } };

describe("manual offers", () => {
  it("finalizes without a source URL, with escaped HTML and the partner as organizer", () => {
    const offer = finalizeManualOffer(base, ctx);
    expect(offer.sourceUrl).toBe("");
    expect(offer.countryCode).toBe("GR");
    expect(offer.availabilityMode).toBe("dated");
    expect(offer.organizer).toEqual({ name: "Holiday Plus KM", license: undefined });
    expect(offer.descriptionHtml).toBe("<p>Prvi pasus.</p><p>Drugi &lt;pasus&gt;.</p>");
    expect(offer.program.map((day) => day.title)).toEqual(["1. dan Kraljevo – Atina", "2. dan Atina"]);
    expect(deriveOffer(offer, { today: "2026-10-01", partnerName: "Holiday Plus KM" }).priceFrom).toBe(189);
  });

  it("treats an offer without dates as on request (explicit editor intent)", () => {
    const offer = finalizeManualOffer({ ...base, departures: [], listPrice: undefined }, ctx);
    expect(offer.availabilityMode).toBe("on_request");
    const derived = deriveOffer(offer, { today: "2026-10-01", partnerName: "Holiday Plus KM" });
    expect(derived.activeByDates).toBe(true);
    expect(derived.priceKind).toBe("on_request");
  });

  it("drops malformed dates and rejects an empty title", () => {
    expect(finalizeManualOffer({ ...base, departures: [{ date: "10.11.", basis: "per_person" }] }, ctx).departures).toEqual([]);
    expect(() => finalizeManualOffer({ ...base, title: "  " }, ctx)).toThrow();
  });

  it("keeps free text without day headings as one block", () => {
    expect(programFromText("Obilazak grada.")).toEqual([{ title: "Program", html: "<p>Obilazak grada.</p>" }]);
  });
});
