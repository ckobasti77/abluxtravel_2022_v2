# Step 06 — Partner Sync: plan (plan mode)
<!-- mode: plan · effort: max · session: S4 (new) -->

You are step 06 of the ABLux night run, in plan mode: read and think, change nothing. Your final message is the plan; the script saves it to `docs/plans/06-partner-sync.md` and steps 07–09 (same session) execute it. Read `night-run/NIGHT_RULES.md`, `docs/PLAN.md` (Partner Sync section and owner decisions), `docs/partners/README.md` and all three `docs/partners/partners-*.md`, skim `docs/partners/raw/`, and read `convex/schema.ts` (`sources`, `offers`), `convex/offers.ts`, `lib/use-offers.ts`, `convex/categories.ts`.

## Owner decisions (fixed)
- Offers publish automatically after import. A per-partner on/off switch exists.
- Automatic import once a day at 06:00 Europe/Belgrade. Convex crons are UTC: schedule at 04:00 and 05:00 UTC and run only when the Belgrade local hour is 6 (DST-safe).
- Admin "Pokreni sada": one extra run per cycle; after a manual run the button stays locked until the next 06:00 automatic run. A run in progress also locks it. Show the countdown.
- Cron runs only when the DEV/PROD env var `SYNC_CRON_ENABLED` is "true" (set it on DEV in step 09).

## The plan must specify
1. **Schema:** extend `sources` into the partner registry (slug, name, website, logo, adapter family, status active/paused/blocked/manual, autoPublish, category mapping, commission %, organizer name and license, contact, lastRun fields, request budget); `offerCards` (slim, indexed for catalog filters, counts and sorting: partner, slug, title, country, place, type, transport, nights/days, next departure, priceFrom + basis + currency, cover image, status, published flag, updatedAt), `offerDetails` (departures with prices and availability, gallery, description HTML sanitized, program by day, included/excluded, organizer, source URL, content hash, ABLux overrides), `offerChanges`, `syncRuns` (+ per-partner run items), `syncState` (cooldown/next run), `inquiries`. What happens to the existing `offers` table and its hooks (migrate or keep for ABLux data). Respect Convex limits (1 s queries, 16 MiB/32k docs read, 1 MiB docs, Node action 10 min).
2. **Adapter contract** (TypeScript): `discover()`, `fetchDetail()`, `parse()` → `NormalizedOffer`; pure parsing functions testable on saved HTML/JSON; shared HTTP client (per-host rate limit, robots.txt check, honest UA, request budget, anti-bot detection by content, timeouts, retries), Serbian parsing utils (dates `dd.mm.`/`dd.mm.yyyy.`, ranges, "od 1.234 €", "na upit", nights/days, board codes ND/PP/PA/AI/UAI, transport).
3. **Adapter list and order:** step 07: SunLine, Dunav Turs, MARS (Viva, Ski & Sun, Rapsody). Step 08: Oktopod (Astra, Hellena), tourpackage (Mayak; Jungman fixtures only), WP Roam (Nitravel), WP REST (Tomash), TourVisio (Big Blue), anti-bot detection, manual import (Holiday Plus KM). For each: entry points, selectors/endpoints (from the research), what "active" means, price basis, organizer.
4. **Tests:** framework choice (vitest or node:test), fixtures copied from `docs/partners/raw/` into `scraper/__fixtures__/` (small), what each adapter test asserts.
5. **Orchestration in Convex:** cron entry, per-partner jobs via scheduler, batches of ~25 detail pages with continuation, idempotent upserts keyed by partner + externalId, content hash to skip unchanged pages, expiry rule (listed now AND future departure), auto-publish, ABLux overrides preserved, change log, run log, error classification (blocked / network / parse / partial).
6. **Images:** HTTPS partner images hotlinked (no Vercel optimization); HTTP-only (Dunav Turs) copied into Convex storage; featured offers copied into storage.
7. **Manual import** for partners without a site: upload PDF/Excel/photo; AI extraction only if `ANTHROPIC_API_KEY` exists on Convex DEV, otherwise a manual entry form; either way lands as normal offers.
8. **Relay CLI** (`npm run sync:relay -- --partner <slug>`): same adapters in Node, pushes normalized offers to a Convex HTTP action protected by a shared secret. Built, not run tonight.
9. **APIs for later steps:** public catalog queries for step 10 (filters, counts, pagination, detail by slug, similar offers, sitemap feed) and admin queries/mutations for step 13 (partner list with health, run history, manual run with cooldown, per-partner settings, offer overrides, bulk publish/hide/feature, changes feed). All admin functions use the role checks from step 03.
10. **Live verification budget** for step 09: at most ~60 requests per accessible partner tonight; blocked partners never.

Output a concrete, numbered plan with files, types, schema diffs and commands.
