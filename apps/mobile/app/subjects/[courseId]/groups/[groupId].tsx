import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, LockKeyhole, UsersRound } from "lucide-react-native";
import {
  getGroupDetails,
  getGroupUsers,
  getSubjectShellData,
  formatSubjectName,
  formatGroupJoinLevel,
  getSubjectColorPalette,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { useAsyncResource } from "../../../../src/hooks/use-async-resource";
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

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; groupId: string }>();
  const courseId = Number(params.courseId);
  const groupId = Number(params.groupId);
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
    };
  }, [resolvedTheme]);

  const loadData = useCallback(async () => {
    const shell = await getSubjectShellData(courseId, config!);
    let group = null;
    let members = [] as Awaited<ReturnType<typeof getGroupUsers>>;
    let accessDenied = false;

    try {
      [group, members] = await Promise.all([
        getGroupDetails(groupId, config!),
        getGroupUsers(groupId, config!),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("(403)")) {
        accessDenied = true;
      } else {
        throw error;
      }
    }

    return { course: shell.course, group, members, accessDenied };
  }, [config, courseId, groupId]);

  const { data, error, loading, reload } = useAsyncResource(loadData, [config, courseId, groupId], config != null);

  const course = data?.course;
  const group = data?.group;
  const members = data?.members ?? [];
  const accessDenied = data?.accessDenied ?? false;

  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {loading ? <LoadingState label="Loading group..." /> : null}
            {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
            
            {!loading && !error && course ? (
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
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to groups</Text>
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
                          {group?.name ?? "Group"}
                        </Text>
                        <Text style={[styles.courseName, { color: colors.mutedForeground }]}>
                          {formatSubjectName(course.name)}
                        </Text>
                      </View>
                    </View>
                    {group && (
                      <View style={styles.badges}>
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.foreground }]}>
                            {group.members_count ?? members.length} members
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
                      {accessDenied ? "Group locked" : "Members"}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                      {accessDenied 
                        ? "Canvas does not allow this account to open this group."
                        : "People visible inside this group"
                      }
                    </Text>
                  </View>
                  <View style={styles.cardContent}>
                    {accessDenied ? (
                      <View style={[styles.accessDeniedBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                        <Text style={[styles.accessDeniedText, { color: colors.mutedForeground }]}>
                          You do not have permission to view this group. Canvas currently only allows this account to open groups you are authorized to access.
                        </Text>
                      </View>
                    ) : members.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        No members available for this group.
                      </Text>
                    ) : (
                      members.map((person) => (
                        <Pressable
                          key={person.id}
                          onPress={() => router.push(`/subjects/${courseId}/people/${person.id}`)}
                          style={[styles.memberCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                        >
                          <View style={[styles.memberAvatar, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                            <Text style={[styles.memberAvatarText, { color: colors.foreground }]}>
                              {getInitials(person.name)}
                            </Text>
                          </View>
                          <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                              {person.name}
                            </Text>
                            <Text style={[styles.memberMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {person.short_name ?? person.sortable_name ?? "Canvas user"}
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
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: "600",
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
