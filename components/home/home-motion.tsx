"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionPreferences } from "./use-motion-preferences";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Where the postcard rests in the viewport when it lands (below the nav and the search pill). */
const LANDING_TOP = 176;

/**
 * The homepage signature moment (DESIGN.md → Motion), desktop only: as the page
 * scrolls, the hero scene shrinks into a postcard (deckled border + stamp),
 * tilts 2° and lands in the slot of the next section, while the booking bar
 * docks into the sticky "Kuda putujete?" pill. Scrubbed, transform/opacity
 * only. Off under reduced motion, Save-Data/slow networks and below 1024px:
 * there the slot shows its own static postcard.
 */
export function HomeMotion() {
  const prefs = useMotionPreferences();
  const enabled = prefs.ready && !prefs.reducedMotion && !prefs.lowData;

  useGSAP(
    () => {
      if (!enabled) return;
      const root = document.querySelector<HTMLElement>(".ablux-home");
      const hero = root?.querySelector<HTMLElement>(".ablux-hero");
      const scene = hero?.querySelector<HTMLElement>("[data-hero-scene]");
      const slot = root?.querySelector<HTMLElement>("[data-hero-landing]");
      if (!root || !hero || !scene || !slot) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        root.dataset.morph = "on";

        // Two phases, so the scene never covers the next section's text: (1) it shrinks into a
        // postcard at the top left of the viewport, (2) it rests there (moving with the page at
        // the same rate) until its slot scrolls up under it.
        let geo = { x: 0, y1: 0, y: 0, scale: 0.4, end: 600 };
        const measure = () => {
          const heroRect = hero.getBoundingClientRect();
          // The slot takes the hero's aspect ratio, so the scene lands without a crop jump.
          slot.style.setProperty("--hero-aspect", `${heroRect.width} / ${heroRect.height}`);
          const slotRect = slot.getBoundingClientRect();
          const scale = slotRect.width / heroRect.width;
          const heroCenterY = heroRect.top + window.scrollY + heroRect.height / 2;
          const end = Math.max(240, slotRect.top + window.scrollY - LANDING_TOP);
          geo = {
            x: slotRect.left + slotRect.width / 2 - (heroRect.left + heroRect.width / 2),
            // End of phase 1 (scroll = end / 2): the card's top sits LANDING_TOP below the viewport top.
            y1: end / 2 + LANDING_TOP + slotRect.height / 2 - heroCenterY,
            y: slotRect.top + window.scrollY + slotRect.height / 2 - heroCenterY,
            scale,
            end,
          };
          // Keeps the deckled border and stamp at postcard size after scaling.
          scene.style.setProperty("--postcard-scale", String(scale));
        };
        measure();
        ScrollTrigger.addEventListener("refreshInit", measure);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () => `+=${geo.end}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        tl.to(scene, { x: () => geo.x, y: () => geo.y1, scale: () => geo.scale, rotation: 2, ease: "power2.inOut", duration: 0.5 }, 0)
          .to(scene, { y: () => geo.y, ease: "none", duration: 0.5 }, 0.5)
          .to(".ablux-hero__shade", { autoAlpha: 0, ease: "none", duration: 0.2 }, 0)
          .to(".ablux-hero__copy, .ablux-hero__caption", { y: -48, autoAlpha: 0, ease: "none", duration: 0.2 }, 0)
          .fromTo(".ablux-hero__deckle, .ablux-hero__postmark", { autoAlpha: 0 }, { autoAlpha: 1, ease: "none", duration: 0.2 }, 0.28);

        // The booking bar shrinks toward the top center while the sticky pill takes over.
        // fromTo + immediateRender:false: never fights the load animation of the same bar.
        gsap.fromTo(".ablux-booking", { scale: 1, autoAlpha: 1 }, {
          scale: 0.6,
          autoAlpha: 0,
          transformOrigin: "50% 0%",
          ease: "none",
          immediateRender: false,
          scrollTrigger: {
            trigger: ".ablux-booking",
            start: "top 34%",
            end: "bottom 80px",
            scrub: 0.4,
          },
        });

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", measure);
          delete root.dataset.morph;
          slot.style.removeProperty("--hero-aspect");
          scene.style.removeProperty("--postcard-scale");
        };
      });

      return () => mm.revert();
    },
    { dependencies: [enabled] },
  );

  return null;
}
