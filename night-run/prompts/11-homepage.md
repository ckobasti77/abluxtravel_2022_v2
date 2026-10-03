# Step 11 — Početna: „Živa razglednica“ i sekcije iz baze
<!-- mode: auto · effort: high · session: S6 (new) -->

You are step 11 of the ABLux night run. Read `night-run/NIGHT_RULES.md`, `DESIGN.md`, `docs/design/hero-prompts.md` (file contract), and `public/media/hero/manifest.json` if it exists. The homepage is the style authority: keep its composition and character, raise it to the comps (`design/comps/legacy/desktop-routes.png` etc.: notched tickets, brass number plates, stamps, dashed routes with pins, compass).

1. **Hero "Živa razglednica"** (`components/home-hero.tsx` and helpers):
   - Scenes from the manifest: hodočašća (default), mediteran, evropa. Missing video → poster with a slow CSS zoom; missing poster → fall back to `public/generated/` images. The component must pick up files added later without code changes (it reads the manifest).
   - The three tickets are channels: click switches the scene with a paper-texture crossfade; auto-advance every 9 s with the ticket perforation "tearing" as the timer; pause on hover/focus and when the tab is hidden; stop auto-advance after user interaction.
   - Load: poster immediately, stamp "AB · od 2022." presses in, headline lines rise, video fades over the poster. If a loop seam is visible, crossfade 0.4 s at the loop point.
   - Scroll (desktop): the scene shrinks into a postcard (white deckled border + stamp), tilts ~2°, and lands as the first card of the next section; the booking bar docks into the sticky "Kuda putujete?" pill. Transform/opacity only, GSAP ScrollTrigger scrub.
   - Mobile: 9:16 composition (dome and text never collide), only the default scene loads video; other scenes are stills; tickets are swipeable cards; the chat button never covers the search.
   - `prefers-reduced-motion` or Save-Data: posters only, no auto-advance, no morph.
2. **Working search** in the hero (the step 05 component): tip, mesec, broj putnika, polazak iz, live count, submit to `/ponude?...`.
3. **Sections from the database:** "Uskoro polaze" (next departures from ABLux programs + partner offers), "Najtraženije rute" (admin-managed: reuse `homeRouteSlides` or a featured flag; fall back to the current five routes), verski turizam spotlight, "17 agencija, jedan potpis" (partner strip with live offer counts, links to the filtered catalog), Rent a bus (real photos from `vehicleRentalImages` with slow zoom; if the manifest has `rentabus`, use its loop), process, closing CTA.
4. **Dark theme** (Tinta) for the whole homepage; no hard cut to a different style at the footer.
5. Remove stock imagery from the homepage.

Gate, commit, "Korak 11" in the report (note which hero assets were present).
