import AsyncStorage from "@react-native-async-storage/async-storage";

const WEB_APP_URL_STORAGE_KEY = "canvasMobileWebAppUrl";

function withProtocol(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.)/i.test(value)) {
    return `http://${value}`;
  }

  return `https://${value}`;
}

export function normalizeWebAppUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  const normalizedUrl = new URL(withProtocol(trimmed));
  normalizedUrl.hash = "";
  normalizedUrl.search = "";

  return normalizedUrl.toString().replace(/\/+$/, "");
}

export function getDefaultWebAppUrl() {
  return normalizeWebAppUrl(process.env.EXPO_PUBLIC_WEB_APP_URL);
}

export async function getStoredWebAppUrl() {
  const storedUrl = await AsyncStorage.getItem(WEB_APP_URL_STORAGE_KEY);
  return normalizeWebAppUrl(storedUrl) || getDefaultWebAppUrl();
}

export async function saveWebAppUrl(value: string) {
  const normalizedUrl = normalizeWebAppUrl(value);

  if (!normalizedUrl) {
    throw new Error("Missing web app URL");
  }

  await AsyncStorage.setItem(WEB_APP_URL_STORAGE_KEY, normalizedUrl);

  return normalizedUrl;
}

export async function clearStoredWebAppUrl() {
  await AsyncStorage.removeItem(WEB_APP_URL_STORAGE_KEY);
}
