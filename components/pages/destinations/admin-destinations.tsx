"use client";

import { useQuery } from "convex/react";
import { CalendarDays, Check, Compass, ExternalLink, Hash, MapPin, Route, Send, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "../../../lib/catalog/format";
import { formatMoney } from "../../../lib/format-money";
import { useCartStore } from "../../../lib/store/use-cart-store";
import { useSitePreferences } from "../../site-preferences-provider";
import { Badge, Button, ButtonAnchor, ButtonLink, SectionHeading } from "../../ui";
import { cn } from "../../ui/cn";
import type { Language, PageDestination } from "./destination-data";

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    overline: "Destinacije",
    title: (
      <>
        Izdvojene <em>destinacije</em>
      </>
    ),
    intro: "Izaberite destinaciju, proverite cenu i nastavite ka upitu ili rezervaciji.",
    listLabel: "Izbor destinacije",
    ours: "Naša ponuda",
    partner: "Partnerska ponuda",
    price: "Cena",
    code: "Šifra ponude",
    inquiry: "Pošalji upit za ovu destinaciju",
    open: "Otvori ponudu",
    noPreview: "Program ove destinacije objavljuje organizator. Otvorite ga na njegovom sajtu ili nam pošaljite upit.",
    gallery: "Još fotografija",
  },
  en: {
    overline: "Destinations",
    title: (
      <>
        Featured <em>destinations</em>
      </>
    ),
    intro: "Choose a destination, check the price and continue to an inquiry or booking.",
    listLabel: "Choose a destination",
    ours: "Our offer",
    partner: "Partner offer",
    price: "Price",
    code: "Offer code",
    inquiry: "Send an inquiry for this destination",
    open: "Open offer",
    noPreview: "The organizer publishes the program for this destination. Open it on their website or send us an inquiry.",
    gallery: "More photos",
  },
};

function dateRange(destination: PageDestination, language: Language) {
  const from = formatDate(destination.departureDate, language);
  const to = formatDate(destination.returnDate, language);
  return [from, to].filter(Boolean).join(" – ");
}

function CartButton({ destination, parentTitle, image }: { destination: PageDestination; parentTitle: string; image?: string }) {
  const { dictionary } = useSitePreferences();
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return (
    <Button
      variant="primary"
      block
      icon={added ? <Check {...ICON} /> : <ShoppingBag {...ICON} />}
      onClick={() => {
        // Same cart item as before step 12; the server prices it again at checkout.
        addItem({
          id: destination._id,
          type: "destination",
          title: `${destination.title} - ${parentTitle}`,
          price: destination.price,
          currency: destination.currency,
          imageUrl: image,
          meta: {
            parentPackage: parentTitle,
            departureCity: destination.departureCity ?? "",
            departureDate: destination.departureDate ?? "",
          },
        });
        setAdded(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAdded(false), 1800);
      }}
    >
      <span aria-live="polite">{added ? dictionary.cart.added : dictionary.cart.addToCart}</span>
    </Button>
  );
}

type AdminDestinationsProps = {
  pageSlug: string;
  initial: PageDestination[];
  /** Travel group or country name (cart line "Destinacija - Putovanje"). */
  parentTitle: string;
};

/**
 * Destinations the admin attached to this page (destinations.listByPage):
 * own ones go to the cart (IPS), "subagency" ones show the partner iframe and link.
 * Live query so the staff editor below updates the list without a reload.
 */
