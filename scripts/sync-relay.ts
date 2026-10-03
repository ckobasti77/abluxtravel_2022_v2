// Partner Sync relay CLI: runs the same adapters as the Convex worker on this
// machine (meant for a whitelisted fixed IP) and posts finalized offers to the
// protected HTTP actions on the DEV deployment.
//
//   npm run sync:relay -- --partner <slug> [--max-requests N] [--dry-run]
//                         [--fixtures] [--out offers.json] [--allow-blocked]
//
// --fixtures   offline: saved pages from scraper/__fixtures__ (no network)
// --dry-run    nothing is sent to Convex; prints a summary
// Blocked partners are refused unless --allow-blocked (only on a machine the
// partner has whitelisted). The manual partner is always refused.
import { writeFileSync } from "node:fs";
import { getAdapter } from "../scraper/adapters";
import { BlockedError, BudgetExceededError, NetworkError, ParseError, RobotsDisallowedError } from "../scraper/core/errors";
import { finalizeOffer } from "../scraper/core/finalize";
import { PartnerHttpClient } from "../scraper/core/http";
import { groupFragments } from "../scraper/core/merge";
import { STATUS_MESSAGES } from "../scraper/core/messages";
import { planFetch, type MetaRow } from "../scraper/core/plan-fetch";
import { todayBelgrade } from "../scraper/core/time";
import type { AdapterEnv, DiscoveredItem, FinalOffer, HttpLike, LogLevel, NormalizedOffer } from "../scraper/core/types";
import { getPartnerConfig } from "../scraper/registry";
import { FixtureHttp } from "../scraper/testing/fixture-http";
import { FIXTURE_ROUTES } from "../scraper/testing/fixture-routes";

type LogEntry = { at: number; level: LogLevel; text: string };

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const option = (name: string) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
};

function fail(message: string): never {
  console.error(`Greška: ${message}`);
  process.exit(1);
}

const slug = option("partner") ?? fail("navedite --partner <slug>");
const dryRun = flag("dry-run");
const useFixtures = flag("fixtures");
const allowBlocked = flag("allow-blocked");
const maxRequests = option("max-requests") ? Number(option("max-requests")) : undefined;
const outFile = option("out");
if (argv.some((arg) => /prod/i.test(arg))) fail("relay radi samo nad DEV deploymentom.");

const config = getPartnerConfig(slug) ?? fail(`nepoznat partner "${slug}"`);
if (config.family === "manual" || config.status === "manual") fail("ponude ovog partnera se unose ručno, relay ih ne preuzima.");
if (!config.liveFetchAllowed && !useFixtures) {
  if (!allowBlocked) fail(`${config.name} čeka dozvolu (whitelist/feed). Pokrenite sa --allow-blocked samo sa računara koji je partner odobrio.`);
  console.warn(`UPOZORENJE: ${config.name} je blokiran za preuzimanje iz oblaka; nastavljam jer je zadato --allow-blocked.`);
}
const adapter = getAdapter(config.family) ?? fail(`nema adaptera za porodicu ${config.family}`);

const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";
const secret = process.env.SYNC_RELAY_SECRET ?? "";
if (!dryRun) {
  if (!/^https:\/\/[a-z0-9-]+\.convex\.site\/?$/.test(siteUrl)) fail("CONVEX_SITE_URL / NEXT_PUBLIC_CONVEX_SITE_URL nije podešen (.env.local).");
  if (!/^dev:/.test(process.env.CONVEX_DEPLOYMENT ?? "")) fail("CONVEX_DEPLOYMENT u .env.local nije DEV deployment.");
  if (secret.length < 32) fail("SYNC_RELAY_SECRET nedostaje; pokrenite node scripts/sync-relay-setup.mjs.");
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${siteUrl.replace(/\/$/, "")}/sync/relay/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) fail(`/sync/relay/${path} → HTTP ${response.status} ${data.error ?? ""}`);
  return data;
}

function classify(error: unknown) {
  const detail = (error as Error)?.message ?? String(error);
  if (error instanceof BlockedError || error instanceof RobotsDisallowedError) return { status: "blocked" as const, message: `${STATUS_MESSAGES.blocked} (${detail})` };
  if (error instanceof BudgetExceededError) return { status: "partial" as const, message: STATUS_MESSAGES.partial };
  if (error instanceof NetworkError) return { status: "network" as const, message: `${STATUS_MESSAGES.network} (${detail})` };
  if (error instanceof ParseError) return { status: "parse" as const, message: `${STATUS_MESSAGES.parse} (${detail})` };
  return { status: "failed" as const, message: `${STATUS_MESSAGES.failed} (${detail.slice(0, 200)})` };
}

