import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "./seo";

type PageMetadataInput = {
  title: string;
  description: string;
  canonical: string;
  keywords?: string[];
};

export const createPageMetadata = ({
  title,
  description,
  canonical,
  keywords,
}: PageMetadataInput): Metadata => ({
  title,
  description,
  keywords,
  alternates: {
    canonical,
  },
  openGraph: {
    type: "website",
    title: `${title} | ${SITE_NAME}`,
    description,
    url: canonical,
    siteName: SITE_NAME,
    locale: "sr_RS",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [DEFAULT_OG_IMAGE],
  },
});
