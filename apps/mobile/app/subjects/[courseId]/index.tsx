import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  CircleDot,
  Code2,
  FlaskConical,
  Globe,
  Landmark,
  LockKeyhole,
  PenSquare,
  Sigma,
} from "lucide-react-native";
import {
  createCourseGroup,
  formatGroupJoinLevel,
  formatSubjectName,
  getCourseContent,
  getCourseDiscussions,
  getCourseFiles,
  getCourseGradeData,
  getCourseGroupCreateAccess,
  getCourseGroups,
  getCoursePeople,
  getSubjectShellData,
  getSubjectColorPalette,
} from "@canvas/shared";
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
  SectionCard,
} from "../../../src/components/app-ui";
import { useAsyncResource } from "../../../src/hooks/use-async-resource";
import { useAppPreferences } from "../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../src/providers/canvas-session";
import { openAppHref } from "../../../src/lib/navigation";
import { formatDueDateShort } from "../../../src/lib/format";

const SUBJECT_TABS = ["overview", "modules", "assignments", "grades", "people", "forums", "files"] as const;
type SubjectTab = typeof SUBJECT_TABS[number];
type PeopleSubtab = "people" | "groups";

function normalizeTab(value?: string): SubjectTab {
  return SUBJECT_TABS.includes(value as SubjectTab) ? (value as SubjectTab) : "overview";
}

function normalizePeopleSubtab(value?: string): PeopleSubtab {
  return value === "groups" ? "groups" : "people";
}

function getSubjectIcon(courseName?: string | null) {
  const normalized = (courseName ?? "").toLowerCase();

  if (normalized.includes("cálculo") || normalized.includes("calculo") || normalized.includes("mat")) return Calculator;
  if (normalized.includes("física") || normalized.includes("fisica") || normalized.includes("química") || normalized.includes("quimica")) return FlaskConical;
  if (normalized.includes("algorit") || normalized.includes("program") || normalized.includes("software") || normalized.includes("comput")) return Code2;
  if (normalized.includes("hist") || normalized.includes("direito") || normalized.includes("pol") || normalized.includes("soc")) return Landmark;
  if (normalized.includes("ingl") || normalized.includes("idioma") || normalized.includes("comun") || normalized.includes("texto")) return PenSquare;
  if (normalized.includes("gest") || normalized.includes("adm") || normalized.includes("econom") || normalized.includes("negó") || normalized.includes("nego")) return Briefcase;
  if (normalized.includes("estat") || normalized.includes("álgebra") || normalized.includes("algebra")) return Sigma;
  if (normalized.includes("geog") || normalized.includes("global") || normalized.includes("internac")) return Globe;

  return BookOpen;
}

