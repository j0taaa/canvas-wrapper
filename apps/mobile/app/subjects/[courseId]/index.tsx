import { useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  CircleDot,
  LockKeyhole,
} from "lucide-react-native";
import {
  appendSubjectRouteContext,
  createCourseGroup,
  formatGroupJoinLevel,
  getSubjectColorPalette,
  t,
  type SubjectRouteContext,
} from "@canvas/shared";
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  PlaceholderBlock,
  RequireCanvasConfig,
  SectionCard,
} from "../../../src/components/app-ui";
import { SplitPaneScrollLayout } from "../../../src/components/split-pane-scroll-layout";
import { TwoPaneLayout } from "../../../src/components/two-pane-layout";
import { useRefreshControl } from "../../../src/hooks/use-refresh-control";
import { useTabletLayout } from "../../../src/hooks/use-tablet-layout";
import { RestorableScrollView } from "../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../src/components/subject-layout";
import { UserAvatar } from "../../../src/components/user-avatar";
import { useSubject } from "../../../src/hooks/use-canvas-queries";
import { useAppPreferences } from "../../../src/providers/app-preferences";
import { openAppHref } from "../../../src/lib/navigation";
import { formatDueDateShort } from "../../../src/lib/format";

const SUBJECT_TABS = ["modules", "assignments", "grades", "people", "forums", "files"] as const;
type SubjectTab = typeof SUBJECT_TABS[number];
type PeopleSubtab = "people" | "groups";

function normalizeTab(value?: string): SubjectTab {
  return SUBJECT_TABS.includes(value as SubjectTab) ? (value as SubjectTab) : "modules";
}

function resolveResponsiveTab(tab: SubjectTab, isTabletLandscape: boolean) {
  return isTabletLandscape && tab === "assignments" ? "modules" : tab;
}

function normalizePeopleSubtab(value?: string): PeopleSubtab {
  return value === "groups" ? "groups" : "people";
}

function getModuleHref(courseId: number, item: {
  content_id?: number;
  html_url?: string;
  page_url?: string;
  type?: string;
  url?: string;
}, context?: SubjectRouteContext) {
  if (item.type === "Assignment" && item.content_id) {
    return appendSubjectRouteContext(`/subjects/${courseId}/assignments/${item.content_id}`, context);
  }
  if (item.type === "Page" && item.page_url) {
    return appendSubjectRouteContext(`/subjects/${courseId}/pages/${encodeURIComponent(item.page_url)}`, context);
  }
  if (item.type === "Quiz" && item.content_id) {
    return appendSubjectRouteContext(`/subjects/${courseId}/quizzes/${item.content_id}`, context);
  }
  if (item.type === "File" && item.content_id) {
    return appendSubjectRouteContext(`/subjects/${courseId}/files/${item.content_id}`, context);
  }
  return appendSubjectRouteContext(item.html_url ?? item.url ?? "", context) || null;
}

