# Partner agencies (set A): scraper feasibility

Research date: 2026-09-30. Prepared for the ABLux Travel scheduled offer importer (Convex).
Method: WebSearch to identify each site, then `curl` with a desktop Chrome UA, a 1.5 s delay between requests and at most 15 requests per site. No logins, forms, booking flows or price-calculator calls. Raw responses are in `/home/claude/research/raw/<slug>/`, and each folder's `_pa_requests.log` lists every request made.
Two sites (holiday.rs, balkanfun.travel) served an anti-bot challenge to this container's IP. For those, structure was confirmed with the WebFetch tool, which runs on different infrastructure and was not challenged. Those findings come from a summarizing model, are marked **[via WebFetch]**, and should be re-checked on raw HTML once the scraper's IP is whitelisted.

## Summary

| # | Agency | Website | Platform | Server-rendered? | robots OK? | ~Active offers | Difficulty | Recommended strategy |
|---|---|---|---|---|---|---|---|---|
| 01 | Astra Travel (Beograd) | https://www.astratravel.rs/ | Custom PHP CMS (Oktopod lineage), Apache, Metronic UI | Yes | Yes (`Disallow:` empty) | ~245 (≈115 apartment houses, ≈130 hotels, 1 congress) | **B** (apartments) / **C** (hotel prices) | Town pages plus the hidden search index → detail → parse the `#cenovnikS table.CSSTableGenerator` matrix. Subagent Word/PDF price lists as a fallback. Hotels: content only, "cena na upit". |
| 02 | Holiday (Kragujevac), probable match | https://www.holiday.rs/ | WordPress 7.1 + Yoast + WP Job Manager (`job_listing` = "Destinacije") | Detail yes; category lists via AJAX | Yes | a few dozen current (not verified) | **C** | WP REST `/wp-json/wp/v2/job-listings` for discovery and text. Prices are **images/PDFs**, so they need OCR/vision-LLM. Imunify360 blocks datacenter IPs: whitelisting required. |
| 03 | Balkan Fun (FG Travel Group, Beograd) | https://balkanfun.travel/ | Drupal 10, custom theme `devokado` | Yes | Yes (Drupal default; offers allowed) | ~48 cards, ≈15–20 active | **B** (content) / **C** (access) | `/putovanja` hub → detail → HTML price tables + `og:title` "od X€". Imunify360 blocks datacenter IPs: whitelisting required. |
| 04 | Holiday Plus KM (Kosovska Mitrovica) | holidaypluskm.com is **defunct** (NXDOMAIN, not registered) | (was WordPress, prices in PDFs) | n/a | n/a | n/a (Facebook/Instagram only) | **n/a** (not scrapable) | Manual entry, or have the partner email PDF/Excel files for LLM-assisted import. Don't scrape Meta. |
| 05 | Hellena Travel (Niš) | https://hellenatravel.rs/ | Same custom PHP CMS as Astra (Oktopod lineage), nginx + PHP 7.4 + Plesk | Yes | Yes (no robots.txt, 404) | ~207 apartment villas + ~150–250 hotels (11 regions) | **B** (apartments) / **C** (hotel prices) | Homepage mega-menu → villa pages → `table.table-hellena` (CMS-generated, clean), filtered by title row. Bus table as a separate per-person add-on. Hotels: content only. |
| 06 | Big Blue (Beograd) | https://bigblue.rs/ | SAN TSG **TourVisio B2C** (ASP.NET / IIS 10) | Yes, with data in inline JSON | Yes, but `Disallow: /*.asmx, /*.ashx` (all AJAX/price APIs) | 28 tour departures (9 programs) + 1,882 hotel pages (catalogue; priced only when searched) | **B** | `sitemap.xml` → `/sr/tour/*` → parse `TourDetailContainer.Prm.Tour` and `.Prm.Hotel` JSON (includes price). Hotel packages from `/sr/hotel/rotator/*` via the `HotelListContainer.load({...})` JSON. Best route: B2B/TourVisio API access. |

---

## 01: Astra Travel, https://www.astratravel.rs/

**Identification.** The logo at `https://www.astratravel.rs/assets/media/logos/astra-travel-logo.jpg` is a blue oval with "Astra travel", a red dotted line and "27 GODINA SA VAMA", which matches the description. Offices: Svetozara Markovića 4, Beograd, and Bulevar Crvene Armije 11 (Belville), Novi Beograd. Confidence: high.

**Access / robots / anti-bot**
- `robots.txt`: `User-agent: * / Disallow:` (empty). Everything is allowed, and there is no crawl-delay.
- Server `Apache`, cookie `PHPSESSID`. No Cloudflare and no challenge across 13 requests.
- `sitemap.xml`: 71 URLs, only 55 of them offers, **all lastmod 2025-11-16**. It is stale and incomplete, so don't use it.

**Platform fingerprint**
- Custom PHP CMS. The front end uses the KeenThemes **Metronic** Bootstrap admin template (`kt_*` ids, `style.bundle.css`, `plugins.bundle.js`).
- The same codebase as **Oktopod Travel** (oktopod.rs): the JSON-LD on detail pages is a copy-paste that still points to `https://www.oktopod.rs/...` URLs and images. The same CMS runs Hellena Travel (agency 05).
- Image paths: `/uploaded_pictures/content/putovanja/1000x634/<slug>-<id>.jpg` (main) and `/625x396/<slug>-<id>-N.jpg` (gallery).

