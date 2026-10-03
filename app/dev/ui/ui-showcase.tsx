"use client";

import { ArrowRight, Bus, CalendarDays, Clock, MapPin, Search, Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Accordion,
  Badge,
  BrassPlate,
  Button,
  ButtonLink,
  Chip,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  Input,
  Postcard,
  Price,
  RemovableChip,
  Reveal,
  RouteLine,
  SectionHeading,
  Select,
  Sheet,
  Skeleton,
  Stamp,
  StatusDot,
  Tabs,
  Textarea,
  TicketCard,
  TicketSkeleton,
  useToast,
} from "../../../components/ui";
import { TripSearch } from "../../../components/search/trip-search";

/*
 * Every value on this page is a sample for visual QA only (not business data).
 * The page renders the whole library twice: Papir and Tinta, via data-theme.
 */

type Theme = "light" | "dark";

const DIACRITICS = [
  "Najtraženije rute",
  "Iznajmljivanje vozila sa vozačem",
  "Planiranje bez slučajnosti",
  "Đurđevdan u Ćupriji",
  "Čačak, Užice, Žabljak",
  "ŽIČA · ĐERDAP · ŠARGAN",
];

function Block({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="dev-ui__block">
      <h2 className="dev-ui__block-title">{title}</h2>
      {note ? <p className="dev-ui__note">{note}</p> : null}
      {children}
    </section>
  );
}

function Row({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="dev-ui__row-wrap">
      {label ? <p className="dev-ui__row-label">{label}</p> : null}
      <div className="dev-ui__row">{children}</div>
    </div>
  );
}

const arrow = <ArrowRight aria-hidden="true" strokeWidth={1.5} />;
const send = <Send aria-hidden="true" strokeWidth={1.5} />;

