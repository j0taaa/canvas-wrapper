"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { t } from "@canvas/shared";
import { CachedAppShell, useCachedAppLoadingData } from "@/app/cached-app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingInfoCard } from "@/app/subjects/[courseId]/cached-loading-shell";
import { useLocale } from "@/components/locale-provider";

export default function InboxConversationLoading() {
  const { resolvedLocale } = useLocale();
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
              <h1 className="text-2xl font-bold">{conversation?.subject || t(resolvedLocale, "common.loading")}</h1>
              <p className="text-sm text-muted-foreground">{conversation?.context_name ?? t(resolvedLocale, "common.canvas")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="border-b border-border/70">
              <CardTitle>{t(resolvedLocale, "inbox.messagesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LoadingInfoCard
                title={t(resolvedLocale, "common.loading")}
                description={t(resolvedLocale, "inbox.messagesSubtitle")}
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
