"use client";

import { ArrowRight, Search, Send } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useSitePreferences } from "../../site-preferences-provider";
import { Button, ButtonLink, EmptyState, Field, Input, SectionHeading } from "../../ui";
import {
  countriesLabel,
  countryGlyph,
  fold,
  offersLabel,
  placeHref,
  priceFromLabel,
  type CountryEntry,
  type HeroImage,
} from "./destination-data";
import { MediaPostcard } from "./media-postcard";
import { TravelGroupCard, type TravelGroupSummary } from "./travel-group-card";
import { PageHero } from "../page-hero";

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    crumbs: [{ href: "/", label: "Početna" }, { label: "Destinacije" }],
    overline: "Destinacije",
    title: (
      <>
        Zemlje i mesta iz <em>ponude</em>
      </>
    ),
    intro:
      "Imenik destinacija iz aktuelne ponude ABLux Travel i partnerskih agencija. Izaberite zemlju za pregled putovanja ili mesto za konkretne ponude.",
    trips: "Putovanja po zemljama",
    searchLabel: "Pretraga destinacija",
    searchPlaceholder: "Upišite zemlju ili mesto, npr. Hanioti",
    searchHint: "Pretraga ne zavisi od kvačica: „bec” pronalazi i „Beč”.",
    shown: (countries: number, total: number) =>
      countries === total ? `Prikazano: ${countriesLabel(countries, "sr")}.` : `Pronađeno: ${countriesLabel(countries, "sr")} od ${total}.`,
    featuredOverline: "Izdvojeno",
    featuredTitle: (
      <>
        Naša <em>putovanja</em>
      </>
    ),
    directoryOverline: "Imenik",
    directoryTitle: (
      <>
        Sve <em>destinacije</em>
      </>
    ),
    directoryIntro: "Zemlje abecednim redom. Mesta su poređana po broju ponuda.",
    placesOf: (name: string) => `Mesta u ponudi: ${name}`,
    countryLink: "Putovanja",
    emptyTitle: (query: string) => `Za „${query}” trenutno nema destinacije u ponudi.`,
    emptyBody: "Proverite naziv ili pogledajte sve ponude. Možete nam poslati i upit, pa ćemo proveriti ponude partnera.",
    clear: "Prikaži sve destinacije",
    allOffers: "Sve ponude",
    inquiry: "Pošalji upit",
    noDataTitle: "Trenutno nema objavljenih ponuda po zemljama.",
    noDataBody: "Ponude se osvežavaju svakog jutra. Pošaljite nam upit sa željenom destinacijom i terminom.",
  },
  en: {
    crumbs: [{ href: "/", label: "Home" }, { label: "Destinations" }],
    overline: "Destinations",
    title: (
      <>
        Countries and places <em>on offer</em>
      </>
    ),
    intro:
      "A directory of destinations from current ABLux Travel and partner agency offers. Choose a country for its trips or a place for specific offers.",
    trips: "Trips by country",
    searchLabel: "Search destinations",
    searchPlaceholder: "Type a country or place, e.g. Hanioti",
    searchHint: "The search ignores diacritics: “bec” also finds “Beč”.",
    shown: (countries: number, total: number) =>
      countries === total ? `Showing ${countriesLabel(countries, "en")}.` : `Found ${countriesLabel(countries, "en")} of ${total}.`,
    featuredOverline: "Featured",
    featuredTitle: (
      <>
        Our <em>trips</em>
      </>
    ),
    directoryOverline: "Directory",
    directoryTitle: (
      <>
        All <em>destinations</em>
      </>
    ),
    directoryIntro: "Countries in alphabetical order. Places are ordered by the number of offers.",
    placesOf: (name: string) => `Places on offer: ${name}`,
    countryLink: "Trips",
    emptyTitle: (query: string) => `There is no destination for “${query}” on offer at the moment.`,
    emptyBody: "Check the spelling or look at all offers. You can also send us an inquiry and we will check partner offers.",
    clear: "Show all destinations",
    allOffers: "All offers",
    inquiry: "Send inquiry",
    noDataTitle: "There are no published offers by country at the moment.",
    noDataBody: "Offers are refreshed every morning. Send us an inquiry with the destination and dates you have in mind.",
  },
};

export type DirectoryViewProps = {
  countries: CountryEntry[];
  featured: TravelGroupSummary[];
  hero: HeroImage;
};

type Match = { entry: CountryEntry; places: CountryEntry["places"] };

