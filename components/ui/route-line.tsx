"use client";

import { useId } from "react";
import { CompassGlyph } from "./brand-glyphs";
import { cn } from "./cn";
import { useRouteDraw } from "./motion";

export type RoutePin = {
  /** Position in viewBox units. */
  x: number;
  y: number;
  /** 0–1 along the path: when the pin pops in while the line draws. */
  at?: number;
  label?: string;
};

type RouteLineProps = {
  /** SVG path in viewBox units. */
  d?: string;
  viewBox?: { width: number; height: number };
  pins?: RoutePin[];
  tone?: "brick" | "teal";
  /** Engraved compass rose at the start of the route. */
  compassAt?: { x: number; y: number } | null;
  /** "scroll" scrubs the drawing to scroll, "enter" plays once, "none" is static. */
  animate?: "scroll" | "enter" | "none";
  /** Height of the drawing area (CSS length). */
  height?: string;
  /** Routes are decorative unless a label describes them. */
  label?: string;
  className?: string;
};

const DEFAULT_VIEWBOX = { width: 1000, height: 120 };
const DEFAULT_PATH = "M 20 70 C 160 10, 300 110, 460 60 S 760 10, 980 64";
const DEFAULT_PINS: RoutePin[] = [
  { x: 20, y: 70, at: 0 },
  { x: 460, y: 60, at: 0.48 },
  { x: 980, y: 64, at: 1 },
];

/**
 * Dashed route with pins, drawn on scroll. The SVG stretches to its box
 * (non-scaling stroke); pins and labels are HTML positioned in percent, so
 * they stay round at any aspect ratio.
 */
export function RouteLine({
  d = DEFAULT_PATH,
  viewBox = DEFAULT_VIEWBOX,
  pins = DEFAULT_PINS,
  tone = "brick",
  compassAt = null,
  animate = "scroll",
  height = "7.5rem",
  label,
  className,
}: RouteLineProps) {
  const maskId = `route-mask-${useId().replace(/:/g, "")}`;
  const ref = useRouteDraw<HTMLDivElement>({ scrub: animate !== "enter" });
  const animated = animate !== "none";

  return (
    <div
      ref={animated ? ref : undefined}
      className={cn("ui-route", tone === "teal" && "ui-route--teal", className)}
      style={{ height }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg
        className="ui-route__svg"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width={viewBox.width + 40} height={viewBox.height + 40}>
            <path className="ui-route__mask-path" d={d} data-route-mask={animated || undefined} />
          </mask>
        </defs>
        <path className="ui-route__path" d={d} vectorEffect="non-scaling-stroke" mask={`url(#${maskId})`} data-route-path />
      </svg>
      {compassAt ? (
        <span
          className="ui-route__start"
          style={{ left: `${(compassAt.x / viewBox.width) * 100}%`, top: `${(compassAt.y / viewBox.height) * 100}%` }}
        >
          <CompassGlyph />
        </span>
      ) : null}
      {pins.map((pin, index) => (
        <span key={index}>
          <span
            className="ui-route__pin"
            data-route-pin={animated || undefined}
            data-route-at={pin.at ?? (pins.length > 1 ? index / (pins.length - 1) : 1)}
            style={{ left: `${(pin.x / viewBox.width) * 100}%`, top: `${(pin.y / viewBox.height) * 100}%` }}
          />
          {pin.label ? (
            <span
              className={cn(
                "ui-route__label",
                pin.x / viewBox.width < 0.12 && "ui-route__label--start",
                pin.x / viewBox.width > 0.88 && "ui-route__label--end",
              )}
              style={{ left: `${(pin.x / viewBox.width) * 100}%`, top: `${(pin.y / viewBox.height) * 100}%` }}
            >
              {pin.label}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
