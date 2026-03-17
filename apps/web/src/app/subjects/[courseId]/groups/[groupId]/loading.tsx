"use client";

import { useParams } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingInfoCard, SubjectLoadingShell } from "../../cached-loading-shell";

export default function GroupLoading() {
  const params = useParams<{ courseId: string; groupId: string }>();
  const courseId = Number(params.courseId);

  return (
    <SubjectLoadingShell
      courseId={courseId}
      backHref={`/subjects/${courseId}?tab=people&peopleView=groups`}
      title="Loading group"
      icon={UsersRound}
    >
      <Card className="border-black/15 bg-white/90 dark:border-white/12 dark:bg-card/90">
        <CardHeader className="border-b border-black/10 dark:border-white/10">
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LoadingInfoCard
            title="Loading group details"
            description="The group page shell is ready. The wrapper is still checking Canvas access and loading the member list."
          />
          <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          <div className="h-16 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
        </CardContent>
      </Card>
    </SubjectLoadingShell>
  );
}
