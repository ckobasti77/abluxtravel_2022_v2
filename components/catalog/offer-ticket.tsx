import type { FunctionReturnType } from "convex/server";
import { BedDouble, Bus, CalendarDays, Clock3, MapPin, Plane, Ship, TrainFront } from "lucide-react";
import type { api } from "../../convex/_generated/api";
import type { CatalogCopy } from "../../lib/i18n-catalog";
import { badgeLabel, boardLabel, durationText, formatShortDate, moreDatesLabel, starsText, transportLabel, uiBasis, type Language } from "../../lib/catalog/format";
import { getTravelType, isTravelTypeSlug } from "../../lib/search/travel-types";
import { Badge, ButtonLink, TicketCard, type TicketMetaItem, type TicketTone } from "../ui";

export type CatalogCard = FunctionReturnType<typeof api.catalog.search>["items"][number];

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;

function toneOf(card: CatalogCard): TicketTone {
  if (card.travelTypes.includes("verski-turizam")) return "brick";
  if (card.travelTypes.includes("evropski-gradovi")) return "teal-deep";
  return "teal";
}

function TransportIcon({ transport }: { transport: CatalogCard["transports"][number] }) {
  if (transport === "plane") return <Plane {...ICON} />;
  if (transport === "ship") return <Ship {...ICON} />;
  if (transport === "train") return <TrainFront {...ICON} />;
  return <Bus {...ICON} />;
}

type OfferTicketProps = {
  card: CatalogCard;
  language: Language;
  copy: CatalogCopy;
  headingLevel?: "h2" | "h3" | "h4";
  /** Carries the travelers count from the search to the inquiry form. */
  travelers?: number;
  /** "stacked" in grids (catalog), "row" for lists (homepage departures). */
  layout?: "row" | "stacked";
};

/** Catalog card: a stacked boarding pass for one ABLux program or partner offer. */
export function OfferTicket({ card, language, copy, headingLevel = "h3", travelers, layout = "stacked" }: OfferTicketProps) {
  const typeSlug = card.travelTypes.find(isTravelTypeSlug);
  const type = typeSlug ? getTravelType(typeSlug) : undefined;
  const overline = [type?.label[language], card.countryName].filter(Boolean).join(" · ");
  const isAblux = card.kind === "ablux";
  const duration = durationText(card, language);
  const stars = starsText(card.stars);

  const meta: TicketMetaItem[] = [];
  if (card.place) meta.push({ icon: <MapPin {...ICON} />, label: card.place });
  meta.push({
    icon: <CalendarDays {...ICON} />,
    label: card.nextDepartureDate
      ? `${formatShortDate(card.nextDepartureDate, language)}${card.departureCount > 1 ? ` · ${moreDatesLabel(card.departureCount - 1, language)}` : ""}`
      : copy.onRequestDates,
  });
  if (duration) meta.push({ icon: <Clock3 {...ICON} />, label: duration });
  if (card.transports.length) {
    meta.push({
      icon: <TransportIcon transport={card.transports[0]} />,
      label: card.transports.map((transport) => transportLabel(transport, copy)).join(", "),
    });
  }
  if (card.offerKind === "stay" && (stars || card.board)) {
    meta.push({
      icon: <BedDouble {...ICON} />,
      label: [stars, card.board ? boardLabel(card.board, copy) : null].filter(Boolean).join(" · "),
    });
  }

  const badges = [
    isAblux ? (
      <Badge key="ablux" tone="gold">
        {copy.abluxProgram}
      </Badge>
    ) : null,
    ...card.badges.map((badge) => {
      const label = badgeLabel(badge, copy);
      return label ? (
        <Badge key={badge} tone={badge === "promo" || badge === "last_minute" ? "alert" : "route"}>
          {label}
        </Badge>
      ) : null;
    }),
  ].filter(Boolean);

  const inquiryHref = `${card.href}?upit=1${travelers ? `&putnika=${travelers}` : ""}`;
  const date = card.nextDepartureDate;

  return (
    <TicketCard
      layout={layout}
      href={card.href}
      title={card.title}
      overline={overline || undefined}
      badges={badges.length ? badges : undefined}
      meta={meta}
      image={card.coverUrl ? { src: card.coverUrl, alt: [card.title, card.place].filter(Boolean).join(", ") } : null}
      glyph={type?.glyph ?? "compass"}
      tone={toneOf(card)}
      price={{
        amount: card.priceKind === "from" ? card.priceFrom : null,
        basis: uiBasis(card.priceBasis),
        currency: card.currency,
        oldAmount: card.priceOld,
      }}
      stamp={
        date
          ? { eyebrow: copy.stampDeparture, code: formatShortDate(date, language), detail: date.slice(0, 4) }
          : { eyebrow: copy.stampTerm, code: copy.stampOnRequest }
      }
      organizer={isAblux ? null : { name: card.organizerName, license: card.organizerLicense }}
      action={
        <ButtonLink href={isAblux ? card.href : inquiryHref} variant="secondary" size="sm" prefetch={false}>
          {isAblux ? copy.reserve : copy.sendInquiry}
        </ButtonLink>
      }
      language={language}
      headingLevel={headingLevel}
    />
  );
}
