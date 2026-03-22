import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { MessageSquarePlus, Plus } from "lucide-react";
import { formatSubjectName, getSubjectColorPalette, t } from "@canvas/shared";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAppShellData, getInboxData } from "@/lib/canvas";
import { getRequestLocale } from "@/lib/request-locale";
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

function resolveConversationPalette(
  contextName: string | undefined,
  courses: Array<{ id: number; name: string }>,
) {
  const formattedContext = formatSubjectName(contextName ?? "").toLowerCase();
  const matchedCourse = courses.find((course) => {
    const formattedCourseName = formatSubjectName(course.name).toLowerCase();
    return formattedCourseName === formattedContext || course.name.toLowerCase() === (contextName ?? "").toLowerCase();
  });

  return getSubjectColorPalette(contextName ?? matchedCourse?.name);
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; sent?: string }>;
}) {
  const { mode, sent } = await searchParams;
  const cookieStore = await cookies();
  const { resolvedLocale } = await getRequestLocale();
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
            <h1 className="text-2xl font-bold">{t(resolvedLocale, "inbox.title")}</h1>
            <p className="text-sm text-muted-foreground">{t(resolvedLocale, "inbox.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{inboxData.conversations.length}</span>
            <Link href="/inbox/new" className={primaryLinkButtonClassName}>
              <MessageSquarePlus className="h-4 w-4" />
              <span>{t(resolvedLocale, "inbox.newMessage")}</span>
            </Link>
          </div>
        </div>

        {sent === "1" && (
          <div className="mb-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {mode === "queued"
              ? t(resolvedLocale, "inbox.queued")
              : t(resolvedLocale, "inbox.sent")}
          </div>
        )}

        <div className="space-y-3">
          {inboxData.conversations.length === 0 && (
            <p className="text-sm text-muted-foreground">{t(resolvedLocale, "inbox.empty")}</p>
          )}
          {inboxData.conversations.map((conversation) => {
            const participant = conversation.participants?.find((item) => item.name);
            const palette = resolveConversationPalette(conversation.context_name, shellData.courses);
            return (
              <Link
                key={conversation.id}
                href={`/inbox/${conversation.id}`}
                className="block rounded-2xl border border-border/70 bg-card/95 p-4 transition hover:border-foreground/15 hover:bg-muted/65"
              >
                <div className="flex items-start gap-3">
                  <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: palette.borderColor }} />
                  <div className="flex flex-1 items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="border border-border/70">
                        <AvatarImage src={participant?.avatar_url} alt={participant?.name ?? t(resolvedLocale, "inbox.conversationFallback")} />
                        <AvatarFallback>{getInitials(participant?.name ?? "CN")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{conversation.subject || t(resolvedLocale, "inbox.noSubject")}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                            style={{ borderColor: palette.borderColor, backgroundColor: palette.backgroundColor, color: palette.color }}
                          >
                            {formatSubjectName(conversation.context_name ?? t(resolvedLocale, "common.canvas"))}
                          </span>
                          {conversation.workflow_state === "unread" && (
                            <Badge variant="outline" className="border-border/70 text-foreground">
                              {t(resolvedLocale, "inbox.unread")}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground/80">{conversation.last_message ?? t(resolvedLocale, "inbox.noPreview")}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{t(resolvedLocale, "inbox.messageCount", { count: conversation.message_count ?? 0 })}</span>
                  <span>{formatDueDate(resolvedLocale, conversation.last_message_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <Link
          href="/inbox/new"
          aria-label={t(resolvedLocale, "inbox.newMessage")}
          className={floatingComposeButtonClassName}
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </DesktopAppShell>
  );
}
