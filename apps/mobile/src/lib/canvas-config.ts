import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { normalizeCanvasProviderUrl } from "@canvas/shared";

export const CANVAS_API_KEY_STORAGE = "canvasApiKey";
export const CANVAS_API_BASE_STORAGE = "canvasApiBase";

export type StoredCanvasConfig = {
  apiBase: string;
  apiKey: string;
};

async function readLegacyCanvasConfig(): Promise<StoredCanvasConfig | null> {
  const [apiKey, apiBase] = await Promise.all([
    AsyncStorage.getItem(CANVAS_API_KEY_STORAGE),
    AsyncStorage.getItem(CANVAS_API_BASE_STORAGE),
  ]);

  const trimmedApiKey = apiKey?.trim() ?? "";

  if (!trimmedApiKey) {
    return null;
  }

  return {
    apiBase: normalizeCanvasProviderUrl(apiBase),
    apiKey: trimmedApiKey,
  };
}

async function writeSecureCanvasConfig(config: StoredCanvasConfig) {
  await Promise.all([
    SecureStore.setItemAsync(CANVAS_API_KEY_STORAGE, config.apiKey),
    SecureStore.setItemAsync(CANVAS_API_BASE_STORAGE, config.apiBase),
  ]);
}

export async function getStoredCanvasConfig(): Promise<StoredCanvasConfig | null> {
  const [apiKey, apiBase] = await Promise.all([
    SecureStore.getItemAsync(CANVAS_API_KEY_STORAGE),
    SecureStore.getItemAsync(CANVAS_API_BASE_STORAGE),
  ]);

  const trimmedApiKey = apiKey?.trim() ?? "";

  if (trimmedApiKey) {
    return {
      apiBase: normalizeCanvasProviderUrl(apiBase),
      apiKey: trimmedApiKey,
    };
  }

  const legacyConfig = await readLegacyCanvasConfig();

  if (!legacyConfig) {
    return null;
  }

  await Promise.all([
    writeSecureCanvasConfig(legacyConfig),
    AsyncStorage.removeItem(CANVAS_API_KEY_STORAGE),
    AsyncStorage.removeItem(CANVAS_API_BASE_STORAGE),
  ]);

  return legacyConfig;
}

export async function saveCanvasConfig(input: { apiBase?: string | null; apiKey: string }) {
  const apiKey = input.apiKey.trim();

  if (!apiKey) {
    throw new Error("Missing Canvas API key");
  }

  const apiBase = normalizeCanvasProviderUrl(input.apiBase);

  await Promise.all([
    writeSecureCanvasConfig({
      apiBase,
      apiKey,
    }),
    AsyncStorage.removeItem(CANVAS_API_KEY_STORAGE),
    AsyncStorage.removeItem(CANVAS_API_BASE_STORAGE),
  ]);

  return {
    apiBase,
    apiKey,
  };
}

export async function clearCanvasConfig() {
  await Promise.all([
    SecureStore.deleteItemAsync(CANVAS_API_KEY_STORAGE),
    SecureStore.deleteItemAsync(CANVAS_API_BASE_STORAGE),
    AsyncStorage.removeItem(CANVAS_API_KEY_STORAGE),
    AsyncStorage.removeItem(CANVAS_API_BASE_STORAGE),
  ]);
}
