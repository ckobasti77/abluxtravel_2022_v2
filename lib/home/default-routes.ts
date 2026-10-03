// "Najtraženije rute" defaults: the five approved routes. Admin route cards
// (homeRouteSlides with a link) take their places in order; these fill the rest.

import type { BrandGlyphName } from "../../components/ui/brand-glyphs";

export type RouteTone = "brick" | "teal" | "teal-deep" | "gold";

export type HomeRoute = {
  id: string;
  href: string;
  image: string;
  /** Local approved art (next/image) or a Convex storage URL (plain img). */
  local: boolean;
  tone: RouteTone;
  glyph: BrandGlyphName;
  title: { sr: string; en: string };
  meta: { sr: string; en: string };
  body: { sr: string; en: string } | null;
  /** Short line on the paper tag; null shows "Detalji". */
  tag: { sr: string; en: string } | null;
};

export const DEFAULT_ROUTES: HomeRoute[] = [
  {
    id: "sveta-zemlja",
    href: "/verski-turizam",
    image: "/generated/route-sveta-zemlja.png",
    local: true,
    tone: "brick",
    glyph: "cross",
    title: { sr: "Sveta zemlja", en: "Holy Land" },
    meta: { sr: "Jerusalim · Vitlejem · Nazaret", en: "Jerusalem · Bethlehem · Nazareth" },
    body: {
      sr: "Koračajmo tragovima vere, kroz mesta koja su oblikovala istoriju hrišćanstva.",
      en: "Walking in the footsteps of faith, through places that shaped the history of Christianity.",
    },
    tag: { sr: "Hodočašće sa smislom", en: "A pilgrimage with meaning" },
  },
  {
    id: "ostrog-manastiri",
    href: "/verski-turizam",
    image: "/generated/route-ostrog-manastiri.png",
    local: true,
    tone: "brick",
    glyph: "church",
    title: { sr: "Ostrog i manastiri", en: "Ostrog and monasteries" },
    meta: { sr: "Crna Gora · Srbija", en: "Montenegro · Serbia" },
    body: null,
    tag: { sr: "Duhovna snaga i mir", en: "Spiritual strength and peace" },
  },
  {
    id: "rim-toskana",
    href: "/ponude?zemlja=italija",
    image: "/generated/route-rim-toskana.png",
    local: true,
    tone: "gold",
    glyph: "city",
    title: { sr: "Rim i Toskana", en: "Rome and Tuscany" },
    meta: { sr: "Vera · istorija · lepota", en: "Faith · history · beauty" },
    body: null,
    tag: { sr: "Klasik koji inspiriše", en: "A classic that inspires" },
  },
  {
    id: "mediteran",
    href: "/ponude?tip=letovanje",
    image: "/generated/route-mediteran.png",
    local: true,
    tone: "teal",
    glyph: "sea",
    title: { sr: "Mediteran", en: "Mediterranean" },
    meta: { sr: "More · sunce · odmor", en: "Sea · sun · rest" },
    body: null,
    tag: { sr: "Leto na pravi način", en: "Summer done right" },
  },
  {
    id: "evropski-gradovi",
    href: "/ponude?tip=evropski-gradovi",
    image: "/generated/route-evropski-gradovi.png",
    local: true,
    tone: "teal-deep",
    glyph: "city",
    title: { sr: "Evropski gradovi", en: "European cities" },
    meta: { sr: "Kultura · doživljaji · vikendi", en: "Culture · experiences · weekends" },
    body: null,
    tag: { sr: "Kratko putovanje, dug utisak", en: "A short trip, a lasting impression" },
  },
];

export type AdminRouteCard = {
  id: string;
  title: { sr: string; en: string };
  meta: { sr: string; en: string };
  body: { sr: string; en: string } | null;
  href: string;
  tone: RouteTone | null;
  imageUrl: string | null;
};

const TONE_GLYPH: Record<RouteTone, BrandGlyphName> = { brick: "church", teal: "sea", "teal-deep": "city", gold: "compass" };

/**
 * Admin route cards first (in their order), then the defaults, five in total.
 * A default is skipped when an admin card already has the same title.
 */
export function mergeRoutes(admin: AdminRouteCard[], defaults: HomeRoute[] = DEFAULT_ROUTES): HomeRoute[] {
  const fromAdmin: HomeRoute[] = admin
    .filter((card) => card.imageUrl && card.href.startsWith("/") && !card.href.startsWith("//"))
    .map((card) => {
      const tone = card.tone ?? "teal";
      return {
        id: card.id,
        href: card.href,
        image: card.imageUrl as string,
        local: false,
        tone,
        glyph: TONE_GLYPH[tone],
        title: card.title,
        meta: card.meta,
        body: card.body,
        tag: null,
      };
    });
  const taken = new Set(fromAdmin.map((route) => route.title.sr.trim().toLowerCase()));
  const rest = defaults.filter((route) => !taken.has(route.title.sr.trim().toLowerCase()));
  return [...fromAdmin, ...rest].slice(0, 5);
}
