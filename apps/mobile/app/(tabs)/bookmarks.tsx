import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { RefreshControl, Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
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
import { readBookmarks, removeBookmark } from "../../src/lib/bookmarks";
import { formatDateTime } from "../../src/lib/format";
import { openAppHref } from "../../src/lib/navigation";
import { queryKeys } from "../../src/lib/query-keys";
import { useAppPreferences } from "../../src/providers/app-preferences";

function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks(),
    queryFn: () => readBookmarks(),
    placeholderData: (previousData) => previousData,
  });
}

export default function BookmarksTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedLocale, resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const { data, error, isLoading, isFetching, refetch } = useBookmarks();
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const colors = {
    foreground: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
    mutedForeground: resolvedTheme === "dark" ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
    card: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
    border: resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
    muted: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.04)",
  };

  const handleRemoveBookmark = async (id: string) => {
    await removeBookmark(id);
    queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks() });
  };

  return (
    <RequireCanvasConfig>
      <AppScreen title={t(resolvedLocale, "bookmarks.title")} subtitle={t(resolvedLocale, "bookmarks.subtitle")}>
        <RestorableScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {showColdLoading ? <LoadingState label={`${t(resolvedLocale, "common.loading")} ${t(resolvedLocale, "bookmarks.title").toLowerCase()}...`} /> : null}
          {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
          {data ? (
            <View style={styles.list}>
              {data.length === 0 ? <EmptyState label={t(resolvedLocale, "bookmarks.empty")} /> : null}
              {data.map((bookmark) => (
                <Pressable
                  key={bookmark.id}
                  onPress={() => {
                    triggerSelectionHaptic();
                    void openAppHref(router, bookmark.href);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.subjectAccent,
                      {
                        backgroundColor: getSubjectColorPalette(
                          bookmark.subjectName,
                          subjectPreferences.colors[bookmark.courseId],
                        ).borderColor,
                      },
                    ]}
                  />
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {bookmark.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.itemMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {formatSubjectName(bookmark.subjectName)}
                      </Text>
                      <View style={[styles.metaDot, { backgroundColor: colors.mutedForeground }]} />
                      <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                        {t(resolvedLocale, `bookmarks.${bookmark.kind}`)}
                      </Text>
                    </View>
                    <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                      {formatDateTime(resolvedLocale, bookmark.savedAt)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={t(resolvedLocale, "bookmarks.removeBookmarkAria", { title: bookmark.title })}
                    onPress={(event) => {
                      event.stopPropagation();
                      triggerSelectionHaptic();
                      void handleRemoveBookmark(bookmark.id);
                    }}
                    style={({ pressed }) => [
                      styles.removeButton,
                      { borderColor: colors.border, backgroundColor: colors.muted },
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <Trash2 size={14} color={colors.mutedForeground} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ) : null}
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemPressed: {
    opacity: 0.86,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  metaDot: {
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  removeButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  subjectAccent: {
    alignSelf: "stretch",
    borderRadius: 999,
    width: 4,
  },
});
