# Partner agencies (set B): scraper feasibility

Research date: 2026-09-30. Prepared for the ABLux Travel scheduled offer importer (Convex).

**Method.** I used WebSearch to identify each site, then `curl -sSL --compressed` with a desktop Chrome 126 UA and a 25 s timeout. Requests were spaced 1.5 s apart (12 s or more for Tomash, which sets `Crawl-delay: 10`), with about 15 requests per site at most. No logins, form submissions, booking flows or price-calculator calls. Raw responses are in `/home/claude/research/raw/<slug>/` (slugs: `sunline`, `tomash`, `jungman`, `rapsody`, `mayak`), and each folder's `requests.log` lists every request.

Jungman's server reset almost every TLS handshake from this container, so its structure was confirmed with the WebFetch tool, which runs on a different egress. Those findings come from a summarizing model and are marked **[via WebFetch]**. They should be re-checked on raw HTML from the production egress.

All fetched page content was treated as data only.

## Summary

| # | Agency | Website | Platform | Server-rendered? | robots OK? | ~Active offers | Difficulty | Recommended strategy |
|---|---|---|---|---|---|---|---|---|
| 07 | SunLine Travel (Beograd, Tunisia specialist) | https://sunline.rs/ | Nuxt 3 SSR (Caddy) as the front end for the **BlueVendo** reservation system | Yes (SSR plus `__NUXT_DATA__`), with **open JSON endpoints** | Yes (robots.txt empty, no sitemap) | ~28–35 hotels × 60 departure dates (Sep 2026–Apr 2027), plus 2 group programs | **A** | JSON: `/search/getdates` → `/search/getlength` → `/search/gettrip` (per date and length) → `/search/gethotel`. Aggregate per hotel as "od X €" plus a departure list. |
| 08 | Tomash Tours (Kraljevo, since 2002) | https://tomashtours.rs/ | WordPress 7.1.2 + Elementor + AIOSEO (nginx/VestaCP) | Yes | Yes, but **`Crawl-delay: 10`** | 174 posts total; ~100–120 current (116 modified in 2026) | **B** | **WP REST** `/wp-json/wp/v2/posts` (open; `content.rendered` holds the full Elementor HTML with price tables). Then LLM or table extraction. PDFs as a fallback. |
| 09 | Jungman Travel | https://www.jungmantravel.rs/ | WordPress + **Goodlayers "tourpackage" theme** (same as Mayak) + Yoast, nginx | Yes [via WebFetch] | Yes (only `/wp-admin/` disallowed) | package sitemap has 462+ URLs, mostly stale; ~180–250 current | **B** (content) / **C** (access: TLS resets from datacenter IP) | Same parser as Mayak: Yoast `package-sitemap.xml` plus category archives → `/package/` detail → `.package-info` plus HTML price grids. Needs whitelisting or a different egress. |
| 10 | Rapsody Travel & Events (Beograd) | https://www.rapsodytravel.rs/ | WordPress 6.0.1 shell (custom theme, "Website by NeoLab") + external booking engine (objects/units; images on `mcdn.pro`; WSPay) | Details yes. **Lists are JS**, but served by a GET endpoint returning JSON+HTML. Per-date prices are JS-only. | Yes (allow all) | **56** active group trips (`total` from the endpoint), plus exotic/charter search | **B** (exact per-date prices: C) | `GET /services/list/?objectGroupId=6&_page=N` (40/page, gives `total`) → parse cards (dates, "Već od" price) → detail pages for program and included/excluded. Offers are **not** in the sitemaps. |
| 11 | Mayak Tours (Beograd) | https://mayaktours.rs/ | WordPress 7.1.2 + **Goodlayers "tourpackage" theme** + Yoast + TablePress, Apache | Yes | Yes (allow all) | 918 package URLs in sitemap (147 modified in 2026); ~250–350 current | **B** (enumeration is A-grade) | Yoast `package-sitemap.xml` (with lastmod) plus category archives for activity → `/package/` detail → `.package-info` + `table.tablepress` + tab sections. RSS `/feed/?post_type=package` for new items. |

Difficulty scale: A = easy (sitemap, JSON-LD, REST or JSON API, clean HTML); B = medium (custom HTML parsing, price tables); C = hard (JS-only, anti-bot, prices in images or PDFs, iframe engine).

---

## 07: SunLine Travel, https://sunline.rs/

**Identification.** The `<title>` is "Sunline Travel - Prvi specijalizovani turoperator za Tunis". Head office: Beogradska 18 (entrance from Njegoševa), Beograd; +381 11 32 85 688; info@sunline.rs. The site also lists franchise offices (YUBC/Movimondo, Belville/Mipego, Sol Putovanja, Putopis Novi Sad, Kruševac) and "Više od 20 godina iskustva". Handwritten-logo match is by name and brand only (logo not compared visually); confidence is high. No other "SunLine" Serbian agency surfaced.

### Access, robots, sitemap
- `robots.txt`: HTTP 200, 1 byte (an empty line). No restrictions and no crawl-delay.
- `sitemap.xml`: **404**. No sitemap.
- No anti-bot seen. Headers show `via: 1.1 Caddy` and `x-powered-by: Nuxt`. No Cloudflare.

