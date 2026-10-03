"use client";

import { CalendarDays, ChevronDown, Compass, MapPin, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "../ui/cn";
import { Button } from "../ui/button";
import { useSitePreferences } from "../site-preferences-provider";
import { TRAVEL_TYPES, type TravelTypeSlug } from "../../lib/search/travel-types";
import {
  offerCountLabel,
  tripSearchHref,
  upcomingMonths,
  useTripSearch,
  type TripSearchParams,
} from "../../lib/search/trip-search";

type TripSearchProps = {
  /** "bar": the ink booking bar (hero). "panel": paper fields in the search dialog / sheet. */
  variant?: "bar" | "panel";
  initial?: TripSearchParams;
  /** Called after navigation starts (closes the dialog or sheet). */
  onSubmitted?: () => void;
  className?: string;
};

const TRAVELER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * "Kuda putujete?" — one search form for the hero bar, the sticky pill dialog
 * and the mobile sheet. Live count from Convex; submits to /ponude?tip&mesec&putnika&polazak.
 */
export function TripSearch({ variant = "panel", initial, onSubmitted, className }: TripSearchProps) {
  const router = useRouter();
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.chrome;
  const [params, setParams] = useState<TripSearchParams>(() => initial ?? {});
  const { count, departureCities } = useTripSearch(params);
  const months = useMemo(() => upcomingMonths(language), [language]);
  const countId = `trip-search-count-${useId().replace(/:/g, "")}`;

  // Keep a city from the URL selectable even when today's data no longer lists it.
  const cities = params.polazak && !departureCities.includes(params.polazak) ? [params.polazak, ...departureCities] : departureCities;

  const update = (patch: Partial<TripSearchParams>) => setParams((current) => ({ ...current, ...patch }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(tripSearchHref(params));
    onSubmitted?.();
  };

  const countText = count > 0 ? `${copy.resultsPrefix} ${offerCountLabel(count, language)}` : copy.resultsNone;

  return (
    <form
      className={cn("tsearch", `tsearch--${variant}`, className)}
      role="search"
      aria-label={copy.searchTitle}
      aria-describedby={countId}
      onSubmit={onSubmit}
    >
      <div className="tsearch__fields">
        <SearchField icon={<Compass strokeWidth={1.5} />} label={copy.fieldType}>
          <select
            className="tsearch__select"
            value={params.tip ?? ""}
            onChange={(event) => update({ tip: (event.target.value || undefined) as TravelTypeSlug | undefined })}
          >
            <option value="">{copy.anyType}</option>
            {TRAVEL_TYPES.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.label[language]}
              </option>
            ))}
          </select>
        </SearchField>

        <SearchField icon={<CalendarDays strokeWidth={1.5} />} label={copy.fieldMonth}>
          <select className="tsearch__select" value={params.mesec ?? ""} onChange={(event) => update({ mesec: event.target.value || undefined })}>
            <option value="">{copy.anyMonth}</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </SearchField>

        <SearchField icon={<Users strokeWidth={1.5} />} label={copy.fieldTravelers}>
          <select
            className="tsearch__select"
            value={params.putnika ? String(params.putnika) : ""}
            onChange={(event) => update({ putnika: event.target.value ? Number(event.target.value) : undefined })}
          >
            <option value="">{copy.anyTravelers}</option>
            {TRAVELER_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === 1 ? copy.travelerOne : `${value} ${copy.travelerMany}`}
              </option>
            ))}
          </select>
        </SearchField>

        <SearchField icon={<MapPin strokeWidth={1.5} />} label={copy.fieldDeparture}>
          <select className="tsearch__select" value={params.polazak ?? ""} onChange={(event) => update({ polazak: event.target.value || undefined })}>
            <option value="">{copy.anyDeparture}</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </SearchField>
      </div>

      <div className="tsearch__submit">
        <p className={cn("tsearch__count", count === 0 && "tsearch__count--none")} id={countId} aria-live="polite">
          {countText}
        </p>
        <Button type="submit" block={variant === "panel"} icon={<Search aria-hidden="true" strokeWidth={1.75} />}>
          {variant === "panel" ? copy.showResults : copy.submit}
        </Button>
      </div>
    </form>
  );
}

function SearchField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="tsearch__field">
      <span className="tsearch__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tsearch__label">{label}</span>
      {children}
      <ChevronDown className="tsearch__chevron" aria-hidden="true" strokeWidth={1.5} />
    </label>
  );
}
