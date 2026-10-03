import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";
import { toCountrySlug } from "../lib/country-route";
import { SITE_URL } from "../lib/seo";

const PUBLIC_ROUTES = [
  "/",
  "/putovanja",
  "/destinacije",
  "/aranzmani",
  "/ponude",
  "/verski-turizam",
  "/o-nama",
  "/kontakt",
  "/iznajmljivanje-vozila",
] as const;

const COUNTRY_NAMES = ["Grcka", "Italija", "Turska", "Crna Gora", "Izrael", "Egipat"] as const;

// Regenerated at most once per hour; offers change once a day (06:00 import).
export const revalidate = 3600;

async function offerEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries = await fetchQuery(api.catalog.sitemapEntries, {});
    const seen = new Set<string>();
    return entries
      .filter((entry) => {
        if (seen.has(entry.path)) return false;
        seen.add(entry.path);
        return true;
      })
      .map((entry) => ({
        url: `${SITE_URL}${entry.path}`,
        lastModified: new Date(entry.updatedAt),
        changeFrequency: "daily" as const,
        priority: entry.kind === "ablux" ? 0.8 : 0.6,
      }));
  } catch {
    // Without Convex (e.g. a build without env) the static routes are still served.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const countryRoutes = COUNTRY_NAMES.map((country) => toCountrySlug(country))
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => `/putovanja/${slug}`);

  const routes = [...PUBLIC_ROUTES, ...countryRoutes];

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : route === "/ponude" || route.startsWith("/putovanja/") ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/ponude" ? 0.9 : route.startsWith("/putovanja/") ? 0.85 : 0.8,
  }));

  return [...staticEntries, ...(await offerEntries())];
}
