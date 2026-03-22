import { cookies, headers } from "next/headers";
import {
  parseLanguagePreference,
  type LanguagePreference,
} from "@canvas/shared";
import { LANGUAGE_PREFERENCE_COOKIE, resolveLocaleFromHeader } from "./language-preference";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const languagePreference = parseLanguagePreference(cookieStore.get(LANGUAGE_PREFERENCE_COOKIE)?.value);

  return {
    languagePreference,
    resolvedLocale: resolveLocaleFromHeader(headerStore.get("accept-language"), languagePreference),
  };
}

export async function getRequestLanguagePreference(): Promise<LanguagePreference> {
  const cookieStore = await cookies();
  return parseLanguagePreference(cookieStore.get(LANGUAGE_PREFERENCE_COOKIE)?.value);
}
