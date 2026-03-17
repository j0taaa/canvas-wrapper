"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { CachedAppShell, useCachedAppLoadingData } from "@/app/cached-app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingInfoCard } from "@/app/subjects/[courseId]/cached-loading-shell";

export default function InboxConversationLoading() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = Number(params.conversationId);
  const { bootstrapData } = useCachedAppLoadingData();
  const conversation = useMemo(
    () => bootstrapData?.inbox.conversations.find((item) => item.id === conversationId) ?? null,
    [bootstrapData, conversationId],
  );

  return (
    <CachedAppShell active="inbox">
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{conversation?.subject || "Loading conversation"}</h1>
              <p className="text-sm text-muted-foreground">{conversation?.context_name ?? "Canvas"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LoadingInfoCard
                title="Loading conversation"
                description="The inbox shell is already restored from cache. The full message thread is being fetched now."
              />
              <div className="h-28 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
              <div className="h-28 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            </CardContent>
          </Card>
        </div>
      </div>
    </CachedAppShell>
  );
}
