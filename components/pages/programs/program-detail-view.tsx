"use client";

import { BedDouble, CalendarDays, Compass, ChevronDown, ChevronUp, Clock3, ExternalLink, MapPin, Send, Users, Utensils } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { durationText, formatDate, serbianPlural, type Language } from "../../../lib/catalog/format";
import { useMediaQuery } from "../../../lib/use-media-query";
import AddToCartButton from "../../add-to-cart-button";
import { InquiryForm } from "../../catalog/inquiry-form";
import { useSitePreferences } from "../../site-preferences-provider";
import { Badge, Button, Dialog, Postcard, Price, Sheet } from "../../ui";
import {
  STATUS_LABELS,
  effectiveTripStatus,
  TRANSPORT_LABELS,
  cleanText,
  currencyCode,
  isPurchasable,
  tripCover,
  tripDates,
  type TripAccommodation,
  type TripDestination,
  type TripDetail,
} from "./program-utils";

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    home: "Početna",
    programs: "Aranžmani",
    overline: "ABLux program",
    facts: "Osnovni podaci",
    departure: "Polazak",
    returnDate: "Povratak",
    duration: "Trajanje",
    transport: "Prevoz",
    from: "Polazak iz",
    hotel: "Smeštaj",
    price: "Cena",
    gallery: "Fotografije i video",
    destinationsTitle: "Destinacije u aranžmanu",
    destinationsIntro: "Cena je navedena uz svaku destinaciju. Izaberite destinaciju da vidite detalje i rezervišete mesto.",
    ourOffer: "Naša ponuda",
    offerCode: "Šifra ponude",
    openOffer: "Otvori ponudu organizatora",
    noPreview: "Program ove destinacije objavljuje organizator. Otvorite ga na njegovom sajtu.",
    accommodationTitle: "Smeštaj",
    accommodationIntro: "Cena smeštaja je po osobi. Izaberite smeštaj i dodajte ga u korpu.",
    upTo: "do",
    guests: (n: number) => serbianPlural(n, "osobe", "osobe", "osoba"),
    more: "Detalji smeštaja",
    less: "Sakrij detalje",
    itinerary: "Program po danima",
    day: "Dan",
    included: "Cena obuhvata",
    excluded: "Cena ne obuhvata",
    panelTitle: "Rezervacija",
    deposit: "Akontacija",
    depositDeadline: "rok",
    selected: "Izabrana destinacija",
    inquiry: "Pošalji upit",
    inquiryTitle: "Upit za aranžman",
    note: "Mesto rezervišete dodavanjem u korpu i plaćanjem IPS QR kodom. Za grupe i posebne zahteve pošaljite upit.",
    noteInquiry: "Pošaljite upit i javićemo Vam se sa slobodnim terminima i cenom.",
    checkIn: "Prijava",
    checkOut: "Odjava",
    accommodationInquiry: "Cena smeštaja je po osobi. Za slobodna mesta pošaljite upit.",
    completed: "Ovaj program je završen. Stranica ostaje dostupna radi pregleda; za nove termine pošaljite upit.",
    close: "Zatvori",
  },
  en: {
    home: "Home",
    programs: "Packages",
    overline: "ABLux program",
    facts: "Key facts",
    departure: "Departure",
    returnDate: "Return",
    duration: "Duration",
    transport: "Transport",
    from: "Departing from",
    hotel: "Accommodation",
    price: "Price",
    gallery: "Photos and video",
    destinationsTitle: "Destinations in this package",
    destinationsIntro: "Each destination shows its own price. Choose a destination to see details and book a seat.",
    ourOffer: "Our offer",
    offerCode: "Offer code",
    openOffer: "Open the organizer's offer",
    noPreview: "The organizer publishes the program for this destination. Open it on their website.",
    accommodationTitle: "Accommodation",
    accommodationIntro: "Accommodation prices are per person. Choose one and add it to the cart.",
    upTo: "up to",
    guests: (n: number) => (n === 1 ? "guest" : "guests"),
    more: "Accommodation details",
    less: "Hide details",
    itinerary: "Day-by-day program",
    day: "Day",
    included: "Included",
    excluded: "Not included",
    panelTitle: "Booking",
    deposit: "Deposit",
    depositDeadline: "due",
    selected: "Selected destination",
    inquiry: "Send inquiry",
    inquiryTitle: "Package inquiry",
    note: "Book a seat by adding it to the cart and paying with an IPS QR code. For groups and special requests, send an inquiry.",
    noteInquiry: "Send an inquiry and we will get back to you with available dates and prices.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    accommodationInquiry: "Accommodation prices are per person. Send an inquiry for availability.",
    completed: "This program has ended. The page stays available for reference; send an inquiry for new dates.",
    close: "Close",
  },
};

