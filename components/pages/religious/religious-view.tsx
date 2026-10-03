"use client";

import { ArrowRight, CalendarDays, FileText, MapPin, PenLine, Send, Users } from "lucide-react";
import { useState } from "react";
import { formatDate, type Language } from "../../../lib/catalog/format";
import type { HeroScene } from "../../../lib/home/hero-manifest";
import { toCurrencyCode } from "../../../lib/format-money";
import { useMediaQuery } from "../../../lib/use-media-query";
import { useSession } from "../../../lib/use-session";
import AddToCartButton from "../../add-to-cart-button";
import { InquiryForm, type InquiryDeparture } from "../../catalog/inquiry-form";
import { OfferTicket, type CatalogCard } from "../../catalog/offer-ticket";
import { SceneMedia } from "../../home/scene-media";
import PageAdminEditorDock from "../../page-admin-editor-dock";
import { useSitePreferences } from "../../site-preferences-provider";
import {
  Badge,
  Button,
  ButtonAnchor,
  ButtonLink,
  ChurchGlyph,
  CrossGlyph,
  Dialog,
  EmptyState,
  Postcard,
  Price,
  SectionHeading,
  Sheet,
  useReveal,
} from "../../ui";
import { PageHero } from "../page-hero";
import { DeparturesCalendar, type CalendarMonth } from "./departures-calendar";

export type { CalendarEntry, CalendarMonth } from "./departures-calendar";

/** ABLux pilgrimage from the offers table (source manual-verski). */
export type ReligiousProgram = {
  id: string;
  title: string;
  destination: string;
  departureCity?: string;
  departureDate?: string;
  returnDate?: string;
  price: number;
  currency: string;
  seatsLeft?: number;
  pdfUrl?: string;
  imageUrl?: string;
};

type ReligiousViewProps = {
  scene: HeroScene;
  programs: ReligiousProgram[];
  abluxTrips: CatalogCard[];
  partnerOffers: CatalogCard[];
  calendar: CalendarMonth[];
};

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;
const MONASTERY_PHOTO = "/home-swiper/IMG-20240104-WA0011.avif";

