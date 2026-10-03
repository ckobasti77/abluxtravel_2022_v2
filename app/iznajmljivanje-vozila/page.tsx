import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { VehiclesPageView } from "@/components/pages/vehicles/vehicles-page-view";
import { api } from "@/convex/_generated/api";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { createPageMetadata } from "@/lib/page-metadata";
import { SITE_NAME, SITE_URL, jsonLdText } from "@/lib/seo";
import { VEHICLE_RENTAL_PATH } from "@/lib/vehicle-rentals";

const DESCRIPTION =
  "Setra autobus i luksuzni kombi Mercedes Sprinter sa profesionalnim vozačem za ekskurzije, hodočašća, transfere i grupna putovanja. Pošaljite upit ABLux Travel agenciji iz Beograda.";

export const metadata: Metadata = createPageMetadata({
  title: "Iznajmljivanje autobusa i kombija sa vozačem",
  description: DESCRIPTION,
  canonical: VEHICLE_RENTAL_PATH,
  keywords: [
    "iznajmljivanje autobusa",
    "autobus sa vozačem",
    "iznajmljivanje kombija sa vozačem",
    "rent a bus Beograd",
    "Mercedes Sprinter",
    "Setra",
    "prevoz grupa",
  ],
});

/** A failed query shows the fallback photos, never an error page. */
async function loadVehicleImages() {
  try {
    return await fetchQuery(api.vehicleRentalImages.list, {});
  } catch (error) {
    console.error("[vozila] query failed", error instanceof Error ? error.message : error);
    return [];
  }
}

export default async function IznajmljivanjeVozilaPage() {
  const [scenes, images] = await Promise.all([loadHeroScenes(), loadVehicleImages()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Iznajmljivanje autobusa i kombija sa vozačem",
    serviceType: "Iznajmljivanje vozila sa vozačem",
    description: DESCRIPTION,
    url: `${SITE_URL}${VEHICLE_RENTAL_PATH}`,
    provider: { "@type": "TravelAgency", name: SITE_NAME, url: SITE_URL },
    areaServed: { "@type": "Country", name: "Serbia" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <VehiclesPageView scene={scenes.rentabus.desktop.poster ? scenes.rentabus : null} images={images} />
    </>
  );
}
