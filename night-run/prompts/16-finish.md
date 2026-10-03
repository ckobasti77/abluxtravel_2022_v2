# Step 16 — Završetak: dokumentacija i izveštaj
<!-- mode: auto · effort: medium · session: S9 (resume) -->

Continue in the same session and close the night.

1. `README.md`: what the project is, setup (env vars by name only), commands (dev, convex, build, lint, tests, QA, sync relay), architecture overview, where the design system lives.
2. `docs/RUNBOOK-sync.md`: how Partner Sync works (schedule 06:00, manual run and cooldown, statuses), how to add a partner or fix an adapter when a partner changes its site, how to enable a blocked partner after whitelisting (relay CLI on a fixed-IP machine), manual import, where logs are, what to do when a run fails.
3. `docs/UPUTSTVO-ADMIN.md` (Serbian, for the office manager): login and password change, inquiries, offers and overrides, partners and "Pokreni sada", content editing, settings; short, task-based, with screenshot paths from `night-run/qa/`.
4. `docs/PARTNER-EMAIL.md` (Serbian): a polite email template to partner agencies asking for (a) permission to show their offers, texts and photos on abluxtravel.com with the organizer named, (b) a feed/B2B access if they have one, (c) IP whitelisting for our sync if their host blocks automated access. Placeholders for the IP and contact person.
5. Put a summary at the TOP of `night-run/NIGHT_REPORT.md` (Serbian): what works and how to see it (local URLs, admin login via `night-run/SECRETS.local.md`), what to test first, known issues by severity, what is left for Thursday, and a 10-minute demo script for Friday built on current stock (Nova godina, Istanbul, Tunis, zima), not on expired summer offers.
6. Final gate and commit. Do not push.

## Do this FIRST (added by the run monitor, 1 Oct 14:50)

- Step 14 (QA) did not finish. Its session ended with "QA re-run is in progress; I'll finish the report and commit once it completes." and the background QA run died with the session; NIGHT_REPORT.md has no `## Korak 14` section. If step 15 already re-ran QA and recorded the result, only write that section. Otherwise re-run `scripts/qa/run-qa.mjs` the way step 14 ran it (exact command and env are in `night-run/logs/14-first.jsonl`), compare with `night-run/qa/14/summary-run1.md`, fix what is cheap and safe (contrast, missing labels and alt text, visible focus styles, the clipped "Osnovni podaci" heading, a graceful fallback for broken partner images such as the Big Blue redirect loop on `/aranzmani/turska`), run it again, and add `## Korak 14 — QA` to NIGHT_REPORT.md: what was checked, what was fixed, what remains.
- This run is headless: the session ends the moment you send your final message, and background processes die with it. Never end your turn while a check, server or script is still running. Run everything in the foreground and wait for it.
