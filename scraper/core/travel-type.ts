// Travel type mapping (pure). Uses the step 05 keyword table.
import { detectTravelTypes, type TravelTypeSlug } from "../../lib/search/travel-types";
import type { Country } from "./geo";
import { fold } from "./text";

export type CategoryMapEntry = { match: string; travelType: string };

const SKI_HINTS =
  /zimovanj|skijanj|\bski\b|bansko|borovec|pamporovo|kopaonik|jahorina|livign|passo tonale|val thorens|stara planina|risoul|serre chevalier/;

export type TravelTypeInput = {
  title: string;
  categoryHints: string[];
  kind: "trip" | "stay";
  country?: Country;
  days?: number;
  departureDates: string[];
};

export function mapTravelTypes(input: TravelTypeInput, categoryMap: CategoryMapEntry[] = []): TravelTypeSlug[] {
  const text = [input.title, ...input.categoryHints].join(" ");
  const folded = fold(text);
  const types: string[] = [];
  const add = (slug: string) => {
    if (!types.includes(slug)) types.push(slug);
  };

  for (const entry of categoryMap) {
    if (entry.match && folded.includes(fold(entry.match))) add(entry.travelType);
  }
  // "Monastir" is a Tunisian resort, not a monastery (keyword "monast").
  for (const slug of detectTravelTypes(text.replace(/monastir/gi, " "))) add(slug);
  // A trip is not a beach holiday just because the country is Greece or Turkey ("Istanbul – Dan primirja").
  if (input.kind === "trip" && types.includes("letovanje") && !/letovanj|\bleto\b|\bmore\b|plaz|beach|summer/.test(folded)) {
    types.splice(types.indexOf("letovanje"), 1);
  }

  if (types.length === 0) {
    if (SKI_HINTS.test(folded)) add("zimovanje");
    else if (/krstarenj/.test(folded)) add("krstarenja");
    else if (input.kind === "stay" && input.country?.beach) add("letovanje");
    else if (input.kind === "trip" && input.days !== undefined && input.days <= 1) add("izleti");
    else if (input.kind === "trip" && input.country && input.country.europe) add("evropski-gradovi");
    else if (input.kind === "trip" && input.country && !input.country.europe) add("daleka-putovanja");
    else if (input.kind === "stay" && input.country && !input.country.beach) add("zimovanje");
  }

  const newYear = input.departureDates.some((iso) => {
    const md = iso.slice(5);
    return md >= "12-27" || md <= "01-02";
  });
  if (newYear && input.kind === "trip") add("nova-godina-i-praznici");

  return types.slice(0, 3) as TravelTypeSlug[];
}
