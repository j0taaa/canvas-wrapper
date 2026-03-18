import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeCanvasProviderUrl } from "@canvas/shared";

export const CANVAS_API_KEY_STORAGE = "canvasApiKey";
export const CANVAS_API_BASE_STORAGE = "canvasApiBase";

export type StoredCanvasConfig = {
  apiBase: string;
  apiKey: string;
};

export async function getStoredCanvasConfig(): Promise<StoredCanvasConfig | null> {
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

export async function saveCanvasConfig(input: { apiBase?: string | null; apiKey: string }) {
  const apiKey = input.apiKey.trim();

  if (!apiKey) {
    throw new Error("Missing Canvas API key");
  }

  const apiBase = normalizeCanvasProviderUrl(input.apiBase);

  await Promise.all([
    AsyncStorage.setItem(CANVAS_API_KEY_STORAGE, apiKey),
    AsyncStorage.setItem(CANVAS_API_BASE_STORAGE, apiBase),
  ]);

  return {
    apiBase,
    apiKey,
  };
}

export async function clearCanvasConfig() {
  await Promise.all([
    AsyncStorage.removeItem(CANVAS_API_KEY_STORAGE),
    AsyncStorage.removeItem(CANVAS_API_BASE_STORAGE),
  ]);
}
