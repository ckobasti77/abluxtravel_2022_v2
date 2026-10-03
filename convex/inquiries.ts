// Inquiries ("Pošalji upit") from offer pages. Only the Next.js route
// app/api/inquiries may call `create` (ABLUX_SERVER_SECRET). Stored for the
// admin (inbox in /admin/upiti, step 13); no e-mail is sent yet.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { isValidEmail, normalizeEmail, normalizeName, sha256Hex } from "./lib/passwords";
import { inboxPatch } from "./lib/inbox";
import { namesById } from "./lib/profile";
import { consumeRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { requireServerSecret } from "./lib/serverSecret";

const PHONE_PATTERN = /^[0-9+()\-\s/]{6,40}$/;

const clip = (value: string | undefined, max: number) => {
  const text = value?.trim();
  return text ? text.slice(0, max) : undefined;
};

export const create = mutation({
  args: {
    secret: v.string(),
    cardSlug: v.optional(v.string()),
    subject: v.optional(v.string()),
    fullName: v.string(),
    phone: v.string(),
    email: v.string(),
    travelers: v.optional(v.number()),
    preferredDeparture: v.optional(v.string()),
    message: v.optional(v.string()),
    consent: v.boolean(),
    website: v.optional(v.string()),
    ipHash: v.optional(v.string()),
    locale: v.union(v.literal("sr"), v.literal("en")),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    // Honeypot: pretend success, store nothing.
    if (args.website?.trim()) return { ok: true as const };

    const email = normalizeEmail(args.email);
    const checks: Array<[string, { max: number; windowMs: number }]> = [["inquiry:global", RATE_LIMITS.inquiryGlobal]];
    if (args.ipHash) checks.push([`inquiry:ip:${args.ipHash.slice(0, 64)}`, RATE_LIMITS.inquiryIp]);
    if (email) checks.push([`inquiry:email:${(await sha256Hex(email)).slice(0, 32)}`, RATE_LIMITS.inquiryEmail]);
    for (const [key, limit] of checks) {
      const result = await consumeRateLimit(ctx, key, limit);
      // Never throw after a rate-limit write (the increment would roll back).
      if (!result.ok) return { ok: false as const, error: "RATE_LIMITED" as const };
    }

    const fullName = normalizeName(args.fullName);
    const phone = args.phone.trim();
    const message = clip(args.message, 2000);
    const travelers = args.travelers;
    const valid =
      args.consent === true &&
      fullName.length >= 2 &&
      fullName.length <= 120 &&
      PHONE_PATTERN.test(phone) &&
      isValidEmail(email) &&
      (args.message === undefined || args.message.trim().length <= 2000) &&
      (travelers === undefined || (Number.isInteger(travelers) && travelers >= 1 && travelers <= 20));
    if (!valid) return { ok: false as const, error: "INVALID" as const };

    const card = args.cardSlug
      ? await ctx.db
          .query("offerCards")
          .withIndex("by_slug", (q) => q.eq("slug", args.cardSlug!.slice(0, 120)))
          .unique()
      : null;
    const usableCard = card && !card.hidden && card.published ? card : null;
    const detail = usableCard
      ? await ctx.db
          .query("offerDetails")
          .withIndex("by_card", (q) => q.eq("cardId", usableCard._id))
          .unique()
      : null;

    const now = Date.now();
    await ctx.db.insert("inquiries", {
      cardId: usableCard?._id,
      offer: usableCard
        ? {
            title: usableCard.title,
            slug: usableCard.slug,
            partnerSlug: usableCard.partnerSlug,
            organizerName: usableCard.organizerName,
            sourceUrl: detail?.sourceUrl || undefined,
            priceFrom: usableCard.priceFrom,
            priceBasis: usableCard.priceBasis,
          }
        : undefined,
      fullName,
      phone,
      email,
      subject: clip(args.subject, 160),
      travelers,
      preferredDeparture: clip(args.preferredDeparture, 120),
      message,
      consentAt: now,
      locale: args.locale,
      status: "new",
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

// ---------------------------------------------------------------- admin (editor)
// Inquiries hold personal data: staff only. Audit entries carry no personal data.

const inquiryStatusV = v.union(v.literal("new"), v.literal("in_progress"), v.literal("confirmed"), v.literal("cancelled"));

async function inquiryOrThrow(ctx: QueryCtx | MutationCtx, rawId: string) {
  const id = ctx.db.normalizeId("inquiries", rawId);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) throw new ConvexError("NOT_FOUND");
  return row;
}

export const adminList = query({
  args: { status: v.optional(inquiryStatusV), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const page = args.status
      ? await ctx.db
          .query("inquiries")
          .withIndex("by_status_created", (q) => q.eq("status", args.status!))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db.query("inquiries").withIndex("by_created").order("desc").paginate(args.paginationOpts);
    return page;
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const row = await inquiryOrThrow(ctx, args.id);
    const names = await namesById(ctx, [row.assigneeId, ...row.notes.map((note) => note.by)]);
    return {
      ...row,
      assigneeName: row.assigneeId ? names.get(row.assigneeId) ?? null : null,
      notes: row.notes.map((note) => ({ ...note, byName: names.get(note.by) ?? "" })),
    };
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    status: v.optional(inquiryStatusV),
    // null clears the assignee.
    assigneeId: v.optional(v.union(v.string(), v.null())),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const row = await inquiryOrThrow(ctx, args.id);
    const patch = await inboxPatch(ctx, viewer.userId, row, args);
    await ctx.db.patch(row._id, { ...patch.fields, ...(args.status ? { status: args.status } : {}) });
    await audit(ctx, viewer, { action: "inquiries.update", targetTable: "inquiries", targetId: row._id, summary: patch.summary });
    return { ok: true };
  },
});
