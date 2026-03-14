"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeOff, MonitorCog, MoonStar, Palette, SunMedium } from "lucide-react";
import { formatSubjectName, getSubjectColorHex, getSubjectColorStyle } from "@/lib/utils";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
  writeSubjectPreferences,
} from "@/lib/subject-preferences";
import {
  DEFAULT_THEME_PREFERENCE,
  readThemePreference,
  THEME_PREFERENCE_EVENT,
  type ThemePreference,
  writeThemePreference,
} from "@/lib/theme-preference";

type ProfilePreferencesProps = {
  courses: Array<{
    id: number;
    name: string;
    course_code?: string;
  }>;
};

const themeOptions: Array<{
  icon: typeof MonitorCog;
  label: string;
  value: ThemePreference;
}> = [
  { icon: MonitorCog, label: "System", value: "system" },
  { icon: SunMedium, label: "Light", value: "light" },
  { icon: MoonStar, label: "Dark", value: "dark" },
];

function ThemePreferenceSelector() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);

  useEffect(() => {
    const syncTheme = () => setThemePreference(readThemePreference());

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener(THEME_PREFERENCE_EVENT, syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(THEME_PREFERENCE_EVENT, syncTheme);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Appearance</p>
      <div className="flex flex-wrap gap-2">
        {themeOptions.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => writeThemePreference(option.value)}
              className={
                themePreference === option.value
                  ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
              }
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Use the system theme by default, or force light or dark mode for the whole app.
      </p>
    </div>
  );
}

function SubjectPreferenceList({ courses }: { courses: ProfilePreferencesProps["courses"] }) {
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readSubjectPreferences());

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  const visibleCourses = useMemo(
    () => courses.filter((course) => course.name),
    [courses],
  );

  if (visibleCourses.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="space-y-3">
        {visibleCourses.map((course) => {
          const isHidden = preferences.hiddenCourseIds.includes(course.id);
          const preferredColor = preferences.colors[course.id];
          const colorStyle = getSubjectColorStyle(course.name, preferredColor);
          const inputColor = preferredColor ?? getSubjectColorHex(course.name);

          return (
            <div key={course.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colorStyle.borderColor }}
                    />
                    <p className="truncate text-sm font-medium text-foreground">{formatSubjectName(course.name)}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{course.course_code ?? "Subject"}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={(event) => {
                      const nextHiddenIds = event.target.checked
                        ? preferences.hiddenCourseIds.filter((courseId) => courseId !== course.id)
                        : [...preferences.hiddenCourseIds, course.id];

                      writeSubjectPreferences({
                        ...preferences,
                        hiddenCourseIds: Array.from(new Set(nextHiddenIds)),
                      });
                    }}
                    className="h-4 w-4 rounded border-border/70 bg-background"
                  />
                  Visible
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  Color
                  <input
                    type="color"
                    value={inputColor}
                    onChange={(event) => {
                      writeSubjectPreferences({
                        ...preferences,
                        colors: {
                          ...preferences.colors,
                          [course.id]: event.target.value,
                        },
                      });
                    }}
                    className="h-8 w-10 rounded border border-border/70 bg-transparent p-0"
                    aria-label={`Choose color for ${formatSubjectName(course.name)}`}
                  />
                </label>
                {preferredColor && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextColors = { ...preferences.colors };
                      delete nextColors[course.id];

                      writeSubjectPreferences({
                        ...preferences,
                        colors: nextColors,
                      });
                    }}
                    className="text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    Reset color
                  </button>
                )}
                {isHidden && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                    <EyeOff className="h-3 w-3" />
                    Hidden
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProfilePreferences({ courses }: ProfilePreferencesProps) {
  return (
    <div className="space-y-6">
      <ThemePreferenceSelector />
      <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
        Hide subjects from the dashboard and navigation, or choose your own subject colors.
      </div>
      <SubjectPreferenceList courses={courses} />
    </div>
  );
}
