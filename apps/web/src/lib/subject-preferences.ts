export const SUBJECT_PREFERENCES_STORAGE_KEY = "canvasSubjectPreferences";
export const SUBJECT_PREFERENCES_COOKIE = "canvasSubjectPreferences";
export const SUBJECT_PREFERENCES_EVENT = "canvas-subject-preferences-changed";

export type SubjectPreferences = {
  colors: Record<number, string>;
  hiddenCourseIds: number[];
  showMobileSubjectBar: boolean;
};

export const DEFAULT_SUBJECT_PREFERENCES: SubjectPreferences = {
  colors: {},
  hiddenCourseIds: [],
  showMobileSubjectBar: true,
};

export function parseSubjectPreferences(value?: string | null): SubjectPreferences {
  if (!value) {
    return DEFAULT_SUBJECT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SubjectPreferences>;

    return {
      colors: parsed.colors ?? {},
      hiddenCourseIds: Array.isArray(parsed.hiddenCourseIds) ? parsed.hiddenCourseIds : [],
      showMobileSubjectBar: parsed.showMobileSubjectBar ?? true,
    };
  } catch {
    return DEFAULT_SUBJECT_PREFERENCES;
  }
}

export function readSubjectPreferences() {
  if (typeof window === "undefined") {
    return DEFAULT_SUBJECT_PREFERENCES;
  }

  const storedValue = window.localStorage.getItem(SUBJECT_PREFERENCES_STORAGE_KEY);

  if (!storedValue) {
    return DEFAULT_SUBJECT_PREFERENCES;
  }

  const parsedPreferences = parseSubjectPreferences(storedValue);

  if (storedValue && parsedPreferences === DEFAULT_SUBJECT_PREFERENCES) {
    window.localStorage.removeItem(SUBJECT_PREFERENCES_STORAGE_KEY);
  }

  return parsedPreferences;
}

export function writeSubjectPreferences(preferences: SubjectPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(preferences);

  window.localStorage.setItem(SUBJECT_PREFERENCES_STORAGE_KEY, serialized);
  document.cookie = `${SUBJECT_PREFERENCES_COOKIE}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(SUBJECT_PREFERENCES_EVENT));
}
