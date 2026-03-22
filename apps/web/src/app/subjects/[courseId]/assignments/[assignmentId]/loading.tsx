"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { CalendarClock, ClipboardCheck, LockKeyhole, Send, Trophy } from "lucide-react";
import { t } from "@canvas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import {
  HeaderBadge,
  LoadingInfoCard,
  SubjectLoadingShell,
  useCachedSubjectLoadingData,
} from "../../cached-loading-shell";
import { formatDueDateShort } from "@/lib/utils";

export default function AssignmentLoading() {
  const { resolvedLocale } = useLocale();
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const courseId = Number(params.courseId);
  const assignmentId = Number(params.assignmentId);
  const { cachedCourseData } = useCachedSubjectLoadingData(courseId);

  const assignment = useMemo(
    () =>
      cachedCourseData?.content.assignments.find((item) => item.id === assignmentId) ??
      null,
    [assignmentId, cachedCourseData],
  );

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}`}
      title={assignment?.name ?? t(resolvedLocale, "subjects.loadingAssignment")}
      icon={ClipboardCheck}
      badges={
        <>
          {assignment?.points_possible != null && <HeaderBadge>{t(resolvedLocale, "subjects.points", { count: assignment.points_possible })}</HeaderBadge>}
          {assignment?.due_at && <HeaderBadge>{t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}</HeaderBadge>}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>{t(resolvedLocale, "subjects.details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LoadingInfoCard
              title={t(resolvedLocale, "subjects.loadingAssignment")}
              description={t(resolvedLocale, "subjects.details")}
            />
            <div className="h-24 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-24 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>

        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>{t(resolvedLocale, "subjects.submission")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-400/20 dark:bg-sky-500/10">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      <Send className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-sky-700/75 dark:text-sky-300/80">{t(resolvedLocale, "subjects.submitting")}</p>
                      <p className="mt-1 font-medium text-sky-950 dark:text-sky-100">
                        {assignment?.submission_types?.length ? assignment.submission_types.join(", ") : t(resolvedLocale, "subjects.loadingAssignment")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/20 dark:bg-amber-500/10">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700/75 dark:text-amber-300/80">{t(resolvedLocale, "subjects.available")}</p>
                      <p className="mt-1 font-medium text-amber-950 dark:text-amber-100">{t(resolvedLocale, "common.loading")}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/75 dark:text-emerald-300/80">{t(resolvedLocale, "subjects.status")}</p>
                      <p className="mt-1 font-medium text-emerald-950 dark:text-emerald-100">{t(resolvedLocale, "subjects.loadingAssignment")}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-400/20 dark:bg-rose-500/10">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-rose-100 p-2 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      <LockKeyhole className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-rose-700/75 dark:text-rose-300/80">{t(resolvedLocale, "subjects.access")}</p>
                      <p className="mt-1 font-medium text-rose-950 dark:text-rose-100">{t(resolvedLocale, "common.loading")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SubjectLoadingShell>
  );
}
