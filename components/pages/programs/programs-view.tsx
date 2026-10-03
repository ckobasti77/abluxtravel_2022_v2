"use client";

import { ArrowRight, Bus, CalendarDays, Car, Clock3, MapPin, PenLine, Plane, Route, TrainFront, UserRound } from "lucide-react";
import Link from "next/link";
import { durationText, formatShortDate, serbianPlural, type Language } from "../../../lib/catalog/format";
import { useSession } from "../../../lib/use-session";
import { useSitePreferences } from "../../site-preferences-provider";
import { Badge, ButtonLink, EmptyState, SectionHeading, TicketCard, useReveal, type TicketMetaItem } from "../../ui";
import { PageHero } from "../page-hero";
import { STATUS_LABELS, TRANSPORT_LABELS, currencyCode, effectiveTripStatus, tripCover, tripDates, type TripListItem, type TripTransport } from "./program-utils";

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    crumbHome: "Početna",
    crumbHere: "Aranžmani",
    overline: "ABLux aranžmani",
    title: "Naši programi,",
    titleEm: "od polaska do povratka",
    intro:
      "Putovanja koja ABLux Travel organizuje: termini, trajanje, grad polaska i cena na jednom mestu. Mesto rezervišete online i plaćate IPS QR kodom, a za grupe pošaljite upit.",
    heroPrograms: "Pogledaj programe",
    heroPartners: "Ponude partnera",
    facts: (n: number) => `${n} ${serbianPlural(n, "aktuelni program", "aktuelna programa", "aktuelnih programa")}`,
    listOverline: "Aranžmani",
    listTitle: "Aktuelni",
    listTitleEm: "programi",
    listIntro: "Izaberite program za detalje: plan puta po danima, smeštaj, destinacije u paketu i rezervaciju.",
    edit: "Uredi aranžmane",
    view: "Pogledaj program",
    destinations: (n: number) => `${n} ${serbianPlural(n, "destinacija", "destinacije", "destinacija")}`,
    featured: "Izdvajamo",
    stampDeparture: "Polazak",
    emptyTitle: "Novi programi su u pripremi",
    emptyBody:
      "Trenutno nema objavljenih ABLux aranžmana. Pogledajte hodočašća i ponude partnerskih agencija ili nam pošaljite upit, pa ćemo Vam javiti kada se otvori program koji Vas zanima.",
    religious: "Verski turizam",
    allOffers: "Sve ponude",
    contact: "Kontakt",
    pastTitle: "Završeni programi",
    pastIntro: "Programi koje smo već realizovali; stranice ostaju dostupne radi pregleda.",
    moreTitle: "Tražite nešto drugo?",
    moreBody: "Pored naših programa, u katalogu su i ponude partnerskih agencija, sa organizatorom navedenim na svakoj ponudi.",
  },
  en: {
    crumbHome: "Home",
    crumbHere: "Packages",
    overline: "ABLux packages",
    title: "Our programs,",
    titleEm: "from departure to return",
    intro:
      "Trips organized by ABLux Travel: dates, duration, departure city, and price in one place. Book a seat online and pay with an IPS QR code, or send an inquiry for groups.",
    heroPrograms: "View programs",
    heroPartners: "Partner offers",
    facts: (n: number) => (n === 1 ? "1 current program" : `${n} current programs`),
    listOverline: "Packages",
    listTitle: "Current",
    listTitleEm: "programs",
    listIntro: "Choose a program for details: the day-by-day plan, accommodation, destinations in the package, and booking.",
    edit: "Edit packages",
    view: "View program",
    destinations: (n: number) => (n === 1 ? "1 destination" : `${n} destinations`),
    featured: "Featured",
    stampDeparture: "Departure",
    emptyTitle: "New programs are being prepared",
    emptyBody:
      "No ABLux packages are published right now. Look at pilgrimages and partner offers, or send us an inquiry and we will let you know when a program you are interested in opens.",
    religious: "Religious tourism",
    allOffers: "All offers",
    contact: "Contact",
    pastTitle: "Completed programs",
    pastIntro: "Programs we have already run; their pages stay available for reference.",
    moreTitle: "Looking for something else?",
    moreBody: "Besides our programs, the catalog lists offers from partner agencies, with the organizer named on every offer.",
  },
};

function TransportIcon({ transport }: { transport: TripTransport }) {
  if (transport === "plane") return <Plane {...ICON} />;
  if (transport === "train") return <TrainFront {...ICON} />;
  if (transport === "car") return <Car {...ICON} />;
  if (transport === "self") return <UserRound {...ICON} />;
  return <Bus {...ICON} />;
}

type ProgramsViewProps = {
  current: TripListItem[];
  past: TripListItem[];
  heroImage: { desktop: string | null; mobile: string | null };
};

