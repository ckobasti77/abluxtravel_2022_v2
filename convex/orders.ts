import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { calculateIpsTotals } from "../lib/ips-payment";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { inboxPatch } from "./lib/inbox";
import { namesById } from "./lib/profile";
import { isValidEmail, normalizeEmail, sha256Hex } from "./lib/passwords";
import { cartItemInput, priceCartItems } from "./lib/pricing";
import { consumeRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { requireServerSecret } from "./lib/serverSecret";

/**
 * Server-side price quote for cart items (ids + quantities only).
 * Public: returns only published prices of purchasable ABLux programs.
 */
export const quote = query({
  args: { items: v.array(cartItemInput) },
  handler: async (ctx, args) => await priceCartItems(ctx, args.items),
});

/**
 * Rate limits for the IPS checkout. Called by app/api/ips/checkout before it
 * contacts NBS, so abuse cannot hammer the NBS services. Server only.
 */
export const consumeCheckoutQuota = mutation({
  args: {
    secret: v.string(),
    clientKey: v.optional(v.string()),
    contact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const checks: Array<[string, { max: number; windowMs: number }]> = [
      ["order:global", RATE_LIMITS.orderGlobal],
    ];
    if (args.clientKey) checks.push([`order:ip:${args.clientKey.slice(0, 64)}`, RATE_LIMITS.orderIp]);
    if (args.contact?.trim()) {
      const hashed = (await sha256Hex(args.contact.trim().toLowerCase())).slice(0, 32);
      checks.push([`order:contact:${hashed}`, RATE_LIMITS.orderContact]);
    }
    for (const [key, limit] of checks) {
      const result = await consumeRateLimit(ctx, key, limit);
      if (!result.ok) {
        return { ok: false as const, error: "RATE_LIMITED" as const, retryAfterMs: result.retryAfterMs };
      }
    }
    return { ok: true as const };
  },
});

const PHONE_PATTERN = /^[0-9+()\-\s/]{6,40}$/;

const orderStatusV = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("confirmed"),
  v.literal("paid"),
  v.literal("cancelled")
);
const paymentStatusV = v.union(v.literal("awaiting_payment"), v.literal("paid"), v.literal("failed"));

/**
 * Records an IPS QR order. Only the Next.js checkout route may call this
 * (ABLUX_SERVER_SECRET). Prices are recomputed from the database and the RSD
 * amount must match the one encoded in the IPS payload.
 */
export const createIpsOrder = mutation({
  args: {
    secret: v.string(),
    items: v.array(cartItemInput),
    customer: v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      note: v.optional(v.string()),
    }),
    website: v.optional(v.string()),
    ips: v.object({
      reference: v.string(),
      payload: v.string(),
      amountRsdCents: v.number(),
      exchangeRate: v.optional(v.number()),
      exchangeRateDate: v.optional(v.string()),
      payeeAccount: v.string(),
      payeeName: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    // Business-rule failures are returned, not thrown.
    if (args.website?.trim()) return { ok: false as const, error: "REJECTED" as const };

    const name = args.customer.name.trim().replace(/\s+/g, " ");
    const email = normalizeEmail(args.customer.email ?? "");
    const phone = (args.customer.phone ?? "").trim();
    const note = (args.customer.note ?? "").trim();
    if (
      name.length < 2 ||
      name.length > 120 ||
      (email && !isValidEmail(email)) ||
      (phone && !PHONE_PATTERN.test(phone)) ||
      (!email && !phone) ||
      note.length > 1000
    ) {
      return { ok: false as const, error: "INVALID_CUSTOMER" as const };
    }

    const priced = await priceCartItems(ctx, args.items);
    if (!priced.ok) {
      return { ok: false as const, error: priced.error, invalidIds: priced.invalidIds };
    }

    const hasEur = priced.lines.some((line) => line.currency === "EUR");
    if (hasEur && !(args.ips.exchangeRate && args.ips.exchangeRate >= 90 && args.ips.exchangeRate <= 150)) {
      return { ok: false as const, error: "INVALID_RATE" as const };
    }

    let totals;
    try {
      totals = calculateIpsTotals(priced.lines, hasEur ? args.ips.exchangeRate : undefined);
    } catch {
      return { ok: false as const, error: "ITEM_UNAVAILABLE" as const, invalidIds: [] };
    }
    if (totals.amountRsdCents !== args.ips.amountRsdCents) {
      return { ok: false as const, error: "AMOUNT_MISMATCH" as const };
    }

    const userId = await getAuthUserId(ctx);
    const orderId = await ctx.db.insert("orders", {
      items: priced.lines.map((line) => ({
        id: line.id,
        type: line.type,
        title: line.title,
        price: line.price,
        currency: line.currency,
        quantity: line.quantity,
        meta: line.meta,
      })),
      totalAmount: totals.amountRsd,
      currency: "RSD",
      customerName: name,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      note: note || undefined,
      paymentMethod: "nbs_ips_qr",
      paymentStatus: "awaiting_payment",
      ipsReference: args.ips.reference,
      ipsPayload: args.ips.payload,
      ipsAmountRsd: totals.amountRsd,
      ipsExchangeRate: hasEur ? args.ips.exchangeRate : undefined,
      ipsExchangeRateDate: hasEur ? args.ips.exchangeRateDate : undefined,
      ipsPayeeAccount: args.ips.payeeAccount,
      ipsPayeeName: args.ips.payeeName,
      status: "pending",
      userId: userId ?? undefined,
      createdAt: Date.now(),
    });

    // TODO (email provider): notify the agency about the new order.
    return { ok: true as const, orderId };
  },
});

