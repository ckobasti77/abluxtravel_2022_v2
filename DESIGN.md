---
name: ABLux Travel — Putni dnevnik
description: A warm editorial travel journal in paper, ink, and gold, with boarding-pass tickets, postcards, stamps, and dashed routes, for a Belgrade agency whose visitors should trust it at first sight.
colors:
  paper: "#F8F4EA"
  paper-light: "#FDFAF3"
  paper-2: "#EFE8DA"
  paper-3: "#E2D9C6"
  paper-edge: "#FFFAF0"
  ink: "#06151A"
  ink-2: "#0A2428"
  ink-3: "#10302F"
  gold: "#B99146"
  gold-2: "#D5A54F"
  gold-ink: "#7D5E27"
  teal: "#0E7C7B"
  teal-ink: "#0B6968"
  teal-deep: "#296266"
  brick: "#9B3A2E"
  ochre: "#C28A2C"
  silver: "#D7E2DF"
  muted: "#5C6662"
  muted-strong: "#4F5956"
  stone: "#9A9384"
  line: "rgba(6, 21, 26, 0.16)"
  line-soft: "rgba(6, 21, 26, 0.12)"
  line-strong: "rgba(6, 21, 26, 0.34)"
  line-field: "#828887"
  overlay: "rgba(6, 21, 26, 0.6)"
  tinta-muted: "#B9BAB4"
  tinta-teal: "#5FB8B4"
  tinta-brick: "#E08B7E"
  tinta-info: "#9CCFD0"
  tinta-line: "rgba(215, 226, 223, 0.14)"
  tinta-line-strong: "rgba(215, 226, 223, 0.28)"
  tinta-line-field: "rgba(215, 226, 223, 0.4)"
typography:
  display:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(3.45rem, 5.55vw, 6rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0"
  headline:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.45rem, 4.25vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0"
  headline-sm:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2rem, 4vw, 3.8rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0"
  title-serif:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.55rem, 2.6vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "0"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0"
  body-lead:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1.7vw, 1.45rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0"
  body-sm:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  overline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.16em"
  plate-numeral:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "'lnum' 1, 'tnum' 1"
  price:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
  admin-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  admin-body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0"
    fontFeature: "'tnum' 1"
rounded:
  stamp: "6px"
  card: "8px"
  field: "10px"
  sheet: "16px"
  pill: "999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
  5xl: "128px"
components:
  button-primary:
    backgroundColor: "{colors.gold-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 22px"
    height: "52px"
  button-ghost-on-ink:
    backgroundColor: "rgba(5, 18, 22, 0.38)"
    textColor: "{colors.paper-edge}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 22px"
    height: "52px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 22px"
    height: "52px"
  text-link:
    textColor: "{colors.gold-ink}"
    typography: "{typography.label}"
    padding: "12px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
    height: "48px"
  chip-filter:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "44px"
  chip-filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  ticket-card:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px 24px"
  ticket-stamp:
    textColor: "{colors.brick}"
    rounded: "{rounded.stamp}"
    padding: "6px 8px"
  postcard:
    backgroundColor: "{colors.paper-edge}"
    textColor: "{colors.ink}"
    padding: "12px"
  number-plate:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.plate-numeral}"
    rounded: "{rounded.stamp}"
    size: "56px x 44px"
  route-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-edge}"
    rounded: "{rounded.card}"
    padding: "20px"
  booking-bar:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.paper-edge}"
    rounded: "{rounded.sheet}"
    height: "88px"
  search-pill:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "6px 6px 6px 20px"
    height: "52px"
  nav-bar:
    backgroundColor: "rgba(248, 244, 234, 0.82)"
    textColor: "{colors.ink}"
    height: "72px"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "64px 0 32px"
  table-header:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.muted-strong}"
    typography: "{typography.overline}"
    height: "40px"
  table-row:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.admin-body}"
    height: "44px"
  dialog:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "32px"
    width: "min(100% - 32px, 560px)"
  admin-sidebar:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    typography: "{typography.admin-body}"
    width: "248px"
  status-light:
    backgroundColor: "{colors.teal}"
    rounded: "{rounded.pill}"
    size: "8px"
---

# Design System: ABLux Travel

## Overview

**Creative North Star: "Putni dnevnik" (The Travel Journal)**

Every surface is a page from a well-kept travel journal: warm paper, ink-dark photographs, a gold word underlined by hand, and the small ephemera of a trip pressed between the pages: boarding-pass tickets, postcards with deckled edges, rubber stamps, brass number plates, and dashed routes pinned on an old map. The mood is calm, certain, and hospitable. It should look quietly lavish, never loud, and meticulous enough that an older pilgrim, a parent booking a summer holiday, and a parish organizer can all trust the page at a glance.

Density is comfortable on public pages: generous paper margins, one idea per section, a dense block always followed by a quiet one. Hierarchy comes from two things only: a large old-style serif against a clear humanist sans, and the inversion between paper grounds and ink panels (the hero, the vehicle panel, the footer). Ornament is real but restrained. Stamps, perforations, pins, and routes carry meaning (a route, a step, a status), and they never compete with the offer, the price, or the action.

The confirmed anti-reference is the old "SaaS glass" look still visible in `design/reference/old_admin_dashboard.png` and `design/reference/old_ponude_page.png`: navy panels (`#071226`, `#12233f`), neon blue and cyan gradients (`#155eef`, `#5ea4ff`, `#67e8f9`, `rgba(0,255,200,…)`), glassmorphism cards with glowing underlines, and Sora headings. It must disappear everywhere, including the footer, the nav, the focus ring, and the whole admin.

**Key Characteristics:**
- Paper ground (`paper`) with ink text (`ink`). Gold is for the primary action and one italic emphasis word per heading. Teal and brick are for meaning (route, status, step), not decoration.
- EB Garamond for display and headings on public pages. Manrope for everything else. The admin uses Manrope only.
- Signature objects: ticket card, postcard, stamp, brass number plate, dashed route with pins.
- Light theme "Papir" is the default. Dark theme "Tinta" is an ink desk where paper objects stay paper.
- Calm motion (GSAP, transform and opacity only). One signature scroll moment per page, and all of it can be switched off.

### Sources of truth

- Tokens: `docs/design/ablux-design-dna.json` (primary), implemented in `app/styles/tokens.css` (Papir/Tinta on `[data-theme]` + Tailwind `@theme`). The approved homepage styles live in `app/styles/home.css` (scoped to `.ablux-home`).
- Components: `components/ui/` (styles in `app/styles/components.css`, `ui-` prefix). Every component renders in both themes on `/dev/ui` (noindex, not linked). `app/globals.css` only imports `app/styles/` in order: tokens, base, components, chrome, legacy, home.
- Approved rendering: `app/page.tsx` (server data) and `components/home/` (`home-hero.tsx`, `home-sections.tsx`, `home-motion.tsx`, `scene-media.tsx`); rebuilt in step 11 on theme tokens (Papir and Tinta). Screenshots: `design/reference/home_desktop_slice00..04_light.png` and `home_mobile_full_light.png`.
- Fidelity targets (legacy GPT comps, higher fidelity than the current build): `design/comps/legacy/desktop-routes.png`, `desktop-proof-process.png`, `desktop-vehicles-cta.png`, and the `mobile-*` variants. Take the chamfered ticket corners, brass plates, stamps, pins, compass rose, and route lines from them. Do not take their vehicle photographs, which are illustrative. Real ABLux vehicle photos are used instead (see Imagery).

### Two modes: Brand and Operate

- **Brand (public site).** Everything in this document applies.
- **Operate (admin, `/admin/*`).** Same color tokens and the same Papir/Tinta switch, but Manrope only (serif appears only in the logo wordmark). A fixed rem type scale, dense and calm layouts, tables, status lights, and a command palette. No ornament, no textures, no entrance choreography. See Components → Admin (operate mode).

