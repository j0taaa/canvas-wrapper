"use client";

import { useParams } from "next/navigation";
import { UsersRound } from "lucide-react";
import { t } from "@canvas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import { LoadingInfoCard, SubjectLoadingShell } from "../../cached-loading-shell";

export default function GroupLoading() {
  const { resolvedLocale } = useLocale();
  const params = useParams<{ courseId: string; groupId: string }>();
  const courseId = Number(params.courseId);

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}?tab=people&peopleView=groups`}
      title={t(resolvedLocale, "subjects.loadingGroup")}
      icon={UsersRound}
    >
      <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
        <CardHeader className="border-b border-black/10 dark:border-white/10">
          <CardTitle>{t(resolvedLocale, "subjects.people")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LoadingInfoCard
            title={t(resolvedLocale, "subjects.loadingGroup")}
            description={t(resolvedLocale, "subjects.peopleVisibleInGroup")}
          />
          <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
        </CardContent>
      </Card>
    </SubjectLoadingShell>
  );
}