const COPY = {
  sr: {
    crumbHome: "Početna",
    crumbHere: "Verski turizam",
    overline: "Verski turizam",
    title: "Hodočašća vođena",
    titleEm: "s pažnjom",
    intro:
      "Manastiri Srbije i Crne Gore, Ostrog i Sveta zemlja, u ritmu koji ostavlja vremena za molitvu, odmor i razgovor. Prvo naši programi, zatim proverene ponude partnerskih agencija.",
    heroPrograms: "Pogledaj programe",
    heroInquiry: "Pošalji upit",
    programsOverline: "ABLux hodočašća",
    programsTitle: "Naši",
    programsTitleEm: "programi",
    programsIntro:
      "Programe organizujemo sami: mesto rezervišete online i plaćate preko IPS QR koda, a za grupe i posebne termine pošaljite upit.",
    editOffers: "Uredi ponude",
    programsEmptyTitle: "Trenutno nema najavljenih ABLux hodočašća",
    programsEmptyBody:
      "Novi termini se objavljuju čim su potvrđeni. Do tada pogledajte verske ponude partnerskih agencija ili nam pošaljite upit, a mi ćemo Vam javiti kada se otvori polazak koji Vas zanima.",
    seeAllReligious: "Sve verske ponude",
    contactUs: "Kontakt",
    abluxProgram: "ABLux program",
    dateOnRequest: "Termin na upit",
    from: "Polazak iz",
    seats: "Slobodnih mesta",
    pdf: "Program (PDF)",
    sendInquiry: "Pošalji upit",
    partnersOverline: "Partnerske agencije",
    partnersTitle: "Ponude",
    partnersTitleEm: "partnera",
    partnersIntro:
      "Verski programi agencija sa kojima sarađujemo. Na svakoj ponudi je naveden organizator; upit šaljete preko nas, a mi proveravamo raspoloživost.",
    partnersLink: "Sve verske ponude",
    partnersEmptyTitle: "Partnerske verske ponude trenutno nisu objavljene",
    partnersEmptyBody:
      "Ponude partnera osvežavamo svakog jutra. Pogledajte ceo katalog ili nam pišite, pa ćemo proveriti termine kod partnerskih agencija.",
    calendarOverline: "Narednih 12 meseci",
    calendarTitle: "Kalendar",
    calendarTitleEm: "polazaka",
    calendarIntro:
      "Svi poznati polasci na jednom mestu: naši programi i ponude partnera, po mesecima. Programi sa terminom na upit nisu u kalendaru.",
    storyOverline: "Kako putujemo",
    storyTitle: "Put koji ostavlja",
    storyTitleEm: "vremena",
    storyBody: [
      "Hodočašće nije obilazak na brzinu. Program pravimo tako da u manastiru bude vremena za službu, molitvu i tišinu, a da put između svetinja ne zamara.",
      "Prevoz i vođenje grupe su naša briga na celom putu, od polaska do povratka. Pre puta dobijate program, a sva pitanja možete postaviti nama.",
      "Putujemo sa parohijskim grupama, porodicama i pojedincima. Za grupe pravimo program po dogovoru.",
    ],
    storyCta: "Pošalji upit za grupu",
    photoCaption: "Sa naših putovanja · fotografija bez obrade",
    photoAlt: "Manastirska crkva od kamena i travnato dvorište, fotografija sa ABLux putovanja",
    inquiryTitle: "Pošaljite upit",
    inquiryIntro: "Popunite podatke i javićemo Vam se sa terminima i detaljima programa.",
    generalSubject: "Verski turizam: opšti upit",
    groupSubject: "Verski turizam: upit za grupu",
    close: "Zatvori",
  },
  en: {
    crumbHome: "Home",
    crumbHere: "Religious tourism",
    overline: "Religious tourism",
    title: "Pilgrimages led",
    titleEm: "with care",
    intro:
      "The monasteries of Serbia and Montenegro, Ostrog, and the Holy Land, at a pace that leaves time for prayer, rest, and conversation. Our own programs first, then selected offers from partner agencies.",
    heroPrograms: "View programs",
    heroInquiry: "Send inquiry",
    programsOverline: "ABLux pilgrimages",
    programsTitle: "Our",
    programsTitleEm: "programs",
    programsIntro:
      "We organize these programs ourselves: book a seat online and pay with an IPS QR code, or send an inquiry for groups and special dates.",
    editOffers: "Edit offers",
    programsEmptyTitle: "No ABLux pilgrimages are announced right now",
    programsEmptyBody:
      "New dates are published as soon as they are confirmed. Meanwhile, look at partner offers or send us an inquiry and we will let you know when a departure you are interested in opens.",
    seeAllReligious: "All religious offers",
    contactUs: "Contact",
    abluxProgram: "ABLux program",
    dateOnRequest: "Date on request",
    from: "Departs from",
    seats: "Seats left",
    pdf: "Program (PDF)",
    sendInquiry: "Send inquiry",
    partnersOverline: "Partner agencies",
    partnersTitle: "Partner",
    partnersTitleEm: "offers",
    partnersIntro:
      "Religious programs by the agencies we work with. Each offer names its organizer; you send the inquiry through us and we check availability.",
    partnersLink: "All religious offers",
    partnersEmptyTitle: "No partner religious offers are published right now",
    partnersEmptyBody:
      "Partner offers are refreshed every morning. Browse the full catalog or write to us and we will check dates with our partner agencies.",
    calendarOverline: "Next 12 months",
    calendarTitle: "Departure",
    calendarTitleEm: "calendar",
    calendarIntro:
      "All known departures in one place, month by month: our programs and partner offers. Programs with dates on request are not listed here.",
    storyOverline: "How we travel",
    storyTitle: "A journey that leaves",
    storyTitleEm: "time",
    storyBody: [
      "A pilgrimage is not a rushed tour. We plan each program so there is time for the service, prayer, and silence at the monastery, and so the road between holy sites is not tiring.",
      "Transport and group guidance are our concern for the whole journey, from departure to return. You receive the program before the trip and can ask us anything.",
      "We travel with parish groups, families, and individual travelers. For groups we plan the program by arrangement.",
    ],
    storyCta: "Send a group inquiry",
    photoCaption: "From our trips · unedited photograph",
    photoAlt: "Stone monastery church and grass courtyard, photograph from an ABLux trip",
    inquiryTitle: "Send an inquiry",
    inquiryIntro: "Fill in your details and we will get back to you with dates and program details.",
    generalSubject: "Verski turizam: opšti upit",
    groupSubject: "Verski turizam: upit za grupu",
    close: "Close",
  },
};

export type ReligiousCopy = (typeof COPY)["sr"];

type InquiryTarget = { subject: string; offerTitle?: string; departures: InquiryDeparture[] };

function programDates(program: ReligiousProgram, language: Language): string {
  const start = formatDate(program.departureDate, language);
  const end = formatDate(program.returnDate, language);
  if (start && end && end !== start) return `${start} – ${end}`;
  return start || program.departureDate || "";
}

