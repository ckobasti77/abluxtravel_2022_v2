// Relay (internal): the CLI on a whitelisted machine runs the same adapters
// and posts finalized offers through the protected HTTP actions in http.ts.
// Same ingest, same delisting rules, same request budget as the worker.
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { finalOfferV } from "../lib/syncValidators";
import type { FinalOffer } from "../../scraper/core/types";
import { cycleKeyOf } from "../../scraper/core/time";
import { getPartnerConfig } from "../../scraper/registry";
import { finalizeItemImpl, isTerminal, logEntryV, partnerBySlug, upsertBatchImpl } from "./ingest";
import { dailyCap, usedLast24h } from "./orchestrator";

const STALE_MS = 15 * 60 * 1000;
const MAX_BATCH = 25;

export const relayStart = internalMutation({
  args: { partnerSlug: v.string(), allowBlocked: v.optional(v.boolean()), maxRequests: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const partner = await partnerBySlug(ctx, args.partnerSlug);
    const config = getPartnerConfig(args.partnerSlug);
    if (!partner || partner.kind !== "partner" || !config) throw new ConvexError("UNKNOWN_PARTNER");
    if (partner.status === "manual" || config.family === "manual") throw new ConvexError("MANUAL_PARTNER");
    if (!partner.isEnabled) throw new ConvexError("PARTNER_DISABLED");
    if ((partner.status === "blocked" || !config.liveFetchAllowed) && !args.allowBlocked) throw new ConvexError("PARTNER_BLOCKED");
    const now = Date.now();
    const recent = await ctx.db
      .query("syncRunItems")
      .withIndex("by_partner_started", (q) => q.eq("partnerSlug", args.partnerSlug).gte("startedAt", now - 24 * 60 * 60 * 1000))
      .collect();
    if (recent.some((item) => !isTerminal(item.status) && now - item.heartbeatAt < STALE_MS)) throw new ConvexError("PARTNER_BUSY");
    const budget = Math.max(0, Math.min(args.maxRequests ?? Number.POSITIVE_INFINITY, dailyCap(partner, config.dailyRequestCap) - (await usedLast24h(ctx, args.partnerSlug, now))));
    if (budget <= 0) throw new ConvexError("BUDGET_EXHAUSTED");

    const runId = await ctx.db.insert("syncRuns", {
      trigger: "relay",
      cycleKey: cycleKeyOf(now),
      status: "running",
      partnerSlugs: [args.partnerSlug],
      maxRequestsPerPartner: budget,
      startedAt: now,
    });
    const runItemId = await ctx.db.insert("syncRunItems", {
      runId,
      partnerSlug: args.partnerSlug,
      status: "running",
      phase: "fetch",
      startedAt: now,
      heartbeatAt: now,
      requestBudget: budget,
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
      log: [{ at: now, level: "info", text: "Uvoz preko relay klijenta je počeo." }],
    });
    await ctx.scheduler.runAfter(STALE_MS, internal.sync.orchestrator.watchdog, { runId });
    const meta = await ctx.db
      .query("offerSyncMeta")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", args.partnerSlug))
      .collect();
    return {
      runId,
      runItemId,
      requestBudget: budget,
      meta: meta.map((row) => ({
        externalId: row.externalId,
        listSig: row.listSig,
        contentHash: row.contentHash,
        detailFetchedAt: row.detailFetchedAt,
        contentFetchedAt: row.contentFetchedAt,
      })),
    };
  },
});

export const relayBatch = internalMutation({
  args: {
    runItemId: v.id("syncRunItems"),
    offers: v.array(finalOfferV),
    goneIds: v.optional(v.array(v.string())),
    requestsUsed: v.number(),
    processed: v.number(),
    parseErrors: v.number(),
    log: v.array(logEntryV),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.runItemId);
    if (!item || isTerminal(item.status)) throw new ConvexError("RUN_ITEM_CLOSED");
    if (args.offers.length > MAX_BATCH) throw new ConvexError("BATCH_TOO_LARGE");
    const config = getPartnerConfig(item.partnerSlug);
    if (!config) throw new ConvexError("UNKNOWN_PARTNER");
    // The relay is trusted only as far as the registry: every offer must belong to this partner and link to its site.
    for (const offer of args.offers) {
      const host = (() => {
        try {
          return new URL(offer.sourceUrl).hostname;
        } catch {
          return "";
        }
      })();
      if (offer.partnerSlug !== item.partnerSlug || !config.hosts.includes(host)) throw new ConvexError("OFFER_OUTSIDE_PARTNER");
    }
    return upsertBatchImpl(ctx, {
      runItemId: item._id,
      offers: args.offers as FinalOffer[],
      processedQueueIds: [],
      followUps: [],
      goneIds: args.goneIds ?? [],
      contentKeys: [],
      progress: {
        requestsUsed: Math.min(args.requestsUsed, item.requestBudget),
        parseErrors: args.parseErrors,
        processed: args.processed,
        log: args.log.slice(-50),
      },
    });
  },
});

export const relayFinish = internalMutation({
  args: {
    runItemId: v.id("syncRunItems"),
    listedIds: v.array(v.string()),
    discovered: v.number(),
    discoveryComplete: v.boolean(),
    queueComplete: v.boolean(),
    requestsUsed: v.number(),
    outcome: v.object({
      status: v.optional(v.union(v.literal("blocked"), v.literal("network"), v.literal("parse"), v.literal("failed"), v.literal("partial"))),
      errorClass: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
    log: v.array(logEntryV),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.runItemId);
    if (!item || isTerminal(item.status)) throw new ConvexError("RUN_ITEM_CLOSED");
    await ctx.db.patch(item._id, {
      listedIds: args.listedIds.slice(0, 8000),
      discovered: args.discovered,
      discoveryComplete: args.discoveryComplete,
      heartbeatAt: Date.now(),
    });
    return finalizeItemImpl(ctx, {
      runItemId: item._id,
      outcome: { ...args.outcome, queueComplete: args.queueComplete },
      progress: { requestsUsed: Math.min(args.requestsUsed, item.requestBudget), parseErrors: 0, processed: 0, log: args.log.slice(-50) },
    });
  },
});
