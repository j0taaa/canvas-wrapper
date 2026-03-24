import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Globe,
  Landmark,
  PenSquare,
  Sigma,
} from "lucide-react-native";
import {
  DISPLAY_TIME_ZONE,
  formatSubjectName,
  getSubjectColorPalette,
  orderSubjectsByPreference,
  t,
  type CanvasCourse,
  type CanvasDashboardData,
} from "@canvas/shared";
import { EmptyState, ErrorState, LoadingState, RequireCanvasConfig } from "../../src/components/app-ui";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useDashboard } from "../../src/hooks/use-canvas-queries";
import { syncDeviceIntegrations } from "../../src/lib/device-integration-sync";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { useCanvasSession } from "../../src/providers/canvas-session";

type DashboardColors = ReturnType<typeof getDashboardColors>;

export default function DashboardTab() {
  return (
    <RequireCanvasConfig>
      <DashboardScreen />
    </RequireCanvasConfig>
  );
}

function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { config } = useCanvasSession();
  const { resolvedLocale, resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const colors = useMemo(() => getDashboardColors(resolvedTheme), [resolvedTheme]);
  const [showPastCourses, setShowPastCourses] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useDashboard();
  const { onRefresh, refreshing } = useRefreshControl(async () => {
    await refetch();

    if (config) {
      await syncDeviceIntegrations({
        config,
        queryClient,
        reason: "dashboard-refresh",
      });
    }
  });
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);

  const visibleCourses = useMemo(
    () =>
      data
        ? orderSubjectsByPreference(
            data.courses.filter((course) => !subjectPreferences.hiddenCourseIds.includes(course.id)),
            subjectPreferences.orderedCourseIds,
          )
        : [],
    [data, subjectPreferences.hiddenCourseIds, subjectPreferences.orderedCourseIds],
  );

  const visiblePastCourses = useMemo(
    () =>
      data?.pastCourses.filter((course) => !subjectPreferences.hiddenCourseIds.includes(course.id)) ?? [],
    [data?.pastCourses, subjectPreferences.hiddenCourseIds],
  );

  const visibleTodo = useMemo(
    () =>
      data?.todo.filter(
        (item) =>
          !item.assignment?.course_id || !subjectPreferences.hiddenCourseIds.includes(item.assignment.course_id),
      ) ?? [],
    [data?.todo, subjectPreferences.hiddenCourseIds],
  );
  const isCompactMobileSubjectGrid = subjectPreferences.compactMobileDashboardSubjects;

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <RestorableScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.subtleText}
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t(resolvedLocale, "dashboard.subjects")}</Text>
            {data && data.pastCourses.length > 0 ? (
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  setShowPastCourses((current) => !current);
                }}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Text style={[styles.sectionAction, { color: colors.subtleText }]}>
                  {showPastCourses ? t(resolvedLocale, "dashboard.hideOldSubjects") : t(resolvedLocale, "dashboard.showOldSubjects")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {showColdLoading ? <LoadingState label={t(resolvedLocale, "dashboard.title")} /> : null}
          {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}

          {data ? (
            <View style={styles.subjectList}>
              {visibleCourses.length === 0 ? (
                <EmptyState label={t(resolvedLocale, "dashboard.noActiveSubjects")} />
              ) : (
                <View style={isCompactMobileSubjectGrid ? styles.subjectGrid : styles.subjectList}>
                  {visibleCourses.map((course) => (
                    <SubjectCard
                      key={course.id}
                      compact={isCompactMobileSubjectGrid}
                      colors={colors}
                      course={course}
                      locale={resolvedLocale}
                      onPress={() => {
                        triggerSelectionHaptic();
                        router.navigate(`/subjects/${course.id}`);
                      }}
                      preferredColor={subjectPreferences.colors[course.id]}
                    />
                  ))}
                </View>
              )}

              {showPastCourses && visiblePastCourses.length > 0 ? (
                <View style={styles.pastSection}>
                  <Text style={[styles.pastTitle, { color: colors.subtleText }]}>{t(resolvedLocale, "dashboard.oldSubjects")}</Text>
                  <View style={isCompactMobileSubjectGrid ? styles.subjectGrid : styles.subjectList}>
                    {visiblePastCourses.map((course) => (
                      <SubjectCard
                        key={course.id}
                        compact={isCompactMobileSubjectGrid}
                        colors={colors}
                        course={course}
                        locale={resolvedLocale}
                        muted
                        onPress={() => {
                          triggerSelectionHaptic();
                          router.navigate(`/subjects/${course.id}`);
                        }}
                        preferredColor={subjectPreferences.colors[course.id]}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {data ? (
          <View style={[styles.todoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.todoHeader}>
              <View style={styles.todoHeaderText}>
                <Text style={[styles.todoTitle, { color: colors.foreground }]}>{t(resolvedLocale, "dashboard.todoTitle")}</Text>
                <Text style={[styles.todoSubtitle, { color: colors.subtleText }]}>{t(resolvedLocale, "dashboard.upcomingActivities")}</Text>
              </View>
              <Text style={[styles.todoCount, { color: colors.subtleText }]}>{visibleTodo.length}</Text>
            </View>

            {visibleTodo.length === 0 ? (
              <Text style={[styles.emptyTodoText, { color: colors.subtleText }]}>
                {t(resolvedLocale, "dashboard.noPendingActivities")}
              </Text>
            ) : (
              <View style={styles.todoList}>
                {visibleTodo.map((item, index) => {
                  const activityAccent = getActivityAccent(resolvedLocale, item.assignment?.due_at, colors);
                  const canOpen = Boolean(item.assignment?.course_id && item.assignment?.id);
                  const courseColor = getSubjectColorPalette(
                    item.context_name ?? t(resolvedLocale, "subjects.unknownCourse"),
                    item.assignment?.course_id ? subjectPreferences.colors[item.assignment.course_id] : undefined,
                  );

                  return (
                    <Pressable
                      key={`${item.type}-${item.assignment?.course_id ?? "none"}-${item.assignment?.id ?? index}`}
                      disabled={!canOpen}
                      onPress={() => {
                        if (!item.assignment?.course_id || !item.assignment.id) {
                          return;
                        }

                        triggerSelectionHaptic();
                        router.push(`/subjects/${item.assignment.course_id}/assignments/${item.assignment.id}`);
                      }}
                      style={({ pressed }) => [
                        styles.todoCard,
                        isCompactMobileSubjectGrid && styles.todoCardCompact,
                        {
                          backgroundColor: activityAccent.backgroundColor,
                          borderColor: activityAccent.borderColor,
                        },
                        pressed && canOpen && styles.pressed,
                      ]}
                    >
                      <View style={styles.todoCardTopRow}>
                        <Text
                          style={[
                            styles.todoItemTitle,
                            isCompactMobileSubjectGrid && styles.todoItemTitleCompact,
                            { color: colors.foreground },
                          ]}
                        >
                          {item.assignment?.name ?? t(resolvedLocale, "dashboard.untitledTask")}
                        </Text>
                        <View style={styles.todoBadgeRow}>
                          {item.assignment?.completed ? (
                            <View style={styles.todoDoneBadge}>
                              <Text style={styles.todoDoneBadgeText}>{t(resolvedLocale, "calendar.done")}</Text>
                            </View>
                          ) : null}
                          <View
                            style={[
                              styles.todoBadge,
                              isCompactMobileSubjectGrid && styles.todoBadgeCompact,
                              {
                                backgroundColor: colors.card,
                                borderColor: activityAccent.badgeBorderColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.todoBadgeText,
                                isCompactMobileSubjectGrid && styles.todoBadgeTextCompact,
                                { color: activityAccent.badgeTextColor },
                              ]}
                            >
                              {activityAccent.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.todoMetaRow,
                          isCompactMobileSubjectGrid && styles.todoMetaRowCompact,
                        ]}
                      >
                        <View
                          style={[
                            styles.todoSubjectRow,
                            isCompactMobileSubjectGrid && styles.todoSubjectRowCompact,
                          ]}
                        >
                          <View style={[styles.todoSubjectDot, { backgroundColor: courseColor.borderColor }]} />
                          <Text
                            style={[
                              styles.todoMetaText,
                              isCompactMobileSubjectGrid && styles.todoMetaTextCompact,
                              { color: colors.subtleText },
                            ]}
                            numberOfLines={1}
                          >
                            {formatSubjectName(item.context_name ?? t(resolvedLocale, "subjects.unknownCourse"))}
                          </Text>
                        </View>
                        {isCompactMobileSubjectGrid ? (
                          <Text style={[styles.todoDueCompactText, { color: colors.subtleText }]}>
                            {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, item.assignment?.due_at) })}
                          </Text>
                        ) : null}
                      </View>

                      {!isCompactMobileSubjectGrid ? (
                        <Text style={[styles.todoDueText, { color: colors.subtleText }]}>
                          {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, item.assignment?.due_at) })}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </RestorableScrollView>
    </View>
  );
}

function SubjectCard({
  compact = false,
  colors,
  course,
  locale,
  muted = false,
  onPress,
  preferredColor,
}: {
  compact?: boolean;
  colors: DashboardColors;
  course: CanvasCourse;
  locale: "en" | "pt-BR";
  muted?: boolean;
  onPress: () => void;
  preferredColor?: string;
}) {
  const Icon = getCourseIcon(course.name);
  const palette = getSubjectColorPalette(course.name, preferredColor);
  const gradePercentage = getCourseGradePercentage(course);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.subjectCard,
        compact && styles.subjectCardCompact,
        {
          backgroundColor: muted ? colors.mutedCard : colors.card,
          borderColor: muted ? colors.mutedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.subjectRow, compact && styles.subjectRowCompact]}>
        <View
          style={[
            styles.subjectIconWrap,
            compact && styles.subjectIconWrapCompact,
            {
              backgroundColor: palette.backgroundColor,
              borderColor: palette.borderColor,
            },
          ]}
        >
          <Icon color={palette.color} size={compact ? 14 : 16} strokeWidth={2} />
        </View>

        <View style={[styles.subjectTextBlock, compact && styles.subjectTextBlockCompact]}>
          <Text
            style={[styles.subjectName, compact && styles.subjectNameCompact, { color: colors.foreground }]}
            numberOfLines={compact ? 2 : 1}
          >
            {formatSubjectName(course.name)}
          </Text>
          {!compact ? (
            <Text style={[styles.subjectMeta, { color: colors.subtleText }]} numberOfLines={1}>
              {course.course_code ?? (muted ? t(locale, "dashboard.oldSubject") : t(locale, "dashboard.noCode"))}
            </Text>
          ) : null}
        </View>

        {gradePercentage != null ? (
          <Text
            style={[styles.subjectGrade, compact && styles.subjectGradeCompact, { color: colors.softText }]}
          >
            {formatGradePercentage(locale, gradePercentage)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function getDashboardColors(theme: "light" | "dark") {
  if (theme === "dark") {
    return {
      badgeAmberText: "#fde68a",
      badgeBlueText: "#bfdbfe",
      badgeRedText: "#fecaca",
      border: "rgba(255,255,255,0.12)",
      card: "#000000",
      foreground: "#f8fafc",
      mutedBorder: "rgba(255,255,255,0.08)",
      mutedCard: "rgba(255,255,255,0.03)",
      screen: "#000000",
      softText: "rgba(226,232,240,0.72)",
      subtleText: "rgba(226,232,240,0.62)",
      todoAmberBackground: "rgba(120,53,15,0.24)",
      todoAmberBorder: "rgba(251,191,36,0.4)",
      todoBlueBackground: "rgba(30,41,59,0.64)",
      todoBlueBorder: "rgba(148,163,184,0.3)",
      todoRedBackground: "rgba(127,29,29,0.26)",
      todoRedBorder: "rgba(248,113,113,0.42)",
    };
  }

  return {
    badgeAmberText: "#b45309",
    badgeBlueText: "#475569",
    badgeRedText: "#b91c1c",
    border: "rgba(15,23,42,0.08)",
    card: "#ffffff",
    foreground: "#0f172a",
    mutedBorder: "rgba(15,23,42,0.08)",
    mutedCard: "#fafafa",
    screen: "#ffffff",
    softText: "rgba(15,23,42,0.54)",
    subtleText: "rgba(15,23,42,0.5)",
    todoAmberBackground: "#fffbeb",
    todoAmberBorder: "#fcd34d",
    todoBlueBackground: "#f8fafc",
    todoBlueBorder: "#cbd5e1",
    todoRedBackground: "#fef2f2",
    todoRedBorder: "#fca5a5",
  };
}

function getDateParts(value: Date | string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
  });
  const parts = formatter.formatToParts(typeof value === "string" ? new Date(value) : value);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
  };
}

function getActivityAccent(locale: "en" | "pt-BR", dueAt: string | undefined, colors: DashboardColors) {
  if (!dueAt) {
    return {
      backgroundColor: colors.todoBlueBackground,
      badgeBorderColor: colors.todoBlueBorder,
      badgeTextColor: colors.badgeBlueText,
      borderColor: colors.todoBlueBorder,
      label: t(locale, "relative.later"),
    };
  }

  const nowParts = getDateParts(new Date());
  const dueParts = getDateParts(dueAt);
  const nowDate = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const dueDate = Date.UTC(dueParts.year, dueParts.month - 1, dueParts.day);
  const diffDays = Math.floor((dueDate - nowDate) / 86_400_000);

  if (diffDays <= 0) {
    return {
      backgroundColor: colors.todoRedBackground,
      badgeBorderColor: colors.todoRedBorder,
      badgeTextColor: colors.badgeRedText,
      borderColor: colors.todoRedBorder,
      label: diffDays < 0 ? t(locale, "relative.overdue") : t(locale, "relative.dueToday"),
    };
  }

  if (diffDays <= 6) {
    return {
      backgroundColor: colors.todoAmberBackground,
      badgeBorderColor: colors.todoAmberBorder,
      badgeTextColor: colors.badgeAmberText,
      borderColor: colors.todoAmberBorder,
      label: t(locale, "relative.thisWeek"),
    };
  }

  return {
    backgroundColor: colors.todoBlueBackground,
    badgeBorderColor: colors.todoBlueBorder,
    badgeTextColor: colors.badgeBlueText,
    borderColor: colors.todoBlueBorder,
    label: t(locale, "relative.later"),
  };
}

function getCourseIcon(courseName?: string | null) {
  const normalized = (courseName ?? "").toLowerCase();

  if (normalized.includes("cálculo") || normalized.includes("calculo") || normalized.includes("mat")) return Calculator;
  if (
    normalized.includes("física") ||
    normalized.includes("fisica") ||
    normalized.includes("química") ||
    normalized.includes("quimica")
  ) {
    return FlaskConical;
  }
  if (
    normalized.includes("algorit") ||
    normalized.includes("program") ||
    normalized.includes("software") ||
    normalized.includes("comput")
  ) {
    return Code2;
  }
  if (
    normalized.includes("hist") ||
    normalized.includes("direito") ||
    normalized.includes("pol") ||
    normalized.includes("soc")
  ) {
    return Landmark;
  }
  if (
    normalized.includes("ingl") ||
    normalized.includes("idioma") ||
    normalized.includes("comun") ||
    normalized.includes("texto")
  ) {
    return PenSquare;
  }
  if (
    normalized.includes("gest") ||
    normalized.includes("adm") ||
    normalized.includes("econom") ||
    normalized.includes("negó") ||
    normalized.includes("nego")
  ) {
    return Briefcase;
  }
  if (normalized.includes("estat") || normalized.includes("álgebra") || normalized.includes("algebra")) {
    return Sigma;
  }
  if (normalized.includes("geog") || normalized.includes("global") || normalized.includes("internac")) {
    return Globe;
  }

  return BookOpen;
}

function getCourseGradePercentage(course: CanvasDashboardData["courses"][number]) {
  const enrollment = course.enrollments?.[0];

  return (
    enrollment?.current_period_computed_current_score ??
    enrollment?.computed_current_score ??
    enrollment?.grades?.current_score ??
    null
  );
}

function formatGradePercentage(locale: "en" | "pt-BR", value: number) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function formatDueDateShort(locale: "en" | "pt-BR", value?: string) {
  if (!value) {
    return t(locale, "common.noDueDate");
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  emptyTodoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  pastSection: {
    gap: 12,
    marginTop: 4,
  },
  pastTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.84,
  },
  screen: {
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "400",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  subjectCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  subjectCardCompact: {
    minHeight: 78,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: "48.5%",
  },
  subjectGrade: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  subjectGradeCompact: {
    fontSize: 11,
    marginTop: 0,
  },
  subjectGrid: {
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  subjectIconWrap: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  subjectIconWrapCompact: {
    borderRadius: 8,
    height: 28,
    width: 28,
  },
  subjectList: {
    gap: 10,
  },
  subjectMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  subjectNameCompact: {
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
  },
  subjectRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  subjectRowCompact: {
    gap: 10,
  },
  subjectTextBlock: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingTop: 2,
  },
  subjectTextBlockCompact: {
    gap: 0,
    paddingTop: 1,
  },
  todoBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  todoBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todoBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  todoBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  todoBadgeTextCompact: {
    fontSize: 10,
  },
  todoCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  todoCardCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  todoCardTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  todoCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  todoDoneBadge: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todoDoneBadgeText: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "500",
  },
  todoDueCompactText: {
    flexShrink: 0,
    fontSize: 11,
    lineHeight: 16,
  },
  todoDueText: {
    fontSize: 11,
    lineHeight: 16,
  },
  todoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  todoHeaderText: {
    gap: 3,
  },
  todoItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    paddingTop: 2,
  },
  todoItemTitleCompact: {
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 0,
  },
  todoList: {
    gap: 8,
  },
  todoMetaRow: {
    flexDirection: "row",
  },
  todoMetaRowCompact: {
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 2,
  },
  todoMetaText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  todoMetaTextCompact: {
    fontSize: 11,
  },
  todoSection: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
    padding: 16,
  },
  todoSubjectDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  todoSubjectRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  todoSubjectRowCompact: {
    minWidth: 0,
  },
  todoSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  todoTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
