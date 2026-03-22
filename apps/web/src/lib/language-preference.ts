import {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCE_COOKIE,
  LANGUAGE_PREFERENCE_EVENT,
  LANGUAGE_PREFERENCE_STORAGE_KEY,
  parseAcceptLanguageHeader,
  parseLanguagePreference,
  resolveAppLocale,
  type AppLocale,
  type LanguagePreference,
} from "@canvas/shared";

export {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCE_COOKIE,
  LANGUAGE_PREFERENCE_EVENT,
  LANGUAGE_PREFERENCE_STORAGE_KEY,
};

export function readLanguagePreference() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE_PREFERENCE;
  }

  return parseLanguagePreference(window.localStorage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY));
}

export function resolveBrowserLocale(preference: LanguagePreference = readLanguagePreference()): AppLocale {
  if (typeof window === "undefined") {
    return resolveAppLocale(preference);
  }

  return resolveAppLocale(preference, [
    ...window.navigator.languages,
    window.navigator.language,
  ]);
}

export function resolveLocaleFromHeader(
  acceptLanguageHeader?: string | null,
  preference: LanguagePreference = DEFAULT_LANGUAGE_PREFERENCE,
) {
  return resolveAppLocale(preference, parseAcceptLanguageHeader(acceptLanguageHeader));
}

export function writeLanguagePreference(preference: LanguagePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, preference);
  document.cookie = `${LANGUAGE_PREFERENCE_COOKIE}=${encodeURIComponent(preference)}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = resolveBrowserLocale(preference);
  window.dispatchEvent(new CustomEvent(LANGUAGE_PREFERENCE_EVENT));
}
