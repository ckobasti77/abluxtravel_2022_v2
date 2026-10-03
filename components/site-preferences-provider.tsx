"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DICTIONARY,
  type Language,
  type SiteDictionary,
  type ThemeMode,
} from "../lib/i18n";

const LANGUAGE_KEY = "ablux_language";
const THEME_KEY = "ablux_theme";
const DEFAULT_LANGUAGE: Language = "sr";
// "Papir" (light) is the default theme; "Tinta" (dark) only when the user picks it.
const DEFAULT_THEME: ThemeMode = "light";

type SitePreferencesContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  dictionary: SiteDictionary;
};

const SitePreferencesContext = createContext<SitePreferencesContextValue | null>(
  null
);

const isLanguage = (value: string | null | undefined): value is Language =>
  value === "sr" || value === "en";

const isTheme = (value: string | null | undefined): value is ThemeMode =>
  value === "light" || value === "dark";

const listeners = new Set<() => void>();

const notifyPreferenceListeners = () => {
  listeners.forEach((listener) => listener());
};

const subscribeToPreferences = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

const getLanguageSnapshot = (): Language => {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
  if (isLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return navigator.language.toLowerCase().startsWith("sr")
    ? "sr"
    : "en";
};

// The blocking script in app/layout.tsx sets data-theme before paint, so the
// attribute is the source of truth on the client; storage is the fallback.
const getThemeSnapshot = (): ThemeMode => {
  const attrTheme = document.documentElement.dataset.theme;
  if (isTheme(attrTheme)) {
    return attrTheme;
  }

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  if (isTheme(storedTheme)) {
    return storedTheme;
  }

  return DEFAULT_THEME;
};

const getServerLanguageSnapshot = () => DEFAULT_LANGUAGE;
const getServerThemeSnapshot = () => DEFAULT_THEME;

const applyLanguageAttribute = (language: Language) => {
  document.documentElement.lang = language === "sr" ? "sr-Latn" : "en";
};

// Preferences are persisted only when the user changes them. Effects never
// write storage: during hydration they would see the server snapshot and
// overwrite the stored choice.
const setLanguagePreference = (language: Language) => {
  applyLanguageAttribute(language);
  window.localStorage.setItem(LANGUAGE_KEY, language);
  notifyPreferenceListeners();
};

const setThemePreference = (theme: ThemeMode) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
  notifyPreferenceListeners();
};

type SitePreferencesProviderProps = {
  children: ReactNode;
};

export function SitePreferencesProvider({ children }: SitePreferencesProviderProps) {
  const language = useSyncExternalStore(
    subscribeToPreferences,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  useEffect(() => {
    applyLanguageAttribute(language);
  }, [language]);

  const value = useMemo<SitePreferencesContextValue>(
    () => ({
      language,
      setLanguage: setLanguagePreference,
      theme,
      setTheme: setThemePreference,
      toggleTheme: () =>
        setThemePreference(theme === "dark" ? "light" : "dark"),
      dictionary: DICTIONARY[language],
    }),
    [language, theme]
  );

  return (
    <SitePreferencesContext.Provider value={value}>
      {children}
    </SitePreferencesContext.Provider>
  );
}

export const useSitePreferences = () => {
  const context = useContext(SitePreferencesContext);
  if (!context) {
    throw new Error("useSitePreferences must be used within SitePreferencesProvider");
  }
  return context;
};
