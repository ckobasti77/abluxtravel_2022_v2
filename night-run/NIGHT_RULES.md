# Night run rules (read before every step)

You are one step of an unattended overnight run on the ABLux Travel project (Next.js 16, React 19, Convex, Tailwind v4, GSAP). Nobody is watching. Nobody can answer questions. Make the most reasonable decision, write it down in `night-run/DECISIONS.md` (one line: step, decision, why), and keep going.

## Sources of truth (read what your step needs)
- `docs/PLAN.md` — the approved plan (summary of the plan doc).
- `PRODUCT.md` — product truth. Do not invent facts, prices, testimonials, numbers or contact data.
- `DESIGN.md` + `docs/design/ablux-design-dna.json` — the visual system. The approved local homepage (hero down to the closing section) is the style authority. The old navy/cyan "SaaS glass" style is the anti-reference and must disappear everywhere, footer and admin included.
- `design/reference/` — screenshots of the approved homepage; `design/comps/` — design comps (when present, they are the quality bar for that screen).
- `docs/partners/` — research on the 17 partner agencies (platforms, selectors, endpoints, blocks). `docs/partners/raw/<slug>/` holds real saved HTML/JSON responses: use them as parser fixtures.
- Skills in `.claude/skills/` (impeccable, design-taste-frontend, ui-ux-pro-max, design-dna, motion-design). Use them for UI work. Where skills disagree, `DESIGN.md` and the approved homepage win.

## Hard safety rules
1. PRODUCTION IS OFF LIMITS. Never run `npx convex deploy`, never pass `--prod`, never run `vercel` / `npx vercel`, never `git push`, never change Vercel or Convex PROD env vars. The only Convex deployment you may touch is the DEV deployment from `.env.local` (`npx convex dev --once`, `npx convex run`, `npx convex env set` without `--prod`).
2. Never delete Convex DEV data in bulk and never "reset" tables. Schema changes must be backward compatible: add new fields as `v.optional(...)`, migrate with an internal mutation, and only then tighten. Before the first schema change in your step run `npx convex export --path night-run/backups/<step>-<timestamp>.zip` (DEV).
3. Secrets: never print, log or commit secrets. Never read `hostinger-recovery-codes.txt` or `payoneer-recovery-code.txt` if they still exist. `.env*` files stay gitignored.
4. Blocked partners (Holiday.rs, Balkan Fun, Travellino, Montesol, Jungman): never send live requests to their sites from this machine or from Convex. Work only with fixtures in `docs/partners/raw/`. They are shown in admin as "Čeka dozvolu (whitelist/feed)".
5. Live requests to the 11 accessible partners: respect robots.txt, at most 1 request per 1.5 s per host (Tomash: 10 s), honest User-Agent `ABLuxPartnerSync/1.0 (+https://www.abluxtravel.com; info@abluxtravel.com)`, and during this night at most ~60 requests per partner in total (use fixtures for development, live calls only for the verification import). Never call booking, inquiry, cart, calculator (`calc`, `get_hotel_price`, `*.asmx`, `*.ashx`) or form endpoints. Detect anti-bot pages by content (`wsidchk`, "One moment, please") and treat them as BLOCKED, never as data.
6. Do not touch files outside the project folder. Do not install global tools except what the step explicitly needs.

## Working rules
- Git: work on branch `ablux-2.0`. Commit at the end of your step (and at safe checkpoints) with a clear Serbian or English message prefixed with the step number, e.g. `[07] partner sync: MARS adapter`. Never rewrite history.
- Gate before you finish: `npx convex dev --once` (must succeed), `npm run lint` (no new errors), `npx tsc --noEmit` and `npm run build` (must succeed). If the gate fails and you cannot fix it within the step, revert the broken part (keep the rest), commit, and write the failure into `night-run/NIGHT_REPORT.md`.
- Append a short section to `night-run/NIGHT_REPORT.md` at the end of every step: what was done, what is missing, known issues, how to verify (URLs, admin paths). Serbian is preferred for this report (the owner reads it in the morning).
- UI copy is Serbian Latin first (`sr`), English second (`en`) via `lib/i18n.ts`. Use correct Serbian diacritics (č ć ž š đ). Tone: calm, warm, precise; "Vi" form. No emojis anywhere.
- Accessibility: WCAG 2.1 AA, body text ≥ 16px on mobile, touch targets ≥ 44px, visible focus, `prefers-reduced-motion` respected.
- Performance: animate only `transform`/`opacity`; lazy-load below the fold; partner images via plain `<img loading="lazy">` or `next/image` with `unoptimized` (do not burn Vercel image optimization quota on partner CDNs); HTTP-only partner images (Dunav Turs) must be copied to Convex storage or not shown (mixed content).
- Never fabricate business data. Placeholder contact data (+381 11 123 45 67, "Bulevar Putnika 22", info@abluxtravel2022.rs) is fake: read contact data from Convex `settings`; if empty, render a neutral fallback ("Kontakt podaci uskoro") and never the fake values.
- If a step depends on something that is missing (e.g. hero videos not delivered yet), build it so it works with what exists (posters/images) and picks up the missing piece automatically when the files appear.
- Keep the existing admin working at every commit: the owner must be able to log in and edit content after every step.
