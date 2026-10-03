// Partner Sync orchestration (internal): start a run, per-item context for the
// Node worker, discovery/queue bookkeeping, run status.
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { appendLog, isTerminal, logEntryV, queueItemV, settleRun } from "./ingest";
import { getPartnerConfig } from "../../scraper/registry";
import { CRON_RETRY_MS, cronDecision } from "../../scraper/core/cycle";
import { SKIP_MESSAGES, STALE_MESSAGE } from "../../scraper/core/messages";
import { cycleKeyOf } from "../../scraper/core/time";

const STALE_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const STAGGER_MS = 3000;

export const triggerV = v.union(v.literal("cron"), v.literal("manual"), v.literal("cli"), v.literal("relay"));

export async function getSyncState(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("syncState")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("syncState", { key: "global", updatedAt: Date.now() });
  return (await ctx.db.get(id))!;
}

/** A run counts as active unless it finished or every unfinished item is silent for 15 minutes. */
export async function isRunActive(ctx: Pick<QueryCtx, "db">, runId: Id<"syncRuns"> | undefined, now: number) {
  if (!runId) return false;
  const run = await ctx.db.get(runId);
  if (!run || run.status !== "running") return false;
  const items = await ctx.db
    .query("syncRunItems")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .collect();
  const open = items.filter((item) => !isTerminal(item.status));
  if (open.length === 0) return false;
  return open.some((item) => now - item.heartbeatAt < STALE_MS);
}

/** Configured daily cap: env SYNC_DAILY_REQUEST_CAP overrides partner/registry caps (D6). */
export function dailyCap(partner: Doc<"sources">, registryCap: number): number {
  const env = process.env.SYNC_DAILY_REQUEST_CAP;
  const fromEnv = env !== undefined && env !== "" ? Number(env) : NaN;
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return partner.dailyRequestCap ?? registryCap;
}

/** Requests in the rolling 24 h window: run items (pages, robots, retries) + images copied to storage. */
export async function usedLast24h(ctx: Pick<QueryCtx, "db">, partnerSlug: string, now: number) {
  const items = await ctx.db
    .query("syncRunItems")
    .withIndex("by_partner_started", (q) => q.eq("partnerSlug", partnerSlug).gte("startedAt", now - DAY_MS))
    .collect();
  const images = await ctx.db
    .query("partnerImages")
    .withIndex("by_partner_fetched", (q) => q.eq("partnerSlug", partnerSlug).gte("fetchedAt", now - DAY_MS))
    .collect();
  return items.reduce((sum, item) => sum + item.requestsUsed, 0) + images.length;
}

export type StartRunArgs = {
  trigger: Doc<"syncRuns">["trigger"];
  partners?: string[];
  maxRequestsPerPartner?: number;
  requestedBy?: Id<"users">;
  forceRefetch?: boolean;
};

const emptyItem = {
  requestsUsed: 0,
  discovered: 0,
  queued: 0,
  processed: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  removed: 0,
  expired: 0,
  parseErrors: 0,
  discoveryComplete: false,
  queueComplete: false,
  log: [],
};

