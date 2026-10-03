# Noćni run — kako se pokreće i prati

Skripta `run.ps1` pokreće Claude Code (Opus 5.5) 16 puta zaredom, bez tebe. Posle svakog koraka proverava `npx convex dev --once` i `npm run build`, i commituje na granu `ablux-2.0`. Produkcija se ne dira: nema `convex deploy`, nema `--prod`, nema `vercel`, nema `git push` (zabranjeno i u `.claude/settings.json`).

## Pokretanje

Dvoklik na `night-run\POKRENI.cmd`. Radi sa Windows PowerShell-om koji je već u Windows-u (5.1); ako postoji PowerShell 7, koristi njega.

Iz terminala, u folderu projekta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\night-run\run.ps1
```

- Prekid (limit, zatvoren prozor, restart računara): ponovo dvoklik na `POKRENI.cmd`. Run preskače gotove korake, a prekinuti korak nastavlja u istoj sesiji.
- Nastavak od tačno određenog koraka: `night-run\POKRENI.cmd -From 7` (ponavlja i korake koji su već gotovi, ako su posle 7)
- Samo neki koraci: `night-run\POKRENI.cmd -Only 11` ili `-Only "11,12"`
- Suvi prolaz (samo ispiše plan): `night-run\POKRENI.cmd -DryRun -SkipPreflight`

Prozor mora ostati otvoren. Skripta sama sprečava sleep dok radi.

## Koraci

| # | Šta | Mod | Effort | Sesija |
| --- | --- | --- | --- | --- |
| 1 | Priprema, CLAUDE.md, DESIGN.md, čišćenje, brze popravke | auto | high | S1 nova |
| 2 | Bezbednost: plan | plan | max | S2 nova |
| 3 | Bezbednost: izvršenje | auto | high | S2 nastavak |
| 4 | Dizajn sistem | auto | high | S3 nova |
| 5 | Meni, pretraga, footer, 404 | auto | high | S3 nastavak |
| 6 | Partner Sync: plan | plan | max | S4 nova |
| 7 | Partner Sync: šema, okvir, prvi adapteri | auto | xhigh | S4 nastavak |
| 8 | Partner Sync: ostali adapteri, ručni uvoz | auto | xhigh | S4 nastavak |
| 9 | Partner Sync: raspored 06:00, dugme sa cooldown-om, pravi uvoz u DEV | auto | xhigh | S4 nastavak |
| 10 | Katalog `/ponude`, stranica ponude, upit | auto | high | S5 nova |
| 11 | Početna: Živa razglednica | auto | high | S6 nova |
| 12 | Ostale javne stranice | auto | high | S6 nastavak |
| 13 | Admin panel | auto | high | S7 nova |
| 14 | QA | auto | high | S8 nova |
| 15 | Nezavisni pregled | auto | xhigh | S9 nova |
| 16 | Dokumentacija i izveštaj | auto | medium | S9 nastavak |

Korak 11 čeka hero materijal (`design/hero/READY`) najviše 90 minuta, pa radi sa onim što postoji; kasnije dodati fajlovi se sami pokupe.

## Praćenje

- `night-run/status.json` — trenutni korak i faza (running, gate, waiting-limit, waiting-hero).
- `night-run/logs/run.log` — tok noći; `NN-*.jsonl` — ceo rad svakog koraka; `NN-gate.txt` — rezultat kapije.
- `night-run/NIGHT_REPORT.md` — izveštaj koji koraci pišu za tebe.
- `night-run/DECISIONS.md` — odluke koje je run doneo sam.
- `night-run/SECRETS.local.md` — nova admin lozinka posle koraka 3 (nije u gitu).

## Ako nešto pukne

- Limit pretplate: skripta sama čeka reset i nastavlja.
- Korak ne prođe ni posle drugog pokušaja: beleži se kao neuspeo, zavisni koraci se preskaču, ostali idu dalje.
- Ručni nastavak: dvoklik na `POKRENI.cmd` (nastavlja od prvog nezavršenog koraka) ili `POKRENI.cmd -From <broj>`.
- Sve je u gitu na grani `ablux-2.0`; `main` ostaje netaknut.
