import { useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSubjectName, getSubjectColorPalette, t } from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  PlaceholderBlock,
  LoadingState,
  PrimaryButton,
  RequireCanvasConfig,
} from "../../src/components/app-ui";
import { RichText } from "../../src/components/rich-text";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useAppShell, useConversation, useSendReply } from "../../src/hooks/use-canvas-queries";
import { formatDateTime } from "../../src/lib/format";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { useCanvasSession } from "../../src/providers/canvas-session";

function getAuthorName(
  participants: Array<{ full_name?: string; id: number; name: string }> | undefined,
  authorId?: number,
) {
  if (authorId == null) {
    return null;
  }

  const participant = participants?.find((item) => item.id === authorId);
  return participant?.name ?? participant?.full_name ?? `Author #${authorId}`;
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
  courses: Array<{ id: number; name: string }> | undefined,
  preferredColors: Record<number, string>,
) {
  const formattedContext = formatSubjectName(contextName ?? "").toLowerCase();
  const matchedCourse = courses?.find((course) => {
    const formattedCourseName = formatSubjectName(course.name).toLowerCase();
    return formattedCourseName === formattedContext || course.name.toLowerCase() === (contextName ?? "").toLowerCase();
  });

  return getSubjectColorPalette(contextName ?? matchedCourse?.name, matchedCourse ? preferredColors[matchedCourse.id] : undefined);
}

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = Number(params.conversationId);
  const { resolvedLocale, resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const { config } = useCanvasSession();
  const { data: shellData } = useAppShell();
  const [draft, setDraft] = useState("");
  const [recipientsExpanded, setRecipientsExpanded] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useConversation(conversationId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const sendReply = useSendReply();
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);
  const currentUserId = shellData?.profile.id ?? null;
  const latestAuthoredMessageAuthorId = useMemo(
    () => getLatestAuthoredMessageAuthorId(data?.messages),
    [data?.messages],
  );
  const shouldCollapseRecipients =
    currentUserId != null &&
    latestAuthoredMessageAuthorId != null &&
    latestAuthoredMessageAuthorId !== currentUserId;
  const showRecipients = !shouldCollapseRecipients || recipientsExpanded;
  const participantNames = useMemo(
    () => data?.participants?.map((participant) => participant.name).filter(Boolean) ?? [],
    [data?.participants],
  );
  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
      return {
        border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
        card: isDark ? "#000000" : "#ffffff",
        foreground: isDark ? "#f8fafc" : "#0f172a",
        input: isDark ? "#000000" : "#ffffff",
        mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
        mutedSurface: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
      };
    }, [resolvedTheme]);
  const palette = useMemo(
    () => resolveConversationPalette(data?.context_name, shellData?.courses, subjectPreferences.colors),
    [data?.context_name, shellData?.courses, subjectPreferences.colors],
  );

  const handleSendReply = () => {
    if (!draft.trim()) return;
    
    sendReply.mutate(
      { conversationId, body: draft },
      {
        onSuccess: () => {
          setDraft("");
        },
      }
    );
  };

  return (
    <RequireCanvasConfig>
      <AppScreen
        scroll={false}
        title={t(resolvedLocale, "inbox.conversation")}
        subtitle={data?.subject ?? `${t(resolvedLocale, "inbox.conversation")} #${conversationId}`}
      >
        <RestorableScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <View style={styles.container}>
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "common.loading")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            {data ? (
              <>
                <View style={[styles.threadSummary, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={styles.threadSummaryHeader}>
                    <View style={[styles.threadAccent, { backgroundColor: palette.borderColor }]} />
                    <View style={styles.threadSummaryCopy}>
                      <Text style={[styles.threadSubject, { color: colors.foreground }]}>
                        {data.subject ?? t(resolvedLocale, "inbox.noSubject")}
                      </Text>
                      <View style={styles.threadSummaryMeta}>
                        <View
                          style={[
                            styles.contextBadge,
                            { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor },
                          ]}
                        >
                          <Text style={[styles.contextBadgeText, { color: palette.color }]}>
                            {formatSubjectName(data.context_name ?? t(resolvedLocale, "inbox.general"))}
                          </Text>
                        </View>
                        {data.workflow_state === "unread" ? (
                          <View style={[styles.threadStateBadge, { borderColor: colors.border, backgroundColor: colors.mutedSurface }]}>
                            <Text style={[styles.threadStateText, { color: colors.foreground }]}>{t(resolvedLocale, "inbox.unread")}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {participantNames.length > 0 ? (
                    <View style={styles.recipientsSection}>
                      {shouldCollapseRecipients ? (
                        <Pressable
                          onPress={() => {
                            triggerSelectionHaptic();
                            setRecipientsExpanded((current) => !current);
                          }}
                          style={({ pressed }) => [
                            styles.recipientsToggle,
                            {
                              backgroundColor: colors.mutedSurface,
                              borderColor: colors.border,
                            },
                            pressed && styles.recipientsTogglePressed,
                          ]}
                        >
                          <View style={styles.recipientsCopy}>
                            <Text style={[styles.recipientsLabel, { color: colors.foreground }]}>
                              {t(resolvedLocale, "inbox.recipients")}
                            </Text>
                            <Text style={[styles.recipientsSummary, { color: colors.mutedForeground }]}>
                              {t(resolvedLocale, "inbox.recipientsCount", { count: participantNames.length })}
                            </Text>
                          </View>
                          <Text style={[styles.recipientsAction, { color: colors.mutedForeground }]}>
                            {showRecipients
                              ? t(resolvedLocale, "inbox.hideRecipients")
                              : t(resolvedLocale, "inbox.showRecipients")}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={[styles.recipientsLabel, { color: colors.foreground }]}>
                          {t(resolvedLocale, "inbox.recipients")}
                        </Text>
                      )}

                      {showRecipients ? (
                        <View style={styles.recipientsList}>
                          {participantNames.map((participantName, index) => (
                            <Text key={`${participantName}-${index}`} style={[styles.recipientName, { color: colors.mutedForeground }]}>
                              {participantName}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={[styles.recipientName, { color: colors.mutedForeground }]}>{t(resolvedLocale, "inbox.noParticipants")}</Text>
                  )}
                </View>

                <View style={styles.messageList}>
                  {(data.messages ?? []).length === 0 && showInlineRefresh ? (
                    <>
                      <PlaceholderBlock height={108} />
                      <PlaceholderBlock height={108} />
                    </>
                  ) : null}
                  {(data.messages ?? []).length === 0 && !showInlineRefresh ? (
                    <View style={[styles.emptyStateCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>
                        {t(resolvedLocale, "inbox.noMessagesInConversation")}
                      </Text>
                    </View>
                  ) : null}
                  {(data.messages ?? []).map((message) => {
                    const isOwnMessage = currentUserId != null && message.author_id === currentUserId && !message.generated;
                    const authorName = message.generated
                      ? t(resolvedLocale, "inbox.system")
                      : (getAuthorName(data.participants, message.author_id) ?? t(resolvedLocale, "common.canvas"));

                    return (
                      <View
                        key={message.id}
                        style={[
                          styles.messageCard,
                          {
                            borderColor: isOwnMessage ? palette.borderColor : colors.border,
                            backgroundColor: isOwnMessage ? palette.backgroundColor : colors.card,
                          },
                        ]}
                      >
                        <View style={styles.messageShell}>
                          <View style={[styles.messageAccent, { backgroundColor: isOwnMessage ? palette.borderColor : colors.border }]} />
                          <View style={styles.messageContent}>
                            <View style={styles.messageHeader}>
                              <View style={styles.messageHeaderCopy}>
                                <Text style={[styles.messageAuthor, { color: colors.foreground }]}>{authorName}</Text>
                                <Text style={[styles.messageTimestamp, { color: colors.mutedForeground }]}>
                                  {formatDateTime(resolvedLocale, message.created_at)}
                                </Text>
                              </View>
                              {message.generated ? (
                                <View style={[styles.threadStateBadge, { borderColor: colors.border, backgroundColor: colors.mutedSurface }]}>
                                  <Text style={[styles.threadStateText, { color: colors.foreground }]}>{t(resolvedLocale, "inbox.system")}</Text>
                                </View>
                              ) : null}
                            </View>
                            <RichText
                              html={message.body || `<p>${t(resolvedLocale, "inbox.noMessageBody")}</p>`}
                              providerUrl={config?.apiBase}
                            />
                            {message.attachments?.length ? (
                              <View style={styles.attachments}>
                                {message.attachments.map((attachment) => {
                                  const attachmentUrl = attachment.url;

                                  if (!attachmentUrl) {
                                    return null;
                                  }

                                  return (
                                    <Pressable
                                      key={`${message.id}-${attachmentUrl}-${attachment.filename ?? attachment.display_name ?? "attachment"}`}
                                      onPress={() => {
                                        void Linking.openURL(attachmentUrl);
                                      }}
                                      style={({ pressed }) => [
                                        styles.attachmentChip,
                                        {
                                          borderColor: colors.border,
                                          backgroundColor: pressed ? colors.mutedSurface : colors.card,
                                        },
                                      ]}
                                    >
                                      <Text style={[styles.attachmentText, { color: colors.foreground }]}>
                                        {attachment.display_name ?? attachment.filename ?? t(resolvedLocale, "inbox.attachment")}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={[styles.replyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.replyTitle, { color: colors.foreground }]}>{t(resolvedLocale, "inbox.reply")}</Text>
                  <TextInput
                    multiline
                    onChangeText={setDraft}
                    placeholder={t(resolvedLocale, "inbox.writeReply")}
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                    value={draft}
                  />
                  <PrimaryButton
                    disabled={sendReply.isPending || draft.trim().length === 0}
                    label={sendReply.isPending ? t(resolvedLocale, "inbox.sendingReply") : t(resolvedLocale, "inbox.sendReply")}
                    onPress={handleSendReply}
                  />
                </View>
              </>
            ) : null}
          </View>
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  attachments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attachmentChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: "500",
  },
  container: {
    gap: 18,
    paddingHorizontal: 16,
  },
  contextBadge: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  contextBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyStateCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  messageAccent: {
    alignSelf: "stretch",
    borderRadius: 999,
    width: 4,
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  messageContent: {
    flex: 1,
    gap: 12,
  },
  messageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  messageHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  messageList: {
    gap: 12,
  },
  messageShell: {
    flexDirection: "row",
    gap: 12,
  },
  messageTimestamp: {
    fontSize: 12,
  },
  recipientsAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  recipientsCopy: {
    flex: 1,
    gap: 2,
  },
  recipientsLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  recipientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  recipientsSection: {
    gap: 10,
  },
  recipientName: {
    fontSize: 13,
    lineHeight: 18,
  },
  recipientsSummary: {
    fontSize: 13,
  },
  recipientsToggle: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recipientsTogglePressed: {
    opacity: 0.85,
  },
  replyCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  replyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
  },
  threadAccent: {
    alignSelf: "stretch",
    borderRadius: 999,
    width: 4,
  },
  threadStateBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  threadStateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  threadSubject: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  threadSummary: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  threadSummaryCopy: {
    flex: 1,
    gap: 8,
  },
  threadSummaryHeader: {
    flexDirection: "row",
    gap: 12,
  },
  threadSummaryMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
