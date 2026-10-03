"use client";

import type { FunctionReturnType } from "convex/server";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  HandHeart,
  Leaf,
  MapPin,
  Map as MapIcon,
  MessagesSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { api } from "../../convex/_generated/api";
import { mergeRoutes, type AdminRouteCard, type HomeRoute } from "../../lib/home/default-routes";
import type { HeroScenes } from "../../lib/home/hero-manifest";
import { agencyCountLabel } from "../../lib/i18n-home";
import { offerCountLabel } from "../../lib/search/trip-search";
import { VEHICLE_RENTAL_ITEMS, VEHICLE_RENTAL_PATH, type VehicleRentalKey } from "../../lib/vehicle-rentals";
import { OfferTicket } from "../catalog/offer-ticket";
import { useSitePreferences } from "../site-preferences-provider";
import {
  BRAND_GLYPHS,
  BrassPlate,
  ButtonLink,
  CancelLines,
  CompassGlyph,
  CrossGlyph,
  Postcard,
  RouteLine,
  SectionHeading,
  Stamp,
  useReveal,
} from "../ui";
import { cn } from "../ui/cn";
import { useHeroScene } from "./scene-store";
import { SceneMedia } from "./scene-media";

export type UpcomingCard = FunctionReturnType<typeof api.catalog.upcoming>[number];
export type PartnerStripData = FunctionReturnType<typeof api.catalog.partnerStrip>;
export type VehicleImages = FunctionReturnType<typeof api.vehicleRentalImages.list>;

const ICON = { strokeWidth: 1.5, "aria-hidden": true } as const;

/* ───────────────────────── Uskoro polaze (+ landing postcard) ───────────────────────── */

