import { useMemo } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpenText } from "lucide-react-native";
import {
  buildSubjectHref,
  formatSubjectName,
  getSubjectRouteContext,
  getSubjectContentNavigation,
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
import { SubjectContentPagination } from "../../../../src/components/subject-content-pagination";
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { useCourseContent, useCourseFiles, usePage, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDueDateShort } from "../../../../src/lib/format";
import { goBackOrPush } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

export default function PageDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; pageId: string; peopleView?: string; tab?: string }>();
  const courseId = Number(params.courseId);
  const pageId = String(params.pageId);
  const originContext = useMemo(() => getSubjectRouteContext(params.tab, params.peopleView), [params.peopleView, params.tab]);
  const subjectHref = useMemo(() => buildSubjectHref(courseId, originContext ?? { tab: "modules" }), [courseId, originContext]);
  const { config } = useCanvasSession();
  const { resolvedLocale, resolvedTheme, triggerSelectionHaptic } = useAppPreferences();

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
    };
  }, [resolvedTheme]);

  const { data: shellData } = useCourseShell(courseId);
  const { data: courseContent } = useCourseContent(courseId);
  const { data: courseFiles } = useCourseFiles(courseId);
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
  const navigation = useMemo(() => {
    if (!courseContent) {
      return null;
    }

    return getSubjectContentNavigation(courseId, courseContent, courseFiles ?? [], {
      identifier: pageId,
      kind: "page",
    }, originContext);
  }, [courseContent, courseFiles, courseId, originContext, pageId]);

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
                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <BookOpenText size={20} color={palette.color} />
                      </View>
                      <View style={styles.headerText}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.pageTitle, { color: colors.foreground }]} numberOfLines={2}>
                            {page.title ?? t(resolvedLocale, "subjects.untitledPage")}
                          </Text>
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
                        </View>
                        <Pressable onPress={() => goBackOrPush(router, subjectHref)}>
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

                <SubjectContentPagination
                  colors={colors}
                  locale={resolvedLocale}
                  next={navigation?.next ?? null}
                  previous={navigation?.previous ?? null}
                  router={router}
                />
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
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
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
