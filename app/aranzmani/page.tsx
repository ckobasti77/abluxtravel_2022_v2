import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ProgramsView } from "@/components/pages/programs/programs-view";
import { tripCover, type TripListItem } from "@/components/pages/programs/program-utils";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { createPageMetadata } from "@/lib/page-metadata";
import { SITE_URL, jsonLdText } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Aranžmani",
  description:
    "ABLux programi putovanja: termini, trajanje, grad polaska, smeštaj i cena na jednom mestu, uz online rezervaciju i plaćanje IPS QR kodom.",
  canonical: "/aranzmani",
  keywords: ["aranžmani", "ABLux programi", "putovanja iz Beograda", "ABLux Travel"],
});

const STATUS_ORDER: Record<TripListItem["status"], number> = { active: 0, upcoming: 1, completed: 2 };

export default async function AranzmaniPage() {
  const [scenes, trips] = await Promise.all([
    loadHeroScenes(),
    fetchQuery(api.trips.list, {}).catch((error: unknown) => {
      console.error("[aranzmani] query failed", error instanceof Error ? error.message : error);
      return [] as TripListItem[];
    }),
  ]);

  const sorted = [...trips].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.order - b.order || a.title.localeCompare(b.title, "sr")
  );
  const current = sorted.filter((trip) => trip.status !== "completed");
  const past = sorted.filter((trip) => trip.status === "completed");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Aranžmani",
      url: `${SITE_URL}/aranzmani`,
      inLanguage: "sr-Latn",
      ...(current.length
        ? {
            mainEntity: {
              "@type": "ItemList",
              itemListElement: current.map((trip, index) => {
                const image = tripCover(trip);
                return {
                  "@type": "ListItem",
                  position: index + 1,
                  item: {
                    "@type": "TouristTrip",
                    name: trip.title,
                    url: `${SITE_URL}/aranzmani/${trip.slug}`,
                    ...(image ? { image } : {}),
                  },
                };
              }),
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Aranžmani", item: `${SITE_URL}/aranzmani` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <ProgramsView current={current} past={past} heroImage={{ desktop: scenes.evropa.desktop.poster, mobile: scenes.evropa.mobile.poster }} />
    </>
  );
}
