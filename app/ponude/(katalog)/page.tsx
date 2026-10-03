import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { CatalogView } from "@/components/catalog/catalog-view";
import {
  activeFilterCount,
  catalogHref,
  filtersOf,
  parseCatalogQuery,
  PAGE_SIZE,
  type CatalogFilters,
} from "@/lib/catalog/filters";
import { monthLabel, transportLabel } from "@/lib/catalog/format";
import { CATALOG_COPY } from "@/lib/i18n-catalog";
import { getTravelType } from "@/lib/search/travel-types";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, jsonLdText } from "@/lib/seo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const COPY = CATALOG_COPY.sr;
const DESCRIPTION =
  "Ponude za putovanja na jednom mestu: ABLux programi i ponude partnerskih agencija sa terminima, cenama u evrima i organizatorom putovanja.";

// Single filters that make a meaningful landing page. Free text and price
// ranges never get their own canonical URL.
const INDEXABLE_SINGLE: (keyof CatalogFilters)[] = ["tip", "zemlja", "mesec", "prevoz", "trajanje", "polazak", "vrsta", "partner"];

function titleFor(filters: CatalogFilters, countryName?: string) {
  if (filters.tip) return `${getTravelType(filters.tip).label.sr} – ponude`;
  if (filters.zemlja) return `Putovanja: ${countryName ?? filters.zemlja}`;
  if (filters.mesec) return `Polasci u mesecu ${monthLabel(filters.mesec, "sr")}`;
  if (filters.prevoz) return `Putovanja – prevoz: ${transportLabel(filters.prevoz, COPY)}`;
  if (filters.polazak) return `Putovanja sa polaskom iz mesta ${filters.polazak}`;
  return COPY.title;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const query = parseCatalogQuery(await searchParams);
  const filters = filtersOf(query);
  const count = activeFilterCount(filters);
  const single = count === 1 ? (Object.keys(filters)[0] as keyof CatalogFilters) : undefined;
  const indexable = count === 0 || (single !== undefined && INDEXABLE_SINGLE.includes(single));
  const canonical = indexable ? catalogHref(filters) : "/ponude";
  const title = titleFor(filters);
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical },
    // More than one filter, free text, price ranges, sorting and "Učitaj još" pages are not indexed.
    robots: indexable && !query.sort && !query.strana ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description: DESCRIPTION,
      url: canonical,
      siteName: SITE_NAME,
      locale: "sr_RS",
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function PonudePage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseCatalogQuery(await searchParams);
  const result = await fetchQuery(api.catalog.search, {
    ...filtersOf(query),
    sort: query.sort,
    page: 1,
    pageSize: PAGE_SIZE * (query.strana ?? 1),
  });

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: titleFor(filtersOf(query)),
    numberOfItems: result.total,
    itemListElement: result.items.slice(0, PAGE_SIZE).map((card, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${card.href}`,
      name: card.title,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(itemList) }} />
      <CatalogView query={query} result={result} />
    </>
  );
}
