import * as Haptics from "expo-haptics";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  DEFAULT_DEVICE_INTEGRATION_PREFERENCES,
  type DeviceIntegrationPreferences,
  type SubjectPreferences,
  type ThemePreference,
} from "@canvas/shared";
import {
  readAllPreferences,
  writeDeviceIntegrationPreferences,
  writeHapticsPreference,
  writeSubjectPreferences,
  writeThemePreference,
} from "../lib/preferences";

type AppPreferencesValue = {
  deviceIntegrationPreferences: DeviceIntegrationPreferences;
  hapticsEnabled: boolean;
  ready: boolean;
  resolvedTheme: "light" | "dark";
  subjectPreferences: SubjectPreferences;
  themePreference: ThemePreference;
  triggerSelectionHaptic: () => void;
  updateDeviceIntegrationPreferences: (preferences: DeviceIntegrationPreferences) => Promise<void>;
  updateHapticsEnabled: (enabled: boolean) => Promise<void>;
  updateSubjectPreferences: (preferences: SubjectPreferences) => Promise<void>;
  updateThemePreference: (preference: ThemePreference) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const [deviceIntegrationPreferences, setDeviceIntegrationPreferences] =
    useState<DeviceIntegrationPreferences>(DEFAULT_DEVICE_INTEGRATION_PREFERENCES);
  const [subjectPreferences, setSubjectPreferences] = useState<SubjectPreferences>(DEFAULT_SUBJECT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const preferences = await readAllPreferences();

      if (cancelled) {
        return;
      }

      setThemePreference(preferences.themePreference);
      setHapticsEnabled(preferences.hapticsEnabled);
      setDeviceIntegrationPreferences(preferences.deviceIntegrationPreferences);
      setSubjectPreferences(preferences.subjectPreferences);
      setReady(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedTheme = themePreference === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : themePreference;

  const handleThemePreference = useCallback(async (preference: ThemePreference) => {
    await writeThemePreference(preference);
    setThemePreference(preference);
  }, []);

  const handleHapticsEnabled = useCallback(async (enabled: boolean) => {
    await writeHapticsPreference(enabled);
    setHapticsEnabled(enabled);
  }, []);

  const handleSubjectPreferences = useCallback(async (preferences: SubjectPreferences) => {
    await writeSubjectPreferences(preferences);
    setSubjectPreferences(preferences);
  }, []);

  const handleDeviceIntegrationPreferences = useCallback(async (preferences: DeviceIntegrationPreferences) => {
    await writeDeviceIntegrationPreferences(preferences);
    setDeviceIntegrationPreferences(preferences);
  }, []);

  const triggerSelectionHaptic = useCallback(() => {
    if (!hapticsEnabled) {
      return;
    }

    void Haptics.selectionAsync().catch(() => {
      // Ignore unsupported-device failures.
    });
  }, [hapticsEnabled]);

  const value = useMemo<AppPreferencesValue>(() => ({
    deviceIntegrationPreferences,
    hapticsEnabled,
    ready,
    resolvedTheme,
    subjectPreferences,
    themePreference,
    triggerSelectionHaptic,
    updateDeviceIntegrationPreferences: handleDeviceIntegrationPreferences,
    updateHapticsEnabled: handleHapticsEnabled,
    updateSubjectPreferences: handleSubjectPreferences,
    updateThemePreference: handleThemePreference,
  }), [
    deviceIntegrationPreferences,
    handleDeviceIntegrationPreferences,
    hapticsEnabled,
    handleHapticsEnabled,
    handleSubjectPreferences,
    handleThemePreference,
    ready,
    resolvedTheme,
    subjectPreferences,
    themePreference,
    triggerSelectionHaptic,
  ]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }

  return context;
}
