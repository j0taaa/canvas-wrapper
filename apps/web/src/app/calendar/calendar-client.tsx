"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWeekdayLabels, t } from "@canvas/shared";
import { useLocale } from "@/components/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { formatDueDate, getSubjectColorStyle } from "@/lib/utils";

const CALENDAR_VIEW_STORAGE_KEY = "canvasCalendarViewMode";
const CALENDAR_MONTH_CACHE_KEY = "canvasCalendarMonthCache";

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

type CalendarClientProps = {
  initialEntries: CalendarEntry[];
  initialMonth: number;
  initialYear: number;
  monthLabel: string;
  todayKey: string;
};

type CalendarMonthPayload = {
  entries: CalendarEntry[];
  month: number;
  monthLabel: string;
  year: number;
};

const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

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

function getMonthStartWeekdayIndex(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
}

function buildCalendarCells(entries: CalendarEntry[], month: number, year: number) {
  const today = getZonedDateParts(new Date());
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingEmptyDays = getMonthStartWeekdayIndex(year, month);
  const totalVisibleDays = leadingEmptyDays + daysInMonth;
  const trailingEmptyDays = (7 - (totalVisibleDays % 7)) % 7;
  const totalCells = totalVisibleDays + trailingEmptyDays;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
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

function normalizeMonth(year: number, month: number) {
  const normalizedDate = new Date(Date.UTC(year, month - 1, 1));

  return {
    month: normalizedDate.getUTCMonth() + 1,
    year: normalizedDate.getUTCFullYear(),
  };
}

function getDayKey(value: string) {
  const parts = getZonedDateParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getDayLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function getMonthCacheEntryKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function readCalendarMonthCache() {
  if (typeof window === "undefined") {
    return {} as Record<string, CalendarMonthPayload>;
  }

  const storedValue = window.localStorage.getItem(CALENDAR_MONTH_CACHE_KEY);

  if (!storedValue) {
    return {} as Record<string, CalendarMonthPayload>;
  }

  try {
    return JSON.parse(storedValue) as Record<string, CalendarMonthPayload>;
  } catch {
    window.localStorage.removeItem(CALENDAR_MONTH_CACHE_KEY);
    return {} as Record<string, CalendarMonthPayload>;
  }
}

function readCalendarMonthFromCache(year: number, month: number) {
  const cache = readCalendarMonthCache();
  return cache[getMonthCacheEntryKey(year, month)] ?? null;
}

function writeCalendarMonthToCache(payload: CalendarMonthPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const cache = readCalendarMonthCache();
  cache[getMonthCacheEntryKey(payload.year, payload.month)] = payload;
  window.localStorage.setItem(CALENDAR_MONTH_CACHE_KEY, JSON.stringify(cache));
}

function isSameMonthPayload(left: CalendarMonthPayload, right: CalendarMonthPayload) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function CalendarClient({
  initialEntries,
  initialMonth,
  initialYear,
  monthLabel,
  todayKey,
}: CalendarClientProps) {
  const { resolvedLocale } = useLocale();
  const latestRequestKey = useRef<string | null>(null);
  const [displayedMonth, setDisplayedMonth] = useState({ month: initialMonth, year: initialYear });
  const [currentMonthLabel, setCurrentMonthLabel] = useState(monthLabel);
  const [entries, setEntries] = useState(initialEntries);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !entry.courseId || !preferences.hiddenCourseIds.includes(entry.courseId)),
    [entries, preferences.hiddenCourseIds],
  );
  const calendarCells = useMemo(
    () => buildCalendarCells(visibleEntries, displayedMonth.month, displayedMonth.year),
    [displayedMonth.month, displayedMonth.year, visibleEntries],
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const weekdayLabels = useMemo(() => getWeekdayLabels(resolvedLocale, "short"), [resolvedLocale]);
  const mobileWeekdayLabels = useMemo(() => getWeekdayLabels(resolvedLocale, "narrow"), [resolvedLocale]);
  useEffect(() => {
    writeCalendarMonthToCache({
      entries: initialEntries,
      month: initialMonth,
      monthLabel,
      year: initialYear,
    });
    setDisplayedMonth({ month: initialMonth, year: initialYear });
    setEntries(initialEntries);
    setCurrentMonthLabel(monthLabel);
  }, [initialEntries, initialMonth, initialYear, monthLabel]);

  useEffect(() => {
    const savedView = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    setViewMode(savedView === "list" ? "list" : "calendar");
  }, []);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readSubjectPreferences());

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const selectedCell = calendarCells.find((cell) => cell?.dayNumber === selectedDay) ?? null;
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
        label: getDayLabel(dayEntries[0]?.date ?? key, resolvedLocale),
        entries: dayEntries.sort((left, right) => left.date.localeCompare(right.date)),
      }))
      .sort((left, right) => left.key.localeCompare(right.key));
  }, [resolvedLocale, visibleEntries]);

  const applyMonthPayload = useCallback((payload: CalendarMonthPayload) => {
    setDisplayedMonth({ month: payload.month, year: payload.year });
    setEntries(payload.entries);
    setCurrentMonthLabel(payload.monthLabel);
  }, []);

  const fetchMonth = useCallback(async (
    year: number,
    month: number,
    options?: { applyIfLatest?: boolean; applyPayload?: boolean },
  ) => {
    const nextMonth = normalizeMonth(year, month);
    const requestKey = getMonthCacheEntryKey(nextMonth.year, nextMonth.month);

    if (options?.applyIfLatest) {
      latestRequestKey.current = requestKey;
      setLoadingMonth(true);
    }

    try {
      const response = await fetch(`/api/calendar?month=${nextMonth.month}&year=${nextMonth.year}`);
      const payload = (await response.json()) as Partial<CalendarMonthPayload> & { error?: string };

      if (!response.ok || !payload.entries || !payload.month || !payload.year || !payload.monthLabel) {
        throw new Error(payload.error ?? t(resolvedLocale, "calendar.noScheduledItemsFound"));
      }

      const normalizedPayload: CalendarMonthPayload = {
        entries: payload.entries,
        month: payload.month,
        monthLabel: payload.monthLabel,
        year: payload.year,
      };
      const cachedPayload = readCalendarMonthFromCache(normalizedPayload.year, normalizedPayload.month);

      if (!cachedPayload || !isSameMonthPayload(cachedPayload, normalizedPayload)) {
        writeCalendarMonthToCache(normalizedPayload);
      }

      const shouldApplyPayload = options?.applyPayload ?? Boolean(options?.applyIfLatest);

      if (shouldApplyPayload && (!options?.applyIfLatest || latestRequestKey.current === requestKey)) {
        applyMonthPayload(normalizedPayload);
      }

      return normalizedPayload;
    } finally {
      if (!options?.applyIfLatest || latestRequestKey.current === requestKey) {
        setLoadingMonth(false);
      }
    }
  }, [applyMonthPayload, resolvedLocale]);

  const prefetchMonth = useCallback((year: number, month: number) => {
    const normalized = normalizeMonth(year, month);

    if (readCalendarMonthFromCache(normalized.year, normalized.month)) {
      return;
    }

    void fetchMonth(normalized.year, normalized.month, { applyPayload: false }).catch(() => {
      // Background month warmup is best-effort only.
    });
  }, [fetchMonth]);

  const loadMonth = useCallback(async (year: number, month: number) => {
    const nextMonth = normalizeMonth(year, month);
    const cachedPayload = readCalendarMonthFromCache(nextMonth.year, nextMonth.month);

    setSelectedDay(null);
    setDisplayedMonth({ month: nextMonth.month, year: nextMonth.year });
    setCurrentMonthLabel(cachedPayload?.monthLabel ?? new Intl.DateTimeFormat(resolvedLocale, {
      timeZone: DISPLAY_TIME_ZONE,
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(nextMonth.year, nextMonth.month - 1, 1, 12))));

    if (cachedPayload) {
      applyMonthPayload(cachedPayload);
    } else {
      setEntries([]);
    }

    void fetchMonth(nextMonth.year, nextMonth.month, { applyIfLatest: true })
      .then((payload) => {
        if (!payload) {
          return;
        }

        prefetchMonth(payload.year, payload.month - 1);
        prefetchMonth(payload.year, payload.month + 1);
      })
      .catch(() => {
        // Keep showing cached or previous optimistic state if refresh fails.
      });
  }, [applyMonthPayload, fetchMonth, prefetchMonth, resolvedLocale]);

  useEffect(() => {
    prefetchMonth(displayedMonth.year, displayedMonth.month - 1);
    prefetchMonth(displayedMonth.year, displayedMonth.month + 1);
  }, [displayedMonth.month, displayedMonth.year, prefetchMonth, resolvedLocale]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
      <div className="space-y-4">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <div className="flex items-end justify-between gap-3">
              <div>
                <CardTitle>{currentMonthLabel}</CardTitle>
                <CardDescription>{t(resolvedLocale, "calendar.scheduledItems", { count: visibleEntries.length })}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-full border border-border/70 bg-muted/35 p-0.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => setViewMode("calendar")}
                    className={
                      viewMode === "calendar"
                        ? "rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
                        : "rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    }
                  >
                    {t(resolvedLocale, "calendar.viewCalendar")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={
                      viewMode === "list"
                        ? "rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
                        : "rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    }
                  >
                    {t(resolvedLocale, "calendar.viewList")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => loadMonth(displayedMonth.year, displayedMonth.month - 1)}
                  className="rounded-full border border-border/70 bg-card p-2 transition hover:border-foreground/15 hover:bg-muted/75"
                  aria-label={t(resolvedLocale, "calendar.previousMonth")}
                  disabled={loadingMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => loadMonth(displayedMonth.year, displayedMonth.month + 1)}
                  className="rounded-full border border-border/70 bg-card p-2 transition hover:border-foreground/15 hover:bg-muted/75"
                  aria-label={t(resolvedLocale, "calendar.nextMonth")}
                  disabled={loadingMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="flex rounded-full border border-border/70 bg-muted/35 p-0.5 sm:hidden">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={
                  viewMode === "calendar"
                    ? "flex-1 rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground"
                    : "flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground"
                }
              >
                {t(resolvedLocale, "calendar.viewCalendar")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "flex-1 rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground"
                    : "flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground"
                }
              >
                {t(resolvedLocale, "calendar.viewList")}
              </button>
            </div>

            {viewMode === "calendar" ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekdayLabels.map((weekDay, index) => (
                <div key={weekDay} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:pb-2 sm:text-xs">
                  <span className="sm:hidden">{mobileWeekdayLabels[index]}</span>
                  <span className="hidden sm:inline">{weekDay}</span>
                </div>
              ))}

              {calendarCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="aspect-square rounded-lg border border-transparent sm:aspect-auto sm:min-h-28 sm:rounded-xl lg:min-h-32" />;
                }

                const isSelected = selectedDay === cell.dayNumber;

                return (
                  <button
                    key={cell.dayNumber}
                    type="button"
                    onClick={() => setSelectedDay((currentDay) => (currentDay === cell.dayNumber ? null : cell.dayNumber))}
                    className={`aspect-square overflow-hidden rounded-lg border p-1 text-left sm:flex sm:flex-col sm:justify-start sm:aspect-auto sm:min-h-28 sm:rounded-xl sm:p-2 lg:min-h-32 ${
                      cell.isToday
                        ? "border-border bg-muted/80 text-foreground"
                        : isSelected
                          ? "border-black/50 bg-black/[0.05]"
                          : "border-black/15 bg-black/[0.02]"
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between sm:mb-2 sm:items-center">
                      <span className={`text-[11px] font-semibold sm:text-sm ${cell.isToday ? "text-foreground" : "text-foreground"}`}>
                        {cell.dayNumber}
                      </span>
                      <span className={`text-[9px] sm:text-[10px] ${cell.isToday ? "text-muted-foreground" : "text-black/35"}`}>
                        {cell.entries.length > 0 ? `${cell.entries.length}` : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {cell.entries.slice(0, 8).map((entry) => (
                        <span
                          key={entry.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getSubjectColorStyle(entry.contextName, entry.courseId ? preferences.colors[entry.courseId] : undefined).borderColor }}
                        />
                      ))}
                    </div>

                    <div className="hidden space-y-1.5 sm:block">
                      {cell.entries.slice(0, 3).map((entry) => {
                        const subjectColor = getSubjectColorStyle(entry.contextName, entry.courseId ? preferences.colors[entry.courseId] : undefined);
                        const content = (
                          <div
                            className="rounded-md border border-black/10 bg-white/90 px-2 py-1 text-[11px] leading-tight"
                            style={{ boxShadow: `inset 3px 0 0 ${subjectColor.borderColor}` }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`line-clamp-1 font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                              {entry.completed && (
                                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                                  {t(resolvedLocale, "calendar.done")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1.5 line-clamp-1 opacity-75">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: subjectColor.borderColor }} />
                              <span>{entry.contextName}</span>
                            </p>
                          </div>
                        );

                        if (!entry.href) {
                          return <div key={entry.id}>{content}</div>;
                        }

                        return (
                          <Link key={entry.id} href={entry.href} className="block">
                            {content}
                          </Link>
                        );
                      })}
                      {cell.entries.length > 3 && (
                        <p className={`px-1 text-[11px] ${cell.isToday ? "text-muted-foreground" : "text-black/55"}`}>
                          {t(resolvedLocale, "calendar.more", { count: cell.entries.length - 3 })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
            ) : groupedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(resolvedLocale, "calendar.noScheduledItemsFound")}</p>
            ) : (
              <div className="space-y-4">
                {groupedEntries.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{group.label}</p>
                    <div className="space-y-2">
                      {group.entries.map((entry) => {
                        const subjectColor = getSubjectColorStyle(entry.contextName, entry.courseId ? preferences.colors[entry.courseId] : undefined);
                        const content = (
                          <div
                            className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/15 hover:bg-black/[0.01]"
                            style={{ boxShadow: `inset 3px 0 0 ${subjectColor.borderColor}` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                                <p className="mt-1 flex items-center gap-2 text-xs text-black/60">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor.borderColor }} />
                                  <span>{entry.contextName}</span>
                                </p>
                                <p className="mt-1 text-xs text-black/55">{formatDueDate(resolvedLocale, entry.date)}</p>
                                {entry.locationName && <p className="mt-1 text-xs text-black/50">{entry.locationName}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {entry.completed && (
                                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                    {t(resolvedLocale, "calendar.done")}
                                  </span>
                                )}
                                <span className="text-[11px] font-medium text-black/45">
                                  {entry.kind === "assignment" ? t(resolvedLocale, "calendar.assignmentKind") : t(resolvedLocale, "calendar.eventKind")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );

                        if (!entry.href) {
                          return <div key={entry.id}>{content}</div>;
                        }

                        return (
                          <Link key={entry.id} href={entry.href} className="block">
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95 sm:hidden">
          <CardHeader>
            <CardTitle>{selectedCell ? t(resolvedLocale, "calendar.dayTitle", { day: selectedCell.dayNumber }) : t(resolvedLocale, "calendar.upcoming")}</CardTitle>
            <CardDescription>
              {selectedCell ? t(resolvedLocale, "calendar.selectedDayDescription") : t(resolvedLocale, "calendar.upcomingDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedCell ? (
              visibleUpcomingEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(resolvedLocale, "calendar.noUpcomingItemsFound")}</p>
              ) : (
                visibleUpcomingEntries.map((entry) => {
                  const content = (
                    <div className="rounded-md border border-black/20 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                        <div className="flex items-center gap-2">
                          {entry.completed && (
                            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              {t(resolvedLocale, "calendar.done")}
                            </span>
                          )}
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${entry.kind === "assignment" ? "border-red-300 bg-red-100 text-red-700" : "border-border/70 bg-muted/70 text-muted-foreground"}`}>
                            {entry.kind === "assignment" ? t(resolvedLocale, "calendar.assignmentKind") : t(resolvedLocale, "calendar.eventKind")}
                          </span>
                        </div>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-black/70">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: getSubjectColorStyle(entry.contextName, entry.courseId ? preferences.colors[entry.courseId] : undefined).borderColor }}
                        />
                        <span>{entry.contextName}</span>
                      </p>
                      <p className="mt-1 text-xs">{formatDueDate(resolvedLocale, entry.date)}</p>
                      {entry.locationName && <p className="mt-1 text-xs text-black/60">{entry.locationName}</p>}
                    </div>
                  );

                  if (!entry.href) {
                    return <div key={entry.id}>{content}</div>;
                  }

                  return (
                    <Link key={entry.id} href={entry.href} className="block">
                      {content}
                    </Link>
                  );
                })
              )
            ) : selectedCell.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(resolvedLocale, "calendar.noActivitiesForDay")}</p>
            ) : (
              selectedCell.entries.map((entry) => {
                const content = (
                  <div className="rounded-md border border-black/20 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                      <div className="flex items-center gap-2">
                        {entry.completed && (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            {t(resolvedLocale, "calendar.done")}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${entry.kind === "assignment" ? "border-red-300 bg-red-100 text-red-700" : "border-border/70 bg-muted/70 text-muted-foreground"}`}>
                          {entry.kind === "assignment" ? t(resolvedLocale, "calendar.assignmentKind") : t(resolvedLocale, "calendar.eventKind")}
                        </span>
                      </div>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-black/70">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getSubjectColorStyle(entry.contextName).borderColor }}
                      />
                      <span>{entry.contextName}</span>
                    </p>
                    <p className="mt-1 text-xs">{formatDueDate(resolvedLocale, entry.date)}</p>
                    {entry.locationName && <p className="mt-1 text-xs text-black/60">{entry.locationName}</p>}
                  </div>
                );

                if (!entry.href) {
                  return <div key={entry.id}>{content}</div>;
                }

                return (
                  <Link key={entry.id} href={entry.href} className="block">
                    {content}
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="hidden border-border/80 bg-card/95 lg:block">
        <CardHeader>
          <CardTitle className="mb-1">{selectedCell ? t(resolvedLocale, "calendar.dayTitle", { day: selectedCell.dayNumber }) : t(resolvedLocale, "calendar.upcoming")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedCell ? (
              visibleUpcomingEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(resolvedLocale, "calendar.noUpcomingItemsFound")}</p>
              ) : (
                visibleUpcomingEntries.map((entry) => {
                  const subjectColor = getSubjectColorStyle(entry.contextName, entry.courseId ? preferences.colors[entry.courseId] : undefined);
                const content = (
                  <div
                    className="rounded-md border border-black/20 bg-white p-3 transition hover:border-black/45 hover:bg-black/[0.02]"
                    style={{ boxShadow: `inset 3px 0 0 ${subjectColor.borderColor}` }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                      <div className="flex items-center gap-2">
                        {entry.completed && (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            {t(resolvedLocale, "calendar.done")}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-black/45">
                          {entry.kind === "assignment" ? t(resolvedLocale, "calendar.assignmentKind") : t(resolvedLocale, "calendar.eventKind")}
                        </span>
                      </div>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-black/70">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor.borderColor }} />
                      <span>{entry.contextName}</span>
                    </p>
                    <p className="mt-1 text-xs">{formatDueDate(resolvedLocale, entry.date)}</p>
                    {entry.locationName && <p className="mt-1 text-xs text-black/60">{entry.locationName}</p>}
                  </div>
                );

                if (!entry.href) {
                  return <div key={entry.id}>{content}</div>;
                }

                return (
                  <Link key={entry.id} href={entry.href} className="block">
                    {content}
                  </Link>
                );
              })
            )
          ) : selectedCell.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(resolvedLocale, "calendar.noActivitiesForDay")}</p>
          ) : (
            selectedCell.entries.map((entry) => {
              const subjectColor = getSubjectColorStyle(entry.contextName);
              const content = (
                <div
                  className="rounded-md border border-black/20 bg-white p-3 transition hover:border-black/45 hover:bg-black/[0.02]"
                  style={{ boxShadow: `inset 3px 0 0 ${subjectColor.borderColor}` }}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                    <div className="flex items-center gap-2">
                      {entry.completed && (
                        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {t(resolvedLocale, "calendar.done")}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-black/45">
                        {entry.kind === "assignment" ? t(resolvedLocale, "calendar.assignmentKind") : t(resolvedLocale, "calendar.eventKind")}
                      </span>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-black/70">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor.borderColor }} />
                    <span>{entry.contextName}</span>
                  </p>
                  <p className="mt-1 text-xs">{formatDueDate(resolvedLocale, entry.date)}</p>
                  {entry.locationName && <p className="mt-1 text-xs text-black/60">{entry.locationName}</p>}
                </div>
              );

              if (!entry.href) {
                return <div key={entry.id}>{content}</div>;
              }

              return (
                <Link key={entry.id} href={entry.href} className="block">
                  {content}
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
