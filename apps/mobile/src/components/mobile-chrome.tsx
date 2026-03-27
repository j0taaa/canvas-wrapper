import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bookmark, CalendarDays, House, Inbox, LibraryBig, UserRound } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  APP_WELCOME_STORAGE_KEY,
  formatSubjectName,
  getSubjectColorPalette,
  orderSubjectsByPreference,
  t,
} from "@canvas/shared";
import { useAppShell } from "../hooks/use-canvas-queries";
import { useTabletLayout } from "../hooks/use-tablet-layout";
import { useAppPreferences } from "../providers/app-preferences";
import { useCanvasSession } from "../providers/canvas-session";

const navItems = [
  { href: "/", key: "dashboard", icon: House },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/inbox", key: "inbox", icon: Inbox },
  { href: "/bookmarks", key: "bookmarks", icon: Bookmark },
  { href: "/profile", key: "profile", icon: UserRound },
] as const;

const janvasLogo = require("../../assets/icon.png");

function useChromeColors() {
  const { resolvedTheme } = useAppPreferences();

  return resolvedTheme === "dark"
    ? {
        bar: "rgba(0,0,0,0.96)",
        border: "rgba(255,255,255,0.12)",
        chip: "#000000",
        chipActive: "#f8fafc",
        chipText: "#cbd5e1",
        chipTextActive: "#0f172a",
        libraryBackground: "rgba(255,255,255,0.05)",
        subjectBar: "rgba(0,0,0,0.96)",
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
  const { isTabletLandscape } = useTabletLayout();
  const colors = useChromeColors();
  const { config, ready } = useCanvasSession();
  const { resolvedLocale, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const isDashboardSection = pathname === "/" || pathname.startsWith("/subjects/");
  const currentCourseId = useMemo(() => {
    const match = pathname.match(/^\/subjects\/(\d+)/);
    const parsed = Number(match?.[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }, [pathname]);
  const { data: shellData } = useAppShell();

  useEffect(() => {
    let cancelled = false;

    if (!ready) {
      return () => {
        cancelled = true;
      };
    }

    if (config) {
      setHasSeenWelcome(true);
      return () => {
        cancelled = true;
      };
    }

    void AsyncStorage.getItem(APP_WELCOME_STORAGE_KEY)
      .then((value) => {
        if (!cancelled) {
          setHasSeenWelcome(value === "true");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasSeenWelcome(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config, ready]);

  const visibleCourses = useMemo(() => {
    const courses = shellData?.courses ?? [];
    return orderSubjectsByPreference(
      courses.filter((course: { id: number }) => !subjectPreferences.hiddenCourseIds.includes(course.id)),
      subjectPreferences.orderedCourseIds,
    );
  }, [shellData?.courses, subjectPreferences.hiddenCourseIds, subjectPreferences.orderedCourseIds]);

  const showSubjectBar = Boolean(
    config && subjectPreferences.showMobileSubjectBar && visibleCourses.length > 0,
  );
  const hideForSetup = !config;

  if (hideForSetup) {
    return null;
  }

  if (isTabletLandscape) {
    return (
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor: colors.bar,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingTop: Math.max(insets.top, 16),
          },
        ]}
      >
        <View style={styles.sidebarHeader}>
          <View
            style={[
              styles.libraryBadge,
              styles.sidebarLibraryBadge,
              { backgroundColor: colors.libraryBackground, borderColor: colors.border },
            ]}
          >
            <Image source={janvasLogo} style={styles.sidebarLogo} />
          </View>
          <Text style={[styles.sidebarTitle, { color: colors.chipText }]}>Janvas</Text>
        </View>

        <View style={styles.sidebarNav}>
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
            const dashboardReturnsHome = item.key === "dashboard" && pathname.startsWith("/subjects/");
            const targetHref = dashboardReturnsHome ? "/" : item.href;

            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  if (active && !dashboardReturnsHome) {
                    return;
                  }

                  triggerSelectionHaptic();
                  router.navigate(targetHref);
                }}
                style={({ pressed }) => [
                  styles.sidebarNavItem,
                  {
                    backgroundColor: active ? colors.chipActive : colors.chip,
                    borderColor: active ? colors.chipActive : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Icon color={active ? colors.tabTextActive : colors.tabInactive} size={18} />
                <Text style={[styles.sidebarNavLabel, { color: active ? colors.tabTextActive : colors.tabTextInactive }]}>
                  {t(resolvedLocale, `navigation.${item.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showSubjectBar ? (
          <View style={[styles.sidebarSubjectsSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.sidebarSectionLabel, { color: colors.tabTextInactive }]}>
              {t(resolvedLocale, "common.subjects")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarSubjectsContent}>
              {visibleCourses.map((course: { id: number; name: string; course_code?: string }) => {
                const palette = getSubjectColorPalette(course.name, subjectPreferences.colors[course.id]);
                const active = currentCourseId === course.id;

                return (
                  <Pressable
                    key={course.id}
                    onPress={() => {
                      if (currentCourseId === course.id) {
                        return;
                      }

                      triggerSelectionHaptic();
                      router.navigate(`/subjects/${course.id}`);
                    }}
                    style={[
                      styles.sidebarSubjectItem,
                      {
                        backgroundColor: active ? colors.chipActive : colors.chip,
                        borderColor: active ? colors.chipActive : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.subjectDot, { backgroundColor: palette.borderColor }]} />
                    <Text
                      numberOfLines={2}
                      style={[styles.sidebarSubjectText, { color: active ? colors.chipTextActive : colors.chipText }]}
                    >
                      {formatSubjectName(course.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  }

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
                    if (currentCourseId === course.id) {
                      return;
                    }

                    triggerSelectionHaptic();
                    router.navigate(`/subjects/${course.id}`);
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
            paddingBottom: Math.max(insets.bottom, 8),
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
          const dashboardReturnsHome = item.key === "dashboard" && pathname.startsWith("/subjects/");
          const targetHref = dashboardReturnsHome ? "/" : item.href;

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (active && !dashboardReturnsHome) {
                  return;
                }

                triggerSelectionHaptic();
                router.navigate(targetHref);
              }}
              style={({ pressed }) => [
                styles.tabItem,
                active && { backgroundColor: colors.chipActive },
                pressed && styles.pressed,
              ]}
            >
              <Icon color={active ? colors.tabTextActive : colors.tabInactive} size={18} />
              <Text style={[styles.tabLabel, { color: active ? colors.tabTextActive : colors.tabTextInactive }]}>
                {t(resolvedLocale, `navigation.${item.key}`)}
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
  sidebar: {
    borderRightWidth: 1,
    paddingHorizontal: 12,
    width: 220,
  },
  sidebarHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingBottom: 16,
  },
  sidebarLibraryBadge: {
    height: 36,
    overflow: "hidden",
    width: 36,
  },
  sidebarLogo: {
    borderRadius: 10,
    height: 24,
    width: 24,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sidebarNav: {
    gap: 8,
    paddingTop: 16,
  },
  sidebarNavItem: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sidebarNavLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  sidebarSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sidebarSubjectItem: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  sidebarSubjectsContent: {
    gap: 8,
    paddingBottom: 8,
  },
  sidebarSubjectsSection: {
    borderTopWidth: 1,
    flex: 1,
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
  },
  sidebarSubjectText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
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
    paddingTop: 6,
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
});
