"use client";

import { Mail, MessageCircle, Phone, X } from "lucide-react";
import { InstagramGlyph } from "./ui/brand-glyphs";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toPhoneHref, useSettings } from "../lib/use-settings";
import { useSitePreferences } from "./site-preferences-provider";
import { cn } from "./ui/cn";

/** Search bars the button must never cover on phones (hero booking bar, inline search). */
const SEARCH_BAR_SELECTOR = ".ablux-booking, .tsearch--bar";

/**
 * Quick contact button (bottom right). Channels come only from `settings`;
 * with none set it is not rendered. On phones it steps aside while a search
 * bar is on screen so it never covers the search.
 */
export default function QuickActions() {
  const pathname = usePathname();
  const settings = useSettings();
  const { dictionary } = useSitePreferences();
  const copy = dictionary.chrome;
  const [open, setOpen] = useState(false);
  const [searchInView, setSearchInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const phoneHref = toPhoneHref(settings.phone);
  const actions: { key: string; href: string; label: string; icon: ReactNode; external: boolean }[] = [
    { key: "phone", href: phoneHref, label: copy.fabCall, icon: <Phone strokeWidth={1.5} />, external: false },
    { key: "email", href: settings.email ? `mailto:${settings.email}` : "", label: copy.fabEmail, icon: <Mail strokeWidth={1.5} />, external: false },
    { key: "instagram", href: settings.instagramUrl, label: copy.fabInstagram, icon: <InstagramGlyph />, external: true },
  ].filter((action) => Boolean(action.href));

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Track search bars in view (CSS hides the button only on phones).
  useEffect(() => {
    const bars = Array.from(document.querySelectorAll(SEARCH_BAR_SELECTOR));
    if (bars.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setSearchInView(visible.size > 0);
    });
    bars.forEach((bar) => observer.observe(bar));
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/dev")) return null;
  if (actions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn("qfab", open && "qfab--open", searchInView && !open && "qfab--yield")}
      role="group"
      aria-label={copy.fabGroup}
    >
      <ul className="qfab__tray" id="qfab-tray" hidden={!open}>
        {actions.map((action) => (
          <li key={action.key}>
            <a
              href={action.href}
              target={action.external ? "_blank" : undefined}
              rel={action.external ? "noopener noreferrer" : undefined}
              className="qfab__action"
            >
              <span className="qfab__action-icon" aria-hidden="true">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="qfab__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="qfab-tray"
        aria-label={open ? copy.fabClose : copy.fabToggle}
      >
        {open ? <X aria-hidden="true" strokeWidth={1.5} /> : <MessageCircle aria-hidden="true" strokeWidth={1.5} />}
      </button>
    </div>
  );
}