/** Shared by CLI startRun, the cron tick and the manual run (step 09). */
export async function startRunImpl(ctx: MutationCtx, args: StartRunArgs): Promise<Id<"syncRuns">> {
  const now = Date.now();
  const state = await getSyncState(ctx);
  if (await isRunActive(ctx, state.activeRunId, now)) throw new ConvexError("SYNC_RUNNING");

  const sources = await ctx.db.query("sources").collect();
  const partners = sources
    .filter((source) => source.kind === "partner")
    .filter((source) => !args.partners || args.partners.includes(source.slug))
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  const runId = await ctx.db.insert("syncRuns", {
    trigger: args.trigger,
    requestedBy: args.requestedBy,
    cycleKey: cycleKeyOf(now),
    status: "running",
    partnerSlugs: partners.map((partner) => partner.slug),
    maxRequestsPerPartner: args.maxRequestsPerPartner,
    forceRefetch: args.forceRefetch || undefined,
    startedAt: now,
  });

  let scheduled = 0;
  for (const partner of partners) {
    const config = getPartnerConfig(partner.slug);
    let skip: string | undefined;
    if (!partner.isEnabled) skip = SKIP_MESSAGES.disabled;
    else if (partner.status === "paused") skip = SKIP_MESSAGES.paused;
    else if (partner.status === "blocked") skip = SKIP_MESSAGES.blocked;
    else if (partner.status === "manual") skip = SKIP_MESSAGES.manual;
    else if (partner.status !== "active") skip = SKIP_MESSAGES.paused;
    else if (!config || !config.liveFetchAllowed) skip = SKIP_MESSAGES.blocked;

    const cap = config ? dailyCap(partner, config.dailyRequestCap) : 0;
    const used = await usedLast24h(ctx, partner.slug, now);
    const budget = Math.max(0, Math.min(args.maxRequestsPerPartner ?? Number.POSITIVE_INFINITY, cap - used));
    if (!skip && budget <= 0) skip = `${SKIP_MESSAGES.budget} (${used}/${cap} u poslednja 24 h)`;

    const itemId = await ctx.db.insert("syncRunItems", {
      runId,
      partnerSlug: partner.slug,
      status: skip ? "skipped" : "queued",
      phase: skip ? "done" : "discover",
      startedAt: now,
      finishedAt: skip ? now : undefined,
      heartbeatAt: now,
      requestBudget: skip ? 0 : budget,
      message: skip,
      ...emptyItem,
      log: skip ? [{ at: now, level: "info" as const, text: skip }] : [],
    });
    if (!skip) {
      await ctx.scheduler.runAfter(scheduled * STAGGER_MS, internal.sync.worker.runItem, { runItemId: itemId });
      scheduled += 1;
    }
  }

  await ctx.db.patch(state._id, { activeRunId: runId, updatedAt: now });
  if (scheduled > 0) await ctx.scheduler.runAfter(STALE_MS, internal.sync.orchestrator.watchdog, { runId });
  if (scheduled === 0) {
    await ctx.db.patch(runId, {
      status: "ok",
      finishedAt: now,
      totals: { ok: 0, partial: 0, blocked: 0, failed: 0, skipped: partners.length, created: 0, updated: 0, removed: 0, expired: 0, requests: 0 },
    });
    await ctx.db.patch(state._id, { activeRunId: undefined, updatedAt: now });
  }
  return runId;
}

export const startRun = internalMutation({
  args: {
    trigger: triggerV,
    partners: v.optional(v.array(v.string())),
    maxRequestsPerPartner: v.optional(v.number()),
    forceRefetch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const runId = await startRunImpl(ctx, args);
    return { runId };
  },
});

export const getItemContext = internalQuery({
  args: { runItemId: v.id("syncRunItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.runItemId);
    if (!item) return null;
    const run = await ctx.db.get(item.runId);
    const partner = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", item.partnerSlug))
      .unique();
    if (!run || !partner) return null;
    return {
      item: {
        _id: item._id,
        runId: item.runId,
        partnerSlug: item.partnerSlug,
        status: item.status,
        phase: item.phase,
        requestBudget: item.requestBudget,
        requestsUsed: item.requestsUsed,
        clientState: item.clientState,
        queued: item.queued,
        processed: item.processed,
      },
      cancelRequested: Boolean(run.cancelRequested),
      forceRefetch: Boolean(run.forceRefetch),
      partner: {
        slug: partner.slug,
        name: partner.name,
        status: partner.status,
        isEnabled: partner.isEnabled,
        robotsCache: partner.robotsCache,
      },
    };
  },
});

export const saveDiscovery = internalMutation({
  args: {
    runItemId: v.id("syncRunItems"),
    first: v.boolean(),
    last: v.boolean(),
    listedIds: v.optional(v.array(v.string())),
    discoveryComplete: v.optional(v.boolean()),
    discovered: v.optional(v.number()),
    queue: v.array(queueItemV),
    requestsUsed: v.number(),
    clientState: v.optional(v.string()),
    robotsCache: v.optional(v.string()),
    log: v.array(logEntryV),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.runItemId);
    if (!item || isTerminal(item.status)) return { ignored: true };
    let seq = item.queued;
    for (const row of args.queue) {
      await ctx.db.insert("syncQueue", { runItemId: item._id, seq, ...row });
      seq += 1;
    }
    await ctx.db.patch(item._id, {
      status: "running",
      phase: args.last ? "fetch" : item.phase,
      queued: seq,
      requestsUsed: args.requestsUsed,
      clientState: args.clientState ?? item.clientState,
      heartbeatAt: Date.now(),
      ...(args.first
        ? {
            listedIds: (args.listedIds ?? []).slice(0, 8000),
            discoveryComplete: Boolean(args.discoveryComplete),
            discovered: args.discovered ?? 0,
          }
        : {}),
      log: appendLog(item.log, args.log),
    });
    if (args.robotsCache) {
      const partner = await ctx.db
        .query("sources")
        .withIndex("by_slug", (q) => q.eq("slug", item.partnerSlug))
        .unique();
      if (partner) await ctx.db.patch(partner._id, { robotsCache: args.robotsCache });
    }
    return { ignored: false, queued: seq };
  },
});

