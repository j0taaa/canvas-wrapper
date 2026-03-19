import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_DEVICE_INTEGRATION_PREFERENCES,
  DEFAULT_SUBJECT_PREFERENCES,
  DEFAULT_THEME_PREFERENCE,
  DEVICE_INTEGRATION_PREFERENCES_STORAGE_KEY,
  HAPTICS_PREFERENCE_STORAGE_KEY,
  SUBJECT_PREFERENCES_STORAGE_KEY,
  THEME_PREFERENCE_STORAGE_KEY,
  parseDeviceIntegrationPreferences,
  parseHapticsEnabled,
  parseSubjectPreferences,
  parseThemePreference,
  type DeviceIntegrationPreferences,
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

export async function readDeviceIntegrationPreferences() {
  return parseDeviceIntegrationPreferences(await AsyncStorage.getItem(DEVICE_INTEGRATION_PREFERENCES_STORAGE_KEY));
}

export async function writeDeviceIntegrationPreferences(preferences: DeviceIntegrationPreferences) {
  await AsyncStorage.setItem(DEVICE_INTEGRATION_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export async function readAllPreferences() {
  const [themePreference, hapticsEnabled, subjectPreferences, deviceIntegrationPreferences] = await Promise.all([
    readThemePreference(),
    readHapticsPreference(),
    readSubjectPreferences(),
    readDeviceIntegrationPreferences(),
  ]);

  return {
    deviceIntegrationPreferences,
    hapticsEnabled,
    subjectPreferences,
    themePreference,
  };
}

export const MOBILE_DEFAULT_THEME_PREFERENCE = DEFAULT_THEME_PREFERENCE;
export const MOBILE_DEFAULT_SUBJECT_PREFERENCES = DEFAULT_SUBJECT_PREFERENCES;
export const MOBILE_DEFAULT_DEVICE_INTEGRATION_PREFERENCES = DEFAULT_DEVICE_INTEGRATION_PREFERENCES;
