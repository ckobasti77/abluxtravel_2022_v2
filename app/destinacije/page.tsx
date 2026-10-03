import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DirectoryView } from "@/components/pages/destinations/directory-view";
import type { TravelGroupSummary } from "@/components/pages/destinations/travel-group-card";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Destinacije",
  description:
    "Imenik destinacija ABLux Travel: zemlje i mesta iz aktuelne ponude ABLux programa i partnerskih agencija, sa brojem ponuda i cenama od.",
  canonical: "/destinacije",
  keywords: ["destinacije", "putovanja po zemlji", "letovanje", "ABLux Travel destinacije"],
});

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[destinacije] query failed", error instanceof Error ? error.message : error);
    return fallback;
  }
}

export default async function DestinacijePage() {
  const [countries, groups, scenes] = await Promise.all([
    safe(() => fetchQuery(api.catalog.destinationIndex, {}), []),
    // Active admin slides (the old /destinacije "featured" cards) are the travel groups.
    safe(() => fetchQuery(api.slides.listTravelGroups, {}), []),
    loadHeroScenes(),
  ]);

  const featured: TravelGroupSummary[] = [...groups]
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

  const mediteran = scenes.mediteran;
  const hero = {
    src: mediteran.desktop.poster ?? "/generated/route-mediteran.png",
    mobileSrc: mediteran.mobile.poster ?? undefined,
  };

  return <DirectoryView countries={countries} featured={featured} hero={hero} />;
}
