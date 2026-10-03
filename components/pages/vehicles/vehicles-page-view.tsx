"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Bus,
  Check,
  Church,
  Expand,
  GraduationCap,
  PartyPopper,
  Phone,
  Plane,
  Send,
  Trophy,
  Van,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { api } from "../../../convex/_generated/api";
import type { HeroScene } from "../../../lib/home/hero-manifest";
import { toPhoneHref, useSettings } from "../../../lib/use-settings";
import { useSession } from "../../../lib/use-session";
import { VEHICLE_RENTAL_ITEMS, type VehicleRentalItem, type VehicleRentalKey } from "../../../lib/vehicle-rentals";
import { InquiryForm } from "../../catalog/inquiry-form";
import { SceneMedia } from "../../home/scene-media";
import { useSitePreferences } from "../../site-preferences-provider";
import { BrassPlate, ButtonAnchor, SectionHeading, Stamp, useReveal } from "../../ui";
import { cn } from "../../ui/cn";
import { PageHero } from "../page-hero";
import { VehicleLightbox, type VehiclePhoto } from "./vehicle-lightbox";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type VehicleImageRecords = FunctionReturnType<typeof api.vehicleRentalImages.list>;

type Language = "sr" | "en";

const ICON = { strokeWidth: 1.5, "aria-hidden": true } as const;

/** The only vehicle facts we state (PRODUCT.md): a Setra coach and a Mercedes Sprinter van. */
const VEHICLE_MAKE: Record<VehicleRentalKey, string> = {
  bus: "Setra",
  luxuryVan: "Mercedes Sprinter",
};

/** Stored with the inquiry so the office sees which vehicle was asked about. */
const VEHICLE_SUBJECT: Record<VehicleRentalKey, string> = {
  bus: "Rent a bus: autobus",
  luxuryVan: "Rent a bus: kombi",
};

const VEHICLE_ANCHOR: Record<VehicleRentalKey, string> = {
  bus: "autobus",
  luxuryVan: "kombi",
};

const VEHICLE_ICON: Record<VehicleRentalKey, LucideIcon> = {
  bus: Bus,
  luxuryVan: Van,
};

/** Real ABLux photos (public/home-swiper), used only when a vehicle has no image in the database. */
const VEHICLE_FALLBACK: Record<VehicleRentalKey, string[]> = {
  bus: ["/home-swiper/20260102_093601.avif", "/home-swiper/20251229_233453.avif"],
  luxuryVan: ["/home-swiper/20251120_160325.avif", "/home-swiper/20251120_155602.avif"],
};

const USE_CASE_ICONS: LucideIcon[] = [GraduationCap, Church, Briefcase, Plane, Trophy, PartyPopper];

