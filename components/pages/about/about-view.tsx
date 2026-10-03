"use client";

import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  HandHeart,
  MapPin,
  MessagesSquare,
  Route,
  Send,
  Map as MapIcon,
  Luggage,
} from "lucide-react";
import Link from "next/link";
import { agencyCountLabel } from "../../../lib/i18n-home";
import { PartnerStrip, type PartnerStripData } from "../../home/home-sections";
import PageAdminEditorDock from "../../page-admin-editor-dock";
import { useSitePreferences } from "../../site-preferences-provider";
import {
  BRAND_GLYPHS,
  BrassPlate,
  ButtonLink,
  CompassGlyph,
  RouteLine,
  SectionHeading,
  Stamp,
  useReveal,
  type BrandGlyphName,
} from "../../ui";
import { PageHero } from "../page-hero";

export type AboutPageData = {
  heroImage: { src: string; mobileSrc?: string } | null;
  /** From Convex settings; null when not set (the line is then omitted). */
  licenseNumber: string | null;
  partners: PartnerStripData | null;
};

const ICON = { strokeWidth: 1.5, "aria-hidden": true } as const;

type Copy = {
  crumbsHome: string;
  crumbsSelf: string;
  heroOverline: string;
  heroTitleA: string;
  heroTitleEm: string;
  heroIntro: string;
  heroFacts: string[];
  ctaOffers: string;
  ctaInquiry: string;
  storyOverline: string;
  storyTitleA: string;
  storyTitleEm: string;
  storyParagraphs: string[];
  recordTitle: string;
  recordRows: Array<{ label: string; value: string }>;
  recordLicense: string;
  workOverline: string;
  workTitleA: string;
  workTitleEm: string;
  workMore: string;
  work: Array<{ glyph: BrandGlyphName; title: string; body: (partners: string) => string; href: string }>;
  partnersFallback: string;
  valuesOverline: string;
  valuesTitleA: string;
  valuesTitleEm: string;
  values: Array<{ title: string; body: string }>;
  processOverline: string;
  processTitleA: string;
  processTitleEm: string;
  stepLabel: string;
  stepOf: string;
  process: Array<{ title: string; body: string }>;
  teamOverline: string;
  teamTitleA: string;
  teamTitleEm: string;
  teamIntro: string;
  photoSoon: string;
  team: Array<{ role: string; body: string }>;
  closingPlace: string;
  closingTitle: string;
  closingBody: string;
};

