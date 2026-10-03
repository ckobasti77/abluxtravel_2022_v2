# Runbook: Partner Sync

Partner Sync imports the offers of 17 partner agencies into the ABLux catalog (`/ponude`). The design is in `docs/plans/06-partner-sync.md`, research per partner in `docs/partners/`, and code locations in `CLAUDE.md` → "Partner Sync". All commands below target the **DEV** deployment from `.env.local`. Never use `--prod` from this repository.

## 1. How it works

```
crons.ts (04:00 and 05:00 UTC)
  └─ sync/orchestrator:cronTick: starts only in the 06 hour Europe/Belgrade, once per cycle, if SYNC_CRON_ENABLED=true
       └─ startRunImpl → syncRuns + one syncRunItems row per partner
            └─ sync/worker:runItem ("use node", one per partner)
                 discover (list pages / sitemap / REST) → fetch in batches (≤ 7 min per call, reschedules itself)
                 → ingest:upsertBatch (idempotent by partner + externalId; content hash skips unchanged pages)
                 → ingest:finalizeItem (delisting only after a complete discovery and a sanity check,
                   expiry, offerChanges, partner counts, auto-publish)
crons.ts (23:10 UTC) → sync/ingest:expirySweep (hides offers whose last departure has passed)
```

- **Active offer:** listed by the partner now **and** has a future departure, or is explicitly "na upit".
- **Publishing:** automatic per partner (`autoPublish`). ABLux overrides (title, intro, categories, cover) and the "hidden" flag survive every re-import.
- **Request budget:** every request counts (robots.txt, retries, images) in a rolling 24 h window per partner. The registry caps (`scraper/registry.ts`) apply unless the Convex env `SYNC_DAILY_REQUEST_CAP` is set. It was set to `60` on DEV for the night of 2026-10-01.
  - To raise it: `npx convex env set SYNC_DAILY_REQUEST_CAP 800`.
  - To return to the registry caps: `npx convex env remove SYNC_DAILY_REQUEST_CAP`.
- **Etiquette:** robots.txt, ≥ 1.5 s between requests per host (Tomash 10 s, its Crawl-delay), and the User-Agent `ABLuxPartnerSync/1.0 (+https://www.abluxtravel.com; info@abluxtravel.com)`. Booking, calculator, cart and form endpoints are on a denylist. Anti-bot pages and TLS resets count as **blocked**, never as data.
- **Watchdog:** closes run items that are silent for 15 minutes.

### Statuses of a run item (admin → Partneri, `scraper/core/messages.ts`)

| Status | Meaning | Action |
|---|---|---|
| `ok` | Everything read | none |
| `partial` | Daily request cap reached or some pages not loaded | raise the cap or wait for the next day |
| `blocked` | Anti-bot page, Cloudflare or TLS reset | see section 4 (whitelist / feed) |
| `network` | Timeout or no response | retried at the next run; if it repeats, test with `sync/connectivity:probe` |
| `parse` | The site structure changed | fix the adapter (section 3) |
| `failed` | Internal adapter error | read the run log, fix the adapter |
| `cancelled` / `skipped` | Stopped by staff / not started (disabled, blocked, cap used, manual partner) | none |

## 2. Manual run ("Pokreni sada") and cooldown

- In admin: Partneri → "Pokreni sada" (asks for confirmation). Backend: `syncAdmin.requestManualRun` (editor role).
- There is one manual run per cycle (06:00 → 06:00). After it, the button is locked until the next 06:00 and shows a countdown. It is also locked while a run is active. The rules live in `scraper/core/cycle.ts` and are tested in `cycle.test.ts`.
- "Prekini uvoz" cancels a running import (`syncAdmin.cancelRun`).
- CLI (developer, ignores the cooldown, still respects the request budget):
  ```
  npx convex run sync/orchestrator:startRun '{"trigger":"cli","partners":["sunline"],"maxRequestsPerPartner":10}'
  npx convex run sync/orchestrator:startRun '{"trigger":"cli","forceRefetch":true}'   # re-read every page (after parser fixes)
  npx convex run sync/orchestrator:runStatus
  ```

## 3. Adding a partner or fixing an adapter

**When a partner changes its site** (status `parse` or `failed`, or a sudden drop in offers):

1. Save the new pages as fixtures: `docs/partners/raw/<slug>/` (gitignored), then run `node scripts/sync/make-fixtures.mjs` to copy them to `scraper/__fixtures__/`.
2. Fix the adapter for the partner's CMS family in `scraper/adapters/`:

   | Adapter | CMS family | Partners |
   |---|---|---|
   | `mars` | MARS / NeoLab | Viva, Ski & Sun, Rapsody |
   | `oktopod` | Oktopod | Astra, Hellena |
   | `tourpackage` | WordPress tourpackage | Mayak, Jungman |
   | `wp-roam` | WordPress Roam | Nitravel |
   | `wp-rest` | WordPress REST | Tomash |
   | `tourvisio` | TourVisio | Big Blue |
   | `bluevendo` | BlueVendo | SunLine |
   | `dunavturs` | custom | Dunav Turs |
   | `travelo` / `joomla` | parse only | blocked partners |

3. Add or adjust a test next to `scraper/adapters/step0*.test.ts` and run `npm test`. Tests never touch the network.
4. Push with `npx convex dev --once`. Test with a small live run, `"maxRequestsPerPartner":10`, then check `npx convex run sync/ingest:qualitySample '{"partnerSlug":"<slug>","n":5}'`. The sample shows title, place, next departure, price + basis, organizer and image.
5. Parser fixes reach already-imported offers only when they are read again. Use `forceRefetch` once.