function Gallery({ theme }: { theme: Theme }) {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["leto"]);
  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  const themeName = theme === "light" ? "Papir" : "Tinta";

  return (
    <div className="dev-ui__theme" data-theme={theme}>
      <div className="dev-ui__inner">
        <p className="ui-overline">Tema · {themeName}</p>

        <Block title="Tipografija i dijakritici" note="Svaka težina koja se koristi, uspravno i kurziv.">
          <div className="dev-ui__type">
            <p className="dev-ui__display">
              Putovanja sa potpisom <em>sigurnosti</em>
            </p>
            {[400, 500, 600].map((weight) => (
              <p key={weight} className="dev-ui__specimen" style={{ fontWeight: weight }}>
                <span className="dev-ui__specimen-tag">{weight}</span>
                {DIACRITICS[weight / 100 - 4]} · <i>{DIACRITICS[weight / 100 - 1]}</i> · ČĆŽŠĐ čćžšđ
              </p>
            ))}
            <p className="dev-ui__sans">
              Manrope: Neka sledeći polazak bude mirno planiran. Pošalji upit · Šta je uključeno · 1.290 € · 12. 6. 2026.
            </p>
          </div>
        </Block>

        <Block title="Dugmad">
          <Row label="Varijante">
            <Button icon={arrow}>Pogledaj ponude</Button>
            <Button variant="secondary" icon={send}>
              Pošalji upit
            </Button>
            <Button variant="ink">Rezerviši mesto</Button>
            <ButtonLink href="/ponude" variant="text" icon={arrow}>
              Sve ponude
            </ButtonLink>
            <Button variant="danger">Obriši</Button>
          </Row>
          <Row label="Stanja: onemogućeno, učitavanje, malo">
            <Button disabled>Pronađi</Button>
            <Button loading>Pošalji upit</Button>
            <Button variant="secondary" disabled>
              Sekundarno
            </Button>
            <Button variant="text" disabled>
              Link
            </Button>
            <Button size="sm" icon={<Search aria-hidden="true" strokeWidth={1.5} />}>
              Pronađi
            </Button>
          </Row>
          <p className="dev-ui__note">Onemogućeno dugme uvek ima razlog u blizini: „Popunite datum polaska”.</p>
          <div className="ui-on-ink dev-ui__ink-panel">
            <Button variant="ghost-on-ink" icon={send}>
              Pošalji upit
            </Button>
            <Button icon={arrow}>Pogledaj ponude</Button>
          </div>
        </Block>

        <Block title="Polja">
          <div className="dev-ui__grid">
            <Field label="Ime i prezime" required hint="Kako da Vam se obratimo.">
              <Input name="ime" autoComplete="name" placeholder="npr. Marija Petrović" />
            </Field>
            <Field label="Telefon" required error="Unesite ispravan broj telefona, npr. 064 123 4567">
              <Input name="telefon" type="tel" defaultValue="064 12" inputMode="tel" />
            </Field>
            <Field label="Polazak iz">
              <Select name="polazak" defaultValue="">
                <option value="">Bilo koji polazak</option>
                <option>Beograd</option>
                <option>Novi Sad</option>
                <option>Niš</option>
              </Select>
            </Field>
            <Field label="Mesec" hint="Učitavanje termina…">
              <Select name="mesec" loading disabled>
                <option>Bilo koji mesec</option>
              </Select>
            </Field>
            <Field label="Broj putnika">
              <Input name="putnici" disabled defaultValue="2 putnika" />
            </Field>
            <Field label="Poruka" hint="Javićemo Vam se u toku radnog dana.">
              <Textarea name="poruka" placeholder="Željeni termin, broj putnika, pitanja…" />
            </Field>
          </div>
        </Block>

        <Block title="Čipovi, oznake, status">
          <Row label="Filteri (izabrani imaju kvačicu)">
            {[
              ["leto", "Letovanja", 128],
              ["verski", "Verski turizam", 42],
              ["gradovi", "Evropski gradovi", 37],
            ].map(([id, label, count]) => (
              <Chip key={id as string} selected={selected.includes(id as string)} count={count as number} onClick={() => toggle(id as string)}>
                {label}
              </Chip>
            ))}
            <Chip disabled count={0}>
              Zimovanje
            </Chip>
          </Row>
          <Row label="Aktivni filteri">
            <RemovableChip label="Jul" />
            <RemovableChip label="Iz Beograda" />
            <Button variant="text" size="sm">
              Poništi sve
            </Button>
          </Row>
          <Row label="Oznake">
            <Badge>Neutralno</Badge>
            <Badge tone="route">Mediteran</Badge>
            <Badge tone="alert">Hodočašće</Badge>
            <Badge tone="warn">Proveriti</Badge>
            <Badge tone="gold">Novo</Badge>
            <Badge tone="info">Informacija</Badge>
            <Badge tone="outline">Partner</Badge>
          </Row>
          <Row label="Status (tačka + tekst)">
            <StatusDot status="active" />
            <StatusDot status="warning" />
            <StatusDot status="error" />
            <StatusDot status="off" />
            <StatusDot status="progress" />
            <StatusDot status="active" chip label="Uvoz uspešan" />
          </Row>
        </Block>

        <Block title="Karta (TicketCard)" note="Ceo kartica je link; „Pošalji upit” je posebno dugme iznad linka.">
          <div className="dev-ui__stack">
            <TicketCard
              href="/ponude"
              tone="brick"
              overline="Verski turizam · Grčka"
              title="Sveta Gora i Meteori"
              image={{ src: "/generated/route-ostrog-manastiri.png", alt: "Manastir u steni pri zalasku sunca" }}
              meta={[
                { icon: <CalendarDays aria-hidden="true" strokeWidth={1.5} />, label: "12. 6.–18. 6. 2026." },
                { icon: <Clock aria-hidden="true" strokeWidth={1.5} />, label: "7 dana" },
                { icon: <Bus aria-hidden="true" strokeWidth={1.5} />, label: "autobus" },
                { icon: <MapPin aria-hidden="true" strokeWidth={1.5} />, label: "polazak Beograd" },
              ]}
              stamp={{ eyebrow: "Ruta", code: "BEG → ATO", detail: "7 dana" }}
              price={{ amount: 590, basis: "perPerson" }}
              action={
                <Button size="sm" icon={send} onClick={() => toast.show({ message: "Upit je primljen (primer)." })}>
                  Pošalji upit
                </Button>
              }
            />
            <TicketCard
              href="/ponude"
              tone="teal"
              glyph="sea"
              overline="Letovanje · Grčka"
              title="Tasos, apartmani uz plažu"
              meta={[
                { icon: <CalendarDays aria-hidden="true" strokeWidth={1.5} />, label: "jun–septembar" },
                { icon: <Bus aria-hidden="true" strokeWidth={1.5} />, label: "sopstveni prevoz" },
              ]}
              organizer={{ name: "Primer agencija", license: "OTP 000/2026" }}
              price={{ amount: null, basis: null }}
              action={
                <Button size="sm" variant="secondary" icon={send}>
                  Pošalji upit
                </Button>
              }
            />
            <TicketCard
              href="/ponude"
              tone="teal-deep"
              glyph="city"
              overline="Evropski gradovi · Italija"
              title="Rim i Toskana"
              meta={[{ icon: <Clock aria-hidden="true" strokeWidth={1.5} />, label: "6 dana" }]}
              price={{ amount: 1290, basis: "totalForTwo" }}
              soldOut
            />
            <TicketSkeleton />
          </div>
        </Block>

        <Block title="Razglednice">
          <div className="dev-ui__postcards">
            <Postcard
              image={{ src: "/generated/route-sveta-zemlja.png", alt: "Jerusalim sa zlatnom kupolom" }}
              caption="Jerusalim, Sveta zemlja"
              stampGlyph="cross"
            />
            <Postcard placeName="Ostrog" caption="Bez fotografije (rezervni prikaz)" tilt="right" stampGlyph="church" />
            <Postcard
              image={{ src: "/generated/route-mediteran.png", alt: "Mediteranska obala" }}
              orientation="portrait"
              tilt="none"
              href="/ponude"
              caption="Kao link: ispravi se na hover"
              stampGlyph="sea"
            />
          </div>
        </Block>

        <Block title="Mesingane pločice, pečati, ruta">
          <Row label="Pločice 01–05">
            {[1, 2, 3, 4, 5].map((number) => (
              <BrassPlate key={number} number={number} />
            ))}
            <BrassPlate number={2} label="Korak 2 od 3" size="sm" />
          </Row>
          <Row label="Pečati">
            <Stamp eyebrow="Ruta" code="BEG → JER" detail="12–24 dana" />
            <Stamp eyebrow="Ruta" code="BEG → OST" detail="3 dana" tone="brick" />
            <Stamp eyebrow="Obala" code="ADR → MNE" tone="teal" />
            <Stamp code="AB · 2022." shape="round" tone="teal" />
            <Stamp code="RASPRODATO" shape="status" tone="brick" />
          </Row>
          <RouteLine
            label="Ruta: Beograd, Solun, Sveta Gora"
            compassAt={{ x: 20, y: 70 }}
            pins={[
              { x: 20, y: 70, at: 0, label: "Beograd" },
              { x: 460, y: 60, at: 0.48, label: "Solun" },
              { x: 980, y: 64, at: 1, label: "Sveta Gora" },
            ]}
            height="9rem"
          />
          <RouteLine tone="teal" animate="enter" height="5rem" />
        </Block>

        <Block title="Naslovi sekcija">
          <SectionHeading
            overline="Ponude"
            title={
              <>
                Najtraženije <em>rute</em>
              </>
            }
            intro="Pažljivo odabrane destinacije, provereni programi i put koji ima smisla."
            link={{ href: "/ponude", label: "Sve ponude" }}
          />
          <SectionHeading overline="Verski turizam" ornament="cross" title="Hodočašća sa blagoslovom" size="sm" align="center" />
          <div className="ui-on-ink dev-ui__ink-panel dev-ui__ink-panel--block">
            <SectionHeading onInk overline="Rent a bus" title={<>Vozila sa <em>vozačem</em></>} intro="Setra i Mercedes Sprinter za grupe i transfere." />
          </div>
        </Block>

        <Block title="Učitavanje i prazno stanje">
          <div className="dev-ui__grid" aria-busy="true">
            <div className="dev-ui__stack-sm">
              <Skeleton variant="title" />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
              <Skeleton height="8rem" />
            </div>
            <EmptyState
              title="Za jun trenutno nema polazaka"
              body="Pogledajte jul ili nam pošaljite upit, pa ćemo Vam predložiti termin."
              suggestions={
                <>
                  <Chip>Jul</Chip>
                  <Chip>Avgust</Chip>
                </>
              }
              action={
                <Button variant="secondary" icon={send}>
                  Pošalji upit
                </Button>
              }
            />
          </div>
        </Block>

        <Block title="Dijalog, donji panel, obaveštenje">
          <Row>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Otvori dijalog
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Otvori donji panel
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.show({
                  message: "Ponuda je sakrivena.",
                  action: { label: "Poništi", onAction: () => toast.show({ message: "Ponuda je ponovo vidljiva." }) },
                })
              }
            >
              Obaveštenje sa „Poništi”
            </Button>
            <Button variant="secondary" onClick={() => toast.show({ message: "Upit nije poslat. Proverite vezu i pokušajte ponovo.", tone: "error" })}>
              Obaveštenje o grešci
            </Button>
          </Row>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Pošaljite upit"
            description="Javićemo Vam se u toku radnog dana."
            footer={
              <>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Odustani
                </Button>
                <Button icon={send} onClick={() => setDialogOpen(false)}>
                  Pošalji upit
                </Button>
              </>
            }
          >
            <Field label="E-pošta" required>
              <Input type="email" autoComplete="email" />
            </Field>
          </Dialog>
          <Sheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Filteri"
            footer={
              <Button block onClick={() => setSheetOpen(false)}>
                Prikaži ponude
              </Button>
            }
          >
            <div className="dev-ui__row">
              <Chip selected>Letovanja</Chip>
              <Chip>Verski turizam</Chip>
              <Chip>Evropski gradovi</Chip>
            </div>
          </Sheet>
        </Block>

        <Block title="Kartice (tabs) i harmonika">
          <Tabs
            label="Detalji programa"
            items={[
              { id: "program", label: "Program", content: <p className="dev-ui__p">1. dan · Beograd – Solun. 2. dan · Solun – Uranopolis.</p> },
              { id: "cene", label: "Cene", content: <p className="dev-ui__p">Cene su u evrima; plaćanje u dinarima po srednjem kursu NBS.</p> },
              { id: "napomene", label: "Napomene", content: <p className="dev-ui__p">Šta je uključeno i šta nije.</p> },
              { id: "galerija", label: "Galerija", content: null, disabled: true },
            ]}
          />
          <Accordion
            exclusive
            items={[
              { id: "ukljuceno", title: "Šta je uključeno", content: "Prevoz turističkim autobusom, smeštaj, vodič.", defaultOpen: true },
              { id: "nije", title: "Šta nije uključeno", content: "Putno osiguranje i lični troškovi." },
              { id: "dokumenta", title: "Potrebna dokumenta", content: "Pasoš važeći najmanje 3 meseca od povratka." },
              { id: "zatvoreno", title: "Nedostupno (onemogućeno)", content: null, disabled: true },
            ]}
          />
        </Block>

        <Block title="Tabele">
          <DataTable
            caption="Cene su u evrima; plaćanje u dinarima po srednjem kursu NBS na dan uplate."
            stackOnMobile
            getRowKey={(row) => row.termin}
            columns={[
              { key: "termin", header: "Termin", render: (row) => row.termin },
              { key: "smestaj", header: "Smeštaj", render: (row) => row.smestaj },
              {
                key: "cena",
                header: "Cena po osobi",
                align: "end",
                render: (row) => <Price amount={row.cena} basis="perPerson" from={false} surface="theme" className="dev-ui__table-price" />,
              },
            ]}
            rows={[
              { termin: "12. 6. 2026.", smestaj: "Hotel 3*, polupansion", cena: 590 },
              { termin: "26. 6. 2026.", smestaj: "Hotel 3*, polupansion", cena: 640 },
              { termin: "10. 7. 2026.", smestaj: "Hotel 4*, polupansion", cena: 1290 },
            ]}
          />
          <div data-mode="operate">
            <DataTable
              label="Partneri (admin gustina)"
              density="compact"
              selectedKeys={new Set(["b"])}
              getRowKey={(row) => row.id}
              columns={[
                { key: "naziv", header: "Partner", render: (row) => row.naziv },
                { key: "status", header: "Status", render: (row) => <StatusDot status={row.status} /> },
                { key: "ponude", header: "Ponude", align: "end", render: (row) => row.ponude },
                { key: "vreme", header: "Poslednji uvoz", align: "end", render: (row) => row.vreme },
              ]}
              rows={[
                { id: "a", naziv: "Partner A", status: "active" as const, ponude: 214, vreme: "06:00" },
                { id: "b", naziv: "Partner B", status: "warning" as const, ponude: 37, vreme: "06:02" },
                { id: "c", naziv: "Partner C", status: "off" as const, ponude: 0, vreme: "—" },
              ]}
            />
          </div>
          <DataTable label="Prazna tabela" getRowKey={() => "x"} columns={[{ key: "a", header: "Kolona", render: () => null }]} rows={[]} empty="Još nema upita. Novi upiti sa sajta pojaviće se ovde." />
        </Block>

        <Block title="Pokret">
          <Reveal selector="[data-reveal]" className="dev-ui__row">
            {["Ulazak", "u", "kadar"].map((word) => (
              <span key={word} data-reveal className="dev-ui__reveal">
                {word}
              </span>
            ))}
          </Reveal>
          <p className="dev-ui__note">Pod „prefers-reduced-motion: reduce” sve je odmah u krajnjem stanju.</p>
        </Block>

        <Block title="Pretraga „Kuda putujete?”" note="Isti obrazac: traka u heroju (korak 11 je ugrađuje), panel u dijalogu i donjem panelu.">
          <TripSearch variant="bar" />
          <div className="dev-ui__search-panel">
            <TripSearch variant="panel" />
          </div>
        </Block>

        <Block title="Cena">
          <Row>
            <Price amount={590} basis="perPerson" surface="theme" />
            <Price amount={1290} basis="perApartment" surface="theme" />
            <Price amount={null} basis={null} surface="theme" />
            <Price amount={750} basis="totalForTwo" showNbsNote surface="theme" className="dev-ui__price-note" />
          </Row>
        </Block>
      </div>
    </div>
  );
}

