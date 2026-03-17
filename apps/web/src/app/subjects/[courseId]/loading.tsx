"use client";
import { useParams, useSearchParams } from "next/navigation";
import { BookOpen, CircleDot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDueDateShort } from "@/lib/utils";
import {
  HeaderBadge,
  LoadingInfoCard,
  SubjectLoadingShell,
  formatGradePercentage,
  useCachedSubjectLoadingData,
} from "./cached-loading-shell";

const SUBJECT_TABS = ["overview", "modules", "assignments", "grades", "people", "forums", "files"] as const;
type SubjectTab = typeof SUBJECT_TABS[number];

function normalizeTab(value?: string | null): SubjectTab {
  return SUBJECT_TABS.includes(value as SubjectTab) ? (value as SubjectTab) : "overview";
}

export default function SubjectLoading() {
  const params = useParams<{ courseId: string }>();
  const searchParams = useSearchParams();
  const courseId = Number(params.courseId);
  const { cachedCourseData, course, isMobile, subjectStyle } = useCachedSubjectLoadingData(courseId);
  const activeTab = normalizeTab(searchParams.get("tab"));
  const effectiveTab = activeTab === "overview" && isMobile ? "modules" : activeTab;
  const gradePercentage = cachedCourseData?.grades?.enrollment?.grades?.current_score ?? null;
  const modules = cachedCourseData?.content?.modules ?? [];
  const assignments = cachedCourseData?.content?.assignments ?? [];

  return (
    <SubjectLoadingShell
      courseId={courseId}
      title={course ? course.name.split(" -", 1)[0]?.trim() || course.name : `Subject ${courseId}`}
      icon={BookOpen}
      badges={
        gradePercentage != null ? (
          <HeaderBadge>{formatGradePercentage(gradePercentage)}%</HeaderBadge>
        ) : undefined
      }
    >
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {SUBJECT_TABS.map((item) => {
          const isVisible = item === "overview"
            ? !isMobile
            : item === "modules" || item === "assignments"
              ? isMobile
              : true;

          if (!isVisible) {
            return null;
          }

          return (
            <span
              key={item}
              className={
                effectiveTab === item
                  ? "rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                  : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/45 dark:border-white/12 dark:bg-card dark:text-white/45"
              }
            >
              {item === "overview"
                ? "Overview"
                : item === "modules"
                  ? "Modules"
                  : item === "assignments"
                    ? "Assignments"
                    : item === "grades"
                      ? "Grades"
                      : item === "people"
                        ? "People"
                        : item === "forums"
                          ? "Forums"
                          : "Files"}
            </span>
          );
        })}
      </div>

      {(effectiveTab === "overview" || effectiveTab === "modules" || effectiveTab === "assignments") && cachedCourseData && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {(effectiveTab === "overview" || effectiveTab === "modules") && (
            <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
              <CardHeader className="border-b border-black/10 dark:border-white/10">
                <CardTitle>Modules</CardTitle>
                <CardDescription>Showing prefetched content while the latest data loads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {modules.slice(0, 4).map((module) => (
                  <div key={module.id} className="rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{module.name}</p>
                        <p className="mt-1 text-xs text-black/50 dark:text-white/50">Course materials</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-black/15 px-2.5 py-1 text-xs text-black/60 dark:border-white/15 dark:text-white/60">
                        {module.items_count ?? module.items?.length ?? 0} items
                      </span>
                    </div>
                    <div className="space-y-2">
                      {module.items?.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-start gap-2 rounded-lg border border-black/8 bg-white/80 px-3 py-2.5 text-sm dark:border-white/8 dark:bg-white/[0.04]">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subjectStyle.borderColor }} />
                          <div className="min-w-0">
                            <p className="truncate">{item.title ?? "Untitled item"}</p>
                            <p className="mt-1 text-xs text-black/55 dark:text-white/55">{item.type ?? "Content"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(effectiveTab === "overview" || effectiveTab === "assignments") && (
            <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
              <CardHeader className="border-b border-black/10 dark:border-white/10">
                <CardTitle>Assignments</CardTitle>
                <CardDescription>Showing prefetched content while the latest data loads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate font-medium ${assignment.submission?.workflow_state === "submitted" ? "line-through opacity-65" : ""}`}>
                          {assignment.name ?? "Untitled assignment"}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
                          <CircleDot className="h-3 w-3" style={{ color: subjectStyle.borderColor }} />
                          <span>{assignment.points_possible != null ? `${assignment.points_possible} pts` : "Assignment"}</span>
                          {assignment.due_at && <span>Due {formatDueDateShort(assignment.due_at)}</span>}
                        </div>
                      </div>
                      {assignment.submission?.workflow_state === "submitted" && (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Done
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {effectiveTab === "grades" && cachedCourseData?.grades && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
            <CardHeader className="border-b border-black/10 dark:border-white/10">
              <CardTitle>Grade %</CardTitle>
              <CardDescription>Showing prefetched content while the latest data loads.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {formatGradePercentage(cachedCourseData.grades.enrollment?.grades?.current_score) ?? "No grade yet"}
                {cachedCourseData.grades.enrollment?.grades?.current_score != null ? "%" : ""}
              </p>
            </CardContent>
          </Card>
          <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
            <CardHeader className="border-b border-black/10 dark:border-white/10">
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Scored work loaded from cache.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{cachedCourseData.grades.assignments.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {((effectiveTab === "people" || effectiveTab === "forums" || effectiveTab === "files") || !cachedCourseData) && (
        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>Loading {effectiveTab === "people" ? "people" : effectiveTab === "forums" ? "forums" : effectiveTab === "files" ? "files" : "subject"}...</CardTitle>
            <CardDescription>
              This section is not part of the dashboard bootstrap cache yet, so the app is fetching the latest data now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <LoadingInfoCard title="Loading latest data" description="The subject shell is already restored from cache. The content for this tab is still being refreshed." />
            <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>
      )}
    </SubjectLoadingShell>
  );
}
