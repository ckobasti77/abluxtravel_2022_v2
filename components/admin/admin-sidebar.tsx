"use client";

import { useQuery } from "convex/react";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { useAdminT } from "../../lib/admin/format";
import { ADMIN_NAV, navItemForPath } from "../../lib/admin/nav";
import { pick } from "../../lib/admin/labels";
import { useSession } from "../../lib/use-session";
import { IconButton } from "../ui";
import { AdminLogo } from "./admin-logo";
import { serbianPlural } from "@/lib/catalog/format";

type NavProps = {
  onSignOut: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  /** Drawer variant: shows a close button instead of the collapse toggle. */
  onClose?: () => void;
};

/** Sidebar navigation (desktop column and mobile drawer share it). */
function AdminNav({ onSignOut, collapsed = false, onToggleCollapsed, onNavigate, onClose }: NavProps) {
  const { t, language } = useAdminT();
  const pathname = usePathname();
  const session = useSession();
  const newCount = useQuery(api.inbox.newCount, {});
  const activeKey = navItemForPath(pathname)?.key;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fade the edge that has more to scroll (the scrollbar itself is hidden).
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const update = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const start = scroller.scrollTop > 1;
      const end = scroller.scrollTop < max - 1;
      const fade = start && end ? "both" : start ? "start" : end ? "end" : "";
      if (fade) scroller.dataset.fade = fade;
      else delete scroller.dataset.fade;
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    for (const child of scroller.children) observer.observe(child);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [session?.isOwner]);

  return (
    <nav className="adm-nav" aria-label={t("Administracija", "Administration")}>
      <div className="adm-brand">
        <Link href="/admin" className="adm-brand__link" onClick={onNavigate}>
          <AdminLogo className="adm-brand__logo" priority />
          <span className="adm-brand__name">
            <span className="adm-brand__sub">{t("Administracija", "Administration")}</span>
          </span>
        </Link>
        {onClose ? (
          <IconButton label={t("Zatvori meni", "Close menu")} onClick={onClose}>
            <X aria-hidden="true" strokeWidth={1.5} />
          </IconButton>
        ) : null}
      </div>

      <div className="adm-nav__scroll" ref={scrollRef}>
        {ADMIN_NAV.map((group) => {
          const items = group.items.filter((item) => !item.ownerOnly || session?.isOwner);
          if (items.length === 0) return null;
          return (
            <div className="adm-nav__group" key={group.key}>
              {group.label ? <p className="adm-nav__label">{pick(group.label, language)}</p> : null}
              <ul className="adm-nav__list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const label = pick(item.label, language);
                  const badge = item.key === "upiti" && newCount ? newCount : 0;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className="adm-nav__link"
                        aria-current={activeKey === item.key ? "page" : undefined}
                        title={collapsed ? label : undefined}
                        onClick={onNavigate}
                      >
                        <Icon aria-hidden="true" strokeWidth={1.5} />
                        <span className="adm-nav__text">{label}</span>
                        {badge ? (
                          <span className="adm-nav__badge" aria-label={t(`${badge} ${serbianPlural(badge, "novi upit", "nova upita", "novih upita")}`, `${badge} new`)}>
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="adm-nav__foot">
        {onToggleCollapsed ? (
          <button type="button" className="adm-nav__link" onClick={onToggleCollapsed} aria-expanded={!collapsed} title={collapsed ? t("Proširi meni", "Expand menu") : undefined}>
            {collapsed ? <PanelLeftOpen aria-hidden="true" strokeWidth={1.5} /> : <PanelLeftClose aria-hidden="true" strokeWidth={1.5} />}
            <span className="adm-nav__text">{collapsed ? t("Proširi meni", "Expand menu") : t("Skupi meni", "Collapse menu")}</span>
          </button>
        ) : null}
        <button type="button" className="adm-nav__link" onClick={onSignOut} title={collapsed ? t("Odjavi se", "Sign out") : undefined} aria-label={collapsed ? t("Odjavi se", "Sign out") : undefined}>
          <LogOut aria-hidden="true" strokeWidth={1.5} />
          <span className="adm-nav__text">{t("Odjavi se", "Sign out")}</span>
        </button>
      </div>
    </nav>
  );
}

export function AdminSidebar({ collapsed, onToggleCollapsed, onSignOut }: { collapsed: boolean; onToggleCollapsed: () => void; onSignOut: () => void }) {
  return (
    <aside className="adm-side">
      <AdminNav collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} onSignOut={onSignOut} />
    </aside>
  );
}

/** Mobile drawer: native <dialog> (focus trap, Esc, inert page behind). */
export function AdminDrawer({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close after navigation.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <dialog
      ref={ref}
      className="adm-drawer"
      aria-label="Meni"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      {open ? <AdminNav onClose={() => ref.current?.close()} onSignOut={onSignOut} /> : null}
    </dialog>
  );
}
