# Step 09 — Partner Sync: raspored, ručno pokretanje, pravi uvoz u DEV
<!-- mode: auto · effort: xhigh · session: S4 (resume) -->

Finish the Partner Sync plan (part 3). Follow `night-run/NIGHT_RULES.md`.

1. **Cron:** `convex/crons.ts` entries at 04:00 and 05:00 UTC that run only when the Europe/Belgrade hour is 6 and `SYNC_CRON_ENABLED === "true"`. Set `SYNC_CRON_ENABLED=true` on DEV (`npx convex env set`, no `--prod`).
2. **Orchestration:** per-partner jobs through the scheduler, batches with continuation, run log (`syncRuns` + items), error classification, auto-publish, expiry, change log.
3. **Manual run:** mutation `requestManualRun` (editor role) with the cooldown rule: one manual run per cycle, locked until the next 06:00 automatic run, and locked while a run is in progress. Query for the admin: status, last run, next automatic run time, whether the button is available and until when.
4. **Relay CLI** skeleton (`npm run sync:relay -- --partner <slug>`) + protected HTTP action ingest (shared secret env var on DEV). Do not run it against blocked partners.
5. **Connectivity test** from a Convex action: one request to each of the 11 accessible partners; record status codes/blocks.
6. **Real import into DEV** for the 11 accessible partners within the budget (at most ~60 requests per partner tonight, polite delays). Partial imports are fine. Then check data quality on a sample of 5 offers per partner (title, place, next departure, price and basis, organizer, image) and fix parser bugs you find.
7. Write a table into "Korak 09" of the report: partner → run status → offers imported → active (future departure) → issues. Also note the next automatic run time.

Gate, commit.
