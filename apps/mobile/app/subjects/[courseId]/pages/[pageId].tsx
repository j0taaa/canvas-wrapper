import { useMemo } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpenText, ChevronLeft } from "lucide-react-native";
import {
  formatSubjectName,
  getSubjectColorPalette,
  t,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  PlaceholderBlock,
  LoadingState,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { BookmarkButton } from "../../../../src/components/bookmark-button";
import { RichText } from "../../../../src/components/rich-text";
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { usePage, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDueDateShort } from "../../../../src/lib/format";
import { goBackOrPush } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

export default function PageDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; pageId: string }>();
  const courseId = Number(params.courseId);
  const pageId = String(params.pageId);
  const { config } = useCanvasSession();
  const { resolvedLocale, resolvedTheme, triggerSelectionHaptic } = useAppPreferences();

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

  const { data: shellData } = useCourseShell(courseId);
  const { data: pageData, error, isLoading, isFetching, refetch } = usePage(courseId, pageId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);

  const course = shellData?.course;
  const page = pageData;
  const showColdLoading = isLoading && !course && !page && !error;
  const showBlockingError = !!error && !course && !page;
  const showInlineRefresh = !!course && !!page && (isFetching || isLoading);
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  return (
    <RequireCanvasConfig>
      <AppScreen contentStyle={styles.screenContent} scroll={false}>
        <RestorableScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.mutedForeground}
            />
          }
        >
          <View style={styles.container}>
            <SubjectLayoutHeader />
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "subjects.loadingPage")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {course && page ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    accessibilityLabel={t(resolvedLocale, "subjects.backToSubject")}
                    accessibilityRole="button"
                    onPress={() => {
                      triggerSelectionHaptic();
                      goBackOrPush(router, `/subjects/${courseId}`);
                    }}
                    style={[styles.backButton, { borderColor: colors.border }]}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                  </Pressable>
                  {course && page ? (
                    <BookmarkButton
                      bookmark={{
                        courseId,
                        href: `/subjects/${courseId}/pages/${encodeURIComponent(pageId)}`,
                        id: `page-${courseId}-${pageId}`,
                        kind: "page",
                        subjectName: course.name,
                        title: page.title ?? t(resolvedLocale, "subjects.untitledPage"),
                      }}
                      borderColor={colors.border}
                      fillColor={colors.foreground}
                      mutedColor={colors.mutedForeground}
                      textColor={colors.foreground}
                    />
                  ) : null}
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
                          {page.title ?? t(resolvedLocale, "subjects.untitledPage")}
                        </Text>
                        <Pressable onPress={() => goBackOrPush(router, `/subjects/${courseId}`)}>
                          <Text style={[styles.courseLink, { color: colors.mutedForeground }]}>
                            {formatSubjectName(course.name)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.badges}>
                      {page.front_page && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.frontPage")}</Text>
                        </View>
                      )}
                      {page.updated_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {t(resolvedLocale, "common.updated")} {formatDueDateShort(resolvedLocale, page.updated_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Page Content Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.pageContent")}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {page.body ? (
                      <RichText currentCourseId={courseId} html={page.body} providerUrl={config?.apiBase} />
                    ) : showInlineRefresh ? (
                      <>
                        <PlaceholderBlock height={84} />
                        <PlaceholderBlock height={144} />
                      </>
                    ) : (
                      <RichText currentCourseId={courseId} html={`<p>${t(resolvedLocale, "subjects.noPageContent")}</p>`} providerUrl={config?.apiBase} />
                    )}
                  </View>
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
  screenContent: {
    padding: 0,
  },
  container: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 12,
  },
  navBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerTop: {
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    padding: 14,
  },
});
