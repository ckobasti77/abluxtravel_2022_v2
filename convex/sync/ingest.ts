// Partner Sync ingest (internal): idempotent upserts keyed by partner +
// externalId, merge mode (D5), auto-publish, overrides preserved, finalize
// (delisting, expiry D4, change log, partner counts, run totals).
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getPartnerConfig } from "../../scraper/registry";
import { v } from "convex/values";
import {
  computeIsPublic,
  detailFields,
  importedCardFields,
  storedToOffer,
  uniqueSlug,
  type CardDoc,
} from "../lib/catalogCards";
import { finalOfferV, runItemStatusV } from "../lib/syncValidators";
import {
  activeByDates,
  deriveOffer,
  derivePrice,
  futureDates,
  isPlausibleEurPrice,
  NO_PRICE_SORT,
  UNDATED_SORT,
} from "../../scraper/core/derive";
import { FAMILY_BEHAVIOR } from "../../scraper/core/families";
import { firstTouchMerge, mergeFragments } from "../../scraper/core/merge";
import { STATUS_MESSAGES, suspiciousDropMessage, type RunItemStatus } from "../../scraper/core/messages";
import { rehash } from "../../scraper/core/normalize";
import { offerSlugBase } from "../../scraper/core/text";
import { todayBelgrade } from "../../scraper/core/time";
import type { AdapterFamily, FinalOffer } from "../../scraper/core/types";

const LOG_LIMIT = 200;
const NO_DATES_WARNING = "Nisu pronađeni termini.";

export const logEntryV = v.object({
  at: v.number(),
  level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
  text: v.string(),
});

export const queueItemV = v.object({
  key: v.string(),
  url: v.string(),
  externalId: v.optional(v.string()),
  kind: v.optional(v.string()),
  listSig: v.optional(v.string()),
  dataJson: v.optional(v.string()),
});

export const progressV = v.object({
  requestsUsed: v.number(),
  clientState: v.optional(v.string()),
  robotsCache: v.optional(v.string()),
  parseErrors: v.number(),
  processed: v.number(),
  log: v.array(logEntryV),
});

export type LogEntry = Doc<"syncRunItems">["log"][number];
type Partner = Doc<"sources">;

const TERMINAL: RunItemStatus[] = ["ok", "partial", "blocked", "network", "parse", "failed", "cancelled", "skipped"];
export const isTerminal = (status: string) => TERMINAL.includes(status as RunItemStatus);

export function appendLog(existing: LogEntry[], entries: LogEntry[]): LogEntry[] {
  const merged = [...existing, ...entries.map((entry) => ({ ...entry, text: entry.text.slice(0, 300) }))];
  return merged.slice(-LOG_LIMIT);
}

export async function partnerBySlug(ctx: QueryCtx | MutationCtx, slug: string) {
  return ctx.db
    .query("sources")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
}

export type IngestCounts = { created: number; updated: number; unchanged: number };

/**
 * Shared upsert used by the worker, the relay and manual imports.
 * `contentKeys`: externalIds whose follow-up content (not the listing) was fetched.
 */
