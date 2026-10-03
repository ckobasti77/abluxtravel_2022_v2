# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository. The approved direction is in `docs/PLAN.md` (ABLux Travel 2.0), product truth in `PRODUCT.md`, the visual system in `DESIGN.md`. When this file and those disagree, the plan wins; fix this file.

## Project

ABLux Travel — Belgrade travel agency (founded 2022). Own programs (religious tourism first, European tours), resale of 17 partner agencies' offers as a subagent, and charter with its own vehicles. Next.js 16 (App Router), React 19, Convex (backend + DB), Tailwind CSS v4, GSAP (`@gsap/react`), Zustand. Bilingual: Serbian Latin (`sr`, primary) and English (`en`).

## Safety (non-negotiable)

- **Production is never touched from this repo's automation.** No `npx convex deploy`, no `--prod` flag, no `vercel` / `npx vercel`, no `git push`, no changes to Vercel or Convex PROD env vars. Work locally against the Convex DEV deployment from `.env.local` only (`npx convex dev`, `npx convex dev --once`, `npx convex run`, `npx convex env set` without `--prod`).
- Never bulk-delete or reset Convex data. Schema changes are backward compatible: add fields as `v.optional(...)`, migrate with an internal mutation, then tighten. Export a DEV backup before the first schema change (`npx convex export --path night-run/backups/...`).
- Never print, log or commit secrets; `.env*` stays gitignored. Do not open recovery-code files.
- Never fabricate business data: no invented prices, testimonials, counts, contact data. Contact data comes only from Convex `settings`; if empty, render a neutral fallback ("Kontakt podaci uskoro") — never placeholder values.

## Commands

