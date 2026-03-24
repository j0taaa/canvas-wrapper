import { useMemo } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, LockKeyhole, UsersRound } from "lucide-react-native";
import {
  appendSubjectRouteContext,
  buildSubjectHref,
  formatSubjectName,
  formatGroupJoinLevel,
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
import { useGroup, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { goBackOrPush } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; groupId: string; peopleView?: string; tab?: string }>();
  const courseId = Number(params.courseId);
  const groupId = Number(params.groupId);
  const originContext = useMemo(() => getSubjectRouteContext(params.tab, params.peopleView), [params.peopleView, params.tab]);
  const subjectHref = useMemo(
    () => buildSubjectHref(courseId, originContext ?? { peopleView: "groups", tab: "people" }),
    [courseId, originContext],
  );
  const { resolvedLocale, resolvedTheme, triggerSelectionHaptic } = useAppPreferences();

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      card: isDark ? "#000000" : "#ffffff",
      muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
    };
  }, [resolvedTheme]);

  const { data: shellData } = useCourseShell(courseId);
  const { data: groupData, error, isLoading, isFetching, refetch } = useGroup(courseId, groupId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);

  const course = shellData?.course;
  const group = groupData?.group;
  const members = groupData?.members ?? [];

  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  // Check if we got an access denied error
  const accessDenied = error?.message?.includes("(403)") ?? false;
  const showColdLoading = isLoading && !course && !group && !accessDenied && !error;
  const showBlockingError = !!error && !course && !group && !accessDenied;
  const showInlineRefresh = !!course && (!!group || accessDenied) && (isFetching || isLoading);

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
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "subjects.loadingGroup")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {course && (!!group || accessDenied) ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    accessibilityLabel={t(resolvedLocale, "subjects.backToGroups")}
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
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        {accessDenied ? (
                          <LockKeyhole size={20} color={palette.color} />
                        ) : (
                          <UsersRound size={20} color={palette.color} />
                        )}
                      </View>
                      <View style={styles.headerText}>
                        <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
                          {group?.name ?? t(resolvedLocale, "subjects.group")}
                        </Text>
                        <Text style={[styles.courseName, { color: colors.mutedForeground }]}>
                          {course?.name ? formatSubjectName(course.name) : t(resolvedLocale, "subjects.unknownCourse")}
                        </Text>
                      </View>
                    </View>
                    {group && (
                      <View style={styles.badges}>
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.foreground }]}>
                            {t(resolvedLocale, "subjects.members", { count: group.members_count ?? members.length })}
                          </Text>
                        </View>
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {formatGroupJoinLevel(group.join_level)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Members Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {accessDenied ? t(resolvedLocale, "subjects.groupLocked") : t(resolvedLocale, "subjects.people")}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                      {accessDenied 
                        ? t(resolvedLocale, "subjects.noPermissionToViewGroup")
                        : t(resolvedLocale, "subjects.peopleVisibleInGroup")
                      }
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    {accessDenied ? (
                      <View style={[styles.accessDeniedBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                        <Text style={[styles.accessDeniedText, { color: colors.mutedForeground }]}>
                          {t(resolvedLocale, "subjects.noPermissionToViewGroup")}
                        </Text>
                      </View>
                    ) : members.length === 0 && showInlineRefresh ? (
                      <>
                        <PlaceholderBlock height={76} />
                        <PlaceholderBlock height={76} />
                      </>
                    ) : members.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        {t(resolvedLocale, "subjects.noMembersInGroup")}
                      </Text>
                    ) : (
                      members.map((person) => (
                        <Pressable
                          key={person.id}
                          onPress={() => router.push(appendSubjectRouteContext(`/subjects/${courseId}/people/${person.id}`, { peopleView: "groups", tab: "people" }))}
                          style={[styles.memberCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                        >
                          <UserAvatar
                            backgroundColor={colors.muted}
                            borderColor={colors.border}
                            fallback={getInitials(person.name)}
                            name={person.name}
                            size={40}
                            src={person.avatar_url}
                            textColor={colors.foreground}
                            textSize={14}
                          />
                          <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                              {person.name}
                            </Text>
                            <Text style={[styles.memberMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {person.short_name ?? person.sortable_name ?? t(resolvedLocale, "subjects.canvasUser")}
                            </Text>
                          </View>
                        </Pressable>
                      ))
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
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
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
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  cardContent: {
    padding: 14,
    gap: 10,
  },
  accessDeniedBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  accessDeniedText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  memberCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  memberMeta: {
    fontSize: 12,
  },
});
