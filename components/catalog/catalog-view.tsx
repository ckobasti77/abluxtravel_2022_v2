"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "../../convex/_generated/api";
import {
  catalogHref,
  filtersOf,
  activeFilterCount,
  PAGE_SIZE,
  type CatalogFacets,
  type CatalogQuery,
  type CatalogSort,
} from "../../lib/catalog/filters";
import { durationBucketLabel, monthLabel, transportLabel } from "../../lib/catalog/format";
import { offerCountLabel } from "../../lib/search/trip-search";
import { getTravelType } from "../../lib/search/travel-types";
import { useSitePreferences } from "../site-preferences-provider";
import { Button, ButtonLink, EmptyState, Field, RemovableChip, Select, Sheet, formatAmount } from "../ui";
import { FilterPanel } from "./filter-panel";
import { OfferTicket } from "./offer-ticket";

export type CatalogResult = FunctionReturnType<typeof api.catalog.search>;

type CatalogViewProps = {
  query: CatalogQuery;
  result: CatalogResult;
};

/**
 * /ponude: filters (sidebar on desktop, bottom sheet on mobile), active filter
 * chips, sort, ticket grid and "Učitaj još". The URL is the state: every change
 * navigates and the server renders the new results.
 */
export function CatalogView({ query, result }: CatalogViewProps) {
  const router = useRouter();
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.catalog;
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogQuery>(query);

  const filters = filtersOf(query);
  const filterCount = activeFilterCount(filters);
  const live = useQuery(api.catalog.count, sheetOpen ? filtersOf(draft) : "skip");

  const navigate = (next: CatalogQuery) => {
    startTransition(() => {
      router.replace(catalogHref({ ...next, strana: undefined }), { scroll: false });
    });
  };
  const update = (patch: Partial<CatalogQuery>) => navigate({ ...query, ...patch });

  const openSheet = () => {
    setDraft(query);
    setSheetOpen(true);
  };
  const applyDraft = () => {
    setSheetOpen(false);
    navigate(draft);
  };

  const shown = result.items.length;
  const heading = query.tip ? getTravelType(query.tip).label[language] : copy.title;
  const countryLabel = (slug: string) => result.facets.zemlja.find((entry) => entry.value === slug)?.label ?? slug;
  const partnerLabel = (slug: string) => result.facets.partner.find((entry) => entry.value === slug)?.label ?? slug;

  const chips: { key: string; label: string; clear: Partial<CatalogQuery> }[] = [];
  if (query.tip) chips.push({ key: "tip", label: getTravelType(query.tip).label[language], clear: { tip: undefined } });
  if (query.zemlja) chips.push({ key: "zemlja", label: countryLabel(query.zemlja), clear: { zemlja: undefined } });
  if (query.mesec) chips.push({ key: "mesec", label: monthLabel(query.mesec, language), clear: { mesec: undefined } });
  if (query.prevoz) chips.push({ key: "prevoz", label: transportLabel(query.prevoz, copy), clear: { prevoz: undefined } });
  if (query.trajanje) chips.push({ key: "trajanje", label: durationBucketLabel(query.trajanje, copy), clear: { trajanje: undefined } });
  if (query.cenaOd || query.cenaDo) {
    const range = [query.cenaOd ? `${copy.priceFrom} ${formatAmount(query.cenaOd)} €` : "", query.cenaDo ? `${copy.priceTo.toLowerCase()} ${formatAmount(query.cenaDo)} €` : ""]
      .filter(Boolean)
      .join(" ");
    chips.push({ key: "cena", label: range, clear: { cenaOd: undefined, cenaDo: undefined } });
  }
  if (query.polazak) chips.push({ key: "polazak", label: `${copy.departureCity}: ${query.polazak}`, clear: { polazak: undefined } });
  if (query.q) chips.push({ key: "q", label: `„${query.q}“`, clear: { q: undefined } });
  if (query.vrsta) chips.push({ key: "vrsta", label: query.vrsta === "ablux" ? copy.kindAblux : copy.kindPartner, clear: { vrsta: undefined } });
  if (query.partner) chips.push({ key: "partner", label: partnerLabel(query.partner), clear: { partner: undefined } });

  const clearAll: CatalogQuery = { sort: query.sort, putnika: query.putnika };
  const sheetTotal = live?.total;

  return (
    <main id="main-content" className="cat-page">
      <header className="cat-head">
        <nav aria-label="Breadcrumb" className="cat-crumbs">
          <ol>
            <li>
              <Link href="/">{copy.breadcrumbHome}</Link>
            </li>
            <li aria-current="page">{copy.breadcrumbOffers}</li>
          </ol>
        </nav>
        <p className="ui-overline">{copy.overline}</p>
        <h1 className="cat-head__title">{heading}</h1>
        <p className="cat-head__intro">{copy.intro}</p>
      </header>

      <div className="cat-toolbar">
        <Button
          variant="secondary"
          className="cat-toolbar__filters"
          iconStart={<SlidersHorizontal aria-hidden="true" strokeWidth={1.5} />}
          onClick={openSheet}
          aria-haspopup="dialog"
        >
          {filterCount ? `${copy.filtersOpen} (${filterCount})` : copy.filtersOpen}
        </Button>
        <p className="cat-toolbar__count" aria-live="polite" aria-atomic="true">
          {pending ? (
            copy.updating
          ) : (
            <>
              {copy.found} <strong>{offerCountLabel(result.total, language)}</strong>
            </>
          )}
        </p>
        <Field label={copy.sort} id="cat-sort" className="cat-toolbar__sort">
          <Select value={query.sort ?? "polazak"} onChange={(event) => update({ sort: event.target.value as CatalogSort })}>
            <option value="polazak">{copy.sortDeparture}</option>
            <option value="cena">{copy.sortPrice}</option>
            <option value="novo">{copy.sortNew}</option>
          </Select>
        </Field>
      </div>

      {chips.length ? (
        <div className="cat-active" aria-label={copy.filters}>
          {chips.map((chip) => (
            <RemovableChip key={chip.key} label={chip.label} removeLabel={copy.removeFilter} onClick={() => update(chip.clear)} />
          ))}
          <Button variant="text" size="sm" onClick={() => navigate(clearAll)}>
            {copy.clearAll}
          </Button>
        </div>
      ) : null}

      <div className="cat-layout">
        <aside className="cat-sidebar" aria-label={copy.filters}>
          <h2 className="cat-sidebar__title">{copy.filtersTitle}</h2>
          <FilterPanel value={query} facets={result.facets} onChange={update} copy={copy} language={language} idPrefix="cat-side" />
        </aside>

        <section className="cat-results" aria-busy={pending || undefined} aria-label={copy.breadcrumbOffers}>
          {result.total > 0 ? (
            <>
              <ul className="cat-grid" role="list">
                {result.items.map((card) => (
                  <li key={card.id}>
                    <OfferTicket card={card} language={language} copy={copy} headingLevel="h2" travelers={query.putnika} />
                  </li>
                ))}
              </ul>
              <div className="cat-more">
                <p className="cat-more__status">
                  {copy.shown.replace("{shown}", String(shown)).replace("{total}", String(result.total))}
                </p>
                {shown < result.total && (query.strana ?? 1) * PAGE_SIZE < 240 ? (
                  <ButtonLink href={catalogHref({ ...query, strana: (query.strana ?? 1) + 1 })} variant="ink" scroll={false}>
                    {copy.loadMore}
                  </ButtonLink>
                ) : null}
              </div>
            </>
          ) : (
            <CatalogEmpty query={query} facets={result.facets} filterCount={filterCount} clearHref={catalogHref(clearAll)} />
          )}
        </section>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={copy.filtersTitle}
        closeLabel={copy.close}
        footer={
          <div className="cat-sheet__footer">
            <Button variant="text" onClick={() => setDraft(clearAll)}>
              {copy.clearAll}
            </Button>
            <Button onClick={applyDraft} loading={sheetOpen && live === undefined} loadingLabel={copy.updating}>
              {sheetTotal === undefined ? copy.showResults : `${copy.showResults} ${offerCountLabel(sheetTotal, language)}`}
            </Button>
          </div>
        }
      >
        {sheetOpen ? (
          <FilterPanel
            value={draft}
            facets={live?.facets ?? result.facets}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            copy={copy}
            language={language}
            idPrefix="cat-sheet"
          />
        ) : null}
      </Sheet>
    </main>
  );
}

