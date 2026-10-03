import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractionSchema, toDrafts } from "./manualImportNode";

describe("AI extraction mapping (no API call)", () => {
  it("builds a structured-output format from the zod schema", () => {
    expect(() => zodOutputFormat(ExtractionSchema)).not.toThrow();
  });

  it("maps nulls away and drops departures without a full date", () => {
    const drafts = toDrafts(
      {
        offers: [
          {
            title: "Hotel Test",
            place: null,
            countryName: "Grčka",
            kind: "stay",
            transports: ["bus"],
            nights: 10,
            days: null,
            board: "hb",
            stars: 4,
            departureCities: [],
            departures: [
              { date: "2027-06-04", endDate: "2027-06-14", nights: 10, unit: "1/2", board: null, transport: null, fromCity: null, price: 990, priceOld: null, basis: "per_unit", soldOut: null, note: null },
              { date: null, endDate: null, nights: null, unit: null, board: null, transport: null, fromCity: null, price: 500, priceOld: null, basis: "per_unit", soldOut: null, note: null },
            ],
            listPrice: null,
            included: [],
            excluded: [],
            descriptionText: null,
            programText: null,
            notesText: null,
            organizerName: null,
            organizerLicense: null,
            warnings: [],
          },
        ],
        warnings: [],
      },
      "Holiday Plus KM"
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].offer.departures).toEqual([
      { date: "2027-06-04", endDate: "2027-06-14", nights: 10, unit: "1/2", board: undefined, transport: undefined, fromCity: undefined, price: 990, priceOld: undefined, basis: "per_unit", availability: undefined, note: undefined },
    ]);
    expect(drafts[0].offer.organizerName).toBe("Holiday Plus KM");
    expect(drafts[0].warnings).toContain("Termin bez potpunog datuma je izostavljen.");
  });
});
