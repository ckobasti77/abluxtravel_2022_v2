# Partner agencies: scraping feasibility, group C (#12–#17)

_Research date: 2026-09-30. Agencies: Travellino, Montesol, Nitravel, Ski & Sun Travel, Dunav Turs, Viva Travel Agency._

## Method and politeness

- I found each official site with web search and confirmed it by name, address and title. Raw responses (body plus `.headers`) are saved under `/home/claude/research/raw/<slug>/`. Every folder has a `requests.log` listing each URL and its status.
- Fetching used plain `curl` with a desktop Chrome UA and slept 1.5 s after each request. Live request counts per site: Travellino 4, Montesol 4, Nitravel 10, Ski&Sun 14, Dunavturs 7, Viva 14.
- I did not log in, submit forms, or call any booking, inquiry or cart endpoint.
- Travellino and Montesol sit behind a JS anti-bot challenge. I did **not** try to bypass it. Their structure comes from Internet Archive (Wayback) snapshots dated Feb–Jun 2026. Those files are named `wb-*.html`, and the CDX URL lists are in `wayback-cdx.txt`.
- The two MARS-based sites (Ski&Sun, Viva) have public read-only GET endpoints that their own pages call when a visitor opens the "Cenovnik" (price list) or a search page: `/services/list/` and `/services/get_pricelists/`. I called each one once or twice to confirm the response format.
- Difficulty scale:
  - **A**: easy (sitemap, JSON-LD or WP REST; clean HTML).
  - **B**: medium (custom HTML parsing, price tables, AJAX fragments).
  - **C**: hard (JS challenge or anti-bot, prices in images or PDF, iframe booking engine).

## Summary

| # | Agency | Website | Platform | Server-rendered? | robots OK? | ~Active offers | Difficulty | Recommended strategy |
|---|---|---|---|---|---|---|---|---|
| 12 | Travellino | https://travellino.rs | WordPress 6.9 + **Travelo** booking theme (+child), WPBakery, wpDataTables, Yoast | The HTML itself is server-rendered (per the archive). **Live, every URL except robots.txt returns a JS anti-bot interstitial with HTTP 200.** | Yes. Yoast default, `Disallow:` is empty, no crawl-delay. | About 120 `/tour/` URLs were seen in 2025–26. My estimate is 40–80 live at any one time. | **C** (access), B (content) | Ask the partner to allowlist our IP/UA or send a feed. Then: Yoast sitemap → `/tour/<slug>/` → wpDataTable + "N. DAN" headings, with an LLM for the includes text. Do not bypass the challenge. |
| 13 | Montesol Travel | https://www.montesol.rs | **Joomla 3.x**, template `full_screen_2`, JW Simple Image Gallery | Server-rendered (per the archive), but **the same JS anti-bot interstitial** as Travellino | Yes. Only Joomla system folders are disallowed. | Estimate 80–150 per season. Old seasons (2017–2025) are still online. | **C** (access), B (content) | Same allowlisting request. Then crawl the category tree (season hub → place → villa), parse period × unit tables generically, fall back to the PDF price lists, and use an LLM for the notes. |
| 14 | Nitravel (Niš) | https://www.nitravel.rs | WordPress 6.1 + **Roam** (Mikado `mkdf-*`) tour theme, WPBakery, LiteSpeed, Yoast | **Yes, fully.** Images are lazy-loaded via `data-src`. | Yes (allow all) | The sitemap has 310 `tour-item` pages; 173 were modified in 2026. | **B** | `tour-item-sitemap.xml` (its lastmod is reliable) → detail pages → mkdf selectors plus a price-table parser. Drop offers whose dates are all in the past. |
| 15 | Ski & Sun Travel (Niš) | https://skisun.rs | WordPress 7.0 custom theme on **NeoLab MARS ERP** (images on mcdn.pro, `/services/*` endpoints) | **Mostly.** Name, stars, description, amenities and per-unit "od" prices are server-rendered. The full price list and search results come from same-origin GET endpoints. | Yes (allow all) | **105** accommodation objects (`/services/list/` total), plus bus-package variants | **B** | MARS adapter: `/services/list/` (JSON `{total, html}`) → detail page → `/services/get_pricelists/` with the page's `data-params`. Also ask for MARS agent/B2B access. |
| 16 | Dunav Turs | http://www.dunavturs.com | Custom PHP (Apache, Bootstrap 3, jQuery 1.11). Effectively HTTP-only: https answers 301. | **Yes, fully** | Yes. Only `/adm/` and `/_old/` are disallowed. | **29**: 28 Greek villas for leto 2026 plus 1 trip | **A** (B for free-text trip pages) | `sitemap.xml` is complete → `*.html` detail pages → tab panes `#tabs-2-1…5`. Price tables are uniform. |
| 17 | Viva Travel Agency (Krunska 48) | https://www.vivatravel.rs | WordPress 6.4 custom theme (it-works.rs) on **NeoLab MARS ERP**, behind Cloudflare (no challenge seen) | **Mostly.** Text, itinerary, includes/excludes, trip "od" price and departure dates are server-rendered. Unit price tables load via AJAX. Many accommodations show "Dostupno na upit" or are priced only in a PDF. | Yes (allow all) | **241** active accommodations (`/services/list/`). The sitemap lists 677 accommodations and 132 trips but has been frozen since 2025-12-19. | **B** (C for PDF-only prices) | The same MARS adapter as Ski&Sun: `/services/list/` (not the sitemap) → detail page → `get_pricelists`. Fall back to the PDF price list. |

---

## 12 · TRAVELLINO: travellino.rs

### Identification
- **Site:** https://travellino.rs. Web search returns the result titled "Travellino turistička agencija Beograd". Instagram handles are @travellino_beograd and @travellino.rs. Archived pages end their titles with "… - Travellino".
- **Confidence:** high on name and domain. I could not check the logo or slogan because the live site is behind the challenge.

### Access, robots, anti-bot
- **robots.txt** is a Yoast block: `User-agent: *` and `Disallow:` with an empty value. It points to `Sitemap: https://travellino.rs/sitemap_index.xml` and sets no crawl-delay. robots.txt is the only URL that is served normally.
- **Every other URL gets the interstitial.** I tested `/`, `/sitemap_index.xml` and `/wp-json/wp/v2/types`. Each returned **HTTP 200 with a ~12 KB "One moment, please… / Please wait while your request is being verified…" page**.
  - Response headers: `server: openresty/1.31.1.1`, `cache-control: private, no-cache, no-store`, `cf-edge-cache: no-cache`.