**Adding a new partner:**

1. Add an entry to `scraper/registry.ts`: slug, hosts and path allowlist, family, delay, cap, `liveFetchAllowed`, organizer name and license if known.
2. Run `npx convex run sync/registry:seedPartners`. It is idempotent and creates or updates the `sources` row (the partner card in admin).
3. If the CMS family exists, reuse its adapter. Otherwise write a new adapter (discover + parse), register it in `scraper/adapters/index.ts`, and add fixtures and tests.
4. Test reachability first: `npx convex run sync/connectivity:ping`. To probe one URL: `npx convex run sync/connectivity:probe '{"partnerSlug":"<slug>","url":"…","kind":"…"}'`.
5. Pure modules only in non-`"use node"` Convex files (enforced by `convex/runtime-boundary.test.ts`).

**Data corrections without a re-import (CLI):**
- Hide or show cards by slug (same flag as "Sakrij" / "Vrati na sajt" in admin): `npx convex run offerAdmin:setHiddenInternal '{"slugs":["…"],"hidden":true}'`.
- Prices that cannot be euros (for example dinars printed with €) become "Cena na upit" automatically (`isPlausibleEurPrice`). For stored cards run `npx convex run sync/ingest:dropImplausiblePrices`.

## 4. Enabling a blocked partner (after whitelisting)

Holiday.rs, Balkan Fun, Travellino, Montesol and Jungman block cloud and data-center IPs. They are `status: "blocked"` in the DB, `liveFetchAllowed: false` in the registry, and shown in admin as "Čeka dozvolu (whitelist/feed)". Nothing contacts them until the steps below are done.

1. Ask the partner for permission and a feed, or for whitelisting of a fixed IP. Use the template in `docs/PARTNER-EMAIL.md`.
2. If they whitelist an IP: run the **relay CLI** from that machine. It runs the same adapters locally and posts the finalized offers to Convex:
   ```
   node scripts/sync-relay-setup.mjs                         # once: SYNC_RELAY_SECRET in Convex env and .env.local
   npm run sync:relay -- --partner <slug> --dry-run --max-requests 10 --allow-blocked
   npm run sync:relay -- --partner <slug> --allow-blocked
   ```
   The relay posts to `/sync/relay/{start,batch,finish}` with `Authorization: Bearer $SYNC_RELAY_SECRET`. It obeys the same budget, delisting and ingest rules. The manual partner (Holiday Plus KM) is always refused.
3. If they whitelist Convex instead (rare; Convex IPs are not fixed): set `liveFetchAllowed: true` in the registry, set the partner status to `active` in admin (owner only), then run a test run with `maxRequestsPerPartner` 10.
4. Schedule the relay daily (Windows Task Scheduler or cron) shortly after 06:00 if the partner stays relay-only.

## 5. Manual import (Holiday Plus KM and any partner without a website)

- Admin → Partneri → "Ručni unos" (`/admin/partneri/rucni-unos`). Upload a PDF, Excel, CSV or photo of a price list. The file is kept with the offers.
- Without `ANTHROPIC_API_KEY` on Convex: staff enter offers through the form. With the key: Claude Haiku 4.5 reads the file into **drafts**; nothing is published until a staff member checks and approves.
- Published manual offers go through the same catalog path (card, detail, change log) and can be edited or withdrawn on the same screen.

## 6. Logs and diagnostics

| What | Where |
|---|---|
| Runs and per-partner log (Serbian sentences) | Admin → Partneri → partner drawer (last 10 runs); "Istorija uvoza" (`/admin/partneri?prikaz=istorija`); tables `syncRuns`, `syncRunItems` (`log` field) |
| Changes (new, price, removed, expired) | Admin → "Nove i izmenjene" (`/admin/izmene`); table `offerChanges` |
| Requests per partner (24 h) | `npx convex run sync/ingest:requestLedger '{"hours":24}'` |
| Current run | `npx convex run sync/orchestrator:runStatus` |
| Function logs | `npx convex logs` (DEV) or the Convex dashboard → Logs |
| Remaining budget | `npx convex run sync/orchestrator:remainingBudget` |

## 7. When a run fails

1. Open Admin → Partneri. Read the status light and the message on the partner card, then open the drawer for the run log.
2. **`blocked`:** do not retry from Convex. Go to section 4.
3. **`partial` because of the cap:** this is expected while `SYNC_DAILY_REQUEST_CAP` is low. Raise it, or wait 24 h.
4. **`network`:** wait for the next run. If it repeats on 2 days, run `sync/connectivity:probe` for one URL.
5. **`parse` / `failed`:** save the page, fix the adapter (section 3), push, and run that partner via CLI with a small budget.
6. **A run hangs:** the watchdog closes items silent for 15 min. Otherwise use "Prekini uvoz" (or `syncAdmin.cancelRun`) and start again via CLI.
7. **A sudden drop in offers:** delisting is skipped when discovery is incomplete or the drop fails the sanity check, so the live catalog stays intact. Compare `qualitySample` with the partner's site before forcing anything.
8. **Wrong data on a public card** (price, country): hide it (`setHiddenInternal` or "Sakrij" in admin), fix the parser, re-read with `forceRefetch`, then show it again.
