import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Mail } from "lucide-react-native";
import {
  getCoursePerson,
  getSharedActiveCourses,
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
import { useAsyncResource } from "../../../../src/hooks/use-async-resource";
import { formatDueDateShort } from "../../../../src/lib/format";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatEnrollmentType(value?: string) {
  if (!value) return "Course member";
  return value.replace(/Enrollment$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function formatEnrollmentState(value?: string) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]+/g, " ");
}

export default function PersonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; personId: string }>();
  const courseId = Number(params.courseId);
  const personId = Number(params.personId);
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
      amber: { bg: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)", text: isDark ? "#fbbf24" : "#d97706", border: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.2)" },
      sky: { bg: isDark ? "rgba(14,165,233,0.2)" : "rgba(14,165,233,0.1)", text: isDark ? "#38bdf8" : "#0284c7", border: isDark ? "rgba(14,165,233,0.3)" : "rgba(14,165,233,0.2)" },
      emerald: { bg: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", text: isDark ? "#34d399" : "#059669", border: isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.2)" },
      slate: { bg: isDark ? "rgba(100,116,139,0.2)" : "rgba(100,116,139,0.1)", text: isDark ? "#94a3b8" : "#64748b", border: isDark ? "rgba(100,116,139,0.3)" : "rgba(100,116,139,0.2)" },
    };
  }, [resolvedTheme]);

  const loadData = useCallback(async () => {
    const shell = await getSubjectShellData(courseId, config!);
    const person = await getCoursePerson(courseId, personId, config!);
    if (!person) throw new Error("Person not found in this subject");
    const sharedCourses = await getSharedActiveCourses(shell.courses, personId, config!);
    return { course: shell.course, person, sharedCourses };
  }, [config, courseId, personId]);

  const { data, error, loading, reload } = useAsyncResource(loadData, [config, courseId, personId], config != null);

  const course = data?.course;
  const person = data?.person;
  const sharedCourses = data?.sharedCourses ?? [];
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  const primaryEnrollment = person?.enrollments?.[0];
  const enrollmentType = formatEnrollmentType(primaryEnrollment?.type ?? primaryEnrollment?.role);
  const enrollmentState = primaryEnrollment?.enrollment_state;

  const getRoleBadgeColors = (value?: string) => {
    const normalized = (value ?? "").toLowerCase();
    if (normalized.includes("teacher")) return colors.amber;
    if (normalized.includes("student")) return colors.sky;
    return { bg: "transparent", text: colors.foreground, border: colors.border };
  };

  const getStatusBadgeColors = (value?: string) => {
    const normalized = (value ?? "").toLowerCase();
    if (normalized === "active") return colors.emerald;
    if (normalized === "invited" || normalized === "creation_pending") return colors.amber;
    if (["completed", "inactive", "deleted"].includes(normalized)) return colors.slate;
    return { bg: "transparent", text: colors.mutedForeground, border: colors.border };
  };

  const roleColors = getRoleBadgeColors(primaryEnrollment?.type ?? primaryEnrollment?.role);
  const statusColors = getStatusBadgeColors(enrollmentState);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {loading ? <LoadingState label="Loading person..." /> : null}
            {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
            
            {!loading && !error && course && person ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      router.push(`/subjects/${courseId}?tab=people`);
                    }}
                    style={styles.backButton}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to people</Text>
                  </Pressable>
                </View>

                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.avatarContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <Text style={[styles.avatarText, { color: palette.color }]}>{getInitials(person.name)}</Text>
                      </View>
                      <View style={styles.headerText}>
                        <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>
                          {person.name}
                        </Text>
                        <Pressable onPress={() => router.push(`/subjects/${courseId}?tab=people`)}>
                          <Text style={[styles.courseLink, { color: colors.mutedForeground }]}>
                            {formatSubjectName(course.name)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.badges}>
                      <View style={[styles.badge, { borderColor: roleColors.border, backgroundColor: roleColors.bg }]}>
                        <Text style={[styles.badgeText, { color: roleColors.text }]}>{enrollmentType}</Text>
                      </View>
                      {enrollmentState && (
                        <View style={[styles.badge, { borderColor: statusColors.border, backgroundColor: statusColors.bg }]}>
                          <Text style={[styles.badgeText, { color: statusColors.text }]}>
                            {formatEnrollmentState(enrollmentState)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Profile Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Profile</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                      Information available from the Canvas course user record
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={[styles.infoItem, { borderColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Name</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{person.name}</Text>
                    </View>
                    <View style={[styles.infoItem, { borderColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Canvas user ID</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{person.id}</Text>
                    </View>
                    {person.sis_user_id && (
                      <View style={[styles.infoItem, { borderColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
                        <View style={styles.emailRow}>
                          <Mail size={16} color={colors.foreground} />
                          <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
                            {person.sis_user_id}
                          </Text>
                        </View>
                      </View>
                    )}
                    {person.created_at && (
                      <View style={[styles.infoItem, { borderColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Canvas account created</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>
                          {formatDueDateShort(person.created_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Shared Subjects Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Shared active subjects</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                      Active subjects that both you and this person are currently taking
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    {sharedCourses.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        No shared active subjects were found.
                      </Text>
                    ) : (
                      sharedCourses.map((sharedCourse) => {
                        const sharedPalette = getSubjectColorPalette(sharedCourse.name);
                        return (
                          <Pressable
                            key={sharedCourse.id}
                            onPress={() => router.push(`/subjects/${sharedCourse.id}`)}
                            style={[styles.sharedCourseCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: sharedPalette.borderColor }]}
                          >
                            <Text style={[styles.sharedCourseName, { color: colors.foreground }]} numberOfLines={1}>
                              {formatSubjectName(sharedCourse.name)}
                            </Text>
                            <Text style={[styles.sharedCourseCode, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {sharedCourse.course_code ?? "Active subject"}
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
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
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "600",
  },
  headerText: {
    flex: 1,
  },
  personName: {
    fontSize: 20,
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
    fontWeight: "500",
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
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  cardContent: {
    padding: 16,
    gap: 10,
  },
  infoItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  sharedCourseCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
  },
  sharedCourseName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  sharedCourseCode: {
    fontSize: 12,
  },
});
