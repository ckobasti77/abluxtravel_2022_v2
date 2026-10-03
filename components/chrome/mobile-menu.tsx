"use client";

import { ChevronDown, LogOut, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../site-preferences-provider";
import { toPhoneHref, useSettings } from "../../lib/use-settings";
import { TRAVEL_TYPES } from "../../lib/search/travel-types";
import { tripSearchHref } from "../../lib/search/trip-search";
import { LanguageSwitch, ThemeToggle } from "./nav-controls";

export type MobileMenuLink = { key: string; href: string; label: string; active: boolean };

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  links: MobileMenuLink[];
  offersActive: boolean;
  onSearch: () => void;
  isSignedIn: boolean;
  isStaff: boolean;
  onSignOut: () => void;
};

/**
 * Full-screen ink sheet for phones. Native <dialog> + showModal(): the browser
 * traps focus, Esc closes it and the page behind is inert.
 */
export function MobileMenu({ open, onClose, links, offersActive, onSearch, isSignedIn, isStaff, onSignOut }: MobileMenuProps) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.chrome;
  const settings = useSettings();
  const ref = useRef<HTMLDialogElement>(null);
  const [offersOpen, setOffersOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const phoneHref = toPhoneHref(settings.phone);
  const contactRows = [
    settings.phone && phoneHref ? { key: "phone", href: phoneHref, label: settings.phone } : null,
    settings.email ? { key: "email", href: `mailto:${settings.email}`, label: settings.email } : null,
  ].filter((row): row is { key: string; href: string; label: string } => Boolean(row));

  return (
    <dialog ref={ref} className="mnav" aria-label={copy.mainNav} data-theme="dark">
      <div className="mnav__top">
        <Link href="/" className="snav__brand" onClick={onClose}>
          <Image src="/logo-dark.avif" alt="" width={500} height={500} className="snav__logo" />
          <span className="snav__wordmark">
            <strong>ABlux</strong>
            <small>Travel</small>
          </span>
          <span className="ui-sr-only">{copy.home}</span>
        </Link>
        <button type="button" className="snav__icon" onClick={onClose} aria-label={copy.closeMenu}>
          <X aria-hidden="true" strokeWidth={1.5} />
        </button>
      </div>

      <nav className="mnav__nav" aria-label={copy.mainNav}>
        <ul className="mnav__list">
          <li>
            <button
              type="button"
              className="mnav__link"
              aria-expanded={offersOpen}
              aria-controls="mnav-offers"
              data-active={offersActive || undefined}
              onClick={() => setOffersOpen((value) => !value)}
            >
              <span>{copy.offers}</span>
              <ChevronDown aria-hidden="true" strokeWidth={1.5} className="mnav__chevron" />
            </button>
            <ul id="mnav-offers" className="mnav__sub" hidden={!offersOpen}>
              <li>
                <Link href="/ponude" onClick={onClose}>
                  {copy.megaAll}
                </Link>
              </li>
              {TRAVEL_TYPES.map((type) => (
                <li key={type.slug}>
                  <Link href={tripSearchHref({ tip: type.slug })} onClick={onClose}>
                    {type.label[language]}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/aranzmani" onClick={onClose}>
                  {copy.megaArrangements}
                </Link>
              </li>
            </ul>
          </li>
          {links.map((link) => (
            <li key={link.key}>
              <Link href={link.href} className="mnav__link" aria-current={link.active ? "page" : undefined} onClick={onClose}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mnav__utils">
        <button
          type="button"
          className="mnav__search"
          onClick={() => {
            onClose();
            onSearch();
          }}
        >
          <Search aria-hidden="true" strokeWidth={1.5} />
          <span>{copy.searchTitle}</span>
        </button>
        <div className="mnav__prefs">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <div className="mnav__account">
          {isStaff ? (
            <Link href="/admin" className="mnav__account-link" onClick={onClose}>
              {copy.admin}
            </Link>
          ) : null}
          {isSignedIn ? (
            <button type="button" className="mnav__account-link" onClick={onSignOut}>
              <LogOut aria-hidden="true" strokeWidth={1.5} />
              {copy.signOut}
            </button>
          ) : (
            <Link href="/auth" className="mnav__account-link" onClick={onClose}>
              {copy.signIn}
            </Link>
          )}
        </div>
      </div>

      <div className="mnav__contact">
        {contactRows.length > 0 ? (
          contactRows.map((row) => (
            <a key={row.key} href={row.href}>
              {row.label}
            </a>
          ))
        ) : (
          <p>{dictionary.contact.detailsPending}</p>
        )}
      </div>
    </dialog>
  );
}
