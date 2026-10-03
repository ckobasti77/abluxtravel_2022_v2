import type { CSSProperties } from "react";
import { cn } from "./cn";

type SkeletonProps = {
  variant?: "block" | "text" | "title" | "circle";
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
};

/**
 * Paper shimmer placeholder. Decorative: wrap the loading region in an element
 * with aria-busy="true" and a visually hidden "Učitavanje…" for screen readers.
 */
export function Skeleton({ variant = "block", width, height, className }: SkeletonProps) {
  return (
    <span
      className={cn("ui-skeleton", variant !== "block" && `ui-skeleton--${variant}`, className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Loading shape of a TicketCard. */
export function TicketSkeleton({ label = "Učitavanje ponude…", layout = "row" }: { label?: string; layout?: "row" | "stacked" }) {
  return (
    <div className={cn("ui-ticket", layout === "stacked" && "ui-ticket--stacked")} aria-busy="true">
      <span className="ui-sr-only">{label}</span>
      <div className="ui-ticket__paper ui-paper">
        <div className="ui-ticket__stub">
          <Skeleton width="100%" height="100%" />
        </div>
        <div className="ui-ticket__body">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="title" />
          <Skeleton variant="text" width="85%" />
          <Skeleton variant="text" width="60%" />
        </div>
        <div className="ui-ticket__side">
          <Skeleton width="6rem" height="3.5rem" />
          <Skeleton width="8rem" height="2.75rem" />
        </div>
      </div>
    </div>
  );
}
