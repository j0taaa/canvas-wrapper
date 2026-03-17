"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HeaderBadge,
  LoadingInfoCard,
  SubjectLoadingShell,
  findCachedModuleItem,
  useCachedSubjectLoadingData,
} from "../../cached-loading-shell";

export default function QuizLoading() {
  const params = useParams<{ courseId: string; quizId: string }>();
  const courseId = Number(params.courseId);
  const quizId = Number(params.quizId);
  const { cachedCourseData } = useCachedSubjectLoadingData(courseId);

  const quizItem = useMemo(
    () =>
      findCachedModuleItem(
        cachedCourseData,
        (item) => item.type === "Quiz" && item.content_id === quizId,
      ),
    [cachedCourseData, quizId],
  );

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}`}
      title={quizItem?.title ?? "Loading quiz"}
      icon={ListChecks}
      badges={<HeaderBadge>Quiz</HeaderBadge>}
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>Quiz details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LoadingInfoCard
              title="Loading quiz details"
              description="The quiz shell is ready. The description and latest Canvas quiz state are still being fetched."
            />
            <div className="h-20 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-28 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>

        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-20 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-20 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-20 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>
      </div>
    </SubjectLoadingShell>
  );
}
