"use client";

import { BadgeCheck, Clock, ExternalLink, Mail, MapPin, Phone, Send } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { InquiryForm } from "../../catalog/inquiry-form";
import PageAdminEditorDock from "../../page-admin-editor-dock";
import { useSitePreferences } from "../../site-preferences-provider";
import { useSession } from "../../../lib/use-session";
import { toPhoneHref, useSettings } from "../../../lib/use-settings";
import { ButtonAnchor, CompassGlyph, Field, InstagramGlyph, SectionHeading, Select, Stamp, useReveal } from "../../ui";
import { PageHero } from "../page-hero";
import { CONTACT_TOPICS, CONTACT_TOPIC_LABELS, isContactTopic, type ContactSettings, type ContactTopic } from "./contact-topics";

const ICON = { strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    overline: "Kontakt",
    title: (
      <>
        Razgovarajmo o <em>putovanju</em>
      </>
    ),
    intro: "Pošaljite upit za putovanje, hodočašće ili prevoz. Javljamo Vam se sa predlogom i jasnim uslovima.",
    ctaInquiry: "Pošaljite upit",
    ctaCall: "Pozovite nas",
    crumbsHome: "Početna",
    crumbsPage: "Kontakt",
    detailsOverline: "Kancelarija",
    detailsTitle: (
      <>
        Gde nas <em>nalazite</em>
      </>
    ),
    cardName: "ABLux Travel",
    cardSub: "Turistička agencija · Beograd",
    address: "Adresa",
    phone: "Telefon",
    email: "E-pošta",
    instagram: "Instagram",
    license: "Licenca",
    hours: "Radno vreme",
    pendingTitle: "Kontakt podaci uskoro",
    pendingBody: "Do tada nam možete poslati upit putem forme na ovoj stranici. Odgovaramo telefonom ili e-poštom.",
    pendingCta: "Na formu za upit",
    mapTitle: (address: string) => `Mapa: ${address}`,
    mapOpen: "Otvorite u Google mapama",
    mapPending: "Mapa će biti prikazana kada objavimo adresu kancelarije.",
    inquiryOverline: "Upit",
    inquiryTitle: (
      <>
        Pišite <em>nam</em>
      </>
    ),
    inquiryIntro: "Opišite šta planirate: destinaciju, termin i broj putnika. Upit nije obavezujući i ne naplaćuje se.",
    inquiryNotes: [
      "Za ponude partnerskih agencija upit možete poslati i direktno sa stranice ponude.",
      <>
        Za prevoz grupa pogledajte stranicu <Link href="/iznajmljivanje-vozila">Rent a bus</Link>.
      </>,
    ],
    topicLabel: "Tema upita",
    topicNone: "Izaberite temu (nije obavezno)",
    form: {
      fieldDeparture: "Željeni termin",
      fieldMessageHint: "Npr. destinacija, okvirni datum, sastav sobe ili posebne želje.",
      successBody: "Hvala. Javićemo Vam se telefonom ili e-poštom u najkraćem roku.",
    },
  },
  en: {
    overline: "Contact",
    title: (
      <>
        Let us talk about <em>your trip</em>
      </>
    ),
    intro: "Send an inquiry for a trip, a pilgrimage or transport. We will reply with a proposal and clear terms.",
    ctaInquiry: "Send an inquiry",
    ctaCall: "Call us",
    crumbsHome: "Home",
    crumbsPage: "Contact",
    detailsOverline: "Office",
    detailsTitle: (
      <>
        Where to <em>find us</em>
      </>
    ),
    cardName: "ABLux Travel",
    cardSub: "Travel agency · Belgrade",
    address: "Address",
    phone: "Phone",
    email: "Email",
    instagram: "Instagram",
    license: "License",
    hours: "Working hours",
    pendingTitle: "Contact details coming soon",
    pendingBody: "Until then, please send us an inquiry using the form on this page. We reply by phone or email.",
    pendingCta: "Go to the inquiry form",
    mapTitle: (address: string) => `Map: ${address}`,
    mapOpen: "Open in Google Maps",
    mapPending: "The map will appear once the office address is published.",
    inquiryOverline: "Inquiry",
    inquiryTitle: (
      <>
        Write <em>to us</em>
      </>
    ),
    inquiryIntro: "Tell us what you are planning: destination, dates and number of travelers. An inquiry is free and not binding.",
    inquiryNotes: [
      "For partner agency offers you can also send an inquiry directly from the offer page.",
      <>
        For group transport, see the <Link href="/iznajmljivanje-vozila">Rent a bus</Link> page.
      </>,
    ],
    topicLabel: "Inquiry topic",
    topicNone: "Choose a topic (optional)",
    form: {
      fieldDeparture: "Preferred dates",
      fieldMessageHint: "For example destination, approximate date, room setup or special requests.",
      successBody: "Thank you. We will contact you by phone or email as soon as possible.",
    },
  },
} as const;

