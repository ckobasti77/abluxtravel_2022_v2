import type { MetadataRoute } from "next";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
} from "../lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#070f1e",
    theme_color: "#070f1e",
    lang: "sr",
    categories: ["travel", "tourism"],
    icons: [
      {
        src: "/stari-logo.png",
        sizes: "301x318",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
