export const SUBJECT_PREFERENCES_STORAGE_KEY = "canvasSubjectPreferences";
export const SUBJECT_PREFERENCES_EVENT = "canvas-subject-preferences-changed";

export type SubjectPreferences = {
  colors: Record<number, string>;
  hiddenCourseIds: number[];
};

export const DEFAULT_SUBJECT_PREFERENCES: SubjectPreferences = {
  colors: {},
  hiddenCourseIds: [],
};

export function readSubjectPreferences() {
  if (typeof window === "undefined") {
    return DEFAULT_SUBJECT_PREFERENCES;
  }

  const storedValue = window.localStorage.getItem(SUBJECT_PREFERENCES_STORAGE_KEY);

  if (!storedValue) {
    return DEFAULT_SUBJECT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<SubjectPreferences>;

    return {
      colors: parsed.colors ?? {},
      hiddenCourseIds: Array.isArray(parsed.hiddenCourseIds) ? parsed.hiddenCourseIds : [],
    };
  } catch {
    window.localStorage.removeItem(SUBJECT_PREFERENCES_STORAGE_KEY);
    return DEFAULT_SUBJECT_PREFERENCES;
  }
}

export function writeSubjectPreferences(preferences: SubjectPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SUBJECT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(SUBJECT_PREFERENCES_EVENT));
}

