# ABLux Travel

Website and admin for ABLux Travel, a travel agency in Belgrade (founded 2022). It sells its own programs (religious tourism first, European tours), resells the offers of 17 partner agencies as a subagent, and rents its own bus and van with a driver.

- **Public site:** Serbian Latin (primary) and English. A homepage with a living hero, a catalog of ABLux and partner offers with filters, an offer page with an inquiry form, a cart with IPS QR payment for ABLux programs only, religious tourism, destinations, vehicle rental, about and contact pages.
- **Admin (`/admin`):** inquiries and IPS orders, all offers with ABLux overrides, the import change feed, partners with "Pokreni sada", manual price-list import, content editors, settings, users and roles.
- **Partner Sync:** a daily import (06:00 Europe/Belgrade) of partner offers into one catalog. See [docs/RUNBOOK-sync.md](docs/RUNBOOK-sync.md).

Product truth lives in `PRODUCT.md`, the approved plan in `docs/PLAN.md`, the visual system in `DESIGN.md`, and guidance for Claude Code in `CLAUDE.md`. The admin guide for the office manager (in Serbian) is [docs/UPUTSTVO-ADMIN.md](docs/UPUTSTVO-ADMIN.md).

## Stack

Next.js 16 (App Router, `proxy.ts`), React 19, Convex (database, functions, file storage, cron jobs, auth via `@convex-dev/auth`), Tailwind CSS v4, GSAP (`@gsap/react`), Zustand, vitest, and Playwright for QA.

## Setup

1. Install Node 22+, then run `npm install`.
2. Link Convex: `npx convex dev` (first run). This writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.
3. Set up auth on the **DEV** deployment: `node scripts/auth-setup.mjs`. It sets `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` and `ABLUX_SERVER_SECRET`, and refuses non-dev deployments.
4. Create staff accounts: `node scripts/bootstrap-staff.mjs --email <e> --role owner|editor|customer --label "<text>"`. Passwords go only to the gitignored `night-run/SECRETS.local.md`.
5. Optional, for the Partner Sync relay: `node scripts/sync-relay-setup.mjs` (`SYNC_RELAY_SECRET`).

Environment variables (names only; never commit values):

| Where | Variables |
|---|---|
| `.env.local` (Next.js) | `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `ABLUX_SERVER_SECRET`, `SYNC_RELAY_SECRET`, `NEXT_PUBLIC_STRIPE_LIVE` (keep `false`), optional `NEXT_PUBLIC_SITE_URL`, `NBS_IPS_PAYEE_ACCOUNT`, `NBS_IPS_PAYEE_NAME`, `NBS_IPS_PAYMENT_CODE` |
| Convex env (`npx convex env set`, DEV) | `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `ABLUX_SERVER_SECRET`, `SYNC_CRON_ENABLED`, `SYNC_DAILY_REQUEST_CAP`, `SYNC_RELAY_SECRET`, optional `ANTHROPIC_API_KEY` (AI reading of price lists), `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (Stripe is on standby) |

Production needs its own key pair and secrets. That is a developer task; this repository's automation never deploys (see "Safety" in `CLAUDE.md`).

## Commands

| What | Command |
|---|---|
| Dev server | `npm run dev` (port 3000, Turbopack) |
| Convex (watch / push once) | `npx convex dev` / `npx convex dev --once` |
| Build / production server | `npm run build` / `npx next start -p 3137` |
| Lint / types | `npm run lint` / `npx tsc --noEmit` |
| Tests (no network, fixtures) | `npm test` |
| Security checks (DEV) | `node --env-file=.env.local scripts/security/check-access.mjs [--only anon\|customer\|editor\|owner\|signin\|orders]` |
| Auth e2e (browser) | `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 node --env-file=.env.local scripts/security/e2e-auth.mjs` |
| Full QA | `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 node --env-file=.env.local scripts/qa/run-qa.mjs [--out <dir>]` |
| Admin QA | `scripts/qa/admin-screens.mjs`, `admin-interactions.mjs`, `admin-undo.mjs` (same env) |
| Sync status / sample | `npx convex run sync/orchestrator:runStatus` / `npx convex run sync/ingest:qualitySample '{"partnerSlug":"mayak","n":5}'` |
| Sync relay | `npm run sync:relay -- --partner <slug> [--fixtures] [--dry-run] [--max-requests N]` |

Run this gate before every commit: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## Architecture

```
app/                 Next.js routes (Serbian URLs), server pages with fetchQuery, API routes
  api/ips/checkout   IPS QR order (prices from Convex, server secret)
  api/inquiries      inquiry form → Convex (server secret, hashed IP rate limit)
  admin/             admin shell; server-side role check in layout.tsx
components/          ui/ (design system), home/, catalog/, pages/, chrome/, admin/
convex/              schema, public/admin functions (requireRole), sync/ (Partner Sync), crons, http
  lib/               access, roles, audit, rate limits, pricing, catalog projection
scraper/             pure core (parsers, derive, cycle, merge) + Node HTTP client + adapters per CMS family
lib/                 hooks, i18n dictionaries, catalog filters, SEO helpers, admin copy/format
scripts/             security checks, QA, auth/staff setup, sync relay, fixtures
proxy.ts             Convex Auth cookies, /admin redirect (do not add middleware.ts)
```

- **Access:** every Convex function that is not "published data only" starts with `requireRole(ctx, "editor" | "owner")` or `requireServerSecret`. Every public function is classified in `scripts/security/function-access.json`.
- **Offers:** ABLux programs (`trips`, `accommodations`, religious `offers`) and partner offers (`offerCards` + `offerDetails`) share one catalog projection. Only ABLux programs go into the cart; partner offers use an inquiry.
- **Partner Sync:** cron → orchestrator → Node worker per partner (adapter: discover → fetch → finalize) → ingest (idempotent, content hash, ABLux overrides survive) → catalog.

## Design system

- `DESIGN.md` and `docs/design/ablux-design-dna.json` are the source of truth: the "putni dnevnik" world (paper, ink, gold, teal, brick), with the themes Papir (light) and Tinta (dark).
- Tokens live in `app/styles/tokens.css`. Shared components are in `components/ui/` (import from `@/components/ui`), with a QA page at `/dev/ui`.
- Page styles live in `app/styles/pages*.css`, admin styles in `app/styles/admin.css`.
- The homepage hero media are in `public/media/hero/` and described by `manifest.json`.
- Icons: lucide-react only, `strokeWidth={1.5}`.
# abluxtravel_2022_v2