### Motion

GSAP only, through `useGSAP` from `@gsap/react` (see `components/home/home-motion.tsx` and `components/ui/motion.tsx`). Register plugins once and scope selectors to the section root.

- **Animate only `transform` and `opacity`.** (The old blur reveal was removed in step 11.)
- **Easing:** `power3.out` everywhere (CSS equivalent `cubic-bezier(0.22, 1, 0.36, 1)`). Scrubbed motion uses `ease: "none"`. No bounce or overshoot: the pin pop currently uses `back.out(2)` and should switch to `power3.out`.
- **Durations (from code):** micro 180–220 ms (button hover `0.22s`); state 420 ms (pin pop `0.42s`); reveal 720–950 ms (hero copy `0.78s`, tickets `0.72s`, section reveal `0.95s`); macro 1.15–1.8 s (hero background settle `1.8s`, watermark `1.15s`). Admin transitions are 150–250 ms.
- **Stagger:** 60–90 ms (`0.06`–`0.09`). Reveal offset: y 22–46 px (routes currently use 58 px; cap new work at 46 px).
- **Triggers:** `start: "top 82%"` by default, `"top 96%"` for content overlapping the hero. Play once (`toggleActions: "play none none none"`). Exit is fade only.
- **Parallax:** route-card images `yPercent: -5, scale: 1.06, scrub: 0.8`. Hover zoom is CSS: `scale(1.055)` over 0.7 s on route cards, `scale(1.04)` over 0.5 s on vehicle cards.
- **Signature moment (one per page):** on the homepage the hero scene shrinks into a postcard (deckled border plus stamp), tilts about 2°, and lands as the first route card, while the booking bar docks into the sticky "Kuda putujete?" pill. Route lines draw with `stroke-dashoffset` on scroll. Nothing else hijacks scroll.
- **Scroll-bound video:** map `video.currentTime` directly to a ScrollTrigger timeline (`scrub`). Never call `.play()` on a scrubbed video. Ambient Veo loops are a different thing: `<video muted playsinline loop preload="metadata" poster="…avif">`, paused when off-screen, never scrubbed. Budget: desktop 1920×1080 ≤ 3 MB, mobile 720×1280 ≤ 1.5 MB. On mobile only the default channel loads video; the others are stills with a slow zoom.
- **Reduced motion is absolute.** Wrap every timeline in `gsap.matchMedia()` with `"(prefers-reduced-motion: no-preference)"`. Under `reduce`, show final states (the current code calls `gsap.set(..., { clearProps: "all" })` and returns), show posters instead of video, show scrubbed video as its final keyframe still, and disable CSS transitions (`app/globals.css` line ~5600). Also respect `Save-Data`.
- **Trust before effect.** No animation may hide or delay the offer, the price, or the primary action beyond about 1 s after load. Content is never gated behind a scroll animation, and it must render fully with JavaScript off.

### Imagery

- **AI-generated imagery is for destinations only:** GPT Image 2 keyframes and Veo 3.1 loops (static camera, natural motion). Approved assets: `public/generated/ablux-hero-reference-*`, `ablux-hero-ostrog-*`, `route-*.png`, and the texture `ablux-paper-route-texture.png`. Grade: golden hour with warm highlights and the left third falling into ink shadow for copy.
- **Real photos are never altered by AI.** This covers vehicles (Setra coach, Mercedes Sprinter), interiors, the team, real trips (`public/home-swiper/*`), and the monastery photo `IMG-20240104-WA0011.avif`. Motion on them is code only: slow zoom (1.0 → 1.04 over 8–12 s), light parallax, and a warm grade done as an overlay (`linear-gradient(180deg, rgba(185,145,70,0.08), rgba(6,21,26,0.35))`), not a pixel edit. A Veo test on a real photo is rejected if the vehicle changes in any way.
- **Off-brand stock is not used in new work:** `pocetna*.avif`, `kontakt-hero.avif`, `plane.avif`, `background*.avif`.
- **Partner images:** plain `<img loading="lazy" decoding="async">` or `next/image` with `unoptimized`. Always set `width`/`height` or `aspect-ratio` to prevent layout shift. Images served over plain `http://` are not shown; fall back to the postcard placeholder (paper-2 ground, an engraved line glyph in `teal-deep`, and the destination name in EB Garamond).
- **No invented proof.** No testimonials, traveler counts, ratings, awards, or "X people are viewing". Stamps may carry route codes and durations that are true for the offer.
- Illustration is fine engraved line work (1.5 px stroke; the hero ticket glyphs use a 3.6 stroke on a 64 viewBox), in `teal`, `brick`, or `teal-deep`. Religious ornaments (cross, dome) are used only on religious-tourism content.

### Voice in UI

Calm, warm, precise. Use the formal address, capitalized in direct address ("Vi", "Vas", "Vaš"): "Javićemo Vam se u toku radnog dana." Button labels keep the short command form already approved on the homepage ("Pogledaj ponude", "Pošalji upit", "Rezerviši mesto", "Pronađi"), but sentences never mix in the informal "ti". No hype ("neverovatno", "najbolje cene", "ekskluzivno"), no invented urgency, no exclamation marks in UI copy, no emojis. Empty states offer alternatives instead of "nema rezultata": "Za jun trenutno nema polazaka. Pogledajte jul ili nam pošaljite upit." Errors state what happened and what to do next. Dates use Serbian format ("12. 6. 2026."), times use 24 h ("06:00"), and thousands use a dot ("1.290 €").

### Accessibility floor (WCAG 2.1 AA)

- Body text is at least 16px (`1rem`) on mobile. Readable text is never smaller than 12px (`0.75rem`); decorative stamp text below that must be `aria-hidden` and duplicated in accessible text.
- Text contrast is at least 4.5:1 (at least 3:1 for text ≥ 24px, or ≥ 18.66px bold). Non-text UI (field borders, focus rings, status dots paired with text) is at least 3:1. Verified pairs are listed in Colors.
- Touch targets are at least 44×44px. Primary buttons are 52px tall (as built: `min-height: 3.2rem`).
- Focus is always visible: a 2px gold ring with 2px offset (`gold-ink` on paper, `gold-2` on ink). Never use `outline: none` without a replacement.
- Color is never the only signal: selected chips get a check icon, status lights get a text label, errors get an icon and a message.
- `prefers-reduced-motion` turns off all motion (see Motion). Localize the skip link ("Preskoči na sadržaj"). Keep `lang="sr-Latn"`, and mark English partner notes with `lang`.

## Colors

Warm paper neutrals and one deep green-black ink, with split accents: gold for action, teal for route and success, brick for pins, steps, and errors.

### Primary
- **Mastilo / Ink** (`ink`): primary text on paper, the hero ground, ink feature panels (vehicle panel, footer), and the Tinta page ground. It is a green-black, not navy; never substitute a blue-black.
- **Dukat / Gold** (`gold-2`, with the deeper `gold` as the gradient end): the primary action fill (`linear-gradient(135deg, gold-2, gold)`) with ink text, the italic emphasis word in the hero (`gold-2` on ink), the kicker on ink, and active nav on ink.
- **Gold ink** (`gold-ink`, derived): the only gold allowed for small text on paper (text links, active nav on paper, price basis accents) and the focus ring on paper. `gold` itself is 2.65:1 on paper and must not be used for text there.

