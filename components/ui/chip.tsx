import { Check, X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  /** Toggle state for filter chips; selected chips get a check icon (color is never the only signal). */
  selected?: boolean;
  /** Result count shown after the label ("Letovanja 128"). */
  count?: number;
};

/** Filter chip: a toggle button. Disabled = zero results, still announced. */
export function Chip({ selected = false, count, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button type={type} className={cn("ui-chip", className)} aria-pressed={selected} {...rest}>
      {selected ? <Check aria-hidden="true" strokeWidth={2} /> : null}
      <span>{children}</span>
      {typeof count === "number" ? <span className="ui-chip__count">{count}</span> : null}
    </button>
  );
}

type RemovableChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  /** Accessible name prefix, e.g. "Ukloni filter". */
  removeLabel?: string;
};

/** Active filter in the row above results: "Jul ×". */
export function RemovableChip({ label, removeLabel = "Ukloni filter", className, type = "button", ...rest }: RemovableChipProps) {
  return (
    <button type={type} className={cn("ui-chip ui-chip--removable", className)} aria-label={`${removeLabel}: ${label}`} {...rest}>
      <span>{label}</span>
      <X aria-hidden="true" strokeWidth={1.75} />
    </button>
  );
}

export type BadgeTone = "neutral" | "route" | "alert" | "warn" | "gold" | "info" | "outline";

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={cn("ui-badge", tone !== "neutral" && `ui-badge--${tone}`, className)}>{children}</span>;
}

export type Status = "active" | "warning" | "error" | "off" | "progress";

const STATUS_LABELS: Record<Status, string> = {
  active: "Aktivno",
  warning: "Upozorenje",
  error: "Greška",
  off: "Isključeno",
  progress: "U toku",
};

/** Status light: an 8px dot plus a text label, always both. */
export function StatusDot({
  status,
  label,
  chip = false,
  className,
}: {
  status: Status;
  label?: ReactNode;
  /** Admin chip version (24px paper-2 chip). */
  chip?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("ui-status", `ui-status--${status}`, chip && "ui-status--chip", className)}>
      <span className="ui-status__dot" aria-hidden="true" />
      <span>{label ?? STATUS_LABELS[status]}</span>
    </span>
  );
}