### Platform
- **Nuxt 3 (Vue) SSR** with a custom CMS. Router routes found in the bundle include `/`, `/tunis`, `/pretraga`, `/hotel`, `/programi/:id`, `/page/:id`, `/cenovnici`, `/download-zona`, `/iframe`, `/iframehotel` and `/admin/*` (ponude, cenovnici, baneri, pages, popup, newsletter, eturista…).
- The inventory backend is **BlueVendo** (a regional reservation system):
  - Offer definitions carry `"url": "https://aff-sunline.bluevendo.com/"` and `"currencycode": "EUR"`.
  - Hotel images live at `https://rw-sunline.bluevendo.com/images/bv/hotel/<hotelId>/...`.
  - Affiliate query strings look like `affaction=tripbooking&cmd=details&offerid=34660&vars[startdatefrom]=…`.
- `https://aff-sunline.bluevendo.com/` is a public BlueVendo **affiliate search module** ("Pripadanje BlueVendo - Rezervacioni sistem", filters: Država/Regija/Hotel/Standard/Usluga/Datum/Let od Beograd). This looks like an official subagent/affiliate channel.
- Every SSR page embeds `<script id="__NUXT_DATA__" type="application/json">` (devalue format) with the page's API data. A decoder is at `…/scratchpad/devalue.py` (logic: resolve index references).

### Offer structure
Tunisia only. Regions in one sample date: Port El Kantaoui, Skanes, Mahdia, Jasmin Hamamet, Hamamet, Sus, Tunis/Gamart (the affiliate module also lists Djerba). There are three product kinds:
1. **Dynamic charter packages (flight + hotel)** from BlueVendo. In the sample, Nouvelair flies BEG→MIR (e.g. BJ 7235), with 7- and 12-night stays.
2. **CMS group programs** ("programi"):
   - https://sunline.rs/programi/76 ("KOMBINOVANI PROGRAM MAHDIA-DJERBA")
   - https://sunline.rs/programi/79 ("TUNIŠKA AVANTURA LETO 2026")
   - Content is HTML in `page.dsc`: day-by-day program, dates in `subtitle`.
3. **Price lists as XLS**, listed at `/cenovnici`, e.g. `https://sunline.rs/pricelist/sunline-travel-tunis-ultra-first-minute-leto-2026.-br-1.7-sjwqed.xls`.

**Listing pages:**
- Homepage lists "TUNIS SEP 2026." (offerdefid 18, 0 items now) and "TUNIS OKTOBAR 2026" (offerdefid 12: `numItems` 74, 30 per page).
- Search UI: https://sunline.rs/pretraga?countryId=13 (without a date the SSR result list is empty).

**Detail page (hotel):**
- Route `/hotel?hotelId=<id>&startDate=<ISO>&tripLength=<n>&adults=2&infants=0&l1=&maintenance=<board>&room=<room>&flight=<no, airline>`. The format was reconstructed from the `useSearchPath` code; I did not fetch it.
- `https://sunline.rs/programi/76` was fetched. It has og:title, og:description and og:image (`https://sunline.rs/pages/mahdia-djerba-l7ff5x.jpg`). No JSON-LD and no canonical.

### JSON endpoints (Nitro server routes, GET, `application/json`, no auth; found in `_nuxt` chunks and verified live)

| Endpoint | Returns |
|---|---|
| `/search/getregions?countryId=13` | regions (id, name). Not called; seen in code. |
| `/search/getdates?countryId=13` (or `regionId=` / `hotelId=`) | `[{startDate}]`: **60 dates**, 2026-09-29 → 2027-04-23. Verified. |
| `/search/getlength?countryId=&regionId=&hotelId=&startDate=` | available night counts. Seen in code. |
| `/search/getmaxpersonnum?…&tripLength=` | max adults, children, infants and child ages. Seen in code. |
| **`/search/gettrip?countryId=13&startDate=2026-10-02T00:00:00Z&tripLength=7&adults=2&infants=0&l1=`** | 28 rows, one per hotel, with fields listed below. Verified. |
| `/search/gethotel?hotelId=32` | hotel content fields, listed below. Verified. |
| `/pages?catPage=…` | CMS pages. Seen in code; not called. |
| `POST /sendreservation` | reservation form. **Do not use.** |

`/search/gettrip` fields: `id` (tripid), `offerId`, `startDate`, `endDate`, `length`, `priceBase` (per person, EUR), `priceFull` (total for the party), `priceMap` (per bed/age), `hotel`, `hotelId`, `standard` ("****"), `region`, `country`, `image`, `maintenanceName` (All Inclusive / Polupansion), `roomId`, `roomName`, `adultNum` / `childNum` / `infantNum`, and flight data: `departureFlightNo`, `departureAirlineName`, `departureNode`, times, return leg and `departureAllotmentFree` (availability).

`/search/gethotel` fields: `name`, `standard`, `city`, `region`, `country`, `descriptions[]` (label + HTML body), `images[]` (full URLs), `lat`/`lng` and `countryDesc`.

Note the `/search` path prefix: `GET /search?…` returns 404. The client concatenates `"/search" + "/gettrip?..."`.

### Fields available
Everything below comes as structured JSON:
- title/hotel, destination (country, region, city), stars, board, room type
- price per person plus total (EUR), departure date, nights, transport (flight number, airline, airport, times)
- availability, images, lat/lng and description HTML

Program pages provide an HTML description (day-by-day), a hero image and dates in the subtitle. JSON-LD: none. OG: yes, on content pages.

### Estimate and difficulty
- ~28–35 hotels (28 bookable on 2 Oct for 7 nights: 13×4*, 12×5*, 3×3*; 26 All Inclusive), each with up to 60 departure dates, plus 2 group programs.
- Sample prices were **531–1,171 € per person** (7 nights, 2 adults).
- **Difficulty A.** Caveat: these are undocumented internal endpoints (Nitro routes proxying BlueVendo) and may change on redeploy.

