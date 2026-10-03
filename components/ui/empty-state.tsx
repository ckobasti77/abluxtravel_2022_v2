import type { ReactNode } from "react";
import { BRAND_GLYPHS, type BrandGlyphName } from "./brand-glyphs";
import { cn } from "./cn";

type EmptyStateProps = {
  title: ReactNode;
  /** Offer alternatives instead of "nema rezultata". */
  body?: ReactNode;
  glyph?: BrandGlyphName;
  /** Suggestion links or chips ("Pogledajte jul", "Pošaljite upit"). */
  suggestions?: ReactNode;
  /** One primary way forward. */
  action?: ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
};

export function EmptyState({ title, body, glyph = "compass", suggestions, action, headingLevel: Heading = "h3", className }: EmptyStateProps) {
  const Glyph = BRAND_GLYPHS[glyph];
  return (
    <div className={cn("ui-empty", className)}>
      <span className="ui-empty__glyph" aria-hidden="true">
        <Glyph />
      </span>
      <Heading className="ui-empty__title">{title}</Heading>
      {body ? <p className="ui-empty__body">{body}</p> : null}
      {suggestions ? <div className="ui-empty__suggestions">{suggestions}</div> : null}
      {action}
    </div>
  );
}