function getGradeTrendPoints(assignments: Array<{
  due_at?: string;
  points_possible?: number;
  submission?: { score?: number };
}>) {
  const items = assignments
    .filter((a) => a.points_possible && a.points_possible > 0 && a.submission?.score != null)
    .map((a) => ({
      date: a.due_at ?? "",
      percentage: Math.max(0, Math.min(100, ((a.submission?.score ?? 0) / (a.points_possible ?? 1)) * 100)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (items.length === 0) return [];

  const width = 240;
  const height = 96;
  const paddingX = 10;
  const paddingY = 10;

  return items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : paddingX + (index / (items.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (item.percentage / 100) * (height - paddingY * 2);
    return { ...item, x, y };
  });
}

function buildTrendPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function formatMetricNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export default function SubjectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; peopleView?: string; tab?: string }>();
  const courseId = Number(params.courseId);
  const { resolvedLocale, resolvedTheme, subjectPreferences } = useAppPreferences();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);
  const { isTabletLandscape } = useTabletLayout();
  const activeTab = resolveResponsiveTab(normalizeTab(params.tab), isTabletLandscape);
  const activePeopleView = normalizePeopleSubtab(params.peopleView);

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
      badgeBorder: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.15)",
      successBg: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)",
      successText: isDark ? "#34d399" : "#059669",
    };
  }, [resolvedTheme]);

  const { data, error, isLoading, isFetching, refetch } = useSubject(courseId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);

  const course = data?.shell.course;
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name, subjectPreferences.colors[course.id]);
  }, [course, subjectPreferences.colors]);

  const gradeData = data?.grades;
  const totalDistributedPoints = gradeData?.assignments.reduce((sum: number, a: {points_possible?: number}) => sum + (a.points_possible ?? 0), 0) ?? 0;
  const absolutePoints = gradeData?.assignments.reduce((sum: number, a: {submission?: {score?: number}}) => sum + (a.submission?.score ?? 0), 0) ?? 0;
  const gradePercentage = gradeData?.enrollment?.grades?.current_score ?? (totalDistributedPoints > 0 ? (absolutePoints / totalDistributedPoints) * 100 : null);
  const gradeTrendPoints = getGradeTrendPoints(gradeData?.assignments ?? []);
  const gradeTrendPath = buildTrendPath(gradeTrendPoints);
  const showColdLoading = isLoading && !course && !data && !error;
  const showBlockingError = !!error && !course && !data;
  const showInlineRefresh = !!course && !!data && (isFetching || isLoading);
  const shouldUseSplitScrollLayout =
    isTabletLandscape && !!course && !!data && (activeTab === "modules" || activeTab === "assignments" || activeTab === "grades");
  const activeContext = useMemo<SubjectRouteContext>(() => {
    if (activeTab === "people") {
      return activePeopleView === "groups"
        ? { peopleView: "groups", tab: "people" }
        : { tab: "people" };
    }

    return { tab: activeTab };
  }, [activePeopleView, activeTab]);

  return (
    <RequireCanvasConfig>
      <AppScreen contentStyle={styles.screenContent} scroll={false}>
        {shouldUseSplitScrollLayout ? (
          <View style={styles.splitScreenShell}>
            <SubjectLayoutHeader />
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "subjects.loadingSubject")} /> : null}

            {course && data ? (
              <View style={[styles.container, styles.splitScreenBody]}>
                {/* Modules/Assignments Tab */}
                {(activeTab === "modules" || activeTab === "assignments") && (
                  isTabletLandscape ? (
                    <SplitPaneScrollLayout
                      enabled
                      leading={{
                        content: (
                          <View style={[styles.sectionStack, styles.paneCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <View style={[styles.paneHeader, { borderBottomColor: colors.border }]}>
                              <Text style={[styles.paneTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.modules")}</Text>
                              <Text style={[styles.paneSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.lessonsAndMaterials")}</Text>
                            </View>
                            <View style={styles.paneContent}>
                              {data.content.modules.length === 0 ? (
                                <EmptyState label={t(resolvedLocale, "subjects.noModules")} />
                              ) : (
                                data.content.modules.map((module) => (
                                  <View key={module.id} style={[styles.moduleCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                                    <View style={styles.moduleHeader}>
                                      <View style={styles.moduleTitleSection}>
                                        <Text style={[styles.moduleName, { color: colors.foreground }]} numberOfLines={1}>
                                          {module.name}
                                        </Text>
                                        <Text style={[styles.moduleSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.courseMaterials")}</Text>
                                      </View>
                                      <View style={[styles.itemCountBadge, { borderColor: colors.badgeBorder }]}>
                                        <Text style={[styles.itemCountText, { color: colors.mutedForeground }]}>
                                          {t(resolvedLocale, "subjects.itemsCount", { count: module.items_count ?? module.items?.length ?? 0 })}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={styles.moduleItems}>
                                      {module.items?.slice(0, 12).map((item) => {
                                        const itemHref = getModuleHref(courseId, item, activeContext);
                                        const isSubHeader = item.type === "SubHeader";

                                        if (isSubHeader) {
                                          return (
                                            <View
                                              key={item.id}
                                              style={[styles.subHeaderItem, { borderColor: colors.border, backgroundColor: colors.muted }]}
                                            >
                                              <View style={styles.subHeaderContent}>
                                                <View style={[styles.itemDot, { backgroundColor: palette.borderColor }]} />
                                                <Text style={[styles.subHeaderTitle, { color: colors.foreground }]} numberOfLines={1}>
                                                  {item.title ?? t(resolvedLocale, "subjects.section")}
                                                </Text>
                                              </View>
                                            </View>
                                          );
                                        }

                                        return (
                                          <Pressable
                                            key={item.id}
                                            onPress={() => itemHref && void openAppHref(router, itemHref)}
                                            disabled={!itemHref}
                                            style={({ pressed }) => [
                                              styles.moduleItem,
                                              { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
                                            ]}
                                          >
                                            <View style={styles.moduleItemContent}>
                                              <View style={[styles.itemDot, { backgroundColor: palette.borderColor }]} />
                                              <View style={styles.itemTextSection}>
                                                <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                                                  {item.title ?? t(resolvedLocale, "subjects.untitledItem")}
                                                </Text>
                                                <Text style={[styles.itemType, { color: colors.mutedForeground }]}>
                                                  {item.type ?? t(resolvedLocale, "subjects.content")}
                                                </Text>
                                              </View>
                                            </View>
                                            {item.completion_requirement?.completed && (
                                              <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                                <Text style={[styles.doneBadgeText, { color: colors.successText }]}>{t(resolvedLocale, "calendar.done")}</Text>
                                              </View>
                                            )}
                                          </Pressable>
                                        );
                                      })}
                                    </View>
                                  </View>
                                ))
                              )}
                            </View>
                          </View>
                        ),
                        contentContainerStyle: styles.splitPaneContent,
                        refreshControl: (
                          <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.mutedForeground}
                          />
                        ),
                        storageKey: "subject-modules-pane",
                      }}
                      leadingFlex={1.1}
                      leadingStyle={styles.primaryPane}
                      trailing={{
                        content: (
                          <View style={[styles.sectionStack, styles.paneCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <View style={[styles.paneHeader, { borderBottomColor: colors.border }]}>
                              <Text style={[styles.paneTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.assignments")}</Text>
                              <Text style={[styles.paneSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.upcomingAndRecentWork")}</Text>
                            </View>
                            <View style={styles.paneContent}>
                              {data.content.assignments.length === 0 ? (
                                <EmptyState label={t(resolvedLocale, "subjects.noAssignments")} />
                              ) : (
                                data.content.assignments.map((assignment) => {
                                  const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");

                                  return (
                                    <Pressable
                                      key={assignment.id}
                                      onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, activeContext))}
                                      style={[styles.assignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                                    >
                                      <View style={styles.assignmentContent}>
                                        <View style={styles.assignmentHeader}>
                                          <View style={styles.assignmentTitleSection}>
                                            <CircleDot size={16} color={colors.mutedForeground} />
                                            <Text style={[styles.assignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                              {assignment.name}
                                            </Text>
                                          </View>
                                          {isCompleted && (
                                            <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                              <Text style={[styles.doneBadgeText, { color: colors.successText }]}>{t(resolvedLocale, "calendar.done")}</Text>
                                            </View>
                                          )}
                                        </View>
                                        <Text style={[styles.assignmentDue, { color: colors.mutedForeground }]}>
                                          {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}
                                        </Text>
                                        <Text style={[styles.assignmentPoints, { color: colors.mutedForeground }]}>
                                          {assignment.points_possible != null ? t(resolvedLocale, "subjects.points", { count: assignment.points_possible }) : t(resolvedLocale, "subjects.noPointsListed")}
                                        </Text>
                                      </View>
                                    </Pressable>
                                  );
                                })
                              )}
                            </View>
                          </View>
                        ),
                        contentContainerStyle: styles.splitPaneContent,
                        storageKey: "subject-assignments-pane",
                      }}
                      trailingFlex={0.9}
                      trailingStyle={styles.secondaryPane}
                    />
                  ) : null
                )}

                {/* Grades Tab */}
                {activeTab === "grades" && data && (
                  <View style={styles.gradesContainer}>
                    <SplitPaneScrollLayout
                      enabled
                      leading={{
                        content: (
                          <View style={styles.gradesGrid}>
                            <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                              <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.gradePercent")}</Text>
                              <Text style={[styles.metricValue, { color: colors.foreground }]}>
                                {gradePercentage != null ? `${formatMetricNumber(gradePercentage)}%` : "--"}
                              </Text>
                              <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.overallPercentage")}</Text>
                            </View>
                            <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                              <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.absolute")}</Text>
                              <Text style={[styles.metricValue, { color: colors.foreground }]}>
                                {formatMetricNumber(absolutePoints)}
                              </Text>
                              <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.totalPointsEarned")}</Text>
                            </View>
                            <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                              <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.trend")}</Text>
                              <View style={styles.trendChart}>
                                {gradeTrendPoints.length > 1 ? (
                                  <View style={styles.chartContainer}>
                                    <View style={styles.chartLine} />
                                    <View style={styles.chartLineMiddle} />
                                    <View style={styles.chartLineBottom} />
                                    <View style={[styles.trendLine, { backgroundColor: palette.borderColor }]} />
                                    {gradeTrendPoints.map((point, index) => (
                                      <View
                                        key={index}
                                        style={[
                                          styles.trendPoint,
                                          {
                                            left: point.x,
                                            bottom: point.y,
                                            backgroundColor: index === gradeTrendPoints.length - 1 ? palette.color : palette.borderColor,
                                            width: index === gradeTrendPoints.length - 1 ? 8 : 6,
                                            height: index === gradeTrendPoints.length - 1 ? 8 : 6,
                                          },
                                        ]}
                                      />
                                    ))}
                                  </View>
                                ) : (
                                  <Text style={[styles.noTrendText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.notEnoughGradedActivities")}</Text>
                                )}
                              </View>
                            </View>
                          </View>
                        ),
                        contentContainerStyle: styles.splitPaneContent,
                        refreshControl: (
                          <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.mutedForeground}
                          />
                        ),
                        scroll: false,
                        storageKey: "subject-grades-summary-pane",
                      }}
                      leadingFlex={0.85}
                      leadingStyle={styles.primaryPane}
                      trailing={{
                        content: (
                          <SectionCard density="compact" title={t(resolvedLocale, "subjects.assignmentGrades")} subtitle={t(resolvedLocale, "subjects.scoresAndSubmissionStatus")}>
                            {data.grades.assignments.length === 0 ? (
                              <EmptyState label={t(resolvedLocale, "subjects.noGradeData")} />
                            ) : (
                              data.grades.assignments.map((assignment) => {
                                const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");

                                return (
                                  <Pressable
                                    key={assignment.id}
                                    onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, { tab: "grades" }))}
                                    style={[styles.gradeAssignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                                  >
                                    <View style={styles.gradeAssignmentContent}>
                                      <Text style={[styles.gradeAssignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                        {assignment.name}
                                      </Text>
                                      <Text style={[styles.gradeAssignmentDue, { color: colors.mutedForeground }]}>
                                        {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}
                                      </Text>
                                    </View>
                                    <View style={styles.gradeAssignmentScore}>
                                      <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                                        {assignment.submission?.grade ?? (assignment.submission?.score != null ? String(assignment.submission.score) : "--")}
                                      </Text>
                                      <Text style={[styles.scoreTotal, { color: colors.mutedForeground }]}>
                                        {assignment.points_possible != null ? `of ${assignment.points_possible}` : t(resolvedLocale, "subjects.noPointsListed")}
                                      </Text>
                                    </View>
                                  </Pressable>
                                );
                              })
                            )}
                          </SectionCard>
                        ),
                        contentContainerStyle: styles.splitPaneContent,
                        storageKey: "subject-grades-list-pane",
                      }}
                      trailingFlex={1.15}
                      trailingStyle={styles.secondaryPane}
                    />
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : (
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
            <SubjectLayoutHeader />
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "subjects.loadingSubject")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}

            {course && data ? (
              <View style={styles.container}>
              {/* Modules/Assignments Tab */}
              {(activeTab === "modules" || activeTab === "assignments") && (
                isTabletLandscape ? (
                  <SplitPaneScrollLayout
                    enabled
                    leading={{
                      content: (
                        <View style={[styles.sectionStack, styles.paneCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <View style={[styles.paneHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.paneTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.modules")}</Text>
                            <Text style={[styles.paneSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.lessonsAndMaterials")}</Text>
                          </View>
                          <View style={styles.paneContent}>
                            {data.content.modules.length === 0 ? (
                              <EmptyState label={t(resolvedLocale, "subjects.noModules")} />
                            ) : (
                              data.content.modules.map((module) => (
                                <View key={module.id} style={[styles.moduleCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                                  <View style={styles.moduleHeader}>
                                    <View style={styles.moduleTitleSection}>
                                      <Text style={[styles.moduleName, { color: colors.foreground }]} numberOfLines={1}>
                                        {module.name}
                                      </Text>
                                      <Text style={[styles.moduleSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.courseMaterials")}</Text>
                                    </View>
                                    <View style={[styles.itemCountBadge, { borderColor: colors.badgeBorder }]}>
                                      <Text style={[styles.itemCountText, { color: colors.mutedForeground }]}>
                                        {t(resolvedLocale, "subjects.itemsCount", { count: module.items_count ?? module.items?.length ?? 0 })}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.moduleItems}>
                                    {module.items?.slice(0, 12).map((item) => {
                                      const itemHref = getModuleHref(courseId, item, activeContext);
                                      const isSubHeader = item.type === "SubHeader";
                                      
                                      if (isSubHeader) {
                                        return (
                                          <View
                                            key={item.id}
                                            style={[styles.subHeaderItem, { borderColor: colors.border, backgroundColor: colors.muted }]}
                                          >
                                            <View style={styles.subHeaderContent}>
                                              <View style={[styles.itemDot, { backgroundColor: palette.borderColor }]} />
                                              <Text style={[styles.subHeaderTitle, { color: colors.foreground }]} numberOfLines={1}>
                                                {item.title ?? t(resolvedLocale, "subjects.section")}
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      }
                                      
                                      return (
                                        <Pressable
                                          key={item.id}
                                          onPress={() => itemHref && void openAppHref(router, itemHref)}
                                          disabled={!itemHref}
                                          style={({ pressed }) => [
                                            styles.moduleItem,
                                            { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
                                          ]}
                                        >
                                          <View style={styles.moduleItemContent}>
                                            <View style={[styles.itemDot, { backgroundColor: palette.borderColor }]} />
                                            <View style={styles.itemTextSection}>
                                              <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                                                {item.title ?? t(resolvedLocale, "subjects.untitledItem")}
                                              </Text>
                                              <Text style={[styles.itemType, { color: colors.mutedForeground }]}>
                                                {item.type ?? t(resolvedLocale, "subjects.content")}
                                              </Text>
                                            </View>
                                          </View>
                                          {item.completion_requirement?.completed && (
                                            <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                              <Text style={[styles.doneBadgeText, { color: colors.successText }]}>{t(resolvedLocale, "calendar.done")}</Text>
                                            </View>
                                          )}
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                </View>
                              ))
                            )}
                          </View>
                        </View>
                      ),
                      contentContainerStyle: styles.splitPaneContent,
                      refreshControl: (
                        <RefreshControl
                          refreshing={refreshing}
                          onRefresh={onRefresh}
                          tintColor={colors.mutedForeground}
                        />
                      ),
                      storageKey: "subject-modules-pane",
                    }}
                    leadingFlex={1.1}
                    leadingStyle={styles.primaryPane}
                    trailing={{
                      content: (
                        <View style={[styles.sectionStack, styles.paneCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <View style={[styles.paneHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.paneTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.assignments")}</Text>
                            <Text style={[styles.paneSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.upcomingAndRecentWork")}</Text>
                          </View>
                          <View style={styles.paneContent}>
                            {data.content.assignments.length === 0 ? (
                              <EmptyState label={t(resolvedLocale, "subjects.noAssignments")} />
                            ) : (
                              data.content.assignments.map((assignment) => {
                                const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                                
                                return (
                                  <Pressable
                                    key={assignment.id}
                                    onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, activeContext))}
                                    style={[styles.assignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                                  >
                                    <View style={styles.assignmentContent}>
                                      <View style={styles.assignmentHeader}>
                                        <View style={styles.assignmentTitleSection}>
                                          <CircleDot size={16} color={colors.mutedForeground} />
                                          <Text style={[styles.assignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                            {assignment.name}
                                          </Text>
                                        </View>
                                        {isCompleted && (
                                          <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                            <Text style={[styles.doneBadgeText, { color: colors.successText }]}>{t(resolvedLocale, "calendar.done")}</Text>
                                          </View>
                                        )}
                                      </View>
                                      <Text style={[styles.assignmentDue, { color: colors.mutedForeground }]}>
                                        {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}
                                      </Text>
                                      <Text style={[styles.assignmentPoints, { color: colors.mutedForeground }]}>
                                        {assignment.points_possible != null ? t(resolvedLocale, "subjects.points", { count: assignment.points_possible }) : t(resolvedLocale, "subjects.noPointsListed")}
                                      </Text>
                                    </View>
                                  </Pressable>
                                );
                              })
                            )}
                          </View>
                        </View>
                      ),
                      contentContainerStyle: styles.splitPaneContent,
                      storageKey: "subject-assignments-pane",
                    }}
                    trailingFlex={0.9}
                    trailingStyle={styles.secondaryPane}
                  />
                ) : (
                  <View style={styles.twoColumnGrid}>
                    {activeTab !== "assignments" ? (
                      <View style={styles.sectionStack}>
                        {data.content.modules.length === 0 ? (
                          <EmptyState label={t(resolvedLocale, "subjects.noModules")} />
                        ) : (
                          data.content.modules.map((module) => (
                            <View key={module.id} style={[styles.moduleCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                              <View style={styles.moduleHeader}>
                                <View style={styles.moduleTitleSection}>
                                  <Text style={[styles.moduleName, { color: colors.foreground }]} numberOfLines={1}>
                                    {module.name}
                                  </Text>
                                  <Text style={[styles.moduleSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.courseMaterials")}</Text>
                                </View>
                                <View style={[styles.itemCountBadge, { borderColor: colors.badgeBorder }]}>
                                  <Text style={[styles.itemCountText, { color: colors.mutedForeground }]}>
                                    {t(resolvedLocale, "subjects.itemsCount", { count: module.items_count ?? module.items?.length ?? 0 })}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.moduleItems}>
                                {module.items?.slice(0, 12).map((item) => {
                                  const itemHref = getModuleHref(courseId, item, activeContext);
                                  const isSubHeader = item.type === "SubHeader";
                                  
                                  if (isSubHeader) {
                                    return (
                                      <View
                                        key={item.id}
                                        style={[styles.subHeaderItem, { borderColor: colors.border, backgroundColor: colors.muted }]}
                                      >
                                        <View style={styles.subHeaderContent}>
                                          <View style={[styles.itemDot, { backgroundColor: palette.borderColor }]} />
                                          <Text style={[styles.subHeaderTitle, { color: colors.foreground }]} numberOfLines={1}>
                                            {item.title ?? t(resolvedLocale, "subjects.section")}
                                          </Text>
                                        </View>
                                      </View>
                                    );
                                  }
                                  
                                  return (
                                    <Pressable
                                      key={item.id}
                                      onPress={() => itemHref && void openAppHref(router, itemHref)}
                                      disabled={!itemHref}
                                      style={({ pressed }) => [
                                        styles.moduleItem,
                                        { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
                                      ]}
                                    >
                                      <View style={styles.moduleItemContent}>
                                        <View style={[styles.itemDot, { backgroundColor: palette.borderColor }]} />
                                        <View style={styles.itemTextSection}>
                                          <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                                            {item.title ?? t(resolvedLocale, "subjects.untitledItem")}
                                          </Text>
                                          <Text style={[styles.itemType, { color: colors.mutedForeground }]}>
                                            {item.type ?? t(resolvedLocale, "subjects.content")}
                                          </Text>
                                        </View>
                                      </View>
                                      {item.completion_requirement?.completed && (
                                        <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                          <Text style={[styles.doneBadgeText, { color: colors.successText }]}>{t(resolvedLocale, "calendar.done")}</Text>
                                        </View>
                                      )}
                                    </Pressable>
                                  );
                                })}
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    ) : null}
                    {activeTab !== "modules" ? (
                      <View style={styles.sectionStack}>
                        {data.content.assignments.length === 0 ? (
                          <EmptyState label={t(resolvedLocale, "subjects.noAssignments")} />
                        ) : (
                          data.content.assignments.map((assignment) => {
                            const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                            
                            return (
                              <Pressable
                                key={assignment.id}
                                onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, activeContext))}
                                style={[styles.assignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                              >
                                <View style={styles.assignmentContent}>
                                  <View style={styles.assignmentHeader}>
                                    <View style={styles.assignmentTitleSection}>
                                      <CircleDot size={16} color={colors.mutedForeground} />
                                      <Text style={[styles.assignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                        {assignment.name}
                                      </Text>
                                    </View>
                                    {isCompleted && (
                                      <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                        <Text style={[styles.doneBadgeText, { color: colors.successText }]}>{t(resolvedLocale, "calendar.done")}</Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={[styles.assignmentDue, { color: colors.mutedForeground }]}>
                                    {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}
                                  </Text>
                                  <Text style={[styles.assignmentPoints, { color: colors.mutedForeground }]}>
                                    {assignment.points_possible != null ? t(resolvedLocale, "subjects.points", { count: assignment.points_possible }) : t(resolvedLocale, "subjects.noPointsListed")}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        )}
                      </View>
                    ) : null}
                  </View>
                )
              )}

              {/* Grades Tab */}
              {activeTab === "grades" && data && (
                <View style={styles.gradesContainer}>
                  {isTabletLandscape ? (
                    <SplitPaneScrollLayout
                      enabled
                      leading={{
                        content: (
                          <View style={styles.gradesGrid}>
                            <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                              <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.gradePercent")}</Text>
                              <Text style={[styles.metricValue, { color: colors.foreground }]}>
                                {gradePercentage != null ? `${formatMetricNumber(gradePercentage)}%` : "--"}
                              </Text>
                              <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.overallPercentage")}</Text>
                            </View>
                            <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                              <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.absolute")}</Text>
                              <Text style={[styles.metricValue, { color: colors.foreground }]}>
                                {formatMetricNumber(absolutePoints)}
                              </Text>
                              <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.totalPointsEarned")}</Text>
                            </View>
                            <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                              <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.trend")}</Text>
                              <View style={styles.trendChart}>
                                {gradeTrendPoints.length > 1 ? (
                                  <View style={styles.chartContainer}>
                                    <View style={styles.chartLine} />
                                    <View style={styles.chartLineMiddle} />
                                    <View style={styles.chartLineBottom} />
                                    <View style={[styles.trendLine, { backgroundColor: palette.borderColor }]} />
                                    {gradeTrendPoints.map((point, index) => (
                                      <View
                                        key={index}
                                        style={[
                                          styles.trendPoint,
                                          {
                                            left: point.x,
                                            bottom: point.y,
                                            backgroundColor: index === gradeTrendPoints.length - 1 ? palette.color : palette.borderColor,
                                            width: index === gradeTrendPoints.length - 1 ? 8 : 6,
                                            height: index === gradeTrendPoints.length - 1 ? 8 : 6,
                                          },
                                        ]}
                                      />
                                    ))}
                                  </View>
                                ) : (
                                  <Text style={[styles.noTrendText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.notEnoughGradedActivities")}</Text>
                                )}
                              </View>
                            </View>
                          </View>
                        ),
                        contentContainerStyle: styles.splitPaneContent,
                        refreshControl: (
                          <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.mutedForeground}
                          />
                        ),
                        scroll: false,
                        storageKey: "subject-grades-summary-pane",
                      }}
                      leadingFlex={0.85}
                      leadingStyle={styles.primaryPane}
                      trailing={{
                        content: (
                          <SectionCard density="compact" title={t(resolvedLocale, "subjects.assignmentGrades")} subtitle={t(resolvedLocale, "subjects.scoresAndSubmissionStatus")}>
                            {data.grades.assignments.length === 0 ? (
                              <EmptyState label={t(resolvedLocale, "subjects.noGradeData")} />
                            ) : (
                              data.grades.assignments.map((assignment) => {
                                const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                                
                                return (
                                  <Pressable
                                    key={assignment.id}
                                    onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, { tab: "grades" }))}
                                    style={[styles.gradeAssignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                                  >
                                    <View style={styles.gradeAssignmentContent}>
                                      <Text style={[styles.gradeAssignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                        {assignment.name}
                                      </Text>
                                      <Text style={[styles.gradeAssignmentDue, { color: colors.mutedForeground }]}>
                                        {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}
                                      </Text>
                                    </View>
                                    <View style={styles.gradeAssignmentScore}>
                                      <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                                        {assignment.submission?.grade ?? (assignment.submission?.score != null ? String(assignment.submission.score) : "--")}
                                      </Text>
                                      <Text style={[styles.scoreTotal, { color: colors.mutedForeground }]}>
                                        {assignment.points_possible != null ? `of ${assignment.points_possible}` : t(resolvedLocale, "subjects.noPointsListed")}
                                      </Text>
                                    </View>
                                  </Pressable>
                                );
                              })
                            )}
                          </SectionCard>
                        ),
                        contentContainerStyle: styles.splitPaneContent,
                        storageKey: "subject-grades-list-pane",
                      }}
                      trailingFlex={1.15}
                      trailingStyle={styles.secondaryPane}
                    />
                  ) : (
                    <TwoPaneLayout
                      enabled={false}
                      leading={
                        <View style={styles.gradesGrid}>
                        <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.gradePercent")}</Text>
                          <Text style={[styles.metricValue, { color: colors.foreground }]}>
                            {gradePercentage != null ? `${formatMetricNumber(gradePercentage)}%` : "--"}
                          </Text>
                          <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.overallPercentage")}</Text>
                        </View>
                        <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.absolute")}</Text>
                          <Text style={[styles.metricValue, { color: colors.foreground }]}>
                            {formatMetricNumber(absolutePoints)}
                          </Text>
                          <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.totalPointsEarned")}</Text>
                        </View>
                        <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <Text style={[styles.metricTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.trend")}</Text>
                          <View style={styles.trendChart}>
                            {gradeTrendPoints.length > 1 ? (
                              <View style={styles.chartContainer}>
                                <View style={styles.chartLine} />
                                <View style={styles.chartLineMiddle} />
                                <View style={styles.chartLineBottom} />
                                <View style={[styles.trendLine, { backgroundColor: palette.borderColor }]} />
                                {gradeTrendPoints.map((point, index) => (
                                  <View
                                    key={index}
                                    style={[
                                      styles.trendPoint,
                                      {
                                        left: point.x,
                                        bottom: point.y,
                                        backgroundColor: index === gradeTrendPoints.length - 1 ? palette.color : palette.borderColor,
                                        width: index === gradeTrendPoints.length - 1 ? 8 : 6,
                                        height: index === gradeTrendPoints.length - 1 ? 8 : 6,
                                      },
                                    ]}
                                  />
                                ))}
                              </View>
                            ) : (
                              <Text style={[styles.noTrendText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.notEnoughGradedActivities")}</Text>
                            )}
                          </View>
                        </View>
                      </View>
                      }
                      trailing={
                        <SectionCard density="compact" title={t(resolvedLocale, "subjects.assignmentGrades")} subtitle={t(resolvedLocale, "subjects.scoresAndSubmissionStatus")}>
                          {data.grades.assignments.length === 0 ? (
                            <EmptyState label={t(resolvedLocale, "subjects.noGradeData")} />
                          ) : (
                            data.grades.assignments.map((assignment) => {
                              const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                              
                              return (
                                <Pressable
                                  key={assignment.id}
                                  onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, { tab: "grades" }))}
                                  style={[styles.gradeAssignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                                >
                                  <View style={styles.gradeAssignmentContent}>
                                    <Text style={[styles.gradeAssignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                      {assignment.name}
                                    </Text>
                                    <Text style={[styles.gradeAssignmentDue, { color: colors.mutedForeground }]}>
                                      {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}
                                    </Text>
                                  </View>
                                  <View style={styles.gradeAssignmentScore}>
                                    <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                                      {assignment.submission?.grade ?? (assignment.submission?.score != null ? String(assignment.submission.score) : "--")}
                                    </Text>
                                    <Text style={[styles.scoreTotal, { color: colors.mutedForeground }]}>
                                      {assignment.points_possible != null ? `of ${assignment.points_possible}` : t(resolvedLocale, "subjects.noPointsListed")}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })
                          )}
                        </SectionCard>
                      }
                    />
                  )}
                </View>
              )}

              {/* People Tab */}
              {activeTab === "people" && data && (
                <View style={styles.peopleContainer}>
                  <View style={styles.peopleTabs}>
                    <Pressable
                      onPress={() => router.replace({ params: { courseId: String(courseId), tab: "people" }, pathname: "/subjects/[courseId]" })}
                      style={[styles.peopleTab, { borderColor: activePeopleView === "people" ? colors.primary : colors.border }, activePeopleView === "people" && { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.peopleTabText, { color: activePeopleView === "people" ? colors.primaryText : colors.mutedForeground }]}>{t(resolvedLocale, "subjects.people")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.replace({ params: { courseId: String(courseId), peopleView: "groups", tab: "people" }, pathname: "/subjects/[courseId]" })}
                      style={[styles.peopleTab, { borderColor: activePeopleView === "groups" ? colors.primary : colors.border }, activePeopleView === "groups" && { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.peopleTabText, { color: activePeopleView === "groups" ? colors.primaryText : colors.mutedForeground }]}>{t(resolvedLocale, "subjects.groups")}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.sectionStack}>
                    {activePeopleView === "people" ? (
                      data.people.length === 0 && showInlineRefresh ? (
                        <>
                          <PlaceholderBlock height={76} />
                          <PlaceholderBlock height={76} />
                        </>
                      ) : data.people.length === 0 ? (
                        <EmptyState label={t(resolvedLocale, "subjects.noPeople")} />
                      ) : (
                        data.people.map((person) => (
                          <Pressable
                            key={person.id}
                            onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/people/${person.id}`, { tab: "people" }))}
                            style={[styles.personCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                          >
                            <UserAvatar
                              backgroundColor={colors.muted}
                              borderColor={colors.border}
                              fallback={person.name.split(" ").map((name) => name[0]).slice(0, 2).join("").toUpperCase()}
                              name={person.name}
                              size={40}
                              src={person.avatar_url}
                              textColor={colors.foreground}
                              textSize={14}
                            />
                            <View style={styles.personInfo}>
                              <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>{person.name}</Text>
                              <Text style={[styles.personRole, { color: colors.mutedForeground }]} numberOfLines={1}>
                                {person.short_name ?? person.sortable_name ?? t(resolvedLocale, "subjects.canvasUser")}
                              </Text>
                            </View>
                          </Pressable>
                        ))
                      )
                    ) : (
                      data.groups.length === 0 && showInlineRefresh ? (
                        <>
                          <PlaceholderBlock height={88} />
                          <PlaceholderBlock height={88} />
                        </>
                      ) : data.groups.length === 0 ? (
                        <EmptyState label={t(resolvedLocale, "subjects.noGroups")} />
                      ) : (
                        data.groups.map((group) => (
                          <View key={group.id} style={[styles.groupCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}>
                            <View style={styles.groupHeader}>
                              <View style={styles.groupInfo}>
                                <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>{group.name}</Text>
                                <Text style={[styles.groupDescription, { color: colors.mutedForeground }]} numberOfLines={1}>
                                  {group.description || t(resolvedLocale, "subjects.canvasGroup")}
                                </Text>
                              </View>
                              <View style={styles.groupMeta}>
                                <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.members", { count: group.members_count ?? 0 })}</Text>
                                <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>{formatGroupJoinLevel(group.join_level)}</Text>
                              </View>
                            </View>
                            <View style={styles.groupAction}>
                              {group.canOpen ? (
                                <Pressable onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/groups/${group.id}`, { peopleView: "groups", tab: "people" }))} style={styles.groupLink}>
                                  <Text style={[styles.groupLinkText, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.enterGroup")}</Text>
                                  <ArrowRight size={14} color={colors.mutedForeground} />
                                </Pressable>
                              ) : (
                                <View style={styles.groupLocked}>
                                  <LockKeyhole size={14} color={colors.mutedForeground} />
                                  <Text style={[styles.groupLockedText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.locked")}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        ))
                      )
                    )}
                  </View>
                </View>
              )}

              {/* Forums Tab */}
              {activeTab === "forums" && data && (
                <View style={styles.sectionStack}>
                  {data.discussions.length === 0 && showInlineRefresh ? (
                    <>
                      <PlaceholderBlock height={100} />
                      <PlaceholderBlock height={100} />
                    </>
                  ) : data.discussions.length === 0 ? (
                    <EmptyState label={t(resolvedLocale, "subjects.noForums")} />
                  ) : (
                    data.discussions.map((discussion) => (
                      <Pressable
                        key={discussion.id}
                        onPress={() => void openAppHref(router, discussion.html_url)}
                        style={[styles.forumCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                      >
                        <View style={styles.forumContent}>
                          <Text style={[styles.forumTitle, { color: colors.foreground }]} numberOfLines={1}>{discussion.title ?? t(resolvedLocale, "subjects.untitledForum")}</Text>
                          <Text style={[styles.forumMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
                            {discussion.message?.replace(/<[^>]+>/g, " ") ?? t(resolvedLocale, "inbox.noPreview")}
                          </Text>
                          <View style={styles.forumMeta}>
                            <Text style={[styles.forumMetaText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.replies", { count: discussion.discussion_subentry_count ?? 0 })}</Text>
                            {discussion.unread_count != null && (
                              <Text style={[styles.forumMetaText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "subjects.unreadCount", { count: discussion.unread_count })}</Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              {/* Files Tab */}
              {activeTab === "files" && data && (
                <View style={styles.sectionStack}>
                  {data.files.length === 0 && showInlineRefresh ? (
                    <>
                      <PlaceholderBlock height={88} />
                      <PlaceholderBlock height={88} />
                    </>
                  ) : data.files.length === 0 ? (
                    <EmptyState label={t(resolvedLocale, "subjects.noFiles")} />
                  ) : (
                    data.files.map((file) => (
                      <Pressable
                        key={file.id}
                        onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/files/${file.id}`, { tab: "files" }))}
                        style={[styles.fileCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                      >
                        <View style={styles.fileContent}>
                          <View style={styles.fileInfo}>
                            <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                              {file.display_name ?? file.filename ?? t(resolvedLocale, "subjects.untitledFile")}
                            </Text>
                            <Text style={[styles.fileType, { color: colors.mutedForeground }]}>{file["content-type"] ?? t(resolvedLocale, "subjects.files")}</Text>
                          </View>
                          <View style={styles.fileMeta}>
                            <Text style={[styles.fileMetaText, { color: colors.mutedForeground }]}>
                              {file.size != null ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "--"}
                            </Text>
                            <Text style={[styles.fileMetaText, { color: colors.mutedForeground }]}>
                              {formatDueDateShort(file.updated_at ?? file.created_at)}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
            ) : null}
          </RestorableScrollView>
        )}
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    minHeight: 0,
    padding: 0,
  },
  splitScreenShell: {
    flex: 1,
    minHeight: 0,
  },
  splitScreenBody: {
    flex: 1,
    minHeight: 0,
  },
  container: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 12,
  },
  sectionStack: {
    gap: 12,
  },
  twoColumnGrid: {
    gap: 16,
  },
  paneCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  paneHeader: {
    borderBottomWidth: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paneTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  paneSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  paneContent: {
    padding: 12,
  },
  primaryPane: {
    alignSelf: "stretch",
  },
  secondaryPane: {
    alignSelf: "stretch",
  },
  splitPaneContent: {
    paddingBottom: 24,
  },
  moduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  moduleTitleSection: {
    flex: 1,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  moduleSubtitle: {
    fontSize: 12,
  },
  itemCountBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  itemCountText: {
    fontSize: 12,
  },
  moduleItems: {
    gap: 8,
  },
  moduleItem: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subHeaderItem: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  moduleItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTextSection: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
  },
  itemType: {
    fontSize: 12,
    marginTop: 2,
  },
  doneBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  assignmentCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  assignmentContent: {
    gap: 8,
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  assignmentTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  assignmentName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  completedText: {
    textDecorationLine: "line-through",
  },
  assignmentDue: {
    fontSize: 12,
  },
  assignmentPoints: {
    fontSize: 12,
  },
  gradesContainer: {
    gap: 16,
  },
  gradesGrid: {
    gap: 12,
  },
  gradeMetricCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "600",
  },
  metricSubtitle: {
    fontSize: 13,
  },
  trendChart: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  chartContainer: {
    width: "100%",
    height: 80,
    position: "relative",
  },
  chartLine: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  chartLineMiddle: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 48,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chartLineBottom: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 86,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  trendLine: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 48,
    height: 3,
    borderRadius: 2,
  },
  trendPoint: {
    position: "absolute",
    borderRadius: 999,
  },
  noTrendText: {
    fontSize: 13,
  },
  gradeAssignmentCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  gradeAssignmentContent: {
    flex: 1,
    gap: 4,
  },
  gradeAssignmentName: {
    fontSize: 14,
    fontWeight: "500",
  },
  gradeAssignmentDue: {
    fontSize: 12,
  },
  gradeAssignmentScore: {
    alignItems: "flex-end",
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  scoreTotal: {
    fontSize: 12,
  },
  peopleContainer: {
    gap: 16,
  },
  peopleTabs: {
    flexDirection: "row",
    gap: 8,
  },
  peopleTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  peopleTabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  personCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  personRole: {
    fontSize: 12,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 12,
  },
  groupMeta: {
    alignItems: "flex-end",
  },
  groupMetaText: {
    fontSize: 12,
  },
  groupAction: {
    marginTop: 12,
  },
  groupLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  groupLinkText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  groupLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  groupLockedText: {
    fontSize: 12,
  },
  forumCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  forumContent: {
    gap: 8,
  },
  forumTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  forumMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  forumMeta: {
    flexDirection: "row",
    gap: 12,
  },
  forumMetaText: {
    fontSize: 12,
  },
  fileCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  fileContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileType: {
    fontSize: 12,
  },
  fileMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  fileMetaText: {
    fontSize: 12,
  },
});