export const nextQueueBatch = internalQuery({
  args: { runItemId: v.id("syncRunItems"), limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("syncQueue")
      .withIndex("by_item_seq", (q) => q.eq("runItemId", args.runItemId))
      .take(Math.min(Math.max(args.limit, 1), 100));
    return rows.map((row) => ({
      _id: row._id,
      key: row.key,
      url: row.url,
      externalId: row.externalId,
      kind: row.kind,
      listSig: row.listSig,
      dataJson: row.dataJson,
    }));
  },
});

export const runStatus = internalQuery({
  args: { runId: v.optional(v.id("syncRuns")) },
  handler: async (ctx, args) => {
    const run = args.runId
      ? await ctx.db.get(args.runId)
      : await ctx.db.query("syncRuns").withIndex("by_started").order("desc").first();
    if (!run) return null;
    const items = await ctx.db
      .query("syncRunItems")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .collect();
    return {
      runId: run._id,
      trigger: run.trigger,
      status: run.status,
      startedAt: new Date(run.startedAt).toISOString(),
      finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : undefined,
      totals: run.totals,
      items: items.map((item) => ({
        partner: item.partnerSlug,
        status: item.status,
        phase: item.phase,
        requests: `${item.requestsUsed}/${item.requestBudget}`,
        discovered: item.discovered,
        queued: item.queued,
        processed: item.processed,
        created: item.created,
        updated: item.updated,
        unchanged: item.unchanged,
        removed: item.removed,
        expired: item.expired,
        parseErrors: item.parseErrors,
        message: item.message,
        lastLog: item.log.slice(-6).map((entry) => `${entry.level}: ${entry.text}`),
      })),
    };
  },
});

/**
 * Cron entry (04:00 and 05:00 UTC). Starts the daily run only when
 * SYNC_CRON_ENABLED === "true" and it is 06:00 in Belgrade, once per cycle (D7).
 */
export const cronTick = internalMutation({
  args: { retry: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const state = await getSyncState(ctx);
    const decision = cronDecision({
      now,
      enabled: process.env.SYNC_CRON_ENABLED === "true",
      running: await isRunActive(ctx, state.activeRunId, now),
      lastAutoCycleKey: state.lastAutoCycleKey,
      retry: args.retry,
    });
    if (decision === "retry_later") {
      await ctx.scheduler.runAfter(CRON_RETRY_MS, internal.sync.orchestrator.cronTick, { retry: (args.retry ?? 0) + 1 });
      return { decision };
    }
    if (decision === "give_up") {
      // The cycle is marked so the manual button and the next cron are not confused; the next 06:00 tries again.
      await ctx.db.patch(state._id, { lastAutoCycleKey: cycleKeyOf(now), updatedAt: now });
      return { decision };
    }
    if (decision !== "start") return { decision };
    const runId = await startRunImpl(ctx, { trigger: "cron" });
    await ctx.db.patch(state._id, { lastAutoCycleKey: cycleKeyOf(now), lastAutoRunAt: now, updatedAt: now });
    return { decision, runId };
  },
});

