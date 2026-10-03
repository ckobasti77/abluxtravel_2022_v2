// Destination pages (step 12): shared types and pure helpers for /putovanja,
// /putovanja/[zemlja] and /destinacije. Server and client safe (no hooks).
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { HeroScenes } from "../../../lib/home/hero-manifest";
import { formatDate } from "../../../lib/catalog/format";
import { getTravelType, isTravelTypeSlug } from "../../../lib/search/travel-types";
import type { BrandGlyphName } from "../../ui/brand-glyphs";
import { formatAmount } from "../../ui/cn";

export type Language = "sr" | "en";
export type CountryEntry = FunctionReturnType<typeof api.catalog.destinationIndex>[number];
export type TravelGroup = NonNullable<FunctionReturnType<typeof api.slides.getTravelGroupBySlug>>;
export type PageDestination = FunctionReturnType<typeof api.destinations.listByPage>[number];
export type CountrySearch = FunctionReturnType<typeof api.catalog.search>;

/** Hero/postcard image: src plus an optional tall variant for phones. */
export type HeroImage = { src: string; mobileSrc?: string; alt?: string };

const NBSP = " ";

/** Serbian plural: one (1, 21…), few (2–4, 22–24…), many. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function offersLabel(count: number, language: Language): string {
  if (language === "en") return `${count} ${count === 1 ? "offer" : "offers"}`;
  return `${count} ${plural(count, "ponuda", "ponude", "ponuda")}`;
}

export function countriesLabel(count: number, language: Language): string {
  if (language === "en") return `${count} ${count === 1 ? "country" : "countries"}`;
  return `${count} ${plural(count, "zemlja", "zemlje", "zemalja")}`;
}

/** "od 35 € po osobi" (destinationIndex prices are EUR per person). */
export function priceFromLabel(amount: number, language: Language): string {
  return language === "en" ? `from €${formatAmount(amount)} per person` : `od ${formatAmount(amount)}${NBSP}€ po osobi`;
}