const COPY = {
  sr: {
    heroOverline: "Rent a bus · Iznajmljivanje vozila",
    heroTitle: (
      <>
        Autobus i kombi <em>sa vozačem</em>
      </>
    ),
    heroIntro:
      "Za grupna putovanja, hodočašća, poslovne transfere i privatne polaske organizujemo vozilo, vozača i rutu, tako da put bude miran, tačan i udoban.",
    heroInquiry: "Pošaljite upit",
    heroVehicles: "Pogledajte vozila",
    heroFacts: ["Setra autobus", "Mercedes Sprinter", "Profesionalni vozač"],
    crumbsHome: "Početna",
    crumbsPage: "Iznajmljivanje vozila",
    vehiclesOverline: "Vozila",
    vehiclesTitle: (
      <>
        Izaberite <em>vozilo</em>
      </>
    ),
    vehiclesIntro: "Autobus za veće grupe i luksuzni kombi za manje društvo. Oba vozila dolaze sa profesionalnim vozačem.",
    vehicleStamp: "Vozilo",
    bestFor: "Pogodno za",
    capacity: "Kapacitet",
    included: "Usluga uključuje",
    gallery: "Fotografije vozila",
    openPhoto: "Uvećajte fotografiju",
    enlarge: "Uvećaj",
    photo: "fotografija",
    vehicleCta: { bus: "Upit za autobus", luxuryVan: "Upit za kombi" } as Record<VehicleRentalKey, string>,
    lightbox: {
      close: "Zatvori",
      previous: "Prethodna fotografija",
      next: "Sledeća fotografija",
      counter: (current: number, total: number) => `${current} / ${total}`,
    },
    usesOverline: "Za koje prilike",
    usesTitle: (
      <>
        Kuda Vas <em>vozimo</em>
      </>
    ),
    usesIntro: "Plan rute, pauze i termini vožnje dogovaraju se unapred, za jednodnevne i višednevne programe.",
    uses: [
      { title: "Ekskurzije", body: "Školska i studentska putovanja uz dogovoren plan puta i pauze." },
      { title: "Hodočašća", body: "Parohijske i organizovane grupe do manastira i svetinja." },
      { title: "Poslovna putovanja", body: "Korporativni događaji, sajmovi i prevoz poslovnih gostiju." },
      { title: "Aerodromski transferi", body: "Direktan prevoz do aerodroma i nazad, bez nepotrebnih zadržavanja." },
      { title: "Sportski klubovi", body: "Prevoz ekipa na utakmice, turnire i pripreme." },
      { title: "Posebne prilike", body: "Venčanja, proslave i privatni polasci kada je važan komfor." },
    ],
    processOverline: "Kako funkcioniše",
    processTitle: (
      <>
        Od upita do <em>polaska</em>
      </>
    ),
    steps: [
      { title: "Pošaljite upit", body: "Navedite datum, relaciju, broj putnika i očekivano trajanje puta." },
      { title: "Predlog i uslovi", body: "Pripremamo predlog vozila, okvir rute i uslove najma." },
      { title: "Polazak", body: "Nakon potvrde, vozač i vozilo se organizuju prema dogovorenom planu." },
    ],
    stepLabel: (index: number, total: number) => `Korak ${index} od ${total}`,
    inquiryOverline: "Upit za najam",
    inquiryTitle: (
      <>
        Potreban Vam je autobus <em>ili kombi</em>?
      </>
    ),
    inquiryIntro: "Pošaljite osnovne detalje puta i dobićete konkretan predlog za najam sa vozačem.",
    checklistTitle: "Korisno je da navedete",
    checklist: ["Datum polaska i povratka", "Relaciju i usputna stajališta", "Broj putnika i prtljag", "Posebne želje i napomene"],
    phoneLine: "Radije telefonom?",
    choiceLegend: "Vozilo",
    choice: { bus: "Autobus", luxuryVan: "Luksuzni kombi" } as Record<VehicleRentalKey, string>,
    form: {
      fieldDeparture: "Datum ili period",
      fieldMessage: "Relacija i detalji",
      fieldMessageHint: "Npr. Beograd – Ostrog – Beograd, povratak istog dana. Za grupe veće od 20 putnika navedite tačan broj.",
      successBody: "Hvala. Javićemo Vam se telefonom ili e-poštom sa predlogom vozila i uslovima najma.",
    },
    staffLink: "Uredite fotografije vozila",
  },
  en: {
    heroOverline: "Rent a bus · Vehicle rental",
    heroTitle: (
      <>
        Coach and van <em>with a driver</em>
      </>
    ),
    heroIntro:
      "For group trips, pilgrimages, business transfers and private departures, we arrange the vehicle, the driver and the route, so the journey stays calm, punctual and comfortable.",
    heroInquiry: "Send an inquiry",
    heroVehicles: "See the vehicles",
    heroFacts: ["Setra coach", "Mercedes Sprinter", "Professional driver"],
    crumbsHome: "Home",
    crumbsPage: "Vehicle rental",
    vehiclesOverline: "Vehicles",
    vehiclesTitle: (
      <>
        Choose the <em>vehicle</em>
      </>
    ),
    vehiclesIntro: "A coach for larger groups and a luxury van for smaller parties. Both come with a professional driver.",
    vehicleStamp: "Vehicle",
    bestFor: "Best for",
    capacity: "Capacity",
    included: "Service includes",
    gallery: "Vehicle photos",
    openPhoto: "Enlarge the photo",
    enlarge: "Enlarge",
    photo: "photo",
    vehicleCta: { bus: "Ask about the coach", luxuryVan: "Ask about the van" } as Record<VehicleRentalKey, string>,
    lightbox: {
      close: "Close",
      previous: "Previous photo",
      next: "Next photo",
      counter: (current: number, total: number) => `${current} / ${total}`,
    },
    usesOverline: "Occasions",
    usesTitle: (
      <>
        Where we <em>drive</em> you
      </>
    ),
    usesIntro: "Route, stops and driving times are agreed in advance, for one-day and multi-day programs.",
    uses: [
      { title: "School trips", body: "School and student trips with an agreed route and stops." },
      { title: "Pilgrimages", body: "Parish and organized groups to monasteries and holy sites." },
      { title: "Business travel", body: "Corporate events, trade fairs and transport for business guests." },
      { title: "Airport transfers", body: "Direct transport to the airport and back, without unnecessary delays." },
      { title: "Sports clubs", body: "Team transport to matches, tournaments and training camps." },
      { title: "Special occasions", body: "Weddings, celebrations and private departures when comfort matters." },
    ],
    processOverline: "How it works",
    processTitle: (
      <>
        From inquiry to <em>departure</em>
      </>
    ),
    steps: [
      { title: "Send an inquiry", body: "Tell us the date, route, number of passengers and expected trip duration." },
      { title: "Proposal and terms", body: "We prepare a vehicle proposal, a route outline and the rental terms." },
      { title: "Departure", body: "After confirmation, the driver and vehicle are arranged according to the agreed plan." },
    ],
    stepLabel: (index: number, total: number) => `Step ${index} of ${total}`,
    inquiryOverline: "Rental inquiry",
    inquiryTitle: (
      <>
        Need a coach <em>or a van</em>?
      </>
    ),
    inquiryIntro: "Send the basic trip details and you will receive a concrete proposal for a rental with a driver.",
    checklistTitle: "Helpful to include",
    checklist: ["Departure and return date", "Route and stops on the way", "Number of passengers and luggage", "Special requests and notes"],
    phoneLine: "Prefer to call?",
    choiceLegend: "Vehicle",
    choice: { bus: "Coach", luxuryVan: "Luxury van" } as Record<VehicleRentalKey, string>,
    form: {
      fieldDeparture: "Date or period",
      fieldMessage: "Route and details",
      fieldMessageHint: "For example Belgrade – Ostrog – Belgrade, same-day return. For groups larger than 20, please give the exact number.",
      successBody: "Thank you. We will contact you by phone or email with a vehicle proposal and the rental terms.",
    },
    staffLink: "Edit vehicle photos",
  },
} as const;

