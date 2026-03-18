export type ThemePreference = "system" | "light" | "dark";

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

export const DEFAULT_SUBJECT_PREFERENCES: SubjectPreferences = {
  colors: {},
  hiddenCourseIds: [],
  orderedCourseIds: [],
  showMobileSubjectBar: true,
  compactMobileDashboardSubjects: false,
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
