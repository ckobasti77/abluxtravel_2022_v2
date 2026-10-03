import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { CatalogCard } from "@/components/catalog/offer-ticket";
import {
  ReligiousView,
  type CalendarEntry,
  type CalendarMonth,
  type ReligiousProgram,
} from "@/components/pages/religious/religious-view";
import { loadHeroScenes } from "@/lib/home/hero-manifest.server";
import { createPageMetadata } from "@/lib/page-metadata";
import { MANUAL_RELIGIOUS_SOURCE_SLUG } from "@/lib/religious";
import { SITE_URL, jsonLdText } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Verski turizam",
  description:
    "Hodočašća ABLux Travel i verske ponude partnerskih agencija: manastiri Srbije i Crne Gore, Ostrog i Sveta zemlja, sa kalendarom polazaka za narednih 12 meseci.",
  canonical: "/verski-turizam",
  keywords: ["verski turizam", "hodočašće", "manastiri", "Ostrog", "ABLux Travel"],
});

/** A failed query never breaks the page: the section shows its empty state. */
async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[verski-turizam] query failed", error instanceof Error ? error.message : error);
    return fallback;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function todayBelgrade(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** "2026-10" → the next 12 month keys starting with the current month. */
function nextMonths(today: string, count = 12): string[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const total = month - 1 + index;
    return `${year + Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

export default async function VerskiTurizamPage() {
  const today = todayBelgrade();
  const [scenes, liveBoard, catalog] = await Promise.all([
    loadHeroScenes(),
    safe(() => fetchQuery(api.offers.listLiveBoard, { limit: 100 }), []),
    safe(() => fetchQuery(api.catalog.search, { tip: "verski-turizam", pageSize: 120 }), null),
  ]);

  // ABLux pilgrimages (offers table, source manual-verski): current = future departure or no date yet (on request).
  const programs: ReligiousProgram[] = liveBoard
    .filter((offer) => offer.sourceSlug === MANUAL_RELIGIOUS_SOURCE_SLUG)
    .filter((offer) => !offer.departureDate || !ISO_DATE.test(offer.departureDate) || offer.departureDate.slice(0, 10) >= today)
    .map((offer) => ({
      id: offer._id,
      title: offer.title,
      destination: offer.destination,
      departureCity: offer.departureCity,
      departureDate: offer.departureDate,
      returnDate: offer.returnDate,
      price: offer.price,
      currency: offer.currency,
      seatsLeft: offer.seatsLeft,
      pdfUrl: offer.pdfUrl,
      imageUrl: offer.imageUrls[0],
    }))
    .sort((a, b) => (a.departureDate ?? "9999").localeCompare(b.departureDate ?? "9999"));

  const isCurrent = (card: CatalogCard) =>
    card.availabilityMode === "on_request" || Boolean(card.nextDepartureDate && card.nextDepartureDate >= today);
  const cards = (catalog?.items ?? []).filter(isCurrent);
  // ABLux religious trips have their own program page (cart there); ABLux offers above come from the offers table.
  const abluxTrips = cards.filter((card) => card.kind === "ablux" && card.href.startsWith("/aranzmani/"));
  const partnerOffers = cards.filter((card) => card.kind === "partner");

  const monthKeys = nextMonths(today);
  const byMonth = new Map<string, CalendarEntry[]>(monthKeys.map((key) => [key, []]));
  const add = (month: string, entry: CalendarEntry) => byMonth.get(month)?.push(entry);

  for (const program of programs) {
    if (program.departureDate && ISO_DATE.test(program.departureDate)) {
      add(program.departureDate.slice(0, 7), {
        id: `ablux-${program.id}`,
        date: program.departureDate.slice(0, 10),
        title: program.title,
        organizer: "ABLux Travel",
        href: `#program-${program.id}`,
        ablux: true,
      });
    }
  }
  for (const card of [...abluxTrips, ...partnerOffers]) {
    for (const month of card.departureMonths) {
      const exact = card.nextDepartureDate && card.nextDepartureDate.startsWith(month) ? card.nextDepartureDate : undefined;
      // Months before the next departure are already past for this card.
      if (card.nextDepartureDate && month < card.nextDepartureDate.slice(0, 7)) continue;
      add(month, {
        id: `${card.id}-${month}`,
        date: exact,
        title: card.title,
        organizer: card.kind === "ablux" ? "ABLux Travel" : card.organizerName,
        href: card.href,
        ablux: card.kind === "ablux",
      });
    }
  }
  const calendar: CalendarMonth[] = monthKeys.map((key) => ({
    key,
    entries: (byMonth.get(key) ?? []).sort(
      (a, b) => Number(b.ablux) - Number(a.ablux) || (a.date ?? `${key}-99`).localeCompare(b.date ?? `${key}-99`) || a.title.localeCompare(b.title, "sr")
    ),
  }));

  const listed = [
    ...programs.map((program) => ({ name: program.title, url: `${SITE_URL}/verski-turizam#program-${program.id}` })),
    ...abluxTrips.map((card) => ({ name: card.title, url: `${SITE_URL}${card.href}` })),
    ...partnerOffers.map((card) => ({ name: card.title, url: `${SITE_URL}${card.href}` })),
  ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Verski turizam",
      url: `${SITE_URL}/verski-turizam`,
      inLanguage: "sr-Latn",
      ...(listed.length
        ? {
            mainEntity: {
              "@type": "ItemList",
              itemListElement: listed.slice(0, 50).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: item.url })),
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Verski turizam", item: `${SITE_URL}/verski-turizam` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <ReligiousView scene={scenes.ostrog} programs={programs} abluxTrips={abluxTrips} partnerOffers={partnerOffers} calendar={calendar} />
    </>
  );
}
