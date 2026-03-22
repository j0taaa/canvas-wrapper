"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, EyeOff, MonitorCog, MoonStar, Palette, Smartphone, SunMedium } from "lucide-react";
import { getLocaleDisplayName, t, type LanguagePreference } from "@canvas/shared";
import { useLocale } from "@/components/locale-provider";
import { formatSubjectName, getSubjectColorHex, getSubjectColorStyle, orderSubjectsByPreference } from "@/lib/utils";
import {
  readHapticsPreference,
  writeHapticsPreference,
} from "@/lib/haptics-preference";
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
  { icon: MonitorCog, label: "settings.systemTheme", value: "system" },
  { icon: SunMedium, label: "settings.light", value: "light" },
  { icon: MoonStar, label: "settings.dark", value: "dark" },
];

const languageOptions: LanguagePreference[] = ["system", "en", "pt-BR"];

function LanguagePreferenceSelector() {
  const { languagePreference, resolvedLocale, setLanguagePreference } = useLocale();

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">{t(resolvedLocale, "settings.appLanguageTitle")}</p>
      <div className="flex flex-wrap gap-2">
        {languageOptions.map((option) => {
          const label = option === "system"
            ? t(resolvedLocale, "common.system")
            : getLocaleDisplayName(option, resolvedLocale);

          return (
            <button
              key={option}
              type="button"
              onClick={() => setLanguagePreference(option)}
              className={
                languagePreference === option
                  ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
              }
            >
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(resolvedLocale, "settings.languageDescription")}
      </p>
      {languagePreference === "system" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t(resolvedLocale, "settings.languageSystemDescription", {
            language: getLocaleDisplayName(resolvedLocale, resolvedLocale),
          })}
        </p>
      )}
    </div>
  );
}

function ThemePreferenceSelector() {
  const { resolvedLocale } = useLocale();
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
      <p className="mb-3 text-sm font-medium text-foreground">{t(resolvedLocale, "common.appearance")}</p>
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
              <span>{t(resolvedLocale, option.label as "settings.systemTheme" | "settings.light" | "settings.dark")}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(resolvedLocale, "settings.themeDescription")}
      </p>
    </div>
  );
}

function HapticsPreferenceSelector() {
  const { resolvedLocale } = useLocale();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const syncPreference = () => setEnabled(readHapticsPreference());

    syncPreference();
    window.addEventListener("storage", syncPreference);
    window.addEventListener("canvas-haptics-preference-changed", syncPreference);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener("canvas-haptics-preference-changed", syncPreference);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">{t(resolvedLocale, "settings.haptics")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => writeHapticsPreference(false)}
          className={
            !enabled
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
          }
        >
          <Smartphone className="h-4 w-4" />
          <span>{t(resolvedLocale, "common.off")}</span>
        </button>
        <button
          type="button"
          onClick={() => writeHapticsPreference(true)}
          className={
            enabled
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
          }
        >
          <Smartphone className="h-4 w-4" />
          <span>{t(resolvedLocale, "common.on")}</span>
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(resolvedLocale, "settings.hapticsDescription")}
      </p>
    </div>
  );
}

function MobileSubjectBarSelector() {
  const { resolvedLocale } = useLocale();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const syncPreferences = () => setEnabled(readSubjectPreferences().showMobileSubjectBar);

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">{t(resolvedLocale, "settings.mobileSubjectBar")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => writeSubjectPreferences({ ...readSubjectPreferences(), showMobileSubjectBar: true })}
          className={
            enabled
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
          }
        >
          <span>{t(resolvedLocale, "common.show")}</span>
        </button>
        <button
          type="button"
          onClick={() => writeSubjectPreferences({ ...readSubjectPreferences(), showMobileSubjectBar: false })}
          className={
            !enabled
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
          }
        >
          <span>{t(resolvedLocale, "common.hide")}</span>
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(resolvedLocale, "settings.mobileSubjectBarDescription")}
      </p>
    </div>
  );
}

function MobileDashboardSubjectSizeSelector() {
  const { resolvedLocale } = useLocale();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const syncPreferences = () => setCompact(readSubjectPreferences().compactMobileDashboardSubjects);

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">{t(resolvedLocale, "settings.mobileDashboardSubjects")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => writeSubjectPreferences({ ...readSubjectPreferences(), compactMobileDashboardSubjects: false })}
          className={
            !compact
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
          }
        >
          <span>{t(resolvedLocale, "common.default")}</span>
        </button>
        <button
          type="button"
          onClick={() => writeSubjectPreferences({ ...readSubjectPreferences(), compactMobileDashboardSubjects: true })}
          className={
            compact
              ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
          }
        >
          <span>{t(resolvedLocale, "common.compact")}</span>
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(resolvedLocale, "settings.mobileDashboardSubjectsDescription")}
      </p>
    </div>
  );
}