export default function UiShowcase() {
  return (
    <main id="main-content" className="dev-ui">
      <style>{DEV_UI_CSS}</style>
      <header className="dev-ui__header">
        <p className="ui-overline">ABLux · dizajn sistem · korak 04</p>
        <h1>UI komponente</h1>
        <p className="dev-ui__note">Interna QA stranica (noindex). Svi podaci su primeri za proveru izgleda, nisu poslovni podaci.</p>
      </header>
      <Gallery theme="light" />
      <Gallery theme="dark" />
    </main>
  );
}

// Page-only layout styles for the showcase (not part of the library).
const DEV_UI_CSS = `
.dev-ui { padding-top: 5.5rem; }
.dev-ui__header { width: min(100% - 2rem, 72rem); margin: 0 auto; padding: 2rem 0 1rem; }
.dev-ui__header h1 { margin: 0.5rem 0; font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 400; }
.dev-ui__theme { padding: 3rem 0 4rem; border-top: 1px solid var(--ablux-line); }
.dev-ui__inner { width: min(100% - 2rem, 72rem); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 3rem; }
.dev-ui__block { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.25rem; }
.dev-ui__block-title { margin: 0; padding-bottom: 0.5rem; border-bottom: 1px solid var(--ablux-line); font-family: var(--ablux-sans); font-size: 1.125rem; font-weight: 800; }
.dev-ui__note { margin: 0; color: var(--ablux-text-muted); font-size: 0.875rem; }
.dev-ui__row-wrap { display: grid; gap: 0.6rem; }
.dev-ui__row-label { margin: 0; color: var(--ablux-text-muted); font-size: 0.8125rem; font-weight: 700; }
.dev-ui__row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1rem; }
.dev-ui__grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); align-items: start; }
.dev-ui__stack { display: grid; gap: 1.5rem; }
.dev-ui__stack-sm { display: grid; gap: 0.75rem; }
.dev-ui__ink-panel { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.5rem; border-radius: var(--ablux-radius-card); }
.dev-ui__ink-panel--block { display: block; padding: 2rem; }
.dev-ui__postcards { display: grid; gap: 2.5rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); align-items: start; padding: 1rem 0.5rem; }
.dev-ui__type { display: grid; gap: 0.75rem; }
.dev-ui__display { margin: 0; font-family: var(--ablux-editorial); font-size: clamp(3rem, 5.55vw, 5.5rem); font-weight: 400; line-height: 1.1; padding-block: 0.12em; }
.dev-ui__display em { color: var(--ablux-accent-text); font-weight: 500; }
.dev-ui__specimen { margin: 0; font-family: var(--ablux-editorial); font-size: clamp(1.75rem, 3.4vw, 2.75rem); line-height: 1.1; padding-block: 0.08em; }
.dev-ui__specimen-tag { display: inline-block; min-width: 3rem; margin-right: 0.75rem; color: var(--ablux-text-muted); font-family: var(--ablux-sans); font-size: 0.75rem; font-weight: 700; vertical-align: middle; }
.dev-ui__sans { margin: 0; font-size: 1rem; line-height: 1.6; }
.dev-ui__p { margin: 0; line-height: 1.6; }
.dev-ui__reveal { font-family: var(--ablux-editorial); font-size: 2rem; }
.dev-ui__price-note { max-width: 18rem; }
.dev-ui__table-price { justify-items: end; }
.dev-ui__search-panel { max-width: 36rem; padding: 1.5rem; border: 1px solid var(--ablux-line-soft); border-radius: var(--ablux-radius-sheet); background: var(--ablux-surface); }
`;
