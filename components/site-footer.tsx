"use client";

import { Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import { InstagramGlyph } from "./ui/brand-glyphs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCategories } from "../lib/use-categories";
import { useOfferSources } from "../lib/use-offers";
import { MANUAL_RELIGIOUS_SOURCE_SLUG } from "../lib/religious";
import { toPhoneHref, useSettings } from "../lib/use-settings";
import { TRAVEL_TYPES } from "../lib/search/travel-types";
import { tripSearchHref } from "../lib/search/trip-search";
import { LanguageSwitch } from "./chrome/nav-controls";
import { useSitePreferences } from "./site-preferences-provider";

type FooterLink = { key: string; href: string; label: string };

/**
 * The back cover of the journal: ink ground (one step up in Tinta), a dashed
 * route along the top that ends in Belgrade, link columns, contact from
 * `settings` only (empty fields are hidden; nothing set → neutral fallback),
 * license when set, and the NBS note.
 */
export default function SiteFooter() {
  const pathname = usePathname();
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.chrome;
  const settings = useSettings();
  const religiousCategories = useCategories("religious");
  const sources = useOfferSources();
  const year = new Date().getFullYear();

  if (pathname.startsWith("/admin")) return null;

  const offerLinks: FooterLink[] = TRAVEL_TYPES.filter((type) => type.slug !== "verski-turizam").map((type) => ({
    key: type.slug,
    href: tripSearchHref({ tip: type.slug }),
    label: type.label[language],
  }));

  const religiousLinks: FooterLink[] = [
    { key: "all", href: "/verski-turizam", label: copy.religiousAll },
    ...religiousCategories.slice(0, 4).map((category) => ({
      key: category._id,
      href: `/verski-turizam?category=${category.slug}`,
      label: language === "sr" ? category.name.sr : category.name.en,
    })),
  ];

  const partners = sources.filter((source) => source.slug !== MANUAL_RELIGIOUS_SOURCE_SLUG && source.status !== "planned");

  const phoneHref = toPhoneHref(settings.phone);
  const contactRows: { key: string; icon: ReactNode; label: string; value: string; href?: string }[] = [
    settings.address ? { key: "address", icon: <MapPin strokeWidth={1.5} />, label: copy.addressLabel, value: settings.address } : null,
    settings.phone ? { key: "phone", icon: <Phone strokeWidth={1.5} />, label: copy.phoneLabel, value: settings.phone, href: phoneHref || undefined } : null,
    settings.email
      ? { key: "email", icon: <Mail strokeWidth={1.5} />, label: copy.emailLabel, value: settings.email, href: `mailto:${settings.email}` }
      : null,
    settings.workingHours ? { key: "hours", icon: <Clock strokeWidth={1.5} />, label: copy.hoursLabel, value: settings.workingHours } : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <footer className="sfoot" data-theme="dark">
      <div className="sfoot__route" aria-hidden="true">
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" focusable="false">
          <path d="M0 26 C 180 6, 360 34, 560 18 S 940 4, 1130 22" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="sfoot__pin" />
        <span className="sfoot__pin-label">{copy.routeHome}</span>
      </div>

      <div className="sfoot__inner">
        <div className="sfoot__brand">
          <Link href="/" className="sfoot__logo-link" aria-label={`ABLux Travel · ${copy.home}`}>
            <Image src="/logo-dark.avif" alt="" width={500} height={500} className="sfoot__logo" />
            <span className="snav__wordmark" aria-hidden="true">
              <strong>ABlux</strong>
              <small>Travel</small>
            </span>
          </Link>
          <p className="sfoot__tagline">{copy.footerTagline}</p>
          {settings.licenseNumber ? (
            <p className="sfoot__license">
              {copy.license}: {settings.licenseNumber}
            </p>
          ) : null}
        </div>

        <nav className="sfoot__columns" aria-label={copy.mainNav}>
          <FooterColumn title={copy.offers} links={[{ key: "all", href: "/ponude", label: copy.megaAll }, ...offerLinks]} />
          <FooterColumn title={copy.religious} links={religiousLinks} />
          <FooterColumn
            title={copy.rentBus}
            links={[
              { key: "vehicles", href: "/iznajmljivanje-vozila", label: copy.rentBusVehicles },
              { key: "inquiry", href: "/kontakt", label: copy.rentBusInquiry },
            ]}
          />
          <FooterColumn
            title={copy.about}
            links={[
              { key: "agency", href: "/o-nama", label: copy.aboutAgency },
              { key: "programs", href: "/aranzmani", label: copy.megaArrangements },
              { key: "destinations", href: "/destinacije", label: copy.megaDestinations },
            ]}
          />
          <section className="sfoot__col sfoot__col--contact" aria-labelledby="sfoot-contact">
            <h2 className="sfoot__heading" id="sfoot-contact">
              {copy.contact}
            </h2>
            {contactRows.length > 0 ? (
              <ul className="sfoot__contact">
                {contactRows.map((row) => (
                  <li key={row.key}>
                    <span className="sfoot__contact-icon" aria-hidden="true">
                      {row.icon}
                    </span>
                    <span className="ui-sr-only">{row.label}: </span>
                    {row.href ? <a href={row.href}>{row.value}</a> : <span>{row.value}</span>}
                  </li>
                ))}
                {settings.instagramUrl ? (
                  <li>
                    <span className="sfoot__contact-icon" aria-hidden="true">
                      <InstagramGlyph />
                    </span>
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  </li>
                ) : null}
                {[
                  { key: "facebook", href: settings.facebookUrl, label: "Facebook" },
                  { key: "tiktok", href: settings.tiktokUrl, label: "TikTok" },
                  { key: "youtube", href: settings.youtubeUrl, label: "YouTube" },
                ]
                  .filter((social) => social.href)
                  .map((social) => (
                    <li key={social.key}>
                      <span className="sfoot__contact-icon" aria-hidden="true">
                        <Globe strokeWidth={1.5} />
                      </span>
                      <a href={social.href} target="_blank" rel="noopener noreferrer">
                        {social.label}
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="sfoot__muted">{dictionary.contact.detailsPending}</p>
            )}
            <Link href="/kontakt" className="sfoot__link">
              {copy.contact} →
            </Link>
          </section>
          <section className="sfoot__col" aria-labelledby="sfoot-partners">
            <h2 className="sfoot__heading" id="sfoot-partners">
              {copy.footerPartners}
            </h2>
            {partners.length > 0 ? (
              <ul className="sfoot__list">
                {partners.slice(0, 8).map((partner) => (
                  <li key={partner.id}>
                    <span className="sfoot__partner">{partner.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sfoot__muted">{copy.partnersEmpty}</p>
            )}
            <Link href="/ponude" className="sfoot__link">
              {copy.partnersAll} →
            </Link>
          </section>
        </nav>

        <div className="sfoot__notes">
          <p>{copy.nbsNote}</p>
          <p>{copy.paymentsNote}</p>
        </div>

        <div className="sfoot__bottom">
          <p>
            © {year} ABLux Travel. {copy.rights}
          </p>
          <LanguageSwitch className="sfoot__lang" />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const id = `sfoot-${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <section className="sfoot__col" aria-labelledby={id}>
      <h2 className="sfoot__heading" id={id}>
        {title}
      </h2>
      <ul className="sfoot__list">
        {links.map((link) => (
          <li key={link.key}>
            <Link href={link.href} className="sfoot__link">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
