// Admin API for the partner registry (`sources`): list, detail with recent
// runs, settings (editor) and status (owner). Business fields (commission,
// contacts, notes) are staff-only; public partner data comes in step 10.
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { TRAVEL_TYPE_SLUGS } from "../lib/search/travel-types";
import { getPartnerConfig } from "../scraper/registry";

async function partnerOrThrow(ctx: QueryCtx, slug: string): Promise<Doc<"sources">> {
  const partner = await ctx.db
    .query("sources")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (!partner || partner.kind !== "partner") throw new ConvexError("NOT_FOUND");
  return partner;
}

function lastRun(partner: Doc<"sources">) {
  return partner.lastRunAt
    ? {
        at: partner.lastRunAt,
        status: partner.lastRunStatus,
        message: partner.lastRunMessage,
        durationMs: partner.lastRunDurationMs,
        requests: partner.lastRunRequests,
      }
    : null;
}

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const partners = (await ctx.db.query("sources").collect())
      .filter((source) => source.kind === "partner")
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
    return partners.map((partner) => ({
      slug: partner.slug,
      number: partner.number,
      name: partner.name,
      website: partner.website,
      logoPath: partner.logoPath,
      adapter: partner.adapter,
      status: partner.status,
      isEnabled: partner.isEnabled,
      autoPublish: partner.autoPublish ?? true,
      blockedReason: partner.blockedReason,
      liveFetchAllowed: Boolean(getPartnerConfig(partner.slug)?.liveFetchAllowed),
      counts: partner.counts ?? { listed: 0, active: 0, public: 0, total: 0 },
      lastSyncAt: partner.lastSyncAt,
      lastRun: lastRun(partner),
    }));
  },
});

export const adminGet = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const partner = await partnerOrThrow(ctx, args.slug);
    const runs = await ctx.db
      .query("syncRunItems")
      .withIndex("by_partner_started", (q) => q.eq("partnerSlug", partner.slug))
      .order("desc")
      .take(10);
    const { robotsCache: _robots, ...fields } = partner;
    void _robots;
    return {
      partner: { ...fields, liveFetchAllowed: Boolean(getPartnerConfig(partner.slug)?.liveFetchAllowed), lastRun: lastRun(partner) },
      runs: runs.map((item) => ({
        _id: item._id,
        runId: item.runId,
        status: item.status,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        requestsUsed: item.requestsUsed,
        discovered: item.discovered,
        created: item.created,
        updated: item.updated,
        removed: item.removed,
        expired: item.expired,
        parseErrors: item.parseErrors,
        message: item.message,
        log: item.log,
      })),
    };
  },
});

const optionalText = v.optional(v.union(v.string(), v.null()));

export const updateSettings = mutation({
  args: {
    slug: v.string(),
    patch: v.object({
      isEnabled: v.optional(v.boolean()),
      autoPublish: v.optional(v.boolean()),
      categoryMap: v.optional(v.array(v.object({ match: v.string(), travelType: v.string() }))),
      commissionPercent: v.optional(v.union(v.number(), v.null())),
      organizerName: optionalText,
      organizerLicense: optionalText,
      termsUrl: optionalText,
      contactName: optionalText,
      contactEmail: optionalText,
      contactPhone: optionalText,
      notes: optionalText,
      dailyRequestCap: v.optional(v.union(v.number(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const partner = await partnerOrThrow(ctx, args.slug);
    const input = args.patch;
    const text = (value: string | null | undefined, max: number) =>
      value === undefined ? undefined : value === null || !value.trim() ? null : value.trim().slice(0, max);
    const patch: Partial<Doc<"sources">> = {};
    const clear: (keyof Doc<"sources">)[] = [];
    const set = <K extends keyof Doc<"sources">>(key: K, value: Doc<"sources">[K] | null | undefined) => {
      if (value === undefined) return;
      if (value === null) clear.push(key);
      else patch[key] = value;
    };

    set("isEnabled", input.isEnabled);
    set("autoPublish", input.autoPublish);
    if (input.categoryMap) {
      if (input.categoryMap.length > 50 || input.categoryMap.some((entry) => !entry.match.trim() || !(TRAVEL_TYPE_SLUGS as string[]).includes(entry.travelType))) {
        throw new ConvexError("INVALID_CATEGORY_MAP");
      }
      set("categoryMap", input.categoryMap.map((entry) => ({ match: entry.match.trim().slice(0, 80), travelType: entry.travelType })));
    }
    if (input.commissionPercent !== undefined && input.commissionPercent !== null && !(input.commissionPercent >= 0 && input.commissionPercent <= 100)) {
      throw new ConvexError("INVALID_COMMISSION");
    }
    set("commissionPercent", input.commissionPercent);
    set("organizerName", text(input.organizerName, 120));
    set("organizerLicense", text(input.organizerLicense, 120));
    const termsUrl = text(input.termsUrl, 300);
    if (termsUrl && !/^https?:\/\/\S+$/i.test(termsUrl)) throw new ConvexError("INVALID_URL");
    set("termsUrl", termsUrl);
    set("contactName", text(input.contactName, 120));
    const email = text(input.contactEmail, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("INVALID_EMAIL");
    set("contactEmail", email);
    set("contactPhone", text(input.contactPhone, 40));
    set("notes", text(input.notes, 2000));
    if (input.dailyRequestCap !== undefined && input.dailyRequestCap !== null && !(Number.isInteger(input.dailyRequestCap) && input.dailyRequestCap >= 0 && input.dailyRequestCap <= 5000)) {
      throw new ConvexError("INVALID_CAP");
    }
    set("dailyRequestCap", input.dailyRequestCap);

    const unset = Object.fromEntries(clear.map((key) => [key, undefined]));
    await ctx.db.patch(partner._id, { ...patch, ...unset, updatedAt: Date.now() });
    if (input.isEnabled !== undefined && input.isEnabled !== partner.isEnabled) {
      await ctx.scheduler.runAfter(0, internal.sync.ingest.applyPartnerVisibility, { partnerSlug: partner.slug });
    }
    // Only field names go to the audit log (contacts are business data).
    const changed = [...Object.keys(patch), ...clear].join(", ");
    await audit(ctx, viewer, { action: "partner.settings", targetTable: "sources", targetId: partner._id, summary: `${partner.slug}: ${changed || "bez izmena"}` });
    return { ok: true };
  },
});

export const setStatus = mutation({
  args: {
    slug: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("blocked"), v.literal("manual")),
    blockedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "owner");
    const partner = await partnerOrThrow(ctx, args.slug);
    const config = getPartnerConfig(partner.slug);
    if (args.status === "active" && !config?.liveFetchAllowed) throw new ConvexError("LIVE_FETCH_NOT_ALLOWED");
    if (args.status === "manual" && config?.family !== "manual") throw new ConvexError("NOT_MANUAL_PARTNER");
    if (args.status !== "manual" && config?.family === "manual") throw new ConvexError("MANUAL_PARTNER");
    const blockedReason = args.status === "blocked" ? (args.blockedReason?.trim().slice(0, 300) || partner.blockedReason) : partner.blockedReason;
    await ctx.db.patch(partner._id, { status: args.status, blockedReason, updatedAt: Date.now() });
    await audit(ctx, viewer, { action: "partner.status", targetTable: "sources", targetId: partner._id, summary: `${partner.slug}: ${partner.status} → ${args.status}` });
    return { ok: true };
  },
});
