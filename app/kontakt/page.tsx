import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { ContactPageView } from "@/components/pages/contact/contact-page-view";
import { isContactTopic, type ContactSettings } from "@/components/pages/contact/contact-topics";
import { api } from "@/convex/_generated/api";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { createPageMetadata } from "@/lib/page-metadata";
import { buildOrganizationJsonLd, SITE_NAME, SITE_URL, jsonLdText } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Kontakt",
  description:
    "Kontaktirajte ABLux Travel iz Beograda: upit za verski turizam, letovanje, evropske ture ili iznajmljivanje autobusa i kombija sa vozačem.",
  canonical: "/kontakt",
  keywords: ["kontakt", "turistička agencija kontakt", "ABLux Travel Beograd", "upit za putovanje"],
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EMPTY: ContactSettings = { address: "", phone: "", email: "", instagramUrl: "", workingHours: "", licenseNumber: "" };

/** Contact data only from Convex `settings`; a failed query renders the neutral fallback. */
async function loadSettings(): Promise<ContactSettings> {
  try {
    const data = await fetchQuery(api.settings.get, {});
    if (!data) return EMPTY;
    return {
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      instagramUrl: data.instagramUrl.trim(),
      workingHours: data.workingHours.trim(),
      licenseNumber: (data.licenseNumber ?? "").trim(),
    };
  } catch (error) {
    console.error("[kontakt] settings query failed", error instanceof Error ? error.message : error);
    return EMPTY;
  }
}

export default async function KontaktPage({ searchParams }: { searchParams: SearchParams }) {
  const [scenes, settings, params] = await Promise.all([loadHeroScenes(), loadSettings(), searchParams]);
  const initialTopic = isContactTopic(params.tema) ? params.tema : undefined;

  const scene = scenes.mediteran;
  const heroImage = scene.desktop.poster ? { src: scene.desktop.poster, mobileSrc: scene.mobile.poster ?? undefined } : null;

  const hasContact = Boolean(settings.address || settings.phone || settings.email);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Kontakt | ${SITE_NAME}`,
    url: `${SITE_URL}/kontakt`,
    inLanguage: "sr-Latn",
    // Only the fields that are really set in settings (no placeholder contact data).
    ...(hasContact ? { mainEntity: buildOrganizationJsonLd(settings) } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <ContactPageView settings={settings} heroImage={heroImage} initialTopic={initialTopic} />
    </>
  );
}