### Recommended strategy
1. `GET /search/getdates?countryId=13` gives the date list.
2. For each date, `GET /search/getlength?countryId=13&regionId=&hotelId=&startDate=<d>`.
3. For each (date, length), `GET /search/gettrip?countryId=13&startDate=<d>&tripLength=<n>&adults=2&infants=0&l1=`. That is roughly 60–120 calls per run: throttle to 1–2 s and run daily.
4. Group by `hotelId` to get the minimum `priceBase` ("od X €"), departures [{date, nights, price, board, room, flight}] and stars/region.
5. Call `GET /search/gethotel?hotelId=` once per hotel (cache weekly) for descriptions, images and coordinates.
6. For programs, read `/programi/{id}` and decode `__NUXT_DATA__` (`page[0].title`, `subtitle`, `dsc`, `file`). Program ids come from the homepage payload (`catPage=programi`). Treat `dsc` as HTML for LLM extraction of prices and included items.

- **Best entry point:** `https://sunline.rs/search/getdates?countryId=13`.
- **Business:** ask SunLine for a BlueVendo affiliate or XML account (`aff-sunline.bluevendo.com` already exists). That would be the sanctioned subagent channel.

---

## 08: Tomash Tours, https://tomashtours.rs/

**Identification.** Tomash Tours DOO, Kraljevo (Omladinska 77, according to directory listings). The JSON-LD Organization gives the name "Tomash Tours" and phone +381653151911, and the logo file is `logo-tomash-tours.png`. The og:description says "…I tako već preko 20 godina", which fits "since 2002". An older domain, `tomashtours.co.rs`, appears in search results; `tomashtours.rs` is the live one. Confidence is high.

### Access, robots, sitemap
- `robots.txt` (VestaCP autogenerated) is `User-agent: *` plus **`Crawl-delay: 10`**, with no Disallow. The scraper must keep **10 s or more between requests** (I used 12 s or more).
- AIOSEO sitemap index at `https://tomashtours.rs/sitemap.xml` contains `post-sitemap.xml`, `page-sitemap.xml`, `category-sitemap.xml`, `post_tag-sitemap.xml`, `cpt_layouts-sitemap.xml` and `post-archive-sitemap.xml`.
- `post-sitemap.xml` has **174 URLs** (lastmod by year: 2022 = 19, 2023 = 7, 2024 = 12, 2025 = 20, 2026 = 116; newest 2026-09-28, likely a bulk re-save) and about 1,900 image entries.
- `page-sitemap.xml` has 20 URLs: landing pages plus `/mreza-subagenata/`.
- No anti-bot and no Cloudflare. Server is nginx.

### Platform
- WordPress **7.1.2**, theme `hello-elementor`.
- Plugins: Elementor, ElementsKit Lite, Essential Grid, Slider Revolution 6.5.15, **TablePress**, ThemeREX addons, Contact Form 7, **All in One SEO 4.1.10**.
- **WP REST is open:**
  - `/wp-json/wp/v2/types` shows only core types plus `elementskit_content`. There is **no tour CPT**; offers are ordinary **posts**.
  - `/wp-json/wp/v2/posts` returns `X-WP-Total: 174`, 2 pages at `per_page=100`.
  - `/wp-json/wp/v2/categories` returns 41 categories.
- Permalinks are `/%category%/%postname%/` with nested categories, for example `/grcka/paralija/vila-frideriki/` and `/metropole/istanbul/istanbul/`.
- Posts have no `featured_media` (0 of 100); images sit inside the Elementor content.

### Offer structure
Categories and post counts from REST:

| Category (id) | Posts | Notes |
|---|---|---|
| metropole (97) | 33 | subcategories: istanbul, toskana, ohrid, budimpesta, ljubljana, sarajevo, trebinje, banja-luka, istra, venecija |
| nova-godina (104) | 33 | |
| jednodnevni-izleti (102) | 24 | |
| grcka (1) | 19 | subcategories: paralija 6, leptokarija 4, nei-pori 4, olympic-beach 3 |
| turska (101) | 16 | **all last modified 2022**, stale |
| crna-gora (95) | 6 | subcategories: canj, budva, becici, dobre-vode |
| makedonija / ohrid | 4 | |
| hrvatska / istra | 1 | |

The site menu has: Grčka 2027, Grčka hoteli, Ohrid, Azurna obala, Crna Gora, Hrvatska, Sarimsakli Turska, Metropole, Nova Godina 2027, Izleti, Turska, Egipat.

**Listing page:** https://tomashtours.rs/metropole/ is a hand-curated Elementor canvas page with 33 offer links and no pagination. The other menu landing pages (`/grcka/`, `/crna-gora/`, `/izleti/`…) are pages of the same kind.

**Detail pages:**
- https://tomashtours.rs/metropole/istanbul/istanbul/ (trip, post 7082)
- https://tomashtours.rs/grcka/paralija/vila-frideriki/ (accommodation, post 5000)

### Fields in server-rendered HTML
The content container is `div[data-elementor-type="wp-post"]`. Sections are Elementor tabs (`.elementor-tab-title` / `.elementor-tab-content`): "Destinacija", "Cena i popusti", "Program putovanja", "Smeštaj", "Napomene", "Opšte informacije".

