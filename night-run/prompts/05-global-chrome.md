# Step 05 — Globalni okvir: meni, pretraga, footer, 404/500
<!-- mode: auto · effort: high · session: S3 (resume) -->

Continue in the same session. Use the components from step 04.

1. **Navigation** (`components/site-navigation.tsx`, rewrite as needed): transparent over a dark hero, then paper (Papir) or ink (Tinta) at 82% with 12px blur after scrolling; serif wordmark "ABlux TRAVEL" with the logo; links: Ponude (mega menu by category: Verski turizam, Letovanje, Evropski gradovi, Nova godina i praznici, Zimovanje, Daleka putovanja, Izleti, Krstarenja — use existing `categories` data where it exists), Verski turizam, Rent a bus, O nama, Kontakt; search button; SR/EN and theme switches; cart icon only when the cart has items; subtle admin link only for a verified session. Fix the low-contrast controls over the hero in light mode.
2. **Mobile menu:** full-screen ink sheet, large touch targets, focus trap, Esc to close.
3. **Search ("Kuda putujete?")**: one component used in three places: the hero booking bar (step 11 wires it into the hero), a sticky pill under the nav after the hero, and a search sheet on mobile. Fields: tip putovanja, mesec, broj putnika, polazak iz. It shows a live result count from Convex and submits to `/ponude?...`. Until the catalog query from step 10 exists, count from existing data behind a small adapter so step 10 only swaps the source.
4. **Footer:** new, in the ink/paper world. Real data from `settings` only (no fake values; neutral fallback). Columns: Ponude, Verski turizam, Rent a bus, O nama, Kontakt, Partneri. Small print: "Cene su izražene u evrima, plaćanje u dinarima po srednjem kursu NBS." License line from settings when present.
5. **QuickActions / chat FAB:** restyle; never overlap the booking bar or sticky pill on mobile.
6. **404 (`app/not-found.tsx`) and error (`app/error.tsx`)** in the style ("izgubljena karta" metaphor), with ways back (Početna, Ponude, Kontakt).

Gate, commit, "Korak 05" in the report.
