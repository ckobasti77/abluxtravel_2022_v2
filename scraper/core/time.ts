// Europe/Belgrade time without Intl (deterministic in every runtime).
// EU rule: CEST (UTC+2) from the last Sunday of March 01:00 UTC to the last
// Sunday of October 01:00 UTC, otherwise CET (UTC+1).

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** UTC ms of 01:00 UTC on the last Sunday of the given month (0-based). */
function lastSundayAt0100Utc(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const back = lastDay.getUTCDay(); // 0 = Sunday
  return Date.UTC(year, month, lastDay.getUTCDate() - back, 1, 0, 0);
}

export function belgradeOffsetMinutes(utcMs: number): 60 | 120 {
  const year = new Date(utcMs).getUTCFullYear();
  const start = lastSundayAt0100Utc(year, 2);
  const end = lastSundayAt0100Utc(year, 9);
  return utcMs >= start && utcMs < end ? 120 : 60;
}

export type BelgradeParts = { year: number; month: number; day: number; hour: number; minute: number };

export function belgradeParts(utcMs: number): BelgradeParts {
  const local = new Date(utcMs + belgradeOffsetMinutes(utcMs) * 60 * 1000);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** YYYY-MM-DD in Europe/Belgrade. */
export function belgradeDateKey(utcMs: number): string {
  const p = belgradeParts(utcMs);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export const todayBelgrade = belgradeDateKey;

/** True when an ISO date (YYYY-MM-DD…) lies before today in Europe/Belgrade. Unparseable dates are never "past". */
export function isBeforeTodayBelgrade(dateIso: string | undefined, utcMs: number): boolean {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}/.test(dateIso)) return false;
  return dateIso.slice(0, 10) < belgradeDateKey(utcMs);
}

/** UTC ms of 06:00 Europe/Belgrade on the given local date. */
function slotOnLocalDate(year: number, month: number, day: number): number {
  // 04:00 UTC is after the 01:00 UTC switch, so it carries that day's offset.
  const probe = Date.UTC(year, month - 1, day, 4, 0, 0);
  return Date.UTC(year, month - 1, day, 6, 0, 0) - belgradeOffsetMinutes(probe) * 60 * 1000;
}

/** Most recent 06:00 Europe/Belgrade instant ≤ now. */
export function lastSlotAt(utcMs: number): number {
  const p = belgradeParts(utcMs);
  const today = slotOnLocalDate(p.year, p.month, p.day);
  if (today <= utcMs) return today;
  const yesterday = belgradeParts(utcMs - DAY_MS);
  return slotOnLocalDate(yesterday.year, yesterday.month, yesterday.day);
}

/** Next 06:00 Europe/Belgrade instant > now. */
export function nextSlotAt(utcMs: number): number {
  const p = belgradeParts(utcMs);
  const today = slotOnLocalDate(p.year, p.month, p.day);
  if (today > utcMs) return today;
  const tomorrow = belgradeParts(utcMs + DAY_MS);
  return slotOnLocalDate(tomorrow.year, tomorrow.month, tomorrow.day);
}

/** Cycle = Belgrade date of the most recent 06:00 slot (D7). */
export function cycleKeyOf(utcMs: number): string {
  return belgradeDateKey(lastSlotAt(utcMs));
}

/** True when the Belgrade local hour is 6 (cron gate; DST-safe). */
export function isCronHour(utcMs: number): boolean {
  return belgradeParts(utcMs).hour === 6;
}

/** Add days to an ISO date (YYYY-MM-DD). */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Whole days between two ISO dates (b − a). */
export function diffDaysIso(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

export function isIsoDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