export function DirectoryView({ countries, featured, hero }: DirectoryViewProps) {
  const { language } = useSitePreferences();
  const copy = COPY[language];
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const needle = fold(deferred);

  const sorted = useMemo(
    () => [...countries].sort((a, b) => a.countryName.localeCompare(b.countryName, "sr")),
    [countries]
  );

  const matches = useMemo<Match[]>(() => {
    if (!needle) return sorted.map((entry) => ({ entry, places: entry.places }));
    const result: Match[] = [];
    for (const entry of sorted) {
      // A country match keeps all its places; otherwise only the matching places.
      if (fold(entry.countryName).includes(needle) || entry.countrySlug.includes(needle)) {
        result.push({ entry, places: entry.places });
        continue;
      }
      const places = entry.places.filter((place) => fold(place.name).includes(needle));
      if (places.length) result.push({ entry, places });
    }
    return result;
  }, [needle, sorted]);

  const featuredMatches = useMemo(
    () =>
      needle
        ? featured.filter((group) => fold([group.title, group.subtitle, group.description].filter(Boolean).join(" ")).includes(needle))
        : featured,
    [featured, needle]
  );

  const total = countries.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <main id="main-content" className="pg dst">
      <PageHero
        crumbs={copy.crumbs}
        overline={copy.overline}
        title={copy.title}
        intro={copy.intro}
        image={{ ...hero, alt: "" }}
        actions={
          <ButtonLink href="/putovanja" variant="ghost-on-ink" icon={<ArrowRight {...ICON} />}>
            {copy.trips}
          </ButtonLink>
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

      {countries.length || featured.length ? (
        <div className="pg-container dst-search" role="search">
          <Field label={copy.searchLabel} hint={copy.searchHint} className="dst-search__field">
            <span className="dst-search__control">
              <Search {...ICON} className="dst-search__icon" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                autoComplete="off"
                enterKeyHint="search"
              />
            </span>
          </Field>
          <p className="dst-search__status" aria-live="polite">
            {countries.length ? copy.shown(matches.length, countries.length) : null}
          </p>
        </div>
      ) : null}

      {featuredMatches.length ? (
        <section className="pg-section pg-section--tight" aria-labelledby="dst-featured-title">
          <SectionHeading id="dst-featured-title" overline={copy.featuredOverline} title={copy.featuredTitle} size="sm" />
          <ul className="dst-grid dst-grid--groups">
            {featuredMatches.map((group, index) => (
              <li key={group._id}>
                <TravelGroupCard group={group} language={language} index={index} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pg-section pg-section--tight" aria-labelledby="dst-directory-title">
        <SectionHeading
          id="dst-directory-title"
          overline={copy.directoryOverline}
          title={copy.directoryTitle}
          intro={countries.length ? copy.directoryIntro : undefined}
        />
        {matches.length ? (
          <ul className="dst-directory">
            {matches.map(({ entry, places }, index) => (
              <li key={entry.countrySlug} className="dst-entry">
                <MediaPostcard
                  image={entry.coverUrl}
                  alt={entry.countryName}
                  placeName={entry.countryName}
                  glyph={countryGlyph(entry)}
                  tilt={index % 2 ? "right" : "left"}
                  className="dst-entry__card"
                />
                <div className="dst-entry__body">
                  <h3 className="dst-entry__title">
                    <Link href={`/putovanja/${entry.countrySlug}`} prefetch={false}>
                      {entry.countryName}
                      <ArrowRight {...ICON} />
                    </Link>
                  </h3>
                  <p className="dst-country__facts">
                    <span>{offersLabel(entry.count, language)}</span>
                    {entry.priceFrom ? <span>{priceFromLabel(entry.priceFrom, language)}</span> : null}
                  </p>
                  {places.length ? (
                    <ul className="dst-chips" aria-label={copy.placesOf(entry.countryName)}>
                      {places.map((place) => (
                        <li key={place.name}>
                          <Link href={placeHref(entry.countrySlug, place.name)} className="ui-chip dst-chip" prefetch={false}>
                            <span>{place.name}</span>
                            <span className="ui-chip__count">{place.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : countries.length ? (
          <EmptyState
            className="dst-empty"
            title={copy.emptyTitle(deferred.trim())}
            body={copy.emptyBody}
            action={
              <div className="pg-empty__actions">
                <Button variant="secondary" onClick={() => setQuery("")}>
                  {copy.clear}
                </Button>
                <ButtonLink href="/ponude" variant="text" icon={<ArrowRight {...ICON} />} prefetch={false}>
                  {copy.allOffers}
                </ButtonLink>
                <ButtonLink href="/kontakt" variant="text" icon={<Send {...ICON} />}>
                  {copy.inquiry}
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <EmptyState
            className="dst-empty"
            title={copy.noDataTitle}
            body={copy.noDataBody}
            action={
              <ButtonLink href="/kontakt" variant="secondary" icon={<Send {...ICON} />}>
                {copy.inquiry}
              </ButtonLink>
            }
          />
        )}
      </section>
    </main>
  );
}
