import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  DEFAULT_THEME_PREFERENCE,
  HAPTICS_PREFERENCE_STORAGE_KEY,
  SUBJECT_PREFERENCES_STORAGE_KEY,
  THEME_PREFERENCE_STORAGE_KEY,
  parseHapticsEnabled,
  parseSubjectPreferences,
  parseThemePreference,
  type SubjectPreferences,
  type ThemePreference,
} from "@canvas/shared";

export async function readThemePreference() {
  return parseThemePreference(await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY));
}

export async function writeThemePreference(preference: ThemePreference) {
  await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}

export async function readHapticsPreference() {
  return parseHapticsEnabled(await AsyncStorage.getItem(HAPTICS_PREFERENCE_STORAGE_KEY));
}

export async function writeHapticsPreference(enabled: boolean) {
  await AsyncStorage.setItem(HAPTICS_PREFERENCE_STORAGE_KEY, String(enabled));
}

export async function readSubjectPreferences() {
  return parseSubjectPreferences(await AsyncStorage.getItem(SUBJECT_PREFERENCES_STORAGE_KEY));
}

export async function writeSubjectPreferences(preferences: SubjectPreferences) {
  await AsyncStorage.setItem(SUBJECT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export async function readAllPreferences() {
  const [themePreference, hapticsEnabled, subjectPreferences] = await Promise.all([
    readThemePreference(),
    readHapticsPreference(),
    readSubjectPreferences(),
  ]);

  return {
    hapticsEnabled,
    subjectPreferences,
    themePreference,
  };
}

export const MOBILE_DEFAULT_THEME_PREFERENCE = DEFAULT_THEME_PREFERENCE;
export const MOBILE_DEFAULT_SUBJECT_PREFERENCES = DEFAULT_SUBJECT_PREFERENCES;
