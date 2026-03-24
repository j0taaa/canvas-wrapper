export type ThemePreference = "system" | "light" | "dark";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const THEME_PREFERENCE_STORAGE_KEY = "canvasThemePreference";
export const THEME_PREFERENCE_COOKIE = "canvasThemePreference";
export const THEME_PREFERENCE_EVENT = "canvas-theme-preference-changed";
export const LIGHT_THEME_SURFACE = "#ffffff";
export const DARK_THEME_SURFACE = "#10141c";

export function parseThemePreference(value?: string | null): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function readThemePreference() {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCE;
  }

  return parseThemePreference(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY));
}

export function resolveTheme(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return preference === "dark" ? "dark" : "light";
  }

  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
}

export function getThemeSurfaceColor(theme: "light" | "dark") {
  return theme === "dark" ? DARK_THEME_SURFACE : LIGHT_THEME_SURFACE;
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return;
  }

  const root = window.document.documentElement;
  const resolvedTheme = resolveTheme(preference);
  const themeSurfaceColor = getThemeSurfaceColor(resolvedTheme);

  root.dataset.themePreference = preference;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
  root.style.backgroundColor = themeSurfaceColor;

  if (window.document.body) {
    window.document.body.style.colorScheme = resolvedTheme;
    window.document.body.style.backgroundColor = themeSurfaceColor;
  }

  window.document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((metaTag) => metaTag.setAttribute("content", themeSurfaceColor));
}

export function writeThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  document.cookie = `${THEME_PREFERENCE_COOKIE}=${encodeURIComponent(preference)}; path=/; max-age=31536000; samesite=lax`;
  applyThemePreference(preference);
  window.dispatchEvent(new CustomEvent(THEME_PREFERENCE_EVENT));
}
