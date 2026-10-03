"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ElementType, type ReactNode, type RefObject } from "react";
import { cn } from "./cn";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * Motion utilities (DESIGN.md → Motion). Transform and opacity only, power3.out,
 * play once. Everything runs inside gsap.matchMedia("(prefers-reduced-motion:
 * no-preference)"), so under reduced motion nothing is set and content stays in its
 * final, visible state. Content is visible without JavaScript: GSAP only adds the
 * "from" state on mount.
 */

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export type RevealOptions = {
  /** Children matching this selector reveal in sequence; otherwise the element itself. */
  selector?: string;
  /** Vertical offset in px (22–46). */
  y?: number;
  duration?: number;
  stagger?: number;
  /** ScrollTrigger start; use "top 96%" for content overlapping the hero. */
  start?: string;
};

/** Reveal-on-enter: fade and rise once when the element scrolls into view. */
export function useReveal<T extends HTMLElement>(options: RevealOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { selector, y = 28, duration = 0.78, stagger = 0.08, start = "top 82%" } = options;

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const targets = selector ? gsap.utils.toArray<HTMLElement>(selector, root) : [root];
        if (targets.length === 0) return;
        gsap.from(targets, {
          y: Math.min(Math.max(y, 0), 46),
          autoAlpha: 0,
          duration,
          stagger,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start, toggleActions: "play none none none", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [selector, y, duration, stagger, start] },
  );

  return ref;
}

type RevealProps = RevealOptions & {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

/** Component form of useReveal. Mark staggered children with data-reveal. */
export function Reveal({ as: Tag = "div", className, children, ...options }: RevealProps) {
  const ref = useReveal<HTMLElement>(options);
  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}

export type RouteDrawOptions = {
  /** Scrub the drawing to scroll (default) or play once on enter. */
  scrub?: boolean;
  start?: string;
  end?: string;
};

/**
 * Route drawing: animates the mask path ([data-route-mask]) with stroke-dashoffset so
 * the dashed route ([data-route-path]) keeps a stable dash pattern, then pops the
 * pins ([data-route-pin]) in order. Under reduced motion the route is simply drawn.
 */
export function useRouteDraw<T extends HTMLElement>(options: RouteDrawOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { scrub = true, start = "top 85%", end = "bottom 55%" } = options;

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const mask = root.querySelector<SVGPathElement>("[data-route-mask]");
        const pins = gsap.utils.toArray<HTMLElement>("[data-route-pin]", root);
        if (!mask) return;
        const length = mask.getTotalLength();
        gsap.set(mask, { strokeDasharray: length, strokeDashoffset: length });
        // Pins are centered with xPercent/yPercent so GSAP owns the whole transform.
        gsap.set(pins, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.4 });

        const lineDuration = scrub ? 1 : 1.4;
        const timeline = gsap.timeline({
          scrollTrigger: scrub
            ? { trigger: root, start, end, scrub: 0.6 }
            : { trigger: root, start, toggleActions: "play none none none", once: true },
        });
        timeline.to(mask, { strokeDashoffset: 0, ease: scrub ? "none" : "power3.out", duration: lineDuration }, 0);
        // Each pin appears when the line reaches it (data-route-at: 0–1 along the path).
        pins.forEach((pin) => {
          const at = Math.min(Math.max(Number(pin.dataset.routeAt ?? 1), 0), 1);
          timeline.to(pin, { autoAlpha: 1, scale: 1, ease: "power3.out", duration: scrub ? 0.12 : 0.42 }, at * lineDuration);
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [scrub, start, end] },
  );

  return ref;
}