### Secondary
- **Tirkiz / Teal** (`teal`): overlines on paper, route icons, process icons, the success state, and the "Mediteran" route tone. It passes on `paper` (4.57:1) but not on `paper-2` (4.11:1). Use `teal-ink` (derived) for small text on `paper-2` and wherever it sits close to the limit.
- **Duboki tirkiz** (`teal-deep`): the info state, engraved glyphs, and the "Evropski gradovi" ticket tone. It replaces the off-palette `#245F7C` used by `.ablux-route-ticket--blue`.

### Tertiary
- **Cigla / Brick** (`brick`): map pins, dashed route lines (at 32–46% alpha), process step numerals, the ticket index, the "Hodočašća" tone, stamps, and the error state (6.29:1 on paper).
- **Oker / Ochre** (`ochre`): the warning state, only as a chip or dot fill with ink text (6.16:1). Never as text on paper (2.74:1).
- **Srebro / Silver** (`silver`): accent ring on route card 04 and the base of Tinta hairlines (`rgba(215,226,223,α)`).

### Neutral
- **Papir** (`paper`): page ground in Papir, with `ablux-paper-route-texture.png` at full width on top.
- **Light paper** (`paper-light`): cards, fields, dialogs, and table rows.
- **Paper 2** (`paper-2`): bands, table headers, the admin sidebar, hover fills, and the inner paper objects in Tinta.
- **Paper 3** (`paper-3`): disabled fills and pressed chips.
- **Paper edge** (`paper-edge`): text on ink (hero h1, route cards), the postcard border, and the "paper" color of objects on ink.
- **Muted** (`muted`): secondary text on `paper` (4.66:1) and `paper-light` (4.91:1) only.
- **Muted strong** (`muted-strong`, derived): secondary text on `paper-2` (5.02:1) and table header text.
- **Stone** (`stone`): the "off" status dot and decorative rules only. Never text (2.78:1).
- **Lines:** `line-soft` for card borders, `line` for dividers, `line-strong` for dashed perforations, and `line-field` for input and chip borders (3.28:1 on paper, passes 1.4.11).

### Themes: Papir (default) and Tinta

The theme is set on `<html data-theme="light|dark">` by the blocking script in `app/layout.tsx` and by `components/site-preferences-provider.tsx` (`localStorage` key `ablux_theme`). **Papir is the default:** when nothing is stored, the script sets `light` and does not follow `prefers-color-scheme` (fixed in step 01; the provider persists the theme only when the user changes it). **Done in step 04:** the tokens below live in `app/styles/tokens.css` on `:root`/`[data-theme]` (any element can force a theme for its subtree; `.ui-paper` keeps Papir tokens inside paper objects), the legacy `--bg/--text/--muted/--surface/--line/--primary/--accent` are aliases of them, and the `--hero-*`, `--alien-*`, `--signal-*` families are gone. The homepage (`.ablux-home`) still uses its own light-only copies until step 11 adds Tinta there.

```css
html[data-theme="light"] {           /* Papir — values from .ablux-home + DNA */
  --ablux-bg: #F8F4EA;               /* paper */
  --ablux-surface: #FDFAF3;          /* paper-light: cards, fields, dialogs */
  --ablux-surface-2: #EFE8DA;        /* paper-2: bands, table head, sidebar */
  --ablux-surface-3: #E2D9C6;        /* paper-3: disabled, pressed */
  --ablux-inverse: #06151A;          /* ink panels (hero, vehicle, footer) */
  --ablux-text: #06151A;             /* 16.92:1 on bg */
  --ablux-text-muted: #5C6662;       /* 5.41:1 on bg, 4.88:1 on surface-2 (step 14) */
  --ablux-text-muted-strong: #4F5956;/* 5.9:1 on surface-2 (step 14) */
  --ablux-accent: #D5A54F;           /* gold-2 fill */
  --ablux-accent-deep: #B99146;      /* gold gradient end */
  --ablux-accent-text: #7D5E27;      /* gold-ink, 5.46:1, 4.92:1 on surface-2 (step 14) */
  --ablux-teal: #0E7C7B;  --ablux-teal-text: #0B6968;
  --ablux-brick: #9B3A2E; --ablux-ochre: #C28A2C; --ablux-info: #296266;
  --ablux-line-soft: rgba(6,21,26,.12); --ablux-line: rgba(6,21,26,.16);
  --ablux-line-strong: rgba(6,21,26,.34); --ablux-line-field: #828887;
  --ablux-focus: #7D5E27;            /* on ink sections: #D5A54F */
  --ablux-overlay: rgba(6,21,26,.6);
}
html[data-theme="dark"] {            /* Tinta (implemented in step 04) */
  --ablux-bg: #06151A;               /* ink */
  --ablux-surface: #0A2428;          /* ink-2: cards */
  --ablux-surface-2: #10302F;        /* ink-3: elevated, bands, table head */
  --ablux-surface-3: #173A38;        /* pressed/disabled (derived) */
  --ablux-inverse: #0A2428;          /* footer/feature panels sit one step up */
  --ablux-paper-object: #EFE8DA;     /* tickets, postcards, stamps stay paper */
  --ablux-text: #F8F4EA;             /* 16.92:1 on bg, 14.75:1 on surface */
  --ablux-text-muted: #B9BAB4;       /* = paper 72% on ink (as in .ablux-vehicle__copy); 9.51:1 */
  --ablux-accent: #D5A54F;           /* fill with ink text (8.25:1); also text on ink */
  --ablux-accent-deep: #B99146;
  --ablux-accent-text: #D5A54F;      /* 8.25:1 on bg, 6.28:1 on ink-3 */
  --ablux-teal: #5FB8B4;  --ablux-teal-text: #5FB8B4;   /* 7.97:1 */
  --ablux-brick: #E08B7E;            /* 7.23:1 */
  --ablux-ochre: #C28A2C;            /* fill only, ink text */
  --ablux-info: #9CCFD0;             /* 10.84:1 */
  --ablux-line-soft: rgba(215,226,223,.14); --ablux-line: rgba(215,226,223,.18);
  --ablux-line-strong: rgba(215,226,223,.28); --ablux-line-field: rgba(215,226,223,.4); /* 3.17:1 */
  --ablux-focus: #D5A54F;
  --ablux-overlay: rgba(2,10,12,.72);
}
```

In Tinta, the page becomes an ink desk, but **paper objects stay paper**. Tickets, postcards, stamps, and the proof "document" keep `paper-2` or `paper-light` with ink text, exactly as the vehicle cards already sit on the ink panel today. Sections, cards, fields, tables, and the nav switch to ink surfaces. The hero is ink in both themes.

### Verified contrast pairs

