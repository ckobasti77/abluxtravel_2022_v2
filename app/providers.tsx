"use client";

import { useEffect, type ReactNode } from "react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { SitePreferencesProvider } from "../components/site-preferences-provider";
import { ToastProvider } from "../components/ui/toast";
import { SettingsProvider } from "../lib/use-settings";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// The old client-side session (localStorage) is no longer used for anything.
const LEGACY_SESSION_KEY = "abluxtravel2022_session";

function LegacySessionCleanup() {
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // Storage may be unavailable (private mode); nothing to clean then.
    }
  }, []);

  return null;
}

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <SitePreferencesProvider>
      <ConvexAuthNextjsProvider client={convex}>
        <LegacySessionCleanup />
        <SettingsProvider>
          <ToastProvider>{children}</ToastProvider>
        </SettingsProvider>
      </ConvexAuthNextjsProvider>
    </SitePreferencesProvider>
  );
}
