import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  EyeOff,
  Mail,
  MonitorCog,
  MoonStar,
  Palette,
  Smartphone,
  SunMedium,
  UserRound,
} from "lucide-react-native";
import {
  formatSubjectName,
  getAppShellData,
  getSubjectColorHex,
  getSubjectColorPalette,
  orderSubjectsByPreference,
  type ThemePreference,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../src/components/app-ui";
import { useAsyncResource } from "../../src/hooks/use-async-resource";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { useCanvasSession } from "../../src/providers/canvas-session";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const themeOptions: Array<{
  icon: typeof MonitorCog;
  label: string;
  value: ThemePreference;
}> = [
  { icon: MonitorCog, label: "System", value: "system" },
  { icon: SunMedium, label: "Light", value: "light" },
  { icon: MoonStar, label: "Dark", value: "dark" },
];

export default function ProfileTab() {
  const router = useRouter();
  const { config } = useCanvasSession();
  const { resolvedTheme, subjectPreferences, themePreference, triggerSelectionHaptic } = useAppPreferences();

  const colors = useMemo(
    () => ({
      background: resolvedTheme === "dark" ? "#020617" : "#ffffff",
      card: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
      border: resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      foreground: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
      mutedForeground: resolvedTheme === "dark" ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      muted: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      primary: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
      primaryText: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
      cardMuted: resolvedTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
    }),
    [resolvedTheme],
  );

  const loadProfile = useCallback(() => getAppShellData(config!), [config]);
  const { data, error, loading, reload } = useAsyncResource(loadProfile, [config], config != null);

  const orderedCourses = useMemo(
    () =>
      data
        ? orderSubjectsByPreference(
            data.courses.filter((course) => course.name),
            subjectPreferences.orderedCourseIds,
          )
        : [],
    [data, subjectPreferences.orderedCourseIds],
  );

  return (
    <RequireCanvasConfig>
      <AppScreen title="Profile" scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {loading ? <LoadingState label="Loading profile..." /> : null}
            {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}

            {!loading && !error && data ? (
              <View style={styles.cardsContainer}>
                {/* Account Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* CardHeader border-b border-border/70 */}
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account</Text>
                  </View>
                  
                  {/* CardContent pt-6 space-y-5 */}
                  <View style={styles.cardContent}>
                    {/* Avatar section - flex items-center gap-4 */}
                    <View style={styles.avatarSection}>
                      {/* Avatar h-16 w-16 border border-border/80 */}
                      <View style={[styles.avatar, { borderColor: colors.border }]}>
                        <Text style={[styles.avatarText, { color: colors.foreground }]}>
                          {getInitials(data.profile.name)}
                        </Text>
                      </View>
                      {/* min-w-0 */}
                      <View style={styles.avatarInfo}>
                        {/* truncate text-lg font-semibold */}
                        <Text style={[styles.avatarName, { color: colors.foreground }]} numberOfLines={1}>
                          {data.profile.name}
                        </Text>
                        {/* truncate text-sm text-muted-foreground */}
                        <Text style={[styles.avatarEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {data.profile.primary_email}
                        </Text>
                      </View>
                    </View>

                    {/* grid gap-3 */}
                    <View style={styles.infoGrid}>
                      {/* rounded-2xl border border-border/70 bg-muted/35 p-4 */}
                      <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                        {/* mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground */}
                        <View style={styles.infoCardHeader}>
                          <UserRound size={16} color={colors.mutedForeground} />
                          <Text style={[styles.infoCardLabel, { color: colors.mutedForeground }]}>Name</Text>
                        </View>
                        {/* text-sm text-foreground */}
                        <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={1}>
                          {data.profile.name}
                        </Text>
                      </View>

                      <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                        <View style={styles.infoCardHeader}>
                          <Mail size={16} color={colors.mutedForeground} />
                          <Text style={[styles.infoCardLabel, { color: colors.mutedForeground }]}>Email</Text>
                        </View>
                        <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={1}>
                          {data.profile.primary_email ?? "No email available"}
                        </Text>
                      </View>
                    </View>

                    {/* ProfileActions - text-sm text-black/50 */}
                    <Pressable
                      onPress={() => {
                        triggerSelectionHaptic();
                        router.push("/settings");
                      }}
                    >
                      <Text style={[styles.changeKeyText, { color: colors.mutedForeground }]}>Change API key</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Configurations Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Configurations</Text>
                  </View>
                  
                  <View style={styles.cardContent}>
                    {/* ProfilePreferences - space-y-6 */}
                    <ProfilePreferences
                      courses={orderedCourses}
                      colors={colors}
                      subjectPreferences={subjectPreferences}
                      themePreference={themePreference}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

function ProfilePreferences({
  courses,
  colors,
  subjectPreferences,
  themePreference,
}: {
  courses: Array<{ course_code?: string; id: number; name: string }>;
  colors: {
    background: string;
    card: string;
    border: string;
    foreground: string;
    mutedForeground: string;
    muted: string;
    primary: string;
    primaryText: string;
    cardMuted: string;
  };
  subjectPreferences: {
    hiddenCourseIds: number[];
    orderedCourseIds: number[];
    colors: Record<number, string>;
    showMobileSubjectBar: boolean;
    compactMobileDashboardSubjects: boolean;
  };
  themePreference: ThemePreference;
}) {
  const { hapticsEnabled, updateHapticsEnabled, updateSubjectPreferences, updateThemePreference, triggerSelectionHaptic } =
    useAppPreferences();

  return (
    <View style={styles.preferencesContainer}>
      {/* ThemePreferenceSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Appearance</Text>
        <View style={styles.optionsRow}>
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = themePreference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  triggerSelectionHaptic();
                  void updateThemePreference(option.value);
                }}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Icon size={16} color={isActive ? colors.primaryText : colors.mutedForeground} />
                <Text style={[styles.optionButtonText, { color: isActive ? colors.primaryText : colors.mutedForeground }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          Use the system theme by default, or force light or dark mode for the whole app.
        </Text>
      </View>

      {/* HapticsPreferenceSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Haptic feedback</Text>
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void updateHapticsEnabled(false);
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: !hapticsEnabled ? colors.primary : colors.card,
                borderColor: !hapticsEnabled ? colors.primary : colors.border,
              },
            ]}
          >
            <Smartphone size={16} color={!hapticsEnabled ? colors.primaryText : colors.mutedForeground} />
            <Text style={[styles.optionButtonText, { color: !hapticsEnabled ? colors.primaryText : colors.mutedForeground }]}>
              Off
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void updateHapticsEnabled(true);
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: hapticsEnabled ? colors.primary : colors.card,
                borderColor: hapticsEnabled ? colors.primary : colors.border,
              },
            ]}
          >
            <Smartphone size={16} color={hapticsEnabled ? colors.primaryText : colors.mutedForeground} />
            <Text style={[styles.optionButtonText, { color: hapticsEnabled ? colors.primaryText : colors.mutedForeground }]}>
              On
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          Optional tap feedback for supported phones and touch devices. It is queued asynchronously so it never waits on navigation.
        </Text>
      </View>

      {/* MobileSubjectBarSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Mobile subject bar</Text>
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void updateSubjectPreferences({ ...subjectPreferences, showMobileSubjectBar: true });
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: subjectPreferences.showMobileSubjectBar ? colors.primary : colors.card,
                borderColor: subjectPreferences.showMobileSubjectBar ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                { color: subjectPreferences.showMobileSubjectBar ? colors.primaryText : colors.mutedForeground },
              ]}
            >
              Show
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void updateSubjectPreferences({ ...subjectPreferences, showMobileSubjectBar: false });
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: !subjectPreferences.showMobileSubjectBar ? colors.primary : colors.card,
                borderColor: !subjectPreferences.showMobileSubjectBar ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                { color: !subjectPreferences.showMobileSubjectBar ? colors.primaryText : colors.mutedForeground },
              ]}
            >
              Hide
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          Show or hide the horizontal subject shortcuts above the mobile bottom navigation.
        </Text>
      </View>

      {/* MobileDashboardSubjectSizeSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Mobile dashboard subjects</Text>
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void updateSubjectPreferences({ ...subjectPreferences, compactMobileDashboardSubjects: false });
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: !subjectPreferences.compactMobileDashboardSubjects ? colors.primary : colors.card,
                borderColor: !subjectPreferences.compactMobileDashboardSubjects ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                { color: !subjectPreferences.compactMobileDashboardSubjects ? colors.primaryText : colors.mutedForeground },
              ]}
            >
              Default
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void updateSubjectPreferences({ ...subjectPreferences, compactMobileDashboardSubjects: true });
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: subjectPreferences.compactMobileDashboardSubjects ? colors.primary : colors.card,
                borderColor: subjectPreferences.compactMobileDashboardSubjects ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                { color: subjectPreferences.compactMobileDashboardSubjects ? colors.primaryText : colors.mutedForeground },
              ]}
            >
              Compact
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          Make dashboard subject cards smaller on mobile so two subjects fit per row.
        </Text>
      </View>

      {/* Description div */}
      <View style={[styles.descriptionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
          Hide subjects from the dashboard and navigation, choose your own subject colors, or enable optional haptic feedback.
        </Text>
      </View>

      {/* SubjectPreferenceList */}
      <SubjectPreferenceList
        courses={courses}
        subjectPreferences={subjectPreferences}
        onUpdatePreferences={updateSubjectPreferences}
        triggerHaptic={triggerSelectionHaptic}
        colors={colors}
      />

      {/* Footer */}
      <View style={[styles.descriptionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.footerTitle, { color: colors.foreground }]}>Made by Gabriel Jota Lizardo</Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          Suggestions, fixes, or feedback: <Text style={[styles.footerLink, { color: colors.foreground }]}>gabrieljotalizardo@gmail.com</Text>
        </Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          LinkedIn: <Text style={[styles.footerLink, { color: colors.foreground }]}>Gabriel Jota Lizardo</Text>
        </Text>
      </View>
    </View>
  );
}

function SubjectPreferenceList({
  courses,
  subjectPreferences,
  onUpdatePreferences,
  triggerHaptic,
  colors,
}: {
  courses: Array<{ course_code?: string; id: number; name: string }>;
  subjectPreferences: {
    hiddenCourseIds: number[];
    orderedCourseIds: number[];
    colors: Record<number, string>;
    showMobileSubjectBar: boolean;
    compactMobileDashboardSubjects: boolean;
  };
  onUpdatePreferences: (prefs: typeof subjectPreferences) => Promise<void>;
  triggerHaptic: () => void;
  colors: {
    background: string;
    card: string;
    border: string;
    foreground: string;
    mutedForeground: string;
    muted: string;
    primary: string;
    primaryText: string;
    cardMuted: string;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const moveCourse = (courseId: number, direction: -1 | 1) => {
    triggerHaptic();
    const nextOrderedIds = courses.map((course) => course.id);
    const currentIndex = nextOrderedIds.indexOf(courseId);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= nextOrderedIds.length) {
      return;
    }

    [nextOrderedIds[currentIndex], nextOrderedIds[targetIndex]] = [nextOrderedIds[targetIndex], nextOrderedIds[currentIndex]];

    void onUpdatePreferences({
      ...subjectPreferences,
      orderedCourseIds: nextOrderedIds,
    });
  };

  if (courses.length === 0) {
    return null;
  }

  return (
    <View>
      <Pressable
        onPress={() => {
          triggerHaptic();
          setIsExpanded((current) => !current);
        }}
        style={[styles.subjectsButton, { borderColor: colors.border, backgroundColor: colors.muted }]}
      >
        <View>
          <Text style={[styles.subjectsButtonTitle, { color: colors.foreground }]}>Subjects</Text>
          <Text style={[styles.subjectsButtonSubtitle, { color: colors.mutedForeground }]}>
            Hide subjects, change their colors, and reorder them.
          </Text>
        </View>
        <ChevronDown
          size={16}
          color={colors.mutedForeground}
          style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.infoBar, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <Text style={[styles.infoBarText, { color: colors.mutedForeground }]}>
              Use the arrows to reorder how active subjects appear in the dashboard and navigation.
            </Text>
            {subjectPreferences.orderedCourseIds.length > 0 && (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  void onUpdatePreferences({ ...subjectPreferences, orderedCourseIds: [] });
                }}
              >
                <Text style={[styles.resetOrderText, { color: colors.foreground }]}>Reset order</Text>
              </Pressable>
            )}
          </View>

          {courses.map((course, index) => {
            const isHidden = subjectPreferences.hiddenCourseIds.includes(course.id);
            const preferredColor = subjectPreferences.colors[course.id];
            const palette = getSubjectColorPalette(course.name, preferredColor);
            const inputColor = preferredColor ?? getSubjectColorHex(course.name);

            return (
              <View
                key={course.id}
                style={[styles.subjectCard, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <View style={styles.subjectCardHeader}>
                  <View style={styles.subjectInfo}>
                    <View style={styles.subjectNameRow}>
                      <View style={[styles.subjectDot, { backgroundColor: palette.borderColor }]} />
                      <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={1}>
                        {formatSubjectName(course.name)}
                      </Text>
                    </View>
                    <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>
                      {course.course_code ?? "Subject"}
                    </Text>
                  </View>
                  <View style={styles.subjectControls}>
                    <View style={[styles.arrowButtons, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                      <Pressable
                        onPress={() => moveCourse(course.id, -1)}
                        disabled={index === 0}
                        style={[styles.arrowButton, { opacity: index === 0 ? 0.35 : 1 }]}
                      >
                        <ArrowUp size={14} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable
                        onPress={() => moveCourse(course.id, 1)}
                        disabled={index === courses.length - 1}
                        style={[styles.arrowButton, { opacity: index === courses.length - 1 ? 0.35 : 1 }]}
                      >
                        <ArrowDown size={14} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                    <View style={styles.visibilityControl}>
                      <Text style={[styles.visibilityText, { color: colors.mutedForeground }]}>Visible</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.colorSection}>
                  <View style={styles.colorPickerRow}>
                    <Palette size={16} color={colors.mutedForeground} />
                    <Text style={[styles.colorLabel, { color: colors.mutedForeground }]}>Color</Text>
                    <View style={[styles.colorInputContainer, { borderColor: colors.border }]}>
                      <View style={[styles.colorPreview, { backgroundColor: inputColor }]} />
                    </View>
                  </View>
                  {preferredColor && (
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        const nextColors = { ...subjectPreferences.colors };
                        delete nextColors[course.id];
                        void onUpdatePreferences({ ...subjectPreferences, colors: nextColors });
                      }}
                    >
                      <Text style={[styles.resetColorText, { color: colors.mutedForeground }]}>Reset color</Text>
                    </Pressable>
                  )}
                  {isHidden && (
                    <View style={[styles.hiddenBadge, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                      <EyeOff size={12} color={colors.mutedForeground} />
                      <Text style={[styles.hiddenBadgeText, { color: colors.mutedForeground }]}>Hidden</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardsContainer: {
    gap: 24,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  avatarSection: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "600",
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  avatarEmail: {
    fontSize: 14,
  },
  infoGrid: {
    flexDirection: "column",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoCardLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoCardValue: {
    fontSize: 14,
  },
  changeKeyText: {
    fontSize: 14,
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
  },
  preferencesContainer: {
    gap: 24,
  },
  preferenceCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  preferenceDescription: {
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  descriptionCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  subjectsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  subjectsButtonTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  subjectsButtonSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  expandedContent: {
    marginTop: 12,
    gap: 12,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoBarText: {
    flex: 1,
    fontSize: 12,
  },
  resetOrderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  subjectCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  subjectCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  subjectCode: {
    fontSize: 12,
  },
  subjectControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  arrowButtons: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
  },
  arrowButton: {
    padding: 4,
    borderRadius: 999,
  },
  visibilityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visibilityText: {
    fontSize: 12,
  },
  colorSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  colorPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorLabel: {
    fontSize: 12,
  },
  colorInputContainer: {
    width: 40,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    padding: 4,
  },
  colorPreview: {
    flex: 1,
    borderRadius: 4,
  },
  resetColorText: {
    fontSize: 12,
  },
  hiddenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hiddenBadgeText: {
    fontSize: 11,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    marginTop: 8,
  },
  footerLink: {
    textDecorationLine: "underline",
  },
});
