# Step 13 — Admin panel: novi okvir i ekrani za Partner Sync
<!-- mode: auto · effort: high · session: S7 (new) -->

You are step 13 of the ABLux night run. Read `night-run/NIGHT_RULES.md`, `DESIGN.md` (admin "operate" mode), `docs/plans/06-partner-sync.md` (admin API), `docs/plans/02-security.md` (roles), and the report sections of steps 03 and 09. If `design/comps/` has an admin comp, it is the quality bar. Impeccable: Operate mode rules; design-taste-frontend: no serif in the dashboard (serif only in the logo), dense but calm, tables with hairlines, tabular numerals.

Users: the owners and a new office manager (20 years in tourism, not a developer). Every screen must be obvious without training, in Serbian, and work on a phone.

1. **Shell:** ink sidebar with gold active indicator, paper workspace, top bar with search / command palette (Ctrl+K: jump to any screen, find an offer by name, start actions), user menu with role, logout. Collapsible sidebar; mobile drawer.
2. **Pregled:** today's inquiries, sync status per partner (status lights), new offers and price changes since yesterday, quick actions, next automatic sync time.
3. **Upiti i rezervacije:** inquiries (from step 10) and orders in one inbox: status (novo, u obradi, potvrđeno, otkazano), notes, assignee, IPS payment status for orders; filters; detail drawer.
4. **Ponude:** one table for ABLux programs and partner offers: search, filters (partner, category, status, has price, departure month), bulk publish/hide/feature, row detail with ABLux overrides (title, intro, category, cover) that survive re-imports; "Otvori na sajtu".
5. **Nove i izmenjene:** feed of imported changes (new, price up/down with old → new, removed, expired) with filters by partner and date.
6. **Partneri i sinhronizacija:** 17 cards (logo, status light, active offers, last run with duration, blocked reason in plain Serbian); "Pokreni sada" button with the cooldown rule (disabled with a countdown to the next 06:00 run after a manual run or while running); per-partner settings drawer (active, auto-publish, category mapping, commission, organizer name + license, contact, notes); run history with human-readable log lines; manual import screen (upload PDF/Excel/image or manual entry) for Holiday Plus KM.
7. **Sadržaj:** existing editors (home route slides, religious offers, trips/aranžmani, destinations, vehicle rental images, home hero channels) restyled into the new shell without breaking them.
8. **Podešavanja:** contact data, working hours, license number, social links, users and roles (owner only), change password.
9. Toasts with "Poništi" where possible, confirmation for destructive actions, skeleton loading, empty states that explain what to do.

Gate, commit, "Korak 13" in the report with admin URLs to try.
