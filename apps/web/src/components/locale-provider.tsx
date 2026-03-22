"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  t,
  type AppLocale,
  type LanguagePreference,
} from "@canvas/shared";
import {
  LANGUAGE_PREFERENCE_EVENT,
  readLanguagePreference,
  resolveBrowserLocale,
  writeLanguagePreference,
} from "@/lib/language-preference";

type LocaleContextValue = {
  languagePreference: LanguagePreference;
  resolvedLocale: AppLocale;
  setLanguagePreference: (preference: LanguagePreference) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLanguagePreference,
  initialResolvedLocale,
}: {
  children: ReactNode;
  initialLanguagePreference: LanguagePreference;
  initialResolvedLocale: AppLocale;
}) {
  const [languagePreference, setLanguagePreferenceState] = useState(initialLanguagePreference);
  const [resolvedLocale, setResolvedLocale] = useState(initialResolvedLocale);

  useEffect(() => {
    const sync = () => {
      const nextPreference = readLanguagePreference();
      setLanguagePreferenceState(nextPreference);
      setResolvedLocale(resolveBrowserLocale(nextPreference));
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(LANGUAGE_PREFERENCE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LANGUAGE_PREFERENCE_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = resolvedLocale;
  }, [resolvedLocale]);

  const value = useMemo<LocaleContextValue>(() => ({
    languagePreference,
    resolvedLocale,
    setLanguagePreference: (preference: LanguagePreference) => {
      writeLanguagePreference(preference);
      setLanguagePreferenceState(preference);
      setResolvedLocale(resolveBrowserLocale(preference));
    },
  }), [languagePreference, resolvedLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}

export function useTranslate() {
  const { resolvedLocale } = useLocale();

  return (key: Parameters<typeof t>[1], params?: Parameters<typeof t>[2]) => t(resolvedLocale, key, params);
}
