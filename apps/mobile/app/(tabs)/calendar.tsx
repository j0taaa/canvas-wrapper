import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  getMonthLabel,
  normalizeMonth,
  getSubjectColorPalette,
  formatSubjectName,
  DISPLAY_TIME_ZONE,
} from "@canvas/shared";
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
  SectionCard,
} from "../../src/components/app-ui";
import { useCalendar } from "../../src/hooks/use-canvas-queries";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { formatDateTime } from "../../src/lib/format";
import { openAppHref } from "../../src/lib/navigation";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOBILE_WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

type CalendarEntry = {
  id: string;
  title: string;
  date: string;
  kind: "assignment" | "event";
  href?: string;
  contextName: string;
  courseId?: number;
  locationName?: string;
  completed?: boolean;
};

function getZonedDateParts(value: Date | string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(typeof value === "string" ? new Date(value) : value);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  const weekdayLabel = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayLabel);

  return { year, month, day, weekdayIndex: Math.max(weekdayIndex, 0) };
}

function buildCalendarCells(entries: CalendarEntry[], month: number, year: number) {
  const today = getZonedDateParts(new Date());
  const firstOfMonth = getZonedDateParts(new Date(Date.UTC(year, month - 1, 1)));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingEmptyDays = firstOfMonth.weekdayIndex;

  return Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;

    if (dayNumber < 1) {
      return null;
    }

    const dayEntries = entries.filter((entry) => {
      const parts = getZonedDateParts(entry.date);
      return parts.year === year && parts.month === month && parts.day === dayNumber;
    });

    return {
      dayNumber,
      isToday: year === today.year && month === today.month && dayNumber === today.day,
      entries: dayEntries,
    };
  });
}

