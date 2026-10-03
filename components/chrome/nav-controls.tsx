"use client";

import { Moon, Sun } from "lucide-react";
import { useSitePreferences } from "../site-preferences-provider";
import { cn } from "../ui/cn";

/** SR | EN switch. Buttons with aria-pressed; 44px targets. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { language, setLanguage, dictionary } = useSitePreferences();
  return (
    <div className={cn("snav-lang", className)} role="group" aria-label={dictionary.chrome.language}>
      {(["sr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          lang={code === "sr" ? "sr-Latn" : "en"}
          className="snav-lang__btn"
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Papir / Tinta toggle. The label names the theme it switches to. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, dictionary } = useSitePreferences();
  const label = theme === "dark" ? dictionary.chrome.themeToLight : dictionary.chrome.themeToDark;
  return (
    <button type="button" className={cn("snav__icon", className)} onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "dark" ? <Sun aria-hidden="true" strokeWidth={1.5} /> : <Moon aria-hidden="true" strokeWidth={1.5} />}
    </button>
  );
}
