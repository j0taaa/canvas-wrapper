import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bookmark, CalendarDays, House, Inbox, LibraryBig, UserRound } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSubjectName, getAppShellData, getSubjectColorPalette, orderSubjectsByPreference } from "@canvas/shared";
import { useAsyncResource } from "../hooks/use-async-resource";
import { useAppPreferences } from "../providers/app-preferences";
import { useCanvasSession } from "../providers/canvas-session";

const navItems = [
  { href: "/", key: "dashboard", label: "Dashboard", icon: House },
  { href: "/calendar", key: "calendar", label: "Calendar", icon: CalendarDays },
  { href: "/inbox", key: "inbox", label: "Inbox", icon: Inbox },
  { href: "/bookmarks", key: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/profile", key: "profile", label: "Profile", icon: UserRound },
] as const;

function useChromeColors() {
  const { resolvedTheme } = useAppPreferences();

  return resolvedTheme === "dark"
    ? {
        bar: "rgba(2,6,23,0.96)",
        border: "rgba(255,255,255,0.12)",
        chip: "#020617",
        chipActive: "#f8fafc",
        chipText: "#cbd5e1",
        chipTextActive: "#0f172a",
        libraryBackground: "rgba(255,255,255,0.05)",
        subjectBar: "rgba(2,6,23,0.96)",
        tabInactive: "rgba(241,245,249,0.58)",
        tabTextActive: "#0f172a",
        tabTextInactive: "#cbd5e1",
      }
    : {
        bar: "rgba(255,255,255,0.96)",
        border: "rgba(15,23,42,0.08)",
        chip: "#ffffff",
        chipActive: "#111111",
        chipText: "rgba(15,23,42,0.74)",
        chipTextActive: "#ffffff",
        libraryBackground: "#f8fafc",
        subjectBar: "rgba(255,255,255,0.96)",
        tabInactive: "rgba(15,23,42,0.48)",
        tabTextActive: "#ffffff",
        tabTextInactive: "rgba(15,23,42,0.64)",
      };
}

export function MobileChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useChromeColors();
  const { config } = useCanvasSession();
  const { subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const isDashboardSection = pathname === "/" || pathname.startsWith("/subjects/");
  const currentCourseId = useMemo(() => {
    const match = pathname.match(/^\/subjects\/(\d+)/);
    const parsed = Number(match?.[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }, [pathname]);
  const shellState = useAsyncResource(() => getAppShellData(config!), [config], config != null);

  const visibleCourses = useMemo(() => {
    const courses = shellState.data?.courses ?? [];
    return orderSubjectsByPreference(
      courses.filter((course: { id: number }) => !subjectPreferences.hiddenCourseIds.includes(course.id)),
      subjectPreferences.orderedCourseIds,
    );
  }, [shellState.data?.courses, subjectPreferences.hiddenCourseIds, subjectPreferences.orderedCourseIds]);

  const showSubjectBar = Boolean(
    config && subjectPreferences.showMobileSubjectBar && visibleCourses.length > 0,
  );

  return (
    <View>
      {showSubjectBar ? (
        <View
          style={[
            styles.subjectBar,
            {
              backgroundColor: colors.subjectBar,
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectBarContent}>
            <View
              style={[
                styles.libraryBadge,
                { backgroundColor: colors.libraryBackground, borderColor: colors.border },
              ]}
            >
              <LibraryBig color={colors.chipText} size={16} />
            </View>
            {visibleCourses.map((course: { id: number; name: string; course_code?: string }) => {
              const palette = getSubjectColorPalette(course.name, subjectPreferences.colors[course.id]);
              const active = currentCourseId === course.id;

              return (
                <Pressable
                  key={course.id}
                  onPress={() => {
                    triggerSelectionHaptic();
                    router.push(`/subjects/${course.id}`);
                  }}
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: active ? colors.chipActive : colors.chip,
                      borderColor: active ? colors.chipActive : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.subjectDot, { backgroundColor: palette.borderColor }]} />
                  <Text style={[styles.subjectChipText, { color: active ? colors.chipTextActive : colors.chipText }]}>
                    {formatSubjectName(course.name)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.bar,
            borderColor: colors.border,
            borderTopWidth: showSubjectBar ? 0 : 1,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.key === "dashboard"
              ? isDashboardSection
              : item.key === "calendar"
                ? pathname === "/calendar"
                : item.key === "inbox"
                  ? pathname.startsWith("/inbox")
                  : item.key === "bookmarks"
                    ? pathname === "/bookmarks"
                    : pathname === "/profile" || pathname === "/settings";

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                triggerSelectionHaptic();
                router.push(item.href);
              }}
              style={({ pressed }) => [
                styles.tabItem,
                active && { backgroundColor: colors.chipActive },
                pressed && styles.pressed,
              ]}
            >
              <Icon color={active ? colors.tabTextActive : colors.tabInactive} size={18} />
              <Text style={[styles.tabLabel, { color: active ? colors.tabTextActive : colors.tabTextInactive }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  libraryBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  pressed: {
    opacity: 0.84,
  },
  subjectBar: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  subjectBarContent: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  subjectChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  subjectDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  tabBar: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
