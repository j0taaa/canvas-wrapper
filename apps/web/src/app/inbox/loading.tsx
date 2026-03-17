"use client";

import Link from "next/link";
import { MessageSquarePlus, Plus } from "lucide-react";
import { CachedAppShell, useCachedAppLoadingData } from "@/app/cached-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDueDate } from "@/lib/utils";

const primaryLinkButtonClassName =
  "hidden h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 sm:inline-flex";
const floatingComposeButtonClassName =
  "fixed bottom-36 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 md:hidden";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function InboxLoading() {
  const { bootstrapData } = useCachedAppLoadingData();
  const conversations = bootstrapData?.inbox.conversations ?? [];

  return (
    <CachedAppShell active="inbox">
      <div className="w-full">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-muted-foreground">Recent Canvas conversations and course-wide messages.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{conversations.length}</span>
            <Link href="/inbox/new" className={primaryLinkButtonClassName}>
              <MessageSquarePlus className="h-4 w-4" />
              <span>New message</span>
            </Link>
          </div>
        </div>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Most recent conversations first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">Loading conversations...</p>
            )}
            {conversations.slice(0, 8).map((conversation) => {
              const participant = conversation.participants?.find((item) => item.name);
              return (
                <div
                  key={conversation.id}
                  className="block rounded-md border border-border/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="border border-border/70">
                        <AvatarImage src={participant?.avatar_url} alt={participant?.name ?? "Conversation"} />
                        <AvatarFallback>{getInitials(participant?.name ?? "CN")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{conversation.subject || "No subject"}</p>
                        <p className="text-xs text-muted-foreground">{conversation.context_name ?? "Canvas"}</p>
                        <p className="mt-1 text-sm text-foreground/80">{conversation.last_message ?? "No preview available."}</p>
                      </div>
                    </div>
                    {conversation.workflow_state === "unread" && (
                      <Badge variant="outline" className="border-border/70 text-foreground">
                        Unread
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{conversation.message_count ?? 0} messages</span>
                    <span>{formatDueDate(conversation.last_message_at)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Link
          href="/inbox/new"
          aria-label="New message"
          className={floatingComposeButtonClassName}
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </CachedAppShell>
  );
}