export async function ingestFinalOffers(
  ctx: MutationCtx,
  partner: Partner,
  offers: FinalOffer[],
  opts: { runId?: Id<"syncRuns">; mergeMode: boolean; contentKeys?: string[]; published?: boolean }
): Promise<IngestCounts> {
  const now = Date.now();
  const today = todayBelgrade(now);
  const counts: IngestCounts = { created: 0, updated: 0, unchanged: 0 };
  const contentKeys = new Set(opts.contentKeys ?? []);
  for (const offer of offers) {
    const meta = await ctx.db
      .query("offerSyncMeta")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", partner.slug).eq("externalId", offer.externalId))
      .unique();
    const card = meta ? await ctx.db.get(meta.cardId) : null;
    const detail = card
      ? await ctx.db
          .query("offerDetails")
          .withIndex("by_card", (q) => q.eq("cardId", card._id))
          .unique()
      : null;

    let incoming: FinalOffer = offer;
    if (opts.mergeMode && card && detail) {
      const stored = storedToOffer(card, detail);
      const merged = meta?.lastSeenRunId && meta.lastSeenRunId === opts.runId ? mergeFragments(stored, offer) : firstTouchMerge(stored, offer);
      if (merged.departures.length > 0) merged.warnings = merged.warnings.filter((warning) => warning !== NO_DATES_WARNING);
      incoming = { ...merged, contentHash: rehash(merged), listSig: offer.listSig };
    }
    const derived = deriveOffer(incoming, {
      today,
      partnerName: partner.name,
      categoryMap: partner.categoryMap,
    });
    const fetchStamp = contentKeys.has(offer.externalId) ? { contentFetchedAt: now } : { detailFetchedAt: now };

    if (!card || !detail || !meta) {
      const slug = await uniqueSlug(ctx, `${offerSlugBase(incoming.title, incoming.place)}-${partner.slug}`);
      const fields = importedCardFields(incoming, derived, partner, null, now);
      const published = opts.published ?? partner.autoPublish ?? true;
      const isActive = derived.activeByDates;
      const cardId = await ctx.db.insert("offerCards", {
        kind: "partner",
        partnerSlug: partner.slug,
        externalId: incoming.externalId,
        slug,
        ...fields,
        listed: true,
        isActive,
        published,
        hidden: false,
        featured: false,
        partnerEnabled: partner.isEnabled,
        isPublic: computeIsPublic({ published, isActive, hidden: false, partnerEnabled: partner.isEnabled }),
        firstSeenAt: now,
        runBaseline: opts.runId
          ? { runId: opts.runId, isNew: true, departureCount: 0 }
          : undefined,
      });
      await ctx.db.insert("offerDetails", {
        cardId,
        partnerSlug: partner.slug,
        externalId: incoming.externalId,
        ...detailFields(incoming, null, now),
      });
      const metaFields = {
        cardId,
        listSig: incoming.listSig,
        contentHash: incoming.contentHash,
        lastSeenRunId: opts.runId,
        lastSeenAt: now,
        sourceModifiedAt: incoming.sourceModifiedAt,
        ...fetchStamp,
      };
      if (meta) await ctx.db.patch(meta._id, metaFields);
      else
        await ctx.db.insert("offerSyncMeta", {
          partnerSlug: partner.slug,
          externalId: incoming.externalId,
          parseErrorCount: 0,
          ...metaFields,
        });
      if (!opts.runId) {
        await ctx.db.insert("offerChanges", {
          cardId,
          partnerSlug: partner.slug,
          type: "new",
          title: fields.title,
          slug,
          newPrice: derived.priceFrom,
          basis: derived.priceBasis,
          newNextDeparture: derived.nextDepartureDate,
          at: now,
        });
      }
      counts.created += 1;
      continue;
    }

    const metaPatch = {
      listSig: incoming.listSig ?? meta.listSig,
      lastSeenRunId: opts.runId ?? meta.lastSeenRunId,
      lastSeenAt: now,
      sourceModifiedAt: incoming.sourceModifiedAt ?? meta.sourceModifiedAt,
      ...fetchStamp,
    };
    if (meta.contentHash === incoming.contentHash) {
      await ctx.db.patch(meta._id, metaPatch);
      counts.unchanged += 1;
      continue;
    }

    const baseline =
      opts.runId && card.runBaseline?.runId === opts.runId
        ? card.runBaseline
        : opts.runId
          ? {
              runId: opts.runId,
              isNew: false,
              priceFrom: card.priceFrom,
              priceBasis: card.priceBasis,
              nextDepartureDate: card.nextDepartureDate,
              departureCount: card.departureDates.length,
            }
          : undefined;
    const fields = importedCardFields(incoming, derived, partner, card, now);
    const isActive = derived.activeByDates;
    await ctx.db.patch(card._id, {
      ...fields,
      listed: true,
      removedAt: undefined,
      isActive,
      partnerEnabled: partner.isEnabled,
      isPublic: computeIsPublic({ published: card.published, isActive, hidden: card.hidden, partnerEnabled: partner.isEnabled }),
      runBaseline: baseline,
    });
    await ctx.db.patch(detail._id, detailFields(incoming, detail, now));
    await ctx.db.patch(meta._id, { ...metaPatch, contentHash: incoming.contentHash });
    if (!opts.runId && card.priceFrom !== derived.priceFrom && derived.priceFrom && card.priceFrom) {
      await ctx.db.insert("offerChanges", {
        cardId: card._id,
        partnerSlug: partner.slug,
        type: derived.priceFrom < card.priceFrom ? "price_down" : "price_up",
        title: fields.title,
        slug: card.slug,
        oldPrice: card.priceFrom,
        newPrice: derived.priceFrom,
        basis: derived.priceBasis,
        at: now,
      });
    }
    counts.updated += 1;
  }
  return counts;
}