/** Every 15 minutes while a run is active: items silent for 15 minutes are closed as failed. */
export const watchdog = internalMutation({
  args: { runId: v.id("syncRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "running") return { done: true };
    const now = Date.now();
    const items = await ctx.db
      .query("syncRunItems")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .collect();
    const open = items.filter((item) => !isTerminal(item.status));
    let closed = 0;
    for (const item of open) {
      if (now - item.heartbeatAt < STALE_MS) continue;
      await ctx.scheduler.runAfter(0, internal.sync.ingest.finalizeItem, {
        runItemId: item._id,
        outcome: { status: "failed", errorClass: "stale", message: STALE_MESSAGE, queueComplete: false },
      });
      closed += 1;
    }
    if (open.length > closed) await ctx.scheduler.runAfter(STALE_MS, internal.sync.orchestrator.watchdog, { runId: run._id });
    return { done: false, closed };
  },
});

/** Lightweight progress for admin (no logs, no listed ids). */
export async function activeRunSummary(ctx: Pick<QueryCtx, "db">, runId: Id<"syncRuns">) {
  const run = await ctx.db.get(runId);
  if (!run) return null;
  const items = await ctx.db
    .query("syncRunItems")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .collect();
  return {
    id: run._id,
    trigger: run.trigger,
    status: run.status,
    startedAt: run.startedAt,
    cancelRequested: Boolean(run.cancelRequested),
    items: items.map((item) => ({
      partnerSlug: item.partnerSlug,
      status: item.status,
      phase: item.phase,
      processed: item.processed,
      queued: item.queued,
      requestsUsed: item.requestsUsed,
    })),
  };
}

/** Connectivity test bookkeeping: a "cli" run with one item per active partner, so the requests count (D6). */
export const connectivityStart = internalMutation({
  args: { partners: v.array(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const runId = await ctx.db.insert("syncRuns", {
      trigger: "cli",
      cycleKey: cycleKeyOf(now),
      status: "running",
      partnerSlugs: args.partners,
      maxRequestsPerPartner: 1,
      startedAt: now,
    });
    const items: { partnerSlug: string; runItemId: Id<"syncRunItems"> }[] = [];
    for (const partnerSlug of args.partners) {
      const runItemId = await ctx.db.insert("syncRunItems", {
        runId,
        partnerSlug,
        status: "running",
        phase: "discover",
        startedAt: now,
        heartbeatAt: now,
        requestBudget: 1,
        message: "Test dostupnosti (robots.txt).",
        ...emptyItem,
      });
      items.push({ partnerSlug, runItemId });
    }
    return { runId, items };
  },
});

export const connectivityResult = internalMutation({
  args: {
    runItemId: v.id("syncRunItems"),
    status: v.union(v.literal("ok"), v.literal("blocked"), v.literal("network"), v.literal("failed")),
    requestsUsed: v.number(),
    message: v.string(),
    robotsCache: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.runItemId);
    if (!item || isTerminal(item.status)) return;
    const now = Date.now();
    await ctx.db.patch(item._id, {
      status: args.status,
      phase: "done",
      finishedAt: now,
      heartbeatAt: now,
      requestsUsed: args.requestsUsed,
      message: args.message,
      log: appendLog(item.log, [{ at: now, level: args.status === "ok" ? "info" : "warn", text: args.message }]),
    });
    if (args.robotsCache) {
      const partner = await ctx.db
        .query("sources")
        .withIndex("by_slug", (q) => q.eq("slug", item.partnerSlug))
        .unique();
      if (partner) await ctx.db.patch(partner._id, { robotsCache: args.robotsCache });
    }
    await settleRun(ctx, item.runId);
  },
});

/** Requests left today for one partner (D6). */
export const remainingBudget = internalQuery({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args) => {
    const partner = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.partnerSlug))
      .unique();
    const config = getPartnerConfig(args.partnerSlug);
    if (!partner || !config) return 0;
    return Math.max(0, dailyCap(partner, config.dailyRequestCap) - (await usedLast24h(ctx, args.partnerSlug, Date.now())));
  },
});
