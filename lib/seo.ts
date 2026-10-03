const FALLBACK_SITE_URL = "https://www.abluxtravel.com";

export const SITE_NAME = "ABLux Travel";
export const SITE_SHORT_NAME = "ABLux";
export const SITE_DESCRIPTION =
  "ABLux Travel, turistička agencija iz Beograda od 2022: hodočašća i verski turizam, ture po Evropi, ponude 17 partnerskih agencija i prevoz sopstvenim vozilima.";
export const SITE_KEYWORDS = [
  "ABLux Travel",
  "turistička agencija",
  "verski turizam",
  "hodočašća",
  "putovanja",
  "aranžmani",
  "letovanja",
  "gradske ture",
  "ekskurzije",
  "turistička ponuda Srbija",
  "hodočašća iz Beograda",
  "religious tourism",
  "travel agency Serbia",
];
/** 1200x630 JPEG cut from the approved hero poster (hodočašća); stock images are not used. */
export const DEFAULT_OG_IMAGE = "/og-default.jpg";

/**
 * Contact data is never hardcoded (the real values live in Convex `settings`).
 * JSON-LD only includes the fields that are actually known.
 */
export type OrganizationContact = {
  email?: string;
  phone?: string;
  address?: string;
};

export const buildOrganizationJsonLd = (contact: OrganizationContact = {}) => {
  const email = contact.email?.trim();
  const phone = contact.phone?.replace(/[^+\d]/g, "");
  const address = contact.address?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    ...(email ? { email } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            addressCountry: "RS",
          },
        }
      : {}),
    areaServed: {
      "@type": "Country",
      name: "Serbia",
    },
  };
};

const normalizeSiteUrl = (value: string) => {
  const candidate = value.trim();
  if (!candidate) {
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
};

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL
);
export const SITE_URL_OBJECT = new URL(SITE_URL);

/**
 * JSON-LD for <script type="application/ld+json">. Partner titles and texts come
 * from third-party pages, so "<" is escaped to keep "</script>" from closing the tag.
 */
export const jsonLdText = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