| Field | What's there (from the two sample pages) |
|---|---|
| Title | `<title>` "Istanbul, Turska, 3 nocenja – Sigurni polasci", `<h1>` "ISTANBUL spoj Istoka i Zapada", REST `title.rendered` |
| Duration | text "6 dana / 3 noćenja" (Greek pages: "11 dana / 10 noći"), plus "Cene po osobi", "Paket aranžman" |
| Destination | from the category path (grcka → paralija) |
| Prices (trip) | **plain `<table>`** (no class), cells "Termini \| Hoteli i cene za sve termine". Dates "30.09.-05.10.2026." etc.; hotel names with stars ("EURO DIAMOND Hotel 3* Laleli"); prices "135€", "Cena za polazak iz Niša 130€", "159€". Cells are irregular (merged free text with "——" separators). |
| Prices (Greek accommodation) | grid of "Datum polaska" (20.05.…17.09.) × "Termin boravka" × rows S2/S3/APP4. Currently **empty** ("Leto 2027 u pripremi"). Transport surcharge table `table.table.table-hover` (Čačak/Kraljevo… 70 € / 50 € / 60 € / 40 €). |
| Departure cities | "Polazak iz: Preljina, Kraljeva, Vr. Banje, Trstenika, Kruševca, Niša" plus "DOPLATA za polazak iz…" |
| Transport | "autobuski prevoz" |
| Board | "sa doručkom"; legend NA/ND/PP/PA/AI/UAI on Greek pages |
| Included / excluded | "ARANŽMAN OBUHVATA:" / "ARANŽMAN NE OBUHVATA:" (bullets) |
| Program | "PROGRAM PUTOVANJA: 1.DAN, ČAČAK …" |
| Extras | fakultativni izleti with prices, child discounts, supplements, payment terms (EUR at the NBS rate) |
| PDFs | price list `http://tomashtours.rs/wp-content/uploads/2026/09/ISTANBUL-cenovnik-broj-3.pdf` |
| Images | gallery in content (`/wp-content/uploads/2022/02/1-scaled.jpeg`…). **og:image is generic** (`/uploads/2022/04/social-.jpg`). |
| JSON-LD | AIOSEO graph (WebSite, Organization, BreadcrumbList, WebPage, **BlogPosting**). No Offer or price. og:description is polluted with header text. |

REST check: `GET /wp-json/wp/v2/posts/7082?_fields=id,title,modified,link,content,categories` returns `content.rendered` of about 90 KB. It includes the price table, the included/excluded lists and the PDF link, so no page chrome needs to be fetched.

### Estimate and difficulty
- 174 posts; about 100–120 look current (Turska and NG 2023 are stale).
- **Difficulty B.** Enumeration is easy (REST), but prices are hand-typed Elementor tables and text.

### Recommended strategy
1. `GET /wp-json/wp/v2/posts?per_page=100&page={1,2}&_fields=id,link,modified,title,categories` gives the index (2 requests). Use `modified` for change detection. `modified_after=` should work for incremental runs (WP 5.7+), but I did not test it.
2. Map categories with `/wp-json/wp/v2/categories?per_page=100`.
3. For new or changed posts only, fetch `/wp-json/wp/v2/posts/<id>?_fields=id,title,modified,link,content` with **10 s or more between calls**.
4. Clean `content.rendered` (strip the header/nav widgets) and extract with an LLM into a schema: dates[], hotel options with price, departure cities and surcharges, duration, transport, board, included/excluded, program days.
5. Keep the PDF price-list link as a source.
6. Take the first gallery image as the cover.

- **Best entry point:** `https://tomashtours.rs/wp-json/wp/v2/posts?per_page=100&_fields=id,link,modified,title,categories`.
- **Business:** `/mreza-subagenata/` publishes a subagent contract (`/wp-content/uploads/2024/03/UGOVOR-O-SUBAGENTURI.pdf`) and a list of authorized subagents. A formal subagent agreement could unlock emailed price lists.

---

## 09: Jungman Travel, https://www.jungmantravel.rs/

**Identification.** Title "Putovanja letovanja i izleti, Jungman Travel - Leto 2026, izleti"; Facebook page `JungmanTravel21`. The site matches by name; the blue/green logo was not compared visually. Confidence is high.

### Access (important)
- From this container, HTTPS to `www.jungmantravel.rs` and `jungmantravel.rs` failed **7 of 8 times** with `curl: (35) Recv failure: Connection reset by peer` during the TLS handshake. That held on HTTP/2 and HTTP/1.1, and after a 20-minute cool-down. The one success was `https://jungmantravel.rs/robots.txt` at 13:35 UTC.
- Plain `http://jungmantravel.rs/` reached nginx and returned a 301 to HTTPS.
- WebFetch, on a different egress, loaded every page normally.
- Conclusion: server-side IP or TLS-fingerprint filtering (a firewall rule, not a JS challenge). Test from the production egress, keep the rate very low, and consider asking the agency to whitelist the importer IP.

### Robots and sitemap
- `robots.txt` is `Disallow: /wp-admin/` and `Allow: /wp-admin/admin-ajax.php`, with no Sitemap line. Offer pages are allowed.
- Yoast `sitemap_index.xml` [via WebFetch] contains post, page, **`package-sitemap.xml` (lastmod 2026-09-30)**, category, post_tag, **`package-category-sitemap.xml`** (about 120–170 category URLs), `package-tag-sitemap.xml` and `package-tag-sitemap2.xml`, and author.
- `package-sitemap.xml` has **462 or more** `/package/` URLs. The WebFetch view was truncated at early-2020 entries; lastmod counts there were 2016 = 4, 2017 = 7, 2018 = 40, 2019 = 365, 2020 = 46+. The file is ordered oldest-first, so newer entries were cut off. The real total is likely 500–900, many of them stale.

