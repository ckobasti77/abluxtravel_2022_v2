// Display helpers for catalog cards and offer pages (pure; server and client).
import type { CatalogCopy } from "../i18n-catalog";
import type { PriceBasis as UiPriceBasis } from "../../components/ui/price";
import type { DurationBucket, Transport } from "./filters";

export type Language = "sr" | "en";
export type Board = "ro" | "bb" | "hb" | "fb" | "ai" | "uai";
export type DataPriceBasis =
  | "per_person"
  | "per_person_night"
  | "per_unit"
  | "per_unit_night"
  | "per_day"
  | "per_stay"
  | "total_2_adults"
  | "unknown";
export type Availability = "available" | "few" | "sold_out" | "on_request" | "unknown";

const BASIS: Record<DataPriceBasis, UiPriceBasis | null> = {
  per_person: "perPerson",
  per_person_night: "perPersonNight",
  per_unit: "perUnit",
  per_unit_night: "perUnitNight",
  per_day: "perDay",
  per_stay: "perStay",
  total_2_adults: "totalForTwo",
  // A price without a known basis is not shown (DESIGN.md: basis is mandatory).
  unknown: null,
};

export function uiBasis(basis: DataPriceBasis | undefined | null): UiPriceBasis | null {
  return basis ? BASIS[basis] : null;
}

const pad = (value: number) => String(value);

function parts(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

/** "15. 10. 2026." (sr) or "15 Oct 2026" (en). */
export function formatDate(iso: string | undefined, language: Language): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const { year, month, day } = parts(iso);
  if (language === "en") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
      Date.UTC(year, month - 1, day)
    );
  }
  return `${pad(day)}. ${pad(month)}. ${year}.`;
}

/** "15. 10." (sr) or "15 Oct" (en). */
export function formatShortDate(iso: string | undefined, language: Language): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const { year, month, day } = parts(iso);
  if (language === "en") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(Date.UTC(year, month - 1, day));
  }
  return `${pad(day)}. ${pad(month)}.`;
}

/** Date from a millisecond timestamp, in Belgrade time ("1. 10. 2026."). */
export function formatTimestamp(ms: number, language: Language): string {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" });
  return formatDate(formatter.format(ms), language);
}

/** "oktobar 2026." (sr) or "October 2026" (en). */
export function monthLabel(month: string, language: Language): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, monthIndex - 1, 1));
  return label;
}

/** Serbian plural forms: one (1, 21, 31…), few (2–4, 22–24…), many (5–20, 25…). */
export function serbianPlural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function nightsLabel(count: number, language: Language, max?: number): string {
  const range = max && max > count ? `${count}–${max}` : String(count);
  const last = max && max > count ? max : count;
  if (language === "en") return `${range} ${last === 1 ? "night" : "nights"}`;
  return `${range} ${serbianPlural(last, "noćenje", "noćenja", "noćenja")}`;
}

export function daysLabel(count: number, language: Language): string {
  if (language === "en") return `${count} ${count === 1 ? "day" : "days"}`;
  return `${count} ${serbianPlural(count, "dan", "dana", "dana")}`;
}

/** "+3 termina" / "+3 more". */
export function moreDatesLabel(count: number, language: Language): string {
  if (language === "en") return `+${count} more ${count === 1 ? "date" : "dates"}`;
  return `+${count} ${serbianPlural(count, "termin", "termina", "termina")}`;
}

export function durationText(
  card: { nights?: number; nightsMax?: number; days?: number },
  language: Language
): string | undefined {
  if (card.days && card.nights) return `${daysLabel(card.days, language)} / ${nightsLabel(card.nights, language, card.nightsMax)}`;
  if (card.nights) return nightsLabel(card.nights, language, card.nightsMax);
  if (card.days) return daysLabel(card.days, language);
  return undefined;
}

export function transportLabel(transport: Transport, copy: CatalogCopy): string {
  const labels: Record<Transport, string> = {
    bus: copy.transportBus,
    plane: copy.transportPlane,
    ship: copy.transportShip,
    train: copy.transportTrain,
    self: copy.transportSelf,
  };
  return labels[transport];
}

export function boardLabel(board: Board, copy: CatalogCopy): string {
  const labels: Record<Board, string> = {
    ro: copy.boardRo,
    bb: copy.boardBb,
    hb: copy.boardHb,
    fb: copy.boardFb,
    ai: copy.boardAi,
    uai: copy.boardUai,
  };
  return labels[board];
}

export function durationBucketLabel(bucket: DurationBucket, copy: CatalogCopy): string {
  const labels: Record<DurationBucket, string> = {
    "1-3": copy.duration13,
    "4-7": copy.duration47,
    "8-14": copy.duration814,
    "15+": copy.duration15,
  };
  return labels[bucket];
}

export function availabilityLabel(availability: Availability | undefined, copy: CatalogCopy): string | undefined {
  switch (availability) {
    case "available":
      return copy.availAvailable;
    case "few":
      return copy.availFew;
    case "sold_out":
      return copy.availSoldOut;
    case "on_request":
      return copy.availOnRequest;
    default:
      return undefined;
  }
}

export function badgeLabel(badge: string, copy: CatalogCopy): string | undefined {
  const labels: Record<string, string> = {
    last_minute: copy.badgeLastMinute,
    first_minute: copy.badgeFirstMinute,
    promo: copy.badgePromo,
    new: copy.badgeNew,
  };
  return labels[badge];
}

/** Hotel category as "4★". */
export function starsText(stars: number | undefined): string | undefined {
  if (!stars || stars < 1 || stars > 5) return undefined;
  return `${Math.round(stars)}★`;
}
