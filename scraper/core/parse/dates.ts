// Serbian date parsing (pure). Year inference follows decision D17:
// an explicit hint wins; otherwise the occurrence nearest to today; later
// dates in a sequence roll the year forward when the month decreases.
import { fold } from "../text";
import { diffDaysIso, isIsoDate } from "../time";

export type DayMonth = { day: number; month: number; year?: number };
export type DateToken = DayMonth & { index: number; end: number };
export type YearOptions = { hintYear?: number; today: string };

const pad = (value: number) => String(value).padStart(2, "0");

export function toIso(year: number, month: number, day: number): string | undefined {
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isIsoDate(iso) ? iso : undefined;
}

const MONTHS: [RegExp, number][] = [
  [/^januar/, 1],
  [/^februar/, 2],
  [/^mart/, 3],
  [/^april/, 4],
  [/^maj/, 5],
  [/^jun/, 6],
  [/^jul/, 7],
  [/^(avgust|august)/, 8],
  [/^septemb/, 9],
  [/^oktob/, 10],
  [/^novemb/, 11],
  [/^decemb/, 12],
];

export function monthFromName(word: string): number | undefined {
  const folded = fold(word);
  for (const [pattern, month] of MONTHS) if (pattern.test(folded)) return month;
  return undefined;
}

const validDayMonth = (day: number, month: number) => day >= 1 && day <= 31 && month >= 1 && month <= 12;

/** Numeric dates: "22.05.", "22.05", "10.11.2026.", "10.11. 2026", ISO "2026-10-02". */
export function findDateTokens(text: string): DateToken[] {
  const tokens: DateToken[] = [];
  const iso = /(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+Z?)?/g;
  for (const match of text.matchAll(iso)) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (validDayMonth(day, month)) {
      tokens.push({ day, month, year, index: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
    }
  }
  const numeric = /(?<![\d.])(\d{1,2})\s?\.\s?(\d{1,2})(?:\s?\.\s?((?:19|20)\d{2}))?\.?(?![\d,])/g;
  for (const match of text.matchAll(numeric)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    if (!validDayMonth(day, month)) continue;
    const index = match.index ?? 0;
    if (tokens.some((token) => index >= token.index && index < token.end)) continue;
    tokens.push({ day, month, year: match[3] ? Number(match[3]) : undefined, index, end: index + match[0].length });
  }
  return tokens.sort((a, b) => a.index - b.index);
}

export function resolveYear(day: number, month: number, opts: YearOptions): number {
  if (opts.hintYear) return opts.hintYear;
  const todayYear = Number(opts.today.slice(0, 4));
  let best = todayYear;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const year of [todayYear - 1, todayYear, todayYear + 1]) {
    const iso = toIso(year, month, day);
    if (!iso) continue;
    const distance = Math.abs(diffDaysIso(opts.today, iso));
    if (distance < bestDistance || (distance === bestDistance && year > best)) {
      best = year;
      bestDistance = distance;
    }
  }
  return best;
}

/** Resolve a chronological sequence of day/month values to ISO dates (D17). */
export function inferSequence(values: DayMonth[], opts: YearOptions): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  let previous: { year: number; month: number } | undefined;
  for (const value of values) {
    let year: number;
    if (value.year) year = value.year;
    else if (!previous) year = resolveYear(value.day, value.month, opts);
    else year = value.month < previous.month ? previous.year + 1 : previous.year;
    out.push(toIso(year, value.month, value.day));
    previous = { year, month: value.month };
  }
  return out;
}

export type DateRange = { start: string; end?: string };

/** Resolve a start/end pair; the end year carries to the start (with year rollback). */
export function resolveRange(start: DayMonth, end: DayMonth | undefined, opts: YearOptions): DateRange | undefined {
  if (!end) {
    const year = start.year ?? resolveYear(start.day, start.month, opts);
    const iso = toIso(year, start.month, start.day);
    return iso ? { start: iso } : undefined;
  }
  let startYear: number;
  let endYear: number;
  if (start.year && end.year) {
    startYear = start.year;
    endYear = end.year;
  } else if (end.year) {
    endYear = end.year;
    startYear = start.month > end.month ? end.year - 1 : end.year;
  } else {
    startYear = start.year ?? resolveYear(start.day, start.month, opts);
    endYear = end.month < start.month ? startYear + 1 : startYear;
  }
  const s = toIso(startYear, start.month, start.day);
  const e = toIso(endYear, end.month, end.day);
  if (!s) return undefined;
  return { start: s, end: e && e >= s ? e : undefined };
}

/**
 * All date ranges in free text: "30.09.-05.10.2026.", "23.09– 28.09.2026.",
 * "10.11 - 15.11.2026.", single dates "10.11.2026.". Prefixes like
 * "SEPTEMBAR:" are ignored.
 */
export function findDateRanges(text: string, opts: YearOptions): DateRange[] {
  const tokens = findDateTokens(text);
  const ranges: DateRange[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];
    const between = next ? text.slice(current.end, next.index) : "";
    if (next && /^\s*[-–—]\s*$/.test(between)) {
      const range = resolveRange(current, next, opts);
      if (range) ranges.push(range);
      i += 1;
    } else {
      const range = resolveRange(current, undefined, opts);
      if (range) ranges.push(range);
    }
  }
  return ranges;
}

/**
 * Month-name dates: "10. - 13. oktobar", "4 - 10. OKTOBAR 2026.",
 * "Polazak: 11. oktobar 2026".
 */
export function findMonthNameRanges(text: string, opts: YearOptions): DateRange[] {
  const ranges: DateRange[] = [];
  const pattern =
    /(\d{1,2})\.?\s*(?:[-–—]\s*(\d{1,2})\.?\s*)?([a-zA-ZčćšžđČĆŠŽĐ]{3,})\.?\s*((?:19|20)\d{2})?/g;
  for (const match of text.matchAll(pattern)) {
    const month = monthFromName(match[3]);
    if (!month) continue;
    const year = match[4] ? Number(match[4]) : undefined;
    const startDay = Number(match[1]);
    const endDay = match[2] ? Number(match[2]) : undefined;
    if (!validDayMonth(startDay, month)) continue;
    const range = resolveRange(
      { day: startDay, month, year },
      endDay ? { day: endDay, month, year } : undefined,
      opts
    );
    if (range) ranges.push(range);
  }
  return ranges;
}

/** First 4-digit season year in a text ("Leto 2026", "leto-2026", "Cenovnik … 2026"). */
export function findYearHint(...texts: (string | undefined)[]): number | undefined {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/(?:^|[^\d])(20[2-3]\d)(?!\d)/);
    if (match) return Number(match[1]);
  }
  return undefined;
}
