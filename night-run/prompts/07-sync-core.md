# Step 07 — Partner Sync: šema, okvir i prvi adapteri
<!-- mode: auto · effort: xhigh · session: S4 (resume) -->

Plan approved. Execute part 1 of the Partner Sync plan you produced in step 06 (saved in `docs/plans/06-partner-sync.md`). Follow `night-run/NIGHT_RULES.md`.

1. Backup first: `npx convex export --path night-run/backups/07-<timestamp>.zip`.
2. Schema and migrations (backward compatible), the adapter contract, the shared HTTP client, Serbian parsing utilities, test setup with small fixtures in `scraper/__fixtures__/`.
3. Seed the partner registry with all 17 partners. Logo mapping (files in `public/partners/`): 01 Astra Travel, 02 Holiday, 03 Balkan Fun, 04 Holiday Plus KM, 05 Hellena Travel, 06 Big Blue, 07 SunLine, 08 Tomash Tours, 09 Jungman Travel, 10 Rapsody, 11 Mayak Tours, 12 Travellino, 13 Montesol, 14 Nitravel, 15 Ski & Sun, 16 Dunav Turs, 17 Viva Travel. Status: 11 active, 5 blocked ("Čeka dozvolu"), Holiday Plus KM manual.
4. Adapters with passing unit tests on fixtures: SunLine, Dunav Turs, MARS (Viva, Ski & Sun, Rapsody).
5. Ingest path: upsert into `offerCards` + `offerDetails` keyed by partner + externalId, content hash, change log, auto-publish per partner, expiry rule.
6. End-to-end check from a Convex action on DEV for ONE partner (SunLine), at most 10 live requests, then confirm the offers appear via a query.

Gate, commit (several commits are fine), "Korak 07" in the report with what each adapter extracts and any gaps.
