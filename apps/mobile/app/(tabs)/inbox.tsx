import { useMemo } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { formatSubjectName, getSubjectColorPalette, t } from "@canvas/shared";
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../src/components/app-ui";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useAppShell, useInbox } from "../../src/hooks/use-canvas-queries";
import { formatDateTime } from "../../src/lib/format";
import { useAppPreferences } from "../../src/providers/app-preferences";

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

export default function InboxTab() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const { resolvedLocale, resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const { data: shellData } = useAppShell();
  const { data, error, isLoading, isFetching, refetch } = useInbox();
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);
  const fabPosition = viewportWidth < 600
    ? { left: Math.max(16, viewportWidth - 160) }
    : { right: 16 };

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      card: isDark ? "#000000" : "#ffffff",
      muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      primary: isDark ? "#f8fafc" : "#0f172a",
      primaryText: isDark ? "#0f172a" : "#ffffff",
      unreadBadge: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
    };
  }, [resolvedTheme]);

  return (
    <RequireCanvasConfig>
      <AppScreen contentStyle={[styles.screenContent, { width: Math.max(0, viewportWidth - 32) }]} scroll={false}>
        <RestorableScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.mutedForeground}
            />
          }
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{t(resolvedLocale, "inbox.title")}</Text>
              </View>
              {data ? (
                <Text style={[styles.count, { color: colors.mutedForeground }]}>
                  {t(resolvedLocale, "inbox.messageCount", { count: data.conversations.length })}
                </Text>
              ) : null}
            </View>

            {showColdLoading ? <LoadingState label={`${t(resolvedLocale, "common.loading")} ${t(resolvedLocale, "inbox.title").toLowerCase()}...`} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {data ? (
              <View style={styles.list}>
                {data.conversations.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    {t(resolvedLocale, "inbox.empty")}
                  </Text>
                ) : (
                  data.conversations.map((conversation) => (
                    (() => {
                      const palette = resolveConversationPalette(
                        conversation.context_name,
                        shellData?.courses,
                        subjectPreferences.colors,
                      );

                      return (
                        <Pressable
                          key={conversation.id}
                          onPress={() => {
                            triggerSelectionHaptic();
                            router.push(`/inbox/${conversation.id}`);
                          }}
                          style={({ pressed }) => [
                            styles.conversationItem,
                            { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
                          ]}
                        >
                          <View style={styles.conversationShell}>
                            <View style={[styles.conversationAccent, { backgroundColor: palette.borderColor }]} />
                            <View style={styles.conversationContent}>
                              <View style={styles.conversationHeader}>
                                <View style={styles.conversationInfo}>
                                  <Text style={[styles.conversationSubject, { color: colors.foreground }]} numberOfLines={1}>
                                    {conversation.subject || t(resolvedLocale, "inbox.noSubject")}
                                  </Text>
                                  <View style={styles.conversationContextRow}>
                                    <View
                                      style={[
                                        styles.contextBadge,
                                        { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor },
                                      ]}
                                    >
                                      <Text style={[styles.contextBadgeText, { color: palette.color }]} numberOfLines={1}>
                                        {formatSubjectName(conversation.context_name ?? t(resolvedLocale, "common.canvas"))}
                                      </Text>
                                    </View>
                                    {conversation.workflow_state === "unread" ? (
                                      <View style={[styles.unreadBadge, { borderColor: colors.border, backgroundColor: colors.unreadBadge }]}>
                                        <Text style={[styles.unreadText, { color: colors.foreground }]}>{t(resolvedLocale, "inbox.unread")}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                  <Text style={[styles.conversationPreview, { color: colors.foreground }]} numberOfLines={2}>
                                    {conversation.last_message ?? t(resolvedLocale, "inbox.noPreview")}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.conversationMeta}>
                                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                                  {t(resolvedLocale, "inbox.messageCount", { count: conversation.message_count ?? 0 })}
                                </Text>
                                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                                  {formatDateTime(resolvedLocale, conversation.last_message_at)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })()
                  ))
                )}
              </View>
            ) : null}
          </View>
        </RestorableScrollView>

        {/* Floating Compose Button */}
        <Pressable
          onPress={() => {
            triggerSelectionHaptic();
            router.push("/inbox/new");
          }}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary },
            fabPosition,
            pressed && styles.fabPressed,
          ]}
        >
          <Plus size={28} color={colors.primaryText} />
        </Pressable>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
    maxWidth: "100%",
    minWidth: 0,
  },
  container: {
    gap: 14,
    maxWidth: "100%",
    minWidth: 0,
    paddingHorizontal: 10,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  count: {
    fontSize: 14,
    fontWeight: "500",
  },
  list: {
    gap: 12,
    maxWidth: "100%",
    minWidth: 0,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  conversationItem: {
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "100%",
    minWidth: 0,
    padding: 14,
  },
  conversationShell: {
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  conversationAccent: {
    alignSelf: "stretch",
    borderRadius: 999,
    width: 4,
  },
  conversationContent: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minWidth: 0,
  },
  conversationInfo: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  conversationContextRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conversationSubject: {
    fontSize: 15,
    fontWeight: "600",
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
  conversationPreview: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.82,
  },
  unreadBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: "500",
  },
  conversationMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 12,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.9,
  },
});
