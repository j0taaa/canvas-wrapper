"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { type LucideIcon } from "lucide-react";
import type { CanvasDashboardData } from "@/lib/canvas";
import type { CanvasBootstrapData } from "@/lib/app-bootstrap";
import { CANVAS_BOOTSTRAP_STORAGE } from "@/lib/app-bootstrap";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";

function readStoredJson<T>(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(storageKey);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function formatGradePercentage(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

export function useCachedSubjectLoadingData(courseId: number) {
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );

  useEffect(() => {
    const syncPreferences = () => setPreferences(readSubjectPreferences());
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);

    syncPreferences();
    syncViewport();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const bootstrapData = useMemo(
    () => readStoredJson<CanvasBootstrapData>(CANVAS_BOOTSTRAP_STORAGE),
    [],
  );
  const dashboardData = useMemo(
    () => readStoredJson<CanvasDashboardData>(CANVAS_DASHBOARD_STORAGE),
    [],
  );

  const course = useMemo(
    () => dashboardData?.courses.find((item) => item.id === courseId) ?? dashboardData?.pastCourses.find((item) => item.id === courseId) ?? null,
    [courseId, dashboardData],
  );
  const cachedCourseData = bootstrapData?.courses?.[String(courseId)] ?? null;
  const subjectStyle = getSubjectColorStyle(course?.name, preferences.colors[courseId]);

  return {
    bootstrapData,
    cachedCourseData,
    course,
    dashboardData,
    isMobile,
    preferences,
    subjectStyle,
  };
}

export function SubjectLoadingShell({
  backHref,
  badges,
  children,
  courseCode,
  courseId,
  icon: Icon,
  title,
}: {
  backHref?: string;
  badges?: ReactNode;
  children: ReactNode;
  courseCode?: string;
  courseId: number;
  icon: LucideIcon;
  title: string;
}) {
  const { course, dashboardData, subjectStyle } = useCachedSubjectLoadingData(courseId);

  return (
    <DesktopAppShell
      profile={dashboardData?.profile}
      courses={dashboardData?.courses}
      currentCourseId={Number.isFinite(courseId) ? courseId : undefined}
    >
      <div className="w-full">
        {backHref && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <HistoryBackButton fallbackHref={backHref} />
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03] dark:border-white/12 dark:from-card dark:via-card dark:to-white/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-5 dark:border-white/10 sm:px-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{title}</h1>
                  <p className="text-sm text-black/55 dark:text-white/55">
                    {courseCode ?? course?.course_code ?? (course ? formatSubjectName(course.name) : "Loading subject")}
                  </p>
                </div>
              </div>
            </div>
            {badges}
          </div>
        </div>

        {children}
      </div>
    </DesktopAppShell>
  );
}

export function LoadingInfoCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4 text-sm text-black/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
      <p className="font-medium text-black dark:text-white">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

export function HeaderBadge({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70 dark:border-white/20 dark:bg-white/10 dark:text-white/75">
      {children}
    </Badge>
  );
}

export function findCachedModuleItem(
  cachedCourseData: ReturnType<typeof useCachedSubjectLoadingData>["cachedCourseData"],
  matcher: (item: NonNullable<NonNullable<typeof cachedCourseData>["content"]["modules"][number]["items"]>[number]) => boolean,
) {
  for (const courseModule of cachedCourseData?.content.modules ?? []) {
    const matchedItem = courseModule.items?.find(matcher);

    if (matchedItem) {
      return matchedItem;
    }
  }

  return null;
}
