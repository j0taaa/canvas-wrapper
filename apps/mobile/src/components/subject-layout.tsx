import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSubjectName, getSubjectColorPalette, getSubjectRouteContext, t } from "@canvas/shared";
import { PlaceholderBlock } from "./app-ui";
import { useCourseShell } from "../hooks/use-canvas-queries";
import { useAppPreferences } from "../providers/app-preferences";

const SUBJECT_TABS = ["modules", "assignments", "grades", "people", "forums", "files"] as const;
type SubjectTab = typeof SUBJECT_TABS[number];
type SubjectHeaderColors = {
  border: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  primaryText: string;
};

function normalizeTab(value?: string): SubjectTab {
  return SUBJECT_TABS.includes(value as SubjectTab) ? (value as SubjectTab) : "modules";
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

function getActiveTab(pathname: string, routeTab?: string, peopleView?: string) {
  const routeContext = getSubjectRouteContext(routeTab, peopleView);

  if (routeContext?.tab && routeContext.tab !== "overview") {
    return normalizeTab(routeContext.tab);
  }

  if (pathname.includes("/assignments/")) return "assignments" as const;
  if (pathname.includes("/files/")) return "files" as const;
  if (pathname.includes("/forums/")) return "forums" as const;
  if (pathname.includes("/grades/")) return "grades" as const;
  if (pathname.includes("/people/") || pathname.includes("/groups/")) return "people" as const;
  if (pathname.includes("/pages/") || pathname.includes("/quizzes/")) return "modules" as const;
  return normalizeTab(routeTab);
}

export function SubjectLayoutHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ courseId: string; peopleView?: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const courseId = Number(params.courseId);
  const { resolvedLocale, resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const { data: shellData } = useCourseShell(courseId);
  const course = shellData?.course;
  const activeTab = getActiveTab(pathname, params.tab, params.peopleView);

  const colors = useMemo<SubjectHeaderColors>(() => {
    const isDark = resolvedTheme === "dark";
    return {
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      card: isDark ? "#000000" : "#ffffff",
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      primary: isDark ? "#f8fafc" : "#0f172a",
      primaryText: isDark ? "#0f172a" : "#ffffff",
    };
  }, [resolvedTheme]);

  const palette = useMemo(() => {
    if (!course) {
      return {
        backgroundColor: "rgba(59, 130, 246, 0.16)",
        borderColor: "#3b82f6",
        color: "rgba(29, 78, 216, 0.95)",
      };
    }

    return getSubjectColorPalette(course.name, subjectPreferences.colors[course.id]);
  }, [course, subjectPreferences.colors]);

  const SubjectIcon = useMemo(() => getSubjectIcon(course?.name), [course?.name]);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={[styles.inner, { paddingTop: Math.max(12, insets.top) }]}>
        {course ? (
          <>
            <View style={styles.headerRow}>
              <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                <SubjectIcon size={20} color={palette.color} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={1}>
                  {formatSubjectName(course.name)}
                </Text>
                <Text style={[styles.courseCode, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {course.course_code ?? t(resolvedLocale, "common.subject")}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
              <View style={styles.tabsRow}>
                {SUBJECT_TABS.map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      triggerSelectionHaptic();
                      router.replace({
                        params:
                          tab === "modules"
                            ? { courseId: String(courseId) }
                            : tab === "people" && pathname.includes("/groups/")
                              ? { courseId: String(courseId), peopleView: "groups", tab }
                              : { courseId: String(courseId), tab },
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
                      {tab === "modules"
                        ? t(resolvedLocale, "subjects.modules")
                        : tab === "assignments"
                          ? t(resolvedLocale, "subjects.assignments")
                          : tab === "grades"
                            ? t(resolvedLocale, "subjects.grades")
                            : tab === "people"
                              ? t(resolvedLocale, "subjects.people")
                              : tab === "forums"
                                ? t(resolvedLocale, "subjects.forums")
                                : t(resolvedLocale, "subjects.files")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <PlaceholderBlock height={64} />
            <View style={styles.loadingTabs}>
              <PlaceholderBlock height={38} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  courseCode: {
    fontSize: 14,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  inner: {
    gap: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  loadingTabs: {
    marginRight: 72,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  tabButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  tabsScroll: {
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  wrapper: {
    borderBottomWidth: 1,
  },
});
