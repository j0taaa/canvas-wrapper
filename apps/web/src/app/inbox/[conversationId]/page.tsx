import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversationData, getDashboardData } from "@/lib/canvas";
import { formatDueDate } from "@/lib/utils";
import { ReplyForm } from "./reply-form";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function InboxConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { conversationId } = await params;
  const { sent } = await searchParams;
  const parsedConversationId = Number(conversationId);

  if (!Number.isFinite(parsedConversationId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [dashboardData, conversation] = await Promise.all([
    getDashboardData(apiKey),
    getConversationData(parsedConversationId, apiKey),
  ]);

  const messages = [...(conversation.messages ?? [])].reverse();

  return (
    <DesktopAppShell active="inbox" profile={dashboardData.profile} courses={dashboardData.courses}>
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{conversation.subject || "No subject"}</h1>
              <p className="text-sm text-muted-foreground">{conversation.context_name ?? "Canvas"}</p>
            </div>
            {conversation.workflow_state === "unread" && (
              <Badge variant="outline" className="border-border/70 text-foreground">
                Unread
              </Badge>
            )}
          </div>
        </div>

        {sent === "1" && (
          <div className="mb-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            Message sent.
          </div>
        )}

        <div className="space-y-4">
          {messages.length === 0 && (
            <Card className="border-border/80 bg-card/95">
              <CardContent className="p-4 text-sm text-muted-foreground">No messages found in this conversation.</CardContent>
            </Card>
          )}
          {messages.map((message) => {
            const author = conversation.participants?.find((participant) => participant.id === message.author_id);
            const authorName = author?.name ?? "Canvas";

            return (
              <Card key={message.id} className="border-border/80 bg-card/95">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="border border-border/80">
                        <AvatarImage src={author?.avatar_url} alt={authorName} />
                        <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{authorName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{formatDueDate(message.created_at)}</p>
                      </div>
                    </div>
                    {message.generated && (
                      <Badge variant="outline" className="border-border/70 text-muted-foreground">
                        System
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className="prose prose-sm max-w-none prose-p:my-0 dark:prose-invert dark:prose-a:text-white"
                    dangerouslySetInnerHTML={{ __html: message.body || "<p>No message content.</p>" }}
                  />
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <a
                          key={`${message.id}-${attachment.url}-${attachment.filename}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:border-foreground/15 hover:bg-muted/55"
                        >
                          {attachment.display_name ?? attachment.filename ?? "Attachment"}
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <ReplyForm conversationId={parsedConversationId} />
        </div>
      </div>
    </DesktopAppShell>
  );
}
