# Noćni izveštaj — ABLux Travel 2.0

Svaki korak dopisuje svoju sekciju ispod. Rezime ide na vrh u koraku 16.

## Rezime noći (za vlasnika) — 1. oktobar 2026.

### Šta radi i kako da vidite

Sve je lokalno i na Convex **DEV** bazi. Produkcija nije dirana: nema deploy-a ni push-a (grana `ablux-2.0`).

1. Pokrenite sajt: `npm run dev` → `http://localhost:3000`. Produkcioni build: `npm run build`, pa `npx next start -p 3137`.
2. Prijava u admin: `http://localhost:3000/auth`. Nalozi i lozinke su u `night-run/SECRETS.local.md`:
   - vlasnik `abluxtravel@gmail.com`;
   - QA urednik i QA kupac.

   **Odmah promenite lozinku vlasnika.**

| Deo | Gde |
|---|---|
| Početna: „Živa razglednica“ (4 video scene), prava pretraga sa živim brojem, sekcije iz baze | `/` |
| Katalog: 306 javnih ponuda partnera, filteri u URL-u, skeleti, prazno stanje | `/ponude` |
| Stranica ponude: termini i cene sa osnovom, organizator, program, upit | `/ponude/<slug>` |
| ABLux programi, korpa i IPS QR (cena sa servera) | `/aranzmani`, `/verski-turizam` |
| Ostale stranice u novom stilu, teme Papir i Tinta, SR i EN | `/destinacije`, `/putovanja`, `/iznajmljivanje-vozila`, `/o-nama`, `/kontakt`, 404 |
| Admin: Pregled, Upiti, Ponude, Nove i izmenjene, Partneri, Ručni unos, Sadržaj, Podešavanja, Ctrl+K | `/admin` |
| Partner Sync: automatski uvoz u 06:00, „Pokreni sada“ sa zaključavanjem | `/admin/partneri` |
| Bezbednost: prava prijava, uloge, sve admin funkcije zaštićene na serveru | `check-access` 160/160, e2e 10 + 1 preskočen |

Dokumentacija:
- `README.md`;
- `docs/RUNBOOK-sync.md` (Partner Sync);
- `docs/UPUTSTVO-ADMIN.md` (uputstvo za administraciju, na srpskom);
- `docs/PARTNER-EMAIL.md` (pismo partnerima).

### Šta prvo testirati (15 minuta)

1. Prijavite se i promenite lozinku (`/admin/podesavanja/korisnici`).
2. Upišite prave kontakt podatke i broj licence (`/admin/podesavanja`). Futer i `/kontakt` ih odmah prikazuju.
3. Otpremite prave fotografije autobusa i kombija (`/admin/iznajmljivanje-vozila`). Na DEV-u su sada snimci ekrana.
4. `/ponude`: filter „Nova godina i praznici“, otvorite jednu ponudu i pošaljite probni upit. Upit se zatim vidi u `/admin/upiti`.
5. `/admin/partneri`: pregledajte kartice partnera (logo, organizator, licenca). Dugme „Pokreni sada“ ne pritiskajte pre koraka iz sledećeg odeljka.

### Poznati problemi

**Visoki**
- **Stara admin lozinka.** Lozinka iz koda pre koraka 03 trajno je u istoriji gita, a repozitorijum ima GitHub `origin`. Server je ne prihvata, ali je promenite svuda gde je korišćena.
- **Fotografije vozila na DEV-u** su snimci ekrana tuđeg sajta (podatak, ne kod).
- **Uvoz partnera je delimičan.** Noćni limit je bio 60 zahteva po partneru. Automatski uvoz 2. 10. u 06:00 preskočiće većinu partnera, jer im je limit iskorišćen u poslednja 24 h.
  - Uradite: `npx convex env set SYNC_DAILY_REQUEST_CAP 800`, pa jednom `npx convex run sync/orchestrator:startRun '{"trigger":"cli","forceRefetch":true}'`.
  - Taj uvoz donosi i ispravke parsera (Tomash, Viva, Nitravel, Astra).

**Srednji**
- **Dve sakrivene Tomash ponude** („Prag 2 noćenja“, „Krajova Advent“) imale su pogrešnu zemlju iz starog parsera. Posle ponovnog uvoza vratite ih na sajt (Admin → Ponude → „Vrati na sajt“).
- **5 partnera čeka dozvolu (whitelist/feed):** Holiday, Balkan Fun, Jungman, Travellino, Montesol. Pismo je u `docs/PARTNER-EMAIL.md`.
- **Nedostaju:** e-pošta za nove upite (nije izabran dobavljač), editor za „O nama“, stranice „Opšti uslovi“ i „Politika privatnosti“ (potreban tekst).
- **IPS QR naplaćuje punu cenu**; polje „depozit %“ se još ne koristi (pitanje za vlasnika).
- **Na DEV-u nema ABLux programa koji se trenutno prodaje.** „Turska“ i verska ponuda Tumane imaju prošle datume. Za demo korpe dodajte jedan program sa budućim datumom.

**Niski**
- **Engleski tekst** se primenjuje posle učitavanja stranice; server šalje srpski.
- **Ponavljanje u adresi:** 58 starih kartica (uglavnom Tomash) ima ponovljen deo, npr. `vila-strmec-ohrid-vila-strmec-ohrid-tomash`. Nove ga nemaju; stare se ne menjaju zbog stabilnih adresa.
- **Nekorišćene sekcije** u `lib/i18n.ts` imaju stari tekst; nigde se ne prikazuju.
- **Prolazna greška pri build-u:** jednom je pao zbog Google fonta; ponovni build prolazi.

### Šta ostaje za četvrtak

1. Povećati limit i uraditi pun ponovni uvoz, pa proveriti `/admin/izmene` i uzorke (`sync/ingest:qualitySample`).
2. Uneti prave podatke: kontakt, licencu, fotografije vozila i tima, bar jedan ABLux program i jednu versku ponudu sa budućim datumom.
3. Poslati pismo partnerima; za blokirane pripremiti mašinu sa fiksnom IP adresom za relay.
4. Izabrati dobavljača e-pošte za obaveštenja o upitima; pripremiti tekstove opštih uslova i politike privatnosti.
5. Developer: plan za produkciju (novi ključevi, `ABLUX_SERVER_SECRET`, migracija korisnika; `CLAUDE.md` → Auth). Ništa od toga se ne radi automatski.

### Demo za petak (10 minuta, na trenutnoj ponudi)

Pokrenite produkcioni build na `localhost:3137`, ili `npm run dev`. Pre demoa uradite ponovni uvoz iz odeljka „Poznati problemi“, da cene i termini budu sveži.

1. **(1 min) Početna `/`.** Hero „Živa razglednica“: smena scena, klik na kartu „Evropski gradovi“. Skrolujte: scena postaje razglednica u „Uskoro polaze“. Pokažite i „17 agencija, jedan potpis“ sa živim brojem ponuda.
2. **(2 min) Nova godina.**
   - U pretrazi „Kuda putujete?“ izaberite „Nova godina i praznici“ → `/ponude?tip=nova-godina-i-praznici` (**26 ponuda**).
   - Otvorite `/ponude/putovanje-pariz-nova-godina-4-noci-avion-viva` (Viva, polazak 30. 12., od 899 € po osobi).
   - Pokažite i `/ponude/krstarenje-nilom-kairo-bigblue` (Big Blue, 28. 12., cena „ukupno za 2 odrasle osobe“).
   - Naglasite: organizator i licenca, link na original, „Ažurirano“, napomena o plaćanju u dinarima po srednjem kursu NBS.
3. **(1,5 min) Istanbul.**
   - `/ponude?q=istanbul` (**7 ponuda**, Viva i Nitravel).
   - Otvorite `/ponude/putovanje-istanbul-3-noci-autobus-2026-viva` (od 129 €, polazak 20. 10.).
   - Kliknite „Rezerviši / Pošalji upit“, popunite i pošaljite.
4. **(1,5 min) Tunis.**
   - `/ponude?zemlja=tunis` (**47 hotela** SunLine sa letom iz Beograda).
   - Otvorite `/ponude/mahdia-beach-and-aquapark-mahdia-sunline`: tabela termina sa cenom po osobi i ishranom. Na telefonu (390 px) termini su kartice.
5. **(1 min) Zima.**
   - `/ponude?tip=zimovanje` (**35 ponuda**).
   - Otvorite `/ponude/hotel-iglika-palace-borovec-skiandsun` (Ski & Sun, Borovec, od 72 € po danu, od 19. 12.).
   - Uključite temu Tinta (mesec u meniju).
6. **(2 min) Admin.**
   - `/admin`: Pregled; poslati upit iz tačke 3 je u „Upiti“. Promenite status u „U obradi“, pa „Poništi“; dodajte belešku.
   - `/admin/izmene`: šta je uvoz promenio.
   - `/admin/partneri`: 17 kartica, svetla, „Čeka dozvolu“, „Pokreni sada“ sa odbrojavanjem do 06:00.
   - Ctrl+K → „malta“ ili „pokreni“.
7. **(1 min) Zaključak:**
   - jedan katalog za 17 agencija, osvežava se svakog jutra;
   - upit u dva klika;
   - koleginica radi sve bez developera.

Ne koristite letnje ponude za leto 2026 (istekle su i namerno se ne prikazuju) ni aranžman „Turska“ (završen, test tekst).

## Tok noći (skripta)

- 2026-09-30 23:31:11 — start runa (koraci 1–16)
- 2026-09-30 23:34:33 — start runa (koraci 1–16)

## Korak 01 — Priprema: pravila, dokumentacija, čišćenje, brze popravke

**Urađeno**
- `CLAUDE.md` je napisan ispočetka prema planu 2.0: produkcija se ne dira, dizajn sistem (`DESIGN.md`, Cormorant + Manrope, Sora ide napolje, teme Papir/Tinta), ciljana autentifikacija (serverske sesije, korak 03) uz legacy `localStorage` auth označen za uklanjanje, pravila za cene ("Cena na upit", korpa i IPS samo za ABLux programe), server rendering javnih stranica i arhitektura Partner Sync-a. `agents.md` je skraćen, a napomena o Context7 je zadržana.
- `DESIGN.md` (652 reda, format Impeccable „document“) sadrži tokene za obe teme sa proverenim kontrastima, tipografiju sa pravilom za dijakritike, razmake, raspored, komponente (dugme, polje, čip, karta sa zasečenim uglovima i pečatom, razglednica, mesingana pločica, isprekidana ruta sa pinovima, naslov sa nadnaslovom, navigacija, futer, tabela, dijalog i sheet), pokret, pravila za slike i admin „operate“ mod. Uz njega je sidecar `.impeccable/design.json`.
- Kompovi su premešteni iz `public/generated/concepts/` u `design/comps/legacy/` i više se ne serviraju javno (URL daje 404).
- Uklonjena je nekorišćena zavisnost `sanity-plugin-lucide-icon-picker`. `.playwright-mcp/` i ostali traženi unosi već su bili u `.gitignore` i nisu praćeni u gitu.
- Lažne ponude su uklonjene: demo ponude u `lib/use-offers.ts` i izmišljene verske ponude na `/verski-turizam`. Bez podataka sada se prikazuje prazno stanje. `/ponude` razlikuje stanje „nema objavljenih ponuda“ od stanja „nema rezultata za filter“.
- Lažni kontakt podaci su uklonjeni iz `lib/use-settings.ts`, `lib/seo.ts`, `lib/i18n.ts` i iz admin placeholdera. Futer, `/kontakt` i plutajuće kontakt dugme prikazuju samo polja popunjena u Podešavanjima. Kad nijedno nije popunjeno, prikazuje se „Kontakt podaci uskoro“, a plutajuće dugme se sakriva. JSON-LD više nema kontakt polja. `SITE_URL` fallback je `https://www.abluxtravel.com`.
- Bag sa temom je popravljen: provider više ne prepisuje sačuvanu temu tokom hidracije. Podrazumevana tema je Papir (light), a tema se čuva samo kad je korisnik promeni. Isto važi za jezik. Provereno u browseru: i sačuvana „dark“ i sačuvana „light“ tema ostaju posle učitavanja, a pri prvoj poseti tema je light i ništa se ne upisuje.
- ESLint više ne proverava skill skripte, partner fixture-e i night-run alate.

**Gate**
- `npx convex dev --once`: prošao.
- `npx tsc --noEmit`: prošao, 0 grešaka (i pre i posle).
- `npm run lint`: pre ovog koraka 413 grešaka i 4760 upozorenja, sve iz `.claude/skills/` i `docs/partners/raw/*.js`, ne iz koda sajta. Posle ignore unosa: 0 grešaka, 0 upozorenja.
- `npm run build`: prošao, 26 ruta.

**Nije urađeno / poznati problemi (za naredne korake)**
- Kontakt podaci za JSON-LD treba da se čitaju iz Convex `settings` kad stranice pređu na server rendering (korak 12).
- `DESIGN.md` beleži neslaganja koda sa dizajnom za korak 04:
  - zlatna dugmad sa svetlim tekstom i zlatni linkovi na papiru ne prolaze kontrast;
  - globalni focus ring je plavo-cijan;
  - naslovi imaju premalu visinu reda (odsečeni kvačice na č/ž);
  - Manrope se učitava bez `latin-ext`;
  - Sora i Georgia su još u upotrebi;
  - tekst je negde premali (0.48–0.72rem);
  - `:root`, navigacija i futer su još navy;
  - `themeColor` u viewport-u je navy;
  - reveal animacija koristi `filter: blur`.
- `docs/design/hero-prompts.md` i `night-run/run.ps1` su izmenjeni van ovog koraka i nisu u commitu koraka 01.

**Kako proveriti**
- `/kontakt` i futer na bilo kojoj stranici: bez podataka u admin Podešavanjima vidi se „Kontakt podaci uskoro“. Posle unosa u `/admin/podesavanja` pojavljuju se samo popunjena polja.
- `/ponude` i `/verski-turizam`: nema izmišljenih ponuda.
- Tema: izaberite svetlu temu, osvežite stranicu, pa proverite da li je ostala svetla.
- `/generated/concepts/desktop-routes.png` vraća 404.
- korak 01 OK — 18 min, pokušaja 1
- korak 02 OK — 170 min, pokušaja 2

## Korak 03 — Bezbednost: prava prijava, uloge, zaštićene funkcije, cene sa servera

**Šta je sada zaštićeno**
- Prijava ide preko **Convex Auth** (lozinka, Scrypt). Sesija je u httpOnly kolačićima koje postavlja `proxy.ts` (Next 16). Stari `localStorage` "admin" više ništa ne otključava i briše se pri učitavanju.
- **Uloge:** vlasnik, urednik, korisnik. Sve admin funkcije u Convex-u proveravaju sesiju i ulogu na serveru: sadržaj, porudžbine, fajlovi, podešavanja, slajdovi, slike vozila. To je 56 javnih funkcija; svaka je klasifikovana u `scripts/security/function-access.json`.
  - Porudžbine (lični podaci kupaca) vide samo urednik i vlasnik.
  - Korisnike, uloge i audit log vidi samo vlasnik.
