"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeOff, Palette } from "lucide-react";
import { formatSubjectName, getSubjectColorHex, getSubjectColorStyle } from "@/lib/utils";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
  writeSubjectPreferences,
} from "@/lib/subject-preferences";

type ProfilePreferencesProps = {
  courses: Array<{
    id: number;
    name: string;
    course_code?: string;
  }>;
};

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
            <div key={course.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colorStyle.borderColor }}
                    />
                    <p className="truncate text-sm font-medium text-black">{formatSubjectName(course.name)}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-black/50">{course.course_code ?? "Subject"}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-black/55">
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
                    className="h-4 w-4 rounded border-black/20"
                  />
                  Visible
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-black/55">
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
                    className="h-8 w-10 rounded border border-black/10 bg-transparent p-0"
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
                    className="text-xs text-black/50 transition hover:text-black/70"
                  >
                    Reset color
                  </button>
                )}
                {isHidden && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-[11px] text-black/55">
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
      <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-sm text-black/60">
        Hide subjects from the dashboard and navigation, or choose your own subject colors.
      </div>
      <SubjectPreferenceList courses={courses} />
    </div>
  );
}
