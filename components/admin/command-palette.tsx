"use client";

// Ctrl+K / Cmd+K: jump to any screen, find an offer or a partner by name, or
// run a command. Results are grouped (Stranice, Ponude, Partneri, Komande);
// arrows move, Enter runs, Esc closes.
import { useQuery } from "convex/react";
import { ExternalLink, Handshake, Languages, LogOut, MoonStar, Play, Plus, Search, Ticket, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { api } from "../../convex/_generated/api";
import { useAdminT } from "../../lib/admin/format";
import { pick } from "../../lib/admin/labels";
import { ADMIN_NAV_ITEMS } from "../../lib/admin/nav";
import { useSession } from "../../lib/use-session";
import { useSitePreferences } from "../site-preferences-provider";
import { serbianPlural } from "@/lib/catalog/format";
import { AdminLogo } from "./admin-logo";

type Group = "pages" | "offers" | "partners" | "commands";

type PaletteItem = {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

/** Lowercase without diacritics, so "cenovnik" finds "Cenovnik" and "rucni" finds "Ručni". */
export function fold(value: string) {
  return value
    .toLocaleLowerCase("sr")
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function CommandPalette({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const { t, language } = useAdminT();
  const { toggleTheme, setLanguage, theme } = useSitePreferences();
  const router = useRouter();
  const session = useSession();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `palette-${useId().replace(/:/g, "")}`;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const offers = useQuery(
    api.offerAdmin.list,
    open && debounced.length >= 2 ? { q: debounced, paginationOpts: { numItems: 6, cursor: null } } : "skip"
  );
  const partners = useQuery(api.partners.adminList, open ? {} : "skip");

  const go = (href: string) => () => {
    router.push(href);
  };

  const items = useMemo<PaletteItem[]>(() => {
    const needle = fold(query.trim());
    const matches = (item: { label: string; hint?: string; keywords?: string }) =>
      !needle || fold(`${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`).includes(needle);

    const pages: PaletteItem[] = ADMIN_NAV_ITEMS.filter((item) => !item.ownerOnly || session?.isOwner).map((item) => ({
      id: `page-${item.key}`,
      group: "pages",
      label: pick(item.label, language),
      hint: pick(item.hint, language),
      icon: item.icon,
      keywords: item.keywords,
      run: go(item.href),
    }));

    const offerItems: PaletteItem[] = (offers?.page ?? []).map((offer) => ({
      id: `offer-${offer._id}`,
      group: "offers",
      label: offer.title,
      hint: [offer.kind === "ablux" ? "ABLux" : offer.organizerName, offer.place, offer.countryName].filter(Boolean).join(" · "),
      icon: Ticket,
      run: go(`/admin/ponude?ponuda=${offer._id}`),
    }));

    const partnerItems: PaletteItem[] = needle
      ? (partners ?? [])
          .filter((partner) => fold(`${partner.name} ${partner.slug}`).includes(needle))
          .slice(0, 5)
          .map((partner) => ({
            id: `partner-${partner.slug}`,
            group: "partners",
            label: partner.name,
            hint: t(`${partner.counts.active} ${serbianPlural(partner.counts.active, "aktivna ponuda", "aktivne ponude", "aktivnih ponuda")}`, `${partner.counts.active} active offers`),
            icon: Handshake,
            run: go(`/admin/partneri?partner=${partner.slug}`),
          }))
      : [];

    const commands: PaletteItem[] = [
      { id: "cmd-sync", group: "commands", label: t("Pokreni uvoz sada", "Run import now"), hint: t("Partneri i uvoz", "Partners and sync"), icon: Play, keywords: "sync sinhronizacija pokreni", run: go("/admin/partneri?pokreni=1") },
      { id: "cmd-manual", group: "commands", label: t("Unesi ponudu ručno", "Enter an offer manually"), hint: "Holiday Plus KM", icon: Plus, keywords: "rucni unos cenovnik pdf", run: go("/admin/partneri/rucni-unos?novo=1") },
      { id: "cmd-trip", group: "commands", label: t("Novi aranžman", "New package"), icon: Plus, keywords: "program putovanje", run: go("/admin/aranzmani") },
      { id: "cmd-site", group: "commands", label: t("Otvori sajt u novoj kartici", "Open the site in a new tab"), icon: ExternalLink, keywords: "sajt pocetna", run: () => window.open("/", "_blank", "noopener") },
      { id: "cmd-theme", group: "commands", label: theme === "dark" ? t("Prikaz: Papir (svetli)", "Theme: Paper (light)") : t("Prikaz: Tinta (tamni)", "Theme: Ink (dark)"), icon: MoonStar, keywords: "tema theme dark light papir tinta", run: toggleTheme },
      { id: "cmd-lang", group: "commands", label: language === "en" ? "Prebaci na srpski" : "Switch to English", icon: Languages, keywords: "jezik language", run: () => setLanguage(language === "en" ? "sr" : "en") },
      { id: "cmd-logout", group: "commands", label: t("Odjavi se", "Sign out"), icon: LogOut, keywords: "logout izlaz", run: onSignOut },
    ];

    return [...pages.filter(matches), ...offerItems, ...partnerItems, ...commands.filter(matches)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, offers, partners, language, theme, session?.isOwner]);

  const activeIndex = Math.min(active, Math.max(items.length - 1, 0));

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    // The open prop closes the dialog (effect above); its close event resets the query.
    onClose();
    item.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((activeIndex + 1) % Math.max(items.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((activeIndex - 1 + items.length) % Math.max(items.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(items[activeIndex]);
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  const groupLabel: Record<Group, string> = {
    pages: t("Stranice", "Pages"),
    offers: t("Ponude", "Offers"),
    partners: t("Partneri", "Partners"),
    commands: t("Komande", "Commands"),
  };

  let lastGroup: Group | null = null;
  const searching = debounced.length >= 2 && offers === undefined;

  return (
    <dialog
      ref={ref}
      className="adm-palette"
      aria-label={t("Pretraga i komande", "Search and commands")}
      onClose={() => {
        setQuery("");
        setActive(0);
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <div className="adm-palette__input-row">
        <Search aria-hidden="true" strokeWidth={1.5} />
        <input
          ref={inputRef}
          className="adm-palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${activeIndex}` : undefined}
          aria-autocomplete="list"
          placeholder={t("Pretražite ili pokrenite komandu…", "Search or run a command…")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <span className="adm-kbd" aria-hidden="true">
          Esc
        </span>
      </div>
      <div className="adm-palette__list" id={listId} role="listbox" aria-label={t("Rezultati", "Results")}>
        {items.length === 0 ? (
          <p className="adm-palette__empty">
            {searching
              ? t("Tražimo ponude…", "Searching offers…")
              : t("Nema rezultata. Probajte naziv ponude, mesta ili partnera.", "No results. Try an offer, place or partner name.")}
          </p>
        ) : (
          items.map((item, index) => {
            const header = item.group !== lastGroup ? (
              <p className="adm-palette__group" role="presentation" key={`${item.group}-head`}>
                {groupLabel[item.group]}
              </p>
            ) : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return [
              header,
              <div
                key={item.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className="adm-palette__item"
                onMouseMove={() => setActive(index)}
                onClick={() => run(item)}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} />
                <span className="adm-palette__label">
                  <strong>{item.label}</strong>
                  {item.hint ? <small>{item.hint}</small> : null}
                </span>
                {index === activeIndex ? (
                  <span className="adm-palette__hint" aria-hidden="true">
                    Enter
                  </span>
                ) : null}
              </div>,
            ];
          })
        )}
        {searching && items.length > 0 ? <p className="adm-palette__empty">{t("Tražimo ponude…", "Searching offers…")}</p> : null}
      </div>
      <div className="adm-palette__foot" aria-hidden="true">
        <span>
          <span className="adm-kbd">↑</span> <span className="adm-kbd">↓</span> {t("pomeranje", "move")}
        </span>
        <span>
          <span className="adm-kbd">Enter</span> {t("otvori", "open")}
        </span>
        <span>
          <span className="adm-kbd">Esc</span> {t("zatvori", "close")}
        </span>
        <AdminLogo className="adm-palette__logo" />
      </div>
    </dialog>
  );
}
