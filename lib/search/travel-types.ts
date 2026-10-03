import type { BrandGlyphName } from "../../components/ui/brand-glyphs";

/*
 * Travel types ("tip putovanja") used by the mega menu, the search and the
 * catalog URL (`/ponude?tip=<slug>`). Slugs are stable URL values.
 * Keywords match offer text until Partner Sync (steps 07–10) stores a real
 * category on every offer card; then only the source in trip-search.ts changes.
 */

export type TravelTypeSlug =
  | "verski-turizam"
  | "letovanje"
  | "evropski-gradovi"
  | "nova-godina-i-praznici"
  | "zimovanje"
  | "daleka-putovanja"
  | "izleti"
  | "krstarenja";

export type TravelType = {
  slug: TravelTypeSlug;
  label: { sr: string; en: string };
  glyph: BrandGlyphName;
  /** Lowercase fragments matched against title, destination, tags and category name. */
  keywords: string[];
};

export const TRAVEL_TYPES: TravelType[] = [
  {
    slug: "verski-turizam",
    label: { sr: "Verski turizam", en: "Religious tourism" },
    glyph: "church",
    keywords: ["verski", "religious", "hodo", "pilgr", "manast", "monast", "svet", "holy", "jerusal", "ostrog", "sinaj", "sinai"],
  },
  {
    slug: "letovanje",
    label: { sr: "Letovanje", en: "Summer holidays" },
    glyph: "sea",
    keywords: ["letovanj", "leto", "summer", "more", "plaž", "plaz", "beach", "grčk", "grck", "greece", "turs", "turkey", "egipat", "egypt", "tasos", "krf", "halkidik"],
  },
  {
    slug: "evropski-gradovi",
    label: { sr: "Evropski gradovi", en: "European cities" },
    glyph: "city",
    keywords: ["evrop", "europ", "city", "gradov", "rim", "rome", "pariz", "paris", "beč", "bec", "vienna", "prag", "budimpe", "budapest", "barselon", "barcelon", "amsterdam", "toskan", "tuscan", "istanbul", "metropol"],
  },
  {
    slug: "nova-godina-i-praznici",
    label: { sr: "Nova godina i praznici", en: "New Year and holidays" },
    glyph: "compass",
    keywords: ["nova godina", "novogod", "new year", "doček", "docek", "prazni", "holiday", "božić", "bozic", "christmas", "uskrs", "easter", "prvi maj"],
  },
  {
    slug: "zimovanje",
    label: { sr: "Zimovanje", en: "Winter holidays" },
    glyph: "compass",
    keywords: ["zimovanj", "zima", "winter", "ski", "skij", "kopaonik", "jahorina", "bansko"],
  },
  {
    slug: "daleka-putovanja",
    label: { sr: "Daleka putovanja", en: "Long-haul trips" },
    glyph: "compass",
    keywords: ["daleka", "egzot", "exotic", "long-haul", "dubai", "tajland", "thailand", "bali", "maldiv", "kina", "china", "japan", "amerik", "america", "kuba", "cuba", "zanzibar"],
  },
  {
    slug: "izleti",
    label: { sr: "Izleti", en: "Day trips" },
    glyph: "coach",
    keywords: ["izlet", "excursion", "day trip", "jednodnev", "vikend", "weekend"],
  },
  {
    slug: "krstarenja",
    label: { sr: "Krstarenja", en: "Cruises" },
    glyph: "sea",
    keywords: ["krstar", "cruise", "brod", "ship"],
  },
];

export const TRAVEL_TYPE_SLUGS = TRAVEL_TYPES.map((type) => type.slug);

export function isTravelTypeSlug(value: string | null | undefined): value is TravelTypeSlug {
  return Boolean(value) && TRAVEL_TYPE_SLUGS.includes(value as TravelTypeSlug);
}

export function getTravelType(slug: TravelTypeSlug): TravelType {
  return TRAVEL_TYPES.find((type) => type.slug === slug) ?? TRAVEL_TYPES[0];
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Keywords match at the start of a word ("rim" matches "Rim", not "primorje").
const TYPE_PATTERNS = TRAVEL_TYPES.map((type) => ({
  slug: type.slug,
  pattern: new RegExp(`(^|[^\\p{L}])(${type.keywords.map(escapeRegExp).join("|")})`, "u"),
}));

/** All travel types whose keywords appear in the given text. */
export function detectTravelTypes(text: string): TravelTypeSlug[] {
  const haystack = text.toLowerCase();
  return TYPE_PATTERNS.filter(({ pattern }) => pattern.test(haystack)).map(({ slug }) => slug);
}