export function AdminDestinations({ pageSlug, initial, parentTitle }: AdminDestinationsProps) {
  const { language } = useSitePreferences();
  const copy = COPY[language];
  const locale = language === "sr" ? "sr-Latn-RS" : "en-GB";
  const live = useQuery(api.destinations.listByPage, { pageSlug });
  const destinations = useMemo(() => (live ?? initial).filter((item) => item.isActive), [live, initial]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = destinations.find((item) => item._id === selectedId) ?? destinations[0];

  if (!selected) return null;

  const isPartner = (selected.offerType ?? "own") === "subagency";
  const images = selected.imageUrls.filter(Boolean);
  const range = dateRange(selected, language);

  return (
    <section className="pg-section" aria-labelledby="dst-admin-title">
      <SectionHeading id="dst-admin-title" overline={copy.overline} title={copy.title} intro={copy.intro} />
      <div className={cn("dst-board", destinations.length > 1 && "dst-board--list")}>
        {destinations.length > 1 ? (
          <ul className="dst-board__list" aria-label={copy.listLabel}>
            {destinations.map((item) => {
              const active = item._id === selected._id;
              return (
                <li key={item._id}>
                  <button
                    type="button"
                    className="dst-pick ui-paper"
                    aria-pressed={active}
                    onClick={() => setSelectedId(item._id)}
                  >
                    <span className="dst-pick__kind">
                      {active ? <Check {...ICON} /> : null}
                      {(item.offerType ?? "own") === "subagency" ? item.partnerName || copy.partner : copy.ours}
                    </span>
                    <span className="dst-pick__title">{item.title}</span>
                    {item.price > 0 ? <span className="dst-pick__price">{formatMoney(item.price, item.currency, locale)}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <article className="dst-detail ui-paper" aria-live="polite">
          <div className="dst-detail__media">
            {isPartner ? (
              // Partner sites refuse to be framed (blank white box), so the program opens on their site instead.
              <p className="dst-detail__no-preview">
                <Compass {...ICON} size={28} />
                <span>{copy.noPreview}</span>
              </p>
            ) : images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- Convex storage image
              <img src={images[0]} alt={selected.title} loading="lazy" decoding="async" width={1200} height={800} />
            ) : null}
          </div>

          <div className="dst-detail__body">
            <div className="dst-detail__copy">
              <Badge tone={isPartner ? "route" : "gold"}>{isPartner ? selected.partnerName || copy.partner : copy.ours}</Badge>
              <h3 className="dst-detail__title">{selected.title}</h3>
              {selected.description?.trim() ? <p className="dst-detail__text">{selected.description.trim()}</p> : null}
              <ul className="dst-facts">
                {selected.departureCity ? (
                  <li>
                    <MapPin {...ICON} />
                    {selected.departureCity}
                  </li>
                ) : null}
                {selected.durationLabel ? (
                  <li>
                    <Route {...ICON} />
                    {selected.durationLabel}
                  </li>
                ) : null}
                {range ? (
                  <li>
                    <CalendarDays {...ICON} />
                    {range}
                  </li>
                ) : null}
                {selected.partnerOfferCode ? (
                  <li>
                    <Hash {...ICON} />
                    {copy.code}: {selected.partnerOfferCode}
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="dst-detail__actions">
              {selected.price > 0 ? (
                <p className="dst-detail__price">
                  <span>{copy.price}</span>
                  <strong>{formatMoney(selected.price, selected.currency, locale)}</strong>
                </p>
              ) : null}
              {!isPartner && selected.price > 0 ? (
                <CartButton destination={selected} parentTitle={parentTitle} image={images[0]} />
              ) : null}
              <ButtonLink href="/kontakt" variant={isPartner || selected.price <= 0 ? "primary" : "secondary"} block icon={<Send {...ICON} />}>
                {copy.inquiry}
              </ButtonLink>
              {isPartner && selected.externalUrl?.startsWith("http") ? (
                <ButtonAnchor href={selected.externalUrl} target="_blank" rel="noreferrer" variant="text" icon={<ExternalLink {...ICON} />}>
                  {copy.open}
                </ButtonAnchor>
              ) : null}
            </div>
          </div>

          {!isPartner && images.length > 1 ? (
            <ul className="dst-thumbs" aria-label={copy.gallery}>
              {images.slice(1).map((url, index) => (
                <li key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage image */}
                  <img src={url} alt={`${selected.title} ${index + 2}`} loading="lazy" decoding="async" width={240} height={160} />
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </div>
    </section>
  );
}
