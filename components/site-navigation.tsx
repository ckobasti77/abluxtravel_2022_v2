"use client";

import { ChevronDown, Menu, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useSession } from "../lib/use-session";
import { parseTripSearchParams, type TripSearchParams } from "../lib/search/trip-search";
import { useSitePreferences } from "./site-preferences-provider";
import CartButton from "./cart-button";
import { MegaMenu } from "./chrome/mega-menu";
import { MobileMenu, type MobileMenuLink } from "./chrome/mobile-menu";
import { LanguageSwitch, ThemeToggle } from "./chrome/nav-controls";
import { SearchDialog } from "./search/search-dialog";
import { StickySearchPill } from "./search/sticky-search-pill";
import { cn } from "./ui/cn";

const MEGA_ID = "snav-mega-ponude";
/** Scroll distance (px) that counts as a direction change for hide-on-scroll. */
const HIDE_THRESHOLD = 8;
/** Elements that count as a dark page hero (the nav is transparent over them). */
const HERO_SELECTOR = ".ablux-hero, [data-page-hero]";

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const OFFER_PATHS = ["/ponude", "/aranzmani", "/putovanja", "/destinacije", "/zemlje"];

/**
 * Global navigation ("putni dnevnik"): transparent over a dark hero, then paper
 * (Papir) or ink (Tinta) at 82% with a 12px blur. Desktop: Ponude mega menu,
 * links, search, SR/EN, theme, cart (only with items), account. Phones: 60px
 * bar with search, cart and the full-screen ink menu.
 */
export default function SiteNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const { signOut } = useAuthActions();
  const { dictionary } = useSitePreferences();
  const copy = dictionary.chrome;

  const [scrolled, setScrolled] = useState(false);
  // The homepage starts over its hero (also on the server), so the bar never flashes solid.
  const [overHero, setOverHero] = useState(pathname === "/");
  const [pastHero, setPastHero] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitial, setSearchInitial] = useState<TripSearchParams>({});
  // Instagram-style: scrolling down slides the bar away, scrolling up brings it back.
  const [scrollHidden, setScrollHidden] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const megaButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll state: over the hero, scrolled, and hero passed (shows the search pill).
  useEffect(() => {
    let frame = 0;
    let lastY = window.scrollY;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      const nearTop = y < (headerRef.current?.offsetHeight ?? 64) * 2;
      if (nearTop || reducedMotion.matches) {
        setScrollHidden(false);
        lastY = y;
      } else if (Math.abs(delta) >= HIDE_THRESHOLD) {
        setScrollHidden(delta > 0);
        lastY = y;
      }
      const hero = document.querySelector<HTMLElement>(HERO_SELECTOR);
      const barHeight = headerRef.current?.querySelector<HTMLElement>(".snav__bar")?.offsetHeight ?? 64;
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
      setScrolled(window.scrollY > 8);
      setOverHero(Boolean(hero) && heroBottom > barHeight);
      setPastHero(Boolean(hero) && heroBottom <= barHeight);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  // Mega menu: Esc and outside click close it; Esc returns focus to "Ponude".
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMegaOpen(false);
        megaButtonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [megaOpen]);

  const openSearch = useCallback(() => {
    setMegaOpen(false);
    setSearchInitial(parseTripSearchParams(new URLSearchParams(window.location.search)));
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeMega = useCallback(() => setMegaOpen(false), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    if (pathname.startsWith("/admin")) {
      router.push("/auth?mode=signin");
      return;
    }
    router.refresh();
  };

  if (pathname.startsWith("/admin")) return null;

  const links: MobileMenuLink[] = [
    { key: "religious", href: "/verski-turizam", label: copy.religious },
    { key: "rentBus", href: "/iznajmljivanje-vozila", label: copy.rentBus },
    { key: "about", href: "/o-nama", label: copy.about },
    { key: "contact", href: "/kontakt", label: copy.contact },
  ].map((link) => ({ ...link, active: isActivePath(pathname, link.href) }));
  const offersActive = OFFER_PATHS.some((path) => isActivePath(pathname, path));
  // Transparent only over the hero before scrolling; paper/ink bar after that.
  const onInk = overHero && !scrolled && !megaOpen;
  // Never hidden while a menu or the search dialog is open, or while focus is inside the bar.
  const navHidden = scrollHidden && !megaOpen && !mobileOpen && !searchOpen && !focusInside;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "snav",
          onInk ? "snav--hero" : "snav--solid",
          scrolled && "snav--scrolled",
          megaOpen && "snav--mega-open",
          navHidden && "snav--hidden",
        )}
        // Keyboard focus only: a mouse click on a link or button must not pin the bar.
        onFocus={(event) => setFocusInside((event.target as HTMLElement).matches(":focus-visible"))}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
        }}
      >
        <div className="snav__bar">
          <div className="snav__inner">
            <Link href="/" className="snav__brand" aria-label={`ABLux Travel · ${copy.home}`}>
              {/* Paper and ink versions; CSS shows the one that fits the bar (theme, hero). */}
              <Image src="/logo-light.avif" alt="" width={301} height={318} className="snav__logo snav__logo--paper" priority />
              <Image src="/logo-dark.avif" alt="" width={500} height={500} className="snav__logo snav__logo--ink" priority />
              <span className="snav__wordmark" aria-hidden="true">
                <strong>ABlux</strong>
                <small>Travel</small>
              </span>
            </Link>

            <nav className="snav__nav" aria-label={copy.mainNav}>
              <ul className="snav__links">
                <li>
                  <button
                    ref={megaButtonRef}
                    type="button"
                    className="snav__link"
                    aria-expanded={megaOpen}
                    aria-controls={MEGA_ID}
                    data-active={offersActive || undefined}
                    onClick={() => setMegaOpen((value) => !value)}
                  >
                    {copy.offers}
                    <ChevronDown className="snav__chevron" aria-hidden="true" strokeWidth={1.75} />
                  </button>
                </li>
                {links.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="snav__link" aria-current={link.active ? "page" : undefined}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="snav__utils">
              <button type="button" className="snav__icon" onClick={openSearch} aria-label={copy.searchOpen} aria-haspopup="dialog">
                <Search aria-hidden="true" strokeWidth={1.5} />
              </button>
              <LanguageSwitch className="snav__desktop-only" />
              <ThemeToggle className="snav__desktop-only" />
              <CartButton />
              {session?.isStaff ? (
                <Link href="/admin" className="snav__account snav__desktop-only">
                  {copy.admin}
                </Link>
              ) : null}
              {session ? (
                <button type="button" className="snav__account snav__desktop-only" onClick={() => void handleSignOut()}>
                  {copy.signOut}
                </button>
              ) : (
                <Link href="/auth" className="snav__account snav__desktop-only">
                  {copy.signIn}
                </Link>
              )}
              <button
                type="button"
                className="snav__icon snav__menu-btn"
                onClick={() => setMobileOpen(true)}
                aria-label={copy.openMenu}
                aria-haspopup="dialog"
              >
                <Menu aria-hidden="true" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
        <MegaMenu id={MEGA_ID} open={megaOpen} onClose={closeMega} />
      </header>

      <StickySearchPill visible={pastHero && !searchOpen} docked={navHidden} onOpen={openSearch} />
      <SearchDialog open={searchOpen} onClose={closeSearch} initial={searchInitial} />
      <MobileMenu
        open={mobileOpen}
        onClose={closeMobile}
        links={links}
        offersActive={offersActive}
        onSearch={openSearch}
        isSignedIn={Boolean(session)}
        isStaff={Boolean(session?.isStaff)}
        onSignOut={() => void handleSignOut()}
      />
    </>
  );
}
