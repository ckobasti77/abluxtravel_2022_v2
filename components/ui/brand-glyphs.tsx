import type { SVGProps } from "react";

/*
 * Engraved brand glyphs for "putni dnevnik" moments (tickets, postcards, stamps,
 * empty states). 24px grid, 1.5 stroke, round caps — same weight as lucide icons.
 * Religious glyphs (Cross, Church) are for religious-tourism content only.
 */

type GlyphProps = SVGProps<SVGSVGElement> & { title?: string };

function Glyph({ title, children, ...rest }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function CompassGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6.6" strokeOpacity="0.45" />
      <path d="M12 3.2 13.6 10.4 20.8 12 13.6 13.6 12 20.8 10.4 13.6 3.2 12 10.4 10.4Z" />
      <path d="M12 10.4v3.2M10.4 12h3.2" strokeOpacity="0.6" />
    </Glyph>
  );
}

export function PinGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 21s6.5-6.1 6.5-11.2a6.5 6.5 0 0 0-13 0C5.5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </Glyph>
  );
}

export function CrossGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3v18M7 8h10M8.5 15.5l7-1.6" />
      <path d="M10.6 3h2.8M10.6 21h2.8" strokeOpacity="0.6" />
    </Glyph>
  );
}

export function ChurchGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2.5v3M10.7 3.8h2.6" />
      <path d="M7.5 11a4.5 4.5 0 0 1 9 0" />
      <path d="M6 11h12v9.5H6zM4 20.5h16" />
      <path d="M10.2 20.5v-3.6a1.8 1.8 0 0 1 3.6 0v3.6" />
      <path d="M12 5.5v1.1" strokeOpacity="0.6" />
    </Glyph>
  );
}

export function SeaGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="15.5" cy="8" r="3" />
      <path d="M15.5 2.8v1.1M20.7 8h-1.1M19.2 4.3l-.8.8" strokeOpacity="0.6" />
      <path d="M3 15.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2" />
      <path d="M3 19.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2" strokeOpacity="0.55" />
    </Glyph>
  );
}

export function CityGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3 20.5h18" />
      <path d="M5 20.5V10l3.5-2.5L12 10v10.5" />
      <path d="M12 20.5V6.5l2.2-3 2.3 3v14" />
      <path d="M16.5 20.5V12H20v8.5" />
      <path d="M7.2 20.5v-3.3a1.3 1.3 0 0 1 2.6 0v3.3M14.2 10v1.5M8.5 12.5v1" strokeOpacity="0.6" />
    </Glyph>
  );
}

export function CoachGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 17V7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5V17h-17Z" />
      <path d="M3.5 11.5h17M8 5v6.5M12.5 5v6.5M17 5v6.5" strokeOpacity="0.6" />
      <circle cx="7.5" cy="18.2" r="1.6" />
      <circle cx="16.5" cy="18.2" r="1.6" />
    </Glyph>
  );
}

/** Instagram mark in the same stroke style (lucide v1 ships no brand icons). */
export function InstagramGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </Glyph>
  );
}

/** Three wavy cancellation lines for postcard postmarks. */
export function CancelLines(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 104 30" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M2 5c8-4 12 4 20 0s12-4 20 0 12 4 20 0 12-4 20 0 12 4 20 0" />
      <path d="M2 15c8-4 12 4 20 0s12-4 20 0 12 4 20 0 12-4 20 0 12 4 20 0" />
      <path d="M2 25c8-4 12 4 20 0s12-4 20 0 12 4 20 0 12-4 20 0 12 4 20 0" />
    </svg>
  );
}

export const BRAND_GLYPHS = {
  compass: CompassGlyph,
  pin: PinGlyph,
  cross: CrossGlyph,
  church: ChurchGlyph,
  sea: SeaGlyph,
  city: CityGlyph,
  coach: CoachGlyph,
} as const;

export type BrandGlyphName = keyof typeof BRAND_GLYPHS;