- **Uklonjeno:**
  - hardkodovana lozinka i javni `ensureAdminUser`, koji je pri svakom učitavanju vraćao staru lozinku;
  - javni `login`/`register` bez ograničenja pokušaja;
  - `orders.create`, koji je primao cene iz browsera.
- **`/admin`:**
  - Anonimni posetilac se preusmerava na `/auth`.
  - Prijavljeni kupac vidi „Nemate pristup administraciji“.
  - Uloga se proverava i na serveru (layout) i u browseru. U sidebaru su uloga i dugme „Odjavi se“.
- **Korpa i IPS:**
  - Browser šalje samo id i količinu. Cena, naziv i iznos u dinarima računaju se iz baze. Ruta `/api/ips/checkout` čuva porudžbinu samo uz serverski ključ (`ABLUX_SERVER_SECRET`).
  - U korpu idu samo ABLux programi. Partnerske i „subagency“ ponude imaju samo „Pošalji upit“, a na `/destinacije` nema dugmeta za korpu.
- **Zaštita od zloupotrebe:**
  - posle 10 pogrešnih lozinki nalog se privremeno zaključava;
  - ograničenja za registraciju, staru prijavu i checkout;
  - skriveno „honeypot“ polje na registraciji i u korpi;
  - audit log (ko, šta, kada) za sve izmene urednika i vlasnika i za prijave zaposlenih.
- **Stari nalozi:**
  - Kupci sa starom lozinkom se normalno prijavljuju; pri prvoj prijavi lozinka prelazi na Scrypt.
  - Stari admin hash, tj. lozinka koja je bila u kodu, više se nikad ne prihvata.
  - Migracija na DEV: 2 naloga. Vlasnik je dobio ulogu owner, a stari duplikat `abluxtravel` je isključen.

**Kako se prijaviti**
- Lozinke su samo u `night-run/SECRETS.local.md` (nije u gitu): vlasnik `abluxtravel@gmail.com` i QA nalozi (`qa-editor@ablux.local`, `qa-customer@ablux.local`).
- Prijavite se na `/auth` i odmah promenite lozinku u Admin → Podešavanja → Korisnici (`/admin/podesavanja/korisnici`).
- Novi zaposleni se registruje na `/auth`. Vlasnik mu na stranici Korisnici dodeli ulogu „Urednik“ (tu može i da isključi nalog).

**Testovi (svi prošli)**
- `node --env-file=.env.local scripts/security/check-access.mjs` daje **103/103 PASS**:
  - svaka admin funkcija bez prijave daje UNAUTHENTICATED, a kupcu FORBIDDEN;
  - urednik ne vidi korisnike ni audit log;
  - javni upiti ne vraćaju neaktivne stavke;
  - stara lozinka vlasnika ne radi;
  - posle 10 pogrešnih pokušaja nalog je zaključan;
  - stari kupac se prijavljuje, a hash se prebacuje na Scrypt;
  - izmenjen iznos porudžbine se odbija;
  - cene u porudžbini su iz baze (verska ponuda: 250 „ДИН“ se računa kao 250 RSD);
  - 11. checkout sa istog klijenta se blokira.
- `scripts/security/e2e-auth.mjs` (Playwright, pravi browser) daje **11/11 PASS**:
  - preusmerenje sa `/admin` na prijavu, prijava urednika, admin editori učitavaju podatke;
  - posle osvežavanja sesija ostaje; kolačići su httpOnly;
  - odjava radi; kupac nema pristup; editor dock se vidi samo osoblju;
  - vlasnik vidi tabelu uloga;
  - pravi IPS QR preko NBS-a: korpa je tvrdila cenu 1, server je naplatio 250 RSD iz baze.
- Rezultati: `night-run/qa/03-security-check.json`, `night-run/qa/03-e2e-auth.json`; screenshotovi `night-run/qa/03-*.png`.
- Gate: `npx convex dev --once`, `npm run lint` (0 problema), `npx tsc --noEmit` i `npm run build` su prošli.

**Šta je otvoreno**
- **Pitanje za vlasnika:** IPS QR naplaćuje punu cenu, kao i ranije. Polje „depozit %“ na aranžmanima se još ne koristi.
- **Produkcija nije dirana.** Za produkciju kasnije treba:
  - nov par ključeva i novi `ABLUX_SERVER_SECRET` na Convex PROD i Vercelu;
  - posle deploya pokrenuti `users:migrateLegacyUsers` i bootstrap vlasnika.

  Do bootstrapa vlasnik na produkciji neće moći da se prijavi; to je namerno, jer se stara lozinka više ne prihvata. Detalji su u `CLAUDE.md` → Auth.
- **Sve stranice se sada renderuju dinamički**, jer root layout čita auth kolačić.
- **Na DEV su ostali QA nalozi** (`qa-lockout-*`, `qa-legacy-*`) i otkazane QA porudžbine (status „cancelled“).
- **Tabela `rateLimits`** raste sporo (jedan red po ključu). Dnevno čišćenje treba dodati kasnije.
- **`/auth` stranica** je funkcionalno nova, ali još u starom izgledu; redizajn je u koraku 12. Admin redizajn je u koraku 13.
- **Port 3000** zauzima drugi lokalni projekat, pa su testovi rađeni na portu 3100.

**Kako proveriti**
- `/admin` bez prijave vodi na `/auth`. Prijava vlasnika vodi na `/admin`, a u sidebaru piše „Vlasnik“.
- `/admin/podesavanja/korisnici`: promena lozinke i tabela uloga.
- Korpa: dodajte versku ponudu, pa Checkout → IPS QR. Iznos je iz baze.
- korak 03 OK — 65 min, pokušaja 1

## Korak 04 — Dizajn sistem: tokeni, teme, fontovi, bazne komponente

**Urađeno**
- **Teme Papir i Tinta rade na celom sajtu** preko tokena u `app/styles/tokens.css`. Stari navy/cijan sistem (`--hero-*`, `--alien-*`, `--signal-*`, `#155eef`, `#071226` …) je uklonjen; stare promenljive (`--bg`, `--primary`, `--muted` …) sada su samo nadimci novih tokena, pa sve postojeće stranice i dalje rade. Tailwind dobija klase iz teme: `bg-surface`, `text-fg-muted`, `border-line`, `text-accent-fg`, `font-serif` itd.
- **Kvačice na č, ž, š su rešene.** Test u browseru je pokazao da sam font Cormorant crta kvačicu kao odvojeno „v“ koje lebdi iznad slova (u težinama 400–600, u svim varijantama fonta). Zato je naslovni font sada **EB Garamond** (ista klasična Garamond porodica, pravi kurziv, ispravna srpska slova). Sora je potpuno uklonjena. Naslovi imaju line-height 1.1 i malo prostora za kvačice. Dokaz: `night-run/qa/04/glyph-compare-zoom.png` (pre) i `glyphs.png` (posle).
- **Biblioteka komponenti** u `components/ui/` (uvoz iz `@/components/ui`): dugmad (zlatno, sekundarno, mastilo, providno na tamnom, tekst-link, „opasno“), polja sa labelom iznad (greška, pomoć, „obavezno“, onemogućeno, učitavanje), čipovi za filtere, oznake i statusne tačke, **karta (TicketCard)** sa zarezima i perforacijom, pečat sa kodom rute, cena („od 590 €“ + osnovica, „Cena na upit“, NBS napomena), **razglednica** sa nazubljenom ivicom, markicom i poštanskim žigom, **mesingane pločice 01–05**, **ruta** sa iscrtavanjem pri skrolu i čiodama, naslov sekcije, skeleton, prazno stanje sa predlozima, dijalog i donji panel, kartice (tabs), harmonika, tabela (i „kartice“ na telefonu za cenovnike), obaveštenje sa „Poništi“. Ikone: lucide (debljina 1.5) + sopstveni gravirani znakovi (kompas, crkva, krst, more, grad, autobus).
- **Pokret:** `useReveal` / `<Reveal>` (pojavljivanje pri ulasku u ekran) i `useRouteDraw` (iscrtavanje rute); sve se gasi kad korisnik traži smanjeno kretanje.
- **`/dev/ui`** prikazuje sve komponente u obe teme jednu ispod druge (nije u meniju, `noindex`, zabranjeno u `robots.txt`).
- **CSS je raščišćen:** `app/globals.css` sada samo uvozi `app/styles/` (tokens, base, components, chrome, legacy, home). Obrisano je ~1.700 linija mrtvog CSS-a i 8 komponenti koje niko nije koristio; `app/ui-enhancements.css` je spojen i obrisan. Staklo i plavi sjaj u starim stilovima zamenjeni su papirom i paletom.
- **Usput popravljeno:** `/ponude`, `/verski-turizam`, `/putovanja/[zemlja]` i `/destinacije` su padale na DEV podacima zbog valute „ДИН“ (`lib/format-money.ts`).

**Provera (sve prošlo)**
- Gate: `npx convex dev --once`, `npm run lint` (0 problema), `npx tsc --noEmit`, `npm run build`.
- Produkcioni build (`next start`): 13 stranica × 2 teme bez ijedne greške u konzoli; `/dev/ui` na 1440 i 390 px u obe teme bez grešaka; stanja (hover, fokus, dijalog vraća fokus na dugme, donji panel, obaveštenje) provereni.
- Bezbednosni e2e test iz koraka 03 ponovo: **11/11 PASS** (prijava, admin, uloge, checkout sa cenom iz baze). Test je na DEV-u napravio još jednu QA porudžbinu od 250 RSD (kao i ranije).
- Snimci: `night-run/qa/04/` (`dev-ui-*.png`, `states-*.png`, `prod/page-*.png`, `glyph*.png`).

**Šta nije urađeno / poznato**
- Početna stranica u Tinti i dalje izgleda svetlo (ima svoje kopije tokena) — to je korak 11. Na kartici rute 02 na početnoj nadnaslov se malo približio broju u krugu zbog višeg line-height-a; korak 11 ionako prelazi na mesingane pločice.
- Meni, futer i chat dugme su samo „prefarbani“ (bez plavog), pravi redizajn je korak 05. Stare stranice (ponude, destinacije, admin) imaju još poneki plavi gradijent u samom TSX-u — koraci 10–13.
- Dev server (`next dev`) povremeno vrati 500 pri prvom otvaranju stranice dok se kompajlira; u produkcionom buildu se ne javlja.
- Playwright otvara sajt na engleskom (jezik iz browsera) — nije dirano u ovom koraku.

**Kako proveriti**
- `/dev/ui` — sve komponente, gore Papir, dole Tinta. Probajte Tab kroz dugmad, „Otvori dijalog“ (Esc zatvara), „Otvori donji panel“ na telefonu, „Obaveštenje sa „Poništi““.
- Prekidač teme u meniju (mesec/sunce) na `/ponude` ili `/kontakt`: Tinta je mastilo-zelena, ne plava.
- Bilo koji naslov sa „ž“, „č“, „š“ (npr. „Najtraženije rute“ na početnoj): kvačica stoji odmah iznad slova.
- korak 04 OK — 65 min, pokušaja 1

## Korak 05 — Globalni okvir: meni, pretraga, futer, 404/500

**Urađeno**
- **Novi meni:**
  - Preko tamnog heroja na početnoj meni je providan, sa svetlim tekstom i dugmadima na tamnoj podlozi. Time je rešen problem slabog kontrasta u svetloj temi. Posle skrola traka postaje papir (Papir) ili mastilo (Tinta).
  - Logo sa natpisom „ABlux TRAVEL“. Stavke: **Ponude**, Verski turizam, Rent a bus, O nama, Kontakt.
  - Desno: pretraga, SR/EN, tema i korpa. Korpa se vidi samo kad u njoj ima nešto. Diskretan link „Administracija“ vide samo zaposleni.
- **Mega meni „Ponude“:**
  - 8 vrsta putovanja: Verski turizam, Letovanje, Evropski gradovi, Nova godina i praznici, Zimovanje, Daleka putovanja, Izleti, Krstarenja. Uz svaku vrstu stoji broj ponuda.
  - Linkovi na ABLux aranžmane, putovanja po zemljama i destinacije, plus kategorije iz baze.
  - Kartica „Ne znate gde? Pošaljite upit“.
  - Otvara se klikom ili tasterom Enter; Esc ga zatvara.
- **Meni na telefonu:** ceo ekran u boji mastila, velika slova i velika dugmad. Fokus ostaje unutar menija, a Esc ga zatvara. Dole su jezik, tema, prijava i kontakt iz podešavanja.
- **Pretraga „Kuda putujete?“:**
  - Polja: tip putovanja, mesec, broj putnika, polazak iz. Broj ponuda se računa uživo iz Convex-a, a slanje vodi na `/ponude?tip=…&mesec=…&putnika=…&polazak=…`.
  - Na računaru se otvara kao dijalog, na telefonu kao donji panel.
  - Kad hero nestane sa ekrana, ispod menija se pojavljuje „lepljiva“ pilula za pretragu.
  - Verzija trake za hero je gotova; na početnu je ugrađuje korak 11.
- **Novi futer** (mastilo, isprekidana ruta koja se završava u Beogradu):
  - Kolone: Ponude, Verski turizam, Rent a bus, O nama, Kontakt, Partneri.
  - Kontakt se čita samo iz podešavanja; dok ih nema, piše „Kontakt podaci uskoro“.
  - Ispod: napomena o ceni u evrima i plaćanju po kursu NBS, i linija licence kad je upisana.
- **Kontakt dugme (dole desno):** novi izgled. Na telefonu se skloni dok je traka pretrage na ekranu. Vidi se samo ako u podešavanjima postoji bar jedan kanal (telefon, e-pošta ili Instagram).
- **404 i greška („izgubljena karta“):** karta sa pečatom „NEVAŽEĆA“ ili „ODLOŽENO“ i putevi nazad: Početna, Ponude, Kontakt. Na grešci postoji i dugme „Pokušaj ponovo“.
- **Admin → Podešavanja:** novo polje **„Licenca (OTP)“**. Kad ga popunite, broj licence se pojavljuje u futeru.

**Provera (sve prošlo)**
- Gate: `npx convex dev --once`, `npm run lint` (0 problema), `npx tsc --noEmit`, `npm run build`.
- QA na produkcionom buildu (`night-run/qa/05/chrome-qa.mjs`): **26/26 PASS** u obe teme.
  - Meni je providan preko heroja, a posle skrola pun.
  - Mega meni radi preko tastature i vraća fokus.
  - Pilula otvara pretragu, a pretraga šalje na `/ponude?tip=…`.
  - Futer ima NBS napomenu i nema lažnih kontakata.
  - 404 radi; na telefonu meni i pretraga rade kao modal i panel.