function getDayKey(value: string) {
  const parts = getZonedDateParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function CalendarTab() {
  const router = useRouter();
  const { resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getUTCMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getUTCFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { month, year } = useMemo(
    () => normalizeMonth(currentYear, currentMonth),
    [currentMonth, currentYear],
  );

  const colors = useMemo(
    () => ({
      background: resolvedTheme === "dark" ? "#020617" : "#ffffff",
      card: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
      border: resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      foreground: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
      muted: resolvedTheme === "dark" ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      subtle: resolvedTheme === "dark" ? "rgba(241,245,249,0.72)" : "rgba(15,23,42,0.54)",
      mutedForeground: resolvedTheme === "dark" ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      todayBg: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      selectedBg: resolvedTheme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.10)",
      dayBorder: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.12)",
      buttonBg: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      buttonBorder: resolvedTheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.12)",
      primaryButton: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
      primaryButtonText: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
      entryCardBg: resolvedTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.02)",
      entryCardBorder: resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)",
      entryCardInnerBg: resolvedTheme === "dark" ? "rgba(255,255,255,0.03)" : "#ffffff",
    }),
    [resolvedTheme],
  );

  const { data, error, isLoading, isFetching, refetch } = useCalendar(year, month);

  const visibleEntries = useMemo(
    () =>
      data?.entries.filter(
        (entry) => !entry.courseId || !subjectPreferences.hiddenCourseIds.includes(entry.courseId),
      ) ?? [],
    [data?.entries, subjectPreferences.hiddenCourseIds],
  );

  const calendarCells = useMemo(
    () => buildCalendarCells(visibleEntries, month, year),
    [month, year, visibleEntries],
  );

  const todayParts = getZonedDateParts(new Date());
  const todayKey = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;

  const visibleUpcomingEntries = useMemo(
    () => visibleEntries.filter((entry) => getDayKey(entry.date) >= todayKey).slice(0, 8),
    [todayKey, visibleEntries],
  );

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, CalendarEntry[]>();

    for (const entry of visibleEntries) {
      const key = getDayKey(entry.date);
      const existing = groups.get(key) ?? [];
      existing.push(entry);
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .map(([key, dayEntries]) => ({
        key,
        label: getDayLabel(dayEntries[0]?.date ?? key),
        entries: dayEntries.sort((left, right) => left.date.localeCompare(right.date)),
      }))
      .sort((left, right) => left.key.localeCompare(right.key));
  }, [visibleEntries]);

  const selectedCell = calendarCells.find((cell) => cell?.dayNumber === selectedDay) ?? null;

  const navigateMonth = (delta: number) => {
    triggerSelectionHaptic();
    const next = normalizeMonth(year, month + delta);
    setCurrentMonth(next.month);
    setCurrentYear(next.year);
    setSelectedDay(null);
  };

  const handleDayPress = (dayNumber: number) => {
    triggerSelectionHaptic();
    setSelectedDay((currentDay) => (currentDay === dayNumber ? null : dayNumber));
  };

  const renderCalendarView = () => (
    <View style={styles.calendarWrapper}>
      <View style={styles.calendarGrid}>
        {WEEK_DAYS.map((weekDay, index) => (
          <Text key={weekDay} style={[styles.weekDayHeader, { color: colors.mutedForeground }]}>
            {MOBILE_WEEK_DAYS[index]}
          </Text>
        ))}

        {calendarCells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const isSelected = selectedDay === cell.dayNumber;
          const bgColor = isSelected ? colors.selectedBg : cell.isToday ? colors.todayBg : colors.entryCardInnerBg;
          const borderColor = isSelected ? colors.foreground : cell.isToday ? colors.border : colors.dayBorder;

          return (
            <Pressable
              key={cell.dayNumber}
              onPress={() => handleDayPress(cell.dayNumber)}
              style={[styles.dayCell, { backgroundColor: bgColor, borderColor }]}
            >
              <View style={styles.dayCellHeader}>
                <Text style={[styles.dayNumber, { color: colors.foreground }]}>{cell.dayNumber}</Text>
                {cell.entries.length > 0 && (
                  <Text style={[styles.dayEntryCount, { color: colors.muted }]}>{cell.entries.length}</Text>
                )}
              </View>
              <View style={styles.dotsContainer}>
                {cell.entries.slice(0, 8).map((entry) => {
                  const palette = getSubjectColorPalette(
                    entry.contextName,
                    entry.courseId ? subjectPreferences.colors[entry.courseId] : undefined,
                  );
                  return <View key={entry.id} style={[styles.entryDot, { backgroundColor: palette.borderColor }]} />;
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderListView = () => {
    if (groupedEntries.length === 0) {
      return (
        <View style={styles.emptyListContainer}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>No scheduled items found.</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {groupedEntries.map((group) => (
          <View key={group.key} style={styles.groupContainer}>
            <Text style={[styles.groupLabel, { color: colors.subtle }]}>{group.label}</Text>
            {group.entries.map((entry) => {
              const palette = getSubjectColorPalette(
                entry.contextName,
                entry.courseId ? subjectPreferences.colors[entry.courseId] : undefined,
              );

              return (
                <Pressable
                  key={entry.id}
                  onPress={() => {
                    if (entry.href) {
                      triggerSelectionHaptic();
                      void openAppHref(router, entry.href);
                    }
                  }}
                  style={[styles.listEntryCard, { borderColor: colors.entryCardBorder }]}
                >
                  <View style={[styles.entryLeftBorder, { backgroundColor: palette.borderColor }]} />
                  <View style={[styles.listEntryContent, { backgroundColor: colors.entryCardInnerBg }]}>
                    <View style={styles.entryHeader}>
                      <Text
                        style={[
                          styles.entryTitle,
                          { color: entry.completed ? colors.muted : colors.foreground },
                          entry.completed && styles.completedText,
                        ]}
                        numberOfLines={1}
                      >
                        {entry.title}
                      </Text>
                      {entry.completed && (
                        <View style={[styles.doneBadge, { borderColor: colors.border }]}>
                          <Text style={[styles.doneBadgeText, { color: colors.foreground }]}>Done</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.entryMeta}>
                      <View style={[styles.entryDotSmall, { backgroundColor: palette.borderColor }]} />
                      <Text style={[styles.entryMetaText, { color: colors.subtle }]} numberOfLines={1}>
                        {formatSubjectName(entry.contextName)}
                      </Text>
                    </View>
                    <Text style={[styles.entryDate, { color: colors.muted }]}>{formatDateTime(entry.date)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderSidePanel = () => {
    const entriesToShow = selectedCell ? selectedCell.entries : visibleUpcomingEntries;
    const title = selectedCell ? `Day ${selectedCell.dayNumber}` : "Upcoming";
    const subtitle = selectedCell ? "Activities due on the selected day" : "Next assignments and events";

    return (
      <SectionCard title={title}>
        <Text style={[styles.panelSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        {entriesToShow.length === 0 ? (
          <EmptyState label={selectedCell ? "No activities scheduled for this day." : "No upcoming items found."} />
        ) : (
          entriesToShow.map((entry) => {
            const palette = getSubjectColorPalette(
              entry.contextName,
              entry.courseId ? subjectPreferences.colors[entry.courseId] : undefined,
            );

            return (
              <Pressable
                key={entry.id}
                onPress={() => {
                  if (entry.href) {
                    triggerSelectionHaptic();
                    void openAppHref(router, entry.href);
                  }
                }}
                style={[styles.panelEntryCard, { borderColor: colors.entryCardBorder }]}
              >
                <View style={[styles.entryLeftBorder, { backgroundColor: palette.borderColor }]} />
                <View style={[styles.panelEntryContent, { backgroundColor: colors.entryCardInnerBg }]}>
                  <View style={styles.entryHeader}>
                    <Text
                      style={[
                        styles.entryTitle,
                        { color: entry.completed ? colors.muted : colors.foreground },
                        entry.completed && styles.completedText,
                      ]}
                      numberOfLines={1}
                    >
                      {entry.title}
                    </Text>
                    {entry.completed && (
                      <View style={[styles.doneBadge, { borderColor: colors.border }]}>
                        <Text style={[styles.doneBadgeText, { color: colors.foreground }]}>Done</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.entryMeta}>
                    <View style={[styles.entryDotSmall, { backgroundColor: palette.borderColor }]} />
                    <Text style={[styles.entryMetaText, { color: colors.subtle }]} numberOfLines={1}>
                      {formatSubjectName(entry.contextName)}
                    </Text>
                  </View>
                  <Text style={[styles.entryDate, { color: colors.muted }]}>{formatDateTime(entry.date)}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </SectionCard>
    );
  };

  return (
    <RequireCanvasConfig>
      <AppScreen title="Calendar" subtitle={getMonthLabel(year, month)} scroll={false}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.mutedForeground}
            />
          }
        >
          <View style={styles.container}>
            <SectionCard title="">
              <View style={styles.cardHeader}>
                <View style={styles.titleSection}>
                  <Text style={[styles.monthLabel, { color: colors.foreground }]}>
                    {getMonthLabel(year, month)}
                  </Text>
                  <Text style={[styles.scheduledItems, { color: colors.muted }]}>
                    {visibleEntries.length} scheduled items
                  </Text>
                </View>
                <View style={styles.controlsSection}>
                  <View style={[styles.viewToggle, { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder }]}>
                    <Pressable
                      onPress={() => {
                        triggerSelectionHaptic();
                        setViewMode("calendar");
                      }}
                      style={[
                        styles.toggleButton,
                        viewMode === "calendar" && { backgroundColor: colors.primaryButton },
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: viewMode === "calendar" ? colors.primaryButtonText : colors.muted },
                        ]}
                      >
                        Calendar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerSelectionHaptic();
                        setViewMode("list");
                      }}
                      style={[
                        styles.toggleButton,
                        viewMode === "list" && { backgroundColor: colors.primaryButton },
                      ]}
                    >
                      <Text
                        style={[styles.toggleText, { color: viewMode === "list" ? colors.primaryButtonText : colors.muted }]}
                      >
                        List
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.navButtons}>
                    <Pressable
                      onPress={() => navigateMonth(-1)}
                      style={[styles.navButton, { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder }]}
                    >
                      <ChevronLeft size={18} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => navigateMonth(1)}
                      style={[styles.navButton, { backgroundColor: colors.buttonBg, borderColor: colors.buttonBorder }]}
                    >
                      <ChevronRight size={18} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {isLoading && !data ? <LoadingState label="Loading calendar..." /> : null}
              {!isLoading && error ? <ErrorState error={error.message} onRetry={refetch} /> : null}

              {!isLoading && !error && data ? (
                <View style={styles.viewContainer}>
                  {viewMode === "calendar" ? renderCalendarView() : renderListView()}
                </View>
              ) : null}
            </SectionCard>

            {!isLoading && !error && data ? renderSidePanel() : null}
          </View>
        </ScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 0,
  },
  container: {
    gap: 16,
    paddingTop: 8,
  },
  cardHeader: {
    gap: 16,
  },
  titleSection: {
    gap: 4,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  scheduledItems: {
    fontSize: 14,
    fontWeight: "400",
  },
  controlsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "500",
  },
  navButtons: {
    flexDirection: "row",
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewContainer: {
    marginTop: 16,
  },
  calendarWrapper: {
    marginHorizontal: -12,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  weekDayHeader: {
    width: "14.285%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dayCell: {
    width: "14.285%",
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    padding: 3,
    justifyContent: "space-between",
  },
  emptyCell: {
    width: "14.285%",
    aspectRatio: 1,
  },
  dayCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: "600",
  },
  dayEntryCount: {
    fontSize: 9,
    fontWeight: "500",
  },
  dotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1.5,
  },
  entryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  emptyListContainer: {
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  listContainer: {
    gap: 20,
  },
  groupContainer: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  listEntryCard: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  panelEntryCard: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  entryLeftBorder: {
    width: 3,
  },
  listEntryContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  panelEntryContent: {
    flex: 1,
    padding: 10,
    gap: 3,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  completedText: {
    textDecorationLine: "line-through",
  },
  doneBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  doneBadgeText: {
    fontSize: 9,
    fontWeight: "500",
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  entryDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  entryMetaText: {
    fontSize: 12,
  },
  entryDate: {
    fontSize: 11,
  },
  panelSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
});
