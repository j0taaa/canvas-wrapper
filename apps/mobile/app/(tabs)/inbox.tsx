import { useMemo } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../src/components/app-ui";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useInbox } from "../../src/hooks/use-canvas-queries";
import { formatDateTime } from "../../src/lib/format";
import { useAppPreferences } from "../../src/providers/app-preferences";

export default function InboxTab() {
  const router = useRouter();
  const { resolvedTheme, triggerSelectionHaptic } = useAppPreferences();
  const { data, error, isLoading, isFetching, refetch } = useInbox();
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      card: isDark ? "#0f172a" : "#ffffff",
      muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      primary: isDark ? "#f8fafc" : "#0f172a",
      primaryText: isDark ? "#0f172a" : "#ffffff",
      unreadBadge: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
    };
  }, [resolvedTheme]);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
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
                <Text style={[styles.title, { color: colors.foreground }]}>Inbox</Text>
              </View>
              {data ? (
                <Text style={[styles.count, { color: colors.mutedForeground }]}>
                  {data.conversations.length} conversations
                </Text>
              ) : null}
            </View>

            {showColdLoading ? <LoadingState label="Loading inbox..." /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {data ? (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {/* Card Header */}
                <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Messages</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Most recent conversations first</Text>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  {data.conversations.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      No recent conversations found.
                    </Text>
                  ) : (
                    data.conversations.map((conversation) => (
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
                        <View style={styles.conversationHeader}>
                          <View style={styles.conversationInfo}>
                            <Text style={[styles.conversationSubject, { color: colors.foreground }]} numberOfLines={1}>
                              {conversation.subject || "No subject"}
                            </Text>
                            <Text style={[styles.conversationContext, { color: colors.mutedForeground }]}>
                              {conversation.context_name ?? "Canvas"}
                            </Text>
                            <Text style={[styles.conversationPreview, { color: colors.foreground }]} numberOfLines={2}>
                              {conversation.last_message ?? "No preview available."}
                            </Text>
                          </View>
                          {conversation.workflow_state === "unread" && (
                            <View style={[styles.unreadBadge, { borderColor: colors.border, backgroundColor: colors.unreadBadge }]}>
                              <Text style={[styles.unreadText, { color: colors.foreground }]}>Unread</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.conversationMeta}>
                          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                            {conversation.message_count ?? 0} messages
                          </Text>
                          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                            {formatDateTime(conversation.last_message_at)}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    gap: 14,
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  conversationItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  conversationInfo: {
    flex: 1,
    gap: 4,
  },
  conversationSubject: {
    fontSize: 14,
    fontWeight: "500",
  },
  conversationContext: {
    fontSize: 12,
  },
  conversationPreview: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
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
  },
  metaText: {
    fontSize: 12,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 16,
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
