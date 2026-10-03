import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDate } from "../../../lib/catalog/format";
import { plural, travelGroupImage, travelGroupVideo, type Language, type TravelGroup } from "./destination-data";
import { MediaPostcard } from "./media-postcard";

const ICON = { size: 16, strokeWidth: 1.5, "aria-hidden": true } as const;

export type TravelGroupSummary = Pick<
  TravelGroup,
  | "_id"
  | "slug"
  | "title"
  | "subtitle"
  | "badge"
  | "description"
  | "heroMediaType"
  | "heroMediaUrl"
  | "detailMedia"
  | "imageUrls"
  | "departureDate"
  | "departureCity"
  | "destinationCount"
>;

function destinationsLabel(count: number, language: Language) {
  if (language === "en") return `${count} ${count === 1 ? "destination" : "destinations"}`;
  return `${count} ${plural(count, "destinacija", "destinacije", "destinacija")}`;
}

/** Admin travel group ("Putovanja" in admin) as a postcard card linking /putovanja/<slug>. */
export function TravelGroupCard({ group, language, index }: { group: TravelGroupSummary; language: Language; index: number }) {
  const lead = group.subtitle || group.description;
  const meta = [
    group.destinationCount ? destinationsLabel(group.destinationCount, language) : null,
    group.departureCity || null,
  ].filter(Boolean);
  return (
    <article className="dst-country dst-group">
      <MediaPostcard
        image={travelGroupImage(group)}
        video={travelGroupVideo(group)}
        alt={group.title}
        placeName={group.title}
        tilt={index % 2 ? "right" : "left"}
      />
      <div className="dst-country__body">
        {group.badge ? <p className="dst-country__overline">{group.badge}</p> : null}
        <h3 className="dst-country__title">
          <Link href={`/putovanja/${group.slug}`} className="dst-stretch" prefetch={false}>
            {group.title}
          </Link>
        </h3>
        {lead ? <p className="dst-country__lead">{lead}</p> : null}
        {meta.length ? (
          <p className="dst-country__meta">
            <MapPin {...ICON} />
            <span>{meta.join(" · ")}</span>
          </p>
        ) : null}
        {group.departureDate ? (
          <p className="dst-country__meta">
            <CalendarDays {...ICON} />
            <span>{formatDate(group.departureDate, language)}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
