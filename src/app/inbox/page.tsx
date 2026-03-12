import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
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
import { getDashboardData, getInboxData } from "@/lib/canvas";
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

export default async function InboxPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [dashboardData, inboxData] = await Promise.all([
    getDashboardData(apiKey),
    getInboxData(apiKey),
  ]);

  return (
    <DesktopAppShell active="inbox" profile={dashboardData.profile} courses={dashboardData.courses}>
      <div className="w-full">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-black/20 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-black/60">Recent Canvas conversations.</p>
          </div>
          <span className="text-sm font-medium text-black/60">{inboxData.conversations.length}</span>
        </div>

        <Card className="border-black/20">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Most recent conversations first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inboxData.conversations.length === 0 && (
              <p className="text-sm text-black/70">No recent conversations found.</p>
            )}
            {inboxData.conversations.map((conversation) => {
              const participant = conversation.participants?.find((item) => item.name);
              return (
                <Link
                  key={conversation.id}
                  href={`/inbox/${conversation.id}`}
                  className="block rounded-md border border-black/20 p-3 transition hover:border-black/40 hover:bg-black/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="border border-black/20">
                        <AvatarImage src={participant?.avatar_url} alt={participant?.name ?? "Conversation"} />
                        <AvatarFallback>{getInitials(participant?.name ?? "CN")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{conversation.subject || "No subject"}</p>
                        <p className="text-xs text-black/70">{conversation.context_name ?? "Canvas"}</p>
                        <p className="mt-1 text-sm text-black/80">{conversation.last_message ?? "No preview available."}</p>
                      </div>
                    </div>
                    {conversation.workflow_state === "unread" && (
                      <Badge variant="outline" className="border-black/30 text-black">
                        Unread
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-black/60">
                    <span>{conversation.message_count ?? 0} messages</span>
                    <span>{formatDueDate(conversation.last_message_at)}</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DesktopAppShell>
  );
}
