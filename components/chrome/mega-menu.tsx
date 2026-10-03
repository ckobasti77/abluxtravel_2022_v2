"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { BRAND_GLYPHS } from "../ui/brand-glyphs";
import { ButtonLink } from "../ui/button";
import { useSitePreferences } from "../site-preferences-provider";
import { useCategories } from "../../lib/use-categories";
import { TRAVEL_TYPES } from "../../lib/search/travel-types";
import { tripSearchHref, useTravelTypeCounts } from "../../lib/search/trip-search";

type MegaMenuProps = {
  id: string;
  open: boolean;
  onClose: () => void;
};

/**
 * "Ponude" mega menu: a paper sheet under the bar with travel types (live counts),
 * ABLux sections and categories from the database, plus an inquiry feature.
 * Opens on click/Enter; Esc and outside click close it (handled by the navigation).
 */
export function MegaMenu({ id, open, onClose }: MegaMenuProps) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.chrome;
  const counts = useTravelTypeCounts();
  const categories = useCategories();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus moves into the menu when it opens.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [open]);

  const categoryLinks = categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((category) => ({
      key: category._id,
      href: category.type === "religious" ? `/verski-turizam?category=${category.slug}` : `/aranzmani?category=${category.slug}`,
      label: language === "sr" ? category.name.sr : category.name.en,
    }));

  return (
    <div id={id} ref={panelRef} className="snav-mega" hidden={!open}>
      <div className="snav-mega__inner">
        <section className="snav-mega__types" aria-labelledby={`${id}-types`}>
          <p className="ui-overline" id={`${id}-types`}>
            {copy.megaTypes}
          </p>
          <ul className="snav-mega__type-list">
            {TRAVEL_TYPES.map((type) => {
              const Glyph = BRAND_GLYPHS[type.glyph];
              const count = counts[type.slug];
              return (
                <li key={type.slug}>
                  <Link href={tripSearchHref({ tip: type.slug })} className="snav-mega__type" onClick={onClose}>
                    <Glyph className="snav-mega__glyph" />
                    <span>{type.label[language]}</span>
                    {count > 0 ? <span className="snav-mega__count">{count}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="snav-mega__col" aria-labelledby={`${id}-ablux`}>
          <p className="ui-overline" id={`${id}-ablux`}>
            {copy.megaAblux}
          </p>
          <ul className="snav-mega__list">
            <li>
              <Link href="/aranzmani" onClick={onClose}>
                {copy.megaArrangements}
              </Link>
            </li>
            <li>
              <Link href="/putovanja" onClick={onClose}>
                {copy.megaCountries}
              </Link>
            </li>
            <li>
              <Link href="/destinacije" onClick={onClose}>
                {copy.megaDestinations}
              </Link>
            </li>
          </ul>
          {categoryLinks.length > 0 ? (
            <>
              <p className="ui-overline snav-mega__sub-heading">{copy.megaCategories}</p>
              <ul className="snav-mega__list">
                {categoryLinks.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} onClick={onClose}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <aside className="snav-mega__feature">
          <p className="snav-mega__feature-title">{copy.megaFeatureTitle}</p>
          <p className="snav-mega__feature-body">{copy.megaFeatureBody}</p>
          <ButtonLink href="/kontakt" variant="secondary" size="sm" onClick={onClose}>
            {copy.megaFeatureCta}
          </ButtonLink>
          <ButtonLink href="/ponude" variant="text" size="sm" icon={<ArrowRight aria-hidden="true" strokeWidth={1.5} />} onClick={onClose}>
            {copy.megaAll}
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
