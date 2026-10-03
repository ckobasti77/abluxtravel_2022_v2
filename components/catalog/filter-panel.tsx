"use client";

import { Search } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { CatalogCopy } from "../../lib/i18n-catalog";
import {
  DURATION_BUCKETS,
  TRANSPORTS,
  type CatalogFacets,
  type CatalogQuery,
  type FacetValue,
} from "../../lib/catalog/filters";
import { durationBucketLabel, monthLabel, transportLabel, type Language } from "../../lib/catalog/format";
import { TRAVEL_TYPES } from "../../lib/search/travel-types";
import { Button, Chip, Field, Input, Select } from "../ui";

type FilterPanelProps = {
  value: CatalogQuery;
  facets: CatalogFacets;
  onChange: (patch: Partial<CatalogQuery>) => void;
  copy: CatalogCopy;
  language: Language;
  /** Prefix for element ids (the panel exists twice: sidebar and mobile sheet). */
  idPrefix: string;
};

const countOf = (facet: FacetValue[], value: string) => facet.find((entry) => entry.value === value)?.count ?? 0;

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="cat-filter">
      <legend className="cat-filter__legend">{legend}</legend>
      {children}
    </fieldset>
  );
}

/** Filter controls for the catalog. Counts per option come from the facets (other filters applied). */
export function FilterPanel({ value, facets, onChange, copy, language, idPrefix }: FilterPanelProps) {
  return (
    <div className="cat-filters__groups">
      <TextSearch key={`q-${value.q ?? ""}`} initial={value.q ?? ""} onSubmit={(q) => onChange({ q })} copy={copy} idPrefix={idPrefix} />

      <Group legend={copy.type}>
        <div className="cat-filter__chips">
          {TRAVEL_TYPES.map((type) => {
            const count = countOf(facets.tip, type.slug);
            const selected = value.tip === type.slug;
            return (
              <Chip
                key={type.slug}
                selected={selected}
                count={count}
                disabled={!selected && count === 0}
                onClick={() => onChange({ tip: selected ? undefined : type.slug })}
              >
                {type.label[language]}
              </Chip>
            );
          })}
        </div>
      </Group>

      <Field label={copy.country} id={`${idPrefix}-zemlja`}>
        <Select value={value.zemlja ?? ""} onChange={(event) => onChange({ zemlja: event.target.value || undefined })}>
          <option value="">{copy.anyCountry}</option>
          {value.zemlja && !facets.zemlja.some((entry) => entry.value === value.zemlja) ? (
            <option value={value.zemlja}>{value.zemlja}</option>
          ) : null}
          {[...facets.zemlja]
            .sort((a, b) => (a.label ?? a.value).localeCompare(b.label ?? b.value, "sr"))
            .map((entry) => (
              <option key={entry.value} value={entry.value}>
                {`${entry.label ?? entry.value} (${entry.count})`}
              </option>
            ))}
        </Select>
      </Field>

      <Field label={copy.month} id={`${idPrefix}-mesec`}>
        <Select value={value.mesec ?? ""} onChange={(event) => onChange({ mesec: event.target.value || undefined })}>
          <option value="">{copy.anyMonth}</option>
          {value.mesec && !facets.mesec.some((entry) => entry.value === value.mesec) ? (
            <option value={value.mesec}>{`${monthLabel(value.mesec, language)} (0)`}</option>
          ) : null}
          {facets.mesec.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {`${monthLabel(entry.value, language)} (${entry.count})`}
            </option>
          ))}
        </Select>
      </Field>

      <Group legend={copy.transport}>
        <div className="cat-filter__chips">
          {TRANSPORTS.map((transport) => {
            const count = countOf(facets.prevoz, transport);
            const selected = value.prevoz === transport;
            if (!selected && count === 0) return null;
            return (
              <Chip key={transport} selected={selected} count={count} onClick={() => onChange({ prevoz: selected ? undefined : transport })}>
                {transportLabel(transport, copy)}
              </Chip>
            );
          })}
        </div>
      </Group>

      <Group legend={copy.duration}>
        <div className="cat-filter__chips">
          {DURATION_BUCKETS.map((bucket) => {
            const count = countOf(facets.trajanje, bucket);
            const selected = value.trajanje === bucket;
            return (
              <Chip
                key={bucket}
                selected={selected}
                count={count}
                disabled={!selected && count === 0}
                onClick={() => onChange({ trajanje: selected ? undefined : bucket })}
              >
                {durationBucketLabel(bucket, copy)}
              </Chip>
            );
          })}
        </div>
      </Group>

      <PriceRange
        key={`price-${value.cenaOd ?? ""}-${value.cenaDo ?? ""}`}
        from={value.cenaOd}
        to={value.cenaDo}
        bounds={facets.cena}
        onApply={(cenaOd, cenaDo) => onChange({ cenaOd, cenaDo })}
        copy={copy}
        idPrefix={idPrefix}
      />

      <Field label={copy.departureCity} id={`${idPrefix}-polazak`}>
        <Select value={value.polazak ?? ""} onChange={(event) => onChange({ polazak: event.target.value || undefined })}>
          <option value="">{copy.anyCity}</option>
          {value.polazak && !facets.polazak.some((entry) => entry.value === value.polazak) ? (
            <option value={value.polazak}>{value.polazak}</option>
          ) : null}
          {facets.polazak.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {`${entry.label ?? entry.value} (${entry.count})`}
            </option>
          ))}
        </Select>
      </Field>

      <Group legend={copy.kind}>
        <div className="cat-filter__chips">
          {(["ablux", "partner"] as const).map((kind) => {
            const count = countOf(facets.vrsta, kind);
            const selected = value.vrsta === kind;
            return (
              <Chip
                key={kind}
                selected={selected}
                count={count}
                disabled={!selected && count === 0}
                onClick={() => onChange({ vrsta: selected ? undefined : kind })}
              >
                {kind === "ablux" ? copy.kindAblux : copy.kindPartner}
              </Chip>
            );
          })}
        </div>
      </Group>

      {facets.partner.length > 0 || value.partner ? (
        <Field label={copy.organizer} id={`${idPrefix}-partner`}>
          <Select value={value.partner ?? ""} onChange={(event) => onChange({ partner: event.target.value || undefined })}>
            <option value="">{copy.anyOrganizer}</option>
            {value.partner && !facets.partner.some((entry) => entry.value === value.partner) ? (
              <option value={value.partner}>{value.partner}</option>
            ) : null}
            {[...facets.partner]
              .sort((a, b) => (a.label ?? a.value).localeCompare(b.label ?? b.value, "sr"))
              .map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {`${entry.label ?? entry.value} (${entry.count})`}
                </option>
              ))}
          </Select>
        </Field>
      ) : null}
    </div>
  );
}