### Platform [via WebFetch]
- WordPress, theme **`tourpackage`** (Goodlayers "Tour Package", the same theme as Mayak), Yoast, meta generator "Site Kit by Google 1.188.0", Smart Slider 3.
- REST `/wp-json/wp/v2/types` is open, but the **`package` CPT is not exposed** (only core types).
- Offers are `/package/<slug>/`; taxonomy archives are `/package-category/<slug>/`.

### Offer structure
Menu: Srbija (izleti), Bugarska and BiH–Jahorina (skiing), Leto 26 (Grčka, Hrvatska, Turska, Španija…), Evropski gradovi, First minute, Last minute, Krstarenja, Najam autobusa, Avio karte, Blog. The menu slugs are nearly identical to Mayak's (`/izleti-srbija/`, `/bugarska-skijanje/`, `/skijanje-bosna-i-hercegovina/`, `/evropski-gradovi/`, `/krstarenja/`, `/avio/`), which suggests the same developer.

**Listing pages** (20 cards per page):
- https://www.jungmantravel.rs/package-category/evropski-gradovi/ (3 pages)
- https://www.jungmantravel.rs/package-category/letovanje/ (8 pages)

Card fields: title, duration ("7 dana / 5 noćenja"), price text ("499€479€", "FIRST MINUTE CENA - 1 365€", "OD 259€").

**Detail pages:**
- https://www.jungmantravel.rs/package/korzika-francuska-putovanje-autobusom/
- https://www.jungmantravel.rs/package/vila-lafazanis-nea-vrasna-200m-od-plaze/

### Fields in static HTML [via WebFetch]
| Field | What's there |
|---|---|
| package-info | Trajanje "4 - 10. OKTOBAR 2026. 7 dana / 5 noćenja"; Lokacija "Korzika, Venecija, Bastija, Ajačio, …"; Cena "CENA ARANŽMANA 499€ POSLEDNJE 2 SOBE : 479€" (apartments: "OD 259€", "10 NOĆENJA") |
| Program | "1. DAN" … "7. DAN" |
| Hotels | stars and board: Hotel Massimo D'Azeglio 3* (doručak), Hotel Continental 3*, Hotel Blue Dream 4* |
| Transport | "Vanlinijski prevoz autobusom", ferry Livorno–Bastija |
| Included / excluded | "…obuhvata" / "…ne obuhvata" |
| Apartment prices | two HTML grids, "Autobuski prevoz" and "Sopstveni prevoz". "Period boravka" (20.05.–30.05. …) × rows "Broj noćenja", "1/2 std.", "1/2 std. ECO"…; values like `239 \| 275 \| 315 …`, with "/" for n/a and "*" markers |
| PDFs | per-object price list (`/wp-content/uploads/2026/05/Lafazanis-2026.pdf`) and general terms PDF |
| Metadata | og:title, og:image (per offer); no JSON-LD |

### Estimate and difficulty
- About 180–250 current packages (letovanje around 160, evropski gradovi around 50, plus Srbija and krstarenja, with overlaps). The sitemap is inflated by 2019-era URLs.
- **B for content** (same as Mayak). **C for access** from datacenter IPs.

### Recommended strategy
Reuse the Mayak parser.
1. Weekly: crawl category archives (`/package-category/{letovanje,evropski-gradovi,srbija-putovanja,krstarenja,first-minute,last-minute,...}/page/N/`) to build the **active set**.
2. Daily: read `package-sitemap.xml` lastmod and re-fetch only changed or active `/package/` pages.
3. Parse `.package-info` (Trajanje/Lokacija/Cena), the tables and the sections, with an LLM fallback.

- **Best entry point:** `https://www.jungmantravel.rs/package-sitemap.xml` together with the category archives.
- Resolve the TLS resets first (whitelisting or a different egress).

---

## 10: Rapsody Travel & Events, https://www.rapsodytravel.rs/

**Identification.** Title "Turistička agencija Beograd | Rapsody Travel & Events"; phone +381 11 3088 048. Regional group sites are linked (rapsodytravel.bg, .com.mk, .com.tr, solazur.ba), and there is a Kragujevac office on Facebook. Confidence is high.

### Access, robots, sitemap
- `robots.txt` is `User-agent: *`, `Disallow:` (allow all), plus `Sitemap: …/sitemap_index.xml`. `/services/` is not disallowed.
- Yoast 19.3 sitemap index contains `post-sitemap.xml` and `page-sitemap.xml`:
  - `post-sitemap.xml`: 89 blog posts.
  - `page-sitemap.xml`: 144 landing pages (`/destinacije/…`, `/putovanja-za-mlade/…`, `/praznici/…`, `/exotic/…`, `/iframe/mexico/`).
  - **Offer detail URLs (`/putovanja/<dest>/<slug>/<id>/`) are not in the sitemaps** (only 1 of 144).
- No anti-bot on GETs. Forms use reCAPTCHA v3.
- Response headers `server: N179–N182` point to a load-balanced host.

