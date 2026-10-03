# Step 01 — Priprema: pravila, dokumentacija, čišćenje, brze popravke
<!-- mode: auto · effort: high · session: S1 (new) -->

You are step 01 of the ABLux night run. Read `night-run/NIGHT_RULES.md`, `docs/PLAN.md` and `PRODUCT.md` first. The script already created branch `ablux-2.0` and committed the current working tree as a baseline.

## Tasks

1. **Rewrite `CLAUDE.md`** so every later session gets correct guidance. Keep what is still true (commands, routing, i18n, GSAP rules, Convex basics, path aliases). Replace what is outdated or contradicts the plan:
   - Styling: the design system is `DESIGN.md` + `docs/design/ablux-design-dna.json` (Cormorant Garamond + Manrope; Sora is being removed; themes "Papir" light default and "Tinta" dark).
   - Auth: describe the target (server-verified sessions and role checks in every admin Convex function; step 03 implements it). Mark the current `localStorage` auth and `AdminBootstrap` as legacy being removed.
   - Data: partner offers may have no price ("Cena na upit"); only ABLux programs use the cart and IPS deposit; partner offers use an inquiry flow.
   - Rendering: public content pages that matter for SEO (`/ponude`, `/ponude/[slug]`, `/aranzmani/[slug]`, destination pages) should be server-rendered with Convex server helpers; `"use client"` only for interactive leaves.
   - Partner Sync: short description of the target architecture from `docs/PLAN.md` and a pointer to `docs/partners/`.
   - Safety: production is never touched from this repo's automation (no `convex deploy`, no `--prod`, no `vercel`, no `git push`).
   Also rewrite `agents.md` into a short, precise version (keep the Context7 documentation note; drop hype).
2. **Create `DESIGN.md`** at the project root following `.claude/skills/impeccable/reference/document.md` (read it). Source of truth: the approved homepage code (`app/page.tsx`, `components/home-hero.tsx`, the `.ablux-*` rules in `app/globals.css`), `docs/design/ablux-design-dna.json`, screenshots in `design/reference/`, and the comps in `public/generated/concepts/`. It must cover tokens (both themes), typography with the Serbian diacritics rule, spacing, layout, components (button, input, chip, ticket card with notched corners and stamp, postcard with deckled border, brass number plate, dashed route line with pins, section heading with overline, nav, footer, table, dialog/sheet), motion, imagery rules (AI only for destinations, real photos never altered), and the admin "operate" mode. If the Impeccable documenter writes a sidecar file, keep it.
3. **Cleanup**
   - Move `public/generated/concepts/` to `design/comps/legacy/` (update references if any); they must not be served publicly.
   - Remove `.playwright-mcp/` from git tracking and add it to `.gitignore`. Also ignore `docs/partners/raw/`, `night-run/logs/`, `night-run/backups/`, `night-run/state.json`, `night-run/SECRETS.local.md`, `night-run/qa/`.
   - Remove the dependency `sanity-plugin-lucide-icon-picker` if nothing imports it.
4. **Quick fixes that are safe now**
   - `lib/use-offers.ts`: remove the demo fallback offers ("Mediteran Travel", etc.). With no data the UI must show a proper empty state, never fake offers.
   - `lib/use-settings.ts` defaults and `lib/seo.ts`: remove the fake contact data (+381 11 123 45 67, "Bulevar Putnika 22", info@abluxtravel2022.rs). Defaults become empty; UI renders a neutral fallback; JSON-LD omits missing fields. `SITE_URL` fallback becomes `https://www.abluxtravel.com`.
   - Theme bug in `components/site-preferences-provider.tsx`: after hydration the provider overwrites the theme set by the blocking script with "dark". Initialize from `document.documentElement.dataset.theme` (and the stored value), persist only when the user changes it, no flash.
5. **Baseline check:** run the gate from the rules and record the results (existing lint errors are fine to list, not to fix all).

## Done when
`CLAUDE.md`, `agents.md` and `DESIGN.md` exist and match the plan, the cleanup and quick fixes are in, the gate passes (or failures are documented), everything is committed, and `night-run/NIGHT_REPORT.md` has a "Korak 01" section.
