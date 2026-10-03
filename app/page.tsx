import { fetchQuery } from "convex/nextjs";
import HomePageView, { type HomePageData } from "../components/home/home-page-view";
import { api } from "../convex/_generated/api";
import { loadHeroScenes } from "../lib/home/hero-manifest.server";

// Title, description and JSON-LD for "/" come from app/layout.tsx.

/** A failed query never breaks the homepage: the section shows its empty state. */
async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[home] query failed", error instanceof Error ? error.message : error);
    return fallback;
  }
}

export default async function HomePage() {
  const [scenes, upcoming, partners, routes, vehicles, typeCounts] = await Promise.all([
    loadHeroScenes(),
    safe(() => fetchQuery(api.catalog.upcoming, { limit: 4 }), []),
    safe(() => fetchQuery(api.catalog.partnerStrip, {}), null),
    safe(() => fetchQuery(api.homeRouteSlides.routeCards, {}), []),
    safe(() => fetchQuery(api.vehicleRentalImages.list, {}), []),
    safe(() => fetchQuery(api.catalog.countsByTravelType, {}), {} as Record<string, number>),
  ]);

  const data: HomePageData = {
    scenes,
    upcoming,
    partners,
    routes: routes.map((route) => ({ ...route, id: String(route.id) })),
    vehicles,
    typeCounts,
  };

  return <HomePageView data={data} />;
}
