"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FileText } from "lucide-react";
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

export default function FileLoading() {
  const { resolvedLocale } = useLocale();
  const params = useParams<{ courseId: string; fileId: string }>();
  const courseId = Number(params.courseId);
  const fileId = Number(params.fileId);
  const { cachedCourseData } = useCachedSubjectLoadingData(courseId);

  const fileItem = useMemo(
    () =>
      findCachedModuleItem(
        cachedCourseData,
        (item) => item.type === "File" && item.content_id === fileId,
      ),
    [cachedCourseData, fileId],
  );

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}?tab=files`}
      title={fileItem?.title ?? t(resolvedLocale, "subjects.loadingFile")}
      icon={FileText}
      badges={<HeaderBadge>{t(resolvedLocale, "bookmarks.file")}</HeaderBadge>}
    >
      <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
        <CardHeader className="border-b border-black/10 dark:border-white/10">
          <CardTitle>{t(resolvedLocale, "subjects.preview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LoadingInfoCard
            title={t(resolvedLocale, "subjects.loadingFile")}
            description={t(resolvedLocale, "subjects.preview")}
          />
          <div className="h-[55vh] rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
        </CardContent>
      </Card>
    </SubjectLoadingShell>
  );
}
