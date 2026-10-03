// Fixture routes per partner for offline runs (`npm run sync:relay -- --fixtures`).
// Only URLs with a saved page are routable; the relay skips the rest.
import type { FixtureRoute } from "./fixture-http";

export const FIXTURE_ROUTES: Record<string, FixtureRoute[]> = {
  dunavturs: [
    { match: /\/sitemap\.xml$/, file: "dunavturs/sitemap.xml" },
    { match: /vila-sakis-polihrono\.html$/, file: "dunavturs/vila-sakis-polihrono.html" },
    { match: /istanbul-dan-primirja\.html$/, file: "dunavturs/istanbul-dan-primirja.html" },
  ],
  mayak: [
    { match: /\/package-sitemap\.xml$/, file: "tourpackage/mayak-package-sitemap.xml" },
    { match: /\/package-category\/[a-z-]+\/(page\/\d+\/)?$/, file: "tourpackage/mayak-letovanje-p1.html" },
    { match: /\/package\/malta-ostrvo-vitezova-istorije-4-dana-avionom\/$/, file: "tourpackage/mayak-malta.html" },
    { match: /\/package\/hotel-tropical-4-hanioti-hit-ponuda\/$/, file: "tourpackage/mayak-tropical.html" },
  ],
  nitravel: [
    { match: /\/tour-item-sitemap\.xml$/, file: "wp-roam/nitravel-tour-item-sitemap.xml" },
    { match: /\/tour-item\/prag\/$/, file: "wp-roam/nitravel-prag.html" },
    { match: /\/tour-item\/vila-elpida\/$/, file: "wp-roam/nitravel-vila-elpida.html" },
  ],
  tomash: [
    { match: /\/wp-json\/wp\/v2\/posts\?per_page=100&page=1&/, file: "wp-rest/tomash-posts.json" },
    { match: /\/wp-json\/wp\/v2\/posts\?per_page=100&page=\d+&/, file: "wp-rest/posts-page-out-of-range.SYNTHETIC.json", status: 400 },
    { match: /\/wp-json\/wp\/v2\/categories\?/, file: "wp-rest/tomash-categories.json" },
    { match: /\/wp-json\/wp\/v2\/posts\/7082\?/, file: "wp-rest/tomash-post-7082.json" },
  ],
};