**Offer structure**
- Categories (Greece summer, bus from Belgrade):
  - Grčka apartmani by town (Sitonija: Sarti, Sarti Beach, Sykia, Klimataria, Kalamitsi, Porto Koufo, Toroni, Zaliv Simonitiko, Neos Marmaras, Nikiti, Metamorfosi, Psakoudia; Kasandra: Nea Plaja)
  - Grčka hoteli (`/sr/kasandra/23`, `/sr/sitonia/24`, `/sr/atos/25`, `/sr/grcka-hoteli/22`)
  - Kipar Ayia Napa (`/sr/kipar-ayia-napa/27`)
  - Kongresi (`/sr/kongresi/28`)
  - Last minute (`/sr/last-minute-ponude`)
- URL scheme: listing `/sr/<town-slug>/<catId>`, detail `/sr/putovanje/<slug>/<offerId>` (IDs go up to 307).
- Listing example: https://www.astratravel.rs/sr/sarti/6 has 51 cards.
  - Card: `div.card.js-filter-card[data-filter-group]`
  - Title/link: `a.fs-4.fw-bolder`
  - Image: `.overlay-wrapper img`
  - Ribbon (e.g. "POPULAR - LUX"): `.position-absolute.bg-warning`
  - Amenity badges: `span.badge.js-filter-badge`
  - No price on cards.
- **Full offer index:** every page embeds a hidden global search list, `a[data-kt-searchable="true"]` with `span#searchTitle`, which gives 244 offers. It is not complete (offer 307 "My Sarti Villas" appears only on its town page), so take the union with the town pages.
- Detail examples:
  - Apartment house: https://www.astratravel.rs/sr/putovanje/kuca-akis-sarti/14
  - Hotel: https://www.astratravel.rs/sr/putovanje/porto-sani-5-sani/224

**Detail page fields (server-rendered HTML, no JS needed)**

| Field | Present? / where |
|---|---|
| Title | `h1.text-dark.fw-bolder` = "KUĆA AKIS / SARTI" (name / town); also `<title>` and `og:title` |
| Destination | Town in the title after "/", breadcrumb (Grčka › Leto › Grčka Apartmani › Sitonija › Sarti), JSON-LD `address.addressLocality`, `addressCountry: GR` |
| Price | **Apartments:** `#cenovnikS table.CSSTableGenerator`, a matrix pasted from Excel (cells have `xl71`/`xl72` classes, header cells hold two `<p><strong>dd.mm</strong></p>` dates). Row 1: periods "20.05–01.06 … 21.09–03.10". Row 2: "broj noćenja" (12/7/8/10 noći). Then one row per unit type ("Akis 1/2 studio", 1/3, 1/2+1, 1/3+1, 1/2+2…) with max persons and **EUR per person, package including bus**. Last row: "UMANJENJE PO PLATIVOJ OSOBI ZA SOPSTVENI PREVOZ" (10–50 €). A second table lists the own-transport reduction per shift. **Hotels:** no static price. The `#brosCenovnik` tab is a calculator (`/assets/js/custom/ajax/bros-individual.js` → `POST /assets/php/get_hotel_price.php` with cookie parameters `period_boravka`, `hotel`, `adl`, `chd`, `child1..5`, `tipponude=1`); not called. |
| Currency | EUR, paid in RSD at the NBS middle rate ("Cena aranžmana je izražena u evrima po osobi…"). The header shows "1€ = 117.52 RSD". |
| Dates / terms | Stay periods are the table column headers. The bus leaves the day before the period start. Departure surcharges: Novi Sad/Pančevo +15 €, others +25 €. |
| Nights | "broj noćenja" row |
| Transport | Bus (carrier Rasto tours), tab `#autobuski_prevoz` |
| Hotel/unit info, stars | Stars are in hotel titles ("PORTO SANI 5* / SANI"). Apartments: badges `span.badge.badge-secondary` ("Od plaže - 390m", "Tip smeštaja - studio", "Spratnost - P / I sprat"), plus a unit table (TIP SMEŠTAJA / BROJ SOBE / SPRATNOST) with per-unit modals |
| Board | Hotels: text ("USLUGA: polupansion ili pun pansion"). Apartments: none (self-catering) |
| Images | Yes, see paths above. Matterport 3D tours in iframes; Google My Maps iframe |
| Program | Tab `#programputovanja` |
| Included / not included, notes | Tab `#napomene`, plus payment terms text |
| PDFs | `/files/dokumenta/OUP.pdf`, `/files/dokumenta/prtljag.pdf`, per-unit "PREUZMITE PDF" |
| JSON-LD | `@type: Hotel` (name, description, locality). **`url` and `image` point to oktopod.rs, so don't trust them.** |
| Open Graph | `og:title`, `og:url` (without `/sr/`), `og:type=article`. No `og:image` on detail pages. |