### Platform
- **WordPress 6.0.1** (outdated) acts only as a shell: custom theme `rapsodytravel` (webpack bundle `dist/main.954b68633f9ee9b3a886.js`, jQuery, Bootstrap).
- Plugin `botko-plugin` is just a chatbot widget. The footer says "Website by NeoLab" (neolab.hr).
- `/wp-json/*` redirects with a 301 to the homepage, so **REST is disabled** (`raw/rapsody/wp_types.json` is that homepage HTML).
- Offers come from an **external travel booking engine**:
  - Detail pages carry `data-objectId="69103"` and `data-objectGroupId="6"`.
  - Images sit at `https://mcdn.pro/data/objects/images/<objectId>/…`.
  - The JS calls `/services/*`.
  - Card payments go through WSPay.

### Offer structure
Menu:
- **EVROPSKA PUTOVANJA:** Istanbul, Italija (Venecija/Rim/Toskana/Milano), Temišvar, Bukurešt, Budimpešta, Beč, Azurna obala, Prag, Krakov, Makedonija, BiH, Španija, Berlin, Zagreb.
- **EXOTIC:** Dominikana, Kanarska/Balearska ostrva, Mauricijus, Tajland, Meksiko, Maldivi, Kuba.
- **LETOVANJE:** Leto za mlade (Zakintos, Lefkada, Kavos, Kušadasi, Marmaris, Rimini, Budva, Zrće…) and "Za sve generacije" (Grčka hoteli i apartmani, Italija/Španija BUS, Leto avio).
- **SKIJANJE**, **NOVA GODINA**, **PRAZNICI** (Advent, Uskrs, Prvi maj…), **SREDNJOŠKOLCI**, **STUDENTI**, **TOMORROWLAND**.

**Listing page:** https://www.rapsodytravel.rs/klasik-putovanja/evropska-putovanja/. Its `div.list-items` is **empty in SSR**; it is filled by JS from:

```
GET /services/list/?objectGroupId=6&tagCategoryId=295&_page=1
→ {"total": 26, "html": "<12 card <a>…>"}
```

The params come from the `form.search-form` data attributes: `data-objectGroupId="6" data-tagCategoryId="295" data-countryId="" data-partnerId=""`. The Greece page uses `countryId=89`.

All trips: `/services/list/?objectGroupId=6&_page=1` returns **total 56** with 40 cards, and `&_page=2` returns 16. The union is 56 unique URLs. `perPage` is capped at 40.

**Detail pages:**
- https://www.rapsodytravel.rs/putovanja/amsterdam/nova-godina/1372/ (active)
- https://www.rapsodytravel.rs/putovanja/rim/putovanje-rim-2026/1467/ (fetched; returns 200 but is **absent from the list** because it is expired, so list membership is the activeness signal).

### Fields
**List cards** (HTML inside the JSON):

| Field | Selector / example |
|---|---|
| URL | `a.card[href^="/putovanja/"]` |
| Title | `h2.card-title` |
| Duration | "8 dana \| 3 noći" |
| Transport | icon `i.la-bus` / `la-plane` / `la-ship` plus label |
| Departure dates | `.departure-link[data-href="/putovanja/…/1372/#dateFrom=2026-12-28"]` |
| Old price | `del.text-primary` ("€ 389") |
| Current price | `span.h4.text-danger` (promo) or `span.h4.text-primary` (regular), prefix "Već od", suffix "po osobi" |
| Image | `img.cover-image` (mcdn.pro) |
| Badges | `.badge` (PARTY, ADVENT, EXOTIC, NOVO!…) |

**Detail pages (SSR):**

| Field | What's there |
|---|---|
| Title | `h1` "Rim 2026" |
| Summary | "8 dana \| 5 noći", "Bus", "Polazak: Beograd, Novi Sad" |
| Program | `.btn-itinerary-day` blocks (day label "dan N" plus `h6` title), text in `#collapseDayN .card-body` |
| Included / excluded | "Cena uključuje" / "Cena ne uključuje" lists; hotel stars and board appear here ("5 noćenja sa doručkom u Rimu hotel sa 3*") |
| Extras | fakultativni izleti prices, notes |
| Metadata | og:title, og:image (mcdn.pro); no canonical; no JSON-LD Offer |

The **date/price widget is not in SSR**: `section.details-booking-wrapper` is empty. The JS uses `/services/get_departures/?countryId=` and `/services/calc/?objectId|unitId=&dateFrom=&dateTo=&guests=&objectGroupId=[&partnerId=]`. I did not call these.

Exotic trips use a charter/dynamic search (`/services/ch_at/`, pages like `/iframe/mexico/`), which is JS-only.

### Estimate and difficulty
- **56** active group trips.
- Exotic/charter dynamic packages are extra and not enumerable without the search.
- **Difficulty B.** Card and detail parsing is clean. Exact per-date or per-room prices would be C (a calc API needing object/unit IDs).

### Recommended strategy
1. Daily: `GET /services/list/?objectGroupId=6&_page=1..ceil(total/40)` gives the active set with from-price, old price, dates, duration, transport and image.
2. To map categories, use `tagCategoryId` (for example 295 = Evropska putovanja) or `countryId`. Read these from the data attributes of the landing pages in `page-sitemap.xml`.
3. For new or changed trips, fetch the detail page and parse program, included/excluded and notes (LLM or selectors).
4. Store "od X €" from the card; do not attempt the calc API.

- **Best entry point:** `https://www.rapsodytravel.rs/services/list/?objectGroupId=6&_page=1`.
- **Business:** the engine supports a `partnerId` parameter (search forms and the calc call). Ask Rapsody for a partner ID or affiliate widget, or a feed.

