"use node";
// Partner Sync worker (Node action). One invocation handles one phase step for
// one partner (≤ ~7 min) and re-schedules itself: discover → fetch batches →
// finalize. All HTTP goes through PartnerHttpClient (robots, delays, budget,
// allowlist, anti-bot).
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { getAdapter } from "../../scraper/adapters";
import {
  BlockedError,
  BudgetExceededError,
  ForbiddenUrlError,
  NetworkError,
  ParseError,
  RobotsDisallowedError,
} from "../../scraper/core/errors";
import { finalizeOffer } from "../../scraper/core/finalize";
import { PartnerHttpClient, type ClientState, type RobotsCache } from "../../scraper/core/http";
import { groupFragments } from "../../scraper/core/merge";
import { ROBOTS_MESSAGE, SKIP_MESSAGES, STATUS_MESSAGES, type RunItemStatus } from "../../scraper/core/messages";
import { planFetch } from "../../scraper/core/plan-fetch";
import { todayBelgrade } from "../../scraper/core/time";
import type { AdapterEnv, DiscoveredItem, FinalOffer, LogLevel, NormalizedOffer } from "../../scraper/core/types";
import { getPartnerConfig } from "../../scraper/registry";

const TIME_BUDGET_MS = 7 * 60 * 1000;
const MAX_BATCH_BYTES = 4_000_000;
const MAX_BATCH_OFFERS = 25;
const QUEUE_CHUNK = 300;

type LogEntry = { at: number; level: LogLevel; text: string };