**Extra B2B / partner resources (public page https://www.astratravel.rs/sr/strana/subagenti)**
- 2026 price list per town as **PDF and Word**: `/content_pictures/richfilemanager/Cenovnici/Cenovnik_2026_<Town>.pdf|.doc` for Sarti, Sarti_Beach, Sykia, Klimataria_Beach, Kalamitsi, PortoKoufo, Toroni, Zaliv_Simonitiko, Neos_Marmaras, Nikiti, Metamorfozis, Psakoudia, Kasandra_Nea_Plagia.
- `/files/Katalog_2026.pdf`, `/cenovnici/Program_putovanja_2026.pdf`, and the subagency contract.
- Photo archive on Google Drive.
- "ASTRA ABAKUS" price calculator app, and a bus seating list at `/managebooking/subagent.php` (requires a code).
- **Public availability board** https://www.astratravel.rs/booking_new.php ("Ažurira se nekoliko puta dnevno"): accordion per town and month, one row per shift (`a.list-group-item.available`, `span.availability-badge.badge-available|badge-unavailable`, text "10.05.-20.05. • 10 noći"), each linking to a per-shift PDF `files/izvodi/<CODE>.TXT.PDF`. Currently 395 shifts: 136 "Dostupno", 259 "ZAUZETO". Useful for an availability flag.

**APIs / feeds:** none public, apart from the hotel calculator PHP endpoint (not used).

**Estimate:** ~245 offers: ≈115 apartment houses (static prices), ≈130 hotels (dynamic prices only), and 1 congress item.

**Difficulty:** B for apartments (clean HTML, but Excel-pasted matrices whose layout may vary per offer). C for hotel prices.

**Recommended strategy**
1. Discovery: fetch the homepage and collect `a[data-kt-searchable]`, plus every town listing `/sr/<town>/<id>` (`div.js-filter-card a.fs-4`). Dedupe by numeric ID.
2. Detail: parse `h1`, the badges, `#opis` text, the image URLs, and `#programputovanja` / `#napomene`.
3. Prices: normalise `#cenovnikS table.CSSTableGenerator` into rows of (period_from, period_to, nights, unit_type, max_pax, price_eur_pp, own_transport_reduction). Set `priceFrom` to the minimum. Fallback: parse the per-town `.doc` price lists (libreoffice → HTML) or use LLM extraction on the table HTML when the layout drifts.
4. Hotels: import content with "cena na upit", or ask Astra for a hotel price feed.
5. Optionally, map `booking_new.php` shift availability onto the matrix periods.

---

## 02: "HOLIDAY — Travel Agency" → Holiday Turistička Agencija, https://www.holiday.rs/

**Identification (medium confidence).** The logo at `https://www.holiday.rs/wp-content/uploads/2015/09/holiday-logo.png` is "HOLIDAY" with a **globe in the O** and "TRAVEL AGENCY" at the top right, matching the design. However, its tagline reads **"Tradicija dobrih putovanja"**, not "Discover the world". No other Serbian "Holiday" agency with its own site matched (Holiday World Travel d.o.o., Novi Sad, has no website). **Confirm with the client.** Agency based in Kragujevac, with a booking email of booking@holiday.co.rs.

**Access / robots / anti-bot**
- `robots.txt`: allows everything (it only disallows `/wp-content/uploads/wpo/wpo-plugins-tables-list.json`). The Yoast block points to `Sitemap: https://www.holiday.rs/sitemap_index.xml`.
- **Anti-bot: Imunify360 WebShield JS challenge.**
  - Page: "One moment, please… Please wait while your request is being verified…"
  - The inline script checks for webdriver, headless UA and plugin spoofing, then auto-submits a hidden `wsidchk` form to `/z0f76a1d14fd21a8fb5fd0d03e0fdc3d3cedae52f`. Headers: `cf-edge-cache: no-cache`, `server: Apache`.
  - Requests 1–4 (home, robots, logo, sitemap index) passed. Every request from #5 on (`/wp-json/…`, `job_listing-sitemap.xml`, category page) was challenged, including after a 10-minute cooldown.
  - This is IP-reputation based (it also hit balkanfun.travel, which is on a different IP). **The scraper, running on cloud IPs, will face the same.**
  - I did not try to solve or bypass it.

**Platform fingerprint**
- WordPress 7.1 (meta generator), Yoast SEO, Site Kit 1.187, MasterSlider 3.11.2, Supsystic Data Tables (`supsystic-table-NNN`).
- Offers are the **WP Job Manager** custom post type `job_listing`, relabelled "Destinacije":
  - Detail URL `/destinacija/<slug>/`
  - Category taxonomy `job_listing_category` (REST base `job-categories`), URLs `/destinacija-kategorija/<slug>/`
  - Region taxonomy `job_listing_region`, URLs `/destinacija-lokacije/<slug>/`
- **WP REST is open** [via WebFetch]:
  - `/wp-json/wp/v2/types` includes `job_listing → rest_base: job-listings, name: Destinacije`.
  - `/wp-json/wp/v2/job-listings` returns id, slug, link, modified, title, content, `job-categories`, `job_listing_region`, and `meta` (`_job_location` e.g. "Francuska"/"Oslo", `_application` "booking@holiday.co.rs", `_company_name`, `_filled`, `_featured`, `_remote_position`, `_job_salary`…).
  - Recent offers: Normandija-Bretanja i dvorci Loare (modified 2026-09-29), Skandinavija 7 dana (2026-09-28), Švajcarska gradovi i jezera (2026-09-21).
- Sitemap index (fetched before the challenge started) includes `job_listing-sitemap.xml` (lastmod 2026-09-28), `job_listing_category-sitemap.xml` and `job_listing_region-sitemap.xml`. A summarizer counted about 167 URLs in `job_listing-sitemap.xml`, many of them legacy 2015–2016 hotel pages (unverified).

**Offer structure** [via WebFetch]
- Navigation:
  - Putovanja `/destinacija-lokacije/putovanja-2026/`
  - Letovanja `/destinacija-kategorija/letovanja/`
  - First minute `/destinacija-kategorija/first-minute-ponude/`
  - Last Minute `/last-minute-3/`
  - Avio karte `/avio-karte-2/`
  - Zimovanja `/destinacija-kategorija/zimovanje/`
  - Banje Srbije `/destinacija-kategorija/banje-srbije/`
- Category pages render the list client-side through WP Job Manager AJAX: the noscript text reads "JavaScript must be enabled in order to view listings", and the page shows "10 rezultata je pronađeno" for Putovanja. The standard WPJM endpoint is `/jm-ajax/get_listings/` (not tested).
- Detail examples:
  - https://www.holiday.rs/destinacija/andaluzija-u-jesen-putovanje-2026/
  - https://www.holiday.rs/destinacija/svajcarska-gradovi-i-jezera-putovanja-2026/ (REST id 5549)

**Detail page fields (server-rendered)** [via WebFetch]

| Field | Present? / where |
|---|---|
| Title | H1 "Andaluzija u jesen – putovanje 2026" |
| Destination | Title, `_job_location` meta, region taxonomy |
| Dates | Text "Termin: 07.10.2026" |
| Days | Text "Broj dana: 7" |
| Transport | Text "Putovanje: AVION" (Air Serbia direct flight) or bus ("…BUS…" in image names) |
| Hotels / board | Free text ("hotel Bajondilo sa 4*", "noćenja sa doručkom") |
| Program | Yes, day-by-day in text ("07.10. 1. dan BEOGRAD – SEVILJA") |
| Included / not included | "ARANŽMAN OBUHVATA / NE OBUHVATA", sometimes rendered **as an image** |
| **Price** | **The main price table is an image**, e.g. `/wp-content/uploads/2026/09/SVAJCARSKA-CENA-BUS-28-sept-7-dana-659.jpg`, plus a program PDF (e.g. `/wp-content/uploads/2026/09/Svajcarska-7-dana-2.pdf`, `/wp-content/uploads/2026/08/Anadaluzija-7-oktobar.pdf`). Only supplements are text ("DOPLATE: DODATNO SEDIŠTE U AUTOBUSU: 80 €, JEDNOKREVETNA SOBA: 270 €"; "DOPLATA ZA JEDNOKREVETNU SOBU … 290 €"; transfers "NIŠ, ALEKSINAC: 30€"). |
| Currency | EUR, paid in RSD at the NBS rate |
| Images | `/wp-content/uploads/YYYY/MM/*.jpg` |
| JSON-LD / OG | Yoast WebPage/BreadcrumbList/WebSite graph (no Product/Trip); standard Yoast OG tags |

**Estimate:** a few dozen current trips (the REST list is sorted by modified date and the sitemap mixes in legacy pages). Get the exact number from the `X-WP-Total` header of `/wp-json/wp/v2/job-listings` once the IP is whitelisted.

**Difficulty:** C. Discovery would be A (REST), but prices live in images/PDFs, and Imunify360 blocks datacenter IPs.

**Recommended strategy**
1. Ask Holiday to **whitelist the scraper's egress IP** in Imunify360 (their host can do this), or to send offers directly.
2. Page `GET /wp-json/wp/v2/job-listings?per_page=100&page=N&_embed` (or use `job_listing-sitemap.xml`). Filter with `modified` and `_filled=0`.
3. Clean `content.rendered` and extract Termin / Broj dana / Putovanje / program / obuhvata / doplate with regex or an LLM.
4. For price: select `<img>` whose filename contains "CENA" or "cenovnik" and run a vision-LLM/OCR over it, or parse the linked PDF (pdf→text then LLM).
5. Flag these prices "to be confirmed" in the UI.

---

## 03: Balkan Fun, https://balkanfun.travel/

**Identification.** "Balkan Fun Travel" (FG Travel Group d.o.o., Balkanska 27, Beograd), focused on youth, party and city-break trips. Confidence: high.

**Access / robots / anti-bot**
- `robots.txt` is the stock Drupal file. It disallows `/core/`, `/profiles/`, `/admin/`, `/search/`, `/user/*`, `/node/add/`, `/comment/reply/`, `/media/oembed`. Offer paths are allowed, and there is no crawl-delay.
- **Anti-bot:** the same **Imunify360 WebShield** challenge (`wsidchk`, `server: openresty/1.31.1.1`) on the **very first** homepage request and again after a 10-minute cooldown. robots.txt itself was served normally. The IP (185.119.89.240) differs from holiday.rs, which points to IP-reputation greylisting.
- **Drupal JSON:API** is not enabled (`/jsonapi` returns 404, via WebFetch).
- `/sitemap.xml` exists. A summarizer reported about 445 URLs, apparently all `/blog/…` (unverified), so it is not a usable offer index.

**Platform fingerprint:** Drupal 10 (meta generator), custom theme `themes/custom/devokado`. Images: `/sites/default/files/styles/max_1300x1300/public/YYYY-MM/<file>?itok=…`.

**Offer structure** [via WebFetch]
- **Hub listing https://balkanfun.travel/putovanja**: about 48 cards, including inactive ones, on one page with no pagination. Sections:
  - Nova godina 2027 (`/putovanja/novogodisnja-putovanja`)
  - Jesen 2026 (`/putovanja/jesenja-putovanja`)
  - Specijalne ponude: FLEX Festival, Party putovanja za mlade, First minute, Studentske ekskurzije, Leto za mlade, Grčka leto
  - LETO 2027 / u pripremi (`/putovanja/leto`)
  - Hoteli
- Each card shows the title, **"Cena od 260 EUR 159 EUR"** (old and discounted price), dates, nights, transport, and a status badge: **"NIJE AKTIVNO"** (inactive, 30+ cards) or **"NOVO"**.
- Detail URL patterns are inconsistent: `/putovanje/<category>/<slug>`, `/putovanja/<category>/<slug>`, `/putovanje/leto/grcka-leto/<slug>`.
- Detail examples:
  - https://balkanfun.travel/putovanje/novogodisnja-putovanja/krakov-nova-godina (active)
  - https://balkanfun.travel/putovanje/prolecna-putovanja/rim-prolece (inactive, "NIJE AKTIVNO")

**Detail page fields (server-rendered)** [via WebFetch]

| Field | Present? / where |
|---|---|
| Title | H1 "Krakov Nova godina 2027" |
| From-price | **`og:title` = "Krakov Nova godina 2027 od 159.00€ \| Balkan Fun"** (machine-readable), plus button text "REZERVIŠI: OD 159 €" |
| Price table | HTML table, **per person**: rows = room/hotel options, columns = departure dates ("29.12. - 03.01. Nova Godina 2027"), cells show old/new price ("269€ 169€") |
| Dates | "29.12.2026. – 3.1.2027." |
| Nights / days | From the program (3 nights / 6 days) |
| Transport | Bus ("Prevoz turističkim autobusima…"); some offers "AVIONOM" (e.g. Kušadasi avio) |
| Hotels / stars / board | "Hotel Daisy 2★ … doručak", "Hotel Daisy Superior 3★", "Hotel Zakliki" |
| Program | Day-by-day headings ("Beograd – Novi Sad – Mađarska – Slovačka", "Poljska – KRAKOV") |
| Included / not included | Yes (Obuhvata / Ne obuhvata / fakultativni izleti) |
| PDFs | None seen |
| JSON-LD | None. OG: title and description present. |
| Status | "NIJE AKTIVNO", "BROJ MESTA OGRANIČEN", "First minute akcija" |

**Estimate:** about 48 offers listed, of which roughly 15–20 are active.

**Difficulty:** B for content (clean Drupal HTML, prices in HTML). Access is effectively **C** until the IP is whitelisted.

**Recommended strategy**
1. Get the IP whitelisted.
2. Fetch `/putovanja`, collect card links and skip "NIJE AKTIVNO" cards.
3. For each detail page: take `og:title` for the from-price (regex `od ([\d.]+)€`), H1, and the price `<table>` (rows × dates; parse "old new" pairs, keeping the last number as the current price). For text sections, use a heading-anchored split or LLM extraction.
4. Confirm exact Drupal field classes (`field--name-…`) on raw HTML once access works.

---

## 04: Holiday Plus KM, website defunct

**Identification.** "HOLIDAY PLUS K.M. OD", Kosovska Mitrovica. Active channels are Facebook (https://www.facebook.com/holidaypluskm/) and Instagram (@holidaypluskm).

**Findings**
- `holidaypluskm.com` and `www.holidaypluskm.com` return **NXDOMAIN** (dns.google Status 3). Verisign RDAP returns **404**, so the domain is **not registered** any more. The proxy's CONNECT fails with 502.
- The Wayback Machine (1,209 captured URLs, 2011–2024) shows a WordPress site. Offers were WP pages/posts (`/grcka-leto-2023/`, `/hotel-heksamil-4/`, `/category/kopaonik-2023/`, `/nova-godina-2024-budva/`, `/senior-turizam/`) with **price lists as PDFs** (`/wp-content/uploads/2023/02/Cenovnik-CRNA-GORA-2023-003.pdf`, `/wp-content/uploads/2021/04/KEMER-AVIO-2021-CEN-br-1.pdf`, …).
- The last real content capture is from 2023-11-28. By 2024-04-15 the domain served a parking redirect (`/lander`), and PDFs returned 404 from July 2024.
- Search results still list old pages (e.g. `/crna_gora_hoteli.html`), but they are dead.

**Difficulty:** not scrapable. Facebook and Instagram are login-walled and their terms forbid scraping.

**Recommendation:** agree on a feed with the partner instead: emailed PDF/Excel price lists or a shared Google Sheet, imported with LLM-assisted extraction into the same offer schema, or entered manually in the admin. Re-check periodically in case the partner launches a new domain.

---

## 05: Hellena Travel, https://hellenatravel.rs/

**Identification.** The logo `/images/hellena_logo.svg` is an orange (`#F47521`) "Hellenatravel" wordmark, which matches. Offices: Niš (head office), with representatives in Beograd and Novi Sad. Confidence: high.

**Access / robots / anti-bot**
- `robots.txt` returns **404**, so there are no restrictions.
- Server `nginx`, `X-Powered-By: PHP/7.4.30` and `PleskLin`, IP 78.46.71.253 (Hetzner). No challenge across 7 requests. (The analyzer's "cloudflare" hit is only the cdnjs Font Awesome include.)
- `sitemap.xml` lists **`http://www.oktopod.rs/...` URLs** (405 `<loc>`, lastmod 2026-02-13). It is a copy of Oktopod's sitemap and useless.

**Platform fingerprint**
- The **same Oktopod-lineage PHP CMS as Astra**: `/uploaded_pictures/content/letovanje/...`, the same `bros-individual.js` hotel calculator, and the same hidden inputs `#tipponude=1`, `#hotel=<id>`.
- A Bootstrap travel HTML template (`.flight-destinations`, `.destination-item`).
- B2B link "Online za subagente" → `http://109.111.252.198/secure/login`.

**Offer structure**
- Apartments: 26 towns, listing `/grcka-apartmani/<town>` (e.g. https://hellenatravel.rs/grcka-apartmani/polihrono). Detail `/letovanje/grcka-apartmani/<town>/<villa-slug>`. The **global mega-menu on every page lists all 207 villa URLs**.
- Hotels: 11 regions, `/grcka-hoteli/<region>-hoteli` (atos, epir, jonska-obala, kasandra, kavala, peloponez, pieria, sitonija, tasos, tesalija, thessaloniki). Detail `/letovanje/grcka-hoteli/<region>-hoteli/<hotel-slug>`.
  - Kasandra alone has 38 hotels. Hotel card: `.destination-item`, title in `h3 a`, region label in `p.package-days`, image `/uploaded_pictures/content/letovanje/960x540/<slug>-<id>.jpg`.
- Other: `/last-minute-ponude`, `/dokumenti`, `/krediti`, `/zamenski-vauceri`.
- Detail examples:
  - Villa: https://hellenatravel.rs/letovanje/grcka-apartmani/polihrono/vila-anastasia
  - Hotel: https://hellenatravel.rs/letovanje/grcka-hoteli/kasandra-hoteli/calypso-2-hanioti

**Detail page fields: villa (server-rendered)**

| Field | Present? / where |
|---|---|
| Title / destination | `h2` in `.breadcrumb-content` = "Vila Anastasia / Polihrono" (villa / town); `<title>`, `og:title` |
| Description | Free text, e.g. "…na oko 120 metara udaljenosti od plaže…" |
| Geo | Text "Latitude: 40.018560 Longitude: 23.524490" |
| Facts | "Od plaže: 120 m", "Klima uređaj: dodatno se naplaćuje", "WiFi: besplatno", Kuhinja, Televizor |
| Price list version | `h3` "Cenovnik" and "VILA ANASTASIA - 10 NOĆI", with **"Cenovnik br.5 od 09.04.2026."** (useful for change detection) |
| **Price** | **`table.table-hellena`**, generated by the CMS with a clean, regular layout: row 1 `td[colspan=27]` = "Vila Anastasia / Polihrono"; row 2 "PERIOD BORAVKA / BROJ NOĆENJA"; row 3 nights per column (10); row 4 "TIP/STRUKTURA" plus periods "22.05 01.06 …"; then unit rows ("1/2 APT", "1/3 APT", "1/4 APT") with **EUR per apartment per period**; last row a footnote ("Korišćenje klima uređaja se doplaćuje 5 € dnevno"). `-` = not offered; **`td.bg-danger` = sold out** ("POLJA OZNAČENA CRVENOM BOJOM … RASPRODATE KAPACITETE"); `*` = shifts with a different transport rule. There are two tables per villa (two shift calendars). **The page embeds the tables of every villa in the town (41 tables), so filter by the title row.** |
| Transport | "TABELA AUTOBUSKOG PREVOZA": **per person, separate from accommodation**, by departure city (Novi Sad 95 €, Beograd 85 €, Niš 75 €, Valjevo/Užice 125 €…; children 0–9.99 cheaper; surcharge on `*` shifts; own transport −25 €) |
| Program | "Program putovanja" section (meeting point, night drive…) |
| Included / payment | "…obuhvata…" text, "Cene su izražene u eurima…", discounts (15% until 1 Feb, etc.) |
| Images | `/uploaded_pictures/content/letovanje/800x533/<slug>-<id>[-N].jpg` (internal ID, e.g. 2999) |
| JSON-LD | None. OG: title, url, type only. |
| Page weight | About 1 MB decompressed (all town tables) |

**Hotel detail:** description with LOKACIJA / SADRŽAJ / USLUGA / SOBE, a gallery, "U cenu aranžmana je uračunato / nije uračunato", and a program. **Prices only through a dynamic calculator** ("Cene su prikazane kroz dinamički cenovnik… važe isključivo u trenutku izvršene pretrage"; "CENE su izražene po SOBI"; "Hoteli se rade na upit"; "nije moguće koristiti autobuski prevoz").

**Estimate:** 207 villas, plus roughly 150–250 hotels across the 11 regions.

**Difficulty:** B for villas. The tables are the cleanest of this set: regular and CMS-generated. C for hotel prices.

**Recommended strategy**
1. Fetch the homepage and collect `a[href^="/letovanje/grcka-apartmani/"]` (207) and the 11 hotel region pages → `.destination-item h3 a`.
2. For villa detail: take the `h2` split on " / ", the description, lat/lon, "Od plaže", and "Cenovnik br.N od DATE" (skip re-parsing when unchanged).
3. From `table.table-hellena`, keep only tables whose first row equals the `h2`. Emit (period, nights, unit, price_eur_per_unit, sold_out = `td.bg-danger`).
4. Parse the bus table once per page as a global add-on (`transportPricePerPerson` by city).
5. Hotels: import content with "cena na upit", or request B2B access (the "Online za subagente" system).

---

## 06: Big Blue, https://bigblue.rs/

**Identification.** The logo `Themes/DefaultSanTSG/SubThemes/BigBlue/assets/images/logo.png` is a spiral with "Big Blue" and "www.bigblue.rs", which matches. Address: Kolarčeva 3, Beograd. Confidence: high. There is also a legacy subdomain, putovanja.bigblue.rs (same IP).

**Access / robots / anti-bot**
- `robots.txt`: `Allow: *`, `Disallow: /*.asmx`, `Disallow: /*.ashx`. That blocks **every AJAX/price web service**. The declared `Sitemap: http://b2c.bigblue.rs/Sitemap.xml` returns **404**.
- The working **https://bigblue.rs/sitemap.xml** has 2,089 URLs (hreflang sr/en) with **every lastmod = 2026-09-29**, i.e. regenerated daily, so lastmod carries no change signal.
- No challenge across 9 requests. Pages are heavy: tour page 3.1 MB and hotel page 5.8 MB decompressed (0.6–1.1 MB gzipped).

**Platform fingerprint**
- **SAN TSG TourVisio B2C**: ASP.NET/IIS 10, `Themes/DefaultSanTSG`, `/js/api/TvWebClient.js`, `Sf.Core.App.B2C.*`, services at `/ScriptService/CommonForScript.asmx`, `…/DefaultSanTSGService.asmx`, `AutoCompleteData.ashx`.
- Media on `services.bigblue.rs` / `b2cservice.bigblue.rs`, documents on `cms.bigblue.rs`.
- B2B "Agencije login" at https://online.bigblue.rs/.
- Former-Yugoslavia hotels (Bjelašnica, Kolašin, Budva, Kranjska Gora…) sell through an **external Phobs booking engine** (`https://secure.phobs.net/webservice/bookingsiteid/index.php?site_id=bigblue&destination=…`, 84 links). Out of scope.

**Offer structure**
- Sitemap composition: 1,882 `/sr/hotel/<country>/<region>/<hotel>/` (Turkey 665, Greece 470, Spain 146, Bulgaria 74, Cyprus 65, Tunisia 64, Italy 61, UAE 59, Egypt 41, …), 28 `/sr/tour/<slug-dd-mm-yyyy>/` (one URL per departure; 9 distinct programs such as Andaluzijska tura ×10, Bangkok i Puket ×4), plus CMS landing pages (`/sr/becici`, `/sr/jahorina`, `/sr/zima-2026-27/`…).
- Menu categories: Letovanje (Turska, Grčka – sopstveni prevoz, Egipat, Kipar, Španija, Malta…), Zima, Topla jesen, Last minute, Evropske metropole, Kružne ture, Daleka putovanja, Nova godina, Wellness & Spa.
- Listing examples:
  - https://bigblue.rs/sr/hotel/rotator/last-minute-15-dana-do-putovanja/ (server-embedded priced offers)
  - https://bigblue.rs/sr/evropske-metropole (Angular tiles loaded by AJAX from `.asmx`, disallowed)
- Detail examples:
  - Tour: https://bigblue.rs/sr/tour/andaluzijska-tura-11-10-2026--novo/
  - Hotel: https://bigblue.rs/sr/hotel/egipat/hurgada/sheraton-soma-bay/

**Tour detail (server-rendered; data sits in inline `<script>` JSON)**
- `TourDetailContainer.Prm.Tour = {...}`, about 25 KB:
  - `id` ("17770"), `code` ("11ANDAT26N"), `name`
  - `itineraries[] {day, items[{location{name,lat,lon}, description}]}`, a day-by-day program
  - `textCategories[]`: `IMPORTANT` holds the price basis and **"Jedinstvena cena putovanja obuhvata…"** (included/excluded); `SHORTINFO` holds the summary, e.g. "7 dana (6 noćenja) - avionom i autobusom, Polazak: 11. oktobar 2026 / Povratak: 17. oktobar 2026"
  - `mediaFiles[]` (images under `https://services.bigblue.rs/media/images/product/...`) and `brochures[]` (program PDF)
- `TourDetailContainer.Prm.Hotel = {...}`, the **pre-computed offer for the default search** (`TourDetailContainer.Prm.PriceSearchCriteria`: 2 adults):
  - `stars` 4, `location/city` MALAGA with lat/lon, `hotelCategory`
  - `offers[0]`: `checkIn` 2026-10-11, `night` 6; `rooms[0]` STANDARD / DOUBLE ROOM, `boardName` "BED & BREAKFAST", boardGroup "NOĆENJE SA DORUČKOM", `allotment` 26
  - `price {oldAmount: 2980.00, percent: 0, amount: 2980.00, currency: "EUR"}`. This is most likely the **total for the 2 default adults**: `travellers` has 2 entries, the room is DBL, and `offerId` ends in `$2980.00$2`. No per-person figure appears in the HTML.
  - `transportation {outbound/return}` flights BEG-AGP / SVQ-BEG, `offerId`, `expiresOn`
- `og:title` is just "bigblue.rs Tour", so it is useless. No JSON-LD on tour pages.

**Hotel detail**
- JSON-LD `@type: Hotel` (name, image).
- `HotelDetailContainer.Prm.productInfoResponse = {"seasons":[{textCategories: description, facilities, video…}]}`, and `HotelDetail.Prm.Geolocation.Latitude/Longitude`.
- All-inclusive concept PDF, e.g. `https://cms.bigblue.rs/b2cDocuments/PDF/All%20inclusive%20koncepti/Egipat/Hurgada/Sheraton-soma-bay.pdf`.
- **No prices in the HTML**: 0 `"amount"` occurrences. Prices load from `/ScriptService/CommonForScript.asmx` (robots-disallowed) using `defaultDate` 2026-11-19 and `defaultNight` 10.

**Rotator lists**
- `/sr/hotel/rotator/<slug>/`: last-minute-15-dana-do-putovanja, hurgada-hoteli, dubai-hoteli, topla-jesen-hoteli, … (linked from the homepage and menu).
- They contain `HotelListContainer.load({"body":{"searchId":…,"hotels":[…]}})`, with **fully priced offers per hotel**: name, stars, city/country, themes, `offers[].checkIn/night/rooms[].accomName/boardName/price/transportation` (charter flight codes, e.g. SM388/SM387).
- Example: 11 Hurgada hotels, departure BEG on 2026-10-13, 10 nights All Inclusive, 2 adults, 1,469.64–2,918.00 EUR total.
- Price fields: `price.oldAmount` is the list price, `price.amount` the discounted total, `price.percent` the discount %, and `rooms[].spo.amount` the discount value. For example, Rewaja Inn Resort: oldAmount 2498.00, amount 1772.22, 29.05 % off, spo 725.78.
- The same page also embeds `HotelList.Prm.Data.AllHotels`, a 3,736-hotel catalogue (id, code, name, category, urlName), which is handy as a slug/ID map.

**Estimate:** 28 tour departures (9 programs) with prices. The 1,882 hotel pages are catalogue entries without HTML prices. Priced package offers are available through the rotator lists (≈10–50 hotels per list).

**Difficulty:** B. Data is structured JSON, but pages are huge, prices exist only for the default 2-adult search, and hotel-level prices sit behind robots-disallowed APIs.

**Recommended strategy**
1. **Preferred:** ask Big Blue for B2B/API access (TourVisio supports agency accounts and a Web API; ABLux as a subagent likely already has an online.bigblue.rs login).
2. Otherwise, use `sitemap.xml` → `/sr/tour/*/` → regex/brace-extract `TourDetailContainer.Prm.Tour =` and `TourDetailContainer.Prm.Hotel =` JSON. Map to title, code, dates (`offers[0].checkIn` + `night`), `price.amount` ÷ 2 for a per-person from-price (check `travellers`), board, flights, itinerary, IMPORTANT/SHORTINFO text, brochure PDF and images.
3. For hotel packages, parse the rotator pages' `HotelListContainer.load(` payload. Use hotel detail pages only for descriptive content (`productInfoResponse` plus JSON-LD).
4. Stream and limit response size (3–6 MB pages). Never call `.asmx`/`.ashx`.

---

## Cross-cutting observations

1. **Shared platforms.**
   - Astra (01) and Hellena (05) run the **same Oktopod-lineage PHP CMS**: `/uploaded_pictures/content/...` image paths, the identical `bros-individual.js` hotel calculator, and a sitemap and JSON-LD copy-pasted from oktopod.rs.
   - Both specialise in Halkidiki apartments sold by bus, using **period × unit-type price matrices**.
   - One parser module with per-site selectors can cover both (and probably Oktopod and other agencies on that CMS).
   - Hotel slugs overlap across them (`calypso-2-hanioti`, `ammon-garden-3-pefkohori`…), so dedupe hotels across partners by normalised name, stars and town.
2. **Anti-bot on shared hosting.** Imunify360 WebShield (a JS challenge with a `wsidchk` form) blocked this cloud IP on 2 of 6 sites (holiday.rs and balkanfun.travel, on different servers, so it is reputation-based). Convex actions also run from cloud IPs, so expect the same. The clean fix is to have each partner's host **whitelist the scraper's fixed egress IP**, or to route fetching through a small fixed-IP worker. Do not solve or bypass the challenges.
3. **Three price models to support in the schema.**
   - (a) Static matrices: Astra EUR per person including bus; Hellena EUR per apartment plus a separate per-person bus table; Balkan Fun EUR per person with old/new price.
   - (b) Dynamic engines, where only default searches are embedded: Big Blue totals for 2 adults; Astra and Hellena hotels via calculator only.
   - (c) Images/PDFs: Holiday.rs, and historically Holiday Plus KM.
   - Store `priceBasis` (per_person / per_unit / total_2adl), `transportIncluded`, the full matrix, a derived `priceFrom`, `currency` (always EUR; payment in RSD at the NBS middle rate) and a `priceConfidence` flag for OCR/LLM-derived values.
4. **Sitemaps are unreliable across the board.** Astra's is stale (Nov 2025, 55 of ~245 offers), Hellena's is Oktopod's, Big Blue's declared sitemap 404s and the real one has daily fake lastmods, and Balkan Fun's appears to be blog-only. Holiday.rs's Yoast/REST is the exception. Discover offers from on-site hubs (Astra's hidden search index plus town pages, Hellena's mega-menu, Balkan Fun `/putovanja`, Big Blue sitemap tour URLs plus rotators). Detect changes with content hashes, or the "Cenovnik br.N od DATE" stamp on Hellena.
5. **Official subagent channels exist and are often better than scraping.** Astra's public subagent page (Word/PDF price lists, availability board `booking_new.php`, ABAKUS calculator), Hellena's "Online za subagente", and Big Blue's online.bigblue.rs / TourVisio B2B. Since ABLux is a contracted subagent, request feeds, API access and IP whitelisting, and confirm rights to reuse photos and descriptions. Holiday Plus KM has no website at all, so it needs a manual or emailed-file workflow.

## Request log summary (curl, this container)

| Site | Requests | Notes |
|---|---|---|
| astratravel.rs | 13 | 2 were write-failures caused by a helper-script clash; all others 200 |
| holiday.rs | 8 | #1–4 OK; #5–8 Imunify360 challenge (after a 10-min cooldown too). Plus 7 WebFetch calls |
| balkanfun.travel | 3 | Home and category challenged; robots OK. Plus 5 WebFetch calls (1 was 404 `/jsonapi`) |
| holidaypluskm.com | 2 | DNS failure (NXDOMAIN). Plus dns.google, Verisign RDAP, web.archive.org CDX |
| hellenatravel.rs | 7 | All OK (robots 404) |
| bigblue.rs | 9 | All OK (declared sitemap 404) |