function getModuleHref(courseId: number, item: {
  content_id?: number;
  html_url?: string;
  page_url?: string;
  type?: string;
  url?: string;
}) {
  if (item.type === "Assignment" && item.content_id) {
    return `/subjects/${courseId}/assignments/${item.content_id}`;
  }
  if (item.type === "Page" && item.page_url) {
    return `/subjects/${courseId}/pages/${encodeURIComponent(item.page_url)}`;
  }
  if (item.type === "Quiz" && item.content_id) {
    return `/subjects/${courseId}/quizzes/${item.content_id}`;
  }
  if (item.type === "File" && item.content_id) {
    return `/subjects/${courseId}/files/${item.content_id}`;
  }
  return item.html_url ?? item.url ?? null;
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
  const activeTab = normalizeTab(params.tab);
  const activePeopleView = normalizePeopleSubtab(params.peopleView);
  const { config } = useCanvasSession();
  const { resolvedTheme, subjectPreferences } = useAppPreferences();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);

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
      badgeBorder: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.15)",
      successBg: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)",
      successText: isDark ? "#34d399" : "#059669",
    };
  }, [resolvedTheme]);

  const loadSubject = useCallback(async () => {
    const [shell, content, grades, people, discussions, groups, files] = await Promise.all([
      getSubjectShellData(courseId, config!),
      getCourseContent(courseId, config!),
      getCourseGradeData(courseId, config!),
      getCoursePeople(courseId, config!),
      getCourseDiscussions(courseId, config!),
      getCourseGroups(courseId, config!).catch(() => []),
      getCourseFiles(courseId, config!).catch(() => []),
    ]);

    return {
      content,
      discussions,
      files,
      grades,
      groups,
      groupCreateAccess: await getCourseGroupCreateAccess(groups, config!).catch(() => ({
        canCreate: false,
        groupCategoryId: null,
      })),
      people,
      shell,
    };
  }, [config, courseId]);

  const { data, error, loading, reload } = useAsyncResource(loadSubject, [config, courseId], config != null && Number.isFinite(courseId));

  const course = data?.shell.course;
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name, subjectPreferences.colors[course.id]);
  }, [course, subjectPreferences.colors]);

  const SubjectIcon = useMemo(() => {
    if (!course) return BookOpen;
    return getSubjectIcon(course.name);
  }, [course]);

  const gradeData = data?.grades;
  const totalDistributedPoints = gradeData?.assignments.reduce((sum, a) => sum + (a.points_possible ?? 0), 0) ?? 0;
  const absolutePoints = gradeData?.assignments.reduce((sum, a) => sum + (a.submission?.score ?? 0), 0) ?? 0;
  const gradePercentage = gradeData?.enrollment?.grades?.current_score ?? (totalDistributedPoints > 0 ? (absolutePoints / totalDistributedPoints) * 100 : null);
  const gradeTrendPoints = getGradeTrendPoints(gradeData?.assignments ?? []);
  const gradeTrendPath = buildTrendPath(gradeTrendPoints);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {loading ? <LoadingState label="Loading subject..." /> : null}
          {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
          
          {!loading && !error && course ? (
            <View style={styles.container}>
              {/* Header Card */}
              <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                  <View style={styles.headerContent}>
                    <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                      <SubjectIcon size={20} color={palette.color} />
                    </View>
                    <View style={styles.headerText}>
                      <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={1}>
                        {formatSubjectName(course.name)}
                      </Text>
                      <Text style={[styles.courseCode, { color: colors.mutedForeground }]}>
                        {course.course_code ?? "Subject overview"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                <View style={styles.tabsRow}>
                  {SUBJECT_TABS.map((tab) => (
                    <Pressable
                      key={tab}
                      onPress={() => {
                        router.replace({
                          params: tab === "overview" ? { courseId: String(courseId) } : { courseId: String(courseId), tab },
                          pathname: "/subjects/[courseId]",
                        });
                      }}
                      style={[
                        styles.tabButton,
                        { borderColor: activeTab === tab ? colors.primary : colors.border },
                        activeTab === tab && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          { color: activeTab === tab ? colors.primaryText : colors.mutedForeground },
                        ]}
                      >
                        {tab === "overview" ? "Overview" : tab === "modules" ? "Modules" : tab === "assignments" ? "Assignments" : tab === "grades" ? "Grades" : tab === "people" ? "People" : tab === "forums" ? "Forums" : "Files"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Overview/Modules/Assignments Tab */}
              {(activeTab === "overview" || activeTab === "modules" || activeTab === "assignments") && data && (
                <View style={styles.twoColumnGrid}>
                  {/* Modules Section */}
                  {(activeTab !== "assignments") && (
                    <SectionCard title="Modules" subtitle="Lessons and organized course materials">
                      {data.content.modules.length === 0 ? (
                        <EmptyState label="No modules available for this subject." />
                      ) : (
                        data.content.modules.map((module) => (
                          <View key={module.id} style={[styles.moduleCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                            <View style={styles.moduleHeader}>
                              <View style={styles.moduleTitleSection}>
                                <Text style={[styles.moduleName, { color: colors.foreground }]} numberOfLines={1}>
                                  {module.name}
                                </Text>
                                <Text style={[styles.moduleSubtitle, { color: colors.mutedForeground }]}>Course materials</Text>
                              </View>
                              <View style={[styles.itemCountBadge, { borderColor: colors.badgeBorder }]}>
                                <Text style={[styles.itemCountText, { color: colors.mutedForeground }]}>
                                  {module.items_count ?? module.items?.length ?? 0} items
                                </Text>
                              </View>
                            </View>
                            <View style={styles.moduleItems}>
                              {module.items?.slice(0, 12).map((item) => {
                                const itemHref = getModuleHref(courseId, item);
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
                                          {item.title ?? "Section"}
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
                                          {item.title ?? "Untitled item"}
                                        </Text>
                                        <Text style={[styles.itemType, { color: colors.mutedForeground }]}>
                                          {item.type ?? "Content"}
                                        </Text>
                                      </View>
                                    </View>
                                    {item.completion_requirement?.completed && (
                                      <View style={[styles.doneBadge, { borderColor: colors.successText + "40", backgroundColor: colors.successBg }]}>
                                        <Text style={[styles.doneBadgeText, { color: colors.successText }]}>Done</Text>
                                      </View>
                                    )}
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        ))
                      )}
                    </SectionCard>
                  )}

                  {/* Assignments Section */}
                  {(activeTab !== "modules") && (
                    <SectionCard title="Assignments" subtitle="Upcoming and recent work for this subject">
                      {data.content.assignments.length === 0 ? (
                        <EmptyState label="No assignments available for this subject." />
                      ) : (
                        data.content.assignments.map((assignment) => {
                          const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                          
                          return (
                            <Pressable
                              key={assignment.id}
                              onPress={() => router.push(`/subjects/${courseId}/assignments/${assignment.id}`)}
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
                                      <Text style={[styles.doneBadgeText, { color: colors.successText }]}>Done</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.assignmentDue, { color: colors.mutedForeground }]}>
                                  Due: {formatDueDateShort(assignment.due_at)}
                                </Text>
                                <Text style={[styles.assignmentPoints, { color: colors.mutedForeground }]}>
                                  {assignment.points_possible != null ? `${assignment.points_possible} points` : "No points listed"}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </SectionCard>
                  )}
                </View>
              )}

              {/* Grades Tab */}
              {activeTab === "grades" && data && (
                <View style={styles.gradesContainer}>
                  <View style={styles.gradesGrid}>
                    <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Text style={[styles.metricTitle, { color: colors.foreground }]}>Grade %</Text>
                      <Text style={[styles.metricValue, { color: colors.foreground }]}>
                        {gradePercentage != null ? `${formatMetricNumber(gradePercentage)}%` : "--"}
                      </Text>
                      <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>Overall percentage in the subject</Text>
                    </View>
                    <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Text style={[styles.metricTitle, { color: colors.foreground }]}>Absolute</Text>
                      <Text style={[styles.metricValue, { color: colors.foreground }]}>
                        {formatMetricNumber(absolutePoints)}
                      </Text>
                      <Text style={[styles.metricSubtitle, { color: colors.mutedForeground }]}>Total points earned by you</Text>
                    </View>
                    <View style={[styles.gradeMetricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Text style={[styles.metricTitle, { color: colors.foreground }]}>Trend</Text>
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
                          <Text style={[styles.noTrendText, { color: colors.mutedForeground }]}>Not enough graded activities yet</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <SectionCard title="Assignment grades" subtitle="Scores and submission status for this subject">
                    {data.grades.assignments.length === 0 ? (
                      <EmptyState label="No grade data available for this subject." />
                    ) : (
                      data.grades.assignments.map((assignment) => {
                        const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                        
                        return (
                          <Pressable
                            key={assignment.id}
                            onPress={() => router.push(`/subjects/${courseId}/assignments/${assignment.id}`)}
                            style={[styles.gradeAssignmentCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                          >
                            <View style={styles.gradeAssignmentContent}>
                              <Text style={[styles.gradeAssignmentName, { color: isCompleted ? colors.mutedForeground : colors.foreground }, isCompleted && styles.completedText]} numberOfLines={1}>
                                {assignment.name}
                              </Text>
                              <Text style={[styles.gradeAssignmentDue, { color: colors.mutedForeground }]}>
                                Due: {formatDueDateShort(assignment.due_at)}
                              </Text>
                            </View>
                            <View style={styles.gradeAssignmentScore}>
                              <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                                {assignment.submission?.grade ?? (assignment.submission?.score != null ? String(assignment.submission.score) : "--")}
                              </Text>
                              <Text style={[styles.scoreTotal, { color: colors.mutedForeground }]}>
                                {assignment.points_possible != null ? `of ${assignment.points_possible}` : "No points listed"}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </SectionCard>
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
                      <Text style={[styles.peopleTabText, { color: activePeopleView === "people" ? colors.primaryText : colors.mutedForeground }]}>People</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.replace({ params: { courseId: String(courseId), peopleView: "groups", tab: "people" }, pathname: "/subjects/[courseId]" })}
                      style={[styles.peopleTab, { borderColor: activePeopleView === "groups" ? colors.primary : colors.border }, activePeopleView === "groups" && { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.peopleTabText, { color: activePeopleView === "groups" ? colors.primaryText : colors.mutedForeground }]}>Groups</Text>
                    </Pressable>
                  </View>

                  <SectionCard title={activePeopleView === "groups" ? "Groups" : "People"} subtitle={activePeopleView === "groups" ? "All groups visible in this subject" : "Everyone currently visible in this subject"}>
                    {activePeopleView === "people" ? (
                      data.people.length === 0 ? (
                        <EmptyState label="No people available for this subject." />
                      ) : (
                        data.people.map((person) => (
                          <Pressable
                            key={person.id}
                            onPress={() => router.push(`/subjects/${courseId}/people/${person.id}`)}
                            style={[styles.personCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                          >
                            <View style={[styles.personAvatar, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                              <Text style={[styles.personAvatarText, { color: colors.foreground }]}>
                                {person.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.personInfo}>
                              <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>{person.name}</Text>
                              <Text style={[styles.personRole, { color: colors.mutedForeground }]} numberOfLines={1}>
                                {person.short_name ?? person.sortable_name ?? "Canvas user"}
                              </Text>
                            </View>
                          </Pressable>
                        ))
                      )
                    ) : (
                      data.groups.length === 0 ? (
                        <EmptyState label="No groups available for this subject." />
                      ) : (
                        data.groups.map((group) => (
                          <View key={group.id} style={[styles.groupCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}>
                            <View style={styles.groupHeader}>
                              <View style={styles.groupInfo}>
                                <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>{group.name}</Text>
                                <Text style={[styles.groupDescription, { color: colors.mutedForeground }]} numberOfLines={1}>
                                  {group.description || "Canvas group"}
                                </Text>
                              </View>
                              <View style={styles.groupMeta}>
                                <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>{group.members_count ?? 0} members</Text>
                                <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>{formatGroupJoinLevel(group.join_level)}</Text>
                              </View>
                            </View>
                            <View style={styles.groupAction}>
                              {group.canOpen ? (
                                <Pressable onPress={() => router.push(`/subjects/${courseId}/groups/${group.id}`)} style={styles.groupLink}>
                                  <Text style={[styles.groupLinkText, { color: colors.foreground }]}>Enter group</Text>
                                  <ArrowRight size={14} color={colors.mutedForeground} />
                                </Pressable>
                              ) : (
                                <View style={styles.groupLocked}>
                                  <LockKeyhole size={14} color={colors.mutedForeground} />
                                  <Text style={[styles.groupLockedText, { color: colors.mutedForeground }]}>Locked</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        ))
                      )
                    )}
                  </SectionCard>
                </View>
              )}

              {/* Forums Tab */}
              {activeTab === "forums" && data && (
                <SectionCard title="Forums" subtitle="Discussion topics for this subject">
                  {data.discussions.length === 0 ? (
                    <EmptyState label="No forums available for this subject." />
                  ) : (
                    data.discussions.map((discussion) => (
                      <Pressable
                        key={discussion.id}
                        onPress={() => void openAppHref(router, discussion.html_url)}
                        style={[styles.forumCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                      >
                        <View style={styles.forumContent}>
                          <Text style={[styles.forumTitle, { color: colors.foreground }]} numberOfLines={1}>{discussion.title ?? "Untitled forum"}</Text>
                          <Text style={[styles.forumMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
                            {discussion.message?.replace(/<[^>]+>/g, " ") ?? "No preview available."}
                          </Text>
                          <View style={styles.forumMeta}>
                            <Text style={[styles.forumMetaText, { color: colors.mutedForeground }]}>{discussion.discussion_subentry_count ?? 0} replies</Text>
                            {discussion.unread_count != null && (
                              <Text style={[styles.forumMetaText, { color: colors.mutedForeground }]}>{discussion.unread_count} unread</Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))
                  )}
                </SectionCard>
              )}

              {/* Files Tab */}
              {activeTab === "files" && data && (
                <SectionCard title="Files" subtitle="Course files and materials">
                  {data.files.length === 0 ? (
                    <EmptyState label="No files available for this subject." />
                  ) : (
                    data.files.map((file) => (
                      <Pressable
                        key={file.id}
                        onPress={() => router.push(`/subjects/${courseId}/files/${file.id}`)}
                        style={[styles.fileCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}
                      >
                        <View style={styles.fileContent}>
                          <View style={styles.fileInfo}>
                            <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                              {file.display_name ?? file.filename ?? "Untitled file"}
                            </Text>
                            <Text style={[styles.fileType, { color: colors.mutedForeground }]}>{file["content-type"] ?? "File"}</Text>
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
                </SectionCard>
              )}
            </View>
          ) : null}
        </ScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 12,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerTop: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
  },
  tabsContainer: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  twoColumnGrid: {
    gap: 16,
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
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  personAvatarText: {
    fontSize: 14,
    fontWeight: "600",
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