/** "Grčka, Hanioti i Pefkohori" style joining with a final "i"/"and". */
export function joinList(items: string[], language: Language): string {
  if (items.length <= 1) return items.join("");
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(", ")} ${language === "en" ? "and" : "i"} ${last}`;
}

/** Diacritics- and case-insensitive text for the directory search ("Beč" = "bec"). */
export function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Engraved glyph for a country (its most common travel type). */
export function countryGlyph(entry: Pick<CountryEntry, "travelTypes"> | null | undefined): BrandGlyphName {
  const top = entry?.travelTypes.find((type) => isTravelTypeSlug(type.slug));
  if (!top || !isTravelTypeSlug(top.slug)) return "compass";
  return getTravelType(top.slug).glyph;
}

/**
 * Approved AI destination art when a country or travel group has no photo:
 * Italy → Rim/Toskana, pilgrimages → Sveta zemlja / Ostrog scene,
 * sea holidays → Mediteran scene, everything else → Evropa scene.
 */
export function fallbackHeroImage(
  slug: string,
  entry: Pick<CountryEntry, "travelTypes"> | null | undefined,
  scenes: HeroScenes
): HeroImage {
  const scene = (key: keyof HeroScenes, fallback: string): HeroImage => ({
    src: scenes[key].desktop.poster ?? fallback,
    mobileSrc: scenes[key].mobile.poster ?? undefined,
  });
  if (slug === "italija") return { src: "/generated/route-rim-toskana.png" };
  if (slug === "izrael" || slug === "palestina" || slug === "jordan") return { src: "/generated/route-sveta-zemlja.png" };
  const top = entry?.travelTypes[0]?.slug;
  if (top === "verski-turizam") return scene("hodocasca", "/generated/ablux-hero-reference-desktop.png");
  if (top === "letovanje" || top === "krstarenja") return scene("mediteran", "/generated/route-mediteran.png");
  return scene("evropa", "/generated/route-evropski-gradovi.png");
}

/** Agencies with public offers in a search result (partner agencies plus ABLux). */
export function agencyCount(search: CountrySearch | null): number | null {
  if (!search) return null;
  const ablux = search.facets.vrsta.find((entry) => entry.value === "ablux")?.count ?? 0;
  return search.facets.partner.length + (ablux > 0 ? 1 : 0);
}

/**
 * Short intro built only from facts in the data:
 * "Za destinaciju Grčka trenutno nudimo 97 putovanja 9 agencija. Najviše ponuda je
 * za Hanioti, Pefkohori i Kriopigi. Prvi polazak je 28. 11. 2026. Cene počinju od 35 € po osobi."
 */
export function countryIntro(
  input: { name: string; count: number; agencies: number | null; entry: CountryEntry | null },
  language: Language
): string[] {
  const { name, count, agencies, entry } = input;
  if (count === 0) return [];
  const sentences: string[] = [];
  if (language === "en") {
    const from = agencies ? ` from ${agencies} ${agencies === 1 ? "agency" : "agencies"}` : "";
    sentences.push(`For ${name} we currently offer ${count} ${count === 1 ? "trip" : "trips"}${from}.`);
  } else {
    const trips = `${count} ${plural(count, "putovanje", "putovanja", "putovanja")}`;
    const from = agencies
      ? agencies === 1
        ? " od jedne agencije"
        : ` od ${agencies} ${plural(agencies, "agencije", "agencije", "agencija")}`
      : "";
    sentences.push(`Za destinaciju ${name} trenutno nudimo ${trips}${from}.`);
  }

  const places = (entry?.places ?? []).slice(0, 3).map((place) => place.name);
  if (places.length > 0) {
    const allInOne = places.length === 1 && entry?.places[0]?.count === count;
    if (language === "en") {
      sentences.push(allInOne ? `All offers are for ${places[0]}.` : `Most offers are for ${joinList(places, "en")}.`);
    } else {
      sentences.push(allInOne ? `Sve ponude su za ${places[0]}.` : `Najviše ponuda je za ${joinList(places, "sr")}.`);
    }
  }

  if (entry?.nextDeparture) {
    const date = formatDate(entry.nextDeparture, language);
    sentences.push(language === "en" ? `The first departure is on ${date}.` : `Prvi polazak je ${date}`);
  }
  if (entry?.priceFrom) {
    sentences.push(
      language === "en"
        ? `Prices start ${priceFromLabel(entry.priceFrom, "en")}.`
        : `Cene počinju ${priceFromLabel(entry.priceFrom, "sr")}.`
    );
  }
  return sentences;
}

/** Text of a travel group's admin description split into paragraphs. */
export function paragraphs(text: string | undefined | null): string[] {
  return (text ?? "")
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** First usable image of a travel group (hero image, then detail images). */
export function travelGroupImage(group: Pick<TravelGroup, "heroMediaType" | "heroMediaUrl" | "detailMedia" | "imageUrls">): string | null {
  if (group.heroMediaType === "image" && group.heroMediaUrl) return group.heroMediaUrl;
  const detail = group.detailMedia?.find((media) => media.mediaType === "image" && media.url);
  if (detail) return detail.url;
  return group.imageUrls.find(Boolean) ?? null;
}

/** Hero video of a travel group (admin upload), when it has one. */
export function travelGroupVideo(group: Pick<TravelGroup, "heroMediaType" | "heroMediaUrl" | "detailMedia">): string | null {
  if (group.heroMediaType === "video" && group.heroMediaUrl) return group.heroMediaUrl;
  return group.detailMedia?.find((media) => media.mediaType === "video" && media.url)?.url ?? null;
}

/** "/ponude?zemlja=grcka&q=Hanioti" */
export function placeHref(countrySlug: string, place: string): string {
  return `/ponude?${new URLSearchParams({ zemlja: countrySlug, q: place }).toString()}`;
}