- Dev server: `npm run dev` (Next.js 16 with Turbopack, the default bundler; do not add `--webpack`)
- Build: `npm run build`
- Lint: `npm run lint` (ESLint 9 flat config, Next core-web-vitals + TypeScript; `.claude/`, `docs/partners/raw/`, `night-run/`, `design/`, `skills/` are ignored)
- Types: `npx tsc --noEmit`
- Convex: `npx convex dev` (watch) or `npx convex dev --once` (push schema/functions to DEV once)
- Tests: `npm test` (vitest; `scraper/**/*.test.ts`, `convex/**/*.test.ts`, `lib/**/*.test.ts`; no network — adapters run on fixtures in `scraper/__fixtures__/`, regenerated from `docs/partners/raw` by `node scripts/sync/make-fixtures.mjs`). Gate before committing: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- Security checks (DEV only): `node --env-file=.env.local scripts/security/check-access.mjs [--only <group>]` (Convex access, login, legacy migration, server prices) and `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3000 node --env-file=.env.local scripts/security/e2e-auth.mjs` (browser: login/logout, admin guard, checkout). Results go to `night-run/qa/`.
- Full QA (step 14): `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 node --env-file=.env.local scripts/qa/run-qa.mjs [--only <route>] [--skip admin,crawl,axe,focus] [--out <dir>]` against `next start -p 3137`: public routes at 1440/390 in Papir and Tinta, admin as the QA editor, axe (serious/critical), focus, overflow, alt, link crawl, diacritics, reduced motion; screenshots + `report.json` in `night-run/qa/14/` (gitignored).
- Auth setup (DEV only, idempotent): `node scripts/auth-setup.mjs` sets `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `ABLUX_SERVER_SECRET`. Staff/QA accounts: `node scripts/bootstrap-staff.mjs --email <e> --role owner|editor|customer --label "<text>"` (random password, written only to the gitignored `night-run/SECRETS.local.md`). Both scripts refuse non-dev deployments and never print secrets.

## Routing (App Router, Serbian URLs — keep them stable for SEO)

- `/` homepage (approved "putni dnevnik" design; hero "Živa razglednica")
- `/ponude` catalog of ABLux + partner offers; `/ponude/[slug]` partner offer detail (planned)
- `/aranzmani`, `/aranzmani/[slug]` ABLux programs (cart + IPS deposit)
- `/verski-turizam`, `/destinacije`, `/putovanja`, `/putovanja/[zemlja]`, `/zemlje`
- `/iznajmljivanje-vozila`, `/o-nama`, `/kontakt`
- `/auth` (plus legacy `/signin`, `/signup`)
- `/admin` (Pregled) with `upiti` (inquiries + IPS orders inbox), `ponude` (all offers, `?ponuda=<id>` opens the drawer), `izmene` (change feed), `partneri` (`?partner=<slug>`, `?prikaz=istorija`, `?pokreni=1`), `partneri/rucni-unos` (manual import, `?novo=1`), content editors `pocetna`, `aranzmani`, `putovanja`, `verski-turizam`, `iznajmljivanje-vozila`, and `podesavanja` (contact/social), `podesavanja/korisnici` (password; roles for the owner), `podesavanja/dnevnik` (audit log, owner)
- `/ponuda` permanently redirects to `/aranzmani` (`next.config.ts`)
- API routes: `app/api/ips/checkout`, `app/api/home-swiper-images`

## Rendering

Public pages that matter for SEO (`/ponude`, `/ponude/[slug]`, `/aranzmani/[slug]`, destination pages) should be **server components** that load data with the Convex server helpers (`fetchQuery` / `preloadQuery` from `convex/nextjs`), export `generateMetadata`, JSON-LD and sitemap entries. `"use client"` only for interactive leaves (filters, cart button, forms, animations). Many pages are still fully client-rendered; convert them as you touch them.

## Backend (Convex)

`convex/schema.ts` tables: Convex Auth `authTables` (`authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`), `users` (extended), `settings`, `categories`, `trips`, `accommodations`, `destinations`, `slides`, `homeRouteSlides`, `vehicleRentalImages`, `sources`, `offers`, `orders`, `auditLog`, `rateLimits`, plus the Partner Sync tables (see below). Function files: `auth` (Convex Auth), `users`, `authLegacy`, `audit`, `rateLimits`, `trips`, `accommodations`, `destinations`, `categories`, `offers`, `orders`, `slides`, `homeRouteSlides`, `vehicleRentalImages`, `settings`, `files`, `stripe`, `http`, `crons`, `syncAdmin`, `partners`, `offerAdmin`, `manualImport`, `manualImportNode`, `inquiries`, `inbox`, `sync/*`; shared helpers in `convex/lib/` (`access`, `roles`, `audit`, `rateLimit`, `serverSecret`, `passwords`, `pricing`, `constants`, `syncValidators`, `catalogCards`, `relaySecret`, `profile`, `inbox`). Generated types in `convex/_generated/`. The React client is created in `app/providers.tsx`.

Convex limits to design around: query/mutation 1 s and 16 MiB read / 32,000 docs scanned; Node action 10 min, 512 MiB; document 1 MiB.

Client hooks in `lib/` wrap queries/mutations (`use-trips`, `use-accommodations`, `use-destinations`, `use-categories`, `use-offers`, `use-slides`, `use-settings`, `use-session`, ...). Hooks return empty data when Convex has none — never demo fallbacks; the UI shows an empty state.

## Auth

- **Convex Auth** (`@convex-dev/auth`) with a custom password provider (`convex/auth.ts`, `ConvexCredentials` id `"password"`, Scrypt). Next.js integration: `proxy.ts` (Next 16 proxy; proxies `POST /api/auth`, refreshes httpOnly cookies, redirects anonymous `/admin` to `/auth`), `ConvexAuthNextjsServerProvider` in `app/layout.tsx` (all pages render dynamically), `ConvexAuthNextjsProvider` in `app/providers.tsx`. Never add a `middleware.ts` next to `proxy.ts`.
- **Roles** on `users.role`: `owner` > `editor` > `customer`. Owner: everything incl. users/roles (`/admin/podesavanja/korisnici`) and the audit log. Editor (office manager): content, orders/inquiries, contact settings. Customer: own account. Legacy values `admin`/`user` map to `customer` in `normalizeRole()`; only `scripts/bootstrap-staff.mjs` grants `owner`. New staff register at `/auth`, then the owner assigns "Urednik".
- **Rule for every Convex function:** a query returning only published data needs no check. Everything else starts with `const viewer = await requireRole(ctx, "editor" | "owner")` (`convex/lib/access.ts`; actions: `requireRoleInAction`; Next server → Convex: `requireServerSecret(args.secret)` with `ABLUX_SERVER_SECRET`), and staff mutations call `audit(ctx, viewer, {...})`. Public list queries take an optional `includeInactive` that requires the editor role; default results contain only active rows. Classify every new public function in `scripts/security/function-access.json` (the check script fails otherwise). Errors are `ConvexError` string codes (`UNAUTHENTICATED`, `FORBIDDEN`, ...).
- **Client:** `useSession()` / `useSessionState()` (`lib/use-session.ts`) come from `users.me` (verified by Convex); use `session.isStaff` / `session.isOwner`, never a role from the browser. Sign-in/out with `useAuthActions()` from `@convex-dev/auth/react`. `app/admin/layout.tsx` checks the session on the server; `components/admin/admin-frame.tsx` re-checks on the client.
- **Legacy accounts:** old SHA-256 customer hashes are verified once at sign-in and rehashed (`convex/authLegacy.ts`); legacy admin hashes are never accepted. `users:migrateLegacyUsers` (internal, idempotent) maps old roles.
- **Abuse protection:** Convex Auth throttles failed logins per account (10/h); `convex/lib/rateLimit.ts` (`consumeRateLimit` + `RATE_LIMITS`, never throws) for sign-up, legacy login, checkout and inquiries; honeypot field `website` (class `form-honeypot`) on sign-up and checkout. Rate-limit keys never contain raw emails/IPs (hashed).
- **Env:** Convex DEV: `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `ABLUX_SERVER_SECRET`; `.env.local`: `ABLUX_SERVER_SECRET`. Production (later, by a developer): new key pair, `SITE_URL=https://www.abluxtravel.com`, new `ABLUX_SERVER_SECRET` on Convex PROD and Vercel; after deploy run `users:migrateLegacyUsers` and bootstrap the owner; only then tighten `users.role` and drop `username`/`passwordHash`.

## Data rules: offers, prices, cart

- Two kinds of offers: **ABLux programs** (`trips`, `accommodations`, religious offers) and **partner offers** (imported by Partner Sync).
- Partner offers may have **no price** → render "Cena na upit". When priced: "od X €" + basis (po osobi / po apartmanu / ukupno za 2) + note that payment is in dinars at the NBS middle rate. Every partner offer shows the organizer (and license when known) and links to the organizer's original program.
- **Only ABLux programs use the cart and the IPS QR deposit** (`lib/store/use-cart-store.ts`, `lib/ips-payment.ts`, `app/api/ips/checkout`): trips (active/upcoming), their accommodations, non-subagency destinations and `manual-verski` religious offers (`convex/lib/pricing.ts`). The browser sends only ids and quantities; `orders.quote` / `orders.createIpsOrder` price everything from the database and the order is stored only through the Next route (server secret). The amount is the full price (no deposit logic yet). Partner offers use an inquiry flow ("Rezerviši / Pošalji upit"), stored as `inquiries`. Admin inbox (`/admin/upiti`, `inbox.list`): inquiries and orders share the statuses novo / u obradi / potvrđeno / otkazano (order `pending` = novo, `paid` = potvrđeno), with assignee, append-only staff notes and, for orders, the IPS payment status confirmed by hand (`inquiries.update`, `orders.update`).
- Stripe (`convex/stripe.ts`, `convex/http.ts`) is standby: `NEXT_PUBLIC_STRIPE_LIVE=false` must be respected (no redirect to Stripe).

## Partner Sync (see `docs/PLAN.md`, `docs/plans/06-partner-sync.md` and `docs/partners/`)

- **Schedule:** `convex/crons.ts` calls `sync/orchestrator:cronTick` at 04:00 and 05:00 UTC; it starts a run only in the 06 hour Europe/Belgrade (DST-safe), once per cycle, and only when Convex env `SYNC_CRON_ENABLED === "true"`. `sync/ingest:expirySweep` runs daily at 23:10 UTC regardless. Cycle and manual-run rules are pure code in `scraper/core/cycle.ts` (one manual run per cycle, locked while a run is active and until the next 06:00).
- **Run pipeline:** `startRunImpl` (orchestrator) creates `syncRuns` + one `syncRunItems` row per partner and schedules `sync/worker:runItem` ("use node"): discover → fetch batches (`batchSize`, ≤ 7 min per invocation, re-schedules itself) → `finalizeItem` (delisting only after a complete discovery and a sanity check, expiry, `offerChanges`, partner counts). A watchdog closes items silent for 15 min. Errors are classified into Serbian admin messages (`scraper/core/messages.ts`).
- **Budget (D6):** every request counts (robots, retries, images) in a rolling 24 h window per partner; env `SYNC_DAILY_REQUEST_CAP` overrides the registry caps (night of 2026-10-01: `60`). Ledger: `npx convex run sync/ingest:requestLedger '{"hours":24}'`.
- **Code:** `scraper/registry.ts` (17 partners, hosts/path allowlists, delays, caps), `scraper/core/` (pure: types, derive, hash, time, cycle, merge, normalize, manual, parsers; Node-only: `http` = polite client with robots/delays/budget/anti-bot/denylist, `html`, `matrix`, `sanitize`, `finalize`), `scraper/adapters/` (bluevendo, dunavturs, mars, oktopod, tourpackage, wp-roam, wp-rest, tourvisio; travelo/joomla parse-only for blocked partners). Non-`"use node"` Convex files may import only pure modules (`convex/runtime-boundary.test.ts`).
- **Convex files:** `convex/sync/{registry,orchestrator,ingest,worker,relay,connectivity,images,imagesDb}.ts`; admin APIs `convex/syncAdmin.ts` (status, `requestManualRun`, cancel, runs, changes, overview), `convex/partners.ts` (`setStatus` is owner-only), `convex/offerAdmin.ts` (offers, overrides, bulk publish/hide/feature), `convex/manualImport.ts` + `manualImportNode.ts` (Holiday Plus KM: upload → drafts via Claude Haiku 4.5 when `ANTHROPIC_API_KEY` is set, otherwise the manual form).
- **Data model:** `sources` (partner registry; `isEnabled` = owner switch), `offerCards` (catalog) + `offerDetails` + `offerSyncMeta`, `offerChanges`, `syncRuns`, `syncRunItems`, `syncQueue`, `syncState`, `partnerImages`, `inquiries`, `manualImports`, `offerDrafts`. The old `offers` table keeps only ABLux religious offers (`manual-verski`). Active = listed by the partner now AND a future departure (or explicit "na upit"). ABLux overrides survive re-imports.
- **Commands (DEV):** connectivity `npx convex run sync/connectivity:ping`; run `npx convex run sync/orchestrator:startRun '{"trigger":"cli","partners":["sunline"],"maxRequestsPerPartner":10}'`; status `npx convex run sync/orchestrator:runStatus`; sample `npx convex run sync/ingest:qualitySample '{"partnerSlug":"mayak","n":5}'`; hide/show cards by slug `npx convex run offerAdmin:setHiddenInternal '{"slugs":["..."],"hidden":true}'`. Daily/nightly prices that cannot be euros (`isPlausibleEurPrice` in `scraper/core/derive.ts`) become "Cena na upit"; JSON-LD is always serialized with `jsonLdText` (`lib/seo.ts`).
- **Relay CLI:** `npm run sync:relay -- --partner <slug> [--max-requests N] [--dry-run] [--fixtures] [--out f.json] [--allow-blocked]` posts to `/sync/relay/{start,batch,finish}` (HTTP actions, `Authorization: Bearer $SYNC_RELAY_SECRET`); `node scripts/sync-relay-setup.mjs` creates the secret (DEV env + `.env.local`). Blocked partners only with `--allow-blocked` from a whitelisted machine; the manual partner is always refused.
- **Crawling etiquette:** respect robots.txt, ≤ 1 request / 1.5 s per host (Tomash 10 s), User-Agent `ABLuxPartnerSync/1.0 (+https://www.abluxtravel.com; info@abluxtravel.com)`. Never call booking, inquiry, cart, calculator (`calc`, `get_hotel_price`, `*.asmx`, `*.ashx`) or form endpoints. Anti-bot pages (`wsidchk`, "One moment, please", Cloudflare) and TLS resets = BLOCKED, never data.
- **Blocked partners** (Holiday.rs, Balkan Fun, Travellino, Montesol, Jungman): `status: "blocked"` in the DB and `liveFetchAllowed: false` in the registry; no live requests from dev machines or Convex; fixtures in `docs/partners/raw/<slug>/` (gitignored) and `scraper/__fixtures__/`.
- **Images:** HTTPS partner images are hotlinked (plain `<img loading="lazy">` or `next/image` with `unoptimized`). HTTP-only images (Dunav Turs) and covers of featured offers are copied to Convex storage after the import (`sync/images:copyForPartner`, within the daily budget); a card with only an `http://` cover and no `coverStorageId` shows no image.
- **Env (Convex DEV):** `SYNC_CRON_ENABLED`, `SYNC_DAILY_REQUEST_CAP`, `SYNC_RELAY_SECRET`, optional `ANTHROPIC_API_KEY`; `.env.local`: `SYNC_RELAY_SECRET`, `NEXT_PUBLIC_CONVEX_SITE_URL`. Production gets its own values later (developer).

## Design system

- Source of truth: `DESIGN.md` + `docs/design/ablux-design-dna.json`. The approved homepage (`app/page.tsx` server page → `components/home/*`: `home-hero.tsx` "Živa razglednica" from `public/media/hero/manifest.json` via `lib/home/hero-manifest*.ts`, `home-sections.tsx`, `home-motion.tsx` scroll morph; `.ablux-*` rules in `app/styles/home.css`) is the style authority; reference screenshots in `design/reference/`, comps in `design/comps/` (legacy comps in `design/comps/legacy/`, not served publicly).
- World: "putni dnevnik" — paper, ink, gold, teal, brick; tickets, postcards, stamps, brass number plates, dashed routes with pins. The old navy/cyan "SaaS glass" style is the anti-reference and must disappear everywhere (footer and admin included).
- Themes: **"Papir" (light, default)** and **"Tinta" (dark)** via `html[data-theme]`. A blocking script in `app/layout.tsx` sets the theme before paint; `SitePreferencesProvider` reads it and persists only on user change.
- Fonts: EB Garamond (display, `--font-editorial`, with `latin-ext`; replaced Cormorant in step 04 because Cormorant draws floating carons on č/ž/š) + Manrope (UI/body, `--font-manrope`). Sora is gone. Serif headings: line-height ≥ 1.1 plus caron padding, no tight `overflow: hidden`.
- CSS: `app/globals.css` only imports `app/styles/`: `tokens.css` (Papir/Tinta on `[data-theme]`; Tailwind `@theme` utilities such as `bg-surface`, `text-fg-muted`, `border-line`, `text-accent-fg`, `font-serif`), `base.css` (`@layer base`), `components.css` (`@layer components`, `ui-*`), then unlayered `chrome.css` (nav/footer, step 05), `catalog.css` (step 10), `legacy.css` (remaining old rules, mostly admin; delete rules as pages move to `components/ui`), `home.css`, and `pages.css` + `pages/*.css` (public pages, step 12: shared `.pg-*` frame and `components/pages/page-hero.tsx`, one file per page group). Legacy vars (`--bg`, `--primary`, …) are aliases of the new tokens. `node scripts/design/css-usage.mjs <file.css>` lists classes that no source file uses.
- Components: `components/ui/` (Button, Field/Input/Select/Textarea, Chip/Badge/StatusDot, TicketCard, Postcard, BrassPlate, RouteLine, SectionHeading, Stamp, Price, Skeleton, EmptyState, Dialog/Sheet, Tabs, Accordion, DataTable, Toast via `useToast()`; motion: `useReveal`, `useRouteDraw`, `Reveal`). Import from `@/components/ui`. QA page: `/dev/ui` (noindex). Paper objects wrap their inside in `.ui-paper` so they stay paper in Tinta. Icons: lucide-react at `strokeWidth={1.5}`; brand glyphs in `components/ui/brand-glyphs.tsx`.
- Chrome (step 05): `components/site-navigation.tsx` (+ `components/chrome/`: mega menu, mobile ink menu, SR/EN + theme controls, lost-ticket 404/error), `components/site-footer.tsx`, `components/quick-actions.tsx`; styles in `app/styles/chrome.css`. The nav is transparent over `.ablux-hero` / `[data-page-hero]` and shows the sticky search pill after it. Chrome copy lives in `dictionary.chrome` (`lib/i18n-chrome.ts`). `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`.
- Search "Kuda putujete?": `components/search/trip-search.tsx` (`variant="bar"` for the hero, `"panel"` in the dialog/sheet). URL contract `/ponude?tip=<travel type>&mesec=YYYY-MM&putnika=N&polazak=<grad>` (`lib/search/trip-search.ts`, travel types in `lib/search/travel-types.ts`). Live counts come from the adapter `useSearchCandidates()`; step 10 swaps only that hook to the catalog query.
- Admin uses "operate" mode: same tokens, Manrope only, dense and calm. Shell (step 13): `components/admin/admin-frame.tsx` (sidebar `admin-sidebar.tsx`, collapsible, drawer on phones; `admin-topbar.tsx` with the page h1, Ctrl+K `command-palette.tsx`, user menu), screen registry `lib/admin/nav.ts`, screens in `components/admin/screens/`, building blocks in `components/admin/kit.tsx` (`PageIntro`, `Panel`, `Stat`, `Sheet` drawer, `useConfirm`, `Switch`, `Segment`, `BulkBar`, `Thumb`), copy pairs `useAdminT()` and formatters in `lib/admin/format.ts`, status labels in `lib/admin/labels.ts`, styles `app/styles/admin.css` (`.adm-*`). Toasts with "Poništi" for reversible changes, `useConfirm` for destructive ones; a modal `Sheet` registers itself with `useToastOutlet` so toasts stay clickable above it. QA: `scripts/qa/admin-screens.mjs`, `admin-interactions.mjs`, `admin-undo.mjs`.
- Imagery: AI only for destinations; real photos (vehicles, interiors, team, trips) are never altered by AI. Off-brand stock (`pocetna*.avif`, `kontakt-hero.avif`, `plane.avif`, `background*.avif`) is not used in new work.
- UI skills in `.claude/skills/` (impeccable, design-taste-frontend, ui-ux-pro-max, design-dna, motion-design); where they disagree, `DESIGN.md` wins.

## i18n and copy

`lib/i18n.ts` holds the `DICTIONARY` (`sr`, `en`). `SitePreferencesProvider` (`components/site-preferences-provider.tsx`) exposes `language`, `theme`, `dictionary`; use `useSitePreferences().dictionary`. Preferences live in localStorage (`ablux_language`, `ablux_theme`). Copy: Serbian Latin first with correct diacritics (č ć ž š đ), calm, warm, precise, formal "Vi", no hype, no emojis. Partner content is Serbian-only; on `en` show a note that the program is in Serbian.

## Animations (GSAP)

- Always use `@gsap/react` and the `useGSAP` hook (proper cleanup in React 19).
- Scroll-bound video: map `video.currentTime` directly to a `ScrollTrigger` timeline. Never mix `.play()`/native playback with scroll scrubbing.
- Heavy transitions (masks, overlay sweeps) are DOM elements (WebP/PNG/Lottie) animated with transforms on the shared timeline, not baked into the video.
- Animate only `transform`/`opacity`; respect `prefers-reduced-motion`.

## Accessibility and performance

WCAG 2.1 AA; body text ≥ 16px on mobile; touch targets ≥ 44px; visible focus. Lazy-load below the fold; image formats AVIF/WebP (`next.config.ts`); fast on a phone on mobile data.

## Conventions

- Path alias `@/*` → project root (`@/lib/...`, `@/components/...`, `@/convex/...`).
- Country slugs via `lib/country-route.ts` (latinization đ→dj, č→c, ć→c, š→s, ž→z). SEO constants in `lib/seo.ts` (`SITE_URL` fallback `https://www.abluxtravel.com`).
- Git: branch `ablux-2.0`; commit with a clear message; never rewrite history, never push.
