import { createElement, createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export type SiteSettings = {
  workingHours: string;
  address: string;
  phone: string;
  email: string;
  instagramUrl: string;
  licenseNumber: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
};

/**
 * No hardcoded business data: contact details come only from Convex `settings`.
 * Empty values mean "not set yet" — the UI hides the row or shows a neutral
 * fallback (`dictionary.contact.detailsPending`), never placeholder values.
 */
export const SETTINGS_DEFAULTS: SiteSettings = {
  workingHours: "",
  address: "",
  phone: "",
  email: "",
  instagramUrl: "",
  licenseNumber: "",
  facebookUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
};

export const hasContactDetails = (settings: SiteSettings) =>
  Boolean(settings.address || settings.phone || settings.email || settings.workingHours);

export const toPhoneHref = (phone: string) => {
  const digits = phone.replace(/[^+\d]/g, "");
  return digits ? `tel:${digits}` : "";
};

const SettingsContext = createContext<SiteSettings>(SETTINGS_DEFAULTS);

/**
 * Must be rendered inside ConvexProvider.
 * Reads settings from Convex and provides them via context.
 * When Convex is not configured, the context default (SETTINGS_DEFAULTS) is used.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const data = useQuery(api.settings.get);

  const settings = useMemo<SiteSettings>(() => {
    if (!data) return SETTINGS_DEFAULTS;
    return {
      workingHours: data.workingHours.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      instagramUrl: data.instagramUrl.trim(),
      licenseNumber: (data.licenseNumber ?? "").trim(),
      facebookUrl: (data.facebookUrl ?? "").trim(),
      tiktokUrl: (data.tiktokUrl ?? "").trim(),
      youtubeUrl: (data.youtubeUrl ?? "").trim(),
    };
  }, [data]);

  return createElement(SettingsContext.Provider, { value: settings }, children);
}

/**
 * Safe to call anywhere — reads from context, falls back to SETTINGS_DEFAULTS.
 * Does NOT call useQuery, so it works outside ConvexProvider too.
 */
export const useSettings = (): SiteSettings => useContext(SettingsContext);
