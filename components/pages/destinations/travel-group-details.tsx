"use client";

import { Check, X } from "lucide-react";
import { formatDate } from "../../../lib/catalog/format";
import { useSitePreferences } from "../../site-preferences-provider";
import { SectionHeading } from "../../ui";
import type { TravelGroup } from "./destination-data";

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: {
    galleryOverline: "Iz putovanja",
    galleryTitle: (
      <>
        Fotografije i <em>snimci</em>
      </>
    ),
    galleryLabel: "Galerija putovanja (pomerajte vodoravno)",
    day: "dan",
    includedOverline: "Uslovi",
  },
  en: {
    galleryOverline: "From the trip",
    galleryTitle: (
      <>
        Photos and <em>clips</em>
      </>
    ),
    galleryLabel: "Trip gallery (scroll sideways)",
    day: "day",
    includedOverline: "Terms",
  },
};

/** Gallery, day-by-day program and included/excluded lists of an admin travel group. */
export function TravelGroupDetails({ group }: { group: TravelGroup }) {
  const { dictionary, language } = useSitePreferences();
  const copy = COPY[language];
  const t = dictionary.tripDetail;

  const media = (group.detailMedia ?? []).filter((item) => item.url);
  const gallery = media.length ? media : group.imageUrls.filter(Boolean).map((url) => ({ url, mediaType: "image" as const }));
  const itinerary = group.itinerary.filter((item) => item.description?.trim());

  return (
    <>
      {gallery.length ? (
        <section className="pg-section" aria-labelledby="dst-gallery-title">
          <SectionHeading id="dst-gallery-title" overline={copy.galleryOverline} title={copy.galleryTitle} />
          <ul className="dst-gallery" aria-label={copy.galleryLabel} tabIndex={0}>
            {gallery.map((item, index) =>
              item.mediaType === "video" ? (
                <li key={`${item.url}-${index}`}>
                  <video src={item.url} muted loop playsInline controls preload="metadata" aria-label={`${group.title} ${index + 1}`} />
                </li>
              ) : (
                <li key={`${item.url}-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage image */}
                  <img src={item.url} alt={`${group.title} ${index + 1}`} loading="lazy" decoding="async" width={720} height={480} />
                </li>
              )
            )}
          </ul>
        </section>
      ) : null}

      {itinerary.length ? (
        <section className="pg-section" aria-labelledby="dst-itinerary-title">
          <SectionHeading id="dst-itinerary-title" overline={group.title} title={t.itinerary} />
          <ol className="dst-itinerary">
            {itinerary.map((item, index) => (
              <li key={`${item.day}-${index}`}>
                <span className="dst-itinerary__pin" aria-hidden="true" />
                <p className="dst-itinerary__day">
                  {language === "sr" ? `${item.day}. ${copy.day}` : `${copy.day} ${item.day}`}
                  {item.date ? <span> · {formatDate(item.date, language)}</span> : null}
                </p>
                <p className="dst-itinerary__text">{item.description}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {group.included.length || group.notIncluded.length ? (
        <section className="pg-section" aria-labelledby="dst-terms-title">
          <SectionHeading id="dst-terms-title" overline={copy.includedOverline} title={`${t.included} / ${t.notIncluded}`} size="sm" />
          <div className="dst-terms">
            {group.included.length ? (
              <div className="pg-panel ui-paper">
                <h3 className="dst-terms__title">{t.included}</h3>
                <ul className="dst-terms__list">
                  {group.included.map((item, index) => (
                    <li key={index}>
                      <Check {...ICON} className="dst-terms__yes" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {group.notIncluded.length ? (
              <div className="pg-panel ui-paper">
                <h3 className="dst-terms__title">{t.notIncluded}</h3>
                <ul className="dst-terms__list">
                  {group.notIncluded.map((item, index) => (
                    <li key={index}>
                      <X {...ICON} className="dst-terms__no" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
