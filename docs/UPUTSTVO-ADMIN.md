# Uputstvo za administraciju ABLux Travel

Kratko uputstvo za svakodnevni rad u administraciji. Administracija je na adresi `/admin` (lokalno: `http://localhost:3000/admin`).

Snimci ekrana su u `night-run/qa/15/run/` (naziv počinje sa `admin-…`).

## 1. Prijava i lozinka

1. Otvorite `/auth` i prijavite se e-poštom i lozinkom.
   - Prve lozinke su u fajlu `night-run/SECRETS.local.md`, kod developera.
2. **Odmah promenite lozinku:** gore desno kliknite na svoje ime → „Promena lozinke“. Isto se radi i u Podešavanja → Korisnici (`/admin/podesavanja/korisnici`).
3. **Odjava:** korisnički meni → „Odjavi se“, ili dugme na dnu levog menija.
4. **Nova koleginica ili kolega:**
   - prvo se sami registruju na `/auth`;
   - zatim im vlasnik u Podešavanja → Korisnici dodeli ulogu „Urednik“.
5. Posle 10 pogrešnih lozinki nalog se privremeno zaključava. Sačekajte sat vremena ili se javite vlasniku.

**Brža navigacija:** **Ctrl + K** (na telefonu lupa) otvara pretragu cele administracije. Upišite naziv ekrana, ponude ili partnera, ili komandu „pokreni“ ili „ručni unos“.

## 2. Pregled (`/admin`)

Pregled pokazuje:
- nove upite i koliko ih je stiglo danas;
- koliko je ponuda na sajtu i šta se promenilo od juče;
- stanje uvoza po partneru (svetlo + rečenica);
- kada je sledeći automatski uvoz.

Snimak: `admin-desktop-papir-pregled.png`.

## 3. Upiti i rezervacije (`/admin/upiti`)

Ovde su na jednom mestu upiti sa sajta i porudžbine plaćene IPS QR kodom. Broj novih upita stoji i u levom meniju.

1. Kliknite na red; sa desne strane se otvara fioka sa detaljima. U njoj su:
   - dugmad za poziv i e-poštu;
   - ponuda na našem sajtu i program kod organizatora;
   - poruka klijenta.
2. **Status:** novo → u obradi → potvrđeno ili otkazano. Svaka promena ima „Poništi“ u obaveštenju dole.
3. **Zaduženje:** izaberite koleginicu ili kolegu koji vodi upit.
4. **Beleške:** upišite šta je dogovoreno. Beleške se ne brišu i imaju autora i vreme.
5. **Porudžbine (IPS):**
   - polje „Uplata“ (čeka se / plaćeno / nije uspela) menjate ručno, kad uplatu vidite na izvodu;
   - poziv na broj je u fioci.

Pretraga radi po imenu, telefonu, e-pošti ili ponudi. Snimak: `admin-desktop-papir-upiti.png`.

> E-pošta o novom upitu se još ne šalje automatski. Proveravajte ekran Upiti ili broj u meniju.

## 4. Ponude (`/admin/ponude`)

Ovde su sve ponude: naši programi i ponude partnera.

- **Pretraga i filteri:** izvor, partner, stanje, kategorija, cena, mesec polaska. Na telefonu su iza dugmeta „Filteri“.
- **Više ponuda odjednom:** označite redove, pa izaberite „Objavi“, „Sakrij“, „Vrati na sajt“, „Istakni“ ili „Ukloni isticanje“. Svaka radnja ima „Poništi“.
- **Fioka ponude** (klik na red):
  - stanje na sajtu;
  - „Otvori na sajtu“ i „Original kod partnera“;
  - **ABLux izmene:** naš naslov, uvod, do tri kategorije i naslovna slika (otpremanje ili https adresa). Ove izmene ostaju i posle svakog novog uvoza od partnera;
  - poslednje promene iz uvoza.
- **Naši programi** (aranžmani, verske ponude) otvaraju se u svom editoru (tačka 7).
- **Ako je kod ponude nešto pogrešno** (cena, zemlja): kliknite „Sakrij“ i javite developeru. Posle ispravke kliknite „Vrati na sajt“.

Snimak: `admin-desktop-papir-ponude.png`.

## 5. Nove i izmenjene (`/admin/izmene`)

Ovde su sve promene iz automatskog uvoza po danima (danas / 7 / 30 dana):
- nove ponude;
- promene cene (staro → novo);
- promenjeni termini;
- skinute i istekle ponude.