---

## 11: Mayak Tours, https://mayaktours.rs/

**Identification.** Title "Mayak Tours Leto 2026, Grčka, evropski gradovi, krstarenja, Srbija"; site name "Turistička agencija Mayak Tours". Address is Gavrila Principa 52, Beograd, according to directory listings. The name matches; the logo was not compared visually. Confidence is high. The footer links a license PDF and a **subagent contract** (`/wp-content/uploads/2022/11/Ugovor-o-subagenturi-2022-NOV.pdf`).

### Access, robots, sitemap
- `robots.txt` is a Yoast block: `User-agent: *`, `Disallow:` (allow all), plus the sitemap line.
- Yoast `sitemap_index.xml` contains:
  - **`package-sitemap.xml`**: **918 URLs** and 911 `image:loc` entries. Lastmod by year: 2016 = 2, 2017 = 1, 2018 = 60, 2019 = 147, 2020 = 53, 2021 = 159, 2022 = 177, 2023 = 99, 2024 = 26, 2025 = 47, **2026 = 147**. Newest is 2026-09-30T13:31.
  - `package-category-sitemap.xml` (119 categories), `package-tag-sitemap.xml` and `package-tag-sitemap2.xml`, page, post (2021), category and author.
- No anti-bot; server is Apache.
- The plugin `post-views-counter` sets a `pvc_visits` cookie, so every hit counts as a view. Keep volume low.

### Platform
- WordPress **7.1.2**, theme **`tourpackage`** (Goodlayers, same as Jungman).
- Plugins: Yoast, **TablePress** (`tablepress-responsive-tables`), Smart Slider 3, Post Views Counter, Chaty, Call Now Button, Contact Form 7, Theme Blvd Google Maps.
- REST is open, but **`package` is not in `/wp-json/wp/v2/types`** (not exposed).
- RSS works: `/feed/?post_type=package` returns 20 items by publish date. `content:encoded` has the full rendered HTML including TablePress tables, but no `.package-info` meta and no categories.

### Offer structure
The menu is large (about 200 items):
- **Grčka apartmani** by resort: Tasos, Nea Potidea, Afitos, Hanioti, Kalitea, Pefkohori, Paljuri, Polihrono, Siviri, Skala Furka, Posidi, Paralija, Olympic Beach, Leptokarija, Nei Pori, Krf, Skijatos, Evia, Asprovalta…
- **Grčka hoteli** by region × stars: Kasandra, Sitonija, Atos, Olimpska regija, Tasos, Krf, Evia, Pelion, Peloponez, 3/4/5*.
- **Grčka ostrva avio**, Crna Gora, Italija, Španija, Ohrid, Egipat, Turska, Malta.
- **Evropski gradovi** by country, **Krstarenja** (individual/group), Nova godina and holidays, Srbija izleti, Zimovanje/skijanje, First/Last minute.

**Listing pages** (taxonomy archives, 20 cards per page):
- https://mayaktours.rs/package-category/letovanje/ (**12 pages**)
- https://mayaktours.rs/package-category/evropski-gradovi/ (2 pages)
- https://mayaktours.rs/package-category/aktuelno/ (10 items)
- Menu pages such as `/evropski-gradovi/` are curated subsets (16 items).

Card selectors: `.gdl-package-widget`, `h2.package-title a`, `.package-date` (duration), `.package-content` (excerpt), `.package-media-wrapper img`, `.package-ribbon-wrapper .package-type .discount-text`, `.package-price` (when present).

**Detail pages:**
- https://mayaktours.rs/package/malta-ostrvo-vitezova-istorije-4-dana-avionom/ (trip, postid 45647)
- https://mayaktours.rs/package/hotel-tropical-4-hanioti-hit-ponuda/ (hotel)

### Fields in server-rendered HTML
| Field | Selector / example |
|---|---|
| Title | `<title>` "MALTA – ostrvo vitezova & istorije - 4 dana - avionom - **Aktuelno, Aktuelno Evropa, Avion, Evropa, Evropski gradovi, First minute, Malta** - Turistička agencija Mayak Tours". The category list is embedded in the title. No `<h1>`. |
| Key facts | `.package-info-wrapper .package-info`: "Trajanje: 10. - 13. oktobar / 4 dana", "Lokacija: Valeta – … - St. Paul", "Cena: 479 € PROMO CENA : 379 €". Hotel: "Trajanje: 10 ili 7 noćenja / polupansion", "Lokacija: Hanioti, Kasandra", "Cena: od 36 € po osobi / noć". |
| Ribbon | `.package-ribbon-wrapper .package-type.last-minute .discount-text` ("SNIŽENO DO KRAJA SEZONE") |
| Tabs | `.package-content .gdl-tab` → `.gdl-tab-title` ("CENOVNIK I USLOVI", "PROGRAM OKTOBAR", "PROGRAM DECEMBAR", "NAPOMENE") and `.gdl-tab-content` |
| Price table (trip) | `table.tablepress.tablepress-id-1421`: TERMIN \| BROJ I VREME LETA \| CENA \| PROMO CENA → "10.10. – 13.10.2026." \| "Iz Beograda: W6 4021 10.10. u 16:00h…" \| 469 € \| 379 € |
| Price table (hotel) | `table.tablepress.tablepress-id-1424` (connected cells): "Termin putovanja" (04.06.–14.06. …) × "Tip smeštaja / Usluga" (1/2 SOBA PB Polupansion…) × "Broj noćenja" (10/7). Values like 990*, 1290*…, where "*" means a special price. |
| Included / excluded | "ARANŽMAN OBUHVATA:" / "ARANŽMAN NE OBUHVATA:" |
| Other text | fakultativni izleti, payment terms, day-by-day program ("1. dan") |
| Transport | "avionom"/"autobusom" appears in the title and text; flight numbers in the table |
| Hotel / board | stars in the title ("Hotel Tropical 4*"); board in the table ("Polupansion") |
| Images | og:image is per offer (`/uploads/2025/08/malta-…-23.jpg`); gallery thumbs `-202x130` |
| JSON-LD | Yoast WebPage/ImageObject/WebSite, no Offer. Canonical present. |

