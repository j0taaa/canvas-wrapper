"use client";

import { useEffect } from "react";
import {
  applyThemePreference,
  parseThemePreference,
  readThemePreference,
  THEME_PREFERENCE_EVENT,
  type ThemePreference,
} from "@/lib/theme-preference";

type ThemeSyncProps = {
  initialPreference: ThemePreference;
};

export function ThemeSync({ initialPreference }: ThemeSyncProps) {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => applyThemePreference(parseThemePreference(readThemePreference() ?? initialPreference));

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);
    window.addEventListener("storage", syncTheme);
    window.addEventListener(THEME_PREFERENCE_EVENT, syncTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(THEME_PREFERENCE_EVENT, syncTheme);
    };
  }, [initialPreference]);

  return null;
}