export const getMetaIndex = internalQuery({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("offerSyncMeta")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", args.partnerSlug))
      .collect();
    return rows.map((row) => ({
      externalId: row.externalId,
      listSig: row.listSig,
      detailFetchedAt: row.detailFetchedAt,
      contentFetchedAt: row.contentFetchedAt,
      contentHash: row.contentHash,
    }));
  },
});

export const upsertBatchArgs = {
  runItemId: v.id("syncRunItems"),
  offers: v.array(finalOfferV),
  processedQueueIds: v.array(v.id("syncQueue")),
  followUps: v.array(queueItemV),
  goneIds: v.array(v.string()),
  contentKeys: v.array(v.string()),
  progress: progressV,
};
type UpsertBatchArgs = {
  runItemId: Id<"syncRunItems">;
  offers: FinalOffer[];
  processedQueueIds: Id<"syncQueue">[];
  followUps: Omit<Doc<"syncQueue">, "_id" | "_creationTime" | "runItemId" | "seq">[];
  goneIds: string[];
  contentKeys: string[];
  progress: NonNullable<FinalizeArgs["progress"]>;
};

export const upsertBatch = internalMutation({
  args: upsertBatchArgs,
  handler: async (ctx, args) => upsertBatchImpl(ctx, args as UpsertBatchArgs),
});

/** One batch of finalized offers for a run item (worker and relay). */
export async function upsertBatchImpl(ctx: MutationCtx, args: UpsertBatchArgs) {
  const item = await ctx.db.get(args.runItemId);
  if (!item || isTerminal(item.status)) return { ignored: true };
  const partner = await partnerBySlug(ctx, item.partnerSlug);
  if (!partner) throw new Error(`Partner ${item.partnerSlug} ne postoji.`);
  const behavior = FAMILY_BEHAVIOR[(partner.adapter ?? "manual") as AdapterFamily] ?? FAMILY_BEHAVIOR.manual;
  const counts = await ingestFinalOffers(ctx, partner, args.offers as FinalOffer[], {
    runId: item.runId,
    mergeMode: behavior.mergeMode,
    contentKeys: args.contentKeys,
  });

  for (const id of args.processedQueueIds) {
    const row = await ctx.db.get(id);
    if (row) await ctx.db.delete(id);
  }

  const knownFollowUps = new Set(item.followUpKeys ?? []);
  let queued = item.queued;
  for (const followUp of args.followUps) {
    if (knownFollowUps.has(followUp.key)) continue;
    knownFollowUps.add(followUp.key);
    await ctx.db.insert("syncQueue", { runItemId: item._id, seq: queued, ...followUp });
    queued += 1;
  }

  const gone = new Set(args.goneIds);
  const listedIds = gone.size ? (item.listedIds ?? []).filter((id) => !gone.has(id)) : item.listedIds;
  const progressLog: LogEntry[] = [...args.progress.log];
  if (counts.created || counts.updated || counts.unchanged) {
    progressLog.push({
      at: Date.now(),
      level: "info",
      text: `Nove: ${counts.created}, izmenjene: ${counts.updated}, bez promene: ${counts.unchanged}.`,
    });
  }
  await ctx.db.patch(item._id, {
    status: "running",
    created: item.created + counts.created,
    updated: item.updated + counts.updated,
    unchanged: item.unchanged + counts.unchanged,
    processed: item.processed + args.progress.processed,
    parseErrors: item.parseErrors + args.progress.parseErrors,
    requestsUsed: args.progress.requestsUsed,
    clientState: args.progress.clientState ?? item.clientState,
    heartbeatAt: Date.now(),
    queued,
    listedIds,
    followUpKeys: [...knownFollowUps].slice(-2000),
    log: appendLog(item.log, progressLog),
  });
  if (args.progress.robotsCache) await ctx.db.patch(partner._id, { robotsCache: args.progress.robotsCache });
  return { ignored: false, ...counts };
}

