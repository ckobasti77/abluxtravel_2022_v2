import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDate } from "../../../lib/catalog/format";
import { countryGlyph, offersLabel, priceFromLabel, type CountryEntry, type Language } from "./destination-data";
import { MediaPostcard } from "./media-postcard";

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;

const COPY = {
  sr: { firstDeparture: "Prvi polazak", places: "Mesta" },
  en: { firstDeparture: "First departure", places: "Places" },
};

type CountryCardProps = {
  entry: CountryEntry;
  language: Language;
  index: number;
  headingLevel?: "h2" | "h3";
};

/** Country on /putovanja: postcard (partner cover), name, offer count, "od" price, top places, next departure. */
export function CountryCard({ entry, language, index, headingLevel: Heading = "h3" }: CountryCardProps) {
  const copy = COPY[language];
  const places = entry.places.slice(0, 3).map((place) => place.name);
  return (
    <article className="dst-country">
      <MediaPostcard
        image={entry.coverUrl}
        alt={entry.countryName}
        placeName={entry.countryName}
        glyph={countryGlyph(entry)}
        tilt={index % 3 === 1 ? "right" : index % 3 === 2 ? "none" : "left"}
      />
      <div className="dst-country__body">
        <Heading className="dst-country__title">
          <Link href={`/putovanja/${entry.countrySlug}`} className="dst-stretch" prefetch={false}>
            {entry.countryName}
          </Link>
        </Heading>
        <p className="dst-country__facts">
          <span>{offersLabel(entry.count, language)}</span>
          {entry.priceFrom ? <span>{priceFromLabel(entry.priceFrom, language)}</span> : null}
        </p>
        {places.length ? (
          <p className="dst-country__meta">
            <MapPin {...ICON} />
            <span>
              <span className="sr-only">{copy.places}: </span>
              {places.join(", ")}
            </span>
          </p>
        ) : null}
        {entry.nextDeparture ? (
          <p className="dst-country__meta">
            <CalendarDays {...ICON} />
            <span>
              {copy.firstDeparture} {formatDate(entry.nextDeparture, language)}
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