async function main() {
  const log: LogEntry[] = [];
  const push = (level: LogLevel, text: string) => {
    log.push({ at: Date.now(), level, text: text.slice(0, 300) });
    if (level !== "info") console.warn(`${level}: ${text}`);
  };
  const env: AdapterEnv = { config, today: todayBelgrade(Date.now()), log: push };

  let runItemId: string | undefined;
  let budget = maxRequests ?? 60;
  let meta: MetaRow[] = [];
  if (!dryRun) {
    const started = await post<{ runItemId: string; requestBudget: number; meta: MetaRow[] }>("start", { partnerSlug: slug, allowBlocked, maxRequests });
    runItemId = started.runItemId;
    budget = started.requestBudget;
    meta = started.meta;
    console.log(`Uvoz ${config.name}: budžet ${budget} zahteva.`);
  }

  let http: HttpLike & { requestsUsed?: number };
  let fixtures: FixtureHttp | undefined;
  if (useFixtures) {
    const routes = FIXTURE_ROUTES[slug] ?? fail(`nema fixture ruta za "${slug}" (postoje: ${Object.keys(FIXTURE_ROUTES).join(", ")})`);
    fixtures = new FixtureHttp(routes, config);
    http = fixtures;
  } else {
    http = new PartnerHttpClient({ config, budget: { max: budget, used: 0 }, log: push });
  }
  const requestsUsed = () => (fixtures ? 0 : (http as PartnerHttpClient).requestsUsed);

  const offers: FinalOffer[] = [];
  const sent = { created: 0, updated: 0, unchanged: 0 };
  let parseErrors = 0;
  let processed = 0;
  const pending: FinalOffer[] = [];
  const flush = async (force = false) => {
    if (dryRun || !runItemId || (!force && pending.length < 25)) return;
    while (pending.length) {
      const batch = pending.splice(0, 25);
      const result = await post<{ created?: number; updated?: number; unchanged?: number }>("batch", {
        runItemId,
        offers: JSON.parse(JSON.stringify(batch)),
        requestsUsed: requestsUsed(),
        processed,
        parseErrors,
        log: log.splice(0),
      });
      sent.created += result.created ?? 0;
      sent.updated += result.updated ?? 0;
      sent.unchanged += result.unchanged ?? 0;
      processed = 0;
      parseErrors = 0;
    }
  };

  let outcome: { status?: "blocked" | "network" | "parse" | "failed" | "partial"; message?: string } = {};
  let listedIds: string[] = [];
  let discovered = 0;
  let discoveryComplete = false;
  let queueComplete = false;
  try {
    const result = await adapter.discover(http, env);
    listedIds = result.listedIds;
    discovered = result.items.length;
    discoveryComplete = result.complete && !useFixtures;
    for (const warning of result.warnings) push("warn", warning);
    let queue: DiscoveredItem[] = planFetch(result.items, meta, {
      mergeMode: adapter.mergeMode,
      refreshDays: config.refreshDays,
      maxAgeDays: config.maxAgeDays,
      today: env.today,
      now: Date.now(),
    });
    if (fixtures) queue = queue.filter((item) => fixtures!.has(item.url));
    console.log(`Pronađeno ${result.items.length} stavki; za preuzimanje ${queue.length}.`);
    const seen = new Set(queue.map((item) => item.key));
    let stopped = false;
    let networkStreak = 0;
    while (queue.length) {
      const item = queue.shift()!;
      try {
        const raw = await adapter.fetchDetail(http, item, env);
        const parsed = adapter.parse(raw, env);
        processed += 1;
        for (const warning of parsed.warnings) push("warn", warning);
        for (const followUp of parsed.followUps ?? []) {
          if (seen.has(followUp.key) || (fixtures && !fixtures.has(followUp.url))) continue;
          seen.add(followUp.key);
          queue.push(followUp);
        }
        const grouped: NormalizedOffer[] = adapter.mergeMode ? groupFragments(parsed.offers) : parsed.offers;
        for (const offer of grouped) {
          try {
            const final = finalizeOffer(offer, config, item.listSig);
            offers.push(final);
            pending.push(final);
          } catch (error) {
            parseErrors += 1;
            push("warn", `Ponuda ${offer.externalId} odbačena: ${(error as Error).message}`);
          }
        }
        await flush();
        networkStreak = 0;
      } catch (error) {
        // Same rule as the Convex worker: skip one failing page, stop on blocks, budget or 3 network errors in a row.
        networkStreak = error instanceof NetworkError ? networkStreak + 1 : 0;
        if (error instanceof BlockedError || error instanceof BudgetExceededError || networkStreak >= 3) {
          outcome = classify(error);
          stopped = true;
          break;
        }
        processed += 1;
        parseErrors += 1;
        push("warn", `Greška pri čitanju ${item.url}: ${(error as Error).message}`);
      }
    }
    queueComplete = !stopped && !useFixtures;
  } catch (error) {
    outcome = classify(error);
  }
  await flush(true);
  if (outcome.message) push(outcome.status === "partial" ? "warn" : "error", outcome.message);

  if (!dryRun && runItemId) {
    const finished = await post<{ status?: string; counts?: unknown }>("finish", {
      runItemId,
      listedIds,
      discovered,
      discoveryComplete,
      queueComplete,
      requestsUsed: requestsUsed(),
      outcome,
      log: log.splice(0),
    });
    console.log(`Završeno: ${finished.status ?? "?"}; nove ${sent.created}, izmenjene ${sent.updated}, bez promene ${sent.unchanged}.`);
  }
  if (outFile) writeFileSync(outFile, JSON.stringify(offers, null, 2));
  const priced = offers.filter((offer) => offer.departures.some((departure) => departure.price !== undefined) || offer.listPrice).length;
  console.log(
    `${dryRun ? "[dry-run] " : ""}${config.name}: ${offers.length} ponuda (${priced} sa cenom), zahteva ${requestsUsed()}${useFixtures ? " (fixture)" : ""}${outcome.status ? `, status ${outcome.status}` : ""}.`
  );
  for (const offer of offers.slice(0, 5)) {
    const next = offer.departures.find((departure) => departure.date >= env.today);
    console.log(`  - ${offer.title}${offer.place ? `, ${offer.place}` : ""} | ${next?.date ?? "bez termina"} | ${next?.price ?? offer.listPrice?.price ?? "na upit"} | ${offer.organizer?.name ?? config.organizer.name}`);
  }
}

main().catch((error) => fail((error as Error).message));
