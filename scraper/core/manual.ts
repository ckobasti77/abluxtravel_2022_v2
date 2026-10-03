// Manual offers (Holiday Plus KM and any partner later): editor-entered or
// AI-extracted drafts → FinalOffer. Pure: runs inside Convex mutations.
import { findCountry, countryForPlace } from "./geo";
import { normalizeOffer } from "./normalize";
import { cleanLine, escapeHtml, textToHtml, uniqueStrings } from "./text";
import type { Board, Departure, FinalOffer, NormalizedOffer, PriceBasis, Transport } from "./types";

export type ManualOffer = {
  title: string;
  place?: string;
  countryName?: string;
  kind: "trip" | "stay";
  travelTypes?: string[];
  transports: Transport[];
  nights?: number;
  days?: number;
  board?: Board;
  stars?: number;
  departureCities: string[];
  departures: Departure[];
  listPrice?: { price: number; basis: PriceBasis; note?: string };
  included: string[];
  excluded: string[];
  descriptionText?: string;
  programText?: string;
  notesText?: string;
  organizerName: string;
  organizerLicense?: string;
};

export const MANUAL_PREFIX = "manual-";
/** Model for AI extraction of manual imports (D14). */
export const AI_MODEL = "claude-haiku-4-5";
export const isManualExternalId = (externalId: string) => externalId.startsWith(MANUAL_PREFIX);

const DAY_LINE = /^(\d{1,2})\s*\.?\s*(?:[-–]\s*\d{1,2}\.?\s*)?dan\b\s*[:.,–-]?\s*/i;

/** "1. dan: Beograd – Atina\n…\n2. dan …" → program days; text without day headings → one block. */
export function programFromText(text: string | undefined): NormalizedOffer["program"] {
  if (!text?.trim()) return [];
  const days: NormalizedOffer["program"] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (!line) continue;
    const match = line.match(DAY_LINE);
    if (match) {
      const rest = line.slice(match[0].length);
      days.push({ day: Number(match[1]), title: `${match[1]}. dan${rest && rest.length <= 80 ? ` ${rest}` : ""}`, html: rest.length > 80 ? `<p>${escapeHtml(rest)}</p>` : "" });
    } else if (days.length) {
      days[days.length - 1].html += `<p>${escapeHtml(line)}</p>`;
    } else {
      days.push({ title: "Program", html: `<p>${escapeHtml(line)}</p>` });
    }
  }
  return days.slice(0, 40);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Validates and converts a manual offer. Throws ParseError (via normalizeOffer) on missing title. */
export function finalizeManualOffer(
  manual: ManualOffer,
  ctx: { partnerSlug: string; externalId: string; organizer: { name: string; license?: string } }
): FinalOffer {
  const country = findCountry(manual.countryName) ?? countryForPlace(manual.place);
  const departures = manual.departures.filter((departure) => ISO.test(departure.date) && (!departure.endDate || ISO.test(departure.endDate)));
  const offer: NormalizedOffer = {
    partnerSlug: ctx.partnerSlug,
    externalId: ctx.externalId,
    sourceUrl: "",
    kind: manual.kind,
    title: cleanLine(manual.title),
    countryName: country?.name ?? (manual.countryName ? cleanLine(manual.countryName) : undefined),
    countryCode: country?.code,
    place: manual.place ? cleanLine(manual.place) : undefined,
    categoryHints: uniqueStrings(manual.travelTypes ?? []),
    transports: manual.transports,
    nights: manual.nights,
    days: manual.days,
    stars: manual.stars,
    board: manual.board,
    // An editor-entered offer without dates is "na upit" by intent (D4 explicit signal).
    availabilityMode: departures.length ? "dated" : "on_request",
    departures,
    listPrice: manual.listPrice,
    priceNote: manual.listPrice?.note,
    departureCities: manual.departureCities,
    supplements: [],
    images: [],
    descriptionHtml: textToHtml(manual.descriptionText),
    program: programFromText(manual.programText),
    included: manual.included,
    excluded: manual.excluded,
    notesHtml: textToHtml(manual.notesText),
    facts: [],
    organizer: {
      name: cleanLine(manual.organizerName) || ctx.organizer.name,
      license: manual.organizerLicense ? cleanLine(manual.organizerLicense) : manual.organizerName ? undefined : ctx.organizer.license,
    },
    documents: [],
    badges: [],
    warnings: [],
  };
  return normalizeOffer(offer, { hosts: [], imagePolicy: "hotlink", organizer: ctx.organizer, slug: ctx.partnerSlug }, { allowEmptySourceUrl: true });
}
