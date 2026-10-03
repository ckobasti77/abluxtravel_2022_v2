"use client";

import { ArrowRight, Search, Send, Settings2 } from "lucide-react";
import { useSession } from "../../../lib/use-session";
import { useSitePreferences } from "../../site-preferences-provider";
import { ButtonLink, EmptyState, SectionHeading, useReveal } from "../../ui";
import { PageHero } from "../page-hero";
import { CountryCard } from "./country-card";
import { countriesLabel, offersLabel, type CountryEntry, type HeroImage } from "./destination-data";
import { TravelGroupCard, type TravelGroupSummary } from "./travel-group-card";

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    crumbs: [{ href: "/", label: "Početna" }, { label: "Putovanja" }],
    overline: "Putovanja",
    title: (
      <>
        Putovanja po <em>zemljama</em>
      </>
    ),
    intro:
      "Svaka zemlja na jednom mestu: programi ABLux Travel i ponude partnerskih agencija, sa terminima i cenama kako ih organizatori objavljuju.",
    allOffers: "Sve ponude",
    directory: "Pretraži destinacije",
    staffNote: "Izdvojena putovanja, njihove destinacije i slike uređujete u administraciji.",
    staffLink: "Uredi putovanja",
    groupsOverline: "Izdvojeno",
    groupsTitle: (
      <>
        Naša <em>putovanja</em>
      </>
    ),
    groupsIntro: "Putovanja koja smo posebno pripremili, sa destinacijama, terminima i sledećim korakom.",
    countriesOverline: "Zemlje u ponudi",
    countriesTitle: (
      <>
        Izaberite <em>zemlju</em>
      </>
    ),
    countriesIntro: "Broj ponuda, najniža objavljena cena po osobi i prvi polazak, iz ponude koja se osvežava svakog jutra.",
    countriesLink: "Sve destinacije",
    emptyTitle: "Trenutno nema objavljenih ponuda po zemljama.",
    emptyBody: "Pošaljite nam upit sa željenom destinacijom i terminom, pa ćemo Vam predložiti putovanje.",
    emptyAction: "Pošalji upit",
    closingTitle: "Ne vidite zemlju koju tražite?",
    closingBody: "Pišite nam kuda i kada želite da putujete. Proverićemo ponude partnera i javiti Vam se sa predlogom.",
    closingAction: "Pošalji upit",
  },
  en: {
    crumbs: [{ href: "/", label: "Home" }, { label: "Trips" }],
    overline: "Trips",
    title: (
      <>
        Trips by <em>country</em>
      </>
    ),
    intro:
      "Every country in one place: ABLux Travel programs and partner agency offers, with dates and prices as the organizers publish them.",
    allOffers: "All offers",
    directory: "Search destinations",
    staffNote: "Featured trips, their destinations and images are edited in the admin.",
    staffLink: "Edit trips",
    groupsOverline: "Featured",
    groupsTitle: (
      <>
        Our <em>trips</em>
      </>
    ),
    groupsIntro: "Trips we prepared ourselves, with destinations, dates and a clear next step.",
    countriesOverline: "Countries on offer",
    countriesTitle: (
      <>
        Choose a <em>country</em>
      </>
    ),
    countriesIntro: "Offer count, lowest published price per person and the first departure, from offers refreshed every morning.",
    countriesLink: "All destinations",
    emptyTitle: "There are no published offers by country at the moment.",
    emptyBody: "Send us an inquiry with the destination and dates you have in mind and we will suggest a trip.",
    emptyAction: "Send inquiry",
    closingTitle: "Cannot find the country you are looking for?",
    closingBody: "Tell us where and when you would like to travel. We will check partner offers and get back to you with a suggestion.",
    closingAction: "Send inquiry",
  },
};

export type TravelsViewProps = {
  countries: CountryEntry[];
  groups: TravelGroupSummary[];
  hero: HeroImage;
};

export function TravelsView({ countries, groups, hero }: TravelsViewProps) {
  const { language } = useSitePreferences();
  const session = useSession();
  const copy = COPY[language];
  const total = countries.reduce((sum, entry) => sum + entry.count, 0);
  const groupsRef = useReveal<HTMLUListElement>({ selector: ":scope > li", y: 28 });
  const countriesRef = useReveal<HTMLUListElement>({ selector: ":scope > li", y: 28, stagger: 0.06 });

  return (
    <main id="main-content" className="pg dst">
      <PageHero
        crumbs={copy.crumbs}
        overline={copy.overline}
        title={copy.title}
        intro={copy.intro}
        image={{ ...hero, alt: "" }}
        actions={
          <>
            <ButtonLink href="/ponude" variant="primary" icon={<ArrowRight {...ICON} />}>
              {copy.allOffers}
            </ButtonLink>
            <ButtonLink href="/destinacije" variant="ghost-on-ink" icon={<Search {...ICON} />}>
              {copy.directory}
            </ButtonLink>
          </>
        }
      >
        {countries.length ? (
          <ul className="pg-hero__facts">
            <li>
              <strong>{countriesLabel(countries.length, language)}</strong>
            </li>
            <li>
              <strong>{offersLabel(total, language)}</strong>
            </li>
          </ul>
        ) : null}
      </PageHero>

      {session?.isStaff ? (
        <div className="pg-container dst-staff" role="note">
          <Settings2 {...ICON} />
          <p>{copy.staffNote}</p>
          <ButtonLink href="/admin/putovanja" variant="secondary" size="sm">
            {copy.staffLink}
          </ButtonLink>
        </div>
      ) : null}

      {groups.length ? (
        <section className="pg-section" aria-labelledby="dst-groups-title">
          <SectionHeading id="dst-groups-title" overline={copy.groupsOverline} title={copy.groupsTitle} intro={copy.groupsIntro} ornament="compass" />
          <ul className="dst-grid dst-grid--groups" ref={groupsRef}>
            {groups.map((group, index) => (
              <li key={group._id}>
                <TravelGroupCard group={group} language={language} index={index} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pg-section" aria-labelledby="dst-countries-title">
        <SectionHeading
          id="dst-countries-title"
          overline={copy.countriesOverline}
          title={copy.countriesTitle}
          intro={copy.countriesIntro}
          link={countries.length ? { href: "/destinacije", label: copy.countriesLink } : undefined}
        />
        {countries.length ? (
          <ul className="dst-grid" ref={countriesRef}>
            {countries.map((entry, index) => (
              <li key={entry.countrySlug}>
                <CountryCard entry={entry} language={language} index={index} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="dst-empty"
            title={copy.emptyTitle}
            body={copy.emptyBody}
            action={
              <ButtonLink href="/kontakt" variant="secondary" icon={<Send {...ICON} />}>
                {copy.emptyAction}
              </ButtonLink>
            }
          />
        )}
      </section>

      {countries.length ? (
        <section className="pg-section" aria-labelledby="dst-closing-title">
          <div className="dst-closing">
            <h2 id="dst-closing-title" className="dst-closing__title">
              {copy.closingTitle}
            </h2>
            <p>{copy.closingBody}</p>
            <ButtonLink href="/kontakt" variant="secondary" icon={<Send {...ICON} />}>
              {copy.closingAction}
            </ButtonLink>
          </div>
        </section>
      ) : null}
    </main>
  );
}