type ContactPageViewProps = {
  /** Settings loaded on the server (SSR); live values from the provider win once they arrive. */
  settings: ContactSettings;
  heroImage: { src: string; mobileSrc?: string } | null;
  initialTopic?: ContactTopic;
};

const hasAny = (settings: ContactSettings) => Object.values(settings).some(Boolean);

/** "Pon–Pet 9–17; Sub 10–14" or one line per row → separate lines. */
const hoursLines = (value: string) =>
  value
    .split(/\r?\n|;\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

/** https://instagram.com/ablux.travel → "@ablux.travel"; anything else stays "Instagram". */
function instagramHandle(url: string) {
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return match ? `@${match[1]}` : null;
}

const safeHttpUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : url ? `https://${url.replace(/^\/+/, "")}` : "");

export function ContactPageView({ settings: serverSettings, heroImage, initialTopic }: ContactPageViewProps) {
  const { language, dictionary } = useSitePreferences();
  const copy = COPY[language];
  const live = useSettings();
  const session = useSession();
  const settings = hasAny(live) ? live : serverSettings;
  const [topic, setTopic] = useState<ContactTopic | "">(initialTopic ?? "");

  const phoneHref = toPhoneHref(settings.phone);
  const instagramUrl = safeHttpUrl(settings.instagramUrl);
  const hours = hoursLines(settings.workingHours);
  const hasDetails = Boolean(settings.address || settings.phone || settings.email || instagramUrl || settings.licenseNumber || hours.length);

  const subject = topic ? `Kontakt: ${CONTACT_TOPIC_LABELS[topic].sr}` : "Kontakt";
  const formCopy = useMemo(() => ({ ...dictionary.catalog, ...copy.form }), [dictionary.catalog, copy.form]);
  const detailsRef = useReveal<HTMLDivElement>({ selector: ".ctc-card, .ctc-map", y: 28, stagger: 0.12 });

  const rows: { key: string; icon: ReactNode; label: string; value: ReactNode }[] = [];
  if (settings.address) rows.push({ key: "address", icon: <MapPin {...ICON} />, label: copy.address, value: <span className="ctc-pre">{settings.address}</span> });
  if (settings.phone)
    rows.push({
      key: "phone",
      icon: <Phone {...ICON} />,
      label: copy.phone,
      value: phoneHref ? <a href={phoneHref}>{settings.phone}</a> : settings.phone,
    });
  if (settings.email) rows.push({ key: "email", icon: <Mail {...ICON} />, label: copy.email, value: <a href={`mailto:${settings.email}`}>{settings.email}</a> });
  if (instagramUrl)
    rows.push({
      key: "instagram",
      icon: <InstagramGlyph />,
      label: copy.instagram,
      value: (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
          {instagramHandle(instagramUrl) ?? "Instagram"}
        </a>
      ),
    });
  if (settings.licenseNumber) rows.push({ key: "license", icon: <BadgeCheck {...ICON} />, label: copy.license, value: settings.licenseNumber });

  return (
    <main id="main-content" className="pg ctc-page">
      <PageHero
        className="ctc-hero"
        overline={copy.overline}
        title={copy.title}
        intro={copy.intro}
        crumbs={[{ href: "/", label: copy.crumbsHome }, { label: copy.crumbsPage }]}
        image={heroImage ? { ...heroImage, position: "62% 50%" } : null}
        actions={
          <>
            <ButtonAnchor href="#upit" variant="primary" icon={<Send {...ICON} />}>
              {copy.ctaInquiry}
            </ButtonAnchor>
            {phoneHref ? (
              <ButtonAnchor href={phoneHref} variant="ghost-on-ink" iconStart={<Phone {...ICON} />}>
                {copy.ctaCall}
              </ButtonAnchor>
            ) : null}
          </>
        }
      />

      <section className="pg-section ctc-details" aria-labelledby="ctc-details-title">
        <SectionHeading id="ctc-details-title" overline={copy.detailsOverline} title={copy.detailsTitle} ornament="compass" />
        <div className="ctc-details__grid" ref={detailsRef}>
          <div className="ctc-card ui-paper">
            <div className="ctc-card__head">
              <div>
                <p className="ctc-card__name">{copy.cardName}</p>
                <p className="ctc-card__sub">{copy.cardSub}</p>
              </div>
              <Stamp eyebrow="Beograd" code={language === "sr" ? "od 2022." : "since 2022"} tone="brick" shape="round" decorative className="ctc-card__stamp" />
            </div>

            {hasDetails ? (
              <>
                {rows.length ? (
                  <dl className="ctc-rows">
                    {rows.map((row) => (
                      <div key={row.key} className="ctc-row">
                        <span className="ctc-row__icon" aria-hidden="true">
                          {row.icon}
                        </span>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {hours.length ? (
                  <div className="ctc-hours">
                    <h3 className="ctc-hours__title">
                      <Clock {...ICON} />
                      {copy.hours}
                    </h3>
                    <ul>
                      {hours.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="ctc-pending">
                <h3>{copy.pendingTitle}</h3>
                <p>{copy.pendingBody}</p>
                <a className="ctc-pending__link" href="#upit">
                  {copy.pendingCta}
                  <Send {...ICON} />
                </a>
              </div>
            )}
          </div>

          {settings.address ? (
            <figure className="ctc-map ui-paper">
              <div className="ctc-map__frame">
                <iframe
                  title={copy.mapTitle(settings.address)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={"https://www.google.com/maps?q=" + encodeURIComponent(settings.address) + "&output=embed"}
                />
                <span className="ctc-map__pin" aria-hidden="true">
                  <MapPin strokeWidth={1.5} />
                </span>
              </div>
              <figcaption className="ctc-map__caption">
                <span>{settings.address}</span>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`} target="_blank" rel="noopener noreferrer">
                  {copy.mapOpen}
                  <ExternalLink {...ICON} />
                </a>
              </figcaption>
            </figure>
          ) : (
            <div className="ctc-map ctc-map--pending ui-paper">
              <div className="ctc-map__blank" aria-hidden="true">
                <svg className="ctc-map__route" viewBox="0 0 400 300" preserveAspectRatio="none">
                  <path d="M 20 250 C 90 210, 120 120, 200 140 S 320 80, 380 40" />
                </svg>
                <span className="ctc-map__compass">
                  <CompassGlyph />
                </span>
                <span className="ctc-map__dot" />
              </div>
              <p>{copy.mapPending}</p>
            </div>
          )}
        </div>
      </section>

      <section className="pg-section ctc-inquiry" id="upit" aria-labelledby="ctc-inquiry-title">
        <div className="pg-split">
          <div className="ctc-inquiry__copy">
            <SectionHeading id="ctc-inquiry-title" overline={copy.inquiryOverline} title={copy.inquiryTitle} intro={copy.inquiryIntro} />
            <ul className="ctc-notes">
              {copy.inquiryNotes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
          <div className="pg-panel ui-paper ctc-inquiry__panel">
            <Field label={copy.topicLabel} id="ctc-topic">
              <Select value={topic} onChange={(event) => setTopic(isContactTopic(event.target.value) ? event.target.value : "")}>
                <option value="">{copy.topicNone}</option>
                {CONTACT_TOPICS.map((key) => (
                  <option key={key} value={key}>
                    {CONTACT_TOPIC_LABELS[key][language]}
                  </option>
                ))}
              </Select>
            </Field>
            <InquiryForm subject={subject} departures={[]} copy={formCopy} language={language} />
          </div>
        </div>
      </section>

      {session?.isStaff ? (
        <div className="pg-section pg-section--tight">
          <PageAdminEditorDock slot="about" />
        </div>
      ) : null}
    </main>
  );
}
