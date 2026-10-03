import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { ProgramDetailView } from "@/components/pages/programs/program-detail-view";
import {
  TRANSPORT_LABELS,
  cleanText,
  currencyCode,
  isPurchasable,
  tripCover,
  type TripAccommodation,
  type TripDestination,
} from "@/components/pages/programs/program-utils";
import { formatDate } from "@/lib/catalog/format";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, jsonLdText } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

const loadTrip = cache(async (slug: string) => {
  try {
    return await fetchQuery(api.trips.getBySlug, { slug: decodeURIComponent(slug) });
  } catch (error) {
    console.error("[aranzmani/slug] trip query failed", error instanceof Error ? error.message : error);
    return null;
  }
});

function describe(trip: NonNullable<Awaited<ReturnType<typeof loadTrip>>>) {
  const lead = cleanText(trip.description);
  const facts = [
    trip.departureDate ? `polazak ${formatDate(trip.departureDate, "sr")}` : "",
    trip.days ? `${trip.days} dana` : "",
    trip.departureCity ? `iz grada ${trip.departureCity}` : "",
    TRANSPORT_LABELS.sr[trip.transport].toLowerCase(),
  ]
    .filter(Boolean)
    .join(" · ");
  const text = lead ? `${lead}. ${facts}` : `${trip.title}: ABLux program, ${facts}.`;
  return text.length > 158 ? `${text.slice(0, 155).replace(/\s+\S*$/, "")}…` : text;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const trip = await loadTrip(slug);
  if (!trip) return { title: "Aranžman", robots: { index: false, follow: true } };
  const canonical = `/aranzmani/${trip.slug}`;
  const title = `${trip.title} | Aranžman`;
  const description = describe(trip);
  const image = tripCover(trip) ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    keywords: [trip.title, "aranžman", "ABLux program", trip.departureCity].filter(Boolean),
    alternates: { canonical },
    // Completed programs stay reachable for old links but leave the index.
    robots: trip.status === "completed" ? { index: false, follow: true } : undefined,
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

export default async function TripPage({ params }: { params: Params }) {
  const { slug } = await params;
  const trip = await loadTrip(slug);
  if (!trip) notFound();

  const [accommodations, destinations] = await Promise.all([
    fetchQuery(api.accommodations.listByTrip, { tripId: trip._id }).catch(() => [] as TripAccommodation[]),
    fetchQuery(api.destinations.listByTrip, { tripId: trip._id }).catch(() => [] as TripDestination[]),
  ]);

  const url = `${SITE_URL}/aranzmani/${trip.slug}`;
  const images = [tripCover(trip), ...trip.detailMedia.filter((media) => media.mediaType === "image").map((media) => media.url), ...trip.imageUrls]
    .filter((src): src is string => Boolean(src && src.startsWith("https://")))
    .filter((src, index, all) => all.indexOf(src) === index)
    .slice(0, 6);
  const currency = currencyCode(trip.currency);
  const itinerary = trip.itinerary.filter((item) => cleanText(item.description));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: trip.title,
      description: describe(trip),
      url,
      ...(images.length ? { image: images } : {}),
      ...(itinerary.length
        ? {
            itinerary: {
              "@type": "ItemList",
              itemListElement: itinerary.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: { "@type": "TouristAttraction", name: `Dan ${item.day}`, description: cleanText(item.description).slice(0, 300) },
              })),
            },
          }
        : {}),
      provider: { "@type": "TravelAgency", name: SITE_NAME, url: SITE_URL },
      ...(trip.price > 0 && /^[A-Z]{3}$/.test(currency)
        ? {
            offers: {
              "@type": "Offer",
              price: trip.price,
              priceCurrency: currency,
              url,
              availability: isPurchasable(trip) ? "https://schema.org/InStock" : "https://schema.org/Discontinued",
              ...(trip.departureDate ? { validFrom: trip.departureDate } : {}),
              seller: { "@type": "TravelAgency", name: SITE_NAME, url: SITE_URL },
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
        { "@type": "ListItem", position: 3, name: trip.title, item: url },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <ProgramDetailView trip={trip} accommodations={accommodations} destinations={destinations} />
    </>
  );
}