- 12 stranica × 2 teme bez grešaka u konzoli.
- Bezbednosni testovi: `check-access` **103/103**, e2e prijava/admin/checkout **11/11** (napravljene su i otkazane QA porudžbine na DEV-u, kao ranije).
- Snimci: `night-run/qa/05/` i `night-run/qa/05/prod/`.

**Šta je otvoreno**
- **Brojevi u pretrazi i mega meniju su 0 na DEV-u.** Jedine dve ponude u bazi imaju polazak u prošlosti, a takve se ne broje. Kad stignu ponude partnera (koraci 07–10), brojevi će se pojaviti sami. Korak 10 menja samo izvor podataka za pretragu.
- **`/ponude` još ne filtrira po novim parametrima** (`tip`, `mesec`, `putnika`, `polazak`); to je korak 10.
- **Hero na početnoj ima i dalje staru, dekorativnu traku** (korak 11).
- **Nedostaju stranice „Opšti uslovi“ i „Politika privatnosti“**, pa ih nema ni u futeru. Potrebni su tekstovi od vlasnika.
- **Na DEV-u nisu upisani kontakt podaci ni licenca**, pa futer prikazuje neutralni tekst, a kontakt dugme se ne vidi.

**Kako proveriti**
- Početna: meni je providan preko slike. Skrolujte: meni postaje papir, a ispod njega se pojavljuje „Kuda putujete?“. Kliknite pilulu, izaberite vrstu i kliknite „Prikaži ponude“.
- „Ponude“ u meniju (miš ili Tab + Enter): otvara se mega meni; Esc ga zatvara.
- Telefon (390 px): dugme ☰ otvara meni preko celog ekrana; lupa otvara pretragu kao donji panel.
- `/bilo-sta`: stranica „Ova karta ne vodi nigde“.
- Admin → Podešavanja: upišite broj licence; pojavljuje se u futeru.
- korak 05 OK — 36 min, pokušaja 1
- RUN ZAUSTAVLJEN: auto mod nije dostupan (vidi logs/run.log)
- 2026-10-01 07:55:27 — start runa (koraci 1–16)
- 2026-10-01 07:58 — napomena: zaustavljanje u 05:50 nije bio problem sa auto modom, nego 5h limit pretplate (reset 07:30), koji je stara verzija skripte pogrešno protumačila. Skripta je ispravljena (čeka reset sama, a dvoklik na POKRENI.cmd nastavlja od prvog nezavršenog koraka); korak 06 je nastavljen u istoj sesiji u 07:55.
- korak 06 OK — 38 min, pokušaja 1

## Korak 07 — Partner Sync: šema, jezgro, prvi adapteri, prvi pravi uvoz (SunLine)

**Šta je urađeno**
- **Rezervna kopija** DEV baze pre promene šeme: `night-run/backups/07-20261001-0833.zip`.
- **Šema (kompatibilna unazad):** nove tabele za ponude partnera — `offerCards` (kartica za katalog), `offerDetails` (detalji), `offerSyncMeta` (knjigovodstvo uvoza), `offerChanges` (dnevnik promena), `syncRuns` + `syncRunItems` (uvozi i stavke po partneru), `syncQueue`, `syncState`, `partnerImages`, `inquiries` (upiti, za korak 10), `manualImports` + `offerDrafts` (ručni uvoz, korak 08). Tabela `sources` je proširena u **registar partnera**; stara tabela `offers` (verske ponude ABLux-a) nije dirana.
- **Registar 17 partnera** upisan na DEV: **11 aktivnih**, **5 „Čeka dozvolu (whitelist/feed)“** (Holiday, Balkan Fun, Jungman, Travellino, Montesol), **Holiday Plus KM ručno**. Logotipi `/partners/partner-01.png` … `partner-17.png` po brojevima iz zadatka. Licenca organizatora upisana je samo gde je poznata (Nitravel OTP 101/2021 kat. A); ostalo popunjava vlasnik.
- **Jezgro (`scraper/`):**
  - Pristojan HTTP klijent: robots.txt (uključujući Crawl-delay), najmanje 1,5 s između zahteva po sajtu (Tomash 10 s), pošten User-Agent, dnevni limit zahteva, samo dozvoljeni sajtovi i putanje, zabrana booking/kalkulator/.asmx/formi, zaštitne stranice („One moment, please“, `wsidchk`, Cloudflare) i prekid TLS veze = **blokirano**, nikad podaci.
  - Srpski parseri: datumi i rasponi (sa pravilom za godinu), cene („od 1.234 €“, stara/nova, „na upit“), trajanje, ishrana, prevoz; matrice „termin × smeštaj“; čišćenje HTML-a; normalizacija i heš sadržaja.
  - Vreme Beograda bez Intl (letnje/zimsko računanje), ciklus 06:00–06:00.
- **Adapteri sa testovima (61 test, vitest):**

| Partner | Šta se izvlači | Poznata ograničenja |
|---|---|---|
| SunLine | Hoteli u Tunisu iz JSON pretrage: naziv, zvezdice, mesto, slika, termini (datum, noći, soba, ishrana, let, cena po osobi, raspoloživost); opis, galerija i koordinate hotela (dodatni zahtev) | Grupni programi (leto 2026) se preskaču; link ka hotelu je rekonstruisan iz koda sajta |
| Dunav Turs | Vile: matrica perioda × tip apartmana (cena po osobi, samo smeštaj, 10 noći), cenovnik br., GPS, autobus po gradovima kao doplate, slike; putovanja: datum, trajanje, cena, program po danima, obuhvata/ne obuhvata | Slike su samo HTTP — biće kopirane u storage u koraku 09; leto 2026 je prošlo pa su vile neaktivne |
| Viva (MARS) | Liste smeštaja/putovanja, putovanja: polazak, cena „od“, trajanje, prevoz, država, program, uključeno/isključeno, galerija; smeštaj „Dostupno na upit“ = cena na upit | Lista putovanja (objectGroupId 6) nije ranije proverena; ako je prazna, uvozi se samo smeštaj |
| Ski & Sun (MARS) | Liste (cena po danu/boravku), detalj hotela, cenovnik (periodi × sobe, stara/nova cena) | Cena „po danu“ prikazuje se tako kako partner piše (bez preračunavanja) |
| Rapsody (MARS) | Lista 56 putovanja (datumi polazaka, cena „Već od“, stara cena, trajanje, prevoz, oznake), detalj: program po danima, uključeno/isključeno, mesta polaska | Putovanja bez datuma na kartici vode se kao „na upit“ (lista sadrži samo aktivna) |

- **Uvoz u Convex:** radnik (Node akcija) radi u koracima: lista → paketi do 25 stranica → završetak. Upis je idempotentan (partner + ID), nepromenjene ponude se ne prepisuju (heš), objava je automatska po partneru, ABLux izmene (naslov, uvod, kategorija, naslovna slika) se ne gaze. Na kraju: skidanje ponuda koje partner više ne nudi (samo kad je lista kompletna i nema sumnjivog pada), isticanje po datumu, dnevnik promena, brojači po partneru.
- **Prvi pravi uvoz (SunLine, DEV):** 10 živih zahteva → **36 hotela** sa cenama od 451 € po osobi, letovi iz Beograda, slike. Status „delimično“ jer je limit od 10 zahteva namerno dostignut. Na DEV-u je postavljen `SYNC_DAILY_REQUEST_CAP=60`.

**Šta nedostaje (sledeći koraci)**
- Korak 08: adapteri Astra/Hellena, Mayak (+ Jungman samo test), Nitravel, Tomash, Big Blue; ručni uvoz (Holiday Plus KM); admin funkcije za ponude.
- Korak 09: raspored 06:00, dugme „Pokreni sada“ sa zaključavanjem, relay CLI, test dostupnosti, pravi uvoz za svih 11, kopiranje slika (Dunav).
- Korak 10: javni katalog i stranica ponude.

**Zahtevi ka partnerima ove noći (DEV):** SunLine 10 (limit noći je 60 po partneru). Blokirani partneri: 0.

**Kako proveriti**
- Testovi: `npm test` (61 prolaze).
- Poslednji uvoz: `npx convex run sync/orchestrator:runStatus`
- Uzorak ponuda: `npx convex run sync/ingest:qualitySample '{"partnerSlug":"sunline","n":5}'`
- Brojač zahteva: `npx convex run sync/ingest:requestLedger '{"hours":24}'`
- Gate: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` — sve prolazi.
- korak 07 OK — 40 min, pokušaja 1

## Korak 08 — Partner Sync: ostali adapteri, ručni uvoz, admin funkcije za ponude

**Šta je urađeno**
- **Pet novih adaptera** (samo na sačuvanim stranicama, bez ijednog živog zahteva): Astra i Hellena (Oktopod), Mayak (WordPress „tourpackage“; Jungman koristi isti adapter ali ostaje blokiran), Nitravel (WordPress Roam), Tomash (WordPress REST, razmak 10 s), Big Blue (TourVisio: čitanje stranice od 3–6 MB se prekida čim stigne potreban JSON; cena je „ukupno za 2 odrasle osobe“ i tako se i čuva).
- **Blokirani partneri:** Travellino i Montesol dobili su parsere samo za Wayback snimke; preuzimanje i dalje odbijaju. Zaštitne stranice („One moment, please“, `wsidchk`, Cloudflare) i prekid TLS veze zaustavljaju uvoz kao **BLOKIRANO** sa porukom „Sajt partnera blokira automatsko preuzimanje (zaštita od botova). Potrebna je dozvola (whitelist IP adrese) ili feed.“ — testirano za svaki novi adapter.
- **Ručni uvoz (Holiday Plus KM i svaki partner kasnije), backend:** urednik otprema PDF, Excel (.xlsx), CSV ili fotografiju cenovnika; tip i veličina se proveravaju (stari .xls/.doc: „Sačuvajte fajl kao PDF ili .xlsx“). Ako je postavljen `ANTHROPIC_API_KEY`, Claude Haiku 4.5 čita fajl u **nacrte** koje urednik proverava i odobrava; bez ključa urednik unosi ponude kroz formular. Objava ide istim putem kao automatski uvoz (kartica, detalj, dnevnik promena). Na DEV-u ključ **nije** postavljen → aktivan je ručni unos. Formular i ekrani dolaze u koraku 13.
- **Admin funkcije za ponude (urednik):** lista sa pretragom i filterima (javne, neobjavljene, sakrivene, neaktivne, skinute, sa cenom / na upit, mesec, vrsta putovanja), detalj ponude sa poslednjih 20 promena, ABLux izmene (naslov, uvod, vrste putovanja, naslovna slika — preživljavaju svaki novi uvoz), grupno objavi / sakrij / istakni. Sve izmene idu u audit log.
- **Bezbednost:** 13 novih javnih funkcija upisano je u `function-access.json`. Provera na DEV-u: anonimni → UNAUTHENTICATED, kupac → FORBIDDEN, urednik čita listu i detalj bez internih polja (54 + 46 + 6 provera, sve PASS).

| Partner | Adapter | Testovi (fixture) | Poznate rupe |
|---|---|---|---|
| Astra Travel | `oktopod` | 4: indeks 244 ponude + 21 kategorija; discover (22 zahteva); Kuća Akis (16 perioda od 20.05., 158 € po osobi, neaktivna 1.10.); Porto Sani (5*, polupansion, „na upit“) | Hoteli imaju cene samo u kalkulatoru partnera → „Cena na upit“; `booking_new.php` se ne poziva |
| Hellena Travel | `oktopod` | 3: 207 vila + 11 regiona; Kasandra 38 hotela; vila Anastasia (samo njene tabele, 145 € za „1/2 APT“, rasprodato, GPS, autobus Beograd 85 €); Calypso „na upit“ | Hoteli „na upit“ (cena po sobi kod partnera); leto 2026 prošlo → vile neaktivne |
| Mayak Tours | `tourpackage` | 6: kategorija 20 linkova / 12 strana; slug-ovi kategorija provereni; Malta (379/469 € i 359/469 € „do 01.10.“, avion, aktivna); Hotel Tropical (12 perioda, 990 € po sobi, „od 36 € po osobi / noć“) | Sajt broji preglede → detalji se osvežavaju jednom u 30 dana; arhive su ograničene na 15 strana |
| Jungman Travel | `tourpackage` | 1: isti adapter, `liveFetchAllowed: false`, status blokiran | Nema snimaka sadržaja; čeka dozvolu (prekid TLS veze) |
| Nitravel | `wp-roam` | 4: sitemap 310 programa; Prag (155/175, 139/159, 155/175 €, organizator „Plan A Travel“, OTP 222/2021 kategorija A, cenovnik br. 51); vila Elpida (samo njeni redovi, 12 perioda) | Programi stariji od 540 dana se ne preuzimaju; vile su leto 2026 (neaktivne) |
| Tomash Tours | `wp-rest` | 4: 100 objava + 41 kategorija; discover kroz REST (3 zahteva); Istanbul (6 polazaka, od 130 €, gradovi polaska, doplata Užice 20 €, PDF cenovnik); razmak 10 s | Termini nemaju cenu po datumu — cena „od“ uz napomenu da zavisi od hotela i mesta polaska |
| Big Blue | `tourvisio` | 5: 14 tura + rotatori; tačno izdvajanje JSON-a; rano zaustavljanje čitanja (stranica od 4 MB); Andaluzijska tura (2.980 € za 2 odrasle, BB, STANDARD, šifra 11ANDAT26N); rotator 11 hotela (Rewaja Inn 1.772,22 / 2.498 €, all inclusive, Hurgada) | Brošure i dodatne slike čekaju proveru hosta uživo; osnova cene rotatora se proverava na prvom uvozu |
| Travellino | `travelo` (samo parser) | 1: Toskana (189/209 €, 6 dana programa); preuzimanje odbija | Blokiran (JS provera za botove) — čeka dozvolu |
| Montesol | `joomla` (samo parser) | 1: Vila Nikos (paket po osobi sa autobusom + najam po studiju, 12 slika); preuzimanje odbija | Blokiran; stranica „Evropski gradovi“ (više tura na jednoj stranici) nije parsirana |
| Holiday Plus KM | ručni uvoz | 6 jediničnih (ručna ponuda, „na upit“, program po danima, AI šema i mapiranje) + QA prolaz na DEV-u (napravljena, objavljena, skinuta, počišćena) | AI čitanje radi tek kad vlasnik postavi `ANTHROPIC_API_KEY`; ekran u koraku 13 |

**Zahtevi ka partnerima u ovom koraku:** 0 (brojač za 24 h: SunLine 10 iz koraka 07).

**Kako proveriti**
- Testovi: `npm test` (103 prolaze; korak 08 dodaje 42).
- Ručni unos na DEV-u: `npx convex run manualImport:qaManualRoundTrip` (pravi, skida i briše QA ponudu).
- Da li je AI uključen: `npx convex run manualImport:hasAiKeyInternal` (vraća samo true/false).
- Bezbednost: `node --env-file=.env.local scripts/security/check-access.mjs --only inventory` (69 javnih funkcija).
- Gate: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` — sve prolazi.

