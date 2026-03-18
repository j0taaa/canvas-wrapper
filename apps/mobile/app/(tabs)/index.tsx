import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
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
  type CanvasCourse,
  type CanvasDashboardData,
} from "@canvas/shared";
import { EmptyState, ErrorState, LoadingState, RequireCanvasConfig } from "../../src/components/app-ui";
import { useDashboard } from "../../src/hooks/use-canvas-queries";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { useCanvasSession } from "../../src/providers/canvas-session";

type DashboardColors = ReturnType<typeof getDashboardColors>;

const dueDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

export default function DashboardTab() {
  return (
    <RequireCanvasConfig>
      <DashboardScreen />
    </RequireCanvasConfig>
  );
}

function DashboardScreen() {
  const router = useRouter();
  const { resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const colors = useMemo(() => getDashboardColors(resolvedTheme), [resolvedTheme]);
  const [showPastCourses, setShowPastCourses] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useDashboard();

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

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.subtleText}
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subjects</Text>
            {data && data.pastCourses.length > 0 ? (
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  setShowPastCourses((current) => !current);
                }}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Text style={[styles.sectionAction, { color: colors.subtleText }]}>
                  {showPastCourses ? "Hide old subjects" : "Show old subjects"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {isLoading && !data ? <LoadingState label="Loading dashboard..." /> : null}
          {!isLoading && error ? <ErrorState error={error.message} onRetry={refetch} /> : null}

          {!isLoading && !error && data ? (
            <View style={styles.subjectList}>
              {visibleCourses.length === 0 ? <EmptyState label="No active subjects available." /> : null}
              {visibleCourses.map((course) => (
                <SubjectCard
                  key={course.id}
                  colors={colors}
                  course={course}
                  onPress={() => {
                    triggerSelectionHaptic();
                    router.push(`/subjects/${course.id}`);
                  }}
                  preferredColor={subjectPreferences.colors[course.id]}
                />
              ))}

              {showPastCourses && visiblePastCourses.length > 0 ? (
                <View style={styles.pastSection}>
                  <Text style={[styles.pastTitle, { color: colors.subtleText }]}>Old subjects</Text>
                  <View style={styles.subjectList}>
                    {visiblePastCourses.map((course) => (
                      <SubjectCard
                        key={course.id}
                        colors={colors}
                        course={course}
                        muted
                        onPress={() => {
                          triggerSelectionHaptic();
                          router.push(`/subjects/${course.id}`);
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

        {!isLoading && !error && data ? (
          <View style={[styles.todoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.todoHeader}>
              <View style={styles.todoHeaderText}>
                <Text style={[styles.todoTitle, { color: colors.foreground }]}>To-Do</Text>
                <Text style={[styles.todoSubtitle, { color: colors.subtleText }]}>Upcoming activities</Text>
              </View>
              <Text style={[styles.todoCount, { color: colors.subtleText }]}>{visibleTodo.length}</Text>
            </View>

            {visibleTodo.length === 0 ? (
              <Text style={[styles.emptyTodoText, { color: colors.subtleText }]}>
                No pending activities right now.
              </Text>
            ) : (
              <View style={styles.todoList}>
                {visibleTodo.map((item, index) => {
                  const activityAccent = getActivityAccent(item.assignment?.due_at, colors);
                  const canOpen = Boolean(item.assignment?.course_id && item.assignment?.id);
                  const courseColor = getSubjectColorPalette(
                    item.context_name ?? "Unknown course",
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
                        {
                          backgroundColor: activityAccent.backgroundColor,
                          borderColor: activityAccent.borderColor,
                        },
                        pressed && canOpen && styles.pressed,
                      ]}
                    >
                      <View style={styles.todoCardTopRow}>
                        <Text style={[styles.todoItemTitle, { color: colors.foreground }]}>
                          {item.assignment?.name ?? "Untitled task"}
                        </Text>
                        <View style={styles.todoBadgeRow}>
                          <View
                            style={[
                              styles.todoBadge,
                              {
                                backgroundColor: colors.card,
                                borderColor: activityAccent.badgeBorderColor,
                              },
                            ]}
                          >
                            <Text style={[styles.todoBadgeText, { color: activityAccent.badgeTextColor }]}>
                              {activityAccent.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.todoMetaRow}>
                        <View style={styles.todoSubjectRow}>
                          <View style={[styles.todoSubjectDot, { backgroundColor: courseColor.borderColor }]} />
                          <Text style={[styles.todoMetaText, { color: colors.subtleText }]} numberOfLines={1}>
                            {formatSubjectName(item.context_name ?? "Unknown course")}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.todoDueText, { color: colors.subtleText }]}>
                        Due: {formatDueDateShort(item.assignment?.due_at)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SubjectCard({
  colors,
  course,
  muted = false,
  onPress,
  preferredColor,
}: {
  colors: DashboardColors;
  course: CanvasCourse;
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
        {
          backgroundColor: muted ? colors.mutedCard : colors.card,
          borderColor: muted ? colors.mutedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.subjectRow}>
        <View
          style={[
            styles.subjectIconWrap,
            {
              backgroundColor: palette.backgroundColor,
              borderColor: palette.borderColor,
            },
          ]}
        >
          <Icon color={palette.color} size={16} strokeWidth={2} />
        </View>

        <View style={styles.subjectTextBlock}>
          <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={1}>
            {formatSubjectName(course.name)}
          </Text>
          <Text style={[styles.subjectMeta, { color: colors.subtleText }]} numberOfLines={1}>
            {course.course_code ?? (muted ? "Old subject" : "No code")}
          </Text>
        </View>

        {gradePercentage != null ? (
          <Text style={[styles.subjectGrade, { color: colors.softText }]}>
            {formatGradePercentage(gradePercentage)}
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
      card: "#020617",
      foreground: "#f8fafc",
      mutedBorder: "rgba(255,255,255,0.08)",
      mutedCard: "rgba(255,255,255,0.03)",
      screen: "#020617",
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

function getActivityAccent(dueAt: string | undefined, colors: DashboardColors) {
  if (!dueAt) {
    return {
      backgroundColor: colors.todoBlueBackground,
      badgeBorderColor: colors.todoBlueBorder,
      badgeTextColor: colors.badgeBlueText,
      borderColor: colors.todoBlueBorder,
      label: "Later",
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
      label: diffDays < 0 ? "Overdue" : "Due today",
    };
  }

  if (diffDays <= 6) {
    return {
      backgroundColor: colors.todoAmberBackground,
      badgeBorderColor: colors.todoAmberBorder,
      badgeTextColor: colors.badgeAmberText,
      borderColor: colors.todoAmberBorder,
      label: "This week",
    };
  }

  return {
    backgroundColor: colors.todoBlueBackground,
    badgeBorderColor: colors.todoBlueBorder,
    badgeTextColor: colors.badgeBlueText,
    borderColor: colors.todoBlueBorder,
    label: "Later",
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

function formatGradePercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function formatDueDateShort(value?: string) {
  if (!value) {
    return "No due date";
  }

  return dueDateFormatter.format(new Date(value));
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  subjectGrade: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  subjectIconWrap: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
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
  subjectRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  subjectTextBlock: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingTop: 2,
  },
  todoBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  todoCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  todoList: {
    gap: 8,
  },
  todoMetaRow: {
    flexDirection: "row",
  },
  todoMetaText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  todoSection: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
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
