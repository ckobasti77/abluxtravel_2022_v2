# Partner research (read before touching Partner Sync)

Three detailed reports: `partners-a.md` (Astra, Holiday, Balkan Fun, Holiday Plus KM, Hellena, Big Blue), `partners-b.md` (SunLine, Tomash, Jungman, Rapsody, Mayak), `partners-c.md` (Travellino, Montesol, Nitravel, Ski & Sun, Dunav Turs, Viva). Research date 2026-09-30.

`raw/<slug>/` holds the real responses saved during research (HTML, JSON, XML, headers, request logs). Use them as parser fixtures. `raw/` is gitignored because it is large (36 MB); copy the minimal snippets a test needs into `scraper/__fixtures__/` (committed).

| # | Partner | Slug | Adapter family | Live access tonight | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Viva Travel | viva | MARS/NeoLab (`/services/list/`, `get_pricelists`), partnerId 22442 | yes | Cloudflare, no challenge; sitemap frozen, use list endpoint |
| 2 | Mayak Tours | mayak | WP "tourpackage" + TablePress | yes | package-sitemap lastmod; view counter: fetch only changed pages |
| 3 | Astra Travel | astra | Oktopod PHP CMS | yes | hidden search index (244) + town pages; hotels "na upit" |
| 4 | Hellena Travel | hellena | Oktopod PHP CMS | yes | mega-menu lists 207 villas; `table.table-hellena`, filter by title row |
| 5 | Nitravel | nitravel | WP Roam (mkdf) | yes | `tour-item-sitemap.xml` lastmod reliable; resells other organizers — store organizer |
| 6 | Tomash Tours | tomash | WP REST posts | yes, Crawl-delay 10 s | `/wp-json/wp/v2/posts`; free-text tables |
| 7 | Ski & Sun | skiandsun | MARS/NeoLab, partnerId 41200 | yes | same adapter as Viva |
| 8 | Rapsody | rapsody | MARS-like `/services/list/?objectGroupId=6` | yes | expired offers still 200: list membership = active |
| 9 | Big Blue | bigblue | TourVisio inline JSON | yes | pages 3-6 MB; never call `.asmx/.ashx`; prices = total for 2 adults |
| 10 | SunLine | sunline | Nuxt + BlueVendo JSON (`/search/*`) | yes | Tunisia only; cleanest data |
| 11 | Dunav Turs | dunavturs | custom PHP, HTTP only | yes | images HTTP-only → copy to storage; summer 2026 stock mostly expired |
| 12 | Jungman Travel | jungman | WP "tourpackage" (as Mayak) | NO (TLS reset) | fixtures only; status "Čeka dozvolu" |
| 13 | Travellino | travellino | WP Travelo + wpDataTables | NO (JS challenge) | Wayback fixtures in raw/travellino/wb-*.html |
| 14 | Montesol | montesol | Joomla 3 | NO (JS challenge) | Wayback fixtures |
| 15 | Balkan Fun | balkanfun | Drupal 10 | NO (Imunify360) | status only |
| 16 | Holiday | holiday | WP + WP Job Manager, prices as images | NO (Imunify360) | identity to confirm with the owner |
| 17 | Holiday Plus KM | holidayplus | none (no website) | — | manual import (PDF/Excel upload or manual form) |

Important facts:
- Summer 2026 is over: most Greek summer offers have past departures. Current stock: autumn trips, New Year 2027, Istanbul, Tunisia, winter, city breaks, first-minute summer 2027 when published.
- Many hotels (Astra, Hellena, Viva) are "na upit" (no price): show "Cena na upit" with an inquiry CTA, never a fake price.
- Price basis differs per partner (per person, per apartment, total for 2 adults, per day): always store and display the basis.
- Currency is EUR everywhere, paid in RSD at the NBS middle rate.