/** Convex values cannot contain undefined inside arrays; drop undefined object fields too. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toQueueRow(item: DiscoveredItem) {
  const dataJson = item.data === undefined ? undefined : JSON.stringify(item.data);
  return clean({
    key: item.key.slice(0, 300),
    url: item.url,
    externalId: item.externalId,
    kind: item.kind,
    listSig: item.listSig,
    dataJson: dataJson && dataJson.length <= 16_000 ? dataJson : undefined,
  });
}

function classify(error: unknown, processed: number): { status: RunItemStatus; errorClass: string; message: string } {
  const detail = (error as Error)?.message ?? String(error);
  if (error instanceof BlockedError) return { status: "blocked", errorClass: "blocked", message: `${STATUS_MESSAGES.blocked} (${detail})` };
  if (error instanceof RobotsDisallowedError) return { status: "blocked", errorClass: "robots", message: ROBOTS_MESSAGE };
  if (error instanceof BudgetExceededError) return { status: "partial", errorClass: "budget", message: STATUS_MESSAGES.partial };
  if (error instanceof NetworkError)
    return processed > 0
      ? { status: "partial", errorClass: "network", message: `${STATUS_MESSAGES.partial} (${detail})` }
      : { status: "network", errorClass: "network", message: `${STATUS_MESSAGES.network} (${detail})` };
  if (error instanceof ParseError) return { status: "parse", errorClass: "parse", message: `${STATUS_MESSAGES.parse} (${detail})` };
  if (error instanceof ForbiddenUrlError) return { status: "failed", errorClass: "forbidden_url", message: `${STATUS_MESSAGES.failed} (${detail})` };
  return { status: "failed", errorClass: "internal", message: `${STATUS_MESSAGES.failed} (${detail.slice(0, 200)})` };
}

function chunkOffers(offers: FinalOffer[]): FinalOffer[][] {
  const chunks: FinalOffer[][] = [];
  let current: FinalOffer[] = [];
  let bytes = 0;
  for (const offer of offers) {
    const size = JSON.stringify(offer).length;
    if (current.length > 0 && (current.length >= MAX_BATCH_OFFERS || bytes + size > MAX_BATCH_BYTES)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(offer);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function finalize(
  ctx: ActionCtx,
  runItemId: Id<"syncRunItems">,
  outcome: { status?: RunItemStatus; errorClass?: string; message?: string; queueComplete?: boolean },
  progress?: { requestsUsed: number; clientState?: string; robotsCache?: string; parseErrors: number; processed: number; log: LogEntry[] }
) {
  await ctx.runMutation(internal.sync.ingest.finalizeItem, { runItemId, outcome: clean(outcome), progress: progress ? clean(progress) : undefined });
}

export const runItem = internalAction({
  args: { runItemId: v.id("syncRunItems") },
  handler: async (ctx, { runItemId }) => {
    const context = await ctx.runQuery(internal.sync.orchestrator.getItemContext, { runItemId });
    if (!context) return;
    const { item, partner } = context;
    if (["ok", "partial", "blocked", "network", "parse", "failed", "cancelled", "skipped"].includes(item.status)) return;
    if (context.cancelRequested) {
      await finalize(ctx, runItemId, { status: "cancelled", message: STATUS_MESSAGES.cancelled });
      return;
    }
    const config = getPartnerConfig(partner.slug);
    if (!config || !config.liveFetchAllowed) {
      await finalize(ctx, runItemId, { status: "skipped", message: SKIP_MESSAGES.blocked });
      return;
    }
    const adapter = getAdapter(config.family);
    if (!adapter) {
      await finalize(ctx, runItemId, { status: "skipped", message: SKIP_MESSAGES.noAdapter });
      return;
    }

    const started = Date.now();
    const log: LogEntry[] = [];
    const push = (level: LogLevel, text: string) => log.push({ at: Date.now(), level, text: text.slice(0, 300) });
    const env: AdapterEnv = { config, today: todayBelgrade(started), log: push };
    const http = new PartnerHttpClient({
      config,
      budget: { max: item.requestBudget, used: item.requestsUsed },
      state: parseJson<ClientState>(item.clientState, { lastRequestAt: {} }),
      robotsCache: parseJson<RobotsCache>(partner.robotsCache, {}),
      log: push,
    });
    const progress = () => {
      const snapshot = http.snapshot();
      return {
        requestsUsed: snapshot.requestsUsed,
        clientState: JSON.stringify(snapshot.state),
        robotsCache: snapshot.robotsUpdated ? JSON.stringify(snapshot.robotsCache) : undefined,
      };
    };

    let processed = 0;
    let parseErrors = 0;
    try {
      if (item.phase === "discover") {
        push("info", "Pokrenuto preuzimanje liste ponuda.");
        const result = await adapter.discover(http, env);
        for (const warning of result.warnings) push("warn", warning);
        // forceRefetch (after parser fixes): treat every listed page as new.
        const meta = context.forceRefetch ? [] : await ctx.runQuery(internal.sync.ingest.getMetaIndex, { partnerSlug: partner.slug });
        const planned = planFetch(result.items, meta, {
          mergeMode: adapter.mergeMode,
          refreshDays: config.refreshDays,
          maxAgeDays: config.maxAgeDays,
          today: env.today,
          now: Date.now(),
        });
        push("info", `Pronađeno ${result.items.length} stavki; za preuzimanje ${planned.length}.`);
        const rows = planned.map(toQueueRow);
        const chunks = rows.length ? Array.from({ length: Math.ceil(rows.length / QUEUE_CHUNK) }, (_, i) => rows.slice(i * QUEUE_CHUNK, (i + 1) * QUEUE_CHUNK)) : [[]];
        for (let i = 0; i < chunks.length; i += 1) {
          const first = i === 0;
          const last = i === chunks.length - 1;
          await ctx.runMutation(internal.sync.orchestrator.saveDiscovery, {
            runItemId,
            first,
            last,
            listedIds: first ? result.listedIds : undefined,
            discoveryComplete: first ? result.complete : undefined,
            discovered: first ? result.items.length : undefined,
            queue: chunks[i],
            ...progress(),
            log: first ? log.splice(0) : [],
          });
        }
        await ctx.scheduler.runAfter(0, internal.sync.worker.runItem, { runItemId });
        return;
      }

      if (item.phase === "fetch") {
        const batch = await ctx.runQuery(internal.sync.orchestrator.nextQueueBatch, { runItemId, limit: config.batchSize });
        if (batch.length === 0) {
          await finalize(ctx, runItemId, { queueComplete: true }, { ...progress(), parseErrors, processed, log });
          return;
        }
        const offers: NormalizedOffer[] = [];
        const followUps: DiscoveredItem[] = [];
        const goneIds: string[] = [];
        const contentKeys: string[] = [];
        const processedIds: typeof batch[number]["_id"][] = [];
        let stop: unknown;
        let networkStreak = 0;
        for (const row of batch) {
          if (Date.now() - started > TIME_BUDGET_MS) break;
          const discovered: DiscoveredItem = {
            key: row.key,
            url: row.url,
            externalId: row.externalId,
            kind: row.kind,
            listSig: row.listSig,
            priority: 0,
            data: parseJson(row.dataJson, undefined),
          };
          try {
            const raw = await adapter.fetchDetail(http, discovered, env);
            const parsed = adapter.parse(raw, env);
            offers.push(...parsed.offers);
            if (row.kind === "hotel" && row.externalId) contentKeys.push(row.externalId);
            followUps.push(...(parsed.followUps ?? []));
            goneIds.push(...(parsed.goneIds ?? []));
            for (const warning of parsed.warnings) push("warn", warning);
            processedIds.push(row._id);
            processed += 1;
            networkStreak = 0;
          } catch (error) {
            // One failing page (5xx, timeout, off-allowlist link) is skipped; the partner stops only
            // when it blocks us, the budget is spent, or the site fails 3 pages in a row.
            networkStreak = error instanceof NetworkError ? networkStreak + 1 : 0;
            if (error instanceof BlockedError || error instanceof BudgetExceededError || networkStreak >= 3) {
              stop = error;
              break;
            }
            parseErrors += 1;
            processed += 1;
            processedIds.push(row._id);
            push("warn", `Greška pri čitanju ${row.url}: ${(error as Error).message?.slice(0, 160)}`);
          }
        }

        // Finalize (sanitize, validate, hash); merge-mode fragments of one batch are grouped first.
        const listSigByExternal = new Map(batch.filter((row) => row.externalId).map((row) => [row.externalId!, row.listSig]));
        const grouped = adapter.mergeMode ? groupFragments(offers) : offers;
        const finals: FinalOffer[] = [];
        for (const offer of grouped) {
          try {
            finals.push(finalizeOffer(offer, config, listSigByExternal.get(offer.externalId)));
          } catch (error) {
            parseErrors += 1;
            push("warn", `Ponuda ${offer.externalId} odbačena: ${(error as Error).message?.slice(0, 160)}`);
          }
        }

        // Follow-ups only when their content is missing or stale.
        let followRows: ReturnType<typeof toQueueRow>[] = [];
        if (followUps.length) {
          const meta = await ctx.runQuery(internal.sync.ingest.getMetaIndex, { partnerSlug: partner.slug });
          followRows = planFetch(followUps, meta, {
            mergeMode: false,
            refreshDays: 7,
            today: env.today,
            now: Date.now(),
          }).map(toQueueRow);
        }

        const chunks = chunkOffers(finals);
        const totalChunks = Math.max(chunks.length, 1);
        for (let i = 0; i < totalChunks; i += 1) {
          const last = i === totalChunks - 1;
          await ctx.runMutation(internal.sync.ingest.upsertBatch, {
            runItemId,
            offers: clean(chunks[i] ?? []),
            processedQueueIds: last ? processedIds : [],
            followUps: last ? followRows : [],
            goneIds: last ? goneIds : [],
            contentKeys: last ? contentKeys : [],
            progress: {
              ...progress(),
              parseErrors: last ? parseErrors : 0,
              processed: last ? processed : 0,
              log: last ? log.splice(0) : [],
            },
          });
        }
        processed = 0;
        parseErrors = 0;

        if (stop) {
          const outcome = classify(stop, 1);
          push(outcome.status === "partial" ? "warn" : "error", outcome.message);
          await finalize(ctx, runItemId, { ...outcome, queueComplete: false }, { ...progress(), parseErrors: 0, processed: 0, log });
          return;
        }
        await ctx.scheduler.runAfter(0, internal.sync.worker.runItem, { runItemId });
        return;
      }

      await finalize(ctx, runItemId, {}, { ...progress(), parseErrors, processed, log });
    } catch (error) {
      const outcome = classify(error, item.processed + processed);
      push("error", outcome.message);
      await finalize(
        ctx,
        runItemId,
        { ...outcome, queueComplete: false },
        { ...progress(), parseErrors, processed, log }
      );
    }
  },
});