export const list = query({
  args: {
    status: v.optional(orderStatusV),
  },
  // Orders contain customer PII: staff only.
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    if (args.status) {
      return ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(500);
    }
    return ctx.db
      .query("orders")
      .withIndex("by_created")
      .order("desc")
      .take(500);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: orderStatusV,
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    await ctx.db.patch(args.id, { status: args.status });
    await audit(ctx, viewer, {
      action: "orders.updateStatus",
      targetTable: "orders",
      targetId: args.id,
      summary: `${order.status} → ${args.status}`,
    });
    return args.id;
  },
});

// ---------------------------------------------------------------- inbox (editor, step 13)

async function orderOrThrow(ctx: QueryCtx | MutationCtx, rawId: string) {
  const id = ctx.db.normalizeId("orders", rawId);
  const order = id ? await ctx.db.get(id) : null;
  if (!order) throw new ConvexError("NOT_FOUND");
  return order;
}

/** One order for the inbox drawer (without the raw IPS payload). */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const order = await orderOrThrow(ctx, args.id);
    const notes = order.notes ?? [];
    const names = await namesById(ctx, [order.assigneeId, ...notes.map((note) => note.by)]);
    const { ipsPayload: _payload, ...fields } = order;
    void _payload;
    return {
      ...fields,
      assigneeName: order.assigneeId ? names.get(order.assigneeId) ?? null : null,
      notes: notes.map((note) => ({ ...note, byName: names.get(note.by) ?? "" })),
    };
  },
});

/** Inbox changes: status, payment (IPS is confirmed by hand from the bank statement), assignee, note. */
export const update = mutation({
  args: {
    id: v.string(),
    status: v.optional(orderStatusV),
    paymentStatus: v.optional(paymentStatusV),
    assigneeId: v.optional(v.union(v.string(), v.null())),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const order = await orderOrThrow(ctx, args.id);
    const patch = await inboxPatch(ctx, viewer.userId, order, args);
    const payment = args.paymentStatus !== undefined && args.paymentStatus !== order.paymentStatus;
    await ctx.db.patch(order._id, {
      ...patch.fields,
      ...(args.status ? { status: args.status } : {}),
      ...(payment ? { paymentStatus: args.paymentStatus } : {}),
    });
    const parts = [patch.summary === "bez izmena" ? "" : patch.summary, payment ? `uplata ${order.paymentStatus ?? "-"} → ${args.paymentStatus}` : ""].filter(Boolean);
    await audit(ctx, viewer, { action: "orders.update", targetTable: "orders", targetId: order._id, summary: parts.join(", ") || "bez izmena" });
    return { ok: true };
  },
});
