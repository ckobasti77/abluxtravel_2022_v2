"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { isTravelTypeSlug, TRAVEL_TYPES, type TravelTypeSlug } from "./travel-types";

/*
 * "Kuda putujete?" search: URL params and live counts.
 *
 * Catalog URL contract (read by /ponude, see lib/catalog/filters.ts):
 *   tip=<travel type slug>  mesec=YYYY-MM  putnika=<1–20>  polazak=<city>
 *
 * Counts come from the catalog query (`catalog.count`, step 10): the same
 * filters /ponude applies, over ABLux programs and published partner offers.
 * `putnika` is not a filter (partners publish no seat counts); /ponude carries
 * it to the inquiry form.
 */

export type TripSearchParams = {
  tip?: TravelTypeSlug;
  /** YYYY-MM */
  mesec?: string;
  putnika?: number;
  polazak?: string;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseTripSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>): TripSearchParams {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const tip = get("tip");
  const mesec = get("mesec");
  const putnika = Number(get("putnika"));
  const polazak = get("polazak")?.trim();
  return {
    tip: isTravelTypeSlug(tip) ? tip : undefined,
    mesec: mesec && MONTH_PATTERN.test(mesec) ? mesec : undefined,
    putnika: Number.isInteger(putnika) && putnika >= 1 && putnika <= 20 ? putnika : undefined,
    polazak: polazak ? polazak.slice(0, 60) : undefined,
  };
}

export function tripSearchQuery(params: TripSearchParams): string {
  const query = new URLSearchParams();
  if (params.tip) query.set("tip", params.tip);
  if (params.mesec) query.set("mesec", params.mesec);
  if (params.putnika) query.set("putnika", String(params.putnika));
  if (params.polazak) query.set("polazak", params.polazak);
  return query.toString();
}

export function tripSearchHref(params: TripSearchParams): string {
  const query = tripSearchQuery(params);
  return query ? `/ponude?${query}` : "/ponude";
}

export type TripSearchResult = {
  count: number;
  /** Departure cities present in the data (for the "Polazak iz" select). */
  departureCities: string[];
  isLoading: boolean;
};

export function useTripSearch(params: TripSearchParams): TripSearchResult {
  const result = useQuery(api.catalog.count, { tip: params.tip, mesec: params.mesec, polazak: params.polazak });
  return useMemo(() => {
    const departureCities = (result?.facets.polazak ?? [])
      .map((entry) => entry.label ?? entry.value)
      .sort((a, b) => a.localeCompare(b, "sr"));
    return { count: result?.total ?? 0, departureCities, isLoading: result === undefined };
  }, [result]);
}

const ZERO_COUNTS = Object.fromEntries(TRAVEL_TYPES.map((type) => [type.slug, 0])) as Record<TravelTypeSlug, number>;

/** Live count per travel type (mega menu, footer). */
export function useTravelTypeCounts(): Record<TravelTypeSlug, number> {
  return useQuery(api.catalog.countsByTravelType, {}) ?? ZERO_COUNTS;
}

/** Serbian plural for "ponuda": 1 ponuda, 2–4 ponude, 5+ ponuda (11–14 ponuda). */
export function offerCountLabel(count: number, language: "sr" | "en"): string {
  if (language === "en") return `${count} ${count === 1 ? "offer" : "offers"}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "ponude" : "ponuda";
  return `${count} ${word}`;
}

/** Next 12 months as { value: "YYYY-MM", label: "novembar 2026." }. */
export function upcomingMonths(language: "sr" | "en", from = new Date()): { value: string; label: string }[] {
  const formatter = new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-GB", { month: "long", year: "numeric" });
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth() + index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: formatter.format(date) };
  });
}