type VehiclesCopy = (typeof COPY)[Language];

type VehiclesPageViewProps = {
  /** Manifest scene "rentabus" when it has a poster; otherwise the first bus photo is the hero. */
  scene: HeroScene | null;
  images: VehicleImageRecords;
};

function photosFor(item: VehicleRentalItem, records: VehicleImageRecords, language: Language, copy: VehiclesCopy): VehiclePhoto[] {
  const record = records.find((entry) => entry.key === item.key);
  const stored = [record?.imageUrl ?? null, ...(record?.additionalImageUrls ?? [])].filter((url): url is string => Boolean(url));
  const urls = stored.length ? stored : VEHICLE_FALLBACK[item.key];
  const title = `${VEHICLE_MAKE[item.key]}: ${item.shortTitle[language]}`;
  return urls.map((src, index) => ({ src, alt: index === 0 ? title : `${title}, ${copy.photo} ${index + 1}` }));
}

export function VehiclesPageView({ scene, images }: VehiclesPageViewProps) {
  const { language, dictionary } = useSitePreferences();
  const copy = COPY[language];
  const settings = useSettings();
  const session = useSession();
  const [vehicle, setVehicle] = useState<VehicleRentalKey>("bus");
  const [lightbox, setLightbox] = useState<{ key: VehicleRentalKey; index: number } | null>(null);
  const pageRef = useRef<HTMLElement>(null);

  const photos = useMemo(() => {
    const map = new Map<VehicleRentalKey, VehiclePhoto[]>();
    for (const item of VEHICLE_RENTAL_ITEMS) map.set(item.key, photosFor(item, images, language, copy));
    return map;
  }, [images, language, copy]);

  const heroPhoto = photos.get("bus")?.[0];
  const phoneHref = toPhoneHref(settings.phone);

  const formCopy = useMemo(() => ({ ...dictionary.catalog, ...copy.form }), [dictionary.catalog, copy.form]);

  const onLightboxChange = useCallback((index: number | null) => {
    setLightbox((current) => (index === null || !current ? null : { ...current, index }));
  }, []);

  const askAbout = (key: VehicleRentalKey) => {
    setVehicle(key);
    const target = document.getElementById("upit");
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => target.querySelector<HTMLInputElement>('input[name="fullName"]')?.focus({ preventScroll: true }), reduced ? 0 : 600);
  };

  // Real photos move only by code: light parallax on the photo frames (DESIGN.md → Imagery).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".veh-photo__frame, .veh-hero-wrap .pg-hero__media").forEach((frame) => {
          gsap.fromTo(
            frame,
            { yPercent: frame.classList.contains("pg-hero__media") ? 0 : -4 },
            {
              yPercent: frame.classList.contains("pg-hero__media") ? 6 : 4,
              ease: "none",
              scrollTrigger: { trigger: frame.parentElement, start: frame.classList.contains("pg-hero__media") ? "top top" : "top bottom", end: "bottom top", scrub: 0.8 },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: pageRef },
  );

  const usesRef = useReveal<HTMLUListElement>({ selector: ".veh-use", y: 24 });
  const stepsRef = useReveal<HTMLOListElement>({ selector: ".veh-step", y: 28 });

  const lightboxPhotos = lightbox ? (photos.get(lightbox.key) ?? []) : [];

  return (
    <main id="main-content" className="pg veh-page" ref={pageRef}>
      <div className="veh-hero-wrap">
        <PageHero
          size="lg"
          className="veh-hero"
          overline={copy.heroOverline}
          title={copy.heroTitle}
          intro={copy.heroIntro}
          crumbs={[{ href: "/", label: copy.crumbsHome }, { label: copy.crumbsPage }]}
          media={
            scene ? (
              <>
                <SceneMedia scene={scene} shape="wide" className="veh-hero__scene veh-hero__scene--wide" />
                <SceneMedia scene={scene} shape="tall" className="veh-hero__scene veh-hero__scene--tall" />
              </>
            ) : undefined
          }
          image={!scene && heroPhoto ? { src: heroPhoto.src, alt: "" } : null}
          actions={
            <>
              <ButtonAnchor href="#upit" variant="primary" icon={<Send {...ICON} />}>
                {copy.heroInquiry}
              </ButtonAnchor>
              <ButtonAnchor href="#vozila" variant="ghost-on-ink" icon={<ArrowDown {...ICON} />}>
                {copy.heroVehicles}
              </ButtonAnchor>
            </>
          }
        >
          <ul className="pg-hero__facts veh-hero__facts">
            {copy.heroFacts.map((fact) => (
              <li key={fact}>
                <BadgeCheck {...ICON} />
                {fact}
              </li>
            ))}
          </ul>
        </PageHero>
      </div>

      <section className="pg-section veh-vehicles" id="vozila" aria-labelledby="veh-vehicles-title">
        <SectionHeading id="veh-vehicles-title" overline={copy.vehiclesOverline} title={copy.vehiclesTitle} intro={copy.vehiclesIntro} ornament="compass" />
        <div className="veh-vehicles__list">
          {VEHICLE_RENTAL_ITEMS.map((item, index) => (
            <VehicleSpread
              key={item.key}
              item={item}
              index={index}
              photos={photos.get(item.key) ?? []}
              language={language}
              copy={copy}
              onOpen={(photoIndex) => setLightbox({ key: item.key, index: photoIndex })}
              onAsk={() => askAbout(item.key)}
            />
          ))}
        </div>
        {session?.isStaff ? (
          <p className="veh-staff">
            <Link href="/admin/iznajmljivanje-vozila">
              {copy.staffLink}
              <ArrowRight {...ICON} />
            </Link>
          </p>
        ) : null}
      </section>

      <section className="pg-section veh-uses-wrap" aria-labelledby="veh-uses-title">
        <div className="veh-uses">
          <SectionHeading id="veh-uses-title" overline={copy.usesOverline} title={copy.usesTitle} intro={copy.usesIntro} onInk />
          <ul className="veh-uses__grid" ref={usesRef}>
            {copy.uses.map((use, index) => {
              const Icon = USE_CASE_ICONS[index] ?? Bus;
              return (
                <li key={use.title} className="veh-use">
                  <span className="veh-use__icon">
                    <Icon {...ICON} />
                  </span>
                  <h3>{use.title}</h3>
                  <p>{use.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="pg-section veh-process" aria-labelledby="veh-process-title">
        <SectionHeading id="veh-process-title" overline={copy.processOverline} title={copy.processTitle} align="center" />
        <ol className="veh-steps" ref={stepsRef}>
          {copy.steps.map((step, index) => (
            <li key={step.title} className="veh-step">
              <BrassPlate number={index + 1} label={copy.stepLabel(index + 1, copy.steps.length)} />
              <span className="veh-step__pin" aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="pg-section veh-inquiry" id="upit" aria-labelledby="veh-inquiry-title">
        <div className="pg-split">
          <div className="veh-inquiry__copy">
            <SectionHeading id="veh-inquiry-title" overline={copy.inquiryOverline} title={copy.inquiryTitle} intro={copy.inquiryIntro} />
            <h3 className="veh-inquiry__subtitle">{copy.checklistTitle}</h3>
            <ul className="veh-checks">
              {copy.checklist.map((line) => (
                <li key={line}>
                  <Check {...ICON} />
                  {line}
                </li>
              ))}
            </ul>
            {phoneHref ? (
              <p className="veh-inquiry__phone">
                <span>{copy.phoneLine}</span>
                <a href={phoneHref}>
                  <Phone {...ICON} />
                  {settings.phone}
                </a>
              </p>
            ) : null}
          </div>

          <div className="pg-panel ui-paper veh-inquiry__panel">
            <fieldset className="veh-choice">
              <legend className="veh-choice__legend">{copy.choiceLegend}</legend>
              <div className="veh-choice__options">
                {VEHICLE_RENTAL_ITEMS.map((item) => {
                  const Icon = VEHICLE_ICON[item.key];
                  return (
                    <label key={item.key} className="veh-choice__option">
                      <input type="radio" name="veh-vehicle" value={item.key} checked={vehicle === item.key} onChange={() => setVehicle(item.key)} />
                      <Icon {...ICON} />
                      <span className="veh-choice__text">
                        <strong>{copy.choice[item.key]}</strong>
                        <small>{VEHICLE_MAKE[item.key]}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <InquiryForm subject={VEHICLE_SUBJECT[vehicle]} departures={[]} copy={formCopy} language={language} />
          </div>
        </div>
      </section>

      <VehicleLightbox photos={lightboxPhotos} index={lightbox?.index ?? null} onIndexChange={onLightboxChange} labels={copy.lightbox} />
    </main>
  );
}

type VehicleSpreadProps = {
  item: VehicleRentalItem;
  index: number;
  photos: VehiclePhoto[];
  language: Language;
  copy: VehiclesCopy;
  onOpen: (index: number) => void;
  onAsk: () => void;
};

function VehicleSpread({ item, index, photos, language, copy, onOpen, onAsk }: VehicleSpreadProps) {
  const ref = useReveal<HTMLElement>({ selector: ".veh-vehicle__media, .veh-vehicle__sheet", y: 32, stagger: 0.12 });
  const [main, ...rest] = photos;
  const titleId = `veh-${item.key}-title`;

  return (
    <article className={cn("veh-vehicle", index % 2 === 1 && "veh-vehicle--reverse")} id={VEHICLE_ANCHOR[item.key]} aria-labelledby={titleId} ref={ref}>
      <div className="veh-vehicle__media">
        {main ? (
          <button type="button" className="veh-photo veh-photo--main" aria-label={`${copy.openPhoto}: ${main.alt}`} onClick={() => onOpen(0)}>
            <PhotoFrame photo={main} eager={index === 0} />
            <BrassPlate number={index + 1} className="veh-photo__plate" />
            <span className="veh-photo__hint" aria-hidden="true">
              <Expand {...ICON} />
              {copy.enlarge}
            </span>
          </button>
        ) : null}
        {rest.length ? (
          <ul className="veh-thumbs" aria-label={copy.gallery}>
            {rest.map((photo, photoIndex) => (
              <li key={`${photo.src}-${photoIndex}`}>
                <button type="button" className="veh-photo veh-photo--thumb" aria-label={`${copy.openPhoto}: ${photo.alt}`} onClick={() => onOpen(photoIndex + 1)}>
                  <PhotoFrame photo={photo} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="veh-vehicle__sheet ui-paper">
        <div className="veh-vehicle__head">
          <div>
            <p className="veh-vehicle__eyebrow">{item.eyebrow[language]}</p>
            <h3 className="veh-vehicle__title" id={titleId}>
              {item.title[language]}
            </h3>
          </div>
          <Stamp eyebrow={copy.vehicleStamp} code={VEHICLE_MAKE[item.key]} tone={index % 2 === 1 ? "brick" : "teal"} className="veh-vehicle__stamp" />
        </div>
        <p className="veh-vehicle__text">{item.description[language]}</p>
        <dl className="veh-facts">
          <Fact label={copy.bestFor}>{item.bestFor[language]}</Fact>
          <Fact label={copy.capacity}>{item.capacity[language]}</Fact>
        </dl>
        <h4 className="veh-vehicle__subtitle">{copy.included}</h4>
        <ul className="veh-checks veh-checks--sheet">
          {item.highlights.map((highlight) => (
            <li key={highlight.sr}>
              <Check {...ICON} />
              {highlight[language]}
            </li>
          ))}
        </ul>
        <button type="button" className="ui-btn ui-btn--ink veh-vehicle__cta" onClick={onAsk}>
          <span>{copy.vehicleCta[item.key]}</span>
          <ArrowRight {...ICON} />
        </button>
      </div>
    </article>
  );
}

function PhotoFrame({ photo, eager = false }: { photo: VehiclePhoto; eager?: boolean }) {
  return (
    <span className="veh-photo__window">
      <span className="veh-photo__frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- real ABLux photos from Convex storage (no optimizer quota) */}
        <img src={photo.src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" width={1200} height={900} />
      </span>
      <span className="veh-photo__grade" aria-hidden="true" />
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
