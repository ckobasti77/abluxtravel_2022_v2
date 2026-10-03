"use client";

import { ArrowRight, CalendarDays, Clock3, MapPin, Send, Settings2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "../../../lib/catalog/format";
import { getTravelType, isTravelTypeSlug } from "../../../lib/search/travel-types";
import { useSession } from "../../../lib/use-session";
import { OfferTicket, type CatalogCard } from "../../catalog/offer-ticket";
import DestinationEditor from "../../destination-editor";
import PageAdminEditorDock from "../../page-admin-editor-dock";
import { useSitePreferences } from "../../site-preferences-provider";
import { ButtonLink, EmptyState, SectionHeading, useReveal } from "../../ui";
import { PageHero } from "../page-hero";
import { AdminDestinations } from "./admin-destinations";
import {
  countryIntro,
  offersLabel,
  paragraphs,
  placeHref,
  plural,
  priceFromLabel,
  type CountryEntry,
  type HeroImage,
  type PageDestination,
  type TravelGroup,
} from "./destination-data";
import { HeroVideo } from "./hero-video";
import { TravelGroupDetails } from "./travel-group-details";

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    home: "Početna",
    trips: "Putovanja",
    countryOverline: "Putovanja po zemljama",
    groupOverline: "Izdvojeno putovanje",
    agencies: (count: number) => `${count} ${plural(count, "agencija", "agencije", "agencija")}`,
    firstDeparture: "prvi polazak",
    allOffers: (count: number) => `Sve ponude (${count})`,
    inquiry: "Pošalji upit",
    aboutOverline: "Ukratko",
    aboutTitle: (name: string) => (
      <>
        O destinaciji <em>{name}</em>
      </>
    ),
    aboutGroupTitle: (
      <>
        O <em>putovanju</em>
      </>
    ),
    places: "Mesta u ponudi",
    types: "Vrste putovanja",
    overview: "Pregled putovanja",
    offersOverline: (name: string) => name,
    offersTitle: (
      <>
        Aktuelne <em>ponude</em>
      </>
    ),
    offersIntro: (shown: number, total: number) =>
      shown < total
        ? `Prikazano je prvih ${shown} od ${total} ponuda, po datumu polaska. Sve ponude, sa filterima po mesecu, ceni i prevozu, nalaze se u katalogu.`
        : "Ponude ABLux Travel i partnerskih agencija, po datumu polaska.",
    catalogLink: "Otvori u katalogu",
    moreOffers: (total: number) => `Sve ponude za ovu zemlju (${total})`,
    emptyTitle: "Za ovu destinaciju trenutno nema objavljenih ponuda.",
    emptyBody: "Ponude se osvežavaju svakog jutra. Pogledajte druge zemlje ili nam pošaljite upit, pa ćemo proveriti ponude partnera.",
    emptyFailed: "Ponude trenutno ne možemo da učitamo. Pokušajte ponovo za nekoliko minuta ili nam pošaljite upit.",
    otherCountries: "Druge zemlje",
    staffTitle: (name: string) => `Admin: destinacije za ${name}`,
    staffBody: "Dodajte, izmenite i obrišite destinacije direktno na ovoj stranici.",
    staffNote: "Uređivanje ove stranice",
  },
  en: {
    home: "Home",
    trips: "Trips",
    countryOverline: "Trips by country",
    groupOverline: "Featured trip",
    agencies: (count: number) => `${count} ${count === 1 ? "agency" : "agencies"}`,
    firstDeparture: "first departure",
    allOffers: (count: number) => `All offers (${count})`,
    inquiry: "Send inquiry",
    aboutOverline: "In short",
    aboutTitle: (name: string) => (
      <>
        About <em>{name}</em>
      </>
    ),
    aboutGroupTitle: (
      <>
        About the <em>trip</em>
      </>
    ),
    places: "Places on offer",
    types: "Types of travel",
    overview: "Trip overview",
    offersOverline: (name: string) => name,
    offersTitle: (
      <>
        Current <em>offers</em>
      </>
    ),
    offersIntro: (shown: number, total: number) =>
      shown < total
        ? `Showing the first ${shown} of ${total} offers by departure date. All offers, with filters by month, price and transport, are in the catalog.`
        : "ABLux Travel and partner agency offers, by departure date.",
    catalogLink: "Open in the catalog",
    moreOffers: (total: number) => `All offers for this country (${total})`,
    emptyTitle: "There are no published offers for this destination at the moment.",
    emptyBody: "Offers are refreshed every morning. Look at other countries or send us an inquiry and we will check partner offers.",
    emptyFailed: "Offers cannot be loaded right now. Please try again in a few minutes or send us an inquiry.",
    otherCountries: "Other countries",
    staffTitle: (name: string) => `Admin: destinations for ${name}`,
    staffBody: "Add, edit and delete destinations directly on this page.",
    staffNote: "Editing this page",
  },
};

