import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Mail } from "lucide-react-native";
import {
  buildSubjectHref,
  getSharedActiveCourses,
  formatSubjectName,
  getSubjectRouteContext,
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
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { UserAvatar } from "../../../../src/components/user-avatar";
import { usePerson, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDate } from "../../../../src/lib/format";
import { goBackOrPush } from "../../../../src/lib/navigation";
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

function formatEnrollmentType(locale: "en" | "pt-BR", value?: string) {
  if (!value) return t(locale, "profile.courseMember");
  return value.replace(/Enrollment$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function formatEnrollmentState(locale: "en" | "pt-BR", value?: string) {
  if (!value) return t(locale, "common.unknown");
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]+/g, " ");
}

export default function PersonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; peopleView?: string; personId: string; tab?: string }>();
  const courseId = Number(params.courseId);
  const personId = Number(params.personId);
  const originContext = useMemo(() => getSubjectRouteContext(params.tab, params.peopleView), [params.peopleView, params.tab]);
  const subjectHref = useMemo(() => buildSubjectHref(courseId, originContext ?? { tab: "people" }), [courseId, originContext]);
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
      amber: { bg: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)", text: isDark ? "#fbbf24" : "#d97706", border: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.2)" },
      sky: { bg: isDark ? "rgba(14,165,233,0.2)" : "rgba(14,165,233,0.1)", text: isDark ? "#38bdf8" : "#0284c7", border: isDark ? "rgba(14,165,233,0.3)" : "rgba(14,165,233,0.2)" },
      emerald: { bg: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", text: isDark ? "#34d399" : "#059669", border: isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.2)" },
      slate: { bg: isDark ? "rgba(100,116,139,0.2)" : "rgba(100,116,139,0.1)", text: isDark ? "#94a3b8" : "#64748b", border: isDark ? "rgba(100,116,139,0.3)" : "rgba(100,116,139,0.2)" },
    };
  }, [resolvedTheme]);

  const { data: shellData } = useCourseShell(courseId);
  const { data: personData, error, isLoading, isFetching, refetch } = usePerson(courseId, personId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);

  const course = shellData?.course;
  const person = personData;
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  const primaryEnrollment = person?.enrollments?.[0];
  const enrollmentType = formatEnrollmentType(resolvedLocale, primaryEnrollment?.type ?? primaryEnrollment?.role);
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
  const showColdLoading = isLoading && !course && !person && !error;
  const showBlockingError = !!error && !course && !person;
  const showInlineRefresh = !!course && !!person && (isFetching || isLoading);

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
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "profile.loadingPerson")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {course && person ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    accessibilityLabel={t(resolvedLocale, "subjects.backToPeople")}
                    accessibilityRole="button"
                    onPress={() => {
                      triggerSelectionHaptic();
                      goBackOrPush(router, subjectHref);
                    }}
                    style={[styles.backButton, { borderColor: colors.border }]}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                  </Pressable>
                </View>

                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <UserAvatar
                        backgroundColor={palette.backgroundColor}
                        borderColor={palette.borderColor}
                        expandable
                        fallback={getInitials(person.name)}
                        name={person.name}
                        size={64}
                        src={person.avatar_url}
                        textColor={palette.color}
                        textSize={24}
                      />
                      <View style={styles.headerText}>
                        <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>
                          {person.name}
                        </Text>
                        <Pressable onPress={() => goBackOrPush(router, subjectHref)}>
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
                            {formatEnrollmentState(resolvedLocale, enrollmentState)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Profile Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t(resolvedLocale, "common.profile")}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                      {t(resolvedLocale, "profile.informationFromCanvas")}
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={[styles.infoItem, { borderColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.name")}</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{person.name}</Text>
                    </View>
                    <View style={[styles.infoItem, { borderColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.canvasUserId")}</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{person.id}</Text>
                    </View>
                    {person.sis_user_id && (
                      <View style={[styles.infoItem, { borderColor: colors.border }]}>
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.email")}</Text>
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
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "profile.canvasAccountCreated")}</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>
                          {formatDate(resolvedLocale, person.created_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Shared Subjects Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t(resolvedLocale, "profile.sharedActiveSubjects")}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                      {t(resolvedLocale, "profile.sharedActiveSubjectsDescription")}
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    <SharedCoursesList 
                      courseId={courseId} 
                      personId={personId} 
                      colors={colors} 
                      locale={resolvedLocale}
                      router={router}
                    />
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

function SharedCoursesList({ 
  courseId, 
  personId, 
  colors, 
  locale,
  router 
}: { 
  courseId: number; 
  personId: number; 
  colors: any;
  locale: "en" | "pt-BR";
  router: any;
}) {
  const { data: shellData } = useCourseShell(courseId);
  const { config } = useCanvasSession();
  const [sharedCourses, setSharedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shellData && config) {
      getSharedActiveCourses(shellData.courses, personId, config)
        .then(setSharedCourses)
        .finally(() => setLoading(false));
    }
  }, [shellData, personId, config]);

  if (loading) {
    return (
      <>
        <PlaceholderBlock height={76} />
        <PlaceholderBlock height={76} />
      </>
    );
  }

  if (sharedCourses.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {t(locale, "profile.noSharedActiveSubjects")}
      </Text>
    );
  }

  return (
    <>
      {sharedCourses.map((sharedCourse) => {
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
              {sharedCourse.course_code ?? t(locale, "common.activeSubject")}
            </Text>
          </Pressable>
        );
      })}
    </>
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
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: 14,
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
    padding: 14,
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
