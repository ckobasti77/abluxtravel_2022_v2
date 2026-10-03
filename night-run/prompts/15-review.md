# Step 15 — Nezavisni pregled (sveža sesija)
<!-- mode: auto · effort: xhigh · session: S9 (new) -->

You are step 15, a fresh reviewer who did not build any of this. Read `night-run/NIGHT_RULES.md`, `docs/PLAN.md`, `PRODUCT.md`, `DESIGN.md`, the whole `night-run/NIGHT_REPORT.md`, and look at `night-run/qa/` screenshots next to `design/reference/` and `design/comps/`.

Review, in this order, and fix what you find (at most two fix rounds, then stop):
1. **Security:** list every exported Convex function and confirm its access rule; call admin mutations and `orders.list` without auth using `ConvexHttpClient` against DEV and confirm they fail; confirm no secrets or passwords are in git (`git log -p` grep for the old hardcoded password and for key-like strings).
2. **Plan coverage:** each goal and owner decision in `docs/PLAN.md` → done / partial / missing.
3. **Partner Sync sanity:** counts per partner, sample prices and bases, organizers present, expired offers hidden, blocked partners never contacted (check logs), cooldown logic for "Pokreni sada" (unit test or script).
4. **Design fidelity:** the whole site and admin in the new world; no navy/cyan left (grep for old color values and class names); both themes; mobile hero composition; diacritics; comps' materials present (notched tickets, brass plates, stamps, routes). Use `.claude/skills/impeccable/reference/critique.md` and `audit.md`.
5. **Copy:** Serbian grammar and diacritics in UI strings, no fake data, no hype words, no emojis.

Write findings with severity and what you fixed into "Korak 15" of the report. Gate, commit.
