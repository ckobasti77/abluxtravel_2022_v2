"use client";

import Link from "next/link";
import { formatShortDate, type Language } from "../../../lib/catalog/format";
import { useReveal } from "../../ui";
import { cn } from "../../ui/cn";

export type CalendarEntry = {
  id: string;
  /** Exact ISO date when known; partner offers outside their next departure month only know the month. */
  date?: string;
  title: string;
  organizer: string;
  href: string;
  ablux: boolean;
};

export type CalendarMonth = { key: string; entries: CalendarEntry[] };

const COPY = {
  sr: {
    label: "Kalendar polazaka za narednih 12 meseci",
    none: "Bez najavljenih polazaka",
    inMonth: "Više termina",
    organizer: "Organizator",
    count: (n: number) => (n === 1 ? "1 polazak" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} polaska` : `${n} polazaka`),
  },
  en: {
    label: "Departure calendar for the next 12 months",
    none: "No departures announced",
    inMonth: "Several dates",
    organizer: "Organizer",
    count: (n: number) => (n === 1 ? "1 departure" : `${n} departures`),
  },
};

function monthParts(key: string, language: Language) {
  const [year, month] = key.split("-").map(Number);
  const name = new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-GB", { month: "long", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, 1)
  );
  return { name: name.charAt(0).toUpperCase() + name.slice(1), year: String(year) };
}

/** Twelve calendar leaves; each lists the departures of both groups, quiet when empty. */
export function DeparturesCalendar({ months, language }: { months: CalendarMonth[]; language: Language }) {
  const copy = COPY[language];
  const ref = useReveal<HTMLOListElement>({ selector: ":scope > li", y: 22, stagger: 0.05 });

  return (
    <ol className="rel-calendar" aria-label={copy.label} ref={ref}>
      {months.map((month) => {
        const { name, year } = monthParts(month.key, language);
        const empty = month.entries.length === 0;
        return (
          <li key={month.key} className={cn("rel-month", empty && "rel-month--empty")}>
            <h3 className="rel-month__head">
              <span className="rel-month__name">{name}</span>
              <span className="rel-month__year">{year}</span>
              {empty ? null : <span className="rel-month__count">{copy.count(month.entries.length)}</span>}
            </h3>
            {empty ? (
              <p className="rel-month__none">{copy.none}</p>
            ) : (
              <ul className="rel-month__list" role="list">
                {month.entries.map((entry) => (
                  <li key={entry.id} className={cn("rel-month__entry", entry.ablux && "rel-month__entry--ablux")}>
                    <span className="rel-month__date">
                      {entry.date ? <time dateTime={entry.date}>{formatShortDate(entry.date, language)}</time> : copy.inMonth}
                    </span>
                    <span className="rel-month__what">
                      <Link href={entry.href} prefetch={false} className="rel-month__link">
                        {entry.title}
                      </Link>
                      <span className="rel-month__org">
                        <span className="ui-sr-only">{copy.organizer}: </span>
                        {entry.organizer}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
