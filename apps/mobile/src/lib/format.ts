import {
  formatDate as formatLocalizedDate,
  formatDateTime as formatLocalizedDateTime,
  formatDueDateShort as formatLocalizedDueDateShort,
  formatGrade as formatLocalizedGrade,
  formatRelativeBucket as formatLocalizedRelativeBucket,
  type AppLocale,
} from "@canvas/shared";

function isLocale(value?: string | null): value is AppLocale {
  return value === "en" || value === "pt-BR";
}

export function formatDateTime(localeOrValue?: AppLocale | string | null, maybeValue?: string | null) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en";
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue;

  return formatLocalizedDateTime(locale, value);
}

export function formatDate(localeOrValue?: AppLocale | string | null, maybeValue?: string | null) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en";
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue;

  return formatLocalizedDate(locale, value);
}

export function formatRelativeBucket(localeOrValue?: AppLocale | string | null, maybeValue?: string | null) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en";
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue;

  return formatLocalizedRelativeBucket(locale, value);
}

export function stripHtml(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatGrade(localeOrValue?: AppLocale | number | null, maybeValue?: number | null) {
  const locale = typeof localeOrValue === "string" && isLocale(localeOrValue) ? localeOrValue : "en";
  const value = typeof localeOrValue === "string" && isLocale(localeOrValue) ? maybeValue : localeOrValue;

  return formatLocalizedGrade(locale, value as number | null | undefined);
}

export function formatDueDateShort(localeOrValue?: AppLocale | string | null, maybeValue?: string | null) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en";
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue;

  return formatLocalizedDueDateShort(locale, value);
}
