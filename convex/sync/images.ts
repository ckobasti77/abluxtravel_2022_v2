"use node";
// Image copies to Convex storage (D15), network side. Runs after a partner's
// import (scheduled by finalizeItem): HTTP-only partner images (Dunav Turs)
// and covers of featured offers are downloaded through the same polite client
// (allowlisted hosts, robots, delays, daily budget) and stored once per URL.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { BlockedError, BudgetExceededError, ForbiddenUrlError, NetworkError, RobotsDisallowedError } from "../../scraper/core/errors";
import { hash64 } from "../../scraper/core/hash";
import { PartnerHttpClient, type RobotsCache } from "../../scraper/core/http";
import type { PartnerConfig } from "../../scraper/core/types";
import { getPartnerConfig } from "../../scraper/registry";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|avif|gif)\b/i;
const TIME_BUDGET_MS = 8 * 60 * 1000;

/** Same hosts as the partner, but only robots.txt and image files may be fetched. */
export function imageFetchConfig(config: PartnerConfig): PartnerConfig {
  return { ...config, allowedPaths: [/^\/robots\.txt$/, /\.(jpe?g|png|webp|avif|gif)(\?[^#]*)?$/i, ...config.allowedPaths.filter((path) => /images/.test(path.source))] };
}

function parseRobots(raw: string | undefined): RobotsCache {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as RobotsCache;
  } catch {
    return {};
  }
}

export const copyForPartner = internalAction({
  args: { partnerSlug: v.string() },
  handler: async (ctx, args): Promise<{ copied: number; reused: number; failed: number; stopped?: string }> => {
    const config = getPartnerConfig(args.partnerSlug);
    if (!config || !config.liveFetchAllowed) return { copied: 0, reused: 0, failed: 0, stopped: "blocked" };
    const pending = await ctx.runQuery(internal.sync.imagesDb.pendingImages, { partnerSlug: args.partnerSlug });
    if (pending.jobs.length === 0) return { copied: 0, reused: 0, failed: 0 };
    const http = new PartnerHttpClient({
      config: imageFetchConfig(config),
      budget: { max: pending.budget, used: 0 },
      robotsCache: parseRobots(pending.robotsCache),
    });
    const started = Date.now();
    let copied = 0;
    let reused = 0;
    let failed = 0;
    let stopped: string | undefined;
    for (const job of pending.jobs) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        stopped = "time";
        break;
      }
      const cardId = job.cardId as Id<"offerCards">;
      const urlHash = hash64(job.url);
      const cached = await ctx.runQuery(internal.sync.imagesDb.lookupImage, { urlHash, url: job.url });
      if (cached) {
        await ctx.runMutation(internal.sync.imagesDb.attachStorage, { cardId, url: job.url, storageId: cached });
        reused += 1;
        continue;
      }
      try {
        const image = await http.getBinary(job.url, { maxBytes: MAX_IMAGE_BYTES });
        const type = image.contentType.split(";")[0].trim().toLowerCase();
        if (image.status !== 200 || image.tooLarge || !IMAGE_TYPES.test(type) || image.bytes.byteLength === 0) {
          failed += 1;
          continue;
        }
        const storageId = await ctx.storage.store(new Blob([image.bytes.slice()], { type }));
        await ctx.runMutation(internal.sync.imagesDb.saveImage, {
          urlHash,
          url: job.url,
          partnerSlug: args.partnerSlug,
          storageId,
          contentType: type,
          bytes: image.bytes.byteLength,
        });
        await ctx.runMutation(internal.sync.imagesDb.attachStorage, { cardId, url: job.url, storageId });
        copied += 1;
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          stopped = "budget";
          break;
        }
        if (error instanceof BlockedError || error instanceof RobotsDisallowedError) {
          stopped = "blocked";
          break;
        }
        if (error instanceof ForbiddenUrlError || error instanceof NetworkError) {
          failed += 1;
          continue;
        }
        throw error;
      }
    }
    const snapshot = http.snapshot();
    // Stored copies count via partnerImages; every other request (robots, failures) goes on the latest run item.
    const extra = snapshot.requestsUsed - copied;
    if (extra > 0) await ctx.runMutation(internal.sync.imagesDb.recordExtraRequests, { partnerSlug: args.partnerSlug, count: extra });
    if (snapshot.robotsUpdated) {
      await ctx.runMutation(internal.sync.imagesDb.saveRobots, { partnerSlug: args.partnerSlug, robotsCache: JSON.stringify(snapshot.robotsCache) });
    }
    console.log(`slike ${args.partnerSlug}: kopirano ${copied}, iz keša ${reused}, neuspešno ${failed}, zahteva ${snapshot.requestsUsed}${stopped ? `, stalo: ${stopped}` : ""}`);
    return { copied, reused, failed, stopped };
  },
});
