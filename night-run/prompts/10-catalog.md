# Step 10 — Katalog ponuda, stranica ponude, upit
<!-- mode: auto · effort: high · session: S5 (new) -->

You are step 10 of the ABLux night run. Read `night-run/NIGHT_RULES.md`, `DESIGN.md`, `docs/plans/06-partner-sync.md` (public API section) and the step 07–09 sections of `night-run/NIGHT_REPORT.md`. Look at `design/comps/` (if a catalog or offer comp exists, it is the quality bar) and `design/reference/`. Use the `components/ui/` library.

1. **`/ponude` catalog** (server-rendered first paint with Convex server helpers, interactive filters as client leaves): ABLux programs (from `trips`) and partner offers (`offerCards`) in one list. Filters in the URL: kategorija, zemlja/destinacija, mesec polaska, prevoz, trajanje, cena (range), polazak iz; sort (najbliži polazak, cena, novo); live result count; pagination or "Učitaj još". Cards are tickets: cover, title, place, dates, nights, transport, "od X €" + basis (or "Cena na upit"), badge "ABLux program" or "Organizator: …". Empty and loading states per the design (suggest nearby months, similar destinations, contact).
2. **`/ponude/[slug]`** partner offer detail (server-rendered, `generateMetadata`, JSON-LD TouristTrip + Offer): postcard gallery, "boarding pass" facts (dates, nights, transport, board, from-price + basis), departures table with prices and availability, sticky reservation panel (bottom sheet on mobile) with "Rezerviši / Pošalji upit", program by day (accordion), obuhvata / ne obuhvata, notes, organizer + license + link to the original program and terms, "Ažurirano: <date>", similar offers. English site: note that the program is in Serbian.
3. **Inquiry flow:** form (ime i prezime, telefon, email, broj putnika, željeni polazak, poruka, saglasnost za obradu podataka) → `inquiries` (honeypot + rate limit from step 03), clear success state, no email yet (store for the admin).
4. **Search wiring:** swap the search component's count source (step 05) to the catalog query.
5. **SEO:** sitemap entries for published offers and ABLux programs; canonical URLs; `noindex` for filtered combinations beyond one filter.
6. **Performance:** partner images with `loading="lazy"` and explicit aspect ratios; no Vercel image optimization for partner CDNs.

Gate, commit, "Korak 10" in the report (URLs to try, e.g. `/ponude?kategorija=...`).
