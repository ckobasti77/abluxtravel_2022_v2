"use client";

import type { FunctionReturnType } from "convex/server";
import { CircleAlert, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { api } from "../../convex/_generated/api";
import {
  availabilityLabel,
  badgeLabel,
  boardLabel,
  durationText,
  formatDate,
  formatTimestamp,
  starsText,
  transportLabel,
  uiBasis,
  type Language,
} from "../../lib/catalog/format";
import { programDayHtml, programDayTitle } from "../../lib/catalog/program-day";
import type { CatalogCopy } from "../../lib/i18n-catalog";
import { getTravelType, isTravelTypeSlug } from "../../lib/search/travel-types";
import { useMediaQuery } from "../../lib/use-media-query";
import { useSitePreferences } from "../site-preferences-provider";
import { Accordion, Badge, Button, ButtonLink, Dialog, Postcard, Price, SectionHeading, Sheet, formatAmount } from "../ui";
import { InquiryForm, type InquiryDeparture } from "./inquiry-form";
import { OfferTicket, type CatalogCard } from "./offer-ticket";

export type OfferPageData = NonNullable<FunctionReturnType<typeof api.catalog.getBySlug>>;
type Detail = NonNullable<OfferPageData["detail"]>;
type Departure = Detail["departures"][number];

const INITIAL_ROWS = 12;

type OfferDetailViewProps = {
  data: OfferPageData;
  similar: CatalogCard[];
  openInquiry?: boolean;
  travelers?: number;
};

function departureLabel(departure: Departure, language: Language, copy: CatalogCopy) {
  return [
    formatDate(departure.date, language),
    departure.unit,
    departure.nights ? `${departure.nights} ${language === "sr" ? "noć." : "n."}` : undefined,
    departure.board ? boardLabel(departure.board, copy) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function OfferDetailView({ data, similar, openInquiry = false, travelers }: OfferDetailViewProps) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.catalog;
  const { card, detail, partner, notice } = data;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [preset, setPreset] = useState<string | undefined>(undefined);

  // "?upit=1" from a catalog card opens the form once the page is interactive.
  useEffect(() => {
    if (!openInquiry || notice) return;
    const timer = window.setTimeout(() => setInquiryOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [openInquiry, notice]);

  const departures = useMemo(() => detail?.departures ?? [], [detail]);
  const inquiryDepartures: InquiryDeparture[] = useMemo(() => {
    const seen = new Set<string>();
    const options: InquiryDeparture[] = [];
    for (const departure of departures) {
      const label = departureLabel(departure, "sr", dictionary.catalog);
      if (seen.has(label)) continue;
      seen.add(label);
      options.push({ value: label, label: departureLabel(departure, language, copy) });
      if (options.length >= 60) break;
    }
    return options;
  }, [departures, language, copy, dictionary.catalog]);

  const openFor = (departure?: Departure) => {
    setPreset(departure ? departureLabel(departure, "sr", dictionary.catalog) : undefined);
    setInquiryOpen(true);
  };

  const typeSlug = card.travelTypes.find(isTravelTypeSlug);
  const type = typeSlug ? getTravelType(typeSlug) : undefined;
  const overline = [type?.label[language], card.countryName].filter(Boolean).join(" · ");
  const basis = uiBasis(card.priceBasis);
  const cover = card.coverUrl ?? detail?.gallery[0]?.src;
  const gallery = (detail?.gallery ?? []).filter((image) => image.src !== cover).slice(0, 6);
  const duration = durationText(card, language);
  const cities = card.departureCities.join(", ");
  const updatedAt = detail?.updatedAt ?? card.updatedAt;

  const facts: { label: string; value: string }[] = [];
  facts.push({
    label: copy.factDeparture,
    value: card.nextDepartureDate ? formatDate(card.nextDepartureDate, language) : copy.onRequestDates,
  });
  if (duration) facts.push({ label: copy.factDuration, value: duration });
  if (card.transports.length) facts.push({ label: copy.factTransport, value: card.transports.map((item) => transportLabel(item, copy)).join(", ") });
  if (card.board) facts.push({ label: copy.factBoard, value: boardLabel(card.board, copy) });
  if (cities) facts.push({ label: copy.factFrom, value: cities });
  if (card.stars) facts.push({ label: copy.factStars, value: starsText(card.stars) ?? "" });
  if (card.place) facts.push({ label: copy.factPlace, value: [card.place, card.countryName].filter(Boolean).join(", ") });

  const inquiry = (
    <InquiryForm
      key={`${preset ?? ""}`}
      cardSlug={card.slug}
      offerTitle={card.title}
      departures={inquiryDepartures}
      initialDeparture={preset}
      initialTravelers={travelers}
      copy={copy}
      language={language}
    />
  );
  const InquiryContainer = isDesktop ? Dialog : Sheet;

  return (
    <main id="main-content" className="offer-page">
      <nav aria-label="Breadcrumb" className="cat-crumbs">
        <ol>
          <li>
            <Link href="/">{copy.breadcrumbHome}</Link>
          </li>
          <li>
            <Link href="/ponude">{copy.breadcrumbOffers}</Link>
          </li>
          <li aria-current="page">{card.title}</li>
        </ol>
      </nav>

      {notice ? (
        <div className="offer-notice" role="status">
          <CircleAlert aria-hidden="true" strokeWidth={1.5} />
          <p>{notice === "removed" ? copy.noticeRemoved : copy.noticeExpired}</p>
        </div>
      ) : null}

      <header className="offer-hero">
        <div className="offer-hero__copy">
          {card.badges.length ? (
            <div className="ui-ticket__badges">
              {card.badges.map((badge) => {
                const label = badgeLabel(badge, copy);
                return label ? (
                  <Badge key={badge} tone={badge === "promo" || badge === "last_minute" ? "alert" : "route"}>
                    {label}
                  </Badge>
                ) : null;
              })}
            </div>
          ) : null}
          {overline ? <p className="ui-overline">{overline}</p> : null}
          <h1 className="offer-hero__title">{card.title}</h1>
          {detail?.subtitle ? <p className="offer-hero__subtitle">{detail.subtitle}</p> : null}
          {card.intro ? <p className="offer-hero__intro">{card.intro}</p> : null}
          <p className="offer-hero__organizer">
            {copy.organizerLabel}: <strong>{detail?.organizer.name ?? card.organizerName}</strong>
            {detail?.organizer.license ? ` · ${copy.license}: ${detail.organizer.license}` : null}
          </p>
          {language === "en" ? (
            <p className="offer-hero__lang" lang="en">
              {copy.englishNote}
            </p>
          ) : null}
        </div>
        <Postcard
          className="offer-hero__postcard"
          image={cover ? { src: cover, alt: [card.title, card.place].filter(Boolean).join(", ") } : null}
          placeName={card.place ?? card.countryName}
          caption={[card.place, card.countryName].filter(Boolean).join(", ") || undefined}
          stampGlyph={type?.glyph ?? "compass"}
          tilt="right"
          priority
        />
      </header>

      <div className="offer-layout">
        <div className="offer-main">
          <section className="offer-pass" aria-labelledby="offer-facts">
            <h2 className="ui-sr-only" id="offer-facts">
              {copy.factsTitle}
            </h2>
            <div className="offer-pass__paper ui-paper">
              <dl className="offer-pass__facts">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="offer-pass__price">
                <span className="offer-pass__label">{copy.factPrice}</span>
                <Price amount={card.priceKind === "from" ? card.priceFrom : null} basis={basis} oldAmount={card.priceOld} language={language} />
                {card.priceNote ? <p className="offer-pass__note">{card.priceNote}</p> : null}
              </div>
            </div>
          </section>

          {departures.length ? (
            <section className="offer-section" aria-labelledby="offer-departures">
              <SectionHeading overline={detail?.priceListLabel ? `${copy.priceList}: ${detail.priceListLabel}` : undefined} title={copy.departuresTitle} intro={copy.departuresIntro} size="sm" id="offer-departures" />
              <DeparturesTable departures={departures} copy={copy} language={language} onPick={notice ? undefined : openFor} />
            </section>
          ) : null}

          {detail?.supplements.length ? (
            <section className="offer-section" aria-labelledby="offer-supplements">
              <h2 className="offer-section__title" id="offer-supplements">
                {copy.supplementsTitle}
              </h2>
              <ul className="offer-list" role="list">
                {detail.supplements.map((supplement, index) => (
                  <li key={index}>
                    <span>{supplement.label}</span>
                    {supplement.price ? (
                      <strong>
                        {`${formatAmount(supplement.price)} €`}
                        {supplement.basis && basisText(supplement.basis, language) ? <small> {basisText(supplement.basis, language)}</small> : null}
                      </strong>
                    ) : null}
                    {supplement.note ? <small className="offer-list__note">{supplement.note}</small> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail?.descriptionHtml ? (
            <section className="offer-section" aria-labelledby="offer-about">
              <h2 className="offer-section__title" id="offer-about">
                {copy.aboutTitle}
              </h2>
              <div className="offer-prose" dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }} />
            </section>
          ) : null}

          {detail?.program.length ? (
            <section className="offer-section" aria-labelledby="offer-program">
              <h2 className="offer-section__title" id="offer-program">
                {copy.programTitle}
              </h2>
              <Accordion
                className="offer-program"
                items={detail.program.map((day, index) => ({
                  id: `day-${index}`,
                  title: (
                    <span className="offer-program__day">
                      {day.day ? <span className="offer-program__pin">{`${copy.dayLabel} ${day.day}`}</span> : null}
                      <span>{programDayTitle(day)}</span>
                    </span>
                  ),
                  content: <div className="offer-prose" dangerouslySetInnerHTML={{ __html: programDayHtml(day.html) }} />,
                  defaultOpen: index === 0,
                }))}
              />
            </section>
          ) : null}

          {detail && (detail.included.length || detail.excluded.length) ? (
            <section className="offer-section offer-terms" aria-label={`${copy.includedTitle} / ${copy.excludedTitle}`}>
              {detail.included.length ? (
                <div>
                  <h2 className="offer-section__title">{copy.includedTitle}</h2>
                  <ul className="offer-bullets offer-bullets--in">
                    {detail.included.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail.excluded.length ? (
                <div>
                  <h2 className="offer-section__title">{copy.excludedTitle}</h2>
                  <ul className="offer-bullets offer-bullets--out">
                    {detail.excluded.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {detail?.notesHtml ? (
            <section className="offer-section" aria-labelledby="offer-notes">
              <h2 className="offer-section__title" id="offer-notes">
                {copy.notesTitle}
              </h2>
              <div className="offer-prose offer-prose--small" dangerouslySetInnerHTML={{ __html: detail.notesHtml }} />
            </section>
          ) : null}

          {gallery.length ? (
            <section className="offer-section" aria-labelledby="offer-gallery">
              <h2 className="offer-section__title" id="offer-gallery">
                {copy.galleryTitle}
              </h2>
              <div className="offer-gallery">
                {gallery.map((image, index) => (
                  <Postcard
                    key={image.src}
                    image={{ src: image.src, alt: image.alt ?? `${card.title} – ${index + 2}` }}
                    tilt={index % 3 === 0 ? "left" : index % 3 === 1 ? "none" : "right"}
                    postmark={index === 0}
                    stampGlyph={type?.glyph ?? "compass"}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="offer-section offer-organizer" aria-labelledby="offer-organizer">
            <h2 className="offer-section__title" id="offer-organizer">
              {copy.organizerTitle}
            </h2>
            <div className="offer-organizer__card">
              {partner?.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- small local logo
                <img src={partner.logoPath} alt="" width={96} height={48} loading="lazy" className="offer-organizer__logo" />
              ) : null}
              <div>
                <p className="offer-organizer__name">{detail?.organizer.name ?? card.organizerName}</p>
                {detail?.organizer.license ? (
                  <p className="offer-organizer__meta">
                    {copy.license}: {detail.organizer.license}
                  </p>
                ) : null}
                {partner && partner.name !== (detail?.organizer.name ?? card.organizerName) ? (
                  <p className="offer-organizer__meta">{partner.name}</p>
                ) : null}
              </div>
            </div>
            <p className="offer-organizer__note">{copy.subagentNote}</p>
            <ul className="offer-links" role="list">
              {detail?.sourceUrl ? (
                <li>
                  <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="ui-link">
                    {copy.originalProgram}
                    <ExternalLink aria-hidden="true" strokeWidth={1.5} size={16} />
                  </a>
                </li>
              ) : null}
              {detail?.organizer.termsUrl ? (
                <li>
                  <a href={detail.organizer.termsUrl} target="_blank" rel="noopener noreferrer nofollow" className="ui-link">
                    {copy.organizerTerms}
                    <ExternalLink aria-hidden="true" strokeWidth={1.5} size={16} />
                  </a>
                </li>
              ) : null}
              {detail?.documents.map((document) => (
                <li key={document.url}>
                  <a href={document.url} target="_blank" rel="noopener noreferrer nofollow" className="ui-link">
                    <FileText aria-hidden="true" strokeWidth={1.5} size={16} />
                    {document.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="offer-organizer__updated">
              {copy.updated} <time dateTime={new Date(updatedAt).toISOString()}>{formatTimestamp(updatedAt, language)}</time>
            </p>
          </section>
        </div>

        <aside className="offer-panel" aria-label={copy.panelTitle}>
          <div className="offer-panel__card ui-paper">
            <p className="ui-overline">{copy.panelTitle}</p>
            <Price
              amount={card.priceKind === "from" ? card.priceFrom : null}
              basis={basis}
              oldAmount={card.priceOld}
              showNbsNote
              language={language}
            />
            {card.nextDepartureDate ? (
              <p className="offer-panel__next">
                {copy.nextDeparture}: <strong>{formatDate(card.nextDepartureDate, language)}</strong>
              </p>
            ) : null}
            {notice ? (
              <ButtonLink href="/kontakt" block variant="secondary">
                {copy.emptyContact}
              </ButtonLink>
            ) : (
              <Button block onClick={() => openFor()} aria-haspopup="dialog">
                {copy.panelCta}
              </Button>
            )}
            <p className="offer-panel__note">{copy.panelNote}</p>
          </div>
        </aside>
      </div>

      {similar.length ? (
        <section className="offer-similar" aria-labelledby="offer-similar">
          <SectionHeading
            overline={copy.similarOverline}
            title={copy.similarTitle}
            id="offer-similar"
            link={{ href: card.countrySlug ? `/ponude?zemlja=${card.countrySlug}` : "/ponude", label: copy.allOffers }}
          />
          <ul className="cat-grid" role="list">
            {similar.map((item) => (
              <li key={item.id}>
                <OfferTicket card={item} language={language} copy={copy} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!notice ? (
        <div className="offer-bar">
          <Price amount={card.priceKind === "from" ? card.priceFrom : null} basis={basis} language={language} surface="theme" />
          <Button onClick={() => openFor()} aria-haspopup="dialog">
            {copy.sendInquiry}
          </Button>
        </div>
      ) : null}

      <InquiryContainer
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        title={copy.formTitle}
        description={copy.formIntro}
        closeLabel={copy.close}
        dismissible={false}
        className="inq-dialog"
      >
        {inquiryOpen ? inquiry : null}
      </InquiryContainer>
    </main>
  );
}

const BASIS_TEXT: Record<Language, Record<string, string>> = {
  sr: {
    per_person: "po osobi",
    per_person_night: "po osobi za noćenje",
    per_unit: "po smeštajnoj jedinici",
    per_unit_night: "po smeštajnoj jedinici za noćenje",
    per_day: "po danu",
    per_stay: "za ceo boravak",
    total_2_adults: "ukupno za 2 osobe",
  },
  en: {
    per_person: "per person",
    per_person_night: "per person per night",
    per_unit: "per room or unit",
    per_unit_night: "per room or unit per night",
    per_day: "per day",
    per_stay: "for the whole stay",
    total_2_adults: "total for 2 people",
  },
};

function basisText(basis: string, language: Language): string {
  return BASIS_TEXT[language][basis] ?? "";
}

function DeparturesTable({
  departures,
  copy,
  language,
  onPick,
}: {
  departures: Departure[];
  copy: CatalogCopy;
  language: Language;
  onPick?: (departure: Departure) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const has = {
    nights: departures.some((row) => row.nights),
    unit: departures.some((row) => row.unit),
    board: departures.some((row) => row.board),
    transport: departures.some((row) => row.transport || row.fromCity),
    availability: departures.some((row) => row.availability && row.availability !== "unknown"),
  };

  const row = (departure: Departure, index: number) => {
    const priced = typeof departure.price === "number" && departure.price > 0 && basisText(departure.basis, language);
    const soldOut = departure.availability === "sold_out";
    return (
      <tr key={`${departure.date}-${index}`} className={soldOut ? "is-sold" : undefined}>
        <th scope="row" data-label={copy.colDate}>
          <span className="offer-table__val">
            {formatDate(departure.date, language)}
            {departure.endDate ? <span className="offer-table__sub">{`– ${formatDate(departure.endDate, language)}`}</span> : null}
          </span>
        </th>
        {has.nights ? (
          <td data-label={copy.colNights}>
            <span className="offer-table__val">{departure.nights ?? "–"}</span>
          </td>
        ) : null}
        {has.unit ? (
          <td data-label={copy.colUnit}>
            <span className="offer-table__val">{departure.unit ?? "–"}</span>
          </td>
        ) : null}
        {has.board ? (
          <td data-label={copy.colBoard}>
            <span className="offer-table__val">{departure.board ? boardLabel(departure.board, copy) : "–"}</span>
          </td>
        ) : null}
        {has.transport ? (
          <td data-label={copy.colTransport}>
            <span className="offer-table__val">
              {[departure.transport ? transportLabel(departure.transport, copy) : null, departure.fromCity].filter(Boolean).join(" · ") || "–"}
            </span>
          </td>
        ) : null}
        <td data-label={copy.colPrice} className="offer-table__price">
          <span className="offer-table__val">
            {priced ? (
              <>
                {departure.priceOld && departure.priceOld > (departure.price as number) ? (
                  <s className="offer-table__old">{`${formatAmount(departure.priceOld)} €`}</s>
                ) : null}
                <strong>{`${formatAmount(departure.price as number)} €`}</strong>
                <span className="offer-table__sub">{basisText(departure.basis, language)}</span>
              </>
            ) : (
              <span>{copy.availOnRequest}</span>
            )}
            {departure.note ? <span className="offer-table__sub offer-table__note">{departure.note}</span> : null}
          </span>
        </td>
        {has.availability ? (
          <td data-label={copy.colAvailability}>
            <span className="offer-table__val">{availabilityLabel(departure.availability, copy) ?? "–"}</span>
          </td>
        ) : null}
        {onPick ? (
          <td className="offer-table__action">
            {soldOut ? null : (
              <Button variant="secondary" size="sm" onClick={() => onPick(departure)} aria-label={`${copy.pickDeparture}: ${formatDate(departure.date, language)}`}>
                {copy.sendInquiry}
              </Button>
            )}
          </td>
        ) : null}
      </tr>
    );
  };

  const head = (
    <thead>
      <tr>
        <th scope="col">{copy.colDate}</th>
        {has.nights ? <th scope="col">{copy.colNights}</th> : null}
        {has.unit ? <th scope="col">{copy.colUnit}</th> : null}
        {has.board ? <th scope="col">{copy.colBoard}</th> : null}
        {has.transport ? <th scope="col">{copy.colTransport}</th> : null}
        <th scope="col" className="offer-table__price">
          {copy.colPrice}
        </th>
        {has.availability ? <th scope="col">{copy.colAvailability}</th> : null}
        {onPick ? (
          <th scope="col">
            <span className="ui-sr-only">{copy.colAction}</span>
          </th>
        ) : null}
      </tr>
    </thead>
  );

  const visible = showAll ? departures : departures.slice(0, INITIAL_ROWS);
  return (
    <div className="offer-table-wrap">
      <table className="offer-table">
        {head}
        <tbody>{visible.map(row)}</tbody>
      </table>
      {departures.length > INITIAL_ROWS && !showAll ? (
        <Button variant="secondary" size="sm" className="offer-table__more" onClick={() => setShowAll(true)}>
          {copy.showAllDepartures.replace("{n}", String(departures.length))}
        </Button>
      ) : null}
      <p className="offer-table__nbs">{copy.nbsNote}</p>
    </div>
  );
}