const COPY: Record<"sr" | "en", Copy> = {
  sr: {
    crumbsHome: "Početna",
    crumbsSelf: "O nama",
    heroOverline: "O nama",
    heroTitleA: "Agencija koja putuje ",
    heroTitleEm: "s merom",
    heroIntro:
      "ABLux Travel je turistička agencija iz Beograda, osnovana 2022. Verski turizam je srž našeg rada, uz ture po Evropi, ponude partnerskih agencija i prevoz sopstvenim vozilima.",
    heroFacts: ["Beograd", "od 2022.", "Verski turizam", "Sopstvena vozila"],
    ctaOffers: "Pogledaj ponude",
    ctaInquiry: "Pošalji upit",
    storyOverline: "Ko smo",
    storyTitleA: "Putovanja sa jasnim ",
    storyTitleEm: "potpisom",
    storyParagraphs: [
      "ABLux Travel je osnovan 2022. godine u Beogradu sa jasnom namerom: da putnicima ponudi pažljivo osmišljena i pouzdana putovanja, sa uslovima koji su poznati unapred.",
      "Od početka je verski turizam srž našeg rada. Sopstvene programe hodočašća i obilazaka manastira planiramo smirenim tempom, sa jasnim planom svakog dana.",
      "Uz to organizujemo ture po Evropi, kao subagent nudimo programe partnerskih agencija i vozimo grupe sopstvenim vozilima: Setra autobusom i luksuznim kombijem Mercedes Sprinter.",
    ],
    recordTitle: "Putni list agencije",
    recordRows: [
      { label: "Naziv", value: "ABLux Travel" },
      { label: "Sedište", value: "Beograd, Srbija" },
      { label: "Osnovana", value: "2022." },
      { label: "Specijalnost", value: "Verski turizam" },
      { label: "Vozila", value: "Setra autobus, Mercedes Sprinter" },
    ],
    recordLicense: "Licenca OTP",
    workOverline: "Čime se bavimo",
    workTitleA: "Četiri načina da ",
    workTitleEm: "krenete",
    workMore: "Saznajte više",
    work: [
      {
        glyph: "cross",
        title: "Verski turizam",
        body: () => "Sopstveni programi hodočašća i obilazaka svetinja, sa smirenim tempom i jasnim planom dana.",
        href: "/verski-turizam",
      },
      {
        glyph: "city",
        title: "Ture po Evropi",
        body: () => "Sopstveni programi putovanja po evropskim gradovima, sa poznatim terminima, cenom i uslovima.",
        href: "/aranzmani",
      },
      {
        glyph: "compass",
        title: "Ponude partnera",
        body: (partners) =>
          `Programi ${partners} na jednom mestu. Organizator putovanja je uvek naveden, a upit i rezervaciju vodi ABLux.`,
        href: "/ponude?vrsta=partner",
      },
      {
        glyph: "coach",
        title: "Prevoz sopstvenim vozilima",
        body: () => "Setra autobus i Mercedes Sprinter luksuzni kombi za grupe, transfere i posebne rute, uvek sa vozačem.",
        href: "/iznajmljivanje-vozila",
      },
    ],
    partnersFallback: "partnerskih agencija",
    valuesOverline: "Vrednosti",
    valuesTitleA: "Šta možete da ",
    valuesTitleEm: "očekujete",
    values: [
      {
        title: "Jasni uslovi",
        body: "Cena, njena osnova, termini i uslovi plaćanja poznati su pre nego što potvrdite mesto.",
      },
      {
        title: "Proveren tempo",
        body: "Program planiramo tako da dan ostane pregledan i realan za grupu, sa vremenom za predah.",
      },
      {
        title: "Organizator uvek naveden",
        body: "Kod svake partnerske ponude piše ko organizuje putovanje, uz vezu ka originalnom programu i opštim uslovima.",
      },
      {
        title: "Podrška tokom puta",
        body: "Isti tim vodi komunikaciju pre polaska, tokom puta i po povratku.",
      },
    ],
    processOverline: "Kako radimo",
    processTitleA: "Od upita do ",
    processTitleEm: "polaska",
    stepLabel: "Korak",
    stepOf: "od",
    process: [
      { title: "Razgovor", body: "Kažete nam termin, vrstu puta, broj putnika i okvirni budžet." },
      { title: "Predlog", body: "Dobijate konkretan program sa rutom, cenom i uslovima." },
      { title: "Potvrda i priprema", body: "Posle potvrde šaljemo sva važna uputstva i plan pre polaska." },
      { title: "Na putu", body: "Tokom putovanja ostajemo dostupni za pitanja i dogovore." },
    ],
    teamOverline: "Tim",
    teamTitleA: "Ljudi iza Vašeg ",
    teamTitleEm: "putovanja",
    teamIntro: "Fotografije tima objavljujemo uskoro. Do tada, ovo su uloge koje putovanje vode od upita do povratka.",
    photoSoon: "Fotografija uskoro",
    team: [
      { role: "Vlasnik", body: "Sopstveni programi, saradnja sa partnerima i odgovornost za svako putovanje." },
      { role: "Menadžer kancelarije", body: "Upiti, rezervacije i dokumenta, od prvog razgovora do polaska." },
      { role: "Vozač", body: "Setra autobus i Mercedes Sprinter, grupni polasci i transferi." },
    ],
    closingPlace: "ABLux Travel, Beograd",
    closingTitle: "Recite nam kuda želite da putujete.",
    closingBody: "Odgovaramo konkretnim predlogom: program, termin, cena i uslovi.",
  },
  en: {
    crumbsHome: "Home",
    crumbsSelf: "About us",
    heroOverline: "About us",
    heroTitleA: "An agency that travels ",
    heroTitleEm: "with care",
    heroIntro:
      "ABLux Travel is a travel agency from Belgrade, founded in 2022. Religious tourism is at the core of our work, alongside European tours, partner agency offers and transport in our own vehicles.",
    heroFacts: ["Belgrade", "since 2022", "Religious tourism", "Own vehicles"],
    ctaOffers: "View offers",
    ctaInquiry: "Send inquiry",
    storyOverline: "Who we are",
    storyTitleA: "Travel with a clear ",
    storyTitleEm: "signature",
    storyParagraphs: [
      "ABLux Travel was founded in Belgrade in 2022 with a clear aim: to offer carefully planned, reliable trips with terms that are known in advance.",
      "Religious tourism has been at the core of our work from the start. We plan our own pilgrimage and monastery programs at a calm pace, with a clear plan for every day.",
      "We also organize European tours, offer partner agency programs as a subagent, and drive groups in our own vehicles: a Setra coach and a Mercedes Sprinter luxury van.",
    ],
    recordTitle: "Agency record",
    recordRows: [
      { label: "Name", value: "ABLux Travel" },
      { label: "Based in", value: "Belgrade, Serbia" },
      { label: "Founded", value: "2022" },
      { label: "Specialty", value: "Religious tourism" },
      { label: "Vehicles", value: "Setra coach, Mercedes Sprinter" },
    ],
    recordLicense: "OTP license",
    workOverline: "What we do",
    workTitleA: "Four ways to ",
    workTitleEm: "set off",
    workMore: "Learn more",
    work: [
      {
        glyph: "cross",
        title: "Religious tourism",
        body: () => "Our own pilgrimage programs and visits to holy sites, at a calm pace with a clear daily plan.",
        href: "/verski-turizam",
      },
      {
        glyph: "city",
        title: "European tours",
        body: () => "Our own programs to European cities, with known dates, price and terms.",
        href: "/aranzmani",
      },
      {
        glyph: "compass",
        title: "Partner offers",
        body: (partners) =>
          `Programs of ${partners} in one place. The tour organizer is always named, and ABLux handles your inquiry and booking.`,
        href: "/ponude?vrsta=partner",
      },
      {
        glyph: "coach",
        title: "Transport in our own vehicles",
        body: () => "A Setra coach and a Mercedes Sprinter luxury van for groups, transfers and special routes, always with a driver.",
        href: "/iznajmljivanje-vozila",
      },
    ],
    partnersFallback: "partner agencies",
    valuesOverline: "Values",
    valuesTitleA: "What you can ",
    valuesTitleEm: "expect",
    values: [
      {
        title: "Clear terms",
        body: "The price, its basis, dates and payment terms are known before you confirm your seat.",
      },
      {
        title: "A tested pace",
        body: "We plan each program so the day stays clear and realistic for the group, with time to rest.",
      },
      {
        title: "Organizer always named",
        body: "Every partner offer states who organizes the trip, with a link to the original program and general terms.",
      },
      {
        title: "Support on the road",
        body: "The same team handles communication before departure, during the trip and after your return.",
      },
    ],
    processOverline: "How we work",
    processTitleA: "From inquiry to ",
    processTitleEm: "departure",
    stepLabel: "Step",
    stepOf: "of",
    process: [
      { title: "Conversation", body: "Tell us the date, type of trip, number of travelers and a rough budget." },
      { title: "Proposal", body: "You receive a concrete program with route, price and terms." },
      { title: "Confirmation", body: "After confirmation we send all key instructions and the plan before departure." },
      { title: "On the road", body: "During the trip we stay available for questions and arrangements." },
    ],
    teamOverline: "Team",
    teamTitleA: "The people behind your ",
    teamTitleEm: "trip",
    teamIntro: "Team photos are coming soon. Until then, these are the roles that guide a trip from inquiry to return.",
    photoSoon: "Photo coming soon",
    team: [
      { role: "Owner", body: "Own programs, partner relations and responsibility for every trip." },
      { role: "Office manager", body: "Inquiries, bookings and travel documents, from the first call to departure." },
      { role: "Driver", body: "Setra coach and Mercedes Sprinter, group departures and transfers." },
    ],
    closingPlace: "ABLux Travel, Belgrade",
    closingTitle: "Tell us where you would like to travel.",
    closingBody: "We reply with a concrete proposal: program, date, price and terms.",
  },
};

