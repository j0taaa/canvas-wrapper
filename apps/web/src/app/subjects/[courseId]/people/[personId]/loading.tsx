"use client";

import { useParams } from "next/navigation";
import { UserRound } from "lucide-react";
import { t } from "@canvas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import { LoadingInfoCard, SubjectLoadingShell } from "../../cached-loading-shell";

export default function PersonLoading() {
  const { resolvedLocale } = useLocale();
  const params = useParams<{ courseId: string; personId: string }>();
  const courseId = Number(params.courseId);

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}?tab=people`}
      title={t(resolvedLocale, "profile.loadingPerson")}
      icon={UserRound}
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>{t(resolvedLocale, "common.profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-24 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-20 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>
        <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
          <CardHeader className="border-b border-black/10 dark:border-white/10">
            <CardTitle>{t(resolvedLocale, "profile.sharedActiveSubjects")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LoadingInfoCard
              title={t(resolvedLocale, "profile.loadingPerson")}
              description={t(resolvedLocale, "profile.sharedActiveSubjectsDescription")}
            />
            <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>
      </div>
    </SubjectLoadingShell>
  );
}
