import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { MessageSquarePlus, Plus } from "lucide-react";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppShellData, getInboxData } from "@/lib/canvas";
import { formatDueDate } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";
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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; sent?: string }>;
}) {
  const { mode, sent } = await searchParams;
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [shellData, inboxData] = await Promise.all([
    getAppShellData(apiKey),
    getInboxData(apiKey),
  ]);

  return (
    <DesktopAppShell active="inbox" profile={shellData.profile} courses={shellData.courses}>
      <div className="w-full">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-muted-foreground">Recent Canvas conversations and course-wide messages.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{inboxData.conversations.length}</span>
            <Link href="/inbox/new" className={primaryLinkButtonClassName}>
              <MessageSquarePlus className="h-4 w-4" />
              <span>New message</span>
            </Link>
          </div>
        </div>

        {sent === "1" && (
          <div className="mb-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {mode === "queued"
              ? "Message queued. Canvas is sending the individual copies in the background."
              : "Message sent."}
          </div>
        )}

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Most recent conversations first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inboxData.conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent conversations found.</p>
            )}
            {inboxData.conversations.map((conversation) => {
              const participant = conversation.participants?.find((item) => item.name);
              return (
                <Link
                  key={conversation.id}
                  href={`/inbox/${conversation.id}`}
                  className="block rounded-md border border-border/70 p-3 transition hover:border-foreground/15 hover:bg-muted/65"
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
                </Link>
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
    </DesktopAppShell>
  );
}
