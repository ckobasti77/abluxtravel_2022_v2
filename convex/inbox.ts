// "Upiti i rezervacije" (/admin/upiti, step 13): inquiries and IPS orders in one
// inbox with a shared status (novo, u obradi, potvrđeno, otkazano). An agency
// gets tens of requests a week, so the newest RECENT of each kind are merged in
// memory; older ones stay reachable through inquiries.adminList / orders.list.
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireRole } from "./lib/access";
import { namesById } from "./lib/profile";

const RECENT = 300;

export type InboxStatus = "new" | "in_progress" | "confirmed" | "cancelled";

const inboxStatusV = v.union(v.literal("new"), v.literal("in_progress"), v.literal("confirmed"), v.literal("cancelled"));

/** Order status → inbox status ("paid" is a confirmed order with a paid IPS slip). */
export function orderInboxStatus(status: Doc<"orders">["status"]): InboxStatus {
  if (status === "pending") return "new";
  if (status === "in_progress") return "in_progress";
  if (status === "cancelled") return "cancelled";
  return "confirmed";
}

function orderTitle(order: Doc<"orders">) {
  const [first, ...rest] = order.items;
  if (!first) return "Porudžbina";
  return rest.length ? `${first.title} + još ${rest.length}` : first.title;
}

export const list = query({
  args: {
    kind: v.optional(v.union(v.literal("inquiry"), v.literal("order"))),
    status: v.optional(inboxStatusV),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const inquiries = await ctx.db.query("inquiries").withIndex("by_created").order("desc").take(RECENT);
    const orders = await ctx.db.query("orders").withIndex("by_created").order("desc").take(RECENT);

    const rows = [
      ...inquiries.map((row) => ({
        kind: "inquiry" as const,
        id: row._id as string,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        status: row.status as InboxStatus,
        rawStatus: row.status as string,
        name: row.fullName,
        email: row.email,
        phone: row.phone,
        title: row.offer?.title ?? row.subject ?? "Opšti upit",
        organizer: row.offer?.organizerName ?? null,
        travelers: row.travelers ?? null,
        preferredDeparture: row.preferredDeparture ?? null,
        amount: null as number | null,
        currency: null as string | null,
        paymentStatus: null as Doc<"orders">["paymentStatus"] | null,
        assigneeId: row.assigneeId ?? null,
        noteCount: row.notes.length,
      })),
      ...orders.map((row) => ({
        kind: "order" as const,
        id: row._id as string,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? row.createdAt,
        status: orderInboxStatus(row.status),
        rawStatus: row.status as string,
        name: row.customerName ?? "",
        email: row.customerEmail ?? "",
        phone: row.customerPhone ?? "",
        title: orderTitle(row),
        organizer: null,
        travelers: row.items.reduce((sum, item) => sum + item.quantity, 0),
        preferredDeparture: null,
        amount: row.ipsAmountRsd ?? row.totalAmount,
        currency: row.currency,
        paymentStatus: row.paymentStatus ?? null,
        assigneeId: row.assigneeId ?? null,
        noteCount: row.notes?.length ?? 0,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt);

    const search = args.q?.trim().toLocaleLowerCase("sr").slice(0, 80);
    const scoped = rows.filter(
      (row) =>
        (!args.kind || row.kind === args.kind) &&
        (!search || [row.name, row.email, row.phone, row.title].some((value) => value.toLocaleLowerCase("sr").includes(search)))
    );
    const counts = { all: scoped.length, new: 0, in_progress: 0, confirmed: 0, cancelled: 0 };
    for (const row of scoped) counts[row.status] += 1;
    const filtered = args.status ? scoped.filter((row) => row.status === args.status) : scoped;

    const names = await namesById(ctx, filtered.map((row) => row.assigneeId ?? undefined));
    return {
      rows: filtered.map((row) => ({ ...row, assigneeName: row.assigneeId ? names.get(row.assigneeId) ?? null : null })),
      counts,
      truncated: inquiries.length === RECENT || orders.length === RECENT,
    };
  },
});

/** Sidebar badge: requests nobody has opened yet (new inquiries + pending orders), capped at 99. */
export const newCount = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const inquiries = await ctx.db
      .query("inquiries")
      .withIndex("by_status_created", (q) => q.eq("status", "new"))
      .take(100);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    return Math.min(inquiries.length + orders.length, 99);
  },
});