export type CountryViewProps = {
  slug: string;
  name: string;
  group: TravelGroup | null;
  entry: CountryEntry | null;
  offers: CatalogCard[];
  total: number;
  agencies: number | null;
  destinations: PageDestination[];
  hero: { image: HeroImage | null; video: string | null };
  /** A query failed: show a calm notice instead of "no offers". */
  failed: boolean;
};

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li>
      {icon}
      <span>{children}</span>
    </li>
  );
}

export function CountryView({ slug, name, group, entry, offers, total, agencies, destinations, hero, failed }: CountryViewProps) {
  const { dictionary, language } = useSitePreferences();
  const session = useSession();
  const copy = COPY[language];
  const t = dictionary.tripDetail;
  const catalogHref = `/ponude?zemlja=${encodeURIComponent(slug)}`;
  const gridRef = useReveal<HTMLUListElement>({ selector: ":scope > li", y: 28, stagger: 0.06 });

  const intro = countryIntro({ name, count: total, agencies, entry }, language);
  const description = paragraphs(group?.description);
  const places = entry?.places ?? [];
  const types = (entry?.travelTypes ?? []).filter((type) => isTravelTypeSlug(type.slug));
  const groupFacts: { icon: ReactNode; label: string }[] = [];
  if (group) {
    const range = [formatDate(group.departureDate, language), formatDate(group.returnDate, language)].filter(Boolean).join(" – ");
    if (range) groupFacts.push({ icon: <CalendarDays {...ICON} />, label: `${t.departure}: ${range}` });
    if (group.departureCity) groupFacts.push({ icon: <MapPin {...ICON} />, label: `${t.departureCity}: ${group.departureCity}` });
    if (group.days > 0 || group.nights > 0) {
      const days = language === "sr" ? `${group.days} ${plural(group.days, "dan", "dana", "dana")}` : `${group.days} days`;
      const nights = language === "sr" ? `${group.nights} ${plural(group.nights, "noć", "noći", "noći")}` : `${group.nights} nights`;
      groupFacts.push({ icon: <Clock3 {...ICON} />, label: `${days} / ${nights}` });
    }
    // Transport has a code default ("bus"); show it only for groups set up as a dated trip.
    if (group.departureDate) groupFacts.push({ icon: <ArrowRight {...ICON} />, label: `${t.transport}: ${t[group.transport]}` });
  }

  const hasAbout = description.length > 0 || intro.length > 0 || places.length > 0 || types.length > 0 || groupFacts.length > 0;
  const hasPricedEur = offers.some((card) => card.priceKind === "from" && card.priceFrom && card.currency === "EUR");
  const nothing = !group && offers.length === 0 && destinations.length === 0;

  return (
    <main id="main-content" className="pg dst">
      <PageHero
        crumbs={[{ href: "/", label: copy.home }, { href: "/putovanja", label: copy.trips }, { label: name }]}
        overline={group ? group.badge || copy.groupOverline : copy.countryOverline}
        title={<em>{name}</em>}
        intro={group?.subtitle || undefined}
        image={hero.video ? null : hero.image ? { ...hero.image, alt: "" } : null}
        media={hero.video ? <HeroVideo src={hero.video} poster={hero.image?.src} /> : undefined}
        actions={
          <>
            {total > 0 ? (
              <ButtonLink href={catalogHref} variant="primary" icon={<ArrowRight {...ICON} />} prefetch={false}>
                {copy.allOffers(total)}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/kontakt" variant={total > 0 ? "ghost-on-ink" : "primary"} icon={<Send {...ICON} />}>
              {group ? t.contactCta : copy.inquiry}
            </ButtonLink>
          </>
        }
      >
        {total > 0 ? (
          <ul className="pg-hero__facts">
            <li>
              <strong>{offersLabel(total, language)}</strong>
            </li>
            {agencies ? (
              <li>
                <strong>{copy.agencies(agencies)}</strong>
              </li>
            ) : null}
            {entry?.priceFrom ? <li>{priceFromLabel(entry.priceFrom, language)}</li> : null}
            {entry?.nextDeparture ? (
              <li>
                {copy.firstDeparture} {formatDate(entry.nextDeparture, language)}
              </li>
            ) : null}
          </ul>
        ) : null}
      </PageHero>

      {hasAbout ? (
        <section className="pg-section dst-about" aria-labelledby="dst-about-title">
          <div className="dst-about__copy">
            <SectionHeading
              id="dst-about-title"
              overline={copy.aboutOverline}
              title={group && !entry ? copy.aboutGroupTitle : copy.aboutTitle(name)}
              ornament="compass"
            />
            <div className="pg-prose dst-about__prose">
              {description.map((text, index) => (
                <p key={index}>{text}</p>
              ))}
              {intro.length ? <p className="dst-about__generated">{intro.join(" ")}</p> : null}
            </div>
          </div>

          {places.length || types.length || groupFacts.length ? (
            <aside className="dst-about__aside pg-panel ui-paper" aria-label={group && !entry ? copy.overview : copy.places}>
              {groupFacts.length ? (
                <div className="dst-about__block">
                  <h3 className="dst-about__label">{copy.overview}</h3>
                  <ul className="dst-facts">
                    {groupFacts.map((fact) => (
                      <Fact key={fact.label} icon={fact.icon}>
                        {fact.label}
                      </Fact>
                    ))}
                  </ul>
                </div>
              ) : null}
              {places.length ? (
                <div className="dst-about__block">
                  <h3 className="dst-about__label">{copy.places}</h3>
                  <ul className="dst-chips">
                    {places.map((place) => (
                      <li key={place.name}>
                        <Link href={placeHref(slug, place.name)} className="ui-chip dst-chip" prefetch={false}>
                          <span>{place.name}</span>
                          <span className="ui-chip__count">{place.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {types.length ? (
                <div className="dst-about__block">
                  <h3 className="dst-about__label">{copy.types}</h3>
                  <ul className="dst-chips">
                    {types.map((type) => (
                      <li key={type.slug}>
                        <Link
                          href={`/ponude?${new URLSearchParams({ zemlja: slug, tip: type.slug }).toString()}`}
                          className="ui-chip dst-chip"
                          prefetch={false}
                        >
                          <span>{isTravelTypeSlug(type.slug) ? getTravelType(type.slug).label[language] : type.slug}</span>
                          <span className="ui-chip__count">{type.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          ) : null}
        </section>
      ) : null}

      <AdminDestinations pageSlug={slug} initial={destinations} parentTitle={group?.title ?? name} />

      {group ? <TravelGroupDetails group={group} /> : null}

      {offers.length ? (
        <section className="pg-section" id="ponude" aria-labelledby="dst-offers-title">
          <SectionHeading
            id="dst-offers-title"
            overline={copy.offersOverline(name)}
            title={copy.offersTitle}
            intro={copy.offersIntro(offers.length, total)}
            link={{ href: catalogHref, label: copy.catalogLink }}
          />
          <ul className="dst-offers" ref={gridRef}>
            {offers.map((card) => (
              <li key={card.id}>
                <OfferTicket card={card} language={language} copy={dictionary.catalog} layout="stacked" />
              </li>
            ))}
          </ul>
          <div className="dst-offers__foot">
            {hasPricedEur ? <p className="dst-note">{dictionary.catalog.nbsNote}</p> : null}
            {language === "en" ? (
              <p className="dst-note" lang="en">
                {dictionary.catalog.englishNote}
              </p>
            ) : null}
            {total > offers.length ? (
              <ButtonLink href={catalogHref} variant="secondary" icon={<ArrowRight {...ICON} />} prefetch={false}>
                {copy.moreOffers(total)}
              </ButtonLink>
            ) : null}
          </div>
        </section>
      ) : nothing || failed ? (
        <section className="pg-section" aria-label={copy.emptyTitle}>
          <EmptyState
            className="dst-empty"
            headingLevel="h2"
            title={copy.emptyTitle}
            body={failed ? copy.emptyFailed : copy.emptyBody}
            action={
              <div className="pg-empty__actions">
                <ButtonLink href="/putovanja" variant="secondary">
                  {copy.otherCountries}
                </ButtonLink>
                <ButtonLink href="/kontakt" variant="text" icon={<Send {...ICON} />}>
                  {copy.inquiry}
                </ButtonLink>
              </div>
            }
          />
        </section>
      ) : null}

      {session?.isStaff ? (
        <section className="pg-section dst-staff-zone" aria-label={copy.staffNote}>
          <div className="dst-staff" role="note">
            <Settings2 {...ICON} />
            <p>{copy.staffNote}</p>
          </div>
          <DestinationEditor pageSlug={slug} title={copy.staffTitle(name)} description={copy.staffBody} />
          <PageAdminEditorDock slot="country" className="dst-dock" />
        </section>
      ) : null}
    </main>
  );
}