type ChangeInsert = Omit<Doc<"offerChanges">, "_id" | "_creationTime">;

/** Recompute activity and visibility for one card; returns patch + events. */
function settleCard(
  card: CardDoc,
  listed: boolean,
  today: string,
  sourceModifiedAt: string | undefined,
  runId: Id<"syncRuns"> | undefined,
  now: number
): { patch: Partial<CardDoc>; changes: ChangeInsert[] } {
  const departureDates = card.departureDates.filter((date) => date >= today);
  const active = listed && activeByDates(card.availabilityMode, departureDates, sourceModifiedAt, today);
  const patch: Partial<CardDoc> = {};
  const changes: ChangeInsert[] = [];
  const base = { cardId: card._id, partnerSlug: card.partnerSlug, runId, title: card.title, slug: card.slug, at: now };

  if (departureDates.length !== card.departureDates.length) {
    patch.departureDates = departureDates;
    patch.nextDepartureDate = departureDates[0];
    patch.sortDeparture = departureDates[0] ?? UNDATED_SORT;
  }
  if (listed !== card.listed) {
    patch.listed = listed;
    if (!listed) {
      patch.removedAt = now;
      changes.push({ ...base, type: "removed", oldPrice: card.priceFrom, basis: card.priceBasis });
    } else {
      patch.removedAt = undefined;
      changes.push({ ...base, type: "returned", newPrice: card.priceFrom, basis: card.priceBasis });
    }
  }
  if (active !== card.isActive) {
    patch.isActive = active;
    if (!active && listed) changes.push({ ...base, type: "expired", oldNextDeparture: card.nextDepartureDate });
  }
  const isPublic = computeIsPublic({ published: card.published, isActive: active, hidden: card.hidden, partnerEnabled: card.partnerEnabled });
  if (isPublic !== card.isPublic) patch.isPublic = isPublic;

  const baseline = card.runBaseline;
  if (baseline && runId && baseline.runId === runId) {
    if (baseline.isNew) {
      changes.push({ ...base, type: "new", newPrice: card.priceFrom, basis: card.priceBasis, newNextDeparture: card.nextDepartureDate });
    } else {
      if (baseline.priceFrom && card.priceFrom && baseline.priceFrom !== card.priceFrom && baseline.priceBasis === card.priceBasis) {
        changes.push({
          ...base,
          type: card.priceFrom < baseline.priceFrom ? "price_down" : "price_up",
          oldPrice: baseline.priceFrom,
          newPrice: card.priceFrom,
          basis: card.priceBasis,
        });
      }
      if (
        baseline.nextDepartureDate &&
        baseline.nextDepartureDate >= today &&
        card.nextDepartureDate !== baseline.nextDepartureDate
      ) {
        changes.push({ ...base, type: "dates", oldNextDeparture: baseline.nextDepartureDate, newNextDeparture: card.nextDepartureDate });
      }
    }
  }
  if (card.runBaseline) patch.runBaseline = undefined;
  return { patch, changes };
}

