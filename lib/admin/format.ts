"use client";

// Admin copy and formatting. Admin text is Serbian first; English is a short
// pair next to it (`t("Upiti", "Inquiries")`) instead of a separate dictionary,
// as in the admin pages of step 03. Dates follow DESIGN.md ("12. 6. 2026.", 24 h).
import { useCallback } from "react";
import { useSitePreferences } from "../../components/site-preferences-provider";

export type AdminT = (sr: string, en: string) => string;

export function useAdminT(): { t: AdminT; language: "sr" | "en"; locale: string } {
  const { language } = useSitePreferences();
  const t = useCallback<AdminT>((sr, en) => (language === "en" ? en : sr), [language]);
  return { t, language, locale: language === "en" ? "en-GB" : "sr-Latn-RS" };
}

const TZ = "Europe/Belgrade";

/** "12. 6. 2026." */
export function formatDate(value: number | string | null | undefined, language: "sr" | "en" = "sr") {
  if (value === null || value === undefined || value === "") return "";
  const date = typeof value === "number" ? new Date(value) : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  if (language === "en") return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(date);
  const parts = new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "numeric", year: "numeric", timeZone: TZ }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("day")}. ${pick("month")}. ${pick("year")}.`;
}

/** "06:00" */
export function formatTime(value: number) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(value));
}

function dayKey(value: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

/** "Danas u 06:00", "Juče u 18:20", otherwise "12. 6. 2026. u 06:00". */
export function formatWhen(value: number | null | undefined, language: "sr" | "en" = "sr", now = Date.now()) {
  if (!value) return "";
  const time = formatTime(value);
  const today = dayKey(now);
  const day = dayKey(value);
  if (day === today) return language === "en" ? `Today at ${time}` : `Danas u ${time}`;
  if (day === dayKey(now - 86_400_000)) return language === "en" ? `Yesterday at ${time}` : `Juče u ${time}`;
  if (day === dayKey(now + 86_400_000)) return language === "en" ? `Tomorrow at ${time}` : `Sutra u ${time}`;
  return `${formatDate(value, language)} ${language === "en" ? "at" : "u"} ${time}`;
}

/** Start of today in Belgrade, as epoch ms (for "danas" filters). */
export function startOfTodayBelgrade(now = Date.now()) {
  const today = dayKey(now);
  const [year, month, day] = today.split("-").map(Number);
  // Belgrade is UTC+1 (winter) or UTC+2 (summer): midnight is the candidate
  // whose previous millisecond still belongs to yesterday.
  for (const offset of [2, 1]) {
    const candidate = Date.UTC(year, month - 1, day) - offset * 3_600_000;
    if (dayKey(candidate) === today && dayKey(candidate - 1) !== today) return candidate;
  }
  return Date.UTC(year, month - 1, day) - 3_600_000;
}

/** "7 h 12 min", "12 min", "manje od minuta". */
export function formatDuration(ms: number, language: "sr" | "en" = "sr") {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return language === "en" ? "under a minute" : "manje od minuta";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Short run duration: "42 s", "3 min 10 s". */
export function formatRunDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) return "";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** "1.290 €", "24.500 RSD" (thousands with a dot). */
export function formatMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount === null || amount === undefined) return "";
  const fraction = amount % 1 ? 2 : 0;
  const number = new Intl.NumberFormat("de-DE", { minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(amount);
  if (currency === "EUR") return `${number} €`;
  if (currency === "RSD" || currency === "ДИН") return `${number} RSD`;
  return `${number} ${currency}`;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

/** Convex error code from a thrown ConvexError ("SYNC_COOLDOWN"), or null. */
export function errorCode(error: unknown): string | null {
  const data = (error as { data?: unknown } | null)?.data;
  if (typeof data === "string") return data;
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/\b([A-Z][A-Z_]{3,})\b/);
  return match ? match[1] : null;
}
