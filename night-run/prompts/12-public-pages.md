# Step 12 — Ostale javne stranice u novom stilu
<!-- mode: auto · effort: high · session: S6 (resume) -->

Continue in the same session. Every public page moves into the new world; nothing navy/cyan remains. Keep URLs stable.

- **`/verski-turizam`:** editorial page; hero scene "ostrog" from the manifest (poster fallback `public/generated/ablux-hero-ostrog-*`); ABLux pilgrimage programs first, then partner religious offers; a departures calendar; the real monastery photo used honestly (no AI changes).
- **`/aranzmani` and `/aranzmani/[slug]`:** ABLux programs, same template language as the partner offer page; cart + IPS QR deposit kept and working; server-rendered detail with metadata.
- **`/putovanja`, `/putovanja/[zemlja]`, `/destinacije`, `/zemlje`:** destination pages generated from offers (country → offers) with a short intro; keep existing admin-managed content working.
- **`/iznajmljivanje-vozila`:** real photos of the bus, van and interiors with slow zoom/parallax and a warm grade; inquiry form; if the manifest has `rentabus`, use it as the hero.
- **`/o-nama`:** story, values, license (from settings), a partners section with the 17 logos and live offer counts, team section with clearly marked placeholders for real photos (no stock people).
- **`/kontakt`:** real data from settings (neutral fallback), map embed, inquiry form, working hours.
- **`/auth`, `/signin`, `/signup`:** minimal paper design matching the new auth from step 03.
- Remove stock images (`public/pocetna*.avif`, `kontakt-hero.avif`, `plane.avif`, `background*.avif`) from all pages (delete the files only if nothing references them).

Gate, commit, "Korak 12" in the report.
