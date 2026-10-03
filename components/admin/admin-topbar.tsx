"use client";

import { ChevronDown, ExternalLink, KeyRound, Languages, LogOut, Menu, MoonStar, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ROLE_LABELS } from "../../convex/lib/roles";
import { useAdminT } from "../../lib/admin/format";
import { pick } from "../../lib/admin/labels";
import { navItemForPath } from "../../lib/admin/nav";
import { useSession } from "../../lib/use-session";
import { useSitePreferences } from "../site-preferences-provider";
import { IconButton } from "../ui";
import { AdminLogo } from "./admin-logo";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "A") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { t, language } = useAdminT();
  const { theme, toggleTheme, setLanguage } = useSitePreferences();
  const session = useSession();
  // Open state belongs to the page it was opened on, so navigating closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const open = openPath === pathname;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) =>
    setOpenPath((current) => ((typeof value === "function" ? value(current === pathname) : value) ? pathname : null));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPath(null);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPath(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session) return null;
  const role = pick(ROLE_LABELS[session.role], language);

  return (
    <div className="adm-user" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="adm-user__button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t(`Nalog: ${session.displayName}, ${role}`, `Account: ${session.displayName}, ${role}`)}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="adm-user__avatar" aria-hidden="true">
          {initials(session.displayName)}
        </span>
        <span className="adm-user__who" aria-hidden="true">
          <span className="adm-user__name">{session.displayName}</span>
          <span className="adm-user__role">{role}</span>
        </span>
        <ChevronDown aria-hidden="true" strokeWidth={1.5} width={16} height={16} />
      </button>
      {open ? (
        <div className="adm-menu">
          <div className="adm-menu__head">
            <span className="adm-strong">{session.displayName}</span>
            <span className="adm-menu__email">{session.email}</span>
            <span className="adm-user__role">{t(`Uloga: ${role}`, `Role: ${role}`)}</span>
          </div>
          <button type="button" className="adm-menu__item" onClick={toggleTheme}>
            <MoonStar aria-hidden="true" strokeWidth={1.5} />
            <span>{t("Prikaz", "Theme")}</span>
            <span className="adm-menu__value">{theme === "dark" ? t("Tinta", "Ink") : t("Papir", "Paper")}</span>
          </button>
          <button type="button" className="adm-menu__item" onClick={() => setLanguage(language === "en" ? "sr" : "en")}>
            <Languages aria-hidden="true" strokeWidth={1.5} />
            <span>{t("Jezik", "Language")}</span>
            <span className="adm-menu__value">{language === "en" ? "English" : "Srpski"}</span>
          </button>
          <Link href="/admin/podesavanja/korisnici" className="adm-menu__item">
            <KeyRound aria-hidden="true" strokeWidth={1.5} />
            <span>{t("Promeni lozinku", "Change password")}</span>
          </Link>
          <a href="/" target="_blank" rel="noopener" className="adm-menu__item">
            <ExternalLink aria-hidden="true" strokeWidth={1.5} />
            <span>{t("Otvori sajt", "Open the site")}</span>
          </a>
          <div className="adm-menu__sep" role="separator" />
          <button type="button" className="adm-menu__item" onClick={onSignOut}>
            <LogOut aria-hidden="true" strokeWidth={1.5} />
            <span>{t("Odjavi se", "Sign out")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminTopbar({ onOpenMenu, onOpenPalette, onSignOut }: { onOpenMenu: () => void; onOpenPalette: () => void; onSignOut: () => void }) {
  const { t, language } = useAdminT();
  const pathname = usePathname();
  const item = navItemForPath(pathname);
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false
  );

  return (
    <header className="adm-top">
      <IconButton className="adm-top__menu" label={t("Otvori meni", "Open menu")} onClick={onOpenMenu}>
        <Menu aria-hidden="true" strokeWidth={1.5} />
      </IconButton>
      <Link href="/admin" className="adm-top__brand">
        <AdminLogo />
      </Link>
      <h1 className="adm-top__title">{item ? pick(item.label, language) : t("Administracija", "Administration")}</h1>
      <button type="button" className="adm-search-trigger" onClick={onOpenPalette} aria-keyshortcuts="Control+K Meta+K">
        <Search aria-hidden="true" strokeWidth={1.5} />
        <span>{t("Pretražite ili pokrenite komandu…", "Search or run a command…")}</span>
        <span className="adm-kbd" aria-hidden="true">
          {mac ? "⌘" : "Ctrl"} K
        </span>
      </button>
      <IconButton className="adm-top__search-icon" label={t("Pretraga i komande", "Search and commands")} onClick={onOpenPalette}>
        <Search aria-hidden="true" strokeWidth={1.5} />
      </IconButton>
      <UserMenu onSignOut={onSignOut} />
    </header>
  );
}
