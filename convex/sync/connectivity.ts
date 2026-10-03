"use node";
// Connectivity test (step 09): one request (robots.txt) to each partner that
// may be fetched live. Records HTTP status, anti-bot blocks and network
// errors as a "cli" run, so the requests count toward the daily budget, and
// stores the fresh robots.txt (cached 24 h, reused by the import).
//   npx convex run sync/connectivity:ping
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { BlockedError, BudgetExceededError, NetworkError } from "../../scraper/core/errors";
import { PartnerHttpClient } from "../../scraper/core/http";
import { getAdapter } from "../../scraper/adapters";
import { todayBelgrade } from "../../scraper/core/time";
import { PARTNERS } from "../../scraper/registry";

export const ping = internalAction({
  args: { partners: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ partner: string; status: string; http?: number; ms: number; message: string }[]> => {
    const targets = PARTNERS.filter(
      (config) => config.liveFetchAllowed && config.status === "active" && (!args.partners || args.partners.includes(config.slug))
    );
    const { items } = await ctx.runMutation(internal.sync.orchestrator.connectivityStart, { partners: targets.map((config) => config.slug) });
    const results: { partner: string; status: string; http?: number; ms: number; message: string }[] = [];
    for (const config of targets) {
      const runItemId = items.find((item) => item.partnerSlug === config.slug)!.runItemId;
      // Empty robots cache: the point is one real request per partner.
      const http = new PartnerHttpClient({ config, budget: { max: 2, used: 0 }, robotsCache: {}, retryDelaysMs: [] }); // 2: one redirect allowed
      const started = Date.now();
      let status: "ok" | "blocked" | "network" | "failed" = "ok";
      let message: string;
      let httpStatus: number | undefined;
      try {
        const entry = await http.checkRobots(`${config.website}/robots.txt`);
        httpStatus = entry.status;
        const delay = entry.rules.crawlDelaySec ? `, Crawl-delay ${entry.rules.crawlDelaySec} s` : "";
        message = `Test dostupnosti: robots.txt HTTP ${entry.status}${delay} (${Date.now() - started} ms).`;
      } catch (error) {
        if (error instanceof BlockedError) status = "blocked";
        else if (error instanceof NetworkError || error instanceof BudgetExceededError) status = "network";
        else status = "failed";
        message = `Test dostupnosti: ${(error as Error).message?.slice(0, 200)}`;
      }
      const snapshot = http.snapshot();
      await ctx.runMutation(internal.sync.orchestrator.connectivityResult, {
        runItemId,
        status,
        requestsUsed: snapshot.requestsUsed,
        message,
        robotsCache: snapshot.robotsUpdated ? JSON.stringify(snapshot.robotsCache) : undefined,
      });
      results.push({ partner: config.slug, status, http: httpStatus, ms: Date.now() - started, message });
    }
    return results;
  },
});

/**
 * Diagnose one page without importing it: fetch through the polite client
 * (counted as a "cli" run item, within the daily budget) and return what the
 * adapter reads. For parser fixes when a live page differs from the fixtures.
 *   npx convex run sync/connectivity:probe '{"partnerSlug":"tomash","url":"https://…","kind":"post"}'
 */
export const probe = internalAction({
  args: { partnerSlug: v.string(), url: v.string(), kind: v.optional(v.string()), externalId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<unknown> => {
    const config = PARTNERS.find((partner) => partner.slug === args.partnerSlug);
    if (!config || !config.liveFetchAllowed) return { error: "Partner nije dostupan za preuzimanje." };
    const adapter = getAdapter(config.family);
    if (!adapter) return { error: "Nema adaptera." };
    const budget: number = await ctx.runQuery(internal.sync.orchestrator.remainingBudget, { partnerSlug: args.partnerSlug });
    if (budget <= 0) return { error: "Dnevni limit zahteva je iskorišćen." };
    const { items } = await ctx.runMutation(internal.sync.orchestrator.connectivityStart, { partners: [args.partnerSlug] });
    const http = new PartnerHttpClient({ config, budget: { max: Math.min(budget, 3), used: 0 } });
    const env = { config, today: todayBelgrade(Date.now()), log: () => undefined };
    let result: unknown;
    let status: "ok" | "blocked" | "network" | "failed" = "ok";
    try {
      const raw = await adapter.fetchDetail(http, { key: args.url, url: args.url, kind: args.kind, externalId: args.externalId, priority: 0 }, env);
      const page = raw.pages.main;
      const parsed = adapter.parse(raw, env);
      result = {
        http: page.status,
        bytes: page.body.length,
        offers: parsed.offers.map((offer) => ({
          title: offer.title,
          place: offer.place,
          country: offer.countryName,
          departures: offer.departures.slice(0, 5),
          listPrice: offer.listPrice,
          warnings: offer.warnings,
        })),
        sample: page.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3000),
      };
    } catch (error) {
      status = error instanceof BlockedError ? "blocked" : error instanceof NetworkError ? "network" : "failed";
      result = { error: (error as Error).message };
    }
    const snapshot = http.snapshot();
    await ctx.runMutation(internal.sync.orchestrator.connectivityResult, {
      runItemId: items[0].runItemId,
      status,
      requestsUsed: snapshot.requestsUsed,
      message: `Provera stranice: ${args.url.slice(0, 160)}`,
    });
    return result;
  },
});
