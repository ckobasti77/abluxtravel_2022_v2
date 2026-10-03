// Admin API for Partner Sync (editor): status for the "Pokreni sada" button,
// manual run with the cycle cooldown (D7), cancel, run history, change feed.
// Step 13 builds the UI on top of these.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/access";
import { audit } from "./lib/audit";
import { changeTypeV } from "./lib/syncValidators";
import { activeRunSummary, getSyncState, isRunActive, startRunImpl } from "./sync/orchestrator";
import { manualRunState } from "../scraper/core/cycle";
import { cycleKeyOf, nextSlotAt } from "../scraper/core/time";

const DAY_MS = 24 * 60 * 60 * 1000;

async function readState(ctx: QueryCtx) {
  return ctx.db
    .query("syncState")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
}

function runRow(run: Doc<"syncRuns">) {
  return {
    _id: run._id,
    trigger: run.trigger,
    status: run.status,
    cycleKey: run.cycleKey,
    partnerSlugs: run.partnerSlugs,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    totals: run.totals,
    cancelRequested: Boolean(run.cancelRequested),
  };
}

export const getSyncStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const now = Date.now();
    const state = await readState(ctx);
    const running = await isRunActive(ctx, state?.activeRunId, now);
    const manual = manualRunState({ now, running, lastManualCycleKey: state?.lastManualCycleKey });
    const lastManualBy = state?.lastManualBy ? await ctx.db.get(state.lastManualBy) : null;
    const lastRun = await ctx.db.query("syncRuns").withIndex("by_started").order("desc").first();
    return {
      cronEnabled: process.env.SYNC_CRON_ENABLED === "true",
      serverNow: now,
      cycleKey: cycleKeyOf(now),
      nextAutoRunAt: nextSlotAt(now),
      lastAutoRunAt: state?.lastAutoRunAt ?? null,
      activeRun: running && state?.activeRunId ? await activeRunSummary(ctx, state.activeRunId) : null,
      lastRun: lastRun ? runRow(lastRun) : null,
      manual: {
        ...manual,
        lastManualRunAt: state?.lastManualRunAt ?? null,
        lastManualByName: lastManualBy?.name ?? lastManualBy?.email ?? null,
      },
    };
  },
});

export const requestManualRun = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireRole(ctx, "editor");
    const now = Date.now();
    const state = await getSyncState(ctx);
    const manual = manualRunState({ now, running: await isRunActive(ctx, state.activeRunId, now), lastManualCycleKey: state.lastManualCycleKey });
    if (manual.reason === "running") throw new ConvexError("SYNC_RUNNING");
    if (manual.reason === "used_this_cycle") throw new ConvexError("SYNC_COOLDOWN");
    const runId = await startRunImpl(ctx, { trigger: "manual", requestedBy: viewer.userId });
    await ctx.db.patch(state._id, { lastManualCycleKey: cycleKeyOf(now), lastManualRunAt: now, lastManualBy: viewer.userId, updatedAt: now });
    await audit(ctx, viewer, { action: "sync.manualRun", targetTable: "syncRuns", targetId: runId });
    return { runId, lockedUntil: nextSlotAt(now) };
  },
});

export const cancelRun = mutation({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, "editor");
    const runId = ctx.db.normalizeId("syncRuns", args.runId);
    const run = runId ? await ctx.db.get(runId) : null;
    if (!run) throw new ConvexError("NOT_FOUND");
    if (run.status !== "running") return { ok: false };
    await ctx.db.patch(run._id, { cancelRequested: true });
    await audit(ctx, viewer, { action: "sync.cancel", targetTable: "syncRuns", targetId: run._id });
    return { ok: true };
  },
});

export const listRuns = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const page = await ctx.db.query("syncRuns").withIndex("by_started").order("desc").paginate(args.paginationOpts);
    return { ...page, page: page.page.map(runRow) };
  },
});

export const getRun = query({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const runId = ctx.db.normalizeId("syncRuns", args.runId);
    const run = runId ? await ctx.db.get(runId) : null;
    if (!run) throw new ConvexError("NOT_FOUND");
    const items = await ctx.db
      .query("syncRunItems")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .collect();
    return {
      run: runRow(run),
      items: items.map((item) => ({
        _id: item._id,
        partnerSlug: item.partnerSlug,
        status: item.status,
        phase: item.phase,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        requestBudget: item.requestBudget,
        requestsUsed: item.requestsUsed,
        discovered: item.discovered,
        processed: item.processed,
        created: item.created,
        updated: item.updated,
        unchanged: item.unchanged,
        removed: item.removed,
        expired: item.expired,
        parseErrors: item.parseErrors,
        message: item.message,
        log: item.log,
      })),
    };
  },
});

export const listChanges = query({
  args: {
    partnerSlug: v.optional(v.string()),
    type: v.optional(changeTypeV),
    since: v.optional(v.number()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "editor");
    const since = args.since ?? 0;
    const page = args.partnerSlug
      ? await ctx.db
          .query("offerChanges")
          .withIndex("by_partner_at", (q) => q.eq("partnerSlug", args.partnerSlug!).gte("at", since))
          .order("desc")
          .paginate(args.paginationOpts)
      : args.type
        ? await ctx.db
            .query("offerChanges")
            .withIndex("by_type_at", (q) => q.eq("type", args.type!).gte("at", since))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("offerChanges")
            .withIndex("by_at", (q) => q.gte("at", since))
            .order("desc")
            .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page
        .filter((change) => !args.type || change.type === args.type)
        .map((change) => ({
          _id: change._id,
          cardId: change.cardId,
          partnerSlug: change.partnerSlug,
          type: change.type,
          title: change.title,
          slug: change.slug,
          oldPrice: change.oldPrice,
          newPrice: change.newPrice,
          basis: change.basis,
          oldNextDeparture: change.oldNextDeparture,
          newNextDeparture: change.newNextDeparture,
          at: change.at,
        })),
    };
  },
});

/** Dashboard numbers: changes in the last 24 h, partners by status, next automatic run. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "editor");
    const now = Date.now();
    const changes = await ctx.db
      .query("offerChanges")
      .withIndex("by_at", (q) => q.gte("at", now - DAY_MS))
      .take(5000);
    const count = (type: Doc<"offerChanges">["type"]) => changes.filter((change) => change.type === type).length;
    const partners = (await ctx.db.query("sources").collect()).filter((source) => source.kind === "partner");
    const byStatus: Record<string, number> = {};
    for (const partner of partners) byStatus[partner.status] = (byStatus[partner.status] ?? 0) + 1;
    const lastRun = await ctx.db.query("syncRuns").withIndex("by_started").order("desc").first();
    return {
      last24h: {
        new: count("new"),
        priceDown: count("price_down"),
        priceUp: count("price_up"),
        dates: count("dates"),
        removed: count("removed"),
        expired: count("expired"),
        returned: count("returned"),
        truncated: changes.length === 5000,
      },
      partnersByStatus: byStatus,
      offers: partners.reduce(
        (sum, partner) => ({ public: sum.public + (partner.counts?.public ?? 0), active: sum.active + (partner.counts?.active ?? 0) }),
        { public: 0, active: 0 }
      ),
      nextAutoRunAt: nextSlotAt(now),
      lastRun: lastRun ? runRow(lastRun) : null,
    };
  },
});