function TextSearch({ initial, onSubmit, copy, idPrefix }: { initial: string; onSubmit: (q: string | undefined) => void; copy: CatalogCopy; idPrefix: string }) {
  const [text, setText] = useState(initial);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(text.trim() ? text.trim().slice(0, 80) : undefined);
  };
  return (
    <form className="cat-filter cat-filter--search" role="search" onSubmit={submit}>
      <Field label={copy.search} id={`${idPrefix}-q`}>
        <Input type="search" value={text} placeholder={copy.searchPlaceholder} onChange={(event) => setText(event.target.value)} maxLength={80} />
      </Field>
      <Button type="submit" variant="secondary" size="sm" icon={<Search aria-hidden="true" strokeWidth={1.75} />}>
        {copy.searchSubmit}
      </Button>
    </form>
  );
}

function PriceRange({
  from,
  to,
  bounds,
  onApply,
  copy,
  idPrefix,
}: {
  from?: number;
  to?: number;
  bounds: CatalogFacets["cena"];
  onApply: (from: number | undefined, to: number | undefined) => void;
  copy: CatalogCopy;
  idPrefix: string;
}) {
  const [min, setMin] = useState(from ? String(from) : "");
  const [max, setMax] = useState(to ? String(to) : "");
  const parse = (value: string) => {
    const number = Math.round(Number(value));
    return value.trim() && Number.isFinite(number) && number > 0 ? number : undefined;
  };
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let low = parse(min);
    let high = parse(max);
    if (low && high && low > high) [low, high] = [high, low];
    onApply(low, high);
  };
  return (
    <form className="cat-filter" onSubmit={apply} aria-labelledby={`${idPrefix}-price-legend`}>
      <p className="cat-filter__legend" id={`${idPrefix}-price-legend`}>
        {copy.price}
      </p>
      <div className="cat-filter__range">
        <Field label={copy.priceFrom} id={`${idPrefix}-cenaOd`}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            value={min}
            placeholder={bounds ? String(bounds.min) : undefined}
            onChange={(event) => setMin(event.target.value)}
          />
        </Field>
        <Field label={copy.priceTo} id={`${idPrefix}-cenaDo`}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            value={max}
            placeholder={bounds ? String(bounds.max) : undefined}
            onChange={(event) => setMax(event.target.value)}
          />
        </Field>
      </div>
      <p className="cat-filter__hint">{copy.priceHint}</p>
      <Button type="submit" variant="secondary" size="sm">
        {copy.priceApply}
      </Button>
    </form>
  );
}
