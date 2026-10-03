# Step 08 — Partner Sync: preostali adapteri i ručni uvoz
<!-- mode: auto · effort: xhigh · session: S4 (resume) -->

Continue executing the Partner Sync plan (part 2). Follow `night-run/NIGHT_RULES.md`. Develop only against fixtures in `docs/partners/raw/` and `scraper/__fixtures__/`; no live requests in this step.

1. Adapters with unit tests: Oktopod (Astra, Hellena — hotel pages without static prices become "Cena na upit"), WP "tourpackage" (Mayak; Jungman uses the same adapter, fixture-tested, status stays blocked), WP Roam (Nitravel — store the organizer, e.g. "Plan A Travel"), WP REST posts (Tomash — respect Crawl-delay 10 s in the client config), TourVisio inline JSON (Big Blue — stream/limit 3–6 MB pages, never call `.asmx/.ashx`, price is a total for 2 adults: store basis).
2. Anti-bot detection shared by all adapters (`wsidchk`, "One moment, please", TLS resets) → run status BLOCKED with a human message.
3. Travellino and Montesol: parsers from the Wayback fixtures only if time allows; their status stays blocked.
4. Manual import for Holiday Plus KM (and any partner later): admin upload of PDF/Excel/image stored in Convex; if `ANTHROPIC_API_KEY` is set on DEV, an action extracts offers (Claude Haiku 4.5, structured output) into drafts; otherwise a manual entry form creates the offers. Build the backend now; the admin UI comes in step 13.

Gate, commit, "Korak 08" in the report (table: partner → adapter → tests → known gaps).