| Text / element | Background | Ratio | Use |
|---|---|---|---|
| ink `#06151A` | paper / paper-light / paper-2 | 16.92 / 17.83 / 15.24 | all body and heading text |
| muted `#5C6662` | paper / paper-light / paper-2 | 5.41 / 5.70 / 4.88 | secondary text (darkened in step 14: the old #66706C failed on paper-2) |
| muted-strong `#4F5956` | paper-2 / paper-light | 5.9 / 6.9 | secondary text on bands |
| teal `#0E7C7B` | paper / paper-2 | 4.57 / **4.11 fail** | overlines on paper only |
| teal-ink `#0B6968` | paper / paper-light | 5.91 / 6.23 | small teal text anywhere on paper |
| brick `#9B3A2E` | paper / paper-2 | 6.29 / 5.67 | errors, step numerals |
| gold `#B99146` | paper | **2.65 fail** | never text on paper |
| gold-ink `#7D5E27` | paper / paper-2 | 5.46 / 4.92 | links, focus ring on paper |
| ink | gold-2 / gold | 8.25 / 6.37 | primary button text |
| `#FFF9EC` (current button text) | gold-2 / gold | **2.15 / 2.78 fail** | replace with ink |
| paper-edge `#FFFAF0` | ink | 17.86 | text on ink panels |
| gold-2 `#D5A54F` | ink / ink-2 / ink-3 | 8.25 / 7.20 / 6.28 | gold text on ink |
| tinta-muted `#B9BAB4` | ink / ink-2 / ink-3 | 9.51 / 8.29 / 7.23 | secondary text on ink |
| tinta-teal / tinta-brick | ink | 7.97 / 7.23 | status text in Tinta |
| line-field `#828887` | paper-light / paper | 3.46 / 3.28 | input and chip borders |
| paper-edge | hero shade (≈ `#031013`) | 18.56 | hero copy on photo |

### Named Rules

**The Gold Is Earned Rule.** Gold fills belong to the single primary action in view, and gold text belongs to one italic emphasis word per heading. `gold` and `gold-2` are never used as small text on paper. Use `gold-ink`.

**The No Navy Rule.** No blue-black grounds, no blue or cyan accents, no neon gradients, no glowing underlines. Ink (`#06151A`) is the only dark, and it is green-black. This applies to the footer, the nav, focus rings, admin, and emails alike.

**The Paper Objects Rule.** Tickets, postcards, stamps, and documents are paper in both themes. Only the desk they lie on changes color.

## Typography

**Display font:** EB Garamond (`--font-editorial`, loaded in `app/layout.tsx` with `subsets: ["latin", "latin-ext"]`, variable 400–800, normal and italic), falling back to Georgia and Times New Roman. Code reference: `--ablux-editorial`. It replaced Cormorant Garamond in step 04 (see Serbian diacritics).
**Body/UI font:** Manrope (`--font-manrope`, weights 400–800, `latin` + `latin-ext` so č ć ž š đ are preloaded rather than swapped in late). Both font variables sit on `<html>` so the tokens can resolve them at `:root`.
**Removed (step 04):** Sora (`--font-sora`) and Georgia as a primary face. Everything that used them now uses Manrope or `var(--ablux-editorial)`.

**Character:** a high-contrast old-style serif, calm and slightly literary, set against a clear humanist-geometric sans that carries every label, number, and paragraph without fuss. The serif speaks and the sans informs.

### Hierarchy
- **Display** (EB Garamond 400, `clamp(3.45rem, 5.55vw, 6rem)`; mobile `clamp(3.05rem, 13.6vw, 4.65rem)`; line-height 1.1): the hero h1 only, `text-wrap: balance`, color `paper-edge` on ink. The emphasis word is italic 500 in `gold-2` ("Putovanja sa potpisom *sigurnosti*"). As built, the line-height is 0.88 and must be raised (see the diacritics rule).
- **Headline** (EB Garamond 400, `clamp(2.45rem, 4.25vw, 4.25rem)`, 1.1): section h2 (`.ablux-section-heading h2` and siblings). As built it is 0.95.
- **Headline small** (EB Garamond 400, `clamp(2rem, 4vw, 3.8rem)`, 1.1): closing CTA, partners heading, and detail-page h1 under a photo header.
- **Title serif** (EB Garamond 500, `clamp(1.55rem, 2.6vw, 3rem)`, 1.12): route-card titles, ticket titles (ticket strip `clamp(1.55rem, 2.25vw, 2.22rem)`, as built 0.9), offer titles, and dialog titles on public pages.
- **Title** (Manrope 800, 1.125rem, 1.3): proof and process card h3, vehicle card h3, table-group titles. Code uses 900, but Manrope is only loaded to 800, so the browser synthesizes it. Use 800.
- **Body lead** (Manrope 400, `clamp(1.0625rem, 1.7vw, 1.45rem)`, 1.55): hero subline and section intros. Maximum 37rem.
- **Body** (Manrope 400, 1rem, 1.65): paragraphs, card copy, and program text. Maximum 65–72ch. Card copy is currently 0.88–0.92rem and must be 1rem on mobile.
- **Body small** (Manrope 500, 0.875rem, 1.55): metadata rows (dates, departure city, organizer). Never used for paragraphs on mobile.
- **Label** (Manrope 800, 0.9rem, line-height 1): buttons and text links. Not below 0.875rem on mobile (the mobile hero buttons are currently 0.82rem).
- **Overline** (Manrope 800, 0.75rem, tracking 0.16em, uppercase): section kickers ("ZAŠTO PUTNICI BIRAJU ABLUX") in `teal-ink` on paper and `gold-2` on ink, and card meta ("VERA · MIR · ORGANIZACIJA"). As built it is 0.68–0.72rem at weight 900; the floor is 0.75rem at 800. Use a middle dot "·" as the separator, not " - ".
- **Plate numeral** (EB Garamond 600, 1.5rem, `font-variant-numeric: lining-nums tabular-nums`): brass number plates and step numbers ("01", "02"). EB Garamond defaults to old-style figures, so lining figures are required.
- **Price** (Manrope 800, 1.5rem, tabular-nums): see Price display. Every number in UI (prices, dates, counts, times) uses `tabular-nums`.
- **Ticket code** (Manrope 800, 0.75rem, tracking 0.12em, uppercase): stamp codes ("BEG → JER"). This replaces the Sora 0.48rem stamp text; use a real arrow "→", not "->".
- **Wordmark:** "ABlux" in EB Garamond 600, 1.95rem, over "TRAVEL" in Manrope 700, 0.72rem, tracking 0.38em, in `gold-ink` on paper or `gold-2` on ink.

### Serbian diacritics
All copy is Serbian Latin with correct č ć ž š đ (and Č Ć Ž Š Đ). Never use "c/s/z/dj" substitutes in UI copy (slugs are the only exception, via `lib/country-route.ts`). Store text in NFC; the current source is NFC. **Step 04 finding:** Cormorant Garamond draws the lowercase carons (č ž š) as a detached "v" floating at ascender height in weights 400–600, in every Cormorant family (Garamond, plain, Infant), with any `lang` and every stylistic set; only 700 was acceptable. Line-height and padding fix the clipping but not the floating, so the display face was switched to EB Garamond (same Garamond lineage, true italics, correct Latin Extended). Evidence: `night-run/qa/04/glyph-compare-zoom.png` and `glyph-candidates.png`. The tight homepage line-heights (0.88–1.0) were raised to 1.1 with caron padding.

**Test strings** (render each in every display weight used, in roman and italic, at display, headline, and title sizes, in both themes):
`Najtraženije rute` · `Iznajmljivanje vozila sa vozačem` · `Planiranje bez slučajnosti` · `Hodočašća` · `Đurđevdan u Ćupriji` · `Čačak, Užice, Žabljak` · `ŽIČA · ĐERDAP · ŠARGAN` · `Šta je uključeno` · `Neka sledeći polazak bude mirno planiran.` · italic `sigurnosti` · `Pošalji upit`

### Named Rules

**The Caron Clearance Rule.** Serif headings use a line-height of at least 1.1 and `padding-block: 0.08em` (0.12em for display). No `overflow: hidden` or `clip` sits tightly around display text; if a parent must clip (image cards, tickets), the text box keeps at least 0.15em of top padding inside it. Never use `background-clip: text` or tight `line-clamp` on serif headings. If a test string still clips or collides at 1.1, fix the metrics (`text-box`, padding), not the copy. Replace the display face only if the glyph test fails in every weight.

**The One Serif Voice Rule.** Serif is for things you read as a headline: display, headlines, route and offer titles, plate numerals. Labels, buttons, prices, data, forms, and anything in the admin are Manrope.

**The 16px Floor Rule.** Running text is 1rem or larger at every breakpoint. Nothing readable is smaller than 0.75rem.

## Layout

- **Container:** `width: min(100% - 2rem, 90rem)` centered (as built for `.ablux-routes`, `.ablux-proof`, `.ablux-process`, `.ablux-vehicle`, `.ablux-closing`). The hero inner is `min(100%, 96rem)` with `padding-inline: clamp(1.25rem, 5vw, 5.4rem)`, and the nav inner is `max-width: 94rem`. Target: `--ablux-container: 90rem; --ablux-gutter: clamp(1rem, 3vw, 2rem)`, giving 16px gutters on mobile and 32px on desktop.
- **Grid:** 12 columns on desktop, 6 on tablet, 1 on mobile. Gaps are 24px on desktop and 16px on mobile (route mosaic as built: `1.3rem`; boards: `1rem`). Compositions are asymmetric and editorial:
  - Route mosaic: `minmax(0,1.25fr) repeat(2, minmax(0,.85fr))`, with the feature card spanning two rows and `grid-auto-rows: minmax(15rem, 20vw)`.
  - Proof: copy `0.9fr` / board `1.4fr`, with the board as a 2×2 grid.
  - Vehicle panel: copy `0.72fr` / cards `1.28fr`, with the second card offset down by `clamp(1.5rem, 4vw, 4rem)`.
  - Process: a 3-column rail with dashed dividers, which becomes a vertical rail on mobile.
  - Offer catalog (target): a filter column of 18rem plus a results grid `repeat(auto-fill, minmax(20rem, 1fr))`. On mobile, filters live in a bottom sheet.
- **Alignment:** section heads and cards are left-aligned. Process and closing intros may be centered. Body text is never justified.
- **Section rhythm:** `--ablux-section-y: clamp(4rem, 8vw, 7rem)` (64–112px), matching the as-built `margin-top: clamp(4rem, 8vw, 7rem)` and `padding: clamp(3rem, 7vw, 6rem) 0`. Mobile is at least 48px. Heading to content: 32px (`margin-bottom: 2rem`). Leave more space above a heading than below it. A dense section (mosaic, catalog) is followed by a quiet one (process, closing).
- **Breakpoints:** new work uses the Tailwind v4 defaults `md 768px`, `lg 1024px` (the nav switches to desktop here, as built), and `xl 1280px`, and is designed and verified at 390px and 1440px. The as-built `.ablux-*` queries use `max-width: 1120px` (booking bar to 2 columns, mosaic to 2 columns, proof and vehicle to 1 column) and `max-width: 768px`; migrate `1120` to `lg` or `xl` when those blocks are touched.
- **Hero:** `min-height: clamp(690px, 84svh, 805px)` on desktop and `96svh` on mobile. The copy is top-left, with the ticket ribbon (max 86rem) and the booking bar (max 80rem) docked at the bottom over a paper band `clamp(15.25rem, 27vh, 17.5rem)` high. On mobile the ribbon becomes a horizontal scroll-snap strip (`flex: 0 0 86%`), and the booking bar becomes 2×2 plus a full-width submit. **Mobile fixes (target):** keep the dome and subject clear of the buttons, show at least one whole ticket plus a visible peek, and keep the chat FAB clear of the booking bar (offset it above the bar, or hide it while the bar is in view).
- **Mobile chrome:** the nav bar is fixed at the top with logo, cart, theme, language, and menu inline. On a detail page the primary action lives in a bottom bar (`padding-bottom: env(safe-area-inset-bottom)`), and the chat FAB moves above it.

## Elevation & Depth

Depth is a hybrid: overlapping paper layers, ink/paper inversion, and soft warm-tinted shadows made of ink at low alpha. Shadows are never colored glows, except the gold button's own warm drop. Surfaces are flat at rest. Lift appears on hover (translateY −2px plus a deeper shadow) and for floating layers (booking bar, sticky pill, dialogs, menus). In Tinta, shadows barely read, so depth comes from stepping surfaces (`ink` → `ink-2` → `ink-3`) and hairlines.

### Shadow Vocabulary
- **Low** (`box-shadow: 0 1px 2px rgba(6,21,26,.06)`): fields, chips, table toolbars.
- **Medium** (`box-shadow: 0 12px 32px -12px rgba(6,21,26,.18)`): sticky search pill, dropdowns, mega menu, hover on paper cards.
- **High** (`box-shadow: 0 28px 60px -20px rgba(6,21,26,.35)`): dialogs, bottom sheets, command palette.
- **Card rest (as built)** (`box-shadow: 0 28px 54px -44px rgba(6,21,26,.72)`): route cards and ticket cards. The proof board variant is `0 26px 64px -52px rgba(6,21,26,.76)`.
- **Ink panel (as built)** (`box-shadow: 0 34px 80px -56px #020a0c`): the vehicle panel and any ink feature panel on paper.
- **Paper band (as built)** (`box-shadow: 0 -18px 42px rgba(2,10,12,.28)`): the paper strip rising over the hero photo.
- **Gold action (as built)** (`box-shadow: 0 18px 34px -22px rgba(185,145,70,.72)`): the primary gold button only.

### Named Rules

**The Paper Stack Rule.** Depth means paper lying on paper, or paper on an ink desk. No glass panels, no `backdrop-filter` on cards or sections. Backdrop blur is allowed only on the scrolled nav (12px at 82% opacity) and on the ghost button over hero imagery (`blur(10px)`, as built).

**The Flat At Rest Rule.** Shadows at rest are the as-built soft drops above. Stronger elevation is earned by state (hover, open, modal), never by decoration.

## Shapes

- **Radii:** stamps and small tags `6px` (stamp as built `0.35rem`); cards, buttons, text links, and panels `8px` (as built `0.48–0.5rem`); fields and the booking submit `10px` (as built `0.58rem`); dialogs, sheets, and the booking bar `16px` (as built `0.95rem`); chips, the search pill, status dots, and icon rings `999px`. The DNA proposed 10px buttons; the approved build uses 8px, and 8px is canonical.
- **Ticket silhouette:** concave half-circle notches (radius 10px) at both ends of the perforation line, made with a CSS `mask` of radial gradients, plus a dashed perforation (`1px dashed line-strong`). In the ribbon, adjacent tickets are split by `1px dashed rgba(6,21,26,.34)` and a 0.7rem ink punch hole (as built `::after`).
- **Chamfered corners** (from `design/comps/legacy/desktop-routes.png`): route cards and brass plates may cut their corners at 12px (cards) or 6px (plates) with `clip-path: polygon(...)`. Because clip-path cuts off outlines, the focus ring on a clipped card is drawn inside (`outline-offset: -4px`) or on an unclipped wrapper.
- **Deckled edge:** postcards have a 12px `paper-edge` border whose outer edge is irregular, done with an SVG mask (a small jagged path, repeated). It is never a CSS `border-style`.
- **Circles:** icon rings (2px `currentColor` plus an inner 1px ring at 28% opacity, as in `.ablux-route-ticket__icon`), postmarks (2px teal at 44%, inner paper ring), and pins (0.88rem brick with a 0.25rem halo at 14%).
- **Lines:** hairlines 1px in `line`/`line-soft`. Route lines are dashed at 1–2px in brick (32–46% alpha) or teal (25%). Gold accent rules are 1px `rgba(213,165,79,.52)` (the hero kicker line). Proof cards use a 4px solid `gold` left rule.
- **Rotation:** paper objects may sit at −3° to +2° (stamp −3°, proof document −2°, postcard ±2°). Text containers and controls are never rotated.

## Components

### Buttons
Tactile and confident: a pressed brass token on paper.
- **Shape:** gently rounded (8px), `min-height: 3.2rem` (52px), `padding: 0.9rem 1.35rem`, gap 0.75rem, icon 0.9rem trailing (arrow → for navigation, paper plane for send). Label style: Manrope 800, 0.9rem. On mobile, hero buttons share the row (`flex: 1 1 0`); elsewhere they are full width. Class: `.ablux-btn`.
- **Primary (`.ablux-btn--gold`):** `linear-gradient(135deg, #D5A54F, #B99146)`, a 1px border of `color-mix(in srgb, #B99146 72%, #fff 28%)`, and the gold action shadow. **Text is `ink`**; the current `#fff9ec` fails at 2.15:1 and must be changed. Use one per view: the action that moves the visitor toward an inquiry or booking ("Pošalji upit", "Rezerviši mesto", "Pronađi").
- **Secondary on paper (`.ablux-btn--ghost-dark`):** `rgba(255,250,240,.62)` fill, 1px `rgba(6,21,26,.18)` border, ink text. Hover: `paper-light` fill with a `line-strong` border.
- **Ghost on ink (`.ablux-btn--ghost`):** `rgba(5,18,22,.38)` fill, 1px `rgba(255,250,240,.34)` border, `paper-edge` text, `backdrop-filter: blur(10px)` (hero only).
- **Ink (target, from the comps):** solid `ink` with `paper` text, used on paper when gold is already used in the same view. In Tinta it becomes `paper-2` with ink text.
- **Text link (`.ablux-text-link`):** 44px-tall bordered link ("Sve ponude →"), text in `gold-ink` (currently `gold`, 2.65:1, which fails), 1px `rgba(6,21,26,.18)` border. Hover: a 1px underline sweeps in from the left (transform `scaleX`).
- **States:** hover `translateY(-2px)` over 0.22 s; active `translateY(1px)`; focus-visible 2px ring in `--ablux-focus`, offset 2px; disabled `paper-3` fill, `muted` text, no shadow, `cursor: not-allowed`, and still a reason nearby ("Popunite datum polaska"); loading keeps the width, swaps the icon for a 16px ring spinner, sets `aria-busy="true"`, and changes the label to "Šaljemo…". Reduced motion removes the transforms.

### Inputs / Fields
- **Style:** the label sits above the field (Manrope 700, 0.875rem, ink, sentence case; required fields are marked with "obavezno", not only "*"). The field is `paper-light`, with a 1px `line-field` (#828887) border, 10px radius, `min-height: 48px`, padding 12px 14px, and 1rem text (which also prevents iOS zoom). Placeholder text is `muted` and never replaces the label. Help text is 0.875rem `muted` below the field.
- **Focus:** the border becomes `ink` and gets a 2px `--ablux-focus` ring with 2px offset. No glow.
- **Error:** a 1px `brick` border, a brick icon, and a message below ("Unesite ispravan broj telefona, npr. 064 123 4567"), tied with `aria-describedby`. **Disabled:** `paper-2` fill, `muted-strong` text, dashed border.
- **On ink (booking bar):** fields are transparent on `ink-2` (as built `rgba(3,18,21,.97)`), with `paper-edge` text, labels at `rgba(255,250,240,.74)`, gold icons, and 1px `rgba(215,226,223,.18)` dividers. Fields are ≥ 88px tall on desktop (as built 5.55rem) and ≥ 64px on mobile. Booking field labels must go from 0.68rem to 0.75rem. The fields must be real controls (select, date, stepper) that write URL params to `/ponude`; the hero search is currently decorative.

### Chips / Filter chips
- **Style:** pill (999px), 36px visual height inside a 44px hit area, `paper-light` fill, 1px `line-field` border, ink text in Manrope 700 at 0.875rem, and an optional count in `muted`, tabular ("Letovanja 128").
- **States:** hover `paper-2`; selected `ink` fill with `paper` text and a leading check icon (Tinta: `gold-2` fill with ink text); focus ring as for buttons; disabled (zero results) dashed border with `muted` text, still announced. Active filters sit in a removable row above the results ("Jul ×", "Iz Beograda ×") plus "Poništi sve".
- **Status chips (admin):** 24px tall, 6px radius, with a status dot and a text label (see Admin).

### Ticket card (offer card, boarding pass)
Signature component for every offer in `/ponude`, on the homepage, and in the related-offers rails. Current reference: `.ablux-route-ticket` (the hero ribbon version); fidelity target: `design/comps/legacy/desktop-routes.png`.
- **Anatomy, left to right on desktop and top to bottom on mobile:** (1) the stub, a photo (4:3) or engraved glyph in an icon ring; (2) the perforation, a dashed `line-strong` line with 10px concave notches top and bottom; (3) the body: an overline for category and destination (`teal-ink`, e.g. "VERSKI TURIZAM · GRČKA"), a serif title ("Sveta Gora i Meteori"), and a meta row in body-small with icons ("12. 6.–18. 6. 2026. · 7 dana · autobus · polazak Beograd"); (4) the price block (see Price display); (5) the stamp; (6) actions: "Detalji" (text link) and "Pošalji upit" or "Rezerviši mesto" (primary). The whole card is one link; the secondary action is a separate focusable button, and nested interactive elements are not allowed.
- **Stamp:** a rotated (−3°) bordered box with a 6px radius and a 1px border at `rgba(6,21,26,.26)`, or brick at 60% for religious routes. Lines: eyebrow ("RUTA"), code ("BEG → JER", ticket-code style), detail ("12–24 dana"). Text must reach at least 0.75rem, or the stamp is `aria-hidden` with the same facts in the meta row. On hover the stamp rotates +2° (transform only).
- **Tokens:** `paper-light` ground (the paper object in Tinta), ink text, 8px outer radius or 12px chamfer, card-rest shadow, padding 20px 24px.
- **States:** hover lifts the card −2px with the medium shadow and zooms the image to 1.04; focus draws a ring around the whole card; sold out shows a stamp "RASPRODATO" in brick, removes the CTA, and keeps "Detalji"; expired offers are not rendered.
- **Tones:** `--ticket-tone` is `brick` (pilgrimage), `teal` (sea), or `teal-deep` (cities). The tone colors the icon ring, index, and overline only.
- **Partner offers** always show "Organizator: {naziv agencije}" and "Licenca: {broj}" when known (read from data, never invented), plus "Ažurirano {datum}". On the English site, a note reads "Program is in Serbian." with `lang="en"`.

### Price display
- **Format:** "od 590 €" (a non-breaking space between the number and €, dot thousands, as in "od 1.290 €"). "od" is body-small `muted`; the amount uses the price token (Manrope 800, 1.5rem, tabular) in ink. Never render a price in gold.
- **Basis is mandatory:** directly under the amount, body-small `muted`: "po osobi", "po apartmanu", or "ukupno za 2 osobe". A price without a basis is not shown.
- **NBS note:** on detail pages and in the booking summary: "Cene su u evrima; plaćanje u dinarima po srednjem kursu NBS na dan uplate." On cards it is a footnote-style line or an info tooltip next to the basis.
- **Partner offers** without a reliable price show "Cena na upit" (Manrope 700, ink) instead of a number, together with the "Pošalji upit" action.
- **ABLux programs** with a deposit show "Akontacija od 150 € (IPS QR)" as a second line, in body-small.

### Postcard
For destinations, the homepage signature morph, gallery highlights, and partner-image fallbacks.
- **Anatomy:** a photo (3:2 or 4:5) inside a 12px `paper-edge` deckled border; a stamp in the top-right corner (a perforated-edge square via a radial-gradient mask, with a small engraved glyph); a postmark of two concentric circles in teal or brick at 40–46% overlapping the stamp; three wavy cancel lines in brick at 40% (from the comps); optional caption below in EB Garamond italic ("Ostrog, Crna Gora").
- **Tokens:** `paper-edge` border, the medium shadow, rotation ±2°. When it is a link, the hover straightens the rotation to 0° and lifts it.
- **Don't:** place running text on the photo inside a postcard. The postcard is an image object; its copy sits outside it.

### Brass number plate
Numbers routes, steps, and vehicles. Reference: the comps (`desktop-routes.png`, `desktop-vehicles-cta.png`). Currently built as circles (`.ablux-route-card__number`, `.ablux-process-step__index`, `.ablux-vehicle-card__index`, all Georgia); upgrade them to plates.
- **Anatomy:** a 56×44px plate (48×40 on mobile) with 6px chamfered corners, `background: linear-gradient(160deg, #E6C781 0%, #C9A157 55%, #A57E3A 100%)`, a 1px `#6E5222` border, `box-shadow: inset 0 1px 0 rgba(255,250,240,.55), inset 0 -1px 0 rgba(6,21,26,.35), 0 6px 14px -8px rgba(6,21,26,.5)`, and an ink plate numeral ("01") with `text-shadow: 0 1px 0 rgba(255,250,240,.4)` for an engraved look. Ink on the plate is 5.0–11.4:1.
- **Placement:** top-left of route cards (inset 16px) and top-right of vehicle cards; above each process step, sitting on the dashed route line with a brick pin below.
- **Accessibility:** a plate duplicating visible order is `aria-hidden`. When the number carries meaning ("Korak 2 od 3"), provide it as text.

### Dashed route line with pins
Connects related things (process steps, itinerary days, sections of the homepage) like a route on a map.
- **Anatomy:** an SVG path, `stroke: brick` at 46% (as built `rgba(155,58,46,.46)`), `stroke-width: 2`, `stroke-dasharray: 6 6`, round caps. Pins are 14px brick dots with a 4px halo at 14% (`.ablux-proof__pin`), or map-pin shapes (as in the comps) at important stops. It may start at a compass rose (engraved, `gold` at 60%) and end at a small brick flag. A secondary route runs teal at 25%.
- **Motion:** draw with `stroke-dashoffset` scrubbed to scroll (animate a mask path over the dashed path so the dash pattern stays stable). Pins fade and scale in after the line reaches them (`power3.out`, 0.42 s, 80 ms stagger). Under reduced motion, show it drawn.
- **Mobile:** horizontal routes become vertical (as `.ablux-process__rail::before` does at 768px).
- **Itinerary use:** in the program on detail pages, each day is a pin ("1. dan · Beograd – Solun"), the line connects the days, and the text sits beside the line, never on it.

### Section heading with overline
- **Anatomy:** an overline (teal-ink, or `gold-2` on ink), then an h2 at headline size, then optional body-lead intro (max 37rem), then an optional right-aligned text link ("Sve ponude →") aligned to the heading baseline (`.ablux-section-heading > div`: flex, `align-items: end`, gap 1.5rem). An optional ornament (from the comps) is a 1px gold rule with a small compass star or, on religious sections only, a cross, placed between the overline and the h2.
- **Spacing:** overline to h2 1rem, h2 to intro 1.1rem, heading to content 2rem. The h2 follows the Caron Clearance Rule.
- **Mobile:** stacks, and the link becomes full width.

### Cards / Containers
- **Route card (`.ablux-route-card`):** a full-bleed image on `ink`, an overlay of `linear-gradient(180deg, rgba(6,21,26,.05), rgba(6,21,26,.84))` plus `linear-gradient(90deg, rgba(6,21,26,.52), rgba(6,21,26,.04))`, and content at the bottom-left: an overline in the route accent, a serif title in `paper-edge`, a body line at `rgba(255,250,240,.76)`, and a "DETALJI" label. Radius 8px, card-rest shadow, `min-height: 18rem` (21rem on mobile).
- **Proof card (`.ablux-proof-card`):** `rgba(255,250,240,.76)` on the ruled board, a 4px `gold` left rule, 8px radius (as built 0.45rem), padding 1.2rem, an ink icon tile (2.75rem, `gold-2` glyph), a Manrope title, and muted body text.
- **Vehicle card (`.ablux-vehicle-card`):** paper (`rgba(255,250,240,.94)`) on the ink panel, a 16:11 real photo, a teal overline, a Manrope title, and a `gold-ink` service line (currently `gold` at 0.68rem, 2.65:1, which fails).
- **Panel (ink feature):** `ink` ground, a 1px `rgba(215,226,223,.18)` border, 8px radius (0 on mobile, full bleed), padding `clamp(1.1rem, 2vw, 1.5rem)`.

### Navigation
- **Desktop:** transparent over the hero (links in `paper-edge`) and, after scrolling, `rgba(248,244,234,.82)` with `backdrop-filter: blur(12px)` and a 1px `line` bottom border (Tinta: `rgba(6,21,26,.82)`). This replaces the navy `rgba(8,12,28,.55/.82)`. The bar is 72px tall; the inner width is 94rem. The wordmark is on the left. Links: Manrope 700, 0.8rem, uppercase, tracking 0.06em, 44px targets. Active: `gold-ink` on paper or `gold-2` on ink, plus a 2px underline. Hover: ink/paper-edge with the underline sweep.
- **Utility cluster:** search, SR | EN, theme toggle (moon/sun), cart with a count badge (ink on `gold-2`, tabular), and "Prijava". They sit inline on one baseline, each 44×44, with icons in one set (lucide at `strokeWidth 1.5`; react-icons was removed in step 15). The cart shows only for ABLux programs.
- **Mega menu (Ponude):** a full-width paper sheet under the bar (`paper-light`, medium shadow, 1px `line` top) with 4 columns by category (Verski turizam, Letovanja, Evropske ture, Ekskurzije; plus Rent a bus) listing links with live counts (tabular, `muted`), and a postcard feature on the right ("Polazak ovog meseca"). It opens on click or Enter, not hover alone; closes on Esc and outside click; `aria-expanded`; focus moves into it.
- **Sticky search pill (target):** after the hero leaves the viewport, a pill docks 12px under the nav: 52px tall, `paper-light`, 1px `line-field`, medium shadow. It contains a search icon, "Kuda putujete?", a summary of the active filters ("Jul · 2 putnika · Beograd"), and a round gold submit (44px). Clicking it expands to the full filter panel on desktop and a bottom sheet on mobile.
- **Mobile:** a fixed 60px top bar with the logo on the left and cart, theme, language, and menu on the right, all 44px. The menu opens a full-height `paper` sheet (Tinta: `ink`) with EB Garamond 1.75rem top-level links, accordion sub-links in Manrope, and contact from settings at the bottom.

### Footer (new style)
The back cover of the journal. It replaces the current navy/blue glass footer (`components/site-footer.tsx`; screenshot: bottom of `home_desktop_slice04_y3600_light.png`).
- **Ground:** `ink` in Papir, `ink-2` in Tinta (one step above the page), with `ablux-paper-route-texture.png` at 5% opacity and no gradients. A dashed brick route line along the top edge ends in a pin labelled "Beograd".
- **Content:** the wordmark (`public/logo-light.avif`) and a one-line description; 3–4 link columns (Ponude, Putovanja, ABLux: O nama, Rent a bus, Kontakt; Pravno: Opšti uslovi, Politika privatnosti) with Manrope 0.9375rem links in `paper`, 44px rows, and headings in overline `gold-2`; a contact block **read from `settings` only** (the placeholders `+381 11 123 45 67`, "Bulevar Putnika 22", `info@abluxtravel2022.rs` must never render; hide any field that is empty); the license line "Licenca OTP: {broj}" when present; and a payments note ("Plaćanje u dinarima po srednjem kursu NBS · IPS QR").
- **Bottom row:** "© 2026 ABLux Travel" and the language switch, `tinta-muted` 0.875rem, above a 1px `rgba(215,226,223,.14)` rule.
- **Don't:** no rounded floating footer card, no glass, no gradient borders, no marketing tagline such as "Digitalna platforma za modernu turističku agenciju".

### Table
- **Header:** `paper-2` ground, overline-style labels (0.75rem, 800, tracking 0.08em, uppercase, `muted-strong`), 40px tall, sticky within its scroll container.
- **Rows:** `paper-light`, 44px tall (40px in admin on fine pointers, 44px on `pointer: coarse`), 1px `line-soft` separators, optional zebra with `paper`. Numbers and dates are right-aligned and tabular. Hover `paper-2`. Selected: a 3px `gold` inset left rule on `paper-2`. Row actions show on hover and focus-within, and are always visible on touch.
- **Public use:** price tables on detail pages ("Termin · Smeštaj · Cena po osobi"), with the basis in the column header and the NBS note under the table. On mobile, rows become stacked label/value cards; no horizontal scroll for price tables.
- **Tinta:** header `ink-3`, rows `ink-2`, separators `tinta-line`.

### Dialog / Sheet
- **Dialog:** native `<dialog>` (or a portal), `paper-light`, 16px radius, the high shadow, `width: min(100% - 32px, 560px)`, padding 32px (24px on mobile), overlay `rgba(6,21,26,.6)`. The title is title-serif on public pages and admin-title in the admin. Close is a 44px icon button with `aria-label="Zatvori"`. Focus is trapped, Esc closes, and focus returns to the trigger. It enters with an opacity plus translateY(8px) over 220 ms.
- **Bottom sheet (mobile):** full width, 16px top radius, a 36×4px `line-strong` handle, `max-height: 88svh` with internal scroll, and actions in a sticky footer with the safe-area inset. Used for filters, the search pill, and the inquiry form on mobile.
- Prefer inline and progressive disclosure first. Dialogs are for confirmations, the inquiry form, and the command palette.

### Admin (operate mode)
Same tokens and the same Papir/Tinta switch; Manrope only. It replaces the old navy "Komandni centar" (`design/reference/old_admin_dashboard.png`) entirely.
- **Shell:** a 248px `paper-2` sidebar (Tinta `ink-2`) with a 1px `line` right border; the logo wordmark is the only serif. Nav items are 40px (44px on coarse pointers), Manrope 600 at 0.875rem with 20px icons. Active: `paper-light` fill, ink text, and a 3px `gold` left rule. The top bar is 56px with the page title (admin-title), a command-palette trigger ("Pretraži ili pokreni komandu…" plus a `Ctrl K` key hint), and the user menu. The content ground is `paper` and panels are `paper-light` with a 1px `line-soft` border, 8px radius, and no shadow. The DNA suggested an ink sidebar; paper-2 was chosen so the admin does not echo the old dark slab.
- **Type scale (fixed rem, about 1.125 ratio):** 0.75 (labels) / 0.8125 (meta) / 0.875 (table, body) / 1 (inputs, lead) / 1.125 (panel titles, 700) / 1.375 (page title, 700). No `clamp()`.
- **Status lights:** an 8px dot plus a text label, always both. "Aktivno" `teal` (Tinta `tinta-teal`), "Upozorenje" `ochre`, "Greška" `brick` (`tinta-brick`), "Isključeno" `stone`, "U toku" teal with a slow pulse of opacity only (none under reduced motion). The chip version: a 24px `paper-2` chip with the dot and a 0.8125rem ink label.
- **Partner sync cards (17):** partner name, a status light, active offer count (tabular), last run ("Danas u 06:00 · 214 ponuda, 12 izmena"), a per-partner switch, and "Detalji". The "Pokreni sada" button is secondary style; after a manual run it is disabled with a countdown ("Sledeće automatsko pokretanje u 06:00 · za 7 h 12 min"). The log is human-readable sentences, not stack traces.
- **Command palette (Ctrl+K / Cmd+K):** a dialog at `top: 20vh`, 640px wide, `paper-light`, 16px radius, high shadow, with a 52px input and results grouped as Stranice, Ponude, Partneri, and Komande (each 40px, arrow-key navigation, Enter runs, Esc closes, key hints on the right in 0.75rem `muted`).
- **Forms and tables:** use the public input and table specs at admin density; bulk actions go in a sticky bar above the table when rows are selected ("3 izabrane · Sakrij · Promeni kategoriju"). Empty states teach ("Još nema upita. Novi upiti sa sajta pojaviće se ovde, a obaveštenje stiže na Vaš e-mail kada ga podesite.").
- **Motion:** 150–250 ms state transitions only; no reveals, no parallax, no textures.
- **Built (step 13):** `app/styles/admin.css` (`.adm-*`), `components/admin/kit.tsx`, `components/admin/screens/*`. Detail views open in a right-hand drawer (full screen on phones) over the list instead of new pages, so the list keeps its filters and scroll.

## Do's and Don'ts

### Do:
- **Do** use `paper` (#F8F4EA) as the default ground and `ink` (#06151A) for text, with Papir as the stored default theme.
- **Do** put ink text (#06151A) on gold buttons; the gradient `#D5A54F → #B99146` with ink passes at 8.25:1 and 6.37:1.
- **Do** use `gold-ink` (#7D5E27) for any gold text smaller than 24px on paper, and for the focus ring on paper.
- **Do** set every serif heading at line-height ≥ 1.1 with `padding-block: 0.08em`, and check the diacritic test strings before shipping.
- **Do** keep running text at 1rem or larger on mobile and all touch targets at 44×44px or larger.
- **Do** show every price as "od X €" plus its basis ("po osobi", "po apartmanu", "ukupno za 2 osobe"), with the NBS note on detail pages, and "Organizator" plus "Licenca" on partner offers.
- **Do** build motion with `useGSAP` and `gsap.matchMedia()`, animating only `transform` and `opacity` with `power3.out`.
- **Do** keep tickets, postcards, and stamps paper-colored in Tinta.
- **Do** use real ABLux photos for vehicles, team, interiors, and trips, moved only by code (slow zoom, parallax, warm-grade overlay).
- **Do** read contact data and the license number from `settings`, and hide empty fields.

### Don't:
- **Don't** use navy grounds, blue or cyan accents, neon gradients, glowing borders, or glass cards anywhere (the old `#071226`, `#12233f`, `#155eef`, `#5ea4ff`, `#67e8f9` system), including the footer, the nav, the focus ring, and the admin.
- **Don't** use Sora, or Georgia as a primary face; the serif is EB Garamond and everything else is Manrope.
- **Don't** put `gold` (#B99146) or `gold-2` (#D5A54F) text on paper at body sizes, or light text (#FFF9EC) on gold fills.
- **Don't** set serif display text at line-height below 1.1, or wrap it in a tight `overflow: hidden`, in a way that clips carons on č, ž, š.
- **Don't** animate `filter`, `width`, `height`, `top`, or `left`; don't use bounce or overshoot easing; don't ship motion that `prefers-reduced-motion` cannot turn off.
- **Don't** call `.play()` on a video that is scrubbed by ScrollTrigger.
- **Don't** alter real vehicle, interior, team, or trip photos with AI, and don't use `pocetna*.avif`, `kontakt-hero.avif`, `plane.avif`, or `background*.avif` in new work.
- **Don't** invent testimonials, traveler counts, ratings, awards, license numbers, or scarcity ("Još samo 2 mesta!") that the data does not support.
- **Don't** use emojis, exclamation marks, or hype words in UI copy, or mix informal "ti" into sentences.
- **Don't** render the placeholder contacts (`+381 11 123 45 67`, "Bulevar Putnika 22", `info@abluxtravel2022.rs`).
- **Don't** use the serif, textures, stamps, or entrance animations in the admin.
