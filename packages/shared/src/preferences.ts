export type ThemePreference = "system" | "light" | "dark";
export type ActivityReminderOffset = "day-7am" | "3h" | "1h";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const THEME_PREFERENCE_STORAGE_KEY = "canvasThemePreference";

export type SubjectPreferences = {
  colors: Record<number, string>;
  hiddenCourseIds: number[];
  orderedCourseIds: number[];
  showMobileSubjectBar: boolean;
  compactMobileDashboardSubjects: boolean;
};

export const SUBJECT_PREFERENCES_STORAGE_KEY = "canvasSubjectPreferences";
export const DEVICE_INTEGRATION_PREFERENCES_STORAGE_KEY = "canvasDeviceIntegrationPreferences";

export const DEFAULT_SUBJECT_PREFERENCES: SubjectPreferences = {
  colors: {},
  hiddenCourseIds: [],
  orderedCourseIds: [],
  showMobileSubjectBar: true,
  compactMobileDashboardSubjects: false,
};

export type DeviceIntegrationPreferences = {
  activityReminderOffsets: ActivityReminderOffset[];
  calendarSyncEnabled: boolean;
};

export const DEFAULT_DEVICE_INTEGRATION_PREFERENCES: DeviceIntegrationPreferences = {
  activityReminderOffsets: [],
  calendarSyncEnabled: false,
};

export function parseThemePreference(value?: string | null): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function parseSubjectPreferences(value?: string | null): SubjectPreferences {
  if (!value) {
    return DEFAULT_SUBJECT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SubjectPreferences>;

    return {
      colors: parsed.colors ?? {},
      hiddenCourseIds: Array.isArray(parsed.hiddenCourseIds) ? parsed.hiddenCourseIds : [],
      orderedCourseIds: Array.isArray(parsed.orderedCourseIds) ? parsed.orderedCourseIds : [],
      showMobileSubjectBar: parsed.showMobileSubjectBar ?? true,
      compactMobileDashboardSubjects: parsed.compactMobileDashboardSubjects ?? false,
    };
  } catch {
    return DEFAULT_SUBJECT_PREFERENCES;
  }
}

function parseActivityReminderOffsets(value: unknown): ActivityReminderOffset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (candidate): candidate is ActivityReminderOffset =>
      candidate === "day-7am" || candidate === "3h" || candidate === "1h",
  );
}

export function parseDeviceIntegrationPreferences(value?: string | null): DeviceIntegrationPreferences {
  if (!value) {
    return DEFAULT_DEVICE_INTEGRATION_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as Partial<DeviceIntegrationPreferences>;

    return {
      activityReminderOffsets: parseActivityReminderOffsets(parsed.activityReminderOffsets),
      calendarSyncEnabled: parsed.calendarSyncEnabled ?? false,
    };
  } catch {
    return DEFAULT_DEVICE_INTEGRATION_PREFERENCES;
  }
}

export function formatGroupJoinLevel(value?: string | null) {
  if (!value) {
    return "Managed";
  }

  const normalized = value.replace(/[_-]+/g, " ").trim();

  if (!normalized) {
    return "Managed";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