function SubjectPreferenceList({ courses }: { courses: ProfilePreferencesProps["courses"] }) {
  const { resolvedLocale } = useLocale();
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);
  const [isExpanded, setIsExpanded] = useState(false);

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
  const orderedVisibleCourses = useMemo(
    () => orderSubjectsByPreference(visibleCourses, preferences.orderedCourseIds),
    [preferences.orderedCourseIds, visibleCourses],
  );

  const moveCourse = (courseId: number, direction: -1 | 1) => {
    const nextOrderedIds = orderedVisibleCourses.map((course) => course.id);
    const currentIndex = nextOrderedIds.indexOf(courseId);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= nextOrderedIds.length) {
      return;
    }

    [nextOrderedIds[currentIndex], nextOrderedIds[targetIndex]] = [nextOrderedIds[targetIndex], nextOrderedIds[currentIndex]];

    writeSubjectPreferences({
      ...preferences,
      orderedCourseIds: nextOrderedIds,
    });
  };

  if (visibleCourses.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-muted/35 p-4 text-left transition hover:border-border hover:bg-muted/50"
      >
        <div>
          <p className="text-sm font-medium text-foreground">{t(resolvedLocale, "common.subjects")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(resolvedLocale, "settings.subjectsDescription")}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
            <span>{t(resolvedLocale, "settings.subjectsOrderDescription")}</span>
            {preferences.orderedCourseIds.length > 0 && (
              <button
                type="button"
                onClick={() => writeSubjectPreferences({ ...preferences, orderedCourseIds: [] })}
                className="shrink-0 text-foreground transition hover:opacity-75"
              >
                {t(resolvedLocale, "common.resetOrder")}
              </button>
            )}
          </div>
          {orderedVisibleCourses.map((course, index) => {
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
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-full border border-border/70 bg-muted/35 p-1">
                      <button
                        type="button"
                        onClick={() => moveCourse(course.id, -1)}
                        disabled={index === 0}
                        className="rounded-full p-1 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`${t(resolvedLocale, "common.back")} ${formatSubjectName(course.name)}`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCourse(course.id, 1)}
                        disabled={index === orderedVisibleCourses.length - 1}
                        className="rounded-full p-1 text-muted-foreground transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`${t(resolvedLocale, "common.settings")} ${formatSubjectName(course.name)}`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
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
                      {t(resolvedLocale, "common.visible")}
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    {t(resolvedLocale, "common.color")}
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
                      aria-label={`${t(resolvedLocale, "common.color")} ${formatSubjectName(course.name)}`}
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
                      {t(resolvedLocale, "common.resetColor")}
                    </button>
                  )}
                  {isHidden && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                      <EyeOff className="h-3 w-3" />
                      {t(resolvedLocale, "common.hidden")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProfilePreferences({ courses }: ProfilePreferencesProps) {
  const { resolvedLocale } = useLocale();
  return (
    <div className="space-y-6">
      <LanguagePreferenceSelector />
      <ThemePreferenceSelector />
      <HapticsPreferenceSelector />
      <MobileSubjectBarSelector />
      <MobileDashboardSubjectSizeSelector />
      <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
        {t(resolvedLocale, "settings.overviewDescription")}
      </div>
      <SubjectPreferenceList courses={courses} />
      <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{t(resolvedLocale, "common.madeBy")}</p>
        <p className="mt-2">
          {t(resolvedLocale, "settings.suggestions")}
          {" "}
          <a
            href="mailto:gabrieljotalizardo@gmail.com"
            className="text-foreground underline underline-offset-4 transition hover:opacity-75"
          >
            gabrieljotalizardo@gmail.com
          </a>
        </p>
        <p className="mt-2">
          {t(resolvedLocale, "settings.linkedIn")}
          {" "}
          <a
            href="https://www.linkedin.com/in/gabriel-jota-lizardo-4587a427b/"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4 transition hover:opacity-75"
          >
            Gabriel Jota Lizardo
          </a>
        </p>
      </div>
    </div>
  );
}