**Za vlasnika (ujutru)**
- Za automatsko čitanje cenovnika Holiday Plus KM postaviti `ANTHROPIC_API_KEY` na Convex (DEV, kasnije PROD). Bez ključa sve radi kroz ručni formular.
- `npm audit` prijavljuje poznata upozorenja u `next`, `convex` (`ws`) i drugim alatima koja postoje od ranije; preporuka developeru je nadogradnja Next.js i Convex paketa posle ove noći.
- korak 08 OK — 39 min, pokušaja 1

## Korak 09 — Partner Sync: raspored 06:00, ručno pokretanje, pravi uvoz u DEV

**Šta je urađeno**
- **Raspored:** `convex/crons.ts` pokreće proveru u 04:00 i 05:00 UTC; uvoz kreće samo kad je u Beogradu 06 h (letnje i zimsko vreme), jednom po ciklusu, i samo kad je `SYNC_CRON_ENABLED=true` (postavljeno na DEV). Dnevno čišćenje isteklih ponuda radi u 23:10 UTC.
- **Ručno pokretanje (backend za dugme „Pokreni sada“):** jedno po ciklusu, zaključano dok uvoz traje i do sledećeg automatskog uvoza u 06:00; admin dobija status, poslednji uvoz, vreme sledećeg automatskog uvoza i „dostupno do“ za odbrojavanje. Tu su i prekid uvoza, istorija uvoza, „Nove i izmenjene“ i pregled za kontrolnu tablu. Partneri: lista, detalj sa poslednjih 10 uvoza, podešavanja (urednik), status partnera (samo vlasnik).
- **Orkestracija:** poseban posao po partneru preko rasporeda, paketi sa nastavkom (≤ 7 min po pozivu), dnevnik uvoza, klasifikacija grešaka na srpskom, automatska objava, isticanje po datumu, dnevnik promena, „čuvar“ koji zatvara stavke bez odziva 15 min.
- **Relay CLI:** `npm run sync:relay -- --partner <slug>` (uz `--fixtures`, `--dry-run`, `--allow-blocked`) i zaštićene HTTP rute `/sync/relay/start|batch|finish` (tajna `SYNC_RELAY_SECRET` na DEV). Pogrešna ili nedostajuća tajna → 401; blokirani i ručni partner su odbijeni. Jedan prolaz od početka do kraja iz sačuvanih stranica je uspeo (0 zahteva ka partneru).
- **Test dostupnosti:** po jedan zahtev (robots.txt) ka svakom od 11 partnera — **svih 11 dostupno**, nijedna zaštita od botova: Astra 200, Hellena 404 (nema robots.txt = sve dozvoljeno), Big Blue 200, SunLine 200, Tomash 200 (Crawl-delay 10 s), Rapsody 200, Mayak 200, Nitravel 200, Ski & Sun 200, Dunav Turs 200, Viva 200.
- **Slike:** HTTP slike Dunav Turs se posle uvoza kopiraju u Convex storage (kopirana je 21 slika), u okviru dnevnog limita.
- **Pravi uvoz u DEV** (limit 60 zahteva po partneru za ovu noć) i provera kvaliteta na uzorku od 5 ponuda po partneru (naslov, mesto, sledeći polazak, cena i osnova, organizator, slika). Pronađene greške su ispravljene u kodu i pokrivene testovima; Big Blue i Rapsody su ponovo učitani sa ispravkama.

| Partner | Status uvoza | Uvezeno | Aktivno (budući polazak ili „na upit“) | Napomene |
|---|---|---|---|---|
| Astra Travel | delimično (limit 60) | 37 | 37 — svi hoteli „Cena na upit“ | Hoteli su prvi po planu; apartmani sa cenovnikom (leto 2026) čekaju veći limit |
| Hellena Travel | delimično (limit) | 47 | 47 — hoteli „na upit“ | Vile nisu stigle na red; leto 2026 je ionako prošlo |
| Big Blue | delimično | 40 | 39 (37 sa cenom „ukupno za 2 odrasle osobe“) | Jedna tura stalno vraća HTTP 500 (preskače se) |
| SunLine | delimično (limit) | 47 | 47 sa cenom po osobi | 49 zahteva pokriva oko 24 od 59 datuma polaska |
| Tomash Tours | delimično (limit) | 56 | 22 (11 sa cenom) | Više novogodišnjih programa bez pročitanih termina (drugačija tabela) — neaktivni dok se ne proveri jedna stranica |
| Rapsody | uspešno | 20 | 20 (19 sa cenom) | Partner sada nudi 20 putovanja; mesta i države dopunjeni ponovnim čitanjem |
| Mayak Tours | delimično (limit) | 37 | 15 | 22 letnje ponude (leto 2026) su neaktivne |
| Nitravel | delimično (limit) | 58 | 10 | Najnoviji programi su većinom letnje vile 2026 (neaktivne); organizator „Plan A Travel“ |
| Ski & Sun | delimično (limit) | 32 | 26 (15 sa terminima, 11 „na upit“) | — |
| Dunav Turs | uspešno | 29 | 1 | Vile su leto 2026 (neaktivne); 21 slika kopirana |
| Viva Travel | neuspešno | 44 | 44 (43 sa cenom) | Uvoz je stao na linku krstarenja posle 44 ponude; uzrok ispravljen, ponovni uvoz sutra |
| Holiday, Balkan Fun, Jungman, Travellino, Montesol | preskočeno | 0 | 0 | „Čeka dozvolu (whitelist/feed)“ — nijedan zahtev |
| Holiday Plus KM | preskočeno | 0 | 0 | Ručni unos (formular u koraku 13) |

**Ukupno:** 447 uvezenih ponuda, 308 aktivnih i javnih. Zahtevi u poslednja 24 h: Astra 60, Hellena 60, Big Blue 34, SunLine 60, Tomash 60, Rapsody 45, Mayak 60, Nitravel 60, Ski & Sun 60, Dunav Turs 60, Viva 53; blokirani partneri 0.

**Sledeći automatski uvoz:** petak, 2. oktobar 2026. u 06:00 (Beograd). Pošto je većina partnera noćas iskoristila 60 zahteva, taj uvoz će ih preskočiti uz poruku „Dnevni limit zahteva je iskorišćen.“ i raditi samo ostatak budžeta za Big Blue, Rapsody i Viva. Prvi pun automatski uvoz je posle povećanja limita (vidi dole).

**Šta nedostaje**
- Admin ekrani (status uvoza, dugme „Pokreni sada“ sa odbrojavanjem, partneri, ponude, ručni unos) — korak 13; backend je spreman.
- Javni katalog i stranica ponude — korak 10.
- Ispravke parsera za Nitravel, Viva, Tomash i Astra primenjuju se na već uvezene ponude tek pri sledećem čitanju.

**Kako proveriti**
- Status poslednjeg uvoza: `npx convex run sync/orchestrator:runStatus`
- Uzorak ponuda: `npx convex run sync/ingest:qualitySample '{"partnerSlug":"rapsody","n":5}'`
- Brojač zahteva: `npx convex run sync/ingest:requestLedger '{"hours":24}'`
- Test dostupnosti: `npx convex run sync/connectivity:ping`
- Relay bez mreže: `npm run sync:relay -- --partner dunavturs --fixtures --dry-run`
- Bezbednost: `node --env-file=.env.local scripts/security/check-access.mjs --only inventory` (80 javnih funkcija; anon/kupac/urednik provere prolaze).
- Gate: `npx convex dev --once`, `npm run lint`, `npx tsc --noEmit`, `npm test` (111), `npm run build` — sve prolazi.

**Za vlasnika (ujutru)**
1. Povećati dnevni limit zahteva: `npx convex env set SYNC_DAILY_REQUEST_CAP 800` (ili ukloniti promenljivu da važe limiti iz registra).
2. Zatim jednom pokrenuti uvoz koji ponovo čita sve stranice sa ispravkama: `npx convex run sync/orchestrator:startRun '{"trigger":"cli","forceRefetch":true}'` (ili sačekati automatski uvoz u 06:00 sledećeg dana).
3. Tomash: posle povećanja limita proveriti jedan novogodišnji program: `npx convex run sync/connectivity:probe '{"partnerSlug":"tomash","url":"https://tomashtours.rs/wp-json/wp/v2/posts/19839?_fields=id,title,modified,link,content,categories","kind":"post"}'` — rezultat pokazuje zašto termini nisu pročitani.
4. Pregledati kartice partnera (ime, logo, licenca, organizator) i po želji upisati proviziju i kontakte (biće u admin-u u koraku 13).
- korak 09 OK — 33 min, pokušaja 1

## Korak 10 — Katalog ponuda, stranica ponude, upit

**Šta je urađeno**
- **`/ponude` — katalog** (prvi prikaz sa servera, podaci iz Convex-a): ABLux programi i ponude partnera u jednoj listi, kao „karte“: naslovna slika, vrsta i zemlja, naslov, mesto, sledeći polazak i broj ostalih termina, trajanje, prevoz, kategorija i ishrana za smeštaj, „od X €“ sa osnovom ili „Cena na upit“, oznaka „ABLux program“ ili „Organizator: …“, dugme „Pošalji upit“.
  - Filteri u URL-u: vrsta putovanja, zemlja, mesec polaska, prevoz, trajanje, cena od–do, polazak iz, ABLux/partneri, organizator, pretraga po tekstu. Redosled: najbliži polazak, najniža cena, novo u ponudi. Uz svaku opciju stoji broj ponuda.
  - Aktivni filteri su čipovi sa „×“, uz „Poništi sve“. Broj rezultata, „Učitaj još“ (24 po strani).
  - Na telefonu su filteri u donjem panelu sa živim brojem („Prikaži 30 ponuda“).
  - Prazno stanje predlaže druge mesece i slične destinacije (sa brojem ponuda), „Poništi filtere“ i „Pošaljite upit“. Dok se stranica učitava, vide se skeleti kartica.
- **`/ponude/[slug]` — stranica ponude** (sa servera, `generateMetadata`, JSON-LD TouristTrip + Offer + BreadcrumbList):
  - razglednica sa naslovnom slikom, oznake, organizator i licenca (kad je poznata);
  - „boarding pass“ sa osnovnim podacima (polazak, trajanje, prevoz, ishrana, polazak iz, kategorija, mesto) i cenom sa osnovom;
  - tabela termina i cena (smeštaj, ishrana, prevoz, cena sa osnovom, raspoloživost, „Pošalji upit“ za tačan termin). Na telefonu su redovi kartice, bez horizontalnog skrolovanja. Prvih 12 termina, ostali na „Prikaži sve termine“;
  - doplate, opis, program po danima (harmonika), cena obuhvata / ne obuhvata, napomene, fotografije (razglednice);
  - organizator, licenca, napomena da ABLux posreduje kao subagent, link na originalni program i opšte uslove organizatora, dokumenti, „Ažurirano: datum“;
  - lepljivi panel „Rezervacija“ na računaru, donja traka na telefonu; slične ponude; na engleskom napomena „The program is in Serbian.“;
  - istekla ili povučena ponuda: napomena, bez dugmeta za upit, `noindex`. ABLux kartica preusmerava na svoj program; nepostojeća ponuda → 404.
- **Upit:** formular (ime i prezime, telefon, e-pošta, broj putnika, željeni polazak, poruka, saglasnost) u dijalogu na računaru, u donjem panelu na telefonu. Provera polja sa porukama na srpskom, honeypot, limiti (10 na sat po IP adresi, 5 po e-pošti, 100 ukupno), jasna potvrda „Upit je poslat“. Upiti se čuvaju u tabeli `inquiries` sa snimkom ponude (naslov, organizator, link, cena). E-pošta se još ne šalje.
- **Pretraga „Kuda putujete?“ i mega meni:** brojevi sada dolaze iz kataloga. Na DEV-u pretraga pokazuje 308 ponuda; u mega meniju je npr. Letovanje 172, Evropski gradovi 70.
- **ABLux programi u katalogu:** svako čuvanje ili brisanje putovanja i verske ponude u admin-u ažurira karticu u katalogu. Na DEV-u postojeće putovanje („Turska“) i verska ponuda (Tumane) imaju polazak u prošlosti, pa se ne prikazuju.
- **SEO:** sitemap sadrži i sve javne ponude (322 adrese na DEV-u) i osvežava se najviše jednom na sat. Kanonski URL-ovi; `noindex` za više od jednog filtera, pretragu po tekstu, raspon cene, sortiranje i strane „Učitaj još“.
- **Performanse:** slike partnera direktno sa njihovih HTTPS adresa (`<img loading="lazy">`, fiksna visina kartice, bez Vercel optimizacije); HTTP slike samo iz Convex storage-a; odmah se učitava samo naslovna slika ponude.

**Provera (sve prošlo)**
- Gate: `npx convex dev --once`, `npm run lint` (0 problema), `npx tsc --noEmit`, `npm test` (120, od toga 9 novih za filtere), `npm run build`.
- Bezbednost: `check-access` **155/155 PASS** (8 novih javnih funkcija kataloga; `inquiries.create` je serverska).
- U pregledaču (dev, 1440 px i 390 px, Papir i Tinta): čip filtera menja URL i rezultate; mobilni panel pokazuje živ broj; upit sa praznim poljima pokazuje greške; ispravan upit je upisan u DEV; honeypot vraća uspeh bez upisa; neispravan upit → 400. Snimci: `night-run/qa/10/`.

**Šta nedostaje / poznati problemi**
- Admin ekran za upite (lista, status, napomene) i obaveštenje e-poštom — korak 13. Do tada se upiti vide u Convex dashboard-u (tabela `inquiries`). Na DEV-u postoji jedan QA upit („QA Noćni Test“).
- Kod nekih partnera opis ponavlja program puta (partner ga objavljuje na oba mesta); prikazujemo oba kako ih partner objavljuje.
- `/putovanja/[zemlja]` i `/destinacije` još ne koriste katalog (korak 12; `catalog.countsByCountry` je spreman). Početna (korak 11) može da koristi `catalog.featured`.
- Engleska verzija se prikazuje tek posle učitavanja stranice (kao i ostatak sajta): server uvek šalje srpski.

