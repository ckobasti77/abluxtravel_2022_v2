import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { TravelsView } from "@/components/pages/destinations/travels-view";
import type { TravelGroupSummary } from "@/components/pages/destinations/travel-group-card";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { createPageMetadata } from "@/lib/page-metadata";
import { SITE_URL, jsonLdText } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Putovanja po zemljama",
  description:
    "Putovanja po zemljama: programi ABLux Travel i ponude partnerskih agencija, sa brojem ponuda, cenama od i prvim polaskom za svaku zemlju.",
  canonical: "/putovanja",
  keywords: ["putovanja", "putovanja po zemljama", "destinacije", "turistička ponuda", "ABLux Travel"],
});

/** A failed query never breaks the page: the section shows its empty state. */
async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[putovanja] query failed", error instanceof Error ? error.message : error);
    return fallback;
  }
}

export default async function PutovanjaPage() {
  const [countries, groups, scenes] = await Promise.all([
    safe(() => fetchQuery(api.catalog.destinationIndex, {}), []),
    safe(() => fetchQuery(api.slides.listTravelGroups, {}), []),
    loadHeroScenes(),
  ]);

  const sortedGroups: TravelGroupSummary[] = [...groups]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "sr"))
    .map((group) => ({
      _id: group._id,
      slug: group.slug,
      title: group.title,
      subtitle: group.subtitle,
      badge: group.badge,
      description: group.description,
      heroMediaType: group.heroMediaType,
      heroMediaUrl: group.heroMediaUrl,
      detailMedia: group.detailMedia,
      imageUrls: group.imageUrls,
      departureDate: group.departureDate,
      departureCity: group.departureCity,
      destinationCount: group.destinationCount,
    }));

  const evropa = scenes.evropa;
  const hero = {
    src: evropa.desktop.poster ?? "/generated/route-evropski-gradovi.png",
    mobileSrc: evropa.mobile.poster ?? undefined,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Putovanja po zemljama",
    url: `${SITE_URL}/putovanja`,
    numberOfItems: countries.length,
    itemListElement: countries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.countryName,
      url: `${SITE_URL}/putovanja/${entry.countrySlug}`,
    })),
  };

  return (
    <>
      {countries.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      ) : null}
      <TravelsView countries={countries} groups={sortedGroups} hero={hero} />
    </>
  );
}
