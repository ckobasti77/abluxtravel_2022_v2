// Pure helpers for ABLux programs (/aranzmani, /aranzmani/[slug]); server and client.
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { formatDate, type Language } from "../../../lib/catalog/format";
import { toCurrencyCode } from "../../../lib/format-money";
import { isBeforeTodayBelgrade } from "../../../scraper/core/time";

export type TripListItem = FunctionReturnType<typeof api.trips.list>[number];
export type TripDetail = NonNullable<FunctionReturnType<typeof api.trips.getBySlug>>;
export type TripAccommodation = FunctionReturnType<typeof api.accommodations.listByTrip>[number];
export type TripDestination = FunctionReturnType<typeof api.destinations.listByTrip>[number];
export type TripStatus = TripDetail["status"];
export type TripTransport = TripDetail["transport"];

type CoverSource = Pick<TripDetail, "heroMediaType" | "heroMediaUrl" | "detailMedia" | "imageUrls">;

const isUsable = (url: string | null | undefined): url is string => Boolean(url && (url.startsWith("https://") || url.startsWith("/")));

/** Cover photo: hero image, else the first gallery image, else the first legacy image. Videos are never covers. */
export function tripCover(trip: CoverSource): string | undefined {
  if (trip.heroMediaType !== "video" && isUsable(trip.heroMediaUrl)) return trip.heroMediaUrl;
  const media = trip.detailMedia?.find((item) => item.mediaType === "image" && isUsable(item.url));
  if (media) return media.url;
  return trip.imageUrls.find(isUsable);
}

/** "14. 4. 2026. – 1. 5. 2026." */
export function tripDates(trip: { departureDate: string; returnDate: string }, language: Language): string {
  const start = formatDate(trip.departureDate, language);
  const end = formatDate(trip.returnDate, language);
  if (start && end && end !== start) return `${start} – ${end}`;
  return start;
}

export function currencyCode(currency: string): string {
  return toCurrencyCode(currency) ?? currency;
}

/** A program whose departure date has passed is shown as completed, whatever its admin status says. */
export function effectiveTripStatus(trip: { status: TripStatus; departureDate: string }): TripStatus {
  return trip.status !== "completed" && isBeforeTodayBelgrade(trip.departureDate, Date.now()) ? "completed" : trip.status;
}

/** The cart sells only active or upcoming programs that have not departed yet (convex/lib/pricing.ts). */
export function isPurchasable(trip: { status: TripStatus; price: number; departureDate: string }): boolean {
  const status = effectiveTripStatus(trip);
  return (status === "active" || status === "upcoming") && trip.price > 0;
}

export const TRANSPORT_LABELS: Record<Language, Record<TripTransport, string>> = {
  sr: { bus: "Autobus", plane: "Avion", car: "Automobil", train: "Voz", self: "Sopstveni prevoz" },
  en: { bus: "Coach", plane: "Plane", car: "Car", train: "Train", self: "Own transport" },
};

export const STATUS_LABELS: Record<Language, Record<TripStatus, string>> = {
  sr: { active: "Prijave u toku", upcoming: "Uskoro", completed: "Završen" },
  en: { active: "Booking open", upcoming: "Coming soon", completed: "Completed" },
};

/** Collapses whitespace (admin descriptions often carry repeated spaces). */
export function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