**Kako proveriti (posle `npm run dev`)**
- `/ponude`, `/ponude?tip=letovanje`, `/ponude?kategorija=evropski-gradovi&mesec=2026-12`, `/ponude?zemlja=grcka&prevoz=autobus`, `/ponude?trajanje=4-7&cenaDo=500&sort=cena`, `/ponude?polazak=Niš`, `/ponude?tip=zimovanje&prevoz=brod` (prazno stanje sa predlozima).
- Stranice ponuda: `/ponude/malta-ostrvo-vitezova-istorije-valeta-mayak` (više termina, program, stara cena), `/ponude/park-beach-limasol-bigblue` (cena „ukupno za 2 osobe“); `/ponude/ablux-turska` preusmerava na `/aranzmani/turska`; `/ponude/ne-postoji` → 404.
- Upit: na stranici ponude „Rezerviši / Pošalji upit“ ili `?upit=1`; upisani upiti: `npx convex data inquiries`.
- Sitemap: `/sitemap.xml`. Ponovno punjenje ABLux kartica: `npx convex run catalog:backfillAbluxInternal`.
- korak 10 OK — 42 min, pokušaja 1

## Korak 11 — Početna: „Živa razglednica“ i sekcije iz baze

**Urađeno**
- **Hero „Živa razglednica“** (`components/home/home-hero.tsx`): tri scene iz `public/media/hero/manifest.json` — Hodočašća (podrazumevana), Mediteran, Evropski gradovi. Tri karte su kanali: klik menja scenu (pretapanje 0,7 s uz papirnu teksturu), automatska smena na 9 s, a perforacija aktivne karte se „cepa“ kao tajmer. Pauza kad je miš na kartama, kad su u fokusu, kad je kartica pregledača skrivena i kad hero nije na ekranu; dugme za pauzu za trajno zaustavljanje. Dron klip se pusti jednom i stoji na poslednjem kadru; video se preuzima samo za aktivnu scenu, sledeći 2 s pre smene.
- Učitavanje: poster odmah (AVIF), pečat „AB · od 2022.“ se utiskuje, redovi naslova se podižu, video se pretapa preko postera. Bez videa: poster sa sporim zumom.
- **Prelaz pri skrolu (računar):** scena se smanji u razglednicu sa nazubljenom ivicom i markicom, nagne 2° i spusti kao prva kartica sekcije „Uskoro polaze“; traka pretrage se uvlači u lepljivu „Kuda putujete?“. Samo transform/opacity (GSAP ScrollTrigger).
- **Telefon:** 9:16 kompozicija (tekst na mastilu gore, scena ispod — kupola i tekst se ne dodiruju), video samo za podrazumevanu scenu, karte se prevlače, pretraga odmah ispod; dugme za kontakt se sklanja dok je pretraga na ekranu.
- `prefers-reduced-motion`, Save-Data i 2g/3g: samo posteri, bez automatske smene i bez prelaza.
- **Pretraga u heroju** je prava (tip, mesec, putnici, polazak iz, živ broj „Pronađeno: 308 ponuda“, šalje na `/ponude?...`).
- **Sekcije iz baze:** „Uskoro polaze“ (najbliži polasci, ABLux + partneri), „Najtraženije rute“ (admin rute iz `homeRouteSlides` sa linkom, inače pet odobrenih; mesingane pločice, zakošeni uglovi, etikete, isprekidana ruta sa pribadačama), verski turizam (razglednica Ostrog + broj ponuda), „17 agencija, jedan potpis“ (svaki partner sa živim brojem ponuda i linkom na filtriran katalog), zašto ABLux, proces, Rent a bus (fotografije iz `vehicleRentalImages` sa sporim zumom; pozadina je `rentabus` scena iz manifesta), završni poziv.
- **Tinta (tamna tema)** za celu početnu; papirni predmeti (karte, razglednice, pečati, ćelije partnera) ostaju papir; prelaz u futer bez oštrog reza. Stock slike uklonjene sa početne.
- Admin → Početna: slajd dobija polja „Link“, „Opis“ i „Ton kartice“ — slajd sa linkom postaje ruta na početnoj.

**Hero fajlovi koji su bili prisutni:** manifest v2; `hodocasca`, `mediteran`, `evropa`, `ostrog` — `drone`, desktop MP4 + AVIF i mobilni MP4 + AVIF; `rentabus` — `still`, samo AVIF poster (prava fotografija). WebM nije isporučen (kod ga koristi ako se doda). `design/hero/READY` ne postoji.

**Provera**
- Gate: `npx convex dev --once`, `npm run lint` (0), `npx tsc --noEmit`, `npm test` (127, 7 novih: manifest i rute), `npm run build`. `check-access`: inventar i anonimni pristup PASS (3 nove javne funkcije: `catalog.upcoming`, `catalog.partnerStrip`, `homeRouteSlides.routeCards`).
- U pregledaču (Playwright, 1440 i 390 px, Papir i Tinta, reduced motion): smena scena posle 9 s, klik na kartu, pauza, pretraga vodi na `/ponude?tip=letovanje`; preuzima se samo aktivni i sledeći klip; uz reduced motion 0 video zahteva; telefon učitava samo `hodocasca-mobile.mp4`; bez grešaka u konzoli. Snimci: `night-run/qa/11/`.

**Poznati problemi / nedostaje**
- **DEV `vehicleRentalImages` sadrži snimke ekrana nekog sajta, ne fotografije vozila** — na DEV početnoj kartice Rent a bus zato izgledaju pogrešno. Treba otpremiti prave fotografije u Admin → Iznajmljivanje vozila (kod koristi bazu, pa `public/home-swiper/` samo kad slike nema).
- Na DEV-u stari slajdovi „Destinacija 01…05“ u `homeRouteSlides` nemaju link i ne prikazuju se; vlasnik može da doda rute sa linkom u Admin → Početna.
- Engleski tekst se primenjuje posle učitavanja (server šalje srpski), kao na ostatku sajta.
- Logotipi nekih partnera su svetli i slabije se vide na papiru (njihov brending, nismo menjali).

**Kako proveriti**
- `/` na računaru: sačekati 9 s (smena), kliknuti kartu, prelaz mišem preko karata (tajmer staje), dugme pauze; skrolovati polako — scena postaje razglednica u „Uskoro polaze“.
- `/` na telefonu (390 px) i u tamnoj temi; u sistemu uključiti „smanji pokrete“ — samo posteri.
- Novi hero fajl: dodati ga u `public/media/hero/` i upisati u `manifest.json` (bez izmene koda).
- korak 11 OK — 44 min, pokušaja 1

## Korak 12 — Ostale javne stranice u novom stilu

**Urađeno**
- **`/verski-turizam`:** hero sa scenom „Ostrog“ iz manifesta; prvo ABLux hodočašća (korpa i PDF kao ranije), pa verske ponude partnera; kalendar polazaka za narednih 12 meseci; prava fotografija manastira kao razglednica sa napomenom da je bez obrade.
- **`/aranzmani`** (lista ABLux programa) i **`/aranzmani/[slug]`** (server stranica sa metapodacima, JSON-LD `TouristTrip`, 404 za nepostojeći program) u šablonu stranice partnerske ponude. Korpa i IPS QR rade: destinacije, smeštaj i ceo aranžman (kad je aktivan); upit se šalje iz dijaloga.
- **`/putovanja`, `/putovanja/[zemlja]`, `/destinacije`:** stranice iz ponuda (zemlja → ponude) sa kratkim uvodom izračunatim iz podataka; admin „putovanja“ i destinacije stranice (sa korpom i uređivačem za osoblje) i dalje rade. `/zemlje` preusmerava na `/destinacije`.
- **`/iznajmljivanje-vozila`:** hero `rentabus` iz manifesta, autobus i kombi sa fotografijama iz baze (galerija, spori zum, topla nijansa), upit sa izborom vozila.
- **`/o-nama`:** priča, vrednosti, licenca iz podešavanja (samo kad je upisana), 17 partnera sa živim brojem ponuda, tim sa jasno označenim mestima za prave fotografije. Izmišljeni brojevi sa stare stranice („48h“, „100%“) su uklonjeni.
- **`/kontakt`:** podaci samo iz podešavanja (na DEV-u prazno → „Kontakt podaci uskoro“), mapa samo kad postoji adresa, radno vreme, upit sa temom.
- **`/auth`, `/signin`, `/signup`:** papirni dizajn, logika prijave nepromenjena.
- Stock slike uklonjene sa svih stranica i obrisane; OG slika je sada isečak odobrenog postera.

**Ispravka posle neuspelog gate-a (`night-run/logs/12-gate.txt`)**
- Uzrok: pomoćni agenti za stranice su prekinuti pre kraja. `app/aranzmani/[slug]/page.tsx` je uvozio `components/pages/programs/program-detail-view`, a taj fajl nije napisan, pa `npm run build` nije prolazio („Module not found“). `npx convex dev --once` je prolazio.
- Popravka: napisan `program-detail-view.tsx` (sve funkcije stare stranice aranžmana u novom šablonu) i `app/styles/pages/programs.css` (lista i detalj programa nisu imali stilove). Pregledane su sve stranice ostalih agenata u build-u: sve rade (200, nepostojeći slug → 404).
- Usput: obrisane nekorišćene komponente i ~830 linija mrtvog CSS-a; vraćen keyframe koji admin koristi iz inline stila.

**Provera**
- Gate: `npx convex dev --once` OK, `npm run lint` (0), `npx tsc --noEmit` OK, `npm test` (127), `npm run build` OK (sve javne rute dinamičke). `check-access`: inventar i anonimni pristup 68/68 PASS. `e2e-auth` (pregledač, na build-u): 11/11 PASS — prijava/odjava, zaštita admin-a, korpa i IPS QR sa cenom sa servera.
- Snimci svih stranica (1440 px, Papir): `night-run/qa/12/full_*.png`.

**Poznati problemi**
- Na DEV-u su fotografije vozila snimci ekrana sajta (podatak u bazi, vidi korak 11) — treba otpremiti prave fotografije.
- Opis aranžmana „Turska“ na DEV-u je test tekst („turska turska …“).
- Build ispisuje „query failed … Dynamic server usage“ za nekoliko stranica: to je bezopasna poruka Next-ove probe za statički prikaz (stranice su dinamičke zbog prijave u layout-u), nije greška u radu.
- Prikaz na telefonu i u tamnoj temi nije ponovo snimljen posle prekida agenata za sve stranice; brza provera je preporučena (`/o-nama`, `/kontakt`, `/iznajmljivanje-vozila` na 390 px).

**Kako proveriti**
- `/verski-turizam`, `/aranzmani`, `/aranzmani/turska`, `/putovanja`, `/putovanja/grcka`, `/destinacije`, `/iznajmljivanje-vozila`, `/kontakt`, `/o-nama`, `/auth`; upiti sa tih stranica: `npx convex data inquiries` (polje `subject`).
- korak 12 OK — 40 min, pokušaja 1

## Korak 13 — Admin panel: novi okvir i ekrani za Partner Sync

**Šta je urađeno**
- **Novi okvir administracije** (svi ekrani, Papir i Tinta, telefon i računar):
  - bočni meni po grupama (Ponude, Sadržaj sajta, Podešavanja) sa zlatnom linijom aktivne stavke i brojem novih upita; može da se skupi na ikonice, a na telefonu je fioka;
  - gornja traka sa nazivom ekrana, pretragom i korisničkim menijem (ime, uloga, Papir/Tinta, srpski/engleski, promena lozinke, „Otvori sajt“, „Odjavi se“); „Odjavi se“ je i u dnu menija;
  - **Ctrl + K** (na Mac-u ⌘ K, na telefonu lupa): skok na bilo koji ekran, pronalaženje ponude po nazivu, partnera, i komande („Pokreni uvoz sada“, „Unesi ponudu ručno“, tema, jezik, odjava). Strelice, Enter, Esc.
  - stari tamni „Komandni centar“ više ne postoji; stari editori sadržaja su u novom okviru bez zelenih, plavih i staklenih detalja.
- **Pregled** (`/admin`): novi upiti i koliko je stiglo danas, ponude na sajtu, izmene od juče (nove, cene, skinute), sledeći automatski uvoz sa odbrojavanjem; upiti koji čekaju, nove i izmenjene ponude za 24 h, stanje uvoza po partneru (svetla sa tekstom), brze radnje.
- **Upiti i rezervacije** (`/admin/upiti`): upiti sa sajta i porudžbine sa IPS uplatom u jednom spisku. Status novo / u obradi / potvrđeno / otkazano, zaduženje kolege, beleške agencije, pretraga (ime, telefon, e-adresa, ponuda), filter po vrsti. Fioka sa detaljima: dugmad za poziv i e-poštu, ponuda na sajtu i program kod organizatora, poruka klijenta; za porudžbine stavke, iznos, poziv na broj, kurs NBS i **status uplate** (čeka se / plaćeno / nije uspela) koji urednik potvrđuje sa izvoda.
- **Sve ponude** (`/admin/ponude`): ABLux programi i ponude partnera u jednoj tabeli; pretraga i filteri (izvor, partner, stanje, kategorija, cena, mesec polaska; na telefonu iza dugmeta „Filteri“). Izbor redova → **Objavi, Sakrij, Vrati na sajt, Istakni, Ukloni isticanje** sa „Poništi“. Fioka ponude: stanje na sajtu (tri prekidača), „Otvori na sajtu“, „Original kod partnera“, **ABLux izmene** (naslov, uvod, do tri kategorije, naslovna slika: otpremanje ili https adresa) koje ostaju posle svakog uvoza, i poslednje promene iz uvoza. ABLux programe vodi na njihov urednik.
- **Nove i izmenjene** (`/admin/izmene`): sve promene iz uvoza po danima (danas / 7 / 30 dana / sve), filteri po partneru i vrsti; cena staro → novo sa strelicom, promenjeni termini, skinute i istekle ponude. Klik vodi na ponudu.
- **Partneri i uvoz** (`/admin/partneri`): 17 kartica (logo, svetlo stanja, aktivne / na sajtu / ukupno, poslednji uvoz sa trajanjem i brojem zahteva, razlog blokade običnim rečima, prekidač „Na sajtu“ sa „Poništi“). **„Pokreni sada“** traži potvrdu; posle ručnog uvoza je isključeno uz „Ručni uvoz je iskorišćen. Sledeće automatsko pokretanje u 06:00 · za X h Y min“; dok uvoz traje vidi se napredak po partneru i „Prekini uvoz“. Fioka partnera: automatska objava, organizator i licenca, opšti uslovi, provizija, kontakt, beleške, mapiranje kategorija, status (samo vlasnik) i poslednjih 10 uvoza sa dnevnikom rečenicama. Kartica „Istorija uvoza“ sa detaljima svakog uvoza.
- **Ručni unos ponuda** (`/admin/partneri/rucni-unos`, Holiday Plus KM i bilo koji partner): otpremanje cenovnika (PDF, Excel, CSV, fotografija), spisak otpremljenih fajlova, formular za ponudu (naziv, mesto, država, vrsta, usluga, noćenja, prevoz, kategorije, termini sa cenom i osnovom ili cena iz cenovnika, obuhvata/ne obuhvata, opis, program, napomene, organizator i licenca, fotografije), izmena i skidanje objavljenih ručnih ponuda. Sa `ANTHROPIC_API_KEY` stižu nacrti za proveru (Proveri / Objavi / Odbaci); bez ključa (sada na DEV-u) radi formular.
- **Sadržaj**: Početna (najtraženije rute + pregled kanala heroja iz `manifest.json`), Aranžmani, Putovanja po zemljama, Verski turizam, Iznajmljivanje vozila — postojeći editori rade kao i pre, u novom izgledu.
- **Podešavanja**: kontakt i podaci agencije (telefon, e-adresa, adresa, radno vreme, broj licence, Instagram, **Facebook, TikTok, YouTube** — nove mreže se pojavljuju u futeru kad se upišu), korisnici i lozinka (promena lozinke; uloge samo vlasnik), **Dnevnik izmena** (samo vlasnik).
- **Svuda:** „Poništi“ u obaveštenju gde je moguće, potvrda pre ručnog uvoza, prekida uvoza, promene statusa partnera, skidanja ponude i odbacivanja nacrta; skeleti dok se učitava; prazna stanja koja kažu šta da se uradi.
- **Backend (DEV, kompatibilno unazad, rezervna kopija `night-run/backups/13-20261001-1235.zip`):** `inbox.list`, `inbox.newCount`, `inquiries.adminList/get/update`, `orders.get/update` (+ status „u obradi“, zaduženje, beleške), `users.staffList`, `manualImport.getManualOffer`, slike za pregled u `offerAdmin`, društvene mreže u `settings`. Sve nove funkcije su urednik-only i upisane u `function-access.json`.
- **Ispravljene greške:** `/admin/verski-turizam` se rušio zbog valute „ДИН“ na staroj verskoj ponudi; obaveštenja („Poništi“) su bila nedostupna dok je fioka otvorena.

