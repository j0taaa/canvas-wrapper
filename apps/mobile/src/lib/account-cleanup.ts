import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { BOOKMARKS_STORAGE_KEY } from "@canvas/shared";
import { clearManagedDeviceIntegrations } from "./device-integration-sync";
import { QUERY_CACHE_PERSIST_KEY, asyncStoragePersister, queryClient } from "./query-client";

const LEGACY_QUERY_CACHE_PERSIST_KEY = "canvasQueryCache";
const MANAGED_FILE_PREFIX = "canvas-file-";

async function clearDownloadedCanvasFiles() {
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!baseDirectory) {
    return;
  }

  const entries = await FileSystem.readDirectoryAsync(baseDirectory).catch(() => []);

  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(MANAGED_FILE_PREFIX))
      .map((entry) =>
        FileSystem.deleteAsync(`${baseDirectory}${entry}`, { idempotent: true }).catch(() => {
          // Ignore cleanup failures for stale files.
        }),
      ),
  );
}

export async function clearLocalAccountData() {
  await clearManagedDeviceIntegrations();
  queryClient.clear();

  await Promise.all([
    asyncStoragePersister.removeClient(),
    AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY),
    AsyncStorage.removeItem(LEGACY_QUERY_CACHE_PERSIST_KEY),
    AsyncStorage.removeItem(QUERY_CACHE_PERSIST_KEY),
    clearDownloadedCanvasFiles(),
  ]);
}
