const DEFAULT_SITE_URL = "https://janvas.jaypussy.site";

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return DEFAULT_SITE_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function getSiteOrigin() {
  return new URL(getSiteUrl());
}