export async function settleRun(ctx: MutationCtx, runId: Id<"syncRuns">) {
  const run = await ctx.db.get(runId);
  if (!run || run.status !== "running") return;
  const items = await ctx.db
    .query("syncRunItems")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .collect();
  if (items.some((item) => !isTerminal(item.status))) return;
  const totals = {
    ok: items.filter((item) => item.status === "ok").length,
    partial: items.filter((item) => item.status === "partial").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    failed: items.filter((item) => ["failed", "network", "parse", "cancelled"].includes(item.status)).length,
    skipped: items.filter((item) => item.status === "skipped").length,
    created: items.reduce((sum, item) => sum + item.created, 0),
    updated: items.reduce((sum, item) => sum + item.updated, 0),
    removed: items.reduce((sum, item) => sum + item.removed, 0),
    expired: items.reduce((sum, item) => sum + item.expired, 0),
    requests: items.reduce((sum, item) => sum + item.requestsUsed, 0),
  };
  const ran = items.filter((item) => item.status !== "skipped");
  const status: Doc<"syncRuns">["status"] = run.cancelRequested
    ? "cancelled"
    : ran.length > 0 && ran.every((item) => ["failed", "network", "parse"].includes(item.status))
      ? "failed"
      : items.every((item) => item.status === "ok" || item.status === "skipped")
        ? "ok"
        : "partial";
  await ctx.db.patch(runId, { status, totals, finishedAt: Date.now() });
  const state = await ctx.db
    .query("syncState")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (state?.activeRunId === runId) await ctx.db.patch(state._id, { activeRunId: undefined, updatedAt: Date.now() });
}

export const outcomeV = v.object({
  status: v.optional(runItemStatusV),
  errorClass: v.optional(v.string()),
  message: v.optional(v.string()),
  queueComplete: v.optional(v.boolean()),
});

export type FinalizeArgs = {
  runItemId: Id<"syncRunItems">;
  outcome: { status?: RunItemStatus; errorClass?: string; message?: string; queueComplete?: boolean };
  progress?: { requestsUsed: number; clientState?: string; robotsCache?: string; parseErrors: number; processed: number; log: LogEntry[] };
};

export const finalizeItem = internalMutation({
  args: {
    runItemId: v.id("syncRunItems"),
    outcome: outcomeV,
    progress: v.optional(progressV),
  },
  handler: async (ctx, args) => finalizeItemImpl(ctx, args),
});