**Provera (sve prošlo)**
- Gate: `npx convex dev --once`, `npm run lint` (0 problema), `npx tsc --noEmit`, `npm test` (127), `npm run build`.
- Bezbednost: `check-access` **173/173 PASS** (8 novih funkcija: anonimni → UNAUTHENTICATED, kupac → FORBIDDEN). `e2e-auth` **11/11 PASS** (prijava, odjava iz menija, kupac nema pristup, vlasnik vidi uloge, IPS checkout).
- Pregledač (produkcioni build, urednik): 15 ekrana × računar Papir, telefon Papir, 6 × računar Tinta — svaki ima tačno jedan h1, bez horizontalnog skrolovanja, 0 grešaka u konzoli. Fioke ponude, upita, partnera i uvoza, Ctrl+K („malta“ → ponuda), grupni izbor, potvrda „Pokreni sada“, formular ručnog unosa, korisnički meni i fioka menija na telefonu — 13/13. „Poništi“ za status upita i za „Sakrij“ ponude — 2/2 (podaci vraćeni). Snimci i JSON: `night-run/qa/13/` (nije u gitu).
- QA porudžbine („QA test“) iz bezbednosnih testova su kroz novi inbox označene kao otkazane.

**Šta nedostaje / poznato**
- E-pošta za nove upite i porudžbine se još ne šalje (nema dobavljača e-pošte); broj novih upita se vidi u meniju i na Pregledu.
- Inbox prikazuje najnovijih 300 upita i 300 porudžbina (dovoljno za agenciju; starije ostaju u bazi).
- Kanali heroja se ne menjaju iz admina (fajlovi + `manifest.json`, posao developera); admin pokazuje šta je trenutno na sajtu.
- Postojeća Instagram adresa bez `https://` mora se ispraviti pri sledećem čuvanju kontakt podataka (na DEV-u kontakt podaci još nisu uneti, pa sajt piše „Kontakt podaci uskoro“).
- Stari editori sadržaja (aranžmani, verski, vozila, početna) zadržali su svoj raspored; dobili su novu paletu i okvir, ne i potpuno novi dizajn.

**Kako proveriti (`npm run dev`, prijava na `/auth`)**
- `/admin` — Pregled; Ctrl + K pa „malta“ ili „pokreni“.
- `/admin/upiti` — otvorite „QA Noćni Test“, promenite status pa „Poništi“; dodajte belešku.
- `/admin/ponude?partner=mayak` — izaberite dve ponude → Sakrij → Poništi; otvorite ponudu i upišite svoj naslov.
- `/admin/izmene`, `/admin/partneri`, `/admin/partneri?prikaz=istorija`, `/admin/partneri?partner=sunline`.
- `/admin/partneri/rucni-unos?novo=1` — formular za Holiday Plus KM.
- `/admin/podesavanja` (kontakt i mreže), `/admin/podesavanja/korisnici`, `/admin/podesavanja/dnevnik` (vlasnik).
- Skripte: `PLAYWRIGHT_BROWSERS_PATH=.tools/ms-playwright E2E_BASE_URL=http://localhost:3137 node --env-file=.env.local scripts/qa/admin-screens.mjs` (i `admin-interactions.mjs`, `admin-undo.mjs`).
- korak 13 OK — 71 min, pokušaja 1
- korak 14 OK — 38 min, pokušaja 1

## Korak 14 — QA

Sesija koraka 14 je prekinuta pre nego što je napisala ovu sekciju; ponovni QA koji je pokrenula nestao je zajedno sa sesijom. Ovu sekciju je napisao korak 16, na osnovu odluka koraka 14 (`night-run/DECISIONS.md`, „14“), prvog QA prolaza (`night-run/qa/14/summary-run1.md`) i punog ponovljenog QA prolaza iz koraka 15 (`night-run/qa/15/run/`), urađenog posle svih ispravki.

**Šta je provereno** (`scripts/qa/run-qa.mjs` na produkcionom build-u, port 3137)
- 17 javnih ruta na 1440 i 390 px, u Papiru i Tinti (68 prikaza);
- 18 admin ekrana kao QA urednik;
- greške u konzoli i neuspeli zahtevi, horizontalni skrol, slike bez alt teksta, broj h1;
- axe (serious i critical), vidljiv fokus, interni linkovi, odsečene kvačice na č/ž/š, smanjeni pokreti.

**Prvi prolaz (11:47)**
- 20 prikaza sa problemom;
- axe: 55 nalaza (kontrast 35, polja bez imena 16, slike bez alt teksta 4, linkovi bez imena 4);
- 22 elementa bez vidljivog fokusa;
- odsečen naslov „Osnovni podaci“ na stranicama ponude;
- `ERR_TOO_MANY_REDIRECTS` iz Big Blue okvira na `/aranzmani/turska`.

**Šta je ispravljeno u koraku 14**
- **Kontrast:** potamnjeni tokeni `muted`, `muted-strong`, `gold-ink` i `teal-deep`.
- **Bočne trake** („side-tab“) zamenjene su punom ivicom.
- **Breadcrumb** je sada visok 44 px.
- **Program po danima:** očišćeni ponovljeni brojevi dana kod Viva Travel.
- **Prošli polazak:** ABLux program sa prošlim polaskom je „Završen“ i ne može se kupiti; server ga odbija.
- **Big Blue okvir:** `<iframe>` partnerskih destinacija na `/aranzmani/[slug]` zamenjen je napomenom i linkom; to je ujedno uklonilo axe nalaze iz tuđeg okvira.
- **Sitemap:** dodat `/iznajmljivanje-vozila`.
- **QA skripta:** sada prepoznaje fokus nacrtan na roditelju ili unutrašnjem sloju.

**Rezultat posle koraka 14 i 15** (`night-run/qa/15/run/summary.md`)
- stranice sa problemom: **0 od 68**; admin: **0 od 18**;
- axe serious/critical: **0**; pokvareni linkovi: **0 od 184**;
- odsečene kvačice: 0; smanjeni pokreti: 0 video zahteva.

**Šta ostaje**
- **Fokus:** 4 nalaza na fotografijama vozila su lažna. Prsten je zlatna unutrašnja senka na `.veh-photo__grade`, koju skripta ne vidi.
- **Snimci:** QA snima stanje DEV baze. Fotografije vozila na DEV-u su snimci ekrana tuđeg sajta i treba ih zameniti pravim.

## Korak 15 — Nezavisni pregled

Pregled je radila sveža sesija koja nije gradila sajt. Pročitani su plan, PRODUCT.md, DESIGN.md, ceo izveštaj i snimci iz `night-run/qa/`. Urađene su dve runde ispravki. Korak 14 nije upisao svoju sekciju u ovaj izveštaj (postoji samo red „korak 14 OK“); njegove odluke su u `night-run/DECISIONS.md` pod „14“.

### 1. Bezbednost

**Provereno**
- **Javne funkcije.** Sve 102 javne Convex funkcije su klasifikovane u `scripts/security/function-access.json`; nijedna nije zastarela ni neklasifikovana.
  - 30 funkcija je „public“. Svaka vraća samo objavljene podatke: katalog proverava `hidden`, `published` i da li je partner uključen; `listSources` vraća samo javna polja; `users.me` vraća samo sopstveni nalog.
  - Sve ostale funkcije počinju proverom uloge (`requireRole`) ili serverske tajne.
- **HTTP rute.**
  - `/sync/relay/*` traži Bearer tajnu od najmanje 32 znaka, poređenje je u konstantnom vremenu.
  - Stripe webhook je u režimu čekanja i ne radi ništa.
  - `/api/inquiries` i `/api/ips/checkout` šalju Convex-u samo id-jeve i polja; cene računa server.
- **Harness `check-access`** (grupe inventory, anon, customer, editor, removed, signin): **160/160 PASS**.
- **Sopstvena proba bez prijave** (`night-run/qa/15/probe-anon.mjs`, ConvexHttpClient na DEV): svi pozivi su odbijeni.
  - Bez prijave → `UNAUTHENTICATED`: `orders.list`, `inbox.list`, `inquiries.adminList`, `users.list`, `audit.list`, `settings.upsert`, `trips.remove`, `files.generateUploadUrl`, `offerAdmin.bulkUpdate`, `syncAdmin.requestManualRun`, `partners.setStatus`.
  - Sa pogrešnom tajnom → `FORBIDDEN`: `orders.createIpsOrder`, `inquiries.create`.
  - Isti pozivi sa lažnim tokenom se odbijaju već na proveri tokena.
- **Git.**
  - Nijedan `.env` fajl nikad nije bio u gitu.
  - U istoriji nema privatnih ključeva, `sk-ant`, `sk_live`, `whsec_`, AWS, GitHub ni Convex deploy ključeva.
  - Jedini „AIza…“ ključevi su javni Google Maps ključevi samih partnera, unutar sačuvanih HTML fixture-a.

**Nalazi i ispravke**