### Estimate and difficulty
- 918 package URLs; about 250–350 current (letovanje about 240, evropski gradovi about 25–40, plus krstarenja, NG, Srbija…).
- **Difficulty B.** Enumeration and HTML are clean; the price grids vary in shape.

### Recommended strategy
1. Weekly: crawl the category archives (about 30 active categories × N pages, 20 per page) to build the **active set**.
2. Daily: diff `package-sitemap.xml` lastmod against stored values and fetch only new or changed `/package/<slug>/` pages.
3. For new items, poll `/feed/?post_type=package` (`&paged=2` is standard WordPress but was not tested).
4. Parse `.package-info` deterministically (duration, location, from-price, promo price).
5. Parse the TablePress table(s) into rows (dates × room types).
6. Hand the tabs content to an LLM for included/excluded and program.
7. Mark offers inactive when no date in the tables is on or after today.

- **Best entry point:** `https://mayaktours.rs/package-sitemap.xml`, plus `https://mayaktours.rs/package-category/letovanje/` and the other category archives.

---

## Cross-cutting observations

1. **Shared platform: Jungman = Mayak.** Both run the Goodlayers `tourpackage` WordPress theme with near-identical menu slugs, most likely the same web developer. One parser covers both:
   - `/package/` CPT, `.package-info`, `.gdl-tab` and TablePress/HTML grids.
   - Yoast `package-sitemap.xml` plus `/package-category/*/page/N/`.
   - The `package` CPT is hidden from WP REST on both sites, so rely on the sitemap, archives and RSS rather than REST.
2. **Sitemaps and URL existence are poor activeness signals.**
   - Mayak lists 918 packages going back to 2016, and Jungman's sitemap is dominated by 2019 URLs.
   - Rapsody's expired `/1467/` still returns 200, and Tomash has 16 Turkey posts untouched since 2022.
   - Determine "active" from listing membership (category archives, or Rapsody's `/services/list` `total`) plus parsed departure dates on or after today.
3. **Two partners have real inventory engines with JSON behind the site:**
   - SunLine: BlueVendo via Nuxt, `/search/*` JSON with prices, flights and availability.
   - Rapsody: an external engine behind WordPress, `/services/list` JSON+HTML.
   - Both are undocumented internal endpoints, and both expose affiliate hooks (`aff-sunline.bluevendo.com`, `partnerId`). Tomash and Mayak publish subagent contracts.
   - As a subagent, ABLux should ask each partner for an official feed or affiliate ID. That would be more robust than scraping.
4. **Prices mostly sit in irregular HTML tables, with PDFs and XLS as supplementary price lists.**
   - Table shapes: date × room-type grids, merged cells, "*" markers, promo/old price pairs, "od X €".
   - Supplementary files: Tomash cenovnik PDF, Jungman per-object PDF, SunLine XLS.
   - None of the five has schema.org Offer/Trip JSON-LD with prices, and OG tags are unreliable (Tomash og:image is generic).
   - Recommended pipeline: deterministic extraction of URL, title, duration, from-price, dates and cover image; then **LLM structured extraction** on the cleaned content block, with validation (EUR, per person, dd.mm. date parsing) and a content hash to skip unchanged pages.
5. **Politeness and anti-bot.**
   - No Cloudflare or JS challenges on any of the five.
   - Tomash requires `Crawl-delay: 10`. Using WP REST keeps it to about 2 index calls plus changed posts only.
   - Jungman resets TLS from datacenter IPs, so production needs a whitelisted or stable egress and a very low rate.
   - Mayak counts every page view (post-views-counter), so fetch only changed pages.
   - Conditional crawling (sitemap lastmod, REST `modified`, list totals) keeps every site well under 100–150 requests per daily run.

## Request log summary (curl, this container)

| Site | Requests | Notes |
|---|---|---|
| sunline.rs | 15 (+1 to aff-sunline.bluevendo.com) | includes 4 JSON API calls (getdates, gettrip, gethotel, 1 wrong-path 404) and 5 JS bundle fetches |
| tomashtours.rs | 13 | all gaps ≥ 12 s (Crawl-delay 10 honored) |
| jungmantravel.rs | 9 attempts (1 × 200 robots, 1 × 301 over plain HTTP, 7 × TLS reset) | plus 9 WebFetch calls from another egress (homepage, sitemap_index, wp/v2/types, package sitemap, category sitemap, 2 category archives, 2 details) |
| rapsodytravel.rs | 14 | includes 3 `/services/list/` GETs; no calc or booking calls |
| mayaktours.rs | 13 | includes sitemaps, 2 details, 4 listings, 1 RSS |

Raw files: `/home/claude/research/raw/{sunline,tomash,jungman,rapsody,mayak}/` (HTML/JSON/XML plus `.headers` and `requests.log`).
