// Server-side cart pricing. Titles, prices and currencies come only from the
// database; the client sends nothing but item ids and quantities.
// Only ABLux programs can be bought (cart + IPS deposit); partner offers go
// through the inquiry flow.
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { MANUAL_RELIGIOUS_SOURCE_SLUG } from "../../lib/religious";
import { isBeforeTodayBelgrade } from "../../scraper/core/time";

export const cartItemType = v.union(
  v.literal("trip"),
  v.literal("destination"),
  v.literal("offer"),
  v.literal("accommodation")
);

export const cartItemInput = v.object({
  type: cartItemType,
  id: v.string(),
  quantity: v.number(),
});

export type CartItemInput = {
  type: "trip" | "destination" | "offer" | "accommodation";
  id: string;
  quantity: number;
};

export type PricedLine = {
  id: string;
  type: CartItemInput["type"];
  title: string;
  price: number;
  currency: "RSD" | "EUR";
  quantity: number;
  meta?: Record<string, string>;
};

export type PricingResult =
  | { ok: true; lines: PricedLine[]; originalTotals: Record<string, number> }
  | {
      ok: false;
      error: "EMPTY" | "TOO_MANY_ITEMS" | "INVALID_QUANTITY" | "ITEM_UNAVAILABLE";
      invalidIds: string[];
    };

export const MAX_CART_LINES = 10;
export const MAX_QUANTITY = 20;

const RSD_ALIASES = new Set(["RSD", "DIN", "DIN.", "ДИН", "ДИН.", "DINAR", "DINARA", "ДИНАР", "ДИНАРА"]);
const EUR_ALIASES = new Set(["EUR", "€", "EVRO", "EVRA", "ЕУР", "ЕВРО"]);

export function normalizeCurrencyCode(value: string): "RSD" | "EUR" | null {
  const code = value.trim().toUpperCase();
  if (RSD_ALIASES.has(code)) return "RSD";
  if (EUR_ALIASES.has(code)) return "EUR";
  return null;
}

const validPrice = (price: number) => Number.isFinite(price) && price > 0;
// A program whose departure date has passed is closed even if its admin status was not updated.
const departed = (trip: Doc<"trips">) => isBeforeTodayBelgrade(trip.departureDate, Date.now());
const closedTrip = (trip: Doc<"trips"> | null): trip is null => !trip || trip.status === "completed" || departed(trip);
const purchasableTrip = (trip: Doc<"trips"> | null) =>
  Boolean(trip && (trip.status === "active" || trip.status === "upcoming") && !departed(trip));

async function priceOne(ctx: QueryCtx, item: CartItemInput): Promise<PricedLine | null> {
  const line = (
    title: string,
    price: number,
    currency: string,
    meta?: Record<string, string>
  ): PricedLine | null => {
    const code = normalizeCurrencyCode(currency);
    if (!code || !validPrice(price)) return null;
    return { id: item.id, type: item.type, title, price, currency: code, quantity: item.quantity, meta };
  };

  if (item.type === "trip") {
    const id = ctx.db.normalizeId("trips", item.id);
    const trip = id ? await ctx.db.get(id) : null;
    if (!trip || !purchasableTrip(trip)) return null;
    return line(trip.title, trip.price, trip.currency, { departureDate: trip.departureDate });
  }

  if (item.type === "accommodation") {
    const id = ctx.db.normalizeId("accommodations", item.id);
    const accommodation = id ? await ctx.db.get(id) : null;
    if (!accommodation || !accommodation.isActive) return null;
    const trip = await ctx.db.get(accommodation.tripId);
    if (closedTrip(trip)) return null;
    return line(`${accommodation.name} - ${trip.title}`, accommodation.pricePerPerson, accommodation.currency, {
      parentPackage: trip.title,
    });
  }

  if (item.type === "destination") {
    const id = ctx.db.normalizeId("destinations", item.id);
    const destination = id ? await ctx.db.get(id) : null;
    if (!destination || !destination.isActive || destination.offerType === "subagency") return null;
    let parentTitle: string | null = null;
    if (destination.tripId) {
      const trip = await ctx.db.get(destination.tripId as Id<"trips">);
      if (closedTrip(trip)) return null;
      parentTitle = trip.title;
    } else if (destination.pageSlug) {
      const group = await ctx.db
        .query("slides")
        .withIndex("by_slug", (q) => q.eq("slug", destination.pageSlug))
        .first();
      if (group && !group.isActive) return null;
      parentTitle = group?.title ?? null;
    }
    const meta: Record<string, string> = {};
    if (parentTitle) meta.parentPackage = parentTitle;
    if (destination.departureCity) meta.departureCity = destination.departureCity;
    if (destination.departureDate) meta.departureDate = destination.departureDate;
    return line(
      parentTitle ? `${destination.title} - ${parentTitle}` : destination.title,
      destination.price,
      destination.currency,
      meta
    );
  }

  // offer: only ABLux's own religious programs are sold through the cart.
  const id = ctx.db.normalizeId("offers", item.id);
  const offer = id ? await ctx.db.get(id) : null;
  if (!offer || !offer.isActive || offer.sourceSlug !== MANUAL_RELIGIOUS_SOURCE_SLUG) return null;
  // Same rule as /verski-turizam: a dated pilgrimage that already departed is no longer sold.
  if (isBeforeTodayBelgrade(offer.departureDate, Date.now())) return null;
  const meta: Record<string, string> = { destination: offer.destination };
  if (offer.departureCity) meta.departureCity = offer.departureCity;
  if (offer.departureDate) meta.departureDate = offer.departureDate;
  return line(offer.title, offer.price, offer.currency, meta);
}

export async function priceCartItems(
  ctx: QueryCtx,
  items: CartItemInput[]
): Promise<PricingResult> {
  if (items.length === 0) return { ok: false, error: "EMPTY", invalidIds: [] };

  const merged = new Map<string, CartItemInput>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      return { ok: false, error: "INVALID_QUANTITY", invalidIds: [item.id] };
    }
    const key = `${item.type}:${item.id}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item });
  }
  if (merged.size > MAX_CART_LINES) return { ok: false, error: "TOO_MANY_ITEMS", invalidIds: [] };

  const lines: PricedLine[] = [];
  const invalidIds: string[] = [];
  for (const item of merged.values()) {
    if (item.quantity > MAX_QUANTITY) {
      return { ok: false, error: "INVALID_QUANTITY", invalidIds: [item.id] };
    }
    const priced = await priceOne(ctx, item);
    if (priced) lines.push(priced);
    else invalidIds.push(item.id);
  }
  if (invalidIds.length > 0) return { ok: false, error: "ITEM_UNAVAILABLE", invalidIds };

  const originalTotals: Record<string, number> = {};
  for (const priced of lines) {
    originalTotals[priced.currency] =
      Math.round(((originalTotals[priced.currency] ?? 0) + priced.price * priced.quantity) * 100) / 100;
  }
  return { ok: true, lines, originalTotals };
}
