"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { t } from "@canvas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import {
  HeaderBadge,
  LoadingInfoCard,
  SubjectLoadingShell,
  findCachedModuleItem,
  useCachedSubjectLoadingData,
} from "../../cached-loading-shell";

export default function PageLoading() {
  const { resolvedLocale } = useLocale();
  const params = useParams<{ courseId: string; pageId: string }>();
  const courseId = Number(params.courseId);
  const pageId = params.pageId;
  const { cachedCourseData } = useCachedSubjectLoadingData(courseId);

  const pageItem = useMemo(
    () =>
      findCachedModuleItem(
        cachedCourseData,
        (item) => item.type === "Page" && item.page_url === pageId,
      ),
    [cachedCourseData, pageId],
  );

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}`}
      title={pageItem?.title ?? t(resolvedLocale, "subjects.loadingPage")}
      icon={BookOpenText}
      badges={pageItem?.type ? <HeaderBadge>{pageItem.type}</HeaderBadge> : undefined}
    >
      <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
        <CardHeader className="border-b border-black/10 dark:border-white/10">
          <CardTitle>{t(resolvedLocale, "subjects.pageContent")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LoadingInfoCard
            title={t(resolvedLocale, "subjects.loadingPage")}
            description={t(resolvedLocale, "subjects.pageContent")}
          />
          <div className="h-24 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          <div className="h-32 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          <div className="h-20 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
        </CardContent>
      </Card>
    </SubjectLoadingShell>
  );
}