function CatalogEmpty({
  query,
  facets,
  filterCount,
  clearHref,
}: {
  query: CatalogQuery;
  facets: CatalogFacets;
  filterCount: number;
  clearHref: string;
}) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.catalog;

  if (filterCount === 0) {
    return (
      <EmptyState
        headingLevel="h2"
        title={copy.noneTitle}
        body={copy.noneBody}
        action={
          <ButtonLink href="/kontakt" variant="primary">
            {copy.emptyContact}
          </ButtonLink>
        }
      />
    );
  }

  // Facets are counted with every other filter applied: they list the months and
  // countries that would give results if only that filter changed.
  const months = query.mesec ? facets.mesec.filter((entry) => entry.value !== query.mesec).slice(0, 3) : [];
  const countries = facets.zemlja.filter((entry) => entry.value !== query.zemlja).slice(0, 3);

  return (
    <EmptyState
      headingLevel="h2"
      title={copy.emptyTitle}
      body={copy.emptyBody}
      suggestions={
        months.length || countries.length ? (
          <div className="cat-empty__suggest">
            {months.length ? (
              <div>
                <p className="cat-empty__label">{copy.emptyMonths}</p>
                <ul role="list">
                  {months.map((entry) => (
                    <li key={entry.value}>
                      <Link href={catalogHref({ ...query, mesec: entry.value, strana: undefined })} className="ui-link">
                        {`${monthLabel(entry.value, language)} (${entry.count})`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {countries.length ? (
              <div>
                <p className="cat-empty__label">{copy.emptyCountries}</p>
                <ul role="list">
                  {countries.map((entry) => (
                    <li key={entry.value}>
                      <Link href={catalogHref({ ...query, zemlja: entry.value, strana: undefined })} className="ui-link">
                        {`${entry.label ?? entry.value} (${entry.count})`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null
      }
      action={
        <div className="cat-empty__actions">
          <ButtonLink href={clearHref} variant="secondary">
            {copy.emptyClear}
          </ButtonLink>
          <ButtonLink href="/kontakt" variant="primary">
            {copy.emptyContact}
          </ButtonLink>
        </div>
      }
    />
  );
}