/** End of one partner in a run (worker, watchdog and relay). */
export async function finalizeItemImpl(ctx: MutationCtx, args: FinalizeArgs) {
  const item = await ctx.db.get(args.runItemId);
  if (!item || isTerminal(item.status)) return null;
  const partner = await partnerBySlug(ctx, item.partnerSlug);
  if (!partner) throw new Error(`Partner ${item.partnerSlug} ne postoji.`);
  const now = Date.now();
  const today = todayBelgrade(now);
  const behavior = FAMILY_BEHAVIOR[(partner.adapter ?? "manual") as AdapterFamily] ?? FAMILY_BEHAVIOR.manual;
  const progress = args.progress;
  const parseErrors = item.parseErrors + (progress?.parseErrors ?? 0);
  const processed = item.processed + (progress?.processed ?? 0);
  const queueComplete = args.outcome.queueComplete ?? item.queueComplete;
  const log: LogEntry[] = [...(progress?.log ?? [])];

  const cards = await ctx.db
    .query("offerCards")
    .withIndex("by_partner_external", (q) => q.eq("partnerSlug", partner.slug))
    .collect();
  const metas = await ctx.db
    .query("offerSyncMeta")
    .withIndex("by_partner_external", (q) => q.eq("partnerSlug", partner.slug))
    .collect();
  const metaById = new Map(metas.map((meta) => [meta.externalId, meta]));
  const previouslyListed = cards.filter((card) => card.listed).length;
  const listedSet =
    behavior.listedFrom === "discover"
      ? new Set(item.listedIds ?? [])
      : new Set(metas.filter((meta) => meta.lastSeenRunId === item.runId).map((meta) => meta.externalId));

  const hardStop = ["blocked", "network", "cancelled", "failed", "skipped"].includes(args.outcome.status ?? "");
  let status: RunItemStatus;
  if (args.outcome.status) status = args.outcome.status;
  else if (item.discovered === 0 && previouslyListed > 0) status = "parse";
  else if (processed > 0 && parseErrors > processed / 2) status = "parse";
  else if (!queueComplete || parseErrors > 0) status = "partial";
  else status = "ok";

  const sanityOk = previouslyListed < 10 || listedSet.size >= previouslyListed * 0.5;
  const delistAllowed =
    item.discoveryComplete &&
    !hardStop &&
    status !== "parse" &&
    (behavior.listedFrom === "discover" || queueComplete) &&
    sanityOk;
  if (item.discoveryComplete && !hardStop && !sanityOk) {
    log.push({ at: now, level: "warn", text: suspiciousDropMessage(listedSet.size, previouslyListed) });
    if (status === "ok") status = "partial";
  }

  let removed = 0;
  let expired = 0;
  const changes: ChangeInsert[] = [];
  for (const card of cards) {
    const listed = delistAllowed ? listedSet.has(card.externalId) : card.listed;
    const meta = metaById.get(card.externalId);
    const { patch, changes: cardChanges } = settleCard(card, listed, today, meta?.sourceModifiedAt, item.runId, now);
    // Departures moved into the past: recompute the price from stored departures.
    if (patch.departureDates) {
      const detail = await ctx.db
        .query("offerDetails")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .unique();
      if (detail) {
        const price = derivePrice(detail.departures, undefined, card.availabilityMode, today);
        if (detail.departures.some((departure) => departure.price !== undefined)) Object.assign(patch, price);
        patch.departureDates = futureDates(detail.departures, today);
      }
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(card._id, patch);
    for (const change of cardChanges) {
      if (change.type === "removed") removed += 1;
      if (change.type === "expired") expired += 1;
      changes.push(change);
    }
  }
  for (const change of changes) await ctx.db.insert("offerChanges", change);

  // Leftover transient queue rows.
  const leftovers = await ctx.db
    .query("syncQueue")
    .withIndex("by_item_seq", (q) => q.eq("runItemId", item._id))
    .take(2000);
  for (const row of leftovers) await ctx.db.delete(row._id);

  const fresh = await ctx.db
    .query("offerCards")
    .withIndex("by_partner_external", (q) => q.eq("partnerSlug", partner.slug))
    .collect();
  const counts = {
    listed: fresh.filter((card) => card.listed).length,
    active: fresh.filter((card) => card.isActive).length,
    public: fresh.filter((card) => card.isPublic).length,
    total: fresh.length,
  };
  const message =
    args.outcome.message ??
    (status === "ok" || status === "partial"
      ? `${STATUS_MESSAGES[status]} Nove: ${item.created}, izmenjene: ${item.updated}, uklonjene: ${removed}, istekle: ${expired}.`
      : STATUS_MESSAGES[status]);
  log.push({ at: now, level: status === "ok" ? "info" : "warn", text: message });

  await ctx.db.patch(item._id, {
    status,
    phase: "done",
    finishedAt: now,
    heartbeatAt: now,
    queueComplete,
    removed: item.removed + removed,
    expired: item.expired + expired,
    parseErrors,
    processed,
    requestsUsed: progress?.requestsUsed ?? item.requestsUsed,
    clientState: progress?.clientState ?? item.clientState,
    errorClass: args.outcome.errorClass,
    message,
    log: appendLog(item.log, log),
  });
  await ctx.db.patch(partner._id, {
    counts,
    lastRunId: item.runId,
    lastRunAt: now,
    lastRunStatus: status,
    lastRunMessage: message,
    lastRunDurationMs: now - item.startedAt,
    lastRunRequests: progress?.requestsUsed ?? item.requestsUsed,
    ...(status === "ok" || status === "partial" ? { lastSyncAt: now } : {}),
    ...(progress?.robotsCache ? { robotsCache: progress.robotsCache } : {}),
    updatedAt: now,
  });
  await settleRun(ctx, item.runId);

  // HTTP-only images (Dunav, D15) and featured covers are copied to storage after the pages.
  const config = getPartnerConfig(partner.slug);
  const wantsCopies =
    (status === "ok" || status === "partial") &&
    config?.liveFetchAllowed &&
    (config.imagePolicy === "copy" || fresh.some((card) => card.featured && card.listed && card.coverUrl && !card.coverStorageId));
  if (wantsCopies) await ctx.scheduler.runAfter(0, internal.sync.images.copyForPartner, { partnerSlug: partner.slug });
  return { status, removed, expired, counts };
}

/** Daily expiry: active cards whose next departure has passed (D4). Not gated by the cron switch. */
export const expirySweep = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx) => {
    const now = Date.now();
    const today = todayBelgrade(now);
    const stale = await ctx.db
      .query("offerCards")
      .withIndex("by_active_departure", (q) => q.eq("isActive", true).lt("sortDeparture", today))
      .take(300);
    let expired = 0;
    for (const card of stale) {
      const meta = await ctx.db
        .query("offerSyncMeta")
        .withIndex("by_partner_external", (q) => q.eq("partnerSlug", card.partnerSlug).eq("externalId", card.externalId))
        .unique();
      const { patch, changes } = settleCard(card, card.listed, today, meta?.sourceModifiedAt, undefined, now);
      const detail = await ctx.db
        .query("offerDetails")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .unique();
      if (detail) {
        if (detail.departures.some((departure) => departure.price !== undefined)) {
          Object.assign(patch, derivePrice(detail.departures, undefined, card.availabilityMode, today));
        }
        patch.departureDates = futureDates(detail.departures, today);
        patch.nextDepartureDate = patch.departureDates[0];
        patch.sortDeparture = patch.departureDates[0] ?? UNDATED_SORT;
      }
      await ctx.db.patch(card._id, patch);
      for (const change of changes) {
        if (change.type === "expired") expired += 1;
        await ctx.db.insert("offerChanges", change);
      }
    }
    if (stale.length === 300) await ctx.scheduler.runAfter(0, internal.sync.ingest.expirySweep, {});
    return { checked: stale.length, expired };
  },
});

