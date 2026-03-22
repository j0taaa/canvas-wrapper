import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { formatSubjectName, getSubjectColorPalette, t } from "@canvas/shared";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAppShellData, getConversationData } from "@/lib/canvas";
import { getRequestLocale } from "@/lib/request-locale";
import { formatDueDate, rewriteCanvasHtmlLinks } from "@/lib/utils";
import { ParticipantsDisclosure } from "./participants-disclosure";
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

function getLatestAuthoredMessageAuthorId(
  messages: Array<{ author_id?: number; created_at?: string; generated?: boolean }> | undefined,
) {
  const authoredMessages = (messages ?? []).filter((message) => !message.generated && message.author_id != null);

  if (authoredMessages.length === 0) {
    return null;
  }

  const latestMessage = authoredMessages.reduce((latest, candidate) => {
    const latestTime = latest.created_at ? Date.parse(latest.created_at) : Number.NEGATIVE_INFINITY;
    const candidateTime = candidate.created_at ? Date.parse(candidate.created_at) : Number.NEGATIVE_INFINITY;
    return candidateTime >= latestTime ? candidate : latest;
  });

  return latestMessage.author_id ?? null;
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

export default async function InboxConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { conversationId } = await params;
  const { sent } = await searchParams;
  const { resolvedLocale } = await getRequestLocale();
  const parsedConversationId = Number(conversationId);

  if (!Number.isFinite(parsedConversationId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [shellData, conversation] = await Promise.all([
    getAppShellData(apiKey),
    getConversationData(parsedConversationId, apiKey),
  ]);

  const messages = [...(conversation.messages ?? [])].reverse();
  const participantNames = conversation.participants?.map((participant) => participant.name).filter(Boolean) ?? [];
  const latestAuthoredMessageAuthorId = getLatestAuthoredMessageAuthorId(conversation.messages);
  const shouldCollapseRecipients =
    latestAuthoredMessageAuthorId != null && latestAuthoredMessageAuthorId !== shellData.profile.id;
  const palette = resolveConversationPalette(conversation.context_name, shellData.courses);

  return (
    <DesktopAppShell active="inbox" profile={shellData.profile} courses={shellData.courses}>
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{conversation.subject || t(resolvedLocale, "inbox.noSubject")}</h1>
              <p className="text-sm text-muted-foreground">{conversation.context_name ?? t(resolvedLocale, "common.canvas")}</p>
            </div>
            {conversation.workflow_state === "unread" && (
              <Badge variant="outline" className="border-border/70 text-foreground">
                {t(resolvedLocale, "inbox.unread")}
              </Badge>
            )}
          </div>
        </div>

        {sent === "1" && (
          <div className="mb-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {t(resolvedLocale, "inbox.sent")}
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-3xl border border-border/80 bg-card/95 p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-0.5 h-full min-h-16 w-1 rounded-full" style={{ backgroundColor: palette.borderColor }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: palette.borderColor, backgroundColor: palette.backgroundColor, color: palette.color }}
                  >
                    {formatSubjectName(conversation.context_name ?? t(resolvedLocale, "inbox.general"))}
                  </span>
                  {conversation.workflow_state === "unread" && (
                    <Badge variant="outline" className="border-border/70 text-foreground">
                      {t(resolvedLocale, "inbox.unread")}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t(resolvedLocale, "inbox.recipients")}</p>
              </div>
            </div>
            <div className="pl-4 sm:pl-5">
              <ParticipantsDisclosure
                defaultCollapsed={shouldCollapseRecipients}
                emptyLabel={t(resolvedLocale, "inbox.noParticipants")}
                hideLabel={t(resolvedLocale, "inbox.hideRecipients")}
                participants={participantNames}
                recipientsCountLabel={t(resolvedLocale, "inbox.recipientsCount", { count: participantNames.length })}
                recipientsLabel={t(resolvedLocale, "inbox.recipients")}
                showLabel={t(resolvedLocale, "inbox.showRecipients")}
              />
            </div>
          </div>

          {messages.length === 0 && (
            <div className="rounded-3xl border border-border/80 bg-card/95 p-4 text-sm text-muted-foreground">
              {t(resolvedLocale, "inbox.noMessagesInConversation")}
            </div>
          )}
          {messages.map((message) => {
            const author = conversation.participants?.find((participant) => participant.id === message.author_id);
            const authorName = author?.name ?? t(resolvedLocale, "common.canvas");
            const isOwnMessage = message.author_id === shellData.profile.id && !message.generated;

            return (
              <article
                key={message.id}
                className="rounded-3xl border p-5"
                style={{
                  borderColor: isOwnMessage ? palette.borderColor : undefined,
                  backgroundColor: isOwnMessage ? palette.backgroundColor : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: isOwnMessage ? palette.borderColor : "rgba(148,163,184,0.35)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="border border-border/80">
                          <AvatarImage src={author?.avatar_url} alt={authorName} />
                          <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-semibold">{authorName}</p>
                          <p className="text-xs text-muted-foreground">{formatDueDate(resolvedLocale, message.created_at)}</p>
                        </div>
                      </div>
                      {message.generated && (
                        <Badge variant="outline" className="border-border/70 text-muted-foreground">
                          {t(resolvedLocale, "inbox.system")}
                        </Badge>
                      )}
                    </div>
                    <div
                      className="rich-content prose prose-sm mt-4 max-w-none prose-p:my-0 dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: rewriteCanvasHtmlLinks(
                          message.body || `<p>${t(resolvedLocale, "inbox.noMessageBody")}</p>`,
                          shellData.apiBase,
                        ),
                      }}
                    />
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.attachments.map((attachment) => (
                          <a
                            key={`${message.id}-${attachment.url}-${attachment.filename}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium transition hover:border-foreground/15 hover:bg-muted/55"
                          >
                            {attachment.display_name ?? attachment.filename ?? t(resolvedLocale, "inbox.attachment")}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          <ReplyForm conversationId={parsedConversationId} />
        </div>
      </div>
    </DesktopAppShell>
  );
}
