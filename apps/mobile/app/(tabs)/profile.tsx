import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  EyeOff,
  Mail,
  MonitorCog,
  MoonStar,
  Palette,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SunMedium,
  UserRound,
} from "lucide-react-native";
import {
  getLocaleDisplayName,
  t,
  formatSubjectName,
  getSubjectColorHex,
  getSubjectColorPalette,
  normalizeSubjectColorHex,
  orderSubjectsByPreference,
  type LanguagePreference,
  type ThemePreference,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../src/components/app-ui";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useAppShell } from "../../src/hooks/use-canvas-queries";
import { syncDeviceIntegrations } from "../../src/lib/device-integration-sync";
import { formatDateTime } from "../../src/lib/format";
import { openAppHref } from "../../src/lib/navigation";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { useCanvasSession } from "../../src/providers/canvas-session";
import { DeviceIntegrationProvider, useDeviceIntegrations } from "../../src/providers/device-integrations";

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
  { icon: MonitorCog, label: "settings.systemTheme", value: "system" },
  { icon: SunMedium, label: "settings.light", value: "light" },
  { icon: MoonStar, label: "settings.dark", value: "dark" },
];

const languageOptions: LanguagePreference[] = ["system", "en", "pt-BR"];

export default function ProfileTab() {
  return (
    <DeviceIntegrationProvider>
      <ProfileTabContent />
    </DeviceIntegrationProvider>
  );
}

function ProfileTabContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { config } = useCanvasSession();
  const {
    languagePreference,
    resolvedLocale,
    resolvedTheme,
    subjectPreferences,
    themePreference,
    triggerSelectionHaptic,
    updateLanguagePreference,
  } = useAppPreferences();
  const deviceIntegrations = useDeviceIntegrations();

  const colors = useMemo(
    () => ({
      background: resolvedTheme === "dark" ? "#000000" : "#ffffff",
      card: resolvedTheme === "dark" ? "#000000" : "#ffffff",
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

  const { data, error, isLoading, isFetching, refetch } = useAppShell();
  const { onRefresh, refreshing } = useRefreshControl(async () => {
    await refetch();

    if (config) {
      await syncDeviceIntegrations({
        config,
        queryClient,
        reason: "profile-refresh",
      });
    }
  });
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);

  const orderedCourses = useMemo(
    () =>
      data
        ? orderSubjectsByPreference(
            data.courses.filter((course: {name?: string}) => course.name),
            subjectPreferences.orderedCourseIds,
          )
        : [],
    [data, subjectPreferences.orderedCourseIds],
  );

  return (
    <RequireCanvasConfig>
      <AppScreen title={t(resolvedLocale, "common.profile")} scroll={false}>
        <RestorableScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 72 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.mutedForeground}
            />
          }
        >
          <View style={styles.container}>
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "profile.loadingProfile")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}

            {data ? (
              <View style={styles.cardsContainer}>
                {/* Account Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* CardHeader border-b border-border/70 */}
                    <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t(resolvedLocale, "common.account")}</Text>
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
                          <Text style={[styles.infoCardLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.name")}</Text>
                        </View>
                        {/* text-sm text-foreground */}
                        <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={1}>
                          {data.profile.name}
                        </Text>
                      </View>

                      <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                        <View style={styles.infoCardHeader}>
                          <Mail size={16} color={colors.mutedForeground} />
                          <Text style={[styles.infoCardLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.email")}</Text>
                        </View>
                        <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={1}>
                          {data.profile.primary_email ?? t(resolvedLocale, "common.noEmailAvailable")}
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
                      <Text style={[styles.changeKeyText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.changeApiKey")}</Text>
                    </Pressable>
                  </View>
                </View>

                <ProfilePreferences
                  deviceIntegrations={deviceIntegrations}
                  courses={orderedCourses}
                  colors={colors}
                  languagePreference={languagePreference}
                  resolvedLocale={resolvedLocale}
                  resolvedTheme={resolvedTheme}
                  subjectPreferences={subjectPreferences}
                  themePreference={themePreference}
                  updateLanguagePreference={updateLanguagePreference}
                />
              </View>
            ) : null}
          </View>
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

function ProfilePreferences({
  deviceIntegrations,
  courses,
  colors,
  languagePreference,
  resolvedLocale,
  resolvedTheme,
  subjectPreferences,
  themePreference,
  updateLanguagePreference,
}: {
  deviceIntegrations: ReturnType<typeof useDeviceIntegrations>;
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
  languagePreference: LanguagePreference;
  resolvedLocale: "en" | "pt-BR";
  resolvedTheme: "light" | "dark";
  subjectPreferences: {
    hiddenCourseIds: number[];
    orderedCourseIds: number[];
    colors: Record<number, string>;
    showMobileSubjectBar: boolean;
    compactMobileDashboardSubjects: boolean;
  };
  themePreference: ThemePreference;
  updateLanguagePreference: (preference: LanguagePreference) => Promise<void>;
}) {
  const router = useRouter();
  const {
    deviceIntegrationPreferences,
    hapticsEnabled,
    updateHapticsEnabled,
    updateSubjectPreferences,
    updateThemePreference,
    triggerSelectionHaptic,
  } =
    useAppPreferences();

  const toggleReminderOffset = (offset: "day-7am" | "3h" | "1h") => {
    const nextOffsets = deviceIntegrationPreferences.activityReminderOffsets.includes(offset)
      ? deviceIntegrationPreferences.activityReminderOffsets.filter((candidate) => candidate !== offset)
      : [...deviceIntegrationPreferences.activityReminderOffsets, offset];

    triggerSelectionHaptic();
    void deviceIntegrations.setReminderOffsets(nextOffsets);
  };

  return (
    <View style={styles.preferencesContainer}>
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>{t(resolvedLocale, "settings.appLanguageTitle")}</Text>
        <View style={styles.optionsRow}>
          {languageOptions.map((option) => {
            const isActive = languagePreference === option;
            const label = option === "system" ? t(resolvedLocale, "common.system") : getLocaleDisplayName(option, resolvedLocale);

            return (
              <Pressable
                key={option}
                onPress={() => {
                  triggerSelectionHaptic();
                  void updateLanguagePreference(option);
                }}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.optionButtonText, { color: isActive ? colors.primaryText : colors.mutedForeground }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.languageDescription")}
        </Text>
        {languagePreference === "system" ? (
          <Text style={[styles.preferenceDescription, styles.tightDescription, { color: colors.mutedForeground }]}>
            {t(resolvedLocale, "settings.languageSystemDescription", {
              language: getLocaleDisplayName(resolvedLocale, resolvedLocale),
            })}
          </Text>
        ) : null}
      </View>

      {/* ThemePreferenceSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>{t(resolvedLocale, "common.appearance")}</Text>
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
                    {t(resolvedLocale, option.label as "settings.systemTheme" | "settings.light" | "settings.dark")}
                  </Text>
                </Pressable>
              );
            })}
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.themeDescription")}
        </Text>
      </View>

      {/* HapticsPreferenceSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>{t(resolvedLocale, "settings.haptics")}</Text>
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
              {t(resolvedLocale, "common.off")}
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
              {t(resolvedLocale, "common.on")}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.hapticsDescription")}
        </Text>
      </View>

      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <View style={styles.preferenceTitleRow}>
          <CalendarDays size={16} color={colors.mutedForeground} />
          <Text style={[styles.preferenceLabelInline, { color: colors.foreground }]}>{t(resolvedLocale, "settings.phoneCalendarSync")}</Text>
        </View>
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void deviceIntegrations.setCalendarSyncEnabled(false);
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: !deviceIntegrationPreferences.calendarSyncEnabled ? colors.primary : colors.card,
                borderColor: !deviceIntegrationPreferences.calendarSyncEnabled ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                { color: !deviceIntegrationPreferences.calendarSyncEnabled ? colors.primaryText : colors.mutedForeground },
              ]}
            >
              {t(resolvedLocale, "common.off")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void deviceIntegrations.setCalendarSyncEnabled(true);
            }}
            style={[
              styles.optionButton,
              {
                backgroundColor: deviceIntegrationPreferences.calendarSyncEnabled ? colors.primary : colors.card,
                borderColor: deviceIntegrationPreferences.calendarSyncEnabled ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                { color: deviceIntegrationPreferences.calendarSyncEnabled ? colors.primaryText : colors.mutedForeground },
              ]}
            >
              {t(resolvedLocale, "common.on")}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.phoneCalendarSyncDescription")}
        </Text>
        <View style={[styles.statusCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {t(resolvedLocale, "common.calendarPermission", {
              value: deviceIntegrations.calendarPermissionStatus ?? t(resolvedLocale, "common.unknown"),
            })}
          </Text>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {t(resolvedLocale, "common.lastSync", {
              value: deviceIntegrations.lastSyncAt
                ? formatDateTime(resolvedLocale, deviceIntegrations.lastSyncAt)
                : t(resolvedLocale, "common.never"),
            })}
          </Text>
          {deviceIntegrations.syncError ? (
            <Text style={[styles.statusErrorText, { color: "#dc2626" }]}>{deviceIntegrations.syncError}</Text>
          ) : null}
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              void deviceIntegrations.syncNow();
            }}
            style={[
              styles.syncNowButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: deviceIntegrations.syncing ? 0.6 : 1,
              },
            ]}
            disabled={deviceIntegrations.syncing}
          >
            <RefreshCcw size={14} color={colors.mutedForeground} />
            <Text style={[styles.syncNowButtonText, { color: colors.foreground }]}>
              {deviceIntegrations.syncing ? t(resolvedLocale, "settings.syncing") : t(resolvedLocale, "settings.syncNow")}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <View style={styles.preferenceTitleRow}>
          <Bell size={16} color={colors.mutedForeground} />
          <Text style={[styles.preferenceLabelInline, { color: colors.foreground }]}>{t(resolvedLocale, "settings.reminders")}</Text>
        </View>
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => toggleReminderOffset("day-7am")}
            style={[
              styles.optionButton,
              {
                backgroundColor: deviceIntegrationPreferences.activityReminderOffsets.includes("day-7am")
                  ? colors.primary
                  : colors.card,
                borderColor: deviceIntegrationPreferences.activityReminderOffsets.includes("day-7am")
                  ? colors.primary
                  : colors.border,
              },
            ]}
          >
            <Clock3
              size={16}
              color={
                deviceIntegrationPreferences.activityReminderOffsets.includes("day-7am")
                  ? colors.primaryText
                  : colors.mutedForeground
              }
            />
            <Text
              style={[
                styles.optionButtonText,
                {
                  color: deviceIntegrationPreferences.activityReminderOffsets.includes("day-7am")
                    ? colors.primaryText
                    : colors.mutedForeground,
                },
              ]}
            >
              {t(resolvedLocale, "settings.reminderSevenAm")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => toggleReminderOffset("3h")}
            style={[
              styles.optionButton,
              {
                backgroundColor: deviceIntegrationPreferences.activityReminderOffsets.includes("3h")
                  ? colors.primary
                  : colors.card,
                borderColor: deviceIntegrationPreferences.activityReminderOffsets.includes("3h")
                  ? colors.primary
                  : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                {
                  color: deviceIntegrationPreferences.activityReminderOffsets.includes("3h")
                    ? colors.primaryText
                    : colors.mutedForeground,
                },
              ]}
            >
              {t(resolvedLocale, "settings.reminderThreeHours")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => toggleReminderOffset("1h")}
            style={[
              styles.optionButton,
              {
                backgroundColor: deviceIntegrationPreferences.activityReminderOffsets.includes("1h")
                  ? colors.primary
                  : colors.card,
                borderColor: deviceIntegrationPreferences.activityReminderOffsets.includes("1h")
                  ? colors.primary
                  : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionButtonText,
                {
                  color: deviceIntegrationPreferences.activityReminderOffsets.includes("1h")
                    ? colors.primaryText
                    : colors.mutedForeground,
                },
              ]}
            >
              {t(resolvedLocale, "settings.reminderOneHour")}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.remindersDescription")}
        </Text>
        <Text style={[styles.preferenceDescription, styles.tightDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "common.notificationPermission", {
            value: deviceIntegrations.notificationPermissionStatus ?? t(resolvedLocale, "common.unknown"),
          })}
        </Text>
      </View>

      {/* MobileSubjectBarSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>{t(resolvedLocale, "settings.mobileSubjectBar")}</Text>
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
              {t(resolvedLocale, "common.show")}
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
              {t(resolvedLocale, "common.hide")}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.mobileSubjectBarDescription")}
        </Text>
      </View>

      {/* MobileDashboardSubjectSizeSelector */}
      <View style={[styles.preferenceCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>{t(resolvedLocale, "settings.mobileDashboardSubjects")}</Text>
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
              {t(resolvedLocale, "common.default")}
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
              {t(resolvedLocale, "common.compact")}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.preferenceDescription, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.mobileDashboardSubjectsDescription")}
        </Text>
      </View>

      {/* Description div */}
      <View style={[styles.descriptionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
          {t(resolvedLocale, "settings.overviewDescription")}
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
      <View style={[styles.signatureCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.signatureGlowPrimary, { backgroundColor: resolvedTheme === "dark" ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.18)" }]} />
        <View style={[styles.signatureGlowSecondary, { backgroundColor: resolvedTheme === "dark" ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.14)" }]} />
        <View style={styles.signatureContent}>
          <View style={[styles.signatureBadge, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <Sparkles size={14} color={colors.foreground} />
            <Text style={[styles.signatureBadgeText, { color: colors.foreground }]}>Janvas</Text>
          </View>
          <Text style={[styles.signatureEyebrow, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.madeBy")}</Text>
          <Text style={[styles.signatureName, { color: colors.foreground }]}>Gabriel Jota Lizardo</Text>
          <View style={styles.signatureActions}>
            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                void openAppHref(router, "/privacy");
              }}
              style={[styles.signatureActionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <View style={styles.signatureActionHeader}>
                <View style={[styles.signatureActionIcon, { backgroundColor: resolvedTheme === "dark" ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.18)" }]}>
                  <ShieldCheck size={16} color={colors.foreground} />
                </View>
                <ArrowUpRight size={14} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.signatureActionTitle, { color: colors.foreground }]}>{t(resolvedLocale, "common.privacyPolicy")}</Text>
              <Text style={[styles.signatureActionValue, { color: colors.mutedForeground }]}>Janvas</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                void openAppHref(router, "mailto:gabrieljotalizardo@gmail.com");
              }}
              style={[styles.signatureActionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <View style={styles.signatureActionHeader}>
                <View style={[styles.signatureActionIcon, { backgroundColor: resolvedTheme === "dark" ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.18)" }]}>
                  <Mail size={16} color={colors.foreground} />
                </View>
                <ArrowUpRight size={14} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.signatureActionTitle, { color: colors.foreground }]}>{t(resolvedLocale, "settings.suggestions")}</Text>
              <Text style={[styles.signatureActionValue, { color: colors.mutedForeground }]} numberOfLines={1}>gabrieljotalizardo@gmail.com</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                void openAppHref(router, "https://www.linkedin.com/in/gabriel-jota-lizardo-4587a427b/");
              }}
              style={[styles.signatureActionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <View style={styles.signatureActionHeader}>
                <View style={[styles.signatureActionIcon, { backgroundColor: resolvedTheme === "dark" ? "rgba(52,211,153,0.12)" : "rgba(52,211,153,0.18)" }]}>
                  <ArrowUpRight size={16} color={colors.foreground} />
                </View>
                <ArrowUpRight size={14} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.signatureActionTitle, { color: colors.foreground }]}>{t(resolvedLocale, "settings.linkedIn")}</Text>
              <Text style={[styles.signatureActionValue, { color: colors.mutedForeground }]} numberOfLines={1}>Gabriel Jota Lizardo</Text>
            </Pressable>
          </View>
        </View>
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
  const { resolvedLocale } = useAppPreferences();
  const [isExpanded, setIsExpanded] = useState(false);
  const [draftColors, setDraftColors] = useState<Record<number, string>>({});

  useEffect(() => {
    const nextDraftColors = Object.fromEntries(
      courses.map((course) => [course.id, subjectPreferences.colors[course.id] ?? getSubjectColorHex(course.name)]),
    );

    setDraftColors(nextDraftColors);
  }, [courses, subjectPreferences.colors]);

  const setCourseHidden = (courseId: number, hidden: boolean) => {
    const nextHiddenIds = hidden
      ? Array.from(new Set([...subjectPreferences.hiddenCourseIds, courseId]))
      : subjectPreferences.hiddenCourseIds.filter((candidateId) => candidateId !== courseId);

    void onUpdatePreferences({
      ...subjectPreferences,
      hiddenCourseIds: nextHiddenIds,
    });
  };

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

  const applyCourseColor = (courseId: number) => {
    const normalizedColor = normalizeSubjectColorHex(draftColors[courseId]);

    if (!normalizedColor) {
      return;
    }

    triggerHaptic();

    void onUpdatePreferences({
      ...subjectPreferences,
      colors: {
        ...subjectPreferences.colors,
        [courseId]: normalizedColor,
      },
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
          <Text style={[styles.subjectsButtonTitle, { color: colors.foreground }]}>{t(resolvedLocale, "common.subjects")}</Text>
          <Text style={[styles.subjectsButtonSubtitle, { color: colors.mutedForeground }]}>
            {t(resolvedLocale, "settings.subjectsDescription")}
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
              {t(resolvedLocale, "settings.subjectsOrderDescription")}
            </Text>
            {subjectPreferences.orderedCourseIds.length > 0 && (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  void onUpdatePreferences({ ...subjectPreferences, orderedCourseIds: [] });
                }}
              >
                <Text style={[styles.resetOrderText, { color: colors.foreground }]}>{t(resolvedLocale, "common.resetOrder")}</Text>
              </Pressable>
            )}
          </View>

          {courses.map((course, index) => {
            const isHidden = subjectPreferences.hiddenCourseIds.includes(course.id);
            const preferredColor = subjectPreferences.colors[course.id];
            const palette = getSubjectColorPalette(course.name, preferredColor);
            const draftColor = draftColors[course.id] ?? getSubjectColorHex(course.name);
            const normalizedDraftColor = normalizeSubjectColorHex(draftColor);
            const effectiveColor = normalizedDraftColor ?? preferredColor ?? getSubjectColorHex(course.name);
            const swatchColors = Array.from(
              new Set([
                getSubjectColorHex(course.name),
                "#3b82f6",
                "#14b8a6",
                "#22c55e",
                "#f59e0b",
                "#ef4444",
                "#a855f7",
              ]),
            );

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
                      {course.course_code ?? t(resolvedLocale, "common.subject")}
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
                      <Switch
                        value={!isHidden}
                        onValueChange={(visible) => {
                          triggerHaptic();
                          setCourseHidden(course.id, !visible);
                        }}
                        trackColor={{
                          false: colors.cardMuted,
                          true: palette.borderColor,
                        }}
                        thumbColor={!isHidden ? colors.card : colors.foreground}
                      />
                      <Text style={[styles.visibilityText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.visible")}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.colorSection}>
                  <View style={styles.colorPickerRow}>
                    <Palette size={16} color={colors.mutedForeground} />
                    <Text style={[styles.colorLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.color")}</Text>
                    <View style={[styles.colorInputContainer, { borderColor: colors.border }]}>
                      <View style={[styles.colorPreview, { backgroundColor: effectiveColor }]} />
                    </View>
                  </View>
                  <View style={styles.colorEditor}>
                    <View style={styles.colorInputRow}>
                      <TextInput
                        value={draftColor}
                        onChangeText={(value) => {
                          setDraftColors((current) => ({
                            ...current,
                            [course.id]: value,
                          }));
                        }}
                        placeholder="#3b82f6"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={7}
                        style={[
                          styles.colorTextInput,
                          {
                            backgroundColor: colors.card,
                            borderColor: normalizedDraftColor ? colors.border : "#dc2626",
                            color: colors.foreground,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={() => applyCourseColor(course.id)}
                        disabled={!normalizedDraftColor}
                        style={[
                          styles.colorApplyButton,
                          {
                            backgroundColor: normalizedDraftColor ? colors.primary : colors.card,
                            borderColor: normalizedDraftColor ? colors.primary : colors.border,
                            opacity: normalizedDraftColor ? 1 : 0.55,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.colorApplyButtonText,
                            { color: normalizedDraftColor ? colors.primaryText : colors.mutedForeground },
                          ]}
                        >
                          {t(resolvedLocale, "common.apply")}
                        </Text>
                      </Pressable>
                    </View>
                    <Text
                      style={[
                        styles.colorHelperText,
                        { color: normalizedDraftColor ? colors.mutedForeground : "#dc2626" },
                      ]}
                    >
                      {normalizedDraftColor
                        ? t(resolvedLocale, "settings.subjectColorHint")
                        : t(resolvedLocale, "settings.subjectColorInvalid")}
                    </Text>
                    <View style={styles.swatchRow}>
                      {swatchColors.map((swatchColor) => (
                        <Pressable
                          key={`${course.id}-${swatchColor}`}
                          onPress={() => {
                            triggerHaptic();
                            setDraftColors((current) => ({
                              ...current,
                              [course.id]: swatchColor,
                            }));
                            void onUpdatePreferences({
                              ...subjectPreferences,
                              colors: {
                                ...subjectPreferences.colors,
                                [course.id]: swatchColor,
                              },
                            });
                          }}
                          style={[
                            styles.swatchButton,
                            {
                              backgroundColor: swatchColor,
                              borderColor: effectiveColor.toLowerCase() === swatchColor.toLowerCase()
                                ? colors.foreground
                                : colors.border,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                  {preferredColor && (
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        const nextColors = { ...subjectPreferences.colors };
                        delete nextColors[course.id];
                        setDraftColors((current) => ({
                          ...current,
                          [course.id]: getSubjectColorHex(course.name),
                        }));
                        void onUpdatePreferences({ ...subjectPreferences, colors: nextColors });
                      }}
                    >
                      <Text style={[styles.resetColorText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.resetColor")}</Text>
                    </Pressable>
                  )}
                  {isHidden && (
                    <View style={[styles.hiddenBadge, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                      <EyeOff size={12} color={colors.mutedForeground} />
                      <Text style={[styles.hiddenBadgeText, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.hidden")}</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
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
    marginBottom: 12,
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
  preferenceLabelInline: {
    fontSize: 14,
    fontWeight: "500",
  },
  preferenceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  tightDescription: {
    marginTop: 8,
  },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusErrorText: {
    fontSize: 12,
    lineHeight: 18,
  },
  syncNowButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncNowButtonText: {
    fontSize: 13,
    fontWeight: "500",
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
    gap: 12,
    marginTop: 16,
  },
  colorEditor: {
    gap: 12,
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
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorTextInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  colorApplyButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  colorApplyButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  colorHelperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatchButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
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
  signatureCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: "relative",
  },
  signatureGlowPrimary: {
    borderRadius: 999,
    height: 120,
    position: "absolute",
    right: -32,
    top: -24,
    width: 120,
  },
  signatureGlowSecondary: {
    borderRadius: 999,
    bottom: -34,
    height: 140,
    left: -24,
    position: "absolute",
    width: 140,
  },
  signatureContent: {
    gap: 14,
  },
  signatureBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signatureBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  signatureEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  signatureName: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  signatureActions: {
    gap: 10,
  },
  signatureActionCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  signatureActionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureActionIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  signatureActionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  signatureActionValue: {
    fontSize: 12,
    lineHeight: 18,
  },
});