const usable = (url: string | undefined | null): url is string => Boolean(url && (url.startsWith("https://") || url.startsWith("/")));

type ProgramDetailViewProps = {
  trip: TripDetail;
  accommodations: TripAccommodation[];
  destinations: TripDestination[];
};

/** ABLux program page (/aranzmani/[slug]) in the template language of the partner offer page. */
export function ProgramDetailView({ trip, accommodations, destinations }: ProgramDetailViewProps) {
  const { dictionary, language } = useSitePreferences();
  const copy = COPY[language];
  const acc = dictionary.accommodation;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeAccommodations = accommodations.filter((item) => item.isActive);
  const activeDestinations = destinations.filter((item) => item.isActive);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = activeDestinations.find((item) => item._id === selectedId) ?? activeDestinations[0] ?? null;
  const selectedImages = selected?.imageUrls.filter(usable) ?? [];
  const selectedIsSub = (selected?.offerType ?? "own") === "subagency";

  const cover = tripCover(trip);
  const media = useMemo(() => {
    const items = trip.detailMedia.filter((item) => usable(item.url));
    if (items.length) return items;
    return trip.imageUrls.filter(usable).map((url) => ({ url, mediaType: "image" as const }));
  }, [trip]);
  const gallery = media.filter((item) => item.url !== cover).slice(0, 12);
  const purchasable = isPurchasable(trip);
  const status = effectiveTripStatus(trip);
  const currency = currencyCode(trip.currency);
  const duration = durationText({ days: trip.days, nights: trip.nights }, language);
  const description = cleanText(trip.description);
  const itinerary = trip.itinerary.filter((item) => cleanText(item.description));

  const facts: { label: string; value: string }[] = [];
  if (trip.departureDate) facts.push({ label: copy.departure, value: formatDate(trip.departureDate, language) });
  if (trip.returnDate) facts.push({ label: copy.returnDate, value: formatDate(trip.returnDate, language) });
  if (duration) facts.push({ label: copy.duration, value: duration });
  facts.push({ label: copy.transport, value: TRANSPORT_LABELS[language][trip.transport] });
  if (trip.departureCity) facts.push({ label: copy.from, value: trip.departureCity });
  if (trip.hotelInfo) facts.push({ label: copy.hotel, value: trip.hotelInfo });

  const InquiryContainer = isDesktop ? Dialog : Sheet;

  return (
    <main id="main-content" className="offer-page prg-detail">
      <nav aria-label="Breadcrumb" className="cat-crumbs">
        <ol>
          <li>
            <Link href="/">{copy.home}</Link>
          </li>
          <li>
            <Link href="/aranzmani">{copy.programs}</Link>
          </li>
          <li aria-current="page">{trip.title}</li>
        </ol>
      </nav>

      {status === "completed" ? (
        <div className="offer-notice" role="status">
          <p>{copy.completed}</p>
        </div>
      ) : null}

      <header className="offer-hero">
        <div className="offer-hero__copy">
          <div className="ui-ticket__badges">
            <Badge tone="gold">{copy.overline}</Badge>
            <Badge tone={status === "completed" ? "neutral" : "route"}>{STATUS_LABELS[language][status]}</Badge>
          </div>
          <h1 className="offer-hero__title">{trip.title}</h1>
          {tripDates(trip, language) ? <p className="offer-hero__subtitle">{tripDates(trip, language)}</p> : null}
          {description ? <p className="offer-hero__intro">{description}</p> : null}
        </div>
        <Postcard
          className="offer-hero__postcard"
          image={cover ? { src: cover, alt: trip.title } : null}
          placeName={trip.title}
          caption={trip.departureCity ? `${copy.from}: ${trip.departureCity}` : undefined}
          stampGlyph="compass"
          tilt="right"
          priority
        />
      </header>

      <div className="offer-layout">
        <div className="offer-main">
          <section className="offer-pass" aria-labelledby="prg-facts">
            <h2 className="sr-only" id="prg-facts">
              {copy.facts}
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
                <span className="offer-pass__label">{copy.price}</span>
                <Price amount={trip.price > 0 ? trip.price : null} basis="perPerson" currency={currency} language={language} />
              </div>
            </div>
          </section>

          {gallery.length ? (
            <section className="offer-section" aria-labelledby="prg-gallery">
              <h2 className="offer-section__title" id="prg-gallery">
                {copy.gallery}
              </h2>
              <ul className="prg-gallery">
                {gallery.map((item, index) => (
                  <li key={`${item.url}-${index}`}>
                    {item.mediaType === "video" ? (
                      <video src={item.url} className="prg-gallery__media" muted playsInline controls preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- Convex storage images (no optimizer quota)
                      <img src={item.url} alt={`${trip.title} ${index + 1}`} className="prg-gallery__media" loading="lazy" decoding="async" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {selected ? (
            <section className="offer-section" aria-labelledby="prg-destinations">
              <h2 className="offer-section__title" id="prg-destinations">
                {copy.destinationsTitle}
              </h2>
              <p className="prg-section-intro">{copy.destinationsIntro}</p>
              <div className="prg-dest-picker" role="group" aria-label={copy.destinationsTitle}>
                {activeDestinations.map((item) => {
                  const active = item._id === selected._id;
                  return (
                    <button
                      key={item._id}
                      type="button"
                      className={`prg-dest-chip${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => setSelectedId(item._id)}
                    >
                      <span className="prg-dest-chip__title">{item.title}</span>
                      {item.price > 0 ? (
                        <span className="prg-dest-chip__price">
                          <Price amount={item.price} basis="perPerson" currency={currencyCode(item.currency)} language={language} surface="theme" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <article className="prg-dest ui-paper">
                <div className="prg-dest__media">
                  {selectedIsSub ? (
                    // Partner sites refuse to be framed (blank box), so the program opens on their site instead.
                    <p className="prg-dest__placeholder">
                      <Compass size={28} strokeWidth={1.5} aria-hidden="true" />
                      <span>{copy.noPreview}</span>
                    </p>
                  ) : selectedImages[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Convex storage image
                    <img src={selectedImages[0]} alt={selected.title} loading="lazy" decoding="async" />
                  ) : null}
                </div>
                <div className="prg-dest__body">
                  <p className="ui-overline">{selectedIsSub ? (selected.partnerName ?? "") : copy.ourOffer}</p>
                  <h3 className="prg-dest__title">{selected.title}</h3>
                  {cleanText(selected.description) ? <p className="prg-dest__text">{cleanText(selected.description)}</p> : null}
                  <ul className="prg-meta">
                    {selected.departureCity ? (
                      <li>
                        <MapPin {...ICON} />
                        {selected.departureCity}
                      </li>
                    ) : null}
                    {selected.durationLabel ? (
                      <li>
                        <Clock3 {...ICON} />
                        {selected.durationLabel}
                      </li>
                    ) : null}
                    {selected.departureDate ? (
                      <li>
                        <CalendarDays {...ICON} />
                        {tripDates({ departureDate: selected.departureDate, returnDate: selected.returnDate ?? "" }, language)}
                      </li>
                    ) : null}
                    {selected.partnerOfferCode ? (
                      <li>
                        {copy.offerCode}: {selected.partnerOfferCode}
                      </li>
                    ) : null}
                  </ul>
                  {selected.contactNote ? <p className="prg-dest__note">{selected.contactNote}</p> : null}
                  <div className="prg-dest__actions">
                    {selected.price > 0 ? (
                      <Price amount={selected.price} basis="perPerson" currency={currencyCode(selected.currency)} language={language} />
                    ) : null}
                    {!selectedIsSub && status !== "completed" ? (
                      <AddToCartButton
                        id={selected._id}
                        type="destination"
                        title={`${selected.title} - ${trip.title}`}
                        price={selected.price}
                        currency={selected.currency}
                        imageUrl={selectedImages[0]}
                        meta={{
                          parentPackage: trip.title,
                          departureCity: selected.departureCity ?? "",
                          departureDate: selected.departureDate ?? "",
                        }}
                      />
                    ) : null}
                    {selectedIsSub && selected.externalUrl?.startsWith("https://") ? (
                      <a href={selected.externalUrl} target="_blank" rel="noreferrer" className="ui-btn ui-btn--secondary ui-btn--sm">
                        <span>{copy.openOffer}</span>
                        <ExternalLink {...ICON} />
                      </a>
                    ) : null}
                  </div>
                </div>
                {!selectedIsSub && selectedImages.length > 1 ? (
                  <ul className="prg-dest__thumbs">
                    {selectedImages.slice(1, 7).map((url, index) => (
                      <li key={url}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage image */}
                        <img src={url} alt={`${selected.title} ${index + 2}`} loading="lazy" decoding="async" />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </section>
          ) : null}

          {activeAccommodations.length ? (
            <section className="offer-section" aria-labelledby="prg-acc">
              <h2 className="offer-section__title" id="prg-acc">
                {copy.accommodationTitle}
              </h2>
              <p className="prg-section-intro">{status !== "completed" ? copy.accommodationIntro : copy.accommodationInquiry}</p>
              <ul className="prg-acc-list">
                {activeAccommodations.map((item) => {
                  const images = item.imageUrls.filter(usable);
                  const isOpen = expanded === item._id;
                  return (
                    <li key={item._id} className="prg-acc ui-paper">
                      {images[0] ? (
                        <div className="prg-acc__media">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage image */}
                          <img src={images[0]} alt={item.name} loading="lazy" decoding="async" />
                        </div>
                      ) : null}
                      <div className="prg-acc__body">
                        <p className="ui-overline">{acc[item.type]}</p>
                        <h3 className="prg-acc__title">{item.name}</h3>
                        <ul className="prg-meta">
                          <li>
                            <Users {...ICON} />
                            {copy.upTo} {item.capacity} {copy.guests(item.capacity)}
                          </li>
                          {item.boardType ? (
                            <li>
                              <Utensils {...ICON} />
                              {acc[item.boardType]}
                            </li>
                          ) : null}
                          {item.distanceToCenter ? (
                            <li>
                              <MapPin {...ICON} />
                              {item.distanceToCenter}
                            </li>
                          ) : null}
                        </ul>
                        <Price amount={item.pricePerPerson} basis="perPerson" currency={currencyCode(item.currency)} language={language} />
                        <div className="prg-acc__actions">
                          {status !== "completed" ? (
                            <AddToCartButton
                              id={item._id}
                              type="accommodation"
                              title={`${item.name} - ${trip.title}`}
                              price={item.pricePerPerson}
                              currency={item.currency}
                              imageUrl={images[0]}
                              compact
                            />
                          ) : null}
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : item._id)}
                            icon={isOpen ? <ChevronUp {...ICON} /> : <ChevronDown {...ICON} />}
                          >
                            {isOpen ? copy.less : copy.more}
                          </Button>
                        </div>
                        {isOpen ? (
                          <div className="prg-acc__more">
                            {cleanText(item.description) ? <p>{cleanText(item.description)}</p> : null}
                            {item.amenities.length ? (
                              <ul className="prg-tags">
                                {item.amenities.map((amenity, index) => (
                                  <li key={`${amenity}-${index}`}>{amenity}</li>
                                ))}
                              </ul>
                            ) : null}
                            <ul className="prg-meta">
                              {item.roomInfo ? (
                                <li>
                                  <BedDouble {...ICON} />
                                  {item.roomInfo}
                                </li>
                              ) : null}
                              {item.checkIn ? <li>{copy.checkIn}: {item.checkIn}</li> : null}
                              {item.checkOut ? <li>{copy.checkOut}: {item.checkOut}</li> : null}
                            </ul>
                            {images.length > 1 ? (
                              <ul className="prg-dest__thumbs">
                                {images.slice(1, 7).map((url, index) => (
                                  <li key={url}>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage image */}
                                    <img src={url} alt={`${item.name} ${index + 2}`} loading="lazy" decoding="async" />
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {itinerary.length ? (
            <section className="offer-section" aria-labelledby="prg-itinerary">
              <h2 className="offer-section__title" id="prg-itinerary">
                {copy.itinerary}
              </h2>
              <ol className="prg-days">
                {itinerary.map((item, index) => (
                  <li key={`${item.day}-${index}`} className="prg-day">
                    <span className="prg-day__pin">
                      {copy.day} {item.day}
                    </span>
                    <div>
                      {item.date ? <p className="prg-day__date">{formatDate(item.date, language)}</p> : null}
                      <p className="prg-day__text">{cleanText(item.description)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {trip.included.length || trip.notIncluded.length ? (
            <section className="offer-section offer-terms" aria-label={`${copy.included} / ${copy.excluded}`}>
              {trip.included.length ? (
                <div>
                  <h2 className="offer-section__title">{copy.included}</h2>
                  <ul className="offer-bullets offer-bullets--in">
                    {trip.included.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {trip.notIncluded.length ? (
                <div>
                  <h2 className="offer-section__title">{copy.excluded}</h2>
                  <ul className="offer-bullets offer-bullets--out">
                    {trip.notIncluded.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="offer-panel" aria-label={copy.panelTitle}>
          <div className="offer-panel__card ui-paper">
            <p className="ui-overline">{copy.panelTitle}</p>
            {selected ? (
              <>
                <p className="prg-panel__selected">
                  {copy.selected}: <strong>{selected.title}</strong>
                </p>
                <Price amount={selected.price > 0 ? selected.price : null} basis="perPerson" currency={currencyCode(selected.currency)} showNbsNote language={language} />
              </>
            ) : (
              <Price amount={trip.price > 0 ? trip.price : null} basis="perPerson" currency={currency} showNbsNote language={language} />
            )}
            {trip.departureDate ? (
              <p className="offer-panel__next">
                {copy.departure}: <strong>{formatDate(trip.departureDate, language)}</strong>
              </p>
            ) : null}
            {trip.depositPercentage ? (
              <p className="offer-panel__next">
                {copy.deposit}: <strong>{trip.depositPercentage}%</strong>
                {trip.depositDeadline ? ` (${copy.depositDeadline}: ${formatDate(trip.depositDeadline, language)})` : ""}
              </p>
            ) : null}
            {purchasable && !selected ? (
              <AddToCartButton
                id={trip._id}
                type="trip"
                title={trip.title}
                price={trip.price}
                currency={trip.currency}
                imageUrl={cover}
                meta={{ departureDate: trip.departureDate, departureCity: trip.departureCity }}
                className="prg-panel__cart"
              />
            ) : null}
            <Button block variant={purchasable && !selected ? "secondary" : "primary"} onClick={() => setInquiryOpen(true)} aria-haspopup="dialog" icon={<Send {...ICON} />}>
              {copy.inquiry}
            </Button>
            <p className="offer-panel__note">{purchasable ? copy.note : copy.noteInquiry}</p>
          </div>
        </aside>
      </div>

      <InquiryContainer open={inquiryOpen} onClose={() => setInquiryOpen(false)} title={copy.inquiryTitle} closeLabel={copy.close}>
        {inquiryOpen ? (
          <InquiryForm
            subject={`Aranžman: ${trip.title}`}
            offerTitle={trip.title}
            departures={[]}
            initialDeparture={trip.departureDate ? formatDate(trip.departureDate, "sr") : undefined}
            copy={dictionary.catalog}
            language={language as Language}
          />
        ) : null}
      </InquiryContainer>
    </main>
  );
}
