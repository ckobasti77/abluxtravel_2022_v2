import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { CountryView } from "@/components/pages/destinations/country-view";
import {
  agencyCount,
  countryIntro,
  fallbackHeroImage,
  paragraphs,
  travelGroupImage,
  travelGroupVideo,
  type HeroImage,
} from "@/components/pages/destinations/destination-data";
import { fromCountrySlug } from "@/lib/country-route";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, jsonLdText } from "@/lib/seo";

type Params = Promise<{ zemlja: string }>;

const OFFER_LIMIT = 24;
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

/** A failed query returns `failed` instead of throwing, so the page shows a notice, not an error. */
async function attempt<T>(load: () => Promise<T>): Promise<{ data: T; failed: false } | { data: null; failed: true }> {
  try {
    return { data: await load(), failed: false };
  } catch (error) {
    console.error("[putovanja/zemlja] query failed", error instanceof Error ? error.message : error);
    return { data: null, failed: true };
  }
}

const loadCountry = cache(async (rawSlug: string) => {
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) return null;
  const [group, search, index, destinations] = await Promise.all([
    attempt(() => fetchQuery(api.slides.getTravelGroupBySlug, { slug })),
    attempt(() => fetchQuery(api.catalog.search, { zemlja: slug, pageSize: OFFER_LIMIT, sort: "polazak" })),
    attempt(() => fetchQuery(api.catalog.destinationIndex, {})),
    attempt(() => fetchQuery(api.destinations.listByPage, { pageSlug: slug })),
  ]);
  const entry = index.data?.find((item) => item.countrySlug === slug) ?? null;
  const offers = search.data?.items ?? [];
  const total = search.data?.total ?? 0;
  const name = entry?.countryName ?? group.data?.title ?? offers[0]?.countryName ?? fromCountrySlug(slug);
  return {
    slug,
    name,
    group: group.data ?? null,
    entry,
    offers,
    total,
    agencies: agencyCount(search.data),
    destinations: (destinations.data ?? []).filter((item) => item.isActive),
    failed: group.failed || search.failed || destinations.failed,
  };
});

type Loaded = NonNullable<Awaited<ReturnType<typeof loadCountry>>>;

function isEmpty(data: Loaded) {
  return !data.group && data.total === 0 && data.destinations.length === 0;
}

function describe(data: Loaded): string {
  const lead = [...paragraphs(data.group?.description), ...countryIntro({ name: data.name, count: data.total, agencies: data.agencies, entry: data.entry }, "sr")]
    .join(" ")
    .trim();
  const text = lead || `Putovanja i ponude za destinaciju ${data.name}: termini, cene i upit na jednom mestu.`;
  return text.length > 158 ? `${text.slice(0, 155).replace(/\s+\S*$/, "")}…` : text;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { zemlja } = await params;
  const data = await loadCountry(zemlja);
  if (!data || (isEmpty(data) && !data.failed)) return { title: "Putovanja", robots: { index: false, follow: true } };
  const canonical = `/putovanja/${data.slug}`;
  const title = data.group && !data.entry ? data.group.title : `${data.name}: putovanja i ponude`;
  const description = describe(data);
  const cover = data.group ? travelGroupImage(data.group) : null;
  const image = cover ?? data.entry?.coverUrl ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "sr_RS",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [image] },
  };
}

export default async function CountryPage({ params }: { params: Params }) {
  const { zemlja } = await params;
  const data = await loadCountry(zemlja);
  if (!data || (isEmpty(data) && !data.failed)) notFound();

  const scenes = await loadHeroScenes();
  const groupImage = data.group ? travelGroupImage(data.group) : null;
  const groupVideo = data.group ? travelGroupVideo(data.group) : null;
  // Admin travel group media first, then the country cover, then approved destination art.
  // A group video keeps only its own image as the poster (never art from elsewhere).
  const image: HeroImage | null = groupImage
    ? { src: groupImage }
    : groupVideo
      ? null
      : data.entry?.coverUrl
        ? { src: data.entry.coverUrl }
        : fallbackHeroImage(data.slug, data.entry, scenes);

  const url = `${SITE_URL}/putovanja/${data.slug}`;
  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Putovanja", item: `${SITE_URL}/putovanja` },
        { "@type": "ListItem", position: 3, name: data.name, item: url },
      ],
    },
  ];
  if (data.offers.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${data.name}: putovanja i ponude`,
      url,
      numberOfItems: data.total,
      itemListElement: data.offers.map((card, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: card.title,
        url: `${SITE_URL}${card.href}`,
      })),
    });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <CountryView
        slug={data.slug}
        name={data.name}
        group={data.group}
        entry={data.entry}
        offers={data.offers}
        total={data.total}
        agencies={data.agencies}
        destinations={data.destinations}
        hero={{ image, video: groupVideo }}
        failed={data.failed}
      />
    </>
  );
}
