import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { OfferDetailView } from "@/components/catalog/offer-detail-view";
import { parseCatalogQuery } from "@/lib/catalog/filters";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, jsonLdText } from "@/lib/seo";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const loadOffer = cache((slug: string) => fetchQuery(api.catalog.getBySlug, { slug: decodeURIComponent(slug) }));

const stripHtml = (html: string | undefined) =>
  (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function describe(data: NonNullable<Awaited<ReturnType<typeof loadOffer>>>) {
  const { card, detail } = data;
  const lead = card.intro || detail?.subtitle || stripHtml(detail?.descriptionHtml);
  const facts = [
    [card.place, card.countryName].filter(Boolean).join(", "),
    card.priceKind === "from" && card.priceFrom ? `od ${card.priceFrom} €` : "cena na upit",
    `organizator ${card.organizerName}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const text = lead ? `${lead} ${facts}` : `${card.title}: ${facts}.`;
  return text.length > 158 ? `${text.slice(0, 155).replace(/\s+\S*$/, "")}…` : text;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadOffer(slug);
  if (!data || data.card.kind === "ablux") return { title: "Ponuda", robots: { index: false, follow: true } };
  const { card } = data;
  const canonical = `/ponude/${card.slug}`;
  const title = [card.title, card.place].filter(Boolean).join(", ");
  const description = describe(data);
  const image = card.coverUrl ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical },
    // Expired or withdrawn offers stay reachable for old links but leave the index.
    robots: data.notice ? { index: false, follow: true } : undefined,
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

export default async function OfferPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const data = await loadOffer(slug);
  if (!data) notFound();
  // ABLux programs have their own pages (cart and IPS deposit live there).
  if (data.card.kind === "ablux") permanentRedirect(data.card.href);

  const search = await searchParams;
  const query = parseCatalogQuery(search);
  const similar = await fetchQuery(api.catalog.similar, { slug: data.card.slug, limit: 3 });
  const { card, detail } = data;
  const url = `${SITE_URL}/ponude/${card.slug}`;

  const images = [card.coverUrl, ...(detail?.gallery ?? []).map((image) => image.src)].filter((src): src is string => Boolean(src)).slice(0, 6);
  const offer =
    card.priceKind === "from" && card.priceFrom && card.currency === "EUR"
      ? {
          "@type": "Offer",
          price: card.priceFrom,
          priceCurrency: "EUR",
          url,
          availability: data.notice ? "https://schema.org/Discontinued" : "https://schema.org/InStock",
          ...(card.nextDepartureDate ? { validFrom: card.nextDepartureDate } : {}),
          seller: { "@type": "TravelAgency", name: SITE_NAME, url: SITE_URL },
        }
      : undefined;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: card.title,
      description: describe(data),
      url,
      ...(images.length ? { image: images } : {}),
      ...(card.travelTypes.length ? { touristType: card.travelTypes } : {}),
      ...(card.place || card.countryName
        ? {
            itinerary: {
              "@type": "Place",
              name: [card.place, card.countryName].filter(Boolean).join(", "),
              ...(detail?.geo ? { geo: { "@type": "GeoCoordinates", latitude: detail.geo.lat, longitude: detail.geo.lng } } : {}),
            },
          }
        : {}),
      provider: {
        "@type": "TravelAgency",
        name: detail?.organizer.name || card.organizerName,
        ...(detail?.sourceUrl ? { url: detail.sourceUrl } : {}),
      },
      ...(offer ? { offers: offer } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Ponude", item: `${SITE_URL}/ponude` },
        { "@type": "ListItem", position: 3, name: card.title, item: url },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <OfferDetailView data={data} similar={similar} openInquiry={search.upit === "1"} travelers={query.putnika} />
    </>
  );
}
