import {
  HAPTICS_PREFERENCE_COOKIE,
  HAPTICS_PREFERENCE_EVENT,
  HAPTICS_PREFERENCE_STORAGE_KEY,
  parseHapticsEnabled,
} from "@canvas/shared";

export {
  HAPTICS_PREFERENCE_COOKIE,
  HAPTICS_PREFERENCE_EVENT,
  HAPTICS_PREFERENCE_STORAGE_KEY,
};

export function readHapticsPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return parseHapticsEnabled(window.localStorage.getItem(HAPTICS_PREFERENCE_STORAGE_KEY));
}

export function writeHapticsPreference(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = String(enabled);

  window.localStorage.setItem(HAPTICS_PREFERENCE_STORAGE_KEY, serialized);
  document.cookie = `${HAPTICS_PREFERENCE_COOKIE}=${serialized}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(HAPTICS_PREFERENCE_EVENT));
}
