import type { ReactNode } from "react";
import { cn } from "./cn";

export type StampTone = "ink" | "brick" | "teal";

type StampProps = {
  /** Small top line, e.g. "RUTA". */
  eyebrow?: ReactNode;
  /** Main code, e.g. "BEG → JER" (use a real arrow). */
  code: ReactNode;
  /** Bottom line, e.g. "12–24 dana". Only facts that are true for the offer. */
  detail?: ReactNode;
  tone?: StampTone;
  shape?: "box" | "round" | "status";
  /**
   * Decorative stamps repeat facts already in the text (ticket meta row);
   * they are hidden from assistive tech to avoid reading things twice.
   */
  decorative?: boolean;
  className?: string;
};

/** Rubber stamp: rotated −3°, carries route codes, durations or a status ("RASPRODATO"). */
export function Stamp({ eyebrow, code, detail, tone = "ink", shape = "box", decorative = false, className }: StampProps) {
  return (
    <span
      className={cn("ui-stamp", tone !== "ink" && `ui-stamp--${tone}`, shape !== "box" && `ui-stamp--${shape}`, className)}
      aria-hidden={decorative || undefined}
    >
      {eyebrow ? <span className="ui-stamp__eyebrow">{eyebrow}</span> : null}
      <span className="ui-stamp__code">{code}</span>
      {detail ? <span className="ui-stamp__detail">{detail}</span> : null}
    </span>
  );
}
