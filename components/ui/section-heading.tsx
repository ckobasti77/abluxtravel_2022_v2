import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { CompassGlyph, CrossGlyph } from "./brand-glyphs";
import { ButtonLink } from "./button";
import { cn } from "./cn";

type SectionHeadingProps = {
  overline?: ReactNode;
  /** Use <em> for the one gold italic emphasis word. */
  title: ReactNode;
  intro?: ReactNode;
  link?: { href: string; label: string };
  /** Gold rule with a compass star, or a cross on religious sections only. */
  ornament?: "compass" | "cross";
  as?: "h1" | "h2" | "h3";
  id?: string;
  size?: "md" | "sm";
  align?: "start" | "center";
  onInk?: boolean;
  className?: string;
};

/** Overline, serif title, optional intro and a right-aligned text link. */
export function SectionHeading({
  overline,
  title,
  intro,
  link,
  ornament,
  as: Heading = "h2",
  id,
  size = "md",
  align = "start",
  onInk = false,
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "ui-section-heading",
        size === "sm" && "ui-section-heading--sm",
        align === "center" && "ui-section-heading--center",
        onInk && "ui-section-heading--on-ink",
        className,
      )}
    >
      {overline ? <p className="ui-overline">{overline}</p> : null}
      {ornament ? (
        <span className="ui-section-heading__ornament" aria-hidden="true">
          {ornament === "cross" ? <CrossGlyph /> : <CompassGlyph />}
        </span>
      ) : null}
      <div className="ui-section-heading__row">
        <Heading className="ui-section-heading__title" id={id}>
          {title}
        </Heading>
        {link ? (
          <ButtonLink href={link.href} variant="text" icon={<ArrowRight aria-hidden="true" strokeWidth={1.5} />}>
            {link.label}
          </ButtonLink>
        ) : null}
      </div>
      {intro ? <p className="ui-section-heading__intro">{intro}</p> : null}
    </header>
  );
}
