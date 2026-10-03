"use client";

import type { AdminRouteCard } from "../../lib/home/default-routes";
import type { HeroScenes } from "../../lib/home/hero-manifest";
import PageAdminEditorDock from "../page-admin-editor-dock";
import HomeHero from "./home-hero";
import { HomeMotion } from "./home-motion";
import {
  ClosingSection,
  PartnerStrip,
  ProcessSection,
  ProofSection,
  ReligiousSpotlight,
  RoutesSection,
  UpcomingSection,
  VehicleSection,
  type PartnerStripData,
  type UpcomingCard,
  type VehicleImages,
} from "./home-sections";

export type HomePageData = {
  scenes: HeroScenes;
  upcoming: UpcomingCard[];
  partners: PartnerStripData | null;
  routes: AdminRouteCard[];
  vehicles: VehicleImages;
  typeCounts: Record<string, number>;
};

/**
 * Homepage ("putni dnevnik"): data comes from the server page; this client view
 * only switches the language and runs the motion. Rhythm: dense, then quiet.
 */
export default function HomePageView({ data }: { data: HomePageData }) {
  return (
    <main id="main-content" className="ablux-home">
      <HomeMotion />
      <HomeHero scenes={data.scenes} typeCounts={data.typeCounts} />
      <UpcomingSection items={data.upcoming} scenes={data.scenes} />
      <RoutesSection adminRoutes={data.routes} />
      <ReligiousSpotlight scenes={data.scenes} count={data.typeCounts["verski-turizam"] ?? 0} />
      <PartnerStrip data={data.partners} />
      <ProofSection />
      <ProcessSection />
      <VehicleSection images={data.vehicles} scenes={data.scenes} />
      <ClosingSection />
      <PageAdminEditorDock slot="home" className="ablux-admin-dock" />
    </main>
  );
}
