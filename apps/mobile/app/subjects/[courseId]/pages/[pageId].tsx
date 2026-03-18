import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpenText, ChevronLeft } from "lucide-react-native";
import {
  getCoursePage,
  getSubjectShellData,
  formatSubjectName,
  getSubjectColorPalette,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { RichText } from "../../../../src/components/rich-text";
import { useAsyncResource } from "../../../../src/hooks/use-async-resource";
import { formatDueDateShort } from "../../../../src/lib/format";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

export default function PageDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; pageId: string }>();
  const courseId = Number(params.courseId);
  const pageId = String(params.pageId);
  const { config } = useCanvasSession();
  const { resolvedTheme, triggerSelectionHaptic } = useAppPreferences();

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      card: isDark ? "#0f172a" : "#ffffff",
      muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      primary: isDark ? "#f8fafc" : "#0f172a",
    };
  }, [resolvedTheme]);

  const loadData = useCallback(async () => {
    const [shell, page] = await Promise.all([
      getSubjectShellData(courseId, config!),
      getCoursePage(courseId, pageId, config!),
    ]);
    return { course: shell.course, page };
  }, [config, courseId, pageId]);

  const { data, error, loading, reload } = useAsyncResource(loadData, [config, courseId, pageId], config != null);

  const course = data?.course;
  const page = data?.page;
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {loading ? <LoadingState label="Loading page..." /> : null}
            {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
            
            {!loading && !error && course && page ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      router.push(`/subjects/${courseId}`);
                    }}
                    style={styles.backButton}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to subject</Text>
                  </Pressable>
                </View>

                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <BookOpenText size={20} color={palette.color} />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={[styles.pageTitle, { color: colors.foreground }]} numberOfLines={2}>
                          {page.title ?? "Untitled page"}
                        </Text>
                        <Pressable onPress={() => router.push(`/subjects/${courseId}`)}>
                          <Text style={[styles.courseLink, { color: colors.mutedForeground }]}>
                            {formatSubjectName(course.name)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.badges}>
                      {page.front_page && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.foreground }]}>Front page</Text>
                        </View>
                      )}
                      {page.updated_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            Updated {formatDueDateShort(page.updated_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Page Content Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Page content</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <RichText currentCourseId={courseId} html={page.body || "<p>No content available for this page.</p>"} providerUrl={config?.apiBase} />
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerTop: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  courseLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    padding: 16,
  },
});
