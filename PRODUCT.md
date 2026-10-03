# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visitors (primary):** people in Serbia, mostly Belgrade and surroundings, looking for an organized trip. Four recurring jobs: pilgrimages and religious tours (often older travelers and parish groups), summer holidays (families), city breaks and group tours, school excursions. Most visits come from phones.
- **Charter customers:** companies, clubs and groups renting the ABLux bus or luxury van with a driver.
- **Admin users:** the ABLux owners and a new office manager with ~20 years of experience in tourism who will run the admin panel daily. She is not a developer; every workflow must be doable without one.

## Product Purpose

ABLux Travel (Belgrade, founded 2022) sells its own programs, with religious tourism as the core specialty, plus European tours, and resells the offers of 17 partner agencies as a subagent. The site must:

1. earn trust at first sight,
2. show all current offers in one catalog, with partner offers imported automatically every day (Partner Sync),
3. turn a visit into an inquiry or reservation in as few steps as possible,
4. let the office manager run content, offers and inquiries alone.

Success: inquiries per week, offers kept current without manual typing, the manager's time saved.

## Positioning

One place for the offers of 17 trusted partner agencies, with ABLux care on top, its own pilgrimage programs, and transport in ABLux's own vehicles (Setra coach, Mercedes Sprinter luxury van).

## Operating Context

- Prices are in EUR and paid in dinars at the National Bank of Serbia middle rate. ABLux programs can take a deposit by IPS QR (NBS instant payment).
- Subagent practice: every partner offer names the tour organizer (and its license when known) and links to the organizer's original program and general terms.
- Partner Sync: automatic import once a day at 06:00 Europe/Belgrade; offers are published automatically. Admin has a "Pokreni sada" button that starts an extra import; after a manual run the button is locked until the next 06:00 run.
- Languages: Serbian Latin (primary), English (secondary). Partner content exists in Serbian only; on the English site it is shown with a note that the program is in Serbian.
- Hosting: Next.js on Vercel, Convex backend. This sprint works on the Convex DEV deployment only; production is not touched.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, React 19, Convex, Tailwind CSS v4, GSAP (`@gsap/react`), Zustand.
- Existing modules to keep working: own trips (`trips`, `accommodations`), destinations and religious offers, home route slides, vehicle rental images, settings, orders with IPS QR, cart.
- The cart stays only for ABLux's own programs. Partner offers use a "Rezerviši / Pošalji upit" inquiry flow.
- Public URLs stay stable for SEO (`/aranzmani`, `/putovanja`, `/destinacije`, `/verski-turizam`, `/ponude`, ...). New: `/ponude/[slug]` for partner offer detail.
- Undecided: email provider for inquiry notifications (store inquiries in admin until one is chosen); real contact data and license number (read from `settings`, never hardcode).

## Brand Commitments

- The visual world of the approved local homepage: paper, ink, gold, teal, brick; EB Garamond display (replaced Cormorant in step 04 for correct Serbian carons) + Manrope UI; tickets (boarding passes), postcards, stamps, brass number plates, dashed routes with pins. The old navy/cyan glass style is the anti-reference.
- Name: "ABLux Travel" (wordmark "ABlux TRAVEL"). Logos: `public/logo-dark.avif`, `public/logo-light.avif`.
- Voice: calm, warm, precise, formal "Vi". No hype words, no emojis.

## Evidence on Hand

- Real photos: ABLux vehicles and interiors, trips (`public/home-swiper/*`), a real monastery photo (`public/home-swiper/IMG-20240104-WA0011.avif`).
- Generated art already approved: `public/generated/ablux-hero-reference-*`, `ablux-hero-ostrog-*`, `route-*`, design comps in `public/generated/concepts/` (to be moved out of `public/`).
- Stock images (`pocetna*.avif`, `kontakt-hero.avif`, `plane.avif`, `background*.avif`) are off-brand: do not use in new work.
- There are no testimonials, traveler counts, awards or reviews. Do not invent any.
- Contact data currently in code (+381 11 123 45 67, "Bulevar Putnika 22", info@abluxtravel2022.rs) is fake placeholder data. Never render it.
- Partner research with saved pages: `docs/partners/`.

## Product Principles

1. Trust before effect: every animation must leave the offer, the price and the action clearer, never hidden.
2. Two clicks from any offer to an inquiry.
3. The office manager never needs a developer for daily work.
4. Truth about every offer: organizer, "od X €" with its basis, last update date. Nothing invented.
5. Fast on a phone on mobile data.

## Accessibility & Inclusion

WCAG 2.1 AA. The audience includes many older travelers: body text at least 16px, strong contrast, large touch targets, no motion that cannot be turned off (`prefers-reduced-motion`).