- **What the challenge script does:**
  - An obfuscated script runs bot checks: `navigator.webdriver`, a headless or "bytespider" UA, spoofed PluginArray/MimeTypeArray prototypes, missing `navigator.languages`, and zero outer window size.
  - If any check fails, it sends `failedChecks` by XHR.
  - Otherwise, after 1 s it auto-submits a hidden GET form (fields `wsidchk`, `pdata`, `id`, `ts`, `cttl`) to `/z0f76a1d14fd21a8fb5fd0d03e0fdc3d3cedae52f`, which presumably sets a clearance cookie. The page also reloads itself every 5 s.
- **Montesol serves the identical script and IDs.** So this is a hosting-level WAF, probably at the same provider. The behaviour resembles Imunify360 WebShield-style bot protection, but **the vendor is not confirmed**.
- **It may depend on IP reputation.** The Wayback crawler still got normal pages on 2026-06-17.
- **Scraper implication:** the status code is 200, so detection has to be content-based (`<title>One moment, please...</title>` or the string `wsidchk`).
- I did not attempt to solve the challenge.

### Platform (from archived HTML, 2026-05/06)
- WordPress 6.9.4.
- Theme **Travelo** plus `Travelo-child` (SoapTheme's travel booking theme). The body class is `single-tour wp-theme-Travelo`.
- Plugins: WPBakery 7.8, Slider Revolution 6.7, Redux, **wpDataTables** (used for the price tables), Formidable Pro (the "Pošalji online upit" inquiry form), CF7, Chaty, Mailchimp for WP.
- Yoast JSON-LD contains only WebPage, BreadcrumbList and Organization. There is no Product, Offer or Trip markup.
- `wp-json` is advertised. Whether the Travelo `tour` CPT appears in REST is **unknown**, because live REST calls are challenged.

### Offer structure (Wayback CDX: 302 unique HTML URLs since Jan 2025)
- **Offers:**
  - CPT `tour` at `/tour/<slug>/`: 118 distinct URLs captured in 2025–26.
  - `accommodation`: 9 URLs, e.g. `/accommodation/hilton-hotel-and-resorts/` and `/accommodation/hotel-alpina/`.
  - `room-type`: 23 URLs.
- **Taxonomy `tour-type`:** `/tour-type/evropski-gradovi-autobusom/`, `…/evropski-gradovi-avionom/`, `izleti-evropa`, `izleti-srbija`, `nova-godina`, `rafting`, `sajmovi`, `shopping`.
- **Holiday and country landing pages:** `/1-maj/`, `/8-mart/`, `/advent/`, `/dan-drzavnosti/`, `/dan-primirja/`, `/austrija-putovanja-autobusom/`, `/bec-putovanje-autobusom/`, `/ceska-putovanja-autobusom/`, and others.
- **Categories covered:** evropski gradovi (bus and plane), izleti in Srbija and Evropa, Nova godina and holidays, sajmovi (e.g. IBAKTECH Istanbul), shopping, rafting, spa vikendi (Moravske/Radenci), and some letovanje (Korčula, Toskana).
- **Noise to exclude:**
  - Travelo demo leftovers: `/shortcodes/*`, `/standard-pages/*`, `/fancy-package-N-columns/`, `/car-booking-page/`, `/cruise-booking-page/`, `/flight-booking-page/`.
  - Query variants: `?selected_currency=eur|rsd` (Travelo's currency switcher), `?order_by=`, `?view=`.
- **Listing example:** https://travellino.rs/tour-type/evropski-gradovi-autobusom/
  - The archived copy says "No available tours". Travelo's archive filters by its own schedule data, which Travellino does not fill in. Taxonomy archives are therefore **not** a reliable way to enumerate offers.
- **Detail examples:**
  - https://travellino.rs/tour/toskana-3-nocenja-nova-godina-2026/
  - https://travellino.rs/tour/ibaktech-istanbul-sajam-poslasticarstva-2-nocenja/

### Detail-page fields (server-rendered in the archived HTML)
| Field | Present | Where / hint |
|---|---|---|
| Title | yes | `h1` inside a WPBakery row. Also `og:title` and `<title>` "… - Travellino". |
| Destination | yes | `h4` with the text "DESTINACIJA Toskana, Italija" |
| Price | yes | `table.wpDataTable.wpdtSimpleTable` (e.g. `#wpdtSimpleTable-43`). Columns: TERMIN PUTOVANJA \| HOTEL \| CENA ARANŽMANA \| SPECIJALNA CENA. Example row: "29.12 – 03.01.2026. \| hotel 3* \| 209 evra \| 189 evra". Related-offer cards also show a minimum price in `span.price` ("€179.00", the Travelo price meta). |
| Currency | yes | Written as "evra" or € |
| Departure dates | yes | The TERMIN column, and day headings like "1. DAN, PONEDELJAK 29.12.2025. BEOGRAD" |
| Nights/days | yes | In the title ("3 noćenja") and on cards ("6 DANA \| 3 NOĆENJA") |
| Transport | yes | Cards say "PAKET ARANŽMAN AUTOBUSOM"; also in the includes text |
| Hotel + stars | partial | The table shows a category ("hotel 3*"), usually not a named hotel |
| Board | text | Inside the includes text |
| Images | yes | `og:image` (`/wp-content/uploads/…png`, 360×360) and card images |
| Day-by-day program | yes | `h3` elements matching `^\d+\.\s*DAN`, each followed by `p` |
| Included / not included | yes | Text markers "CENA ARANŽMANA OBUHVATA" / "CENA ARANŽMANA NE OBUHVATA" |
| PDF | none seen | |
| JSON-LD | Yoast graph only | |
| OG | yes | `og:type=article` |

### Volume and difficulty
- About 118 tour URLs appeared between Jan 2025 and Jun 2026. Turnover is high because many offers are holiday and fair trips.
- Estimated **40–80 live** at any given time. This is not verifiable live.
- **Difficulty C for access, B for content.**

### Recommended strategy
1. **Business route first.** ABLux is Travellino's subagent. Ask them (or their host) to allowlist the scraper's fixed egress IP and a descriptive UA such as `ABLuxPartnerSync/1.0 (+mail)` in the WAF, or to provide an export or feed. The block may be IP-reputation based, so test from the production egress IP before building anything.
2. **Once access is allowed:**
   - Start from `sitemap_index.xml`, then the expected `tour-sitemap.xml` (not verified), then the detail pages.
   - Also probe `/wp-json/wp/v2/types`. If `tour` is exposed there, enumerate with `/wp-json/wp/v2/tour?per_page=100&_fields=id,link,modified`.
3. **Parser:**
   - `h1`, and the `h4` containing "DESTINACIJA".
   - `table.wpDataTable` rows give departures × hotel × price × special price.
   - The day program is the `h3` headings matching `^\d+\. DAN`.
   - Pass the includes/excludes text blocks to an LLM for structured extraction.
4. **Guard:** if a body contains `wsidchk` or "One moment, please", record it as **BLOCKED** and raise an alert. Never parse or store those pages.

Raw files: `raw/travellino/` (`home.html`, `robots.txt`, `sitemap_index.xml` and `wp-json-types.json` are all challenge pages except robots.txt; `wb-detail-*.html`, `wb-listing-*.html`, `wayback-cdx.txt`).

---

## 13 · MONTESOL: www.montesol.rs

### Identification
- **Site:** https://www.montesol.rs. Title: "MONTESOL TRAVEL BEOGRAD :: VEĆ 34 GODINE SA VAMA". Company: MONTESOL TRAVEL DOO Beograd (Čumićevo sokače; directories also list a Smederevo branch at TC Danubius).
- **Confidence:** high.

### Access, robots, anti-bot
- **robots.txt** is the Joomla default. It disallows `/administrator/ /bin/ /cache/ /cli/ /components/ /includes/ /installation/ /language/ /layouts/ /libraries/ /logs/ /modules/ /plugins/ /tmp/`. There is no sitemap line and no crawl-delay.
  - Content pages and `/images/` (which holds the PDFs) are allowed.
  - Stick to SEF URLs and avoid `index.php?option=com_…`, since `/components/` is disallowed.
- **Challenge:** `/`, `/sitemap.xml` and `/grčka-apartmani-2026.html` all return the **same interstitial as Travellino** (server Apache, identical script and IDs). The same detection guard and allowlisting request apply.

### Platform (from archived HTML, Feb–May 2026)
- Generator: "Joomla! - Open Source Content Management". The assets (media/jui, mootools legacy) indicate Joomla 3.x.
- Template `full_screen_2`, and the JW Simple Image Gallery plugin (`ul.sigFreeContainer`). Legacy `/images/stories/` paths are still in use.
- **No OG tags and no JSON-LD.**
- In 2025 the archive captured `/feed/`, `/feed.xml` and `/atom.xml`. Joomla core category feeds (`<category>.html?format=feed&type=rss`) are worth testing once access is allowed.

### Offer structure
URLs are SEF with **UTF-8 aliases** (č, š, ž), which the scraper must percent-encode.

- **Grčka apartmani 2026:**
  - Hub: `/grčka-apartmani-2026.html`
  - Places: `/grčka-apartmani-2026/<place>.html` (Paralia, Olympic Beach, Leptokarija, Nei Pori, Neos Marmaras, Hanioti, Polihrono, Pefkohori, Evia-Edipsos, Nea Vrasna/Vrasna Paralia)
  - Villas: `/grčka-apartmani-2026/<place>/<villa>.html`
- **Grčka hoteli:** `/letovanje-grčka-hoteli-2026.html` (Kassandra, Sithonia, Athos, Olimpska regija → hotel pages). Hotel slugs carry the star rating, e.g. `hotel-tresor-sousouras-4`.
- **Bugarska:** `/bugarska-leto-2026.html` (Sunčev Breg, Nesebar, Kiten)
- **Crna Gora:** `/crna-gora-2026.html` (Čanj, Rafailovići, Dobre Vode, Herceg Novi), e.g. `/crna-gora-2026/čanj/pearl-beach-resort-4.html`
- **Turska:** `/turska/<place>/<hotel>.html` (Sarimsakli…), plus `/turska-avionom.html` and `/tunis-avionom.html`
- **Bus trips:** `/autobuski-aranžmani/…html` and `/autobuski-aranžmani2/…html` (Istanbul, Venecija, Beč doček…)
- **City breaks:** `/34-evropski-gradovi/evropski-gradovi.html`, `/11-evropski-gradovi.html`
- **Spas:** `/banja-ždrelo.html`, `/banja-vrujci.html`
- **Other:** `/last-minute/…`, `/avio-prevoz/…`
- **Old seasons are still online** (`grcka-apartmani-2017`, `…-2024`, `…-2025`, `crna-gora-2024`…). Filter by the season token in the URL.
- **PDF price lists** in `/images/stories/0pdf/`: `GRČKA_HOTELI_2026.pdf`, `CRNA_GORA_HOTELI_2026.pdf`, `LEPTOKARIJA_LETO_2026.pdf`, `NEOS_MARMARAS_LETO_2026.pdf`, `Sunčev_Breg_-_Leto_2026.pdf`, `SARIMSAKLI_cene_br.1.5.pdf`.
- **Listing example:** https://www.montesol.rs/grčka-apartmani-2026.html
- **Detail examples:**
  - https://www.montesol.rs/grčka-apartmani-2026/neos-marmaras/vila-nikos.html
  - https://www.montesol.rs/34-evropski-gradovi/evropski-gradovi.html

### Detail-page fields (server-rendered in the archived HTML)
| Field | Present | Where / hint |
|---|---|---|
| Title | yes | `h1` in the form "Vila Nikos :: Neos Marmaras" (name :: place) |
| Destination | yes | The h1 suffix and the URL path |
| Price | yes | Unstyled `<table>`s (see below) |
| Currency | yes | EUR, in the text |
| Dates | yes | The period header row |
| Transport | text | Bus departures and adjustments, e.g. "UMANJENJE ZA PUTNIKE IZ NIŠA… 5 EUR", "polasci iz Zrenjanina – bez doplate" |
| Hotel/stars | partial | In the name or slug for hotel pages |
| Board | text | On hotel pages |
| Images | yes | `ul.sigFreeContainer a.sigFreeLink[href]` points to `/images/galerija/<folder>/*.jpg`. The `img src` is `transparent.gif`, so use the `a href`. |
| Program | city breaks | Day-by-day text, plus a table TERMIN PUTOVANJA \| HOTEL \| CENA ARANŽMANA \| PROMO CENA (e.g. "27.05 - 01.06.2026. \| AMEDIA EXPRESS 3* \| 179 € \| Last minute 169 €") |
| Included / not | yes | "PAKET ARANŽMAN OBUHVATA:" / "ARANŽMAN NE OBUHVATA:" |
| PDF | yes | A link to the regional price-list PDF |
| JSON-LD / OG | none | |

How the price tables are laid out:
- The header row reads "Period boravka \| 20.05.–30.05. \| 30.05.–09.06. …" (10-night shifts).
- Each row is a unit type, e.g. "Studio 1/2 ☺" or "Studio 1/3+1".
- `*` marks off-season package shifts.
- **Tabela 1** is the paket aranžman price per person. **Tabela 2** is own transport: rent per studio/apartment for 10 nights.

### Volume and difficulty
- Archive coverage is sparse. My estimate is **80–150 current-season items** across Greek apartments and hotels, Bulgaria, Montenegro, Turkey, bus trips and city breaks.
- **Difficulty C for access. B for content**: unstyled tables and no microdata.

### Recommended strategy
1. Make the same allowlisting request as for Travellino. Both sites apparently share a host and WAF, so one request to the hosting company may cover both.
2. Once access is allowed:
   - Crawl from the season hubs in the menu, or from the Joomla category feeds.
   - Parse tables generically: the first row holds periods, the first column holds units.
   - Let an LLM interpret the `*` and "Tabela 1/2" notes paragraph.
   - Use `pdftotext` on the `0pdf/` price lists as a secondary source.
   - Skip URLs that contain a past-season token.

Raw files: `raw/montesol/` (live challenge pages, `wb-detail-vila-nikos-neos-marmaras.html`, `wb-listing-grcka-apartmani-2026.html`, `wb-evropski-gradovi.html`, `wayback-cdx.txt`).

---

## 14 · NITRAVEL: www.nitravel.rs (Niš)

### Identification
- **Site:** https://www.nitravel.rs. Title: "Nitravel - Mi stvaramo uspomene! Leto 2026!" Footer: Obrenovićeva 46, TPC "Kalča" lokal D73, Niš; licence OTP 101/2021 cat. A.
- **Confidence:** high.

### Access, robots, platform
- **robots.txt** allows everything and lists `Sitemap: https://www.nitravel.rs/sitemap_index.xml`. No anti-bot; all 10 requests returned 200.
- Hosting is SkyHosting with LiteSpeed Cache, and responses show `x-litespeed-cache: hit`.
- **Stack:**
  - WordPress 6.1.14.
  - Theme **Roam** by Mikado Themes (`mkdf-*` classes, tours CPT `tour-item`).
  - WPBakery, Slider Revolution 5.4.
  - LiteSpeed lazy-load: `img[data-src]`, `iframe[data-litespeed-src]`.
  - Yoast.
- **WP REST is open, but** `/wp-json/wp/v2/types` lists only core types. **The `tour-item` CPT is not exposed in REST.**
- **Freshness:** no ETag or Last-Modified headers. The Yoast `lastmod` is usable.

### Sitemaps
- `tour-item-sitemap.xml`: **311 URLs** (310 items plus the `/tour-item/` archive), each with an `image:loc`.
  - lastmod spread: 174 in 2026 (173 items plus the archive), 31 in 2025, 24 in 2024, and the rest back to 2019.
  - The most recent is 2026-09-29.
- `destinations-sitemap.xml`: 120 destination pages.
- `tour-category-sitemap.xml`: 86 categories, as `/tour-item/?type[]=<slug>`.
- Also: `tour-attribute-sitemap.xml`, `page-sitemap.xml`, `media_category-sitemap.xml`.

### Offer structure
- **Putovanja:** Bugarska, jednodnevni izleti, Italija, Turska, Slovenija, Austrija, Češka, Nova godina 2027, akcije.
- **Letovanje:**
  - Greek places: Parga, Nidri, Leptokaria, Asprovalta, Nea Vrasna, Pefkohori, Potos, Kalitea, Nea Flogita, Agios Nikitas, Vrahos…
  - Grčka hoteli, Albanija, Bugarska, Turska (Kusadasi, Sarimsakli), Crna Gora, Španija leto 2026, Italija leto 2026.
- **Zimovanje:** Bansko, Borovec, Pamporovo, Kopaonik, Zlatibor, Stara planina.
- **Listing example:** https://www.nitravel.rs/destinations/italija/
  - Each item is a `.mkdf-tours-row-item`. Its classes include `post-<ID>`, `tour-category-<slug>` and `tour-attribute-<slug>`.
  - Each item links to `/tour-item/<slug>/`. Listings show no price.
- **Detail examples:**
  - https://www.nitravel.rs/tour-item/prag/ (bus city break)
  - https://www.nitravel.rs/tour-item/vila-elpida/ (Parga villa; bus + 10 nights)

### Detail-page fields (all server-rendered)
| Field | Present | Selector / hint |
|---|---|---|
| Title | yes | `h1.mkdf-tt-single.entry-title` (also `h3.mkdf-tour-item-title`) |
| Duration | yes | `span.mkdf-tsi-duration` or `.mkdf-tour-duration-holder .mkdf-tour-info-label`, e.g. "3 noćenja / 6 dana" |
| Destination | yes | In `ul.mkdf-tour-main-info-holder > li`, the item labelled "Destination" (e.g. "Češka" or "Parga"). Category link: `.mkdf-tours-tour-categories-item a`. |
| Departure info | yes | The same list: "Departure" (e.g. "Mogućnost polaska iz Niša"), "Departure Time", "Return Time" |
| Transport / board | yes | The "Included" item, `li.mkdf-tours-checked-attributes`, holds tour attributes such as "Autobuski prevoz", "Noćenje sa doručkom", "Turistički vodič", "300m od plaže". **Ignore "Not Included"** (`li.mkdf-tours-unchecked-attributes`): it lists every unchecked attribute on the site and is garbage. |
| Price | yes | **Table only.** The theme's price field `.mkdf-tsi-price` shows the literal word "Price". The table is `#tour-item-custom1-id table` (layouts below). |
| Currency | yes | "€". Payment is "u dinarskoj protivvrednosti po srednjem kursu NBS". |
| Hotel + stars | yes | Table column "HOTEL 3*". Hotel descriptions are in `#tour-item-custom2-id`. |
| Day-by-day | yes | `#tour-item-plan-id .mkdf-tour-item-plan-part` → `h6.mkdf-tour-item-plan-part-title` + `.mkdf-tour-item-plan-part-description` |
| Included / not included | yes | Bold labels inside `#tour-item-custom1-id`: "ARANŽMAN OBUHVATA:", "ARANŽMAN NE OBUHVATA:", "POPUSTI I DOPLATE:", "CENE FAKULTATIVNIH IZLETA" |
| Images | yes | `#tour-item-gallery-id img[data-src]` / `[data-srcset]`, plus `og:image`. The sitemap also carries `image:loc`. |
| Map | yes | `iframe[data-litespeed-src^="https://www.google.com/maps/embed"]` (coordinates are in the `pb` parameter) |
| Organizer | yes (text) | E.g. "Uz ovaj program važe Opšti uslovi organizatora putovanja turističke agencije **Plan A Travel** licenca OTP 222/2021". Nitravel resells other organizers' programs, so store the organizer on each offer. Also: "Cenovnik broj 51 od 30.4.2026." |
| PDF | none seen | |
| JSON-LD | Yoast WebPage/Breadcrumb only | |
| OG | yes | `og:type=article`, `og:image` |

The price table has two layouts:
- **Trips** use `table.tabela`: TERMINI PUTOVANJA \| HOTEL \| CENA PO OSOBI \| SPECIJALNA PONUDA. Example row: "SEPTEMBAR: 23.09– 28.09.2026. \| HOTEL 3* \| 175€ \| 155€".
- **Villas** use an unclassed table: Objekat × Smeštaj (2S/3S) × departure dates as columns (27.05., 06.06., …). The notes read "Jedinstvena cena po osobi – autobuski prevoz i smeštaj 10 noći" and "Polazak autobusa je dan ranije".

Tab labels differ from offer to offer ("Information / Tour Plan / Cene / Ostalo" versus "… / Location / Gallery / PAKET ARANŽMAN / OSTALO"). **Select by section id**, not by tab text: `#tour-item-info-id`, `-plan-id`, `-location-id`, `-gallery-id`, `-custom1-id`, `-custom2-id`.

### Volume and difficulty
- 310 items are published. About 170 were touched in 2026. The active set (with future dates) depends on the season: roughly **100–170**.
- Items from 2019–2024 are still published, so determine activity from the dates in the tables.
- **Difficulty B.**

### Recommended strategy
1. Nightly, fetch `tour-item-sitemap.xml` and diff it by `<lastmod>`.
2. Fetch only changed or new `/tour-item/<slug>/` pages, 1.5 s apart.
3. Parse the mkdf selectors above. The table parser has to handle two layouts: dates in rows (trips) and dates in columns (villas).
4. Use an LLM pass for includes/excludes, discounts and the organizer.
5. Mark an offer inactive when all of its parsed dates are before today.

Destination pages (`/destinations/<slug>/`) are useful for mapping categories.

Raw files: `raw/nitravel/`.

---

## 15 · SKI & SUN TRAVEL: skisun.rs (Niš)

### Identification
- **Site:** https://skisun.rs. Title: "Leto 2026, Letovanje 2026 - Ski&Sun Travel". Company: SKI & SUN TRAVEL DOO Niš (Obrenovićeva bb, TPC Gorča lok. M11).
- **Confidence:** high.

### Access, robots, platform
- **robots.txt** allows everything and points to the Yoast sitemap. No anti-bot was seen across 14 requests. Forms use reCAPTCHA Enterprise, which doesn't affect read-only fetching.
- **WP REST is closed:** `/wp-json/wp/v2/types` redirects twice and lands on the homepage.
- **The offer data comes from NeoLab MARS ERP**, a Croatian travel ERP from neolab.hr. Fingerprints:
  - Images are hosted on `mcdn.pro/data/objects/images/<referenceId>/…`.
  - MARS ids appear in the markup: `section#booking[data-objectid][data-referenceid][data-objectgroupid][data-dynamicpackage]`.
  - `data-params` carry `"partnerId":41200` and views such as `147.www.details.shared.pricelist_table_departures` and `…pricelist_table_skipass`.
  - Same-origin endpoints (from the theme bundle `/wp-content/themes/theme/dist/main.index.<hash>.js`): `/services/list/`, `/services/catalogue/`, `/services/get_pricelists/`, `/services/get_departures/`, `/services/departure_points/`, `/services/calc/`, `/services/gds_list_calculation/`, `/services/guide/`, `/services/travel_program/`, and the inquiry/contact/booking_form_cart/promoCode endpoints (**do not use those last ones**).
- **WordPress layer:** WP 7.0 with a custom Bootstrap 5 theme, Yoast, Complianz and Polylang. The Polylang cookie is Laravel-style encrypted.

### Sitemaps
- `sitemap_index.xml` → `post-sitemap.xml` and `page-sitemap.xml`.
- `page-sitemap.xml` has 85 WP pages: 49 under `/leto/…`, 10 under `/srbija/…`, 6 under `/zima/…`, travel-info, and so on. lastmod runs from 2026-06 to 2026-09.
- **Offer detail pages are virtual routes and appear in no sitemap.** They are rendered by the `detalji-smestaj`, `detalji-skijanje` and `detalji-bus-aranzmani` templates.

### Offer structure
- **Leto 2026:**
  - Grčka apartmani: Asprovalta, Leptokarija, Nea Vrasna, Nei Pori, Neos Marmaras, Olympic Beach, Paralija, Polihrono, Stavros, Tasos.
  - Grčka hoteli (Halkidiki): Kasandra, Sitonija, Atos.
  - Bugarska: Bansko, Nesebar, Primorsko, Sozopol, Sunčev Breg, Sv. Vlas, Zlatni Pjasci.
  - Crna Gora: Čanj, Dobre Vode, Šušanj, Sutomore.
  - Albanija: Drač, Ksamil, Saranda, Valona.
- **Zima 26/27:**
  - Bugarska: Bansko, Borovec, Pamporovo.
  - Italija: Livigno, Passo Tonale.
  - Francuska: Val Thorens.
  - Srbija: Stara planina.
- **Srbija:** banje (Sokobanja) and planine. Also Last minute and bus aranžmani.
- **Detail URL patterns:**
  - `/smestaj/<country>/<place>/<slug>/` is accommodation only.
  - The same URL plus `?transportUnitId=<id>&placeFromId=<id>` is the **bus package** variant.
  - `/zima/<country>-zimovanje/<place>/<slug>/` is a ski hotel.
- **Listing example:** https://skisun.rs/leto/grcka/nea-vrasna/
  - `a.card.card-package` cards show "Cena po osobi od € 129 (10 noći) – Aranžman: Bus + smeštaj".
  - `a.card.card-accommodation` cards show "Dostupno na upit – Smeštaj: Sopstveni prevoz".
  - The hubs (`/leto/`, `/zima/`) show only curated sliders.
- **Detail examples:**
  - https://skisun.rs/zima/bugarska-zimovanje/bansko/grand-hotel-bansko/
  - https://skisun.rs/smestaj/grcka/nea-vrasna/vila-aleksandra-nea-vrasna/

### Detail-page fields
| Field | Server-rendered? | Selector / hint |
|---|---|---|
| Title | yes | `h1.card-title` ("Hotel GRAND HOTEL BANSKO"). `<title>` reads "Grand Hotel Bansko 5★ - Bansko, Bugarska \| …". |
| Location | yes | `div.location` ("Bugarska, Bansko") |
| Stars | yes | Count the `i.fa-star` next to the h1 (5) |
| Description / board | yes | `section#description .show-more-content` (Lokacija / Smeštaj / Usluga paragraphs; board such as All Inclusive appears here as text) |
| Amenities | yes | `section#amenities` (check-in/out, pets, internet, pool, parking) |
| Distances / map | yes | `section#location` ("Centar: 700 m", "Skijalište: 1.5 km", "Plaža: 50 m"). Map: `iframe[data-src*="maps.google.com"]` with `q=lat,lng`. |
| Units + "from" price | yes | `div.card.unit[data-unitid]` → `h5` unit name, "Broj ležaja", `span.price[data-price]` "€ 224" (per day, "od"), `span.price-old[data-priceold]` "€ 344", and a badge "-35% Popust važi do 30.09.2026." |
| Full price list | **no (AJAX)** | `div.modal[data-params]` → `GET /services/get_pricelists/?<params>`, which returns an HTML fragment (details below) |
| Departures (bus) | AJAX | `/services/get_departures/`, `/services/departure_points/` (not tested) |
| Images | yes | JSON array in `section[data-images-gallery-main]` (mcdn.pro 1600×900), `img.lozad[data-src]`, and `og:image` |
| Ski area | yes | `section#accSkiArea` (altitude, km of slopes) |
| Program PDF | link | `section#travelProgram[data-programurl="/services/travel_program/?publicId=…&language=sr"]` ("Print PDF") |
| Included / not | partially | In the description text and the package pages |
| JSON-LD | none | |
| OG | yes | |

Verified price-list call:
- Request: `GET /services/get_pricelists/?publicId=119629&partnerId=41200&dynamicPackage=0&objectGroupId=1&currencyIdTo=1&excludeCountryIds=&excludeAccRegionIds=&view=147.www.details.shared.pricelist_table_departures`
- Response: `table.table-pricelist`. Columns are periods (Polazak/Boravak od–do: 01.12.–24.12., 24.12.–30.12., …). Rows are units. Each cell holds an old and a new price (e.g. "€ 172 € 112").

### Enumeration (verified)
- Request: `GET /services/list/?_page=1&perPage=10&language=sr&objectGroupId=1&dynamicPackage=0&availability=alternativePeriod`
- Response: JSON `{"html": "<a class=card …>", "total": 105}`. Paginate with `_page`.
- Other parameters found in the bundle: `countryId`, `destination`, `dateFrom/dateTo`, `hasArrival`, `placeFromId`, `tagCategoryId(s)`, `sortBy`, `objectTypeId`, and `dynamicPackage` 0/1.

### Volume and difficulty
- **105 accommodation objects** across summer, winter and Serbia, plus bus-package variants.
- **Difficulty B.** The endpoints return clean HTML/JSON, and no browser is needed.

### Recommended strategy
1. Build a **MARS adapter** and reuse it for Viva.
2. Enumerate with `/services/list/`, then fetch each detail page for the server-rendered fields and its `data-params`.
3. Make one `get_pricelists` call per object, plus `get_departures` for bus packages if needed. That is roughly 105 × 2 requests per night, about 6 minutes at 1.5 s spacing.
4. **Business route:** MARS gives agents/subagents logins to price lists and availability, according to neolab.hr ("Agents and suppliers can get their login into MARS system to share price lists and availability modules"). Ask Ski&Sun for B2B agent access or an export, which would be more robust than scraping. The subagent contract is at https://skisun.rs/wp-content/uploads/UGOVOR-o-subagenturi.pdf.

Raw files: `raw/skiandsun/` (`services-list-group1.json`, `get_pricelists-grand-hotel-bansko.html`, `main.index.js`, …).

---

## 16 · DUNAV TURS: www.dunavturs.com

### Identification
- **Site:** http://www.dunavturs.com. Home title "Grčka leto 2026"; Instagram @dunav_turs. Programs depart from Bačka Palanka, and transport is by "Dunavprevoz".
- **Do not confuse it with** Dunav MG Travel (dunavtravel.co.rs) or OTA Dunav Trade.
- **Confidence:** high.

### Access, robots, platform
- **robots.txt** disallows only `/adm/` and `/_old/` and has no sitemap line. `/sitemap.xml` exists anyway.
- **HTTP only:** `https://www.dunavturs.com/` answers 301, and the canonical and sitemap URLs use `http://`.
- No anti-bot. The PHP session cookie is `PHPSESSID`. Responses send `Cache-Control: no-store` and no ETag or Last-Modified. The comment form has a trivial arithmetic "antibot" question, which doesn't matter for scraping.
- **Stack:** custom PHP CMS on Apache, Bootstrap 3, jQuery 1.11.3.
- **Images:** `/images/offers/<unix-ts>-<name>.jpg`, with thumbnails in `/images/offers/thumbs/`.

### Sitemap
- `http://www.dunavturs.com/sitemap.xml` has 54 URLs. **29 are offer detail pages:**
  - 28 at `/ponude/leto-2026/grcka/<place>/<slug>.html`
  - 1 at `/ponude/putovanja/turska/istanbul/istanbul-dan-primirja.html`
- The rest are about 11 place listings and some static pages.
- `lastmod` is **always today's date** and `changefreq=hourly`, so it is useless for change detection.

### Offer structure
- Grčka leto 2026 villas and apartments: Paralia, Olympic Beach, Leptokaria, Nei Pori, Polihrono, Hanioti, Pefkohori, Sarti, Asprovalta, Nea Vrasna.
- Putovanja: Istanbul "Dan primirja".
- Other sections: `/hit-ponude/`, `/first-minut/`, `/last-minut/`, `/smestaj/{putovanja,vile,hoteli}/`, and search `/pretraga/?keyword=`.
- Older seasons (`/ponude/leto-2019…2025/…`) still resolve according to search results, but they are not in the sitemap.
- **Listing example:** http://www.dunavturs.com/ponude/leto-2026/grcka/polihrono/
  - Each item is a `.ponuda-prev` containing `.ponuda-prev-cena` ("od 90 €"), `.ponuda-prev-title`, `.ponuda-prev-mesto`, and a link `a[href$=".html"]`.
- **Detail examples:**
  - http://www.dunavturs.com/ponude/leto-2026/grcka/polihrono/vila-sakis-polihrono.html
  - http://www.dunavturs.com/ponude/putovanja/turska/istanbul/istanbul-dan-primirja.html

### Detail-page fields (all server-rendered)
| Field | Present | Selector / hint |
|---|---|---|
| Title / place | yes | `h1.page-title` ("Vila SAKIS, Polihrono"). Also `og:title`, `og:image`, `og:url`. |
| Price | yes | Tab `#tabs-2-1` "CENA SMEŠTAJA" (layout below) |
| Currency | yes | EUR, paid "u dinarskoj protivvrednosti … NBS" |
| Dates | yes | The period header of the price table. On trips: "10.11 - 15.11.2026. 6 dana / 3 noćenja / autobusom". |
| Transport | yes | `#tabs-2-4` "CENA AUTOBUSKOG PREVOZA": table with departure city \| time \| return ticket adult \| child (to 9.99) \| transfer supplement (Subotica, Bačka Topola, Senta, Kikinda, Zrenjanin, Sombor…) |
| Description | yes | `#tabs-2-2` "Opis" (Položaj / Sadržaj / Smeštaj) |
| Payment terms / notes | yes | `#tabs-2-3` "Uslovi i način plaćanja", `#tabs-2-5` "Napomene" |
| Reviews | yes | `#tabs-2-7` "Komentari" (ignore) |
| Program / included (trips) | yes, free text | All in `#tabs-2-1`: bold day headings ("Utorak (10.11) 1. dan:"), "CENA ARANŽMANA: 189 € po osobi", "CENA ARANŽMANA OBUHVATA:", "…NE OBUHVATA:", hotels "u rangu 3*" |
| Images | yes | `img[src*="/images/offers/"]` (24 on the villa page) |
| Hotel stars / board | text | In the description; villas are self-catering |
| JSON-LD / PDF / iframe | none | |

The villa price table:
- Columns are 10-night periods starting 22.05.–01.06.
- Rows are unit types: "1/2 APP", "1/3 APP", "1/4 APP", "1/4+1 APP".
- Cells are € values. `*` marks off-season package shifts that include bus. Unstarred values are per person for accommodation, 10 nights / 12 days.
- Notes below the table: "Cenovnik br. 20 važi od 17.08.2026" and the last-minute rules.

### Volume and difficulty
- **29 active offers.**
- **Difficulty A.** Discovery is complete and the HTML is uniform. Free-text trip pages are closer to B.

### Recommended strategy
1. Daily, fetch `sitemap.xml` and take every `*.html` under `/ponude/` (about 30 requests).
2. Parse the tab panes by id.
3. Use a generic matrix parser for `#tabs-2-1 table`, and apply the `*` semantics from the notes (an LLM can confirm them).
4. Treat the bus price table as an optional add-on.
5. Detect changes with a hash of the parsed content, since lastmod is useless.

Raw files: `raw/dunavturs/`.

---

## 17 · VIVA TRAVEL AGENCY: www.vivatravel.rs

### Identification
- **Site:** https://www.vivatravel.rs, "Viva Travel".
- The footer address is **Krunska br. 48 (ugao sa Beogradskom)**, tel. +381 11 7852800. This matches "VIVA Travel Agency, Krunska 48, Vračar".
- Logo file: `/wp-content/uploads/viva-logo-400x230-1.png`. News posts mention branches in Novi Sad and Niš.
- **Confidence:** high. I did not check the logo colour visually.

### Access, robots, platform
- **robots.txt** is Yoast (allow all) and points to `sitemap_index.xml`. It is served with a `text/html` content type, which is cosmetic.
- The site is behind **Cloudflare** (`server: cloudflare`, `cf-cache-status: DYNAMIC`), but there was no challenge on any of 14 requests.
- **Stack:**
  - WordPress 6.4.3, custom theme `theme` (credited to it-works.rs), Yoast, GTM, Tawk.to chat.
  - The offer backend is **NeoLab MARS ERP**, with the same fingerprints as Ski&Sun: mcdn.pro images, `data-params` with `"partnerId":22442`, and views `104.www.details.shared.pricelist_table_new` and `104.www.details.travel.pricelist_table`.
  - Endpoints in `/wp-content/themes/theme/dist/main.<hash>.js`: `/services/list/`, `get_pricelists`, `get_pricelists_calculation`, `get_departures`, `search_offer`, `pdf`, `accommodation_availability_form_data`, `dynamic_package_availability_form_data`, `calc`, `guide`, `mars_calculation_bros_list`, and the inquiry/contact/booking_form/booking_add_guests endpoints (do not use those).

### Sitemaps (stale)
- `sitemap_index.xml` → post, page, and `/sitemap/offer-sitemap.xml`. The offer index splits into:
  - `accommodation-sr.xml`, `avio-aranzmani-sr.xml` and `bus-aranzmani-sr.xml`: all three contain **the same 677** `/smestaj/<country>/<place>/<slug>/<id>/` URLs, in different orders. This is a generator bug.
  - `excursions-sr.xml`: 132 `/putovanja/<country>/<slug>/<id>/` URLs.
- These are **static files last modified 2025-12-19** (ETag and Last-Modified confirm it) and have no `<lastmod>` entries.
  - Trip IDs stop at 1233. For example, the live https://www.vivatravel.rs/putovanja/rumunija/putovanje-drakula-tura-2-noci-autobus-2026/1266/ is **missing**.
  - The sitemap is therefore not a reliable enumerator.
- Accommodation URLs by country: Grčka 309, Turska 118, Italija 108, Egipat 26, Kipar 24, Slovenija 19, Malta 18, Maldivi 10, Dominikanska Republika 9, BiH 8, …
- Trip URLs by country: Italija 39, Španija 11, Turska 10, Francuska 9, Austrija 9, Portugalija 8, …
- Trip slugs: "avion" 66, "autobus" 51, "nova-godina" 31.

### Offer structure
- Menu: **METROPOLE** (city breaks by country), **USKRS I DAN RADA**, **LETOVANJE** (Bugarska; Grčka apartmani and hoteli, plus a Grčka bus price-list page; Hrvatska; Italija; Turska; Španija; Crna Gora; Tunis), **DALEKE DESTINACIJE**, **KRSTARENJA**, **NOVA GODINA**, **INDIVIDUALNA PUTOVANJA**, **WELLNESS & SPA**, FIRST/LAST MINUTE, SERBIA.
- **Listing example:** https://www.vivatravel.rs/letovanje/grcka/grcka-apartmani/ (a WP hub filled from MARS). The best enumerator is `/services/list/`.
- **Detail examples:**
  - https://www.vivatravel.rs/smestaj/grcka/hanioti/apartmani-nikos/58/
  - https://www.vivatravel.rs/putovanja/rumunija/putovanje-drakula-tura-2-noci-autobus-2026/1266/
  - https://www.vivatravel.rs/putovanja/thailand/putovanje-tajland-bangkok-krabi-i-puket-13-dana-avion-2026/1232/

### Detail-page fields
| Field | Server-rendered? | Selector / hint |
|---|---|---|
| Title | yes | `section.page-type-details h1`. Also `og:title`, `og:image` (mcdn.pro), `<title>` "… - Viva Travel". |
| Destination | yes | Breadcrumb text in `section.page-type-details` (e.g. "Grčka › Hanioti") and the URL. List cards give the full hierarchy, e.g. "Grčka, Istočna Makedonija i Trakija, Tasos, Potos". |
| From-price | trips: yes | "Cena po osobi od € 169" in `section.page-type-details`. Accommodations show "Dostupno na upit" off-season, and unit cards `div.unit[data-unitid]` show "Cena po osobi od … Loading…" (JS). |
| Price tables | AJAX | Tab buttons and modals carry `[data-params]` → `GET /services/get_pricelists/` (details below) |
| PDF price list | yes | `a[href$=".pdf"]` "Program putovanja - PDF", e.g. https://www.vivatravel.rs/wp-content/uploads/Kasandra-SOPSTVENI-cenovnik-2026-br38.pdf. For many Greek apartments this is the only price source. |
| Dates | trips: yes | `.departures .departure` ("Polasci: 10.11. 08.12.") and calendar chips `.departure.pointer` ("2026 Nedelja Novembar 08"). Accommodations have per-unit availability calendars, `table.table-calendar` (36 on the sample page). |
| Duration / transport | yes | "Trajanje: 4 dana \| 2 noći", "Transport: Bus/Avion" |
| Hotel / stars / board | text | Trips: in the includes list ("Smeštaj u hotelu 4* u Bangkoku - 3 noćenja sa doručkom"). Accommodations: name in h1, units in `h3` ("Studio S2 pr", "Duplex A4 pr"). |
| Day-by-day | yes | `section#itinerary .itineraray-day` (sic) → `.day-header` + `.day` |
| Included / not | yes | `section#price-includes`: "Cena uključuje" / "Cena ne uključuje" lists, plus prices of optional excursions |
| Amenities / distances | yes | `section#amenities`, `section#distances` ("More: 250 m") |
| MARS ids | yes | `[data-objectid][data-id][data-objectgroupid]`. objectGroupId **1** = accommodation, **6** = trip. |
| JSON-LD | Yoast only | WebPage / BreadcrumbList / Organization |
| OG | yes | |

What `get_pricelists` receives and returns:
- **Trips:** e.g. `{"unitId":200029,"partnerId":22442,"dynamicPackage":0,"objectGroupId":"6","view":"104.www.details.travel.pricelist_table"}`.
- **Accommodations:** the modal passes `{"publicId":"58","partnerId":22442,"dynamicPackage":0,"objectGroupId":"1","view":"104.www.details.shared.pricelist_table_new"}`. For object 58 this **returned an empty body**, consistent with its "na upit" status.

### Enumeration (verified)
- Request: `GET /services/list/?_page=1&perPage=10&language=sr&objectGroupId=1&dynamicPackage=0`
- Response: JSON `{"html": …, "total": 241}`. Cards are `a.card.card-accommodation` with href `/smestaj/…/<id>/`, the location hierarchy, and either "Dostupno na upit" or a price.
- Trips are presumably listed with `objectGroupId=6` (**not verified**).

### Volume and difficulty
- **241 active accommodations**, plus an estimated **60–130 trips**. The frozen sitemap has 132 trips, many of them 2025 or NG-2026, and it misses the newer ones.
- **Difficulty B** overall, **C** for the subset priced only in PDFs.

### Recommended strategy
1. Reuse the **same MARS adapter** as Ski&Sun, parameterised with partnerId 22442 and view prefix `104.www.details…`. Do not rely on the sitemap.
2. Nightly: `/services/list/` for objectGroupId 1 (and 6 for trips, once verified) → detail pages → `get_pricelists` per unit or object.
3. If that comes back empty, follow the PDF link, extract it with `pdftotext`, and have an LLM read it.
4. **Business route:** ask Viva for MARS agent/B2B access or an export.

Raw files: `raw/viva/` (`offer-sitemap.xml`, `sm-*.xml`, `services-list-group1.json`, `get_pricelists-nikos-58.html` (empty), `main.js`, detail pages).

---

## Cross-cutting observations

1. **Two partners are blocked by the same hosting-level JS anti-bot: Travellino and Montesol.**
   - The script, form fields and IDs are identical, so they are probably on the same host.
   - The challenge returns **HTTP 200**, so the scraper has to recognise it by content (`wsidchk` or "One moment, please") and treat the page as blocked, never as data.
   - It actively detects headless browsers (webdriver flag, headless UA, plugin spoofing), so a quiet Playwright workaround would amount to circumvention.
   - Since ABLux is a contracted subagent, the right path is an IP/UA allowlist from the partner or their host, or a feed. Test from the production egress IP first, because the block may be reputation-based.
2. **Two partners run on NeoLab MARS ERP: Ski&Sun and Viva.**
   - The signs are mcdn.pro images, the same `data-params` schema with different `partnerId` (Ski&Sun 41200, Viva 22442) and view sets (147 vs 104), and the same `/services/list|get_pricelists|get_departures` endpoints.
   - One adapter serves both, and likely other Serbian and Croatian MARS agencies.
   - MARS natively supports agent/subagent logins to price lists and availability. That makes asking for B2B access or an export a cleaner alternative to scraping.
3. **No partner publishes structured offer data.**
   - 4 of 6 sites run WordPress + Yoast, but JSON-LD is always just Yoast's WebPage/Breadcrumb graph (no Product, Offer or Trip).
   - WP REST never exposes the offer types: Nitravel's `tour-item` isn't in REST, Ski&Sun's REST redirects, and Viva/Ski&Sun offers are MARS virtual routes.
   - Every site needs an HTML adapter, plus an LLM pass for free-text semantics such as includes/excludes, `*` markers, discounts and the organizer.
4. **Prices are always EUR, paid in RSD at the NBS middle rate, and usually come as a period × unit matrix.**
   - Greek summer offers use 10-night shifts. Rows are unit types (1/3 APP, 2S, Studio 1/2), and markers such as `*` mean different things at different agencies (package with bus vs. accommodation only, or last-minute).
   - Some prices are per person and some per unit; there are separate bus-ticket tables per departure city; winter offers are priced per day.
   - The import schema needs `basis` (per person / per unit / per day), `includesTransport`, and `price` / `priceOld` per departure × unit, not a single `price` number. Keep a derived "od X €" for the ABLux UI; CLAUDE.md requires a numeric `price`.
5. **Freshness signals are unreliable, so compute activity yourself.**
   - Dunavturs sets lastmod to "today" on every URL.
   - Viva's offer sitemaps have been frozen since 2025-12-19 and duplicate the same 677 URLs three times.
   - Nitravel and Montesol keep 2017–2024 offers online.
   - Use the MARS `/services/list/` totals (Ski&Sun 105, Viva 241) or parsed future dates to decide what is active. Detect changes with a hash of the parsed content.
   - Also capture the **organizer** per offer: Nitravel resells programs organised by other agencies (e.g. Plan A Travel), which matters for ABLux's legal and guarantee text.

## Implementation notes for the ABLux scheduled scraper

- **One adapter per platform:**
  - `wp-roam` (Nitravel)
  - `custom-dunav` (Dunavturs)
  - `mars` (Ski&Sun, Viva)
  - `wp-travelo` (Travellino) and `joomla-montesol`, both blocked until allowlisted
- **Run as a nightly job** from one fixed egress IP with an honest UA and contact address, 1–2 s spacing per host, one host at a time.
  - Estimated daily volume: Nitravel ≤ 320 on the first run, then only lastmod diffs; Dunavturs ~30; Ski&Sun ~220; Viva ~500–700.
- **Store** the raw HTML hash and the parsed JSON. Re-run the LLM extraction only when the hash changes.
- **Never call** booking, inquiry, cart, calc or promo endpoints. Stick to list, detail and price-list GETs.
- **Images:** hotlinking mcdn.pro or partner uploads is technically easy. Confirm usage rights with each partner, which is usually covered by the subagent agreement, before copying them into Convex storage.
