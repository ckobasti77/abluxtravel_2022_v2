# ABLux Travel 2.0 — approved plan (summary for the night run)

Full plan (Serbian, with tables and the Partner Sync diagram) lives in the owner's Claude doc "ABLux Travel 2.0 — plan redizajna i Partner Sync". This file is the working summary. Owner decisions from 2026-09-30 are marked **[odluka]**.

## Goals for Friday's client demo
1. The whole public site and the admin in the visual world of the approved local homepage ("putni dnevnik": paper, ink, gold, teal, brick; tickets, postcards, stamps, routes).
2. A living hero ("Živa razglednica") made from ChatGPT (GPT Image 2) keyframes and Google Flow (Veo 3.1) loops.
3. Partner Sync: automatic daily import of partner agencies' offers into one public catalog.
4. Real authentication and authorization (the current admin is protected only in the browser and every Convex function is public).

## Owner decisions [odluka]
- Production is not touched at all. Everything stays local + Convex DEV. No git push, no deploy.
- Partner offers are published automatically right after import (no review inbox as a gate). Keep an admin "Nove i izmenjene" view for information and a per-partner on/off switch.
- Import schedule: once a day at 06:00 Europe/Belgrade. Admin has a "Pokreni sada" button for an extra run; after a manual run the button is locked until the next 06:00 automatic run (show a countdown).
- Hero material: combination. AI keyframes + Veo loops for destinations (home, religious tourism); real photos for the bus, van, interiors, team, with motion done in code (slow zoom, parallax, warm grade). One or two Veo tests on real photos without people; rejected if Veo alters the vehicle.
- Claude plan: Max 20x.

## Findings to fix (from the audit)
- CRITICAL: no Convex function checks the caller (`trips.remove`, `orders.list` with customer PII, `orders.updateStatus`, `files.deleteById`, `settings.upsert`, ...). Admin gating is client-side only (`localStorage` role).
- CRITICAL: admin password hardcoded in `convex/auth.ts`; public `ensureAdminUser` mutation is called on every page load and resets the password hash.
- `orders.create` and `app/api/ips/checkout` trust prices sent by the browser.
- Fake contact data in `lib/use-settings.ts` defaults and `lib/seo.ts` (shown in the production footer).
- Demo fallback offers in `lib/use-offers.ts` ("Mediteran Travel", past dates, "Dodaj u korpu").
- Only the homepage uses the new style; footer, 11 other pages and the admin are old navy.
- Almost all pages are `"use client"`; Google sees loading states. Partner offers need server rendering, metadata, JSON-LD, sitemap.
- Theme bug: after hydration the provider overwrites the stored theme with "dark" (light never persists, flash).
- Hero search is decorative (buttons without behavior).
- Homepage is hardcoded; the "Početna" admin module no longer affects it.
- Cormorant headings: carons on č/ž float and get clipped ("Najtraženije", "vozačem"); latin-ext is already loaded, so check line-height/overflow/glyph composition, switch the display face only if needed.
- Mobile hero: dome behind buttons, ticket strip cut, chat FAB overlaps the booking bar.
- Cleanup: two icon libraries, unused `sanity-plugin-lucide-icon-picker`, `.playwright-mcp` logs, 5,600-line `globals.css`, 14 MB of design comps in `public/generated/concepts` served publicly (move to `design/comps/legacy/`).

## Partner Sync (see `docs/partners/` for per-site details)
- Accessible now (11): Viva, Mayak, Astra, Hellena, Nitravel, Tomash (crawl-delay 10 s), Ski & Sun, Rapsody, Big Blue, SunLine, Dunav Turs.
- Blocked from cloud IPs (5): Jungman (TLS reset), Travellino and Montesol (JS challenge), Balkan Fun and Holiday.rs (Imunify360). Never fetched live tonight. Jungman gets the Mayak adapter tested on fixtures.
- No website: Holiday Plus KM → manual import of a PDF/Excel price list in admin (AI extraction optional, only if `ANTHROPIC_API_KEY` exists on Convex DEV; otherwise manual entry form).
- Adapter families: MARS/NeoLab (Viva, Ski & Sun, Rapsody), Oktopod PHP CMS (Astra, Hellena), WP "tourpackage" (Mayak, Jungman), WP Roam (Nitravel), WP REST posts (Tomash), SAN TSG TourVisio inline JSON (Big Blue), Nuxt/BlueVendo JSON (SunLine), custom PHP (Dunav Turs).
- Data model: extend existing `sources` → partners; slim `offerCards` (catalog, filters, counts) + heavy `offerDetails`; `offerChanges`; `syncRuns`; `inquiries`. Convex limits: query/mutation 1 s, 16 MiB read, 32,000 docs scanned; Node action 10 min, 512 MiB; document 1 MiB.
- Rules: active = listed by the partner now AND has at least one future departure (expired → hidden automatically). ABLux overrides (title, intro, category, cover) survive re-imports. Price shown as "od X €" + basis (po osobi / po apartmanu / ukupno za 2) + NBS note. Organizer and license on every partner offer. Content hash to skip unchanged pages; raw HTML is not stored in the DB.
- Relay CLI (`npm run sync:relay`) runs the same adapters from a fixed-IP machine for partners that whitelist an IP later; not used tonight.

## Pages
- Public: `/` (living postcard hero, working search with live counts, sections from DB), `/ponude` (catalog of ABLux + partner offers, filters in URL, server rendered), `/ponude/[slug]` (partner offer detail), `/aranzmani/[slug]` (ABLux programs, cart + IPS deposit), `/verski-turizam`, `/destinacije`, `/putovanja/[zemlja]`, `/iznajmljivanje-vozila`, `/o-nama`, `/kontakt`, `/auth`, 404/500, new nav with mega menu + sticky search pill, new footer.
- Admin (operate mode, same tokens, Manrope only, dense and calm): Pregled, Upiti i rezervacije, Ponude (ABLux + partner, overrides, bulk actions), Nove i izmenjene, Partneri i sinhronizacija (17 cards, status light, counts, last run, "Pokreni sada" with cooldown, per-partner settings, human-readable log), Sadržaj (Početna, Verski turizam, Rent a bus, O nama), Podešavanja (contacts, license, users and roles), command palette (Ctrl+K).
