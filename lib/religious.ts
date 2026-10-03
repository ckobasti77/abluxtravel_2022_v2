import type { AggregatedOffer } from "./use-offers";

export const MANUAL_RELIGIOUS_SOURCE_SLUG = "manual-verski";

export const RELIGIOUS_KEYWORDS = [
  "verski",
  "religious",
  "hodo",
  "pilgr",
  "svet",
  "holy",
  "manast",
  "monast",
  "church",
  "jerusalim",
  "jerusalem",
  "sinaj",
  "sinai",
  "ostrog",
];

export const isReligiousOffer = (
  offer: Pick<AggregatedOffer, "title" | "destination" | "tags" | "sourceSlug">
) => {
  const source = `${offer.title} ${offer.destination} ${offer.sourceSlug} ${offer.tags.join(" ")}`
    .toLowerCase()
    .trim();
  return RELIGIOUS_KEYWORDS.some((keyword) => source.includes(keyword));
};

export const normalizeReligiousTags = (tags: string[]) => {
  const merged = [...tags, "verski"]
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(merged));
};
