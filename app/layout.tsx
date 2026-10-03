import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { EB_Garamond, Manrope } from "next/font/google";
import QuickActions from "../components/quick-actions";
import SiteFooter from "../components/site-footer";
import SiteNavigation from "../components/site-navigation";
import {
  buildOrganizationJsonLd,
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  SITE_URL_OBJECT,
  jsonLdText,
} from "../lib/seo";
import "./globals.css";
import Providers from "./providers";

// Manrope: UI and body. latin-ext so č ć ž š đ are in the preloaded files.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

// Display serif. EB Garamond replaced Cormorant Garamond in step 04: Cormorant's
// lowercase carons (č ž š) float detached above the letter at weights 400-600
// (night-run/qa/04/glyph-compare-zoom.png). Variable font, 400-800 + italic.
const editorial = EB_Garamond({
  variable: "--font-editorial",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

// Runs before paint. "Papir" (light) is the default; only an explicit user
// choice stored in localStorage switches to "Tinta" (dark).
const themeScript = `(() => {
  let theme = "light";
  try {
    const stored = localStorage.getItem("ablux_theme");
    if (stored === "light" || stored === "dark") theme = stored;
  } catch (error) {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;

export const metadata: Metadata = {
  metadataBase: SITE_URL_OBJECT,
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} | Turistička agencija`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  category: "travel",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
    languages: {
      "sr-Latn-RS": "/",
      "en-US": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    alternateLocale: ["en_US"],
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Turistička agencija`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME}: hodočašća i organizovana putovanja iz Beograda`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Turistička agencija`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/stari-logo.png", type: "image/png" }],
    shortcut: [{ url: "/stari-logo.png", type: "image/png" }],
    apple: [{ url: "/stari-logo.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f4ea" },
    { media: "(prefers-color-scheme: dark)", color: "#06151a" },
  ],
};

const organizationJsonLd = buildOrganizationJsonLd();

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["sr-Latn-RS", "en-US"],
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/ponude?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
    <html lang="sr-Latn" className={`${manrope.variable} ${editorial.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdText(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdText(websiteJsonLd) }}
        />
        <Providers>
          <a className="skip-link" href="#main-content">
            Preskoči na sadržaj
          </a>
          <SiteNavigation />
          <QuickActions />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
    </ConvexAuthNextjsServerProvider>
  );
}

