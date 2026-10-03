import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import AboutView, { type AboutPageData } from "../../components/pages/about/about-view";
import { api } from "../../convex/_generated/api";
import { loadHeroScenes } from "../../lib/home/hero-manifest.server";
import { createPageMetadata } from "../../lib/page-metadata";
import { SITE_NAME, SITE_URL, jsonLdText } from "../../lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "O nama",
  description:
    "ABLux Travel je turistička agencija iz Beograda, osnovana 2022: sopstveni programi verskog turizma, ture po Evropi, ponude partnerskih agencija i prevoz sopstvenim vozilima.",
  canonical: "/o-nama",
  keywords: ["o nama", "ABLux Travel", "turistička agencija Beograd", "verski turizam", "subagent"],
});

/** A failed query never breaks the page: the section shows its empty state. */
async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[o-nama] query failed", error instanceof Error ? error.message : error);
    return fallback;
  }
}

export default async function ONamaPage() {
  const [scenes, settings, partners] = await Promise.all([
    loadHeroScenes(),
    safe(() => fetchQuery(api.settings.get, {}), null),
    safe(() => fetchQuery(api.catalog.partnerStrip, {}), null),
  ]);

  const hero = scenes.hodocasca;
  const data: AboutPageData = {
    heroImage: hero.desktop.poster
      ? { src: hero.desktop.poster, mobileSrc: hero.mobile.poster ?? undefined }
      : null,
    // Only a real value from settings is shown; no placeholder license number.
    licenseNumber: settings?.licenseNumber?.trim() || null,
    partners,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `O nama | ${SITE_NAME}`,
    url: `${SITE_URL}/o-nama`,
    inLanguage: "sr-Latn",
    about: {
      "@type": "TravelAgency",
      name: SITE_NAME,
      url: SITE_URL,
      foundingDate: "2022",
      address: { "@type": "PostalAddress", addressLocality: "Beograd", addressCountry: "RS" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <AboutView data={data} />
    </>
  );
}