/**
 * One-off correction (step 15): stored euro prices that cannot be euros (see
 * isPlausibleEurPrice, e.g. dinars printed with "€") become "Cena na upit".
 * Idempotent: `npx convex run sync/ingest:dropImplausiblePrices`.
 */
export const dropImplausiblePrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("offerCards").collect();
    const fixed: string[] = [];
    for (const card of cards) {
      if (card.currency !== "EUR" || card.priceKind !== "from" || card.priceFrom === undefined) continue;
      if (isPlausibleEurPrice(card.priceFrom, card.priceBasis)) continue;
      await ctx.db.patch(card._id, {
        priceKind: "on_request",
        priceFrom: undefined,
        priceOld: undefined,
        priceBasis: undefined,
        sortPrice: NO_PRICE_SORT,
      });
      fixed.push(card.slug);
    }
    return { checked: cards.length, fixed };
  },
});

/**
 * One-off correction (step 16): partner cards from Monastir (Tunisia) were filed under
 * "verski-turizam" by the keyword "monast". Idempotent:
 * `npx convex run sync/ingest:dropMonastirReligiousTag`.
 */
export const dropMonastirReligiousTag = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("offerCards").collect();
    const fixed: string[] = [];
    for (const card of cards) {
      if (card.kind !== "partner" || !card.travelTypes.includes("verski-turizam")) continue;
      const text = `${card.title} ${card.place ?? ""}`.toLowerCase();
      if (!text.includes("monastir")) continue;
      if (/verski|hodo|manastir|svet|ostrog|jerusal|sinaj/.test(text.replace(/monastir/g, " "))) continue;
      await ctx.db.patch(card._id, { travelTypes: card.travelTypes.filter((type) => type !== "verski-turizam") });
      fixed.push(card.slug);
    }
    return { checked: cards.length, fixed };
  },
});

