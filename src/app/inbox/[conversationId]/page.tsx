import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversationData, getDashboardData } from "@/lib/canvas";
import { formatDueDate } from "@/lib/utils";

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
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
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
    <DesktopAppShell active="inbox" profile={dashboardData.profile}>
      <div className="w-full">
        <div className="mb-6 border-b border-black/20 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{conversation.subject || "No subject"}</h1>
              <p className="text-sm text-black/60">{conversation.context_name ?? "Canvas"}</p>
            </div>
            {conversation.workflow_state === "unread" && (
              <Badge variant="outline" className="border-black/30 text-black">
                Unread
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {messages.length === 0 && (
            <Card className="border-black/20">
              <CardContent className="p-4 text-sm text-black/70">No messages found in this conversation.</CardContent>
            </Card>
          )}
          {messages.map((message) => {
            const author = conversation.participants?.find((participant) => participant.id === message.author_id);
            const authorName = author?.name ?? "Canvas";

            return (
              <Card key={message.id} className="border-black/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="border border-black/20">
                        <AvatarImage src={author?.avatar_url} alt={authorName} />
                        <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{authorName}</CardTitle>
                        <p className="text-xs text-black/60">{formatDueDate(message.created_at)}</p>
                      </div>
                    </div>
                    {message.generated && (
                      <Badge variant="outline" className="border-black/30 text-black/70">
                        System
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className="prose prose-sm max-w-none text-black prose-p:my-0 prose-a:text-black prose-strong:text-black"
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
                          className="rounded-full border border-black/20 px-3 py-1 text-xs transition hover:border-black/40"
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
        </div>
      </div>
    </DesktopAppShell>
  );
}