const VALUE_ICONS = [ClipboardList, Route, BadgeCheck, HandHeart];
const PROCESS_ICONS = [MessagesSquare, MapIcon, Luggage, HandHeart];

export default function AboutView({ data }: { data: AboutPageData }) {
  const { language } = useSitePreferences();
  const copy = COPY[language];
  const partnerCount = data.partners?.partners.length ?? 0;
  const partnersLabel = partnerCount > 0 ? agencyCountLabel(partnerCount, language) : copy.partnersFallback;

  const storyRef = useReveal<HTMLElement>({ selector: ".abt-story__copy > *, .abt-record", y: 26 });
  const workRef = useReveal<HTMLUListElement>({ selector: ".abt-work__item", y: 26, stagger: 0.06 });
  const valuesRef = useReveal<HTMLOListElement>({ selector: ".abt-value", y: 24, stagger: 0.06 });
  const processRef = useReveal<HTMLOListElement>({ selector: ".abt-step", y: 26 });
  const teamRef = useReveal<HTMLUListElement>({ selector: ".abt-member", y: 26, stagger: 0.08 });
  const closingRef = useReveal<HTMLDivElement>({ selector: ".abt-closing__body > *", y: 22 });

  return (
    <main id="main-content" className="pg abt">
      <PageHero
        size="lg"
        crumbs={[{ href: "/", label: copy.crumbsHome }, { label: copy.crumbsSelf }]}
        overline={copy.heroOverline}
        title={
          <>
            {copy.heroTitleA}
            <em>{copy.heroTitleEm}</em>
          </>
        }
        intro={copy.heroIntro}
        image={data.heroImage ? { ...data.heroImage, position: "62% center" } : null}
        actions={
          <>
            <ButtonLink href="/ponude" variant="primary" icon={<ArrowRight {...ICON} />}>
              {copy.ctaOffers}
            </ButtonLink>
            <ButtonLink href="/kontakt" variant="ghost-on-ink" icon={<Send {...ICON} />}>
              {copy.ctaInquiry}
            </ButtonLink>
          </>
        }
      >
        <ul className="pg-hero__facts">
          {copy.heroFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </PageHero>

      {/* Ko smo: priča + putni list agencije */}
      <section className="pg-section abt-story" aria-labelledby="abt-story-title" ref={storyRef}>
        <div className="abt-story__copy">
          <SectionHeading
            id="abt-story-title"
            overline={copy.storyOverline}
            title={
              <>
                {copy.storyTitleA}
                <em>{copy.storyTitleEm}</em>
              </>
            }
            ornament="compass"
          />
          <div className="pg-prose abt-story__prose">
            {copy.storyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className="abt-record ui-paper" aria-labelledby="abt-record-title">
          <p className="abt-record__title" id="abt-record-title">
            {copy.recordTitle}
          </p>
          <dl className="abt-record__rows">
            {copy.recordRows.map((row) => (
              <div key={row.label} className="abt-record__row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
            {data.licenseNumber ? (
              <div className="abt-record__row">
                <dt>{copy.recordLicense}</dt>
                <dd>{data.licenseNumber}</dd>
              </div>
            ) : null}
          </dl>
          <RouteLine
            className="abt-record__route"
            d="M 20 60 C 120 20, 220 90, 330 50 S 520 20, 580 46"
            viewBox={{ width: 600, height: 100 }}
            pins={[
              { x: 20, y: 60, at: 0 },
              { x: 330, y: 50, at: 0.55 },
            ]}
            animate="enter"
            height="3.5rem"
          />
          <Stamp className="abt-record__stamp" shape="round" tone="teal" eyebrow="ABLux" code="Beograd" detail="2022" decorative />
        </aside>
      </section>

      {/* Čime se bavimo */}
      <section className="pg-section abt-work" aria-labelledby="abt-work-title">
        <SectionHeading
          id="abt-work-title"
          overline={copy.workOverline}
          title={
            <>
              {copy.workTitleA}
              <em>{copy.workTitleEm}</em>
            </>
          }
        />
        <ul className="abt-work__grid" ref={workRef}>
          {copy.work.map((item, index) => {
            const Glyph = BRAND_GLYPHS[item.glyph];
            return (
              <li key={item.href} className="abt-work__item">
                <Link href={item.href} className="abt-work__card ui-paper" prefetch={false}>
                  <span className="abt-work__glyph" aria-hidden="true">
                    <Glyph />
                  </span>
                  <BrassPlate number={index + 1} size="sm" className="abt-work__plate" />
                  <h3 className="abt-work__title">{item.title}</h3>
                  <p className="abt-work__body">{item.body(partnersLabel)}</p>
                  <span className="abt-work__more">
                    {copy.workMore}
                    <ArrowRight {...ICON} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Vrednosti */}
      <section className="pg-section abt-values" aria-labelledby="abt-values-title">
        <SectionHeading
          id="abt-values-title"
          overline={copy.valuesOverline}
          title={
            <>
              {copy.valuesTitleA}
              <em>{copy.valuesTitleEm}</em>
            </>
          }
          ornament="compass"
        />
        <ol className="abt-values__list" ref={valuesRef}>
          {copy.values.map((value, index) => {
            const Icon = VALUE_ICONS[index] ?? BadgeCheck;
            return (
              <li key={value.title} className="abt-value">
                <span className="abt-value__icon" aria-hidden="true">
                  <Icon strokeWidth={1.5} />
                </span>
                <h3>{value.title}</h3>
                <p>{value.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Partneri (isti prikaz kao na početnoj) */}
      <div className="abt-partners">
        <PartnerStrip data={data.partners} />
      </div>

      {/* Kako radimo */}
      <section className="pg-section abt-process" aria-labelledby="abt-process-title">
        <SectionHeading
          id="abt-process-title"
          overline={copy.processOverline}
          title={
            <>
              {copy.processTitleA}
              <em>{copy.processTitleEm}</em>
            </>
          }
          align="center"
          ornament="compass"
        />
        <div className="abt-process__rail">
          <RouteLine
            className="abt-process__route"
            d="M 0 40 L 1000 40"
            viewBox={{ width: 1000, height: 80 }}
            pins={[
              { x: 125, y: 40, at: 0.125 },
              { x: 375, y: 40, at: 0.375 },
              { x: 625, y: 40, at: 0.625 },
              { x: 875, y: 40, at: 0.875 },
            ]}
            compassAt={{ x: 0, y: 40 }}
            height="5rem"
          />
          <ol className="abt-process__steps" ref={processRef}>
            {copy.process.map((step, index) => {
              const Icon = PROCESS_ICONS[index] ?? BadgeCheck;
              return (
                <li key={step.title} className="abt-step">
                  <BrassPlate number={index + 1} label={`${copy.stepLabel} ${index + 1} ${copy.stepOf} ${copy.process.length}`} />
                  <span className="abt-step__icon" aria-hidden="true">
                    <Icon strokeWidth={1.5} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Tim: mesta za prave fotografije */}
      <section className="pg-section abt-team" aria-labelledby="abt-team-title">
        <SectionHeading
          id="abt-team-title"
          overline={copy.teamOverline}
          title={
            <>
              {copy.teamTitleA}
              <em>{copy.teamTitleEm}</em>
            </>
          }
          intro={copy.teamIntro}
        />
        <ul className="abt-team__grid" ref={teamRef}>
          {copy.team.map((member) => (
              <li key={member.role} className="abt-member">
                <figure className="abt-member__frame ui-paper">
                  <div className="abt-member__photo">
                    <span className="abt-member__engrave" aria-hidden="true">
                      <CompassGlyph className="abt-member__compass" />
                      <Camera className="abt-member__camera" strokeWidth={1.25} />
                    </span>
                    <span className="abt-member__soon">{copy.photoSoon}</span>
                  </div>
                  <figcaption className="abt-member__caption">
                    <strong>{member.role}</strong>
                    <span>{member.body}</span>
                  </figcaption>
                </figure>
              </li>
          ))}
        </ul>
      </section>

      {/* Završni poziv */}
      <section className="pg-section abt-closing-wrap" aria-labelledby="abt-closing-title">
        <div className="abt-closing" ref={closingRef}>
          <div className="abt-closing__body">
            <p className="abt-closing__place">
              <MapPin {...ICON} />
              {copy.closingPlace}
            </p>
            <h2 id="abt-closing-title">{copy.closingTitle}</h2>
            <p className="abt-closing__text">{copy.closingBody}</p>
            <div className="abt-closing__actions">
              <ButtonLink href="/ponude" variant="primary" icon={<ArrowRight {...ICON} />}>
                {copy.ctaOffers}
              </ButtonLink>
              <ButtonLink href="/kontakt" variant="ghost-on-ink" icon={<Send {...ICON} />}>
                {copy.ctaInquiry}
              </ButtonLink>
            </div>
          </div>
          <Stamp className="abt-closing__stamp" shape="round" tone="brick" eyebrow="ABLux" code="Beograd" detail="2022" decorative />
        </div>
      </section>

      <PageAdminEditorDock slot="about" className="pg-container abt-dock" />
    </main>
  );
}