export const applyPartnerVisibility = internalMutation({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args) => {
    const partner = await partnerBySlug(ctx, args.partnerSlug);
    if (!partner) return 0;
    const cards = await ctx.db
      .query("offerCards")
      .withIndex("by_partner_external", (q) => q.eq("partnerSlug", args.partnerSlug))
      .collect();
    let changed = 0;
    for (const card of cards) {
      const isPublic = computeIsPublic({ ...card, partnerEnabled: partner.isEnabled });
      if (card.partnerEnabled !== partner.isEnabled || card.isPublic !== isPublic) {
        await ctx.db.patch(card._id, { partnerEnabled: partner.isEnabled, isPublic });
        changed += 1;
      }
    }
    return changed;
  },
});

/** Recompute `sources.counts` for one partner (shared by sync, admin and manual imports). */
export async function recountPartnerCounts(ctx: MutationCtx, partnerSlug: string) {
  const partner = await partnerBySlug(ctx, partnerSlug);
  if (!partner) return null;
  const cards = await ctx.db
    .query("offerCards")
    .withIndex("by_partner_external", (q) => q.eq("partnerSlug", partnerSlug))
    .collect();
  const counts = {
    listed: cards.filter((card) => card.listed).length,
    active: cards.filter((card) => card.isActive).length,
    public: cards.filter((card) => card.isPublic).length,
    total: cards.length,
  };
  await ctx.db.patch(partner._id, { counts });
  return counts;
}

export const recountPartner = internalMutation({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args) => recountPartnerCounts(ctx, args.partnerSlug),
});

/** Data-quality sample for the night report (step 07/09). */
export const qualitySample = internalQuery({
  args: { partnerSlug: v.string(), n: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("offerCards")
      .withIndex("by_partner_public", (q) => q.eq("partnerSlug", args.partnerSlug).eq("isPublic", true))
      .take(Math.min(args.n ?? 5, 20));
    return Promise.all(
      cards.map(async (card) => {
        const detail = await ctx.db
          .query("offerDetails")
          .withIndex("by_card", (q) => q.eq("cardId", card._id))
          .unique();
        return {
          slug: card.slug,
          title: card.title,
          place: card.place,
          country: card.countryName,
          nextDeparture: card.nextDepartureDate,
          departures: card.departureDates.length,
          price: card.priceFrom ? `od ${card.priceFrom} € (${card.priceBasis})` : "Cena na upit",
          travelTypes: card.travelTypes,
          organizer: card.organizerName,
          cover: card.coverUrl,
          sourceUrl: detail?.sourceUrl,
          warnings: detail?.warnings,
        };
      })
    );
  },
});

/** Requests per partner within the last `hours` (night budget ledger). */
export const requestLedger = internalQuery({
  args: { hours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.hours ?? 24) * 60 * 60 * 1000;
    const partners = await ctx.db.query("sources").collect();
    const out: Record<string, number> = {};
    for (const partner of partners) {
      const items = await ctx.db
        .query("syncRunItems")
        .withIndex("by_partner_started", (q) => q.eq("partnerSlug", partner.slug).gte("startedAt", since))
        .collect();
      const images = await ctx.db
        .query("partnerImages")
        .withIndex("by_partner_fetched", (q) => q.eq("partnerSlug", partner.slug).gte("fetchedAt", since))
        .collect();
      // Pages, robots and retries (run items) + images copied to storage (D6, same rule as the budget).
      const total = items.reduce((sum, item) => sum + item.requestsUsed, 0) + images.length;
      if (total > 0) out[partner.slug] = total;
    }
    return out;
  },
});
