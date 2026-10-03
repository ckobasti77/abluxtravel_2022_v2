import { cn } from "./cn";

type BrassPlateProps = {
  /** 1–99, rendered as two digits ("01"). */
  number: number;
  size?: "md" | "sm";
  /**
   * When the number only repeats visible order it is decorative (default).
   * Pass a label ("Korak 2 od 3") when the number carries meaning.
   */
  label?: string;
  className?: string;
};

/** Brass number plate with chamfered corners and an engraved numeral. */
export function BrassPlate({ number, size = "md", label, className }: BrassPlateProps) {
  const text = String(number).padStart(2, "0");
  return (
    <span
      className={cn("ui-plate", size === "sm" && "ui-plate--sm", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="ui-plate__num">{text}</span>
    </span>
  );
}