export function ReligiousView({ scene, programs, abluxTrips, partnerOffers, calendar }: ReligiousViewProps) {
  const { dictionary, language } = useSitePreferences();
  const copy = COPY[language];
  const session = useSession();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [inquiry, setInquiry] = useState<InquiryTarget | null>(null);

  const programsRef = useReveal<HTMLUListElement>({ selector: ":scope > li", y: 28, stagger: 0.07 });
  const partnersRef = useReveal<HTMLUListElement>({ selector: ":scope > li", y: 28, stagger: 0.06 });
  const storyRef = useReveal<HTMLDivElement>({ selector: ".rel-story__card, .rel-story__copy > *", y: 26, stagger: 0.07 });

  const openGeneral = (subject = copy.generalSubject) => setInquiry({ subject, departures: [] });
  const openProgram = (program: ReligiousProgram) => {
    const dates = programDates(program, "sr");
    setInquiry({
      subject: `Verski turizam: ${program.title}`.slice(0, 160),
      offerTitle: program.title,
      departures: dates ? [{ value: dates, label: programDates(program, language) }] : [],
    });
  };

  const InquiryContainer = isDesktop ? Dialog : Sheet;
  const hasAblux = programs.length > 0 || abluxTrips.length > 0;

  return (
    <main id="main-content" className="pg rel">
      <PageHero
        size="lg"
        crumbs={[{ href: "/", label: copy.crumbHome }, { label: copy.crumbHere }]}
        overline={copy.overline}
        title={
          <>
            {copy.title} <em>{copy.titleEm}</em>
          </>
        }
        intro={copy.intro}
        media={
          <>
            <SceneMedia scene={scene} shape="wide" className="rel-hero-media rel-hero-media--wide" />
            <SceneMedia scene={scene} shape="tall" className="rel-hero-media rel-hero-media--tall" />
          </>
        }
        actions={
          <>
            <ButtonLink href="#programi" icon={<ArrowRight {...ICON} />}>
              {copy.heroPrograms}
            </ButtonLink>
            <Button variant="ghost-on-ink" icon={<Send {...ICON} />} onClick={() => openGeneral()} aria-haspopup="dialog">
              {copy.heroInquiry}
            </Button>
          </>
        }
      />

      <section className="pg-section rel-programs" id="programi" aria-labelledby="rel-programs-title">
        <div className="rel-head">
          <SectionHeading
            id="rel-programs-title"
            overline={copy.programsOverline}
            ornament="cross"
            title={
              <>
                {copy.programsTitle} <em>{copy.programsTitleEm}</em>
              </>
            }
            intro={copy.programsIntro}
          />
          {session?.isStaff ? (
            <ButtonLink href="/admin/verski-turizam" variant="secondary" size="sm" iconStart={<PenLine {...ICON} />} className="rel-head__staff">
              {copy.editOffers}
            </ButtonLink>
          ) : null}
        </div>

        {hasAblux ? (
          <ul className="rel-programs__list" role="list" ref={programsRef}>
            {programs.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} copy={copy} language={language} onInquire={() => openProgram(program)} />
              </li>
            ))}
            {abluxTrips.map((card) => (
              <li key={card.id}>
                <OfferTicket card={card} language={language} copy={dictionary.catalog} layout="row" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="rel-empty"
            glyph="church"
            title={copy.programsEmptyTitle}
            body={copy.programsEmptyBody}
            suggestions={
              <>
                <ButtonLink href="/ponude?tip=verski-turizam" variant="secondary" size="sm" prefetch={false}>
                  {copy.seeAllReligious}
                </ButtonLink>
                <ButtonLink href="/kontakt" variant="text" size="sm" icon={<ArrowRight {...ICON} />}>
                  {copy.contactUs}
                </ButtonLink>
              </>
            }
          />
        )}
      </section>

      <section className="pg-section rel-partners" aria-labelledby="rel-partners-title">
        <SectionHeading
          id="rel-partners-title"
          overline={copy.partnersOverline}
          title={
            <>
              {copy.partnersTitle} <em>{copy.partnersTitleEm}</em>
            </>
          }
          intro={copy.partnersIntro}
          link={{ href: "/ponude?tip=verski-turizam", label: copy.partnersLink }}
        />
        {partnerOffers.length > 0 ? (
          <ul className="cat-grid rel-partners__grid" role="list" ref={partnersRef}>
            {partnerOffers.map((card) => (
              <li key={card.id}>
                <OfferTicket card={card} language={language} copy={dictionary.catalog} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="rel-empty"
            glyph="compass"
            title={copy.partnersEmptyTitle}
            body={copy.partnersEmptyBody}
            suggestions={
              <>
                <ButtonLink href="/ponude" variant="secondary" size="sm" prefetch={false}>
                  {dictionary.catalog.allOffers}
                </ButtonLink>
                <ButtonLink href="/kontakt" variant="text" size="sm" icon={<ArrowRight {...ICON} />}>
                  {copy.contactUs}
                </ButtonLink>
              </>
            }
          />
        )}
      </section>

      <section className="pg-section rel-calendar-section" aria-labelledby="rel-calendar-title">
        <SectionHeading
          id="rel-calendar-title"
          overline={copy.calendarOverline}
          title={
            <>
              {copy.calendarTitle} <em>{copy.calendarTitleEm}</em>
            </>
          }
          intro={copy.calendarIntro}
        />
        <DeparturesCalendar months={calendar} language={language} />
      </section>

      <section className="pg-section rel-story" aria-labelledby="rel-story-title">
        <div className="pg-split rel-story__inner" ref={storyRef}>
          <div className="rel-story__card">
            <Postcard
              image={{ src: MONASTERY_PHOTO, alt: copy.photoAlt }}
              caption={copy.photoCaption}
              stampGlyph="church"
              tilt="left"
            />
          </div>
          <div className="rel-story__copy">
            <SectionHeading
              id="rel-story-title"
              overline={copy.storyOverline}
              ornament="cross"
              title={
                <>
                  {copy.storyTitle} <em>{copy.storyTitleEm}</em>
                </>
              }
            />
            <div className="pg-prose rel-story__prose">
              {copy.storyBody.map((paragraph) => (
                <p key={paragraph}>
                  <CrossGlyph aria-hidden="true" className="rel-story__mark" />
                  <span>{paragraph}</span>
                </p>
              ))}
            </div>
            <Button variant="ink" icon={<Send {...ICON} />} onClick={() => openGeneral(copy.groupSubject)} aria-haspopup="dialog">
              {copy.storyCta}
            </Button>
          </div>
        </div>
      </section>

      <PageAdminEditorDock slot="religious" className="pg-section rel-dock" />

      <InquiryContainer
        open={inquiry !== null}
        onClose={() => setInquiry(null)}
        title={copy.inquiryTitle}
        description={copy.inquiryIntro}
        closeLabel={copy.close}
        dismissible={false}
        className="inq-dialog"
      >
        {inquiry ? (
          <InquiryForm
            key={inquiry.subject}
            subject={inquiry.subject}
            offerTitle={inquiry.offerTitle}
            departures={inquiry.departures}
            initialDeparture={inquiry.departures[0]?.value}
            copy={dictionary.catalog}
            language={language}
          />
        ) : null}
      </InquiryContainer>
    </main>
  );
}

function ProgramCard({
  program,
  copy,
  language,
  onInquire,
}: {
  program: ReligiousProgram;
  copy: ReligiousCopy;
  language: Language;
  onInquire: () => void;
}) {
  const dates = programDates(program, language);
  const currency = toCurrencyCode(program.currency) ?? program.currency;
  const showImage = program.imageUrl && (program.imageUrl.startsWith("https://") || program.imageUrl.startsWith("/"));

  return (
    <article className="ui-ticket ui-ticket--brick rel-program" id={`program-${program.id}`} aria-labelledby={`program-${program.id}-title`}>
      <div className="ui-ticket__paper ui-paper">
        <div className="ui-ticket__stub">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- Convex storage image (no optimizer quota)
            <img src={program.imageUrl} alt={program.title} loading="lazy" decoding="async" width={480} height={360} />
          ) : (
            <span className="ui-ticket__glyph" aria-hidden="true">
              <ChurchGlyph />
            </span>
          )}
        </div>
        <div className="ui-ticket__body">
          <div className="ui-ticket__badges">
            <Badge tone="gold">{copy.abluxProgram}</Badge>
          </div>
          {program.destination ? <p className="ui-overline ui-ticket__overline">{program.destination}</p> : null}
          <h3 className="ui-ticket__title" id={`program-${program.id}-title`}>
            {program.title}
          </h3>
          <ul className="ui-ticket__meta">
            <li>
              <CalendarDays {...ICON} />
              <span>{dates || copy.dateOnRequest}</span>
            </li>
            {program.departureCity ? (
              <li>
                <MapPin {...ICON} />
                <span>
                  {copy.from}: {program.departureCity}
                </span>
              </li>
            ) : null}
            {typeof program.seatsLeft === "number" ? (
              <li>
                <Users {...ICON} />
                <span>
                  {copy.seats}: {program.seatsLeft}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
        <div className="ui-ticket__side rel-program__side">
          <Price amount={program.price} currency={currency} basis="perPerson" language={language} />
          <div className="ui-ticket__actions rel-program__actions">
            <span className="rel-cart">
              <AddToCartButton
                id={program.id}
                type="offer"
                title={program.title}
                price={program.price}
                currency={program.currency}
                imageUrl={program.imageUrl}
                meta={{ destination: program.destination, departureCity: program.departureCity ?? "" }}
              />
            </span>
            <Button variant="secondary" size="sm" icon={<Send {...ICON} />} onClick={onInquire} aria-haspopup="dialog">
              {copy.sendInquiry}
            </Button>
            {program.pdfUrl ? (
              <ButtonAnchor href={program.pdfUrl} target="_blank" rel="noopener noreferrer" variant="text" size="sm" iconStart={<FileText {...ICON} />}>
                {copy.pdf}
              </ButtonAnchor>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
