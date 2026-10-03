"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAdminT } from "../../lib/admin/format";
import { useSessionState } from "../../lib/use-session";
import { useSitePreferences } from "../site-preferences-provider";
import AdminAccessDenied from "./admin-access-denied";
import { AdminLogo } from "./admin-logo";
import { AdminDrawer, AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import CommandPalette from "./command-palette";

const COLLAPSE_KEY = "ablux_admin_sidebar";

type AdminFrameProps = {
  children: ReactNode;
};

// Client-side counterpart of the server guard in app/admin/layout.tsx: it
// reacts to sign-out and session expiry without a reload. Screens are only
// mounted for verified staff, so their admin queries always run authenticated.
// Shell (step 13): sidebar (collapsible; drawer on phones), top bar with the
// page title, command palette (Ctrl+K) and the user menu.
export default function AdminFrame({ children }: AdminFrameProps) {
  const { dictionary } = useSitePreferences();
  const { t } = useAdminT();
  const { status, session } = useSessionState();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    try {
      // Read after hydration on purpose: the server cannot know the stored value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage unavailable: keep the sidebar open.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {
        // ignore
      }
      return !value;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = async () => {
    // Unmount the screens first so no admin query runs without a session.
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace("/auth?mode=signin");
      router.refresh();
    }
  };

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  if (signingOut || status === "loading") {
    return (
      <div className="adm" data-mode="operate">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-base text-fg-muted" role="status" aria-live="polite">
          <AdminLogo className="adm-logo--large" priority />
          <span>{signingOut ? dictionary.admin.signingOut : dictionary.admin.checkingAccess}</span>
        </div>
      </div>
    );
  }

  if (status === "anonymous" || !session) {
    return <AdminAccessDenied variant="expired" />;
  }

  if (!session.isStaff) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="adm" data-mode="operate" data-collapsed={collapsed ? "true" : "false"}>
      <a className="adm-skip" href="#adm-main">
        {t("Preskoči na sadržaj", "Skip to content")}
      </a>
      <AdminSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} onSignOut={handleSignOut} />
      <AdminDrawer open={drawerOpen} onClose={closeDrawer} onSignOut={handleSignOut} />
      <div className="adm-body">
        <AdminTopbar onOpenMenu={() => setDrawerOpen(true)} onOpenPalette={() => setPaletteOpen(true)} onSignOut={handleSignOut} />
        <main className="adm-main" id="adm-main" tabIndex={-1}>
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} onSignOut={handleSignOut} />
    </div>
  );
}