Klik vodi na ponudu. Ništa ne morate da odobravate: ponude partnera se objavljuju same, a ovaj ekran služi da znate šta se promenilo. Snimak: `admin-desktop-papir-izmene.png`.

## 6. Partneri i uvoz (`/admin/partneri`)

- **17 kartica partnera.** Na svakoj su:
  - svetlo stanja i broj ponuda (aktivne / na sajtu / ukupno);
  - poslednji uvoz;
  - razlog problema običnim rečima.
- **Prekidač „Na sajtu“** sklanja ili vraća sve ponude jednog partnera.
- **„Pokreni sada“** pokreće dodatni uvoz (traži potvrdu).
  - Posle ručnog uvoza dugme je zaključano do sledećeg automatskog uvoza u **06:00** i pokazuje odbrojavanje.
  - Dok uvoz traje vidi se napredak po partneru i dugme „Prekini uvoz“.
- **Fioka partnera:** automatska objava, organizator i licenca, opšti uslovi, provizija, kontakt, beleške, mapiranje kategorija i poslednjih 10 uvoza sa dnevnikom. Status partnera menja samo vlasnik.
- **„Čeka dozvolu (whitelist/feed)“:** sajt partnera blokira automatsko preuzimanje. Potrebna je dozvola partnera (vidi `docs/PARTNER-EMAIL.md`).
- **Istorija uvoza:** `/admin/partneri?prikaz=istorija`.

Snimak: `admin-desktop-papir-partneri.png`.

### Ručni unos ponuda (Holiday Plus KM i partneri bez sajta)

1. Partneri → „Ručni unos“ (`/admin/partneri/rucni-unos`).
2. Otpremite cenovnik koji ste dobili (PDF, Excel, CSV ili fotografiju). Fajl ostaje sačuvan uz ponude.
3. Kliknite „Nova ponuda“ i popunite formular:
   - naziv, mesto, država, vrsta, usluga, noćenja, prevoz;
   - termini sa cenom i osnovom (po osobi, po apartmanu…);
   - šta cena obuhvata i ne obuhvata, opis, program, organizator i licenca, fotografije.
   - **Ponuda bez termina** prikazuje se kao „Cena na upit“.
4. Sačuvana ponuda je odmah na sajtu. Možete je kasnije izmeniti ili skinuti.

Snimak: `admin-desktop-papir-partneri_rucni-unos.png`.

## 7. Sadržaj sajta

| Ekran | Šta menjate |
|---|---|
| Početna (`/admin/pocetna`) | „Najtraženije rute“: slajd sa fotografijom, naslovom i **linkom** postaje ruta na početnoj. Pregled kanala heroja je samo informativan; video menja developer. |
| Aranžmani (`/admin/aranzmani`) | Naši programi: cena, datumi, program po danima, smeštaj, destinacije, slike, PDF. Program sa prošlim datumom polaska se na sajtu prikazuje kao „Završen“ i ne može se kupiti. |
| Putovanja (`/admin/putovanja`) | Grupe putovanja po zemljama i njihove destinacije. |
| Verski turizam (`/admin/verski-turizam`) | Naše verske ponude: termini, cene, PDF program, slike. |
| Iznajmljivanje vozila (`/admin/iznajmljivanje-vozila`) | Fotografije autobusa i kombija. **Koristite samo prave fotografije vozila.** |

Kad ste prijavljeni, na javnim stranicama postoji okvir „Vidljivo samo osoblju“ sa linkom na ekran koji tu stranicu uređuje. Tekst stranice „O nama“ za sada menja developer.

## 8. Podešavanja

- **Kontakt i podaci agencije** (`/admin/podesavanja`):
  - telefon, e-pošta, adresa, radno vreme, broj licence (OTP);
  - Instagram, Facebook, TikTok i YouTube (adresa mora početi sa `https://`).
  - Sajt prikazuje samo popunjena polja. Dok su sva prazna, piše „Kontakt podaci uskoro“.
- **Korisnici** (`/admin/podesavanja/korisnici`): promena lozinke. Vlasnik ovde dodeljuje uloge (Urednik, Korisnik) i isključuje naloge.
- **Dnevnik izmena** (`/admin/podesavanja/dnevnik`, samo vlasnik): ko je šta i kada menjao.

Snimak: `admin-desktop-papir-podesavanja.png`.

## 9. Tema i jezik

U korisničkom meniju birate temu Papir (svetla) ili Tinta (tamna) i jezik srpski ili engleski. Izbor se pamti na tom računaru.
