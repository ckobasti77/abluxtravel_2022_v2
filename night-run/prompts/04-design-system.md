# Step 04 — Dizajn sistem: tokeni, teme, fontovi, bazne komponente
<!-- mode: auto · effort: high · session: S3 (new) -->

You are step 04 of the ABLux night run. Read `night-run/NIGHT_RULES.md`, `DESIGN.md`, `docs/design/ablux-design-dna.json`, and look at `design/reference/*.png` and `design/comps/legacy/*.png`. Use the skills in `.claude/skills/` (impeccable: read `reference/craft-floor.md` before editing UI; design-taste-frontend; ui-ux-pro-max checklists).

## Tasks
1. **Tokens in Tailwind v4** (`@theme` + CSS custom properties) for both themes: "Papir" (light, default) and "Tinta" (`[data-theme="dark"]`, ink ground, paper text, gold, lighter status colors per the DNA). Replace the old navy/cyan tokens. Keep existing pages rendering during the transition (map old variables to the new palette rather than leaving broken references).
2. **Fonts and Serbian diacritics.** Remove Sora. Diagnose the floating/clipped carons in Cormorant headings ("Najtraženije", "vozačem"): render a test string `Najtraženije ČĆŽŠĐ čćžšđ` at every weight used, screenshot it with Playwright, and fix (line-height, overflow/clip, padding, `font-synthesis`, subset loading). Only if the glyphs themselves are bad, switch the display face to one with a good Latin Extended set and write the decision to `night-run/DECISIONS.md`.
3. **Component library** in `components/ui/` with variants and all states (default, hover, focus-visible, active, disabled, loading, error): Button (primary gold, secondary, ghost-on-ink, text link), Field/Input/Select/Textarea with label above, Chip/Badge/StatusDot, TicketCard (notched corners via mask, perforation divider, stamp block with route code), Postcard (deckled white border + stamp), BrassPlate (01–05), RouteLine (SVG dashed path that draws on scroll, pins), SectionHeading (overline + serif title + optional link), Stamp, Skeleton (paper shimmer), EmptyState (with suggestions slot), Dialog and bottom Sheet, Tabs, Accordion, DataTable (hairlines, tabular numerals), Toast with undo. Icons: one set (lucide-react, strokeWidth 1.5) for new code; custom SVG glyphs for brand moments.
4. **Motion utilities:** a small GSAP helper (`useGSAP`) for reveal-on-enter and route drawing, all disabled under `prefers-reduced-motion`.
5. **`/dev/ui` route** (noindex, not linked) that renders every component in both themes, for QA screenshots.
6. **CSS cleanup:** split `app/globals.css` into tokens, base, and component layers; delete old styles only after grepping that nothing uses them. `app/ui-enhancements.css` likewise.

## Done when
Tokens and both themes work, the caron issue is fixed or decided, the components exist and render on `/dev/ui` in both themes without console errors, the gate passes, commit, and "Korak 04" is in the report.