| Ozbiljnost | Nalaz | Ispravka |
|---|---|---|
| Visoka | **Stara hardkodovana admin lozinka** je u istoriji gita: commiti pre koraka 03 (`81900be`, `f2a6d6e`, `90f9e2c`). Bila je i doslovno u `scripts/security/check-access.mjs` u trenutnom kodu. | Test je čita iz istorije gita u trenutku izvršavanja i nikad je ne ispisuje. Istorija se ne prepisuje (pravilo). Server tu lozinku ne prihvata (signin test PASS). **Vlasnik:** ako je ista lozinka korišćena bilo gde drugde (e-pošta, hosting, banka), promeniti je. Repozitorijum ima `origin` na GitHub-u, pa je istorija možda već javna. |
| Srednja | **JSON-LD na `/ponude` i `/ponude/[slug]`** pisao je `"<"`, što je u JS-u sam znak `<`. Zato `</script>` u naslovu ili opisu partnera nije bio escapovan; to je moguć XSS iz tuđih podataka. | Jedan helper `jsonLdText` (`lib/seo.ts`, sa testom) sada koriste sve stranice i root layout. |
| Niska | `/auth?next=/\evil.com` je prolazio proveru, pa je posle prijave moglo da usledi preusmerenje na tuđi sajt. | `toSafePath` odbija `\`. |
| Niska | Relay (`/sync/relay/batch`) ne čisti HTML ponovo na serveru: veruje vlasniku relay tajne. | Nije menjano; tajna je ekvivalent administratorskog pristupa. Preporuka za developera: ponovo čistiti HTML pri renderovanju. |

### 2. Pokrivenost plana (`docs/PLAN.md`)

| Stavka | Stanje | Napomena |
|---|---|---|
| Cilj 1: ceo sajt i admin u svetu „putni dnevnik“ | **urađeno** | Ostaci starog stila uklonjeni u ovom koraku: korpa, stari editori, „Page editor dock“. |
| Cilj 2: živi hero (GPT Image + Veo) | **urađeno** | 4 scene sa videom i rentabus kao prava fotografija; Veo proba na autobusu je odbijena po pravilu. |
| Cilj 3: Partner Sync | **urađeno**, uz ograničenje | 11 partnera uvezeno, 306 javnih ponuda. Uvoz je delimičan zbog noćnog limita od 60 zahteva. |
| Cilj 4: prava prijava i autorizacija | **urađeno** | Vidi tačku 1. |
| Produkcija se ne dira | **urađeno** | Grana `ablux-2.0` nije push-ovana (nema `origin/ablux-2.0`); nema deploy-a. |
| Automatska objava, „Nove i izmenjene“, prekidač po partneru | **urađeno** | `/admin/izmene`, prekidač „Na sajtu“ na `/admin/partneri`. |
| Uvoz u 06:00 i „Pokreni sada“ sa zaključavanjem i odbrojavanjem | **urađeno** | Unit testovi `scraper/core/cycle.test.ts` (letnje i zimsko vreme, jedno ručno pokretanje po ciklusu, otključavanje u 06:00, zaključano dok uvoz traje) prolaze. |
| Hero materijal (kombinacija, Veo proba na pravoj fotografiji) | **urađeno** | `docs/design/hero-prompts.md`. |
| CRITICAL: funkcije bez provere pozivaoca | **urađeno** | |
| CRITICAL: hardkodovana lozinka, `ensureAdminUser` | **urađeno** | Ostaje samo istorija gita; vidi tačku 1. |
| Cene iz browsera | **urađeno** | |
| Lažni kontakt podaci | **urađeno** | Nema ih nigde; prikazuje se „Kontakt podaci uskoro“. |
| Demo ponude | **urađeno** | |
| Samo početna u novom stilu | **urađeno** | |
| Server rendering, metadata, JSON-LD, sitemap | **urađeno** | Engleski se i dalje primenjuje tek posle učitavanja. |
| Bag sa temom | **urađeno** | |
| Dekorativna pretraga | **urađeno** | |
| Početna hardkodovana / admin „Početna“ | **delimično** | Rute iz admina rade; kanali heroja su u `manifest.json` (posao developera). |
| Kvačice (Cormorant) | **urađeno** | EB Garamond. |
| Mobilni hero (kupola, karte, chat dugme) | **urađeno** | Provereno na snimcima. |
| Čišćenje: dve biblioteke ikona | **urađeno u ovom koraku** | react-icons je uklonjen. |
| Čišćenje: globals.css, kompovi van `public/` | **urađeno** | |
| Stranice iz plana | **urađeno** | Nedostaju „Opšti uslovi“ i „Politika privatnosti“ (čeka se tekst od vlasnika). |
| Admin ekrani | **urađeno**, osim jednog | **Nema editora za „O nama“**: tekst je u kodu, a kontakt i licenca su u Podešavanjima. Staff napomena na stranici to sada kaže tačno. |

### 3. Partner Sync — provera na DEV podacima

- **Brojevi po partneru (javno / ukupno):**
  - Astra 37/37, Hellena 47/47, Big Blue 39/40, SunLine 47/47, Viva 44/44, Rapsody 20/20;
  - Ski & Sun 26/32, Tomash 20/56 (posle sakrivanja 2), Mayak 15/37, Nitravel 10/58, Dunav Turs 1/29;
  - blokirani i ručni partneri: 0.
- **Cene i osnove:**
  - Big Blue: sve „ukupno za 2 odrasle osobe“ (550–5.380 €).
  - SunLine, Viva, Rapsody, Mayak, Nitravel, Tomash: „po osobi“.
  - Ski & Sun: „po danu“ ili „za boravak“.
  - Astra i Hellena: hoteli „Cena na upit“ (cene su samo u kalkulatoru partnera, koji ne pozivamo).
  - Sve cene su u EUR.
- **Organizator** postoji na svakoj javnoj ponudi (308 u trenutku provere).
- **Isteklo se ne prikazuje:** nijedna javna ponuda nema samo prošle polaske (osim režima „na upit“). Zastavice `isPublic`, `hidden`, `published` i `listed` su usklađene.
- **Blokirani partneri nikad nisu kontaktirani:**
  - u brojaču zahteva za 48 h nema nijednog od 5 blokiranih partnera;
  - stavke uvoza za njih su „skipped“ sa 0 zahteva;
  - i worker i orchestrator proveravaju `liveFetchAllowed`.
  - Ukupno po partneru ≤ 60 zahteva (Dunav Turs 39 + 21 kopirana slika).

**Nalazi i ispravke**

| Ozbiljnost | Nalaz | Ispravka |
|---|---|---|
| Visoka | **Pogrešna cena na sajtu.** Ski & Sun, vile Breza i Banjica (Sokobanja): „od 4.000 €“ i „od 3.500 €“ po danu. To su dinari prikazani sa €. | Cena po danu ili noćenju iznad praga više se ne prikazuje; ponuda postaje „Cena na upit“ (`isPlausibleEurPrice`, test). Dve postojeće kartice ispravljene su jednokratnom migracijom `npx convex run sync/ingest:dropImplausiblePrices`. |
| Srednja | **Tomash, stari parser.** Mesto je jednako naslovu, zemlja i vrsta su pogrešni. Primeri: „Prag 2 noćenja“ i „Krajova Advent“ prikazani kao „Letovanje · Grčka“. | Parser je ispravljen još u koraku 09, ali se primenjuje tek pri sledećem čitanju; noćni budžet je potrošen. Te 2 ponude su **sakrivene** (`offerAdmin:setHiddenInternal`). Posle novog uvoza vratiti ih u admin → Ponude → „Vrati na sajt“. |
| Niska | Slug ponavlja mesto kad je ono već u naslovu (`vila-strmec-ohrid-vila-strmec-ohrid-tomash`, 58 kartica). | Novi slugovi ga više ne ponavljaju (`offerSlugBase`, test). Postojeći slugovi se ne menjaju (stabilni URL-ovi). |
| Niska | Ski & Sun „Hotel Hotel Complex Zara“ (dupla reč iz naziva kod partnera). | Nije menjano; može se ispraviti ABLux naslovom u adminu. |

### 4. Dizajn

Pregled je urađen sa snimcima iz koraka 14 i novim snimcima u `night-run/qa/15/`, uz kriterijume iz `critique.md` i `audit.md`.

**Čisto**
- U `app/`, `components/` i `lib/` nema navy ni cijan boja, Sore, `--alien`/`--signal` promenljivih ni stock slika.
- Meni, futer, 404, prijava, katalog i ponuda izgledaju ispravno u obe teme, a papirni predmeti u Tinti ostaju papir.
- Mobilni hero: kupola se ne dodiruje sa dugmadima, karte se vide, chat dugme ne pokriva traku pretrage.
- Materijali su prisutni na javnim stranicama:
  - zasečene karte: početna, ponude, ponuda, aranžmani, verski turizam, zemlja;
  - razglednice;
  - pečati: početna, o nama, kontakt, vozila, prijava, 404;
  - mesingane pločice: početna, o nama, vozila;
  - rute: početna, o nama.

| Ozbiljnost | Nalaz | Ispravka |
|---|---|---|
| Visoka | **Korpa je bila u starom stilu.** Greška i IPS potvrda su bili svetli tekst na papiru (nečitljivo), polja su imala samo placeholder, dugmad 28–36 px, naslov „Checkout“. | Tokeni brick/teal, polja sa labelama iznad, sva dugmad ≥ 44 px, „Podaci za uplatu“. Provereno u Papiru, Tinti i na telefonu. |
| Visoka | **Zlatna dugmad za kupovinu** (`.btn-primary`, „Dodaj u korpu“) imala su beli tekst na zlatu (2,15:1); stanje „dodato“ je bilo Tailwind zeleno. | Mastilo na zlatu kao `ui-btn--primary`, a stanje „dodato“ je teal. |
| Visoka (podaci) | **Na DEV-u su fotografije vozila snimci ekrana tuđeg sajta.** Vide se na početnoj i na `/iznajmljivanje-vozila`. | Nije menjano (sadržaj vlasnika). **Vlasnik:** otpremiti prave fotografije u Admin → Iznajmljivanje vozila. |
| Srednja | `/putovanja/[zemlja]`: partnerska destinacija je bila prazan beli `<iframe>`. | Umesto okvira je napomena „Program ove destinacije objavljuje organizator…“ i postojeće dugme ka organizatoru. |
| Srednja | Naslovi sekcija na 6 stranica počinjali su 56 px levo od teksta heroja. | Zajednička kolona `.pg` (72 px na 1440, 20 px na telefonu). Izmereno: h1 i h2 na istoj ivici na kontakt, o nama, vozilima, destinacijama, aranžmanima, verskom turizmu i putovanjima. |
| Srednja | Admin → Početna: ivice slajdova u neon bojama (cijan, roze, plava). Admin editori su pisali datume ćirilicom („14. апр 2026.“). | Ivica je sada linija iz tokena, a podrazumevane boje su iz palete. `Intl` koristi `sr-Latn-RS` svuda. |
| Srednja | Stari admin editori: tekst greške `red-400` (oko 2,5:1 na papiru). | Brick token u 12 fajlova; u TSX-u nema više Tailwind crvene, zelene ni plave. |
| Niska | Na telefonu je traka pretrage sekla vrednosti („Bilo koja v…“). | „Sve vrste“, „Svi meseci“, „Svi gradovi“. |
| Niska | Završen program je i dalje pisao „Mesto rezervišete dodavanjem u korpu…“ iako korpe nema; „Check-in/Check-out“ je bio na srpskoj stranici. | Napomena zavisi od toga da li je program dostupan; „Prijava/Odjava“. |
| Niska, nije menjano | Karta 03 heroja se prelama u dva reda; na prijavi se pozadina mape završava pre futera; overline „BIGBLUE“ na DEV aranžmanu (podatak iz admina); stari editori imaju i do četiri zlatna dugmeta. | Za sledeći krug dizajna. |

### 5. Tekst

**Čisto**
- Nema emodžija.
- Nema izmišljenih podataka: nema 123 45 67, Bulevar Putnika, recenzija, ocena, „100%“ ni „24/7“; „17 agencija“ je činjenica.
- Nema ijekavice; „Vi“ je dosledno veliko.
- „Cena na upit“ i napomena o NBS kursu su prisutni.

| Ozbiljnost | Nalaz | Ispravka |
|---|---|---|
| Visoka | **Hype u SEO opisu** (meta, OG i manifest): „premium turistička agencija … sigurnim iskustvom“, ključna reč „premium putovanja“, OG alt „premium travel preview“ na engleskom. | Činjenični opis: agencija iz Beograda od 2022, hodočašća, ture po Evropi, 17 partnera, sopstvena vozila. Srpski OG alt. |
| Srednja | Vozila: „VIP putovanja“, „viši nivo usluge“, „Premium izbor“, „Idealno za“, „Najbolje za“. | Činjenični tekst, „Pogodno za“. |
| Srednja | Dijakritike u porukama koje vidi kupac: „Nije moguce procitati…“, „nije prosla“, „IPS placanje“, alt „placanje“. Takođe „noci“ u podnaslovu grupe putovanja. | Ispravljeno, uz pravu množinu („1 dan“, „21 noć“). |
| Srednja | Množina sa brojevima: „putovanja 9 agencija“ (nedostaje „od“), „2 destinacija“, „do 2 osoba“, „21 aktuelnih programa“; u adminu „1 novih“, „2 aktivnih ponuda“, „1 zahteva“. | `serbianPlural` na svim tim mestima. |
| Srednja | Staff panel na javnim stranicama: „Page editor dock“, „control centar“, nepostojeće funkcije i „marketing tim“. | Kratka, tačna napomena „Vidljivo samo osoblju“ i link na ekran u adminu. |
| Niska | „Ve? imate nalog?“, „Ulogovani korisnik“, „Email“ pored „E-pošta“, „upload“ u porukama, „Još nije uvožen“, „Trebate autobus“, alt „Autobus sa vozačem Setra“. | „Već imate nalog?“, „Prijavljeni ste kao“, „E-pošta“ svuda na srpskom, „otpremanje“, „uvezeno“, „Potreban Vam je autobus“, „Setra: Autobus sa vozačem“. |
| Niska, nije menjano | Nekorišćene sekcije u `lib/i18n.ts` (home/about/offers…) i dalje sadrže stari hype tekst i „15+ partnera“, ali se nigde ne prikazuju. Svrha IPS plaćanja je „Porudzbina ABLux“ (bez „ž“, zbog NBS generatora). Engleski hero „Trips with a signature of certainty“ je odobreni tekst. Oblici „Pošalji upit“ i „Pošaljite upit“ su pomešani. | Obrisati nekorišćene sekcije u sledećem čišćenju; engleski hero i oblike dugmadi odlučuje vlasnik. |

### Provera (gate)

- `npx convex dev --once` je prošao. Na DEV su dodate dve interne funkcije: `sync/ingest:dropImplausiblePrices` i `offerAdmin:setHiddenInternal`. Šema nije menjana, pa rezervna kopija nije pravljena.
- `npm run lint`: 0 problema.
- `npx tsc --noEmit`: prošao.
- `npm test`: 135 testova prolazi; 3 su nova (JSON-LD escape, cena koja nije u evrima, slug bez ponavljanja).
- `npm run build`: prošao iz drugog pokušaja. Prvi pokušaj je pao u `next/font/google`, jer je Google vratio drugačiji CSS za font; to je prolazna mrežna greška, nije vezana za izmene. Ako se ponovi, samo ponovo pokrenuti build.
- `check-access`: 160/160 PASS. Proba bez prijave: svi zaštićeni pozivi odbijeni.
- Pregledač (build na :3137, `night-run/qa/15/`):
  - korpa u Papiru, Tinti i na telefonu: labele postoje, najmanje dugme 44 px, 0 grešaka u konzoli;
  - napomena na završenom programu je ispravna;
  - `<iframe>` za partnersku destinaciju je uklonjen u kodu; na DEV-u nijedna stranica zemlje nema partnersku destinaciju, pa to nije snimljeno;
  - poravnanje je izmereno na 7 stranica.
- `e2e-auth` (pregledač, build): 10 PASS, 1 SKIP (na DEV-u nema verske ponude koja se još prodaje, kao u koraku 14). Test sada traži novi tekst staff napomene.
- Pun QA (`scripts/qa/run-qa.mjs --out 15/run`, posle obe runde): 68 javnih prikaza (1440 i 390 px, Papir i Tinta) i 18 admin ekrana bez problema; axe (serious/critical): 0; pokvareni linkovi: 0 od 184; dijakritike nisu odsečene; reduced motion: 0 video zahteva. „Fokus bez vidljivog stila: 4“ su fotografije vozila: prsten se crta kao zlatna unutrašnja senka na sloju `.veh-photo__grade`, što skripta ne prepoznaje (isti lažni nalaz kao u koraku 14). Snimci i JSON: `night-run/qa/15/run/`.

### Za vlasnika (ujutru)

1. **Lozinka.** Ako je stara admin lozinka (iz koda pre koraka 03) korišćena igde drugde, promenite je. U istoriji gita je zauvek.
2. **Fotografije vozila.** Otpremite prave fotografije autobusa i kombija u Admin → Iznajmljivanje vozila; na DEV-u su sada snimci ekrana.
3. **Ponovni uvoz.** Posle povećanja limita (`npx convex env set SYNC_DAILY_REQUEST_CAP 800`) pokrenite uvoz sa ponovnim čitanjem (vidi korak 09). Posle toga vratite na sajt dve sakrivene Tomash ponude:
   - Admin → Ponude → partner Tomash → „Prag 2 noćenja“ i „Krajova Advent“ → „Vrati na sajt“;
   - ili `npx convex run offerAdmin:setHiddenInternal '{"slugs":["prag-2-nocenja-prag-2-nocenja-tomash","krajova-advent-krajova-advent-tomash"],"hidden":false}'`.
4. **Podaci u adminu.** Na DEV aranžmanu „Turska“ ispravite opis (test tekst) i trajanje („5 dana / 6 noćenja“), kao i naziv partnera „BIGBLUE“ → „Big Blue“.
5. **Nedostaje.** Editor za „O nama“ i stranice „Opšti uslovi“ i „Politika privatnosti“ (potreban je tekst).

### Kako proveriti

- Bezbednost:
  - `node --env-file=.env.local scripts/security/check-access.mjs --only anon` (i `customer`, `editor`, `signin`);
  - `node --env-file=.env.local night-run/qa/15/probe-anon.mjs`.
- Cene: `/ponude/vila-breza-sokobanja-skiandsun` prikazuje „Cena na upit“; `/ponude/prag-2-nocenja-prag-2-nocenja-tomash` vraća 404 (sakrivena).
- Korpa: dodajte bilo šta u korpu (ili `localStorage.ablux_cart`), otvorite je, pa „Nastavi na IPS plaćanje“: polja sa labelama, dugmad 44 px. Proverite u obe teme.
- Poravnanje: `/kontakt`, `/o-nama`, `/iznajmljivanje-vozila` na 1440 px. Naslov heroja i naslovi sekcija su na istoj levoj ivici.
- Admin: `/admin/pocetna` (ivice slajdova bez neona), `/admin/aranzmani` (datumi latinicom), `/admin/partneri` (brojevi u pravilnoj množini).
- korak 15 OK — 58 min, pokušaja 1

## Korak 16 — Završetak: dokumentacija i izveštaj

**Urađeno**
- **Korak 14:** sekcija „Korak 14 — QA“ dopisana je na osnovu ponovljenog punog QA iz koraka 15. Nov QA nije pokretan; kod posle toga je menjan samo u Partner Sync mapiranju, bez promena na UI-ju.
- **Nova dokumentacija:**
  - `README.md` (zamenjen šablon `create-next-app`);
  - `docs/RUNBOOK-sync.md`;
  - `docs/UPUTSTVO-ADMIN.md` (srpski, za koleginicu);
  - `docs/PARTNER-EMAIL.md` (šablon pisma partnerima).
- **Rezime noći** je na vrhu ovog izveštaja, sa demo scenarijom na trenutnoj ponudi.
- **Pronađena i ispravljena greška u katalogu.** Hoteli SunLine u Monastiru (Tunis) bili su u kategoriji „Verski turizam“, jer je ključna reč „monast“ hvatala ime grada.
  - Ispravka je u `scraper/core/travel-type.ts` (sa testom).
  - 3 postojeće kartice ispravljene su jednokratnom migracijom `npx convex run sync/ingest:dropMonastirReligiousTag`.

**Provera**
- `npx convex dev --once`: OK.
- `npm run lint`: 0 problema.
- `npx tsc --noEmit`: OK.
- `npm test`: 136 testova.
- `npm run build`: OK.
- Demo adrese vraćaju 200 na produkcionom build-u (:3137):
  - Nova godina: 26 ponuda;
  - Istanbul: 7;
  - Tunis: 47;
  - zimovanje: 35;
  - `/admin` bez prijave preusmerava (307).

**Kako proveriti**
- `/ponude?tip=verski-turizam`: nema hotela iz Monastira.
- Pročitajte `README.md` i dokumente u `docs/`.
- korak 16 OK — 8 min, pokušaja 1
- 2026-10-01 15:27:00 — kraj runa

## Korak 17 — Paketi na latest

Grana `deps-latest` (od `ablux-2.0`, posle commit-a „dev: Turbopack umesto webpack-a“). Ništa nije spojeno ni push-ovano; Convex samo DEV.

**Ažurirano (minor/patch, jedan commit)**
- next i eslint-config-next 16.1.6 → 16.3.8 (tačne verzije); react i react-dom 19.2.4 → 19.3.0 (tačne verzije)
- convex 1.32.0 → 1.46.0; tailwindcss i @tailwindcss/postcss 4.2.1 → 4.3.3; lucide-react 1.7.0 → 1.49.0
- gsap 3.14.2 → 3.15.0; fuse.js 7.1.0 → 7.5.0; zustand 5.0.11 → 5.0.15
- @types/react 19.2.14 → 19.3.0; @types/react-dom 19.2.3 → 19.3.0; eslint 9.39.3 → 9.39.5; @types/node 22.20.4 → 22.20.5
- Ostali paketi su već bili na latest (@convex-dev/auth 0.0.96, @auth/core, cheerio, zod, vitest 5, tsx, playwright …).

**Major verzije**
- typescript 5.9.3 → 6.0.3 (poseban commit). TypeScript 7.0.2 je proban: `tsc --noEmit` prolazi, ali TS 7 nema JS API, a typescript-eslint 8.71 (peer `<6.1.0`) ga odbija, pa `npm run lint` pada. Ostajemo na 6.0.x dok typescript-eslint ne podrži TS 7.1.
- ESLint 10 nije uzet: eslint-plugin-react, eslint-plugin-jsx-a11y i eslint-plugin-import (dolaze iz eslint-config-next 16.3.8) podržavaju samo do ESLint 9. Proba sa ESLint 10 pada odmah („contextOrFilename.getFilename is not a function“ u eslint-plugin-react). Ostaje 9.39.5.
- @types/node ostaje na 22.x (Node v22.23.2), sada 22.20.5.

**Izmene u kodu zbog novih verzija**
- lucide-react: preimenovane ikone zamenjene novim imenima (Trash2 → Trash, Building2 → BuildingComplex, History → RotateCcwClock); stara imena su radila kao alijasi.
- eslint-plugin-react-hooks 7.0.1 → 7.1.1 (iz eslint-config-next) prijavio je 7 novih grešaka:
  - `auth-portal.tsx` i `cart-drawer.tsx`: stanje se usklađuje tokom rendera umesto u efektu;
  - `command-palette.tsx`: paleta se zatvara preko `onClose` (bez čitanja ref-a pri renderu);
  - `admin-frame.tsx` (čitanje localStorage posle hidratacije) i `partners.tsx` (`?pokreni=1`): namerni slučajevi, označeni komentarom.
- Uklonjen `components/admin/slide-slide-over.tsx`: nigde se nije koristio, a imao je istu grešku.
- Next 16.2/16.3 i Convex 1.33–1.46 nisu tražili izmene konfiguracije. Next 16.3 proverava tipove preko `tsc`. Stari `.next/dev/types` od 16.1.6 obrisani su jer su rušili `tsc`.

**Čišćenje**
- `lucia` ostaje: `convex/lib/passwords.ts` koristi njen `Scrypt` (isti format heša kao Convex Auth), a i sam `@convex-dev/auth` zavisi od nje. Uklanjanje bi menjalo heširanje lozinki. Drugih nekorišćenih zavisnosti nema (`@auth/core` je peer od `@convex-dev/auth`).
- npm audit: pre 11 ranjivosti (1 low, 5 moderate, 5 high), posle ažuriranja 2 moderate (`uuid <11.1.1` preko `exceljs 4.4.0`). Jedina ponuđena ispravka je downgrade exceljs na 3.4.0 (breaking), pa nije primenjena.
- `npm dedupe` (poseban commit).

**Provere**
- Gate (`convex dev --once`, lint, tsc, test, build): baseline zeleno; posle minor verzija prvo lint 7 grešaka i tsc (stari tipovi), posle ispravki zeleno; posle TS 6 zeleno; posle dedupe zeleno. Testovi 136/136. Logovi: `night-run/qa/17/gate-*`.
- `npm run dev` prikazuje „Next.js 16.3.8 (Turbopack)“.
  - `/`, `/ponude`, `/ponude/el-mouradi-cap-mahdia-mahdia-sunline` i `/auth` vraćaju 200, bez grešaka u konzoli.
  - `/admin` bez prijave vraća 307 na `/auth` (kako je predviđeno); prijavljeni admin je pokriven QA-om.
  - Hero video se pušta (Playwright, 1440 px: 0,1 → 5,2 s).
  - U ugrađenom pregledaču se video ne pušta: panel je bio skriven i Chrome je mrežu procenio kao „3g“, pa sajt namerno prikazuje samo postere.
- Pun QA (`run-qa.mjs --out 17/run`, build na :3137), poređenje sa korakom 15:

  | | korak 15 | korak 17 |
  |---|---|---|
  | javne stranice sa problemom | 0 / 68 | 0 / 68 |
  | admin ekrani sa problemom | 0 / 18 | 0 / 18 |
  | pokvareni linkovi | 0 | 0 |
  | fokus bez vidljivog stila | 4 (lažni nalaz, fotografije vozila) | 4 (isto) |
  | reduced motion: zahtevi za video | 0 | 0 |
  | axe (serious/critical) | 0 | color-contrast ×2 |

  Oba axe nalaza su isti element: značka „Novo“ (`ui-badge--route`) na kartici u „Uskoro polaze“ na `/`, samo u Tinti, kontrast 4,47:1 umesto 4,5:1. To nije posledica ažuriranja: polasci od 2. 10. su istekli i u listi je nova partnerska ponuda sa tom značkom (u koraku 15 nije bilo značke u toj listi). Ispravka boje je predložena kao poseban zadatak.

**Napomena**
- Dev server na :3000, pokrenut pre ovog koraka, radio je sa starim paketima i posle zamene vraća 500. Restartujte ga (`npm run dev`).

**Spajanje**
```bash
git switch ablux-2.0 && git merge deps-latest
```
Posle spajanja: `npm install`, pa restart dev servera.

## Korak 18 — Sajt: navbar, hero, slike

Grana `ui-fixes` (iz `deps-latest`), jedan commit po stavci. Dokazi (pre/posle, 1440 i 390 px): `night-run/qa/18/` (`cmp-nav.png`, `cmp-scroll.png`, `cmp-hero-1440.png`, `cmp-hero-390.png`, `cmp-vehicles.png`, `before-*`/`after-*`, `*-report.json`).

1. **Ikonice u navigaciji** (pretraga, SR/EN, tema, meni, korpa): bez ivice, pozadine, senke, outline-a i tap highlight-a; zona klika 44x44 px; ikonica tačno u centru (tema je bila pomerena 11 px zbog `inline-flex` iz `.snav__desktop-only`). Fokus tastaturom menja samo boju ikonice (Papir, Tinta, preko heroja). `run-qa.mjs` već poredi boju, pa ga nije trebalo menjati.
2. **Navigacija kao na Instagramu:** skrol nadole je sklanja (translateY(-100%), 250 ms, ease-out), skrol nagore vraća; prag 8 px, rAF. Ne sakriva se pri vrhu, uz otvoren mega meni, mobilni meni ili pretragu, ni dok je fokus tastature u njoj. Pilula „Kuda putujete?“ ide gore sa trakom i ostaje na vrhu (12 px), a vraća se tačno ispod trake. Uz smanjeno kretanje nema klizanja.
3. **Mutan hero na /verski-turizam:** uzrok nije bio samo enkod. CSS greška je na desktopu prikazivala uspravni mobilni klip 720x1280 razvučen 2x preko širokog. Ispravljeno; `ostrog-desktop.mp4` ponovo enkodiran iz `design/hero/raw/drone/ostrog-drone-v1.mp4` (CRF 20, 7,8 MB), posteri iz prvog kadra u višem kvalitetu (mobilni 1080x1920). `manifest.json` nije menjan i važi. Napomena: sam izvorni AI dron snimak je 1920x1080 i blago mekan, pa je to gornja granica oštrine; mobilni kadar je isečak 608x1080.
4. **Pogrešne slike:** pregledano 50 slika sa javnih stranica. Pogrešne su bile slike vozila u Convex DEV (`vehicleRentalImages`): screenshot tuđeg sajta (Autobus, glavna), Windows pozadina (Kombi, glavna) i 6 slika galerije (DevTools CSS paneli i Turbopack poruka o grešci). Zamenjene pravim fotografijama flote iz `public/home-swiper/`: autobus = Setra (4 fotografije), luks kombi = crni Mercedes + enterijer (2). Stari fajlovi nisu obrisani (id-jevi u `night-run/qa/18/vehicle-photos-previous.json`). Galerija na /iznajmljivanje-vozila: sve učitane (naturalWidth > 0). Slike partnera, destinacija i manastira su u redu.

**Vlasnik treba da dostavi:** više fotografija luks kombija (spolja i iznutra), fotografiju enterijera autobusa za koju je sigurno da je naša Setra, i iste zamene na PRODUKCIJI preko /admin/iznajmljivanje-vozila (ova zamena je samo na DEV).

Provere (poslednji krug): lint=0, tsc=0, test=0, build=0 (0 = prošlo).

## Korak 19 — Admin: logo i sidebar

Grana `ui-fixes`, jedan commit po stavci (`[19.1]`, `[19.2]`, `[19.3]`). Dokazi: `night-run/qa/19/` (`before-*` / `after-*`: desktop 1440x900 proširen i skupljen u Papiru i Tinti, nizak ekran 1280x640 sa skrolom, `/admin/ponude` skrolovan do dna, 390 px sa menijem i paletom; `after-report.json`). Merenje: `scripts/qa/admin-sidebar.mjs` (Playwright, QA urednik, pravi skrolbarovi uključeni, jer ih Playwright inače sakriva).

1. **Pravi logo:** tekstualni znak „ABLux Travel“ i kvadratić „A“ zamenjeni su logom (`components/admin/admin-logo.tsx`): `/logo-light.avif` u Papiru, `/logo-dark.avif` u Tinti, kao u navigaciji sajta, `alt="ABLux Travel"`. Prikazuje se u sidebaru (uz „Administracija“), u meniju na telefonu, u gornjoj traci na telefonu (link na Pregled), u podnožju Ctrl+K palete i na ekranu „Proveravamo pristup“. U skupljenom sidebaru logo je mali (40 px) i centriran tačno iznad ikonica. „ABLux“ kao podatak (bedž, filteri, „Samo ABLux programi“) nije diran.
2. **Centriranje u skupljenom sidebaru:** uzrok je bio skrolbar liste (15 px) koji je ikonice gurao 7,5 px ulevo od dugmadi „Proširi meni“ i „Odjavi se“. Skrolbar je sakriven (`scrollbar-width: none`, `::-webkit-scrollbar`), skrol točkićem, dodirom i tastaturom radi, a blago bledenje ivice pojavljuje se samo kad ima još sadržaja (gore, dole ili oba). Pre: raspon centara 7,5 px (1280x640, skupljen). Posle: 0 px u svih 8 kombinacija (proširen/skupljen, Papir/Tinta, 1440x900 i 1280x640).
3. **Sidebar uvek na ekranu:** od 1024 px sidebar je `position: fixed`, pune visine (100dvh); sadržaj je pomeren za širinu (248 / 68 px) i animira se zajedno sa sidebarom (220 ms, bez animacije uz smanjeno kretanje). Skroluje se samo lista. Ispod 1024 px ostaje fioka. Pre: na `/admin/ponude` skrolovanom do dna (scrollY 3075) sidebar je bio na top −3075 px (sticky nije radio). Posle: top 0, bottom 900 = visina prozora, u sve 4 kombinacije.

Provere (poslednji krug): lint=0, tsc=0, test=0 (136/136), build=0 (0 = prošlo).