export function ProgramsView({ current, past, heroImage }: ProgramsViewProps) {
  const { language } = useSitePreferences();
  const copy = COPY[language];
  const session = useSession();
  const listRef = useReveal<HTMLUListElement>({ selector: ":scope > li", y: 28, stagger: 0.07 });

  return (
    <main id="main-content" className="pg prg">
      <PageHero
        crumbs={[{ href: "/", label: copy.crumbHome }, { label: copy.crumbHere }]}
        overline={copy.overline}
        title={
          <>
            {copy.title} <em>{copy.titleEm}</em>
          </>
        }
        intro={copy.intro}
        image={heroImage.desktop ? { src: heroImage.desktop, mobileSrc: heroImage.mobile ?? undefined } : null}
        actions={
          <>
            <ButtonLink href="#programi" icon={<ArrowRight {...ICON} />}>
              {copy.heroPrograms}
            </ButtonLink>
            <ButtonLink href="/ponude" variant="ghost-on-ink" icon={<ArrowRight {...ICON} />} prefetch={false}>
              {copy.heroPartners}
            </ButtonLink>
          </>
        }
      >
        {current.length > 0 ? (
          <ul className="pg-hero__facts">
            <li>
              <strong>{copy.facts(current.length)}</strong>
            </li>
          </ul>
        ) : null}
      </PageHero>

      <section className="pg-section" id="programi" aria-labelledby="prg-list-title">
        <div className="prg-head">
          <SectionHeading
            id="prg-list-title"
            overline={copy.listOverline}
            ornament="compass"
            title={
              <>
                {copy.listTitle} <em>{copy.listTitleEm}</em>
              </>
            }
            intro={copy.listIntro}
          />
          {session?.isStaff ? (
            <ButtonLink href="/admin/aranzmani" variant="secondary" size="sm" iconStart={<PenLine {...ICON} />} className="prg-head__staff">
              {copy.edit}
            </ButtonLink>
          ) : null}
        </div>

        {current.length > 0 ? (
          <ul className="prg-list" role="list" ref={listRef}>
            {current.map((trip) => (
              <li key={trip._id}>
                <ProgramTicket trip={trip} language={language} copy={copy} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="prg-empty"
            glyph="compass"
            title={copy.emptyTitle}
            body={copy.emptyBody}
            suggestions={
              <>
                <ButtonLink href="/verski-turizam" variant="secondary" size="sm">
                  {copy.religious}
                </ButtonLink>
                <ButtonLink href="/ponude" variant="secondary" size="sm" prefetch={false}>
                  {copy.allOffers}
                </ButtonLink>
                <ButtonLink href="/kontakt" variant="text" size="sm" icon={<ArrowRight {...ICON} />}>
                  {copy.contact}
                </ButtonLink>
              </>
            }
          />
        )}
      </section>

      {past.length > 0 ? (
        <section className="pg-section pg-section--tight" aria-labelledby="prg-past-title">
          <SectionHeading id="prg-past-title" title={copy.pastTitle} intro={copy.pastIntro} size="sm" />
          <ul className="prg-past" role="list">
            {past.map((trip) => (
              <li key={trip._id}>
                <Link href={`/aranzmani/${trip.slug}`} className="prg-past__link">
                  <span className="prg-past__title">{trip.title}</span>
                  <span className="prg-past__meta">{[tripDates(trip, language), trip.departureCity].filter(Boolean).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pg-section" aria-labelledby="prg-more-title">
        <div className="pg-panel ui-paper prg-more">
          <div>
            <h2 className="prg-more__title" id="prg-more-title">
              {copy.moreTitle}
            </h2>
            <p className="prg-more__body">{copy.moreBody}</p>
          </div>
          <div className="prg-more__actions">
            <ButtonLink href="/ponude" variant="ink" icon={<ArrowRight {...ICON} />} prefetch={false}>
              {copy.allOffers}
            </ButtonLink>
            <ButtonLink href="/verski-turizam" variant="secondary">
              {copy.religious}
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProgramTicket({ trip, language, copy }: { trip: TripListItem; language: Language; copy: (typeof COPY)["sr"] }) {
  const cover = tripCover(trip);
  const status = effectiveTripStatus(trip);
  const dates = tripDates(trip, language);
  const duration = durationText({ days: trip.days, nights: trip.nights }, language);
  const meta: TicketMetaItem[] = [];
  if (dates) meta.push({ icon: <CalendarDays {...ICON} />, label: dates });
  if (duration) meta.push({ icon: <Clock3 {...ICON} />, label: duration });
  if (trip.departureCity) meta.push({ icon: <MapPin {...ICON} />, label: trip.departureCity });
  meta.push({ icon: <TransportIcon transport={trip.transport} />, label: TRANSPORT_LABELS[language][trip.transport] });
  if (trip.destinationCount) meta.push({ icon: <Route {...ICON} />, label: copy.destinations(trip.destinationCount) });

  // Trip price first; a program without its own price starts from its cheapest destination.
  const amount = trip.price > 0 ? trip.price : (trip.lowestDestinationPrice ?? null);
  const currency = trip.price > 0 ? trip.currency : (trip.lowestDestinationCurrency ?? trip.currency);

  return (
    <TicketCard
      href={`/aranzmani/${trip.slug}`}
      title={trip.title}
      overline={copy.overline}
      badges={
        <>
          <Badge tone={status === "active" ? "route" : status === "upcoming" ? "info" : "neutral"}>{STATUS_LABELS[language][status]}</Badge>
          {trip.featured ? <Badge tone="gold">{copy.featured}</Badge> : null}
        </>
      }
      meta={meta}
      image={cover ? { src: cover, alt: trip.title } : null}
      glyph="compass"
      tone="teal-deep"
      price={{ amount, basis: "perPerson", currency: currencyCode(currency) }}
      stamp={trip.departureDate ? { eyebrow: copy.stampDeparture, code: formatShortDate(trip.departureDate, language), detail: trip.departureDate.slice(0, 4) } : undefined}
      action={
        <ButtonLink href={`/aranzmani/${trip.slug}`} variant="secondary" size="sm" icon={<ArrowRight {...ICON} />}>
          {copy.view}
        </ButtonLink>
      }
      language={language}
      headingLevel="h3"
    />
  );
}