export function UpcomingSection({ items, scenes }: { items: UpcomingCard[]; scenes: HeroScenes }) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.homepage;
  const active = useHeroScene((state) => state.active);
  const channel = copy.channels[active];
  const poster = scenes[active].desktop.poster;
  const listRef = useReveal<HTMLDivElement>({ selector: ".ablux-upcoming__item", y: 28, start: "top 85%" });
  const Glyph = active === "hodocasca" ? CrossGlyph : active === "mediteran" ? BRAND_GLYPHS.sea : BRAND_GLYPHS.city;

  return (
    <section className="ablux-upcoming" aria-labelledby="upcoming-title">
      <div className="ablux-landing">
        {/* The hero scene lands here on desktop (scroll morph); elsewhere this postcard is shown. */}
        <div className="ablux-landing__slot" data-hero-landing>
          <div className="ablux-landing__card ui-paper" aria-hidden="true">
            <div className="ablux-landing__deckle">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- pre-encoded AVIF poster
                <img src={poster} alt="" loading="lazy" decoding="async" width={1920} height={1080} />
              ) : null}
            </div>
            <span className="ui-postcard__stamp">
              <span className="ui-postcard__stamp-inner">
                <Glyph />
              </span>
            </span>
            <span className="ui-postcard__postmark" />
            <CancelLines className="ui-postcard__cancel" />
          </div>
        </div>
        <p className="ablux-landing__caption">
          <em>{copy.postcardFrom}</em>
          <Link href={channel.href} prefetch={false}>
            {channel.linkLabel}
            <ArrowRight {...ICON} />
          </Link>
        </p>
      </div>

      <div className="ablux-upcoming__list" ref={listRef}>
        <SectionHeading
          id="upcoming-title"
          overline={copy.upcomingOverline}
          title={
            <>
              {copy.upcomingTitle} <em>{copy.upcomingEmphasis}</em>
            </>
          }
          intro={copy.upcomingIntro}
          link={{ href: "/ponude", label: copy.upcomingLink }}
        />
        {items.length > 0 ? (
          <ul className="ablux-upcoming__items">
            {items.map((card) => (
              <li key={card.id} className="ablux-upcoming__item">
                <OfferTicket card={card} language={language} copy={dictionary.catalog} layout="row" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="ablux-upcoming__empty">
            <p>{copy.upcomingEmpty}</p>
            <div className="ablux-upcoming__empty-actions">
              <ButtonLink href="/ponude" variant="secondary">
                {copy.routesLink}
              </ButtonLink>
              <ButtonLink href="/kontakt" variant="text" icon={<Send {...ICON} />}>
                {copy.ctaInquiry}
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Najtraženije rute ───────────────────────── */

/** Dashed route through the gaps of the mosaic (1.25fr / .85fr / .85fr, two rows). */
const MOSAIC_ROUTE = "M 424 0 C 412 120, 436 260, 424 500 C 418 700, 432 860, 424 1000 M 424 500 C 520 486, 620 514, 712 500 C 800 488, 900 512, 1000 500 M 712 0 C 700 160, 724 330, 712 500 C 702 680, 724 850, 712 1000";
const MOSAIC_PINS = [
  { x: 424, y: 500, at: 0.35 },
  { x: 712, y: 500, at: 0.7 },
];

export function RoutesSection({ adminRoutes }: { adminRoutes: AdminRouteCard[] }) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.homepage;
  const routes = mergeRoutes(adminRoutes);
  const gridRef = useReveal<HTMLDivElement>({ selector: ".ablux-route-card", y: 36, stagger: 0.075, start: "top 90%" });

  return (
    <section className="ablux-routes" aria-labelledby="featured-routes-title">
      <SectionHeading
        id="featured-routes-title"
        overline={copy.routesOverline}
        ornament="compass"
        title={copy.routesTitle}
        intro={copy.routesIntro}
        link={{ href: "/ponude", label: copy.routesLink }}
      />
      <div className="ablux-route-grid" ref={gridRef}>
        <RouteLine className="ablux-route-grid__route" d={MOSAIC_ROUTE} viewBox={{ width: 1000, height: 1000 }} pins={MOSAIC_PINS} height="100%" />
        {routes.map((route, index) => (
          <RouteCard key={route.id} route={route} index={index} language={language} detailsLabel={copy.routeDetails} />
        ))}
      </div>
    </section>
  );
}

function RouteCard({ route, index, language, detailsLabel }: { route: HomeRoute; index: number; language: "sr" | "en"; detailsLabel: string }) {
  const feature = index === 0;
  const Glyph = BRAND_GLYPHS[route.glyph];
  const title = route.title[language] || route.title.sr;
  const meta = route.meta[language] || route.meta.sr;
  const body = route.body ? route.body[language] || route.body.sr : null;
  const tag = route.tag ? route.tag[language] : null;

  return (
    <Link href={route.href} className={cn("ablux-route-card", `ablux-route-card--${route.tone}`, feature && "ablux-route-card--feature")}>
      {route.local ? (
        <Image
          src={route.image}
          alt=""
          fill
          sizes={feature ? "(min-width: 1024px) 44vw, 100vw" : "(min-width: 1024px) 26vw, 100vw"}
          className="ablux-route-card__image"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Convex storage image (no optimizer quota)
        <img src={route.image} alt="" loading="lazy" decoding="async" className="ablux-route-card__image" />
      )}
      <BrassPlate number={index + 1} className="ablux-route-card__plate" />
      <span className="ablux-route-card__content">
        <strong>{title}</strong>
        <small>{meta}</small>
        {feature && body ? <span className="ablux-route-card__body">{body}</span> : null}
        <span className="ablux-route-card__tag ui-paper">
          <span>{tag ?? detailsLabel}</span>
          <Glyph aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

/* ───────────────────────── Verski turizam ───────────────────────── */

export function ReligiousSpotlight({ scenes, count }: { scenes: HeroScenes; count: number }) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.homepage;
  const poster = scenes.ostrog.mobile.poster ?? scenes.ostrog.desktop.poster;
  const ref = useReveal<HTMLElement>({ selector: ".ablux-religious__copy > *, .ablux-religious__card", y: 30 });

  return (
    <section className="ablux-religious" aria-labelledby="religious-title" ref={ref}>
      <div className="ablux-religious__card">
        <Postcard
          image={poster ? { src: poster, alt: copy.religiousCaption } : null}
          placeName={copy.religiousCaption}
          caption={copy.religiousCaption}
          stampGlyph="church"
          orientation="portrait"
          tilt="right"
          href="/verski-turizam"
        />
      </div>
      <div className="ablux-religious__copy">
        <SectionHeading
          id="religious-title"
          overline={copy.religiousOverline}
          ornament="cross"
          title={
            <>
              {copy.religiousTitle} <em>{copy.religiousEmphasis}</em>
            </>
          }
          intro={copy.religiousIntro}
        />
        <ul className="ablux-religious__points">
          {copy.religiousPoints.map((point) => (
            <li key={point}>
              <CrossGlyph aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
        <div className="ablux-religious__actions">
          <ButtonLink href="/verski-turizam" variant="ink" icon={<ArrowRight {...ICON} />}>
            {copy.religiousCta}
          </ButtonLink>
          <ButtonLink href="/ponude?tip=verski-turizam" variant="text" icon={<ArrowRight {...ICON} />} prefetch={false}>
            {count > 0 ? `${copy.religiousOffers} · ${offerCountLabel(count, language)}` : copy.religiousOffers}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 17 agencija, jedan potpis ───────────────────────── */

export function PartnerStrip({ data }: { data: PartnerStripData | null }) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.homepage;
  const partners = data?.partners ?? [];
  const ref = useReveal<HTMLUListElement>({ selector: ".ablux-partners__item", y: 22, stagger: 0.04 });

  return (
    <section className="ablux-partners" aria-labelledby="partners-title">
      <SectionHeading
        id="partners-title"
        overline={copy.partnersOverline}
        title={
          partners.length > 0 ? (
            <>
              {agencyCountLabel(partners.length, language)}, {copy.partnersTitleJoin} <em>{copy.partnersTitleEmphasis}</em>
            </>
          ) : (
            copy.partnersOverline
          )
        }
        intro={copy.partnersIntro}
        link={partners.length > 0 ? { href: "/ponude?vrsta=partner", label: copy.partnersLink } : undefined}
      />
      {partners.length > 0 ? (
        <ul className="ablux-partners__grid" ref={ref}>
          {partners.map((partner) => {
            const body = (
              <>
                <span className="ablux-partners__logo">
                  {partner.logoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small local logos, any aspect ratio
                    <img src={partner.logoPath} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <CompassGlyph aria-hidden="true" />
                  )}
                </span>
                <span className="ablux-partners__name">{partner.name}</span>
                <span className={cn("ablux-partners__count", partner.count === 0 && "ablux-partners__count--waiting")}>
                  {partner.count > 0 ? offerCountLabel(partner.count, language) : copy.partnersWaiting}
                  {partner.count > 0 ? <ArrowRight {...ICON} /> : null}
                </span>
              </>
            );
            return (
              <li key={partner.slug} className="ablux-partners__item">
                {partner.count > 0 ? (
                  <Link href={`/ponude?partner=${encodeURIComponent(partner.slug)}`} className="ablux-partners__cell ui-paper" prefetch={false}>
                    {body}
                  </Link>
                ) : (
                  <span className="ablux-partners__cell ablux-partners__cell--waiting ui-paper">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ablux-partners__empty">{copy.partnersEmpty}</p>
      )}
    </section>
  );
}

/* ───────────────────────── Zašto ABLux + proces ───────────────────────── */

const PROOF_ICONS = [ShieldCheck, ClipboardList, Leaf, HandHeart];
const PROCESS_ICONS = [MessagesSquare, MapIcon, BadgeCheck];

export function ProofSection() {
  const { dictionary } = useSitePreferences();
  const copy = dictionary.homepage;
  const ref = useReveal<HTMLElement>({ selector: ".ablux-proof__copy > *, .ablux-proof-card", y: 30, stagger: 0.07 });

  return (
    <section className="ablux-proof" aria-labelledby="proof-title" ref={ref}>
      <div className="ablux-proof__copy">
        <SectionHeading id="proof-title" overline={copy.proofOverline} title={copy.proofTitle} ornament="compass" />
        <div className="ablux-proof__document ui-paper" aria-hidden="true">
          <span className="ablux-proof__document-title">{copy.proofDocumentTitle}</span>
          <RouteLine
            className="ablux-proof__route"
            d="M 30 150 C 140 160, 200 120, 290 112 S 460 70, 560 40"
            viewBox={{ width: 600, height: 200 }}
            pins={[
              { x: 160, y: 146, at: 0.25 },
              { x: 330, y: 104, at: 0.55 },
              { x: 470, y: 66, at: 0.8 },
            ]}
            animate="enter"
            height="100%"
          />
          <span className="ablux-proof__compass">
            <CompassGlyph />
          </span>
          <Stamp className="ablux-proof__stamp" shape="round" tone="teal" code="ABLux" eyebrow="2022" decorative />
        </div>
      </div>
      <div className="ablux-proof__board">
        {copy.proofItems.map((item, index) => {
          const Icon = PROOF_ICONS[index] ?? ShieldCheck;
          return (
            <article key={item.title} className="ablux-proof-card">
              <span className="ablux-proof-card__icon" aria-hidden="true">
                <Icon strokeWidth={1.5} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          );
        })}
        <span className="ablux-proof__board-compass" aria-hidden="true">
          <CompassGlyph />
        </span>
      </div>
    </section>
  );
}

export function ProcessSection() {
  const { dictionary } = useSitePreferences();
  const copy = dictionary.homepage;
  const total = copy.processItems.length;
  const ref = useReveal<HTMLElement>({ selector: ".ablux-process-step", y: 28 });

  return (
    <section className="ablux-process" aria-labelledby="process-title" ref={ref}>
      <SectionHeading id="process-title" overline={copy.processOverline} title={copy.processTitle} align="center" ornament="compass" />
      <div className="ablux-process__rail">
        <RouteLine
          className="ablux-process__route"
          d="M 0 40 L 1000 40"
          viewBox={{ width: 1000, height: 80 }}
          pins={[
            { x: 167, y: 40, at: 0.17 },
            { x: 500, y: 40, at: 0.5 },
            { x: 833, y: 40, at: 0.83 },
          ]}
          compassAt={{ x: 0, y: 40 }}
          height="5rem"
        />
        <ol className="ablux-process__steps">
          {copy.processItems.map((item, index) => {
            const Icon = PROCESS_ICONS[index] ?? BadgeCheck;
            return (
              <li key={item.title} className="ablux-process-step">
                <BrassPlate number={index + 1} label={`${copy.processStepLabel} ${index + 1} ${copy.processOf} ${total}`} />
                <span className="ablux-process-step__icon" aria-hidden="true">
                  <Icon strokeWidth={1.5} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── Rent a bus ───────────────────────── */

const VEHICLE_FALLBACK: Record<VehicleRentalKey, string> = {
  bus: "/home-swiper/20251213_144248.avif",
  luxuryVan: "/home-swiper/20251120_160325.avif",
};

export function VehicleSection({ images, scenes }: { images: VehicleImages; scenes: HeroScenes }) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.homepage;
  const ref = useReveal<HTMLElement>({ selector: ".ablux-vehicle__copy > *, .ablux-vehicle-card", y: 32 });
  const hasRentabus = Boolean(scenes.rentabus.desktop.poster);

  return (
    <section className="ablux-vehicle" aria-labelledby="vehicle-title" ref={ref}>
      <div className="ablux-vehicle__copy">
        {hasRentabus ? <SceneMedia scene={scenes.rentabus} className="ablux-vehicle__scene" /> : null}
        <SectionHeading id="vehicle-title" overline={copy.vehicleOverline} title={copy.vehicleTitle} intro={copy.vehicleIntro} onInk />
        <Link href={VEHICLE_RENTAL_PATH} className="ablux-btn ablux-btn--gold">
          {copy.vehicleCta}
          <ArrowRight {...ICON} />
        </Link>
      </div>

      <div className="ablux-vehicle__grid">
        {VEHICLE_RENTAL_ITEMS.map((item, index) => {
          const record = images.find((entry) => entry.key === item.key);
          const imageUrl = record?.imageUrl ?? VEHICLE_FALLBACK[item.key];
          const title = item.shortTitle[language];
          return (
            <Link
              key={item.key}
              href={VEHICLE_RENTAL_PATH}
              className="ablux-vehicle-card ui-paper"
              style={{ "--stagger-index": index } as CSSProperties}
            >
              <span className="ablux-vehicle-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- real ABLux photos from Convex storage (no optimizer quota) */}
                <img src={imageUrl} alt={title} className="ablux-vehicle-card__image" loading="lazy" decoding="async" />
                <BrassPlate number={index + 1} className="ablux-vehicle-card__plate" />
              </span>
              <span className="ablux-vehicle-card__body">
                <small>{item.eyebrow[language]}</small>
                <strong className="ablux-vehicle-card__title">{title}</strong>
                <span className="ablux-vehicle-card__text">{item.description[language]}</span>
                <span className="ablux-vehicle-card__driver">
                  <BadgeCheck {...ICON} />
                  {copy.vehicleDriver}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── Završni poziv ───────────────────────── */

export function ClosingSection() {
  const { dictionary } = useSitePreferences();
  const copy = dictionary.homepage;
  const ref = useReveal<HTMLElement>({ selector: ".ablux-closing__body > *", y: 24 });

  return (
    <section className="ablux-closing" aria-labelledby="closing-title" ref={ref}>
      <span className="ablux-closing__compass" aria-hidden="true">
        <CompassGlyph />
      </span>
      <div className="ablux-closing__body">
        <p className="ablux-closing__place">
          <MapPin {...ICON} />
          {copy.closingPlace}
        </p>
        <h2 id="closing-title">{copy.closingTitle}</h2>
        <div className="ablux-closing__actions">
          <Link href="/kontakt" className="ablux-btn ablux-btn--gold">
            {copy.closingInquiry}
            <Send {...ICON} />
          </Link>
          <Link href="/ponude" className="ablux-btn ablux-btn--ghost-dark">
            {copy.closingOffers}
            <ArrowRight {...ICON} />
          </Link>
        </div>
      </div>
      <RouteLine
        className="ablux-closing__route"
        d="M 0 60 C 160 20, 300 100, 480 64 S 760 20, 1000 70"
        viewBox={{ width: 1000, height: 120 }}
        pins={[{ x: 560, y: 58, at: 0.56, label: "Beograd" }]}
        height="6rem"
      />
      <Stamp className="ablux-closing__stamp" shape="round" tone="brick" eyebrow="ABLux" code="Beograd" detail="2022" decorative />
    </section>
  );
}
