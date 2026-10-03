"use client";

import { ArrowRight, House, Mail, RotateCcw } from "lucide-react";
import { useSitePreferences } from "../site-preferences-provider";
import { CompassGlyph } from "../ui/brand-glyphs";
import { Button, ButtonLink } from "../ui/button";
import { Stamp } from "../ui/stamp";

type LostTicketProps = {
  kind: "not-found" | "error";
  /** Error boundary reset; shows "Pokušaj ponovo". */
  onRetry?: () => void;
};

/**
 * "Izgubljena karta": 404 and error pages as a boarding pass that leads nowhere,
 * with three ways back (Početna, Ponude, Kontakt).
 */
export function LostTicket({ kind, onRetry }: LostTicketProps) {
  const { dictionary } = useSitePreferences();
  const copy = dictionary.chrome;
  const isError = kind === "error";

  return (
    <main id="main-content" className="lost">
      <div className="lost__ticket ui-ticket ui-ticket--brick">
        <div className="ui-ticket__paper ui-paper lost__paper">
          <div className="ui-ticket__stub">
            <span className="ui-ticket__glyph">
              <CompassGlyph />
            </span>
          </div>
          <div className="ui-ticket__body lost__body">
            <p className="ui-overline ui-ticket__overline">{isError ? copy.errorOverline : copy.lostOverline}</p>
            <h1 className="lost__title">{isError ? copy.errorTitle : copy.lostTitle}</h1>
            <p className="lost__text">{isError ? copy.errorBody : copy.lostBody}</p>
            <div className="lost__actions">
              {isError && onRetry ? (
                <Button onClick={onRetry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.5} />}>
                  {copy.errorRetry}
                </Button>
              ) : null}
              <ButtonLink
                href="/"
                variant={isError ? "secondary" : "primary"}
                iconStart={<House aria-hidden="true" strokeWidth={1.5} />}
              >
                {copy.home}
              </ButtonLink>
              <ButtonLink href="/ponude" variant="secondary" icon={<ArrowRight aria-hidden="true" strokeWidth={1.5} />}>
                {copy.offers}
              </ButtonLink>
              <ButtonLink href="/kontakt" variant="text" iconStart={<Mail aria-hidden="true" strokeWidth={1.5} />}>
                {copy.contact}
              </ButtonLink>
            </div>
          </div>
          <div className="ui-ticket__side lost__side">
            <Stamp eyebrow={isError ? "500" : "404"} code={isError ? copy.errorStamp : copy.lostStamp} detail="? → ?" tone="brick" decorative />
          </div>
        </div>
      </div>
    </main>
  );
}
