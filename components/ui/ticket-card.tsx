import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_GLYPHS, type BrandGlyphName } from "./brand-glyphs";
import { cn } from "./cn";
import { Price, type PriceBasis } from "./price";
import { Stamp } from "./stamp";

export type TicketTone = "brick" | "teal" | "teal-deep";

export type TicketMetaItem = {
  icon?: ReactNode;
  /** Visible text; include all facts the stamp shows (the stamp is decorative). */
  label: ReactNode;
};

export type TicketCardProps = {
  href: string;
  title: ReactNode;
  /** "VERSKI TURIZAM · GRČKA" — category and destination, middle-dot separated. */
  overline?: ReactNode;
  meta?: TicketMetaItem[];
  /** Small badges above the overline ("ABLux program", "Akcija"). */
  badges?: ReactNode;
  /** "stacked": the vertical layout at every width (catalog grid cells). */
  layout?: "row" | "stacked";
  /** Stub image (4:3). Partner images: plain <img loading="lazy">, never optimized. */
  image?: { src: string; alt: string } | null;
  /** Engraved glyph in an icon ring when there is no image. */
  glyph?: BrandGlyphName;
  tone?: TicketTone;
  price?: { amount?: number | null; basis?: PriceBasis | null; from?: boolean; currency?: string; oldAmount?: number | null };
  stamp?: { eyebrow?: ReactNode; code: ReactNode; detail?: ReactNode };
  /** Partner offers: "Organizator: {naziv}" and "Licenca: {broj}" when known (from data, never invented). */
  organizer?: { name: string; license?: string | null } | null;
  /** Secondary action, e.g. <Button>Pošalji upit</Button>. It sits above the card link. */
  action?: ReactNode;
  soldOut?: boolean;
  language?: "sr" | "en";
  /** Heading level of the title inside the surrounding page outline. */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
};

const COPY = {
  sr: { organizer: "Organizator", license: "Licenca", soldOut: "RASPRODATO", details: "Detalji" },
  en: { organizer: "Organizer", license: "License", soldOut: "SOLD OUT", details: "Details" },
};

/**
 * Boarding-pass offer card: stub (photo or glyph) · perforation with notches ·
 * body (overline, serif title, meta) · price, stamp, action.
 * The whole card is one link; the secondary action is a separate focusable control.
 */
export function TicketCard({
  href,
  title,
  overline,
  badges,
  layout = "row",
  meta = [],
  image,
  glyph = "compass",
  tone = "teal",
  price,
  stamp,
  organizer,
  action,
  soldOut = false,
  language = "sr",
  headingLevel: Heading = "h3",
  className,
}: TicketCardProps) {
  const copy = COPY[language];
  const Glyph = BRAND_GLYPHS[glyph];
  const stampTone = tone === "brick" ? "brick" : "ink";

  return (
    <article
      className={cn(
        "ui-ticket",
        tone !== "teal" && `ui-ticket--${tone}`,
        layout === "stacked" && "ui-ticket--stacked",
        soldOut && "ui-ticket--sold",
        className,
      )}
    >
      <div className="ui-ticket__paper ui-paper">
        <div className="ui-ticket__stub">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- partner CDNs: no Vercel image optimization
            <img src={image.src} alt={image.alt} loading="lazy" decoding="async" width={480} height={360} />
          ) : (
            <span className="ui-ticket__glyph">
              <Glyph />
            </span>
          )}
        </div>

        <div className="ui-ticket__body">
          {badges ? <div className="ui-ticket__badges">{badges}</div> : null}
          {overline ? <p className="ui-overline ui-ticket__overline">{overline}</p> : null}
          <Heading className="ui-ticket__title">
            <Link className="ui-ticket__link" href={href}>
              {title}
            </Link>
          </Heading>
          {meta.length > 0 ? (
            <ul className="ui-ticket__meta">
              {meta.map((item, index) => (
                <li key={index}>
                  {item.icon}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {organizer ? (
            <p className="ui-ticket__organizer">
              {copy.organizer}: <strong>{organizer.name}</strong>
              {organizer.license ? ` · ${copy.license}: ${organizer.license}` : null}
            </p>
          ) : null}
        </div>

        <div className="ui-ticket__side">
          {soldOut ? (
            <Stamp code={copy.soldOut} tone="brick" shape="status" />
          ) : stamp ? (
            <Stamp eyebrow={stamp.eyebrow} code={stamp.code} detail={stamp.detail} tone={stampTone} decorative />
          ) : (
            <span />
          )}
          {price ? (
            <Price
              amount={price.amount}
              basis={price.basis}
              from={price.from}
              currency={price.currency}
              oldAmount={price.oldAmount}
              language={language}
            />
          ) : null}
          {action && !soldOut ? <div className="ui-ticket__actions">{action}</div> : null}
        </div>
      </div>
    </article>
  );
}
