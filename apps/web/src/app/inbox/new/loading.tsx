"use client";

import { CachedAppShell, useCachedAppLoadingData } from "@/app/cached-app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingInfoCard } from "@/app/subjects/[courseId]/cached-loading-shell";

export default function NewInboxMessageLoading() {
  const { dashboardData } = useCachedAppLoadingData();

  return (
    <CachedAppShell active="inbox">
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <h1 className="text-2xl font-bold">New message</h1>
        </div>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoadingInfoCard
              title="Loading compose form"
              description="The inbox shell is ready. The full recipient and course picker is being prepared now."
            />
            <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available subjects</p>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {(dashboardData?.courses ?? []).slice(0, 8).map((course) => (
                  <div key={course.id} className="rounded-lg border border-black/8 bg-white/80 px-3 py-2.5 text-sm dark:border-white/8 dark:bg-white/[0.04]">
                    {course.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-14 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            <div className="h-28 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
          </CardContent>
        </Card>
      </div>
    </CachedAppShell>
  );
}
