"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOBILE_WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CALENDAR_VIEW_STORAGE_KEY = "canvasCalendarViewMode";

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

function getDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function CalendarClient({
  initialEntries,
  initialMonth,
  initialYear,
  monthLabel,
}: CalendarClientProps) {
  const [displayedMonth, setDisplayedMonth] = useState({ month: initialMonth, year: initialYear });
  const [currentMonthLabel, setCurrentMonthLabel] = useState(monthLabel);
  const [entries, setEntries] = useState(initialEntries);
  const [currentUpcomingEntries, setCurrentUpcomingEntries] = useState(initialEntries.slice(0, 8));
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);
  const [viewMode, setViewMode] = useState<"calendar" | "list">(() => {
    if (typeof window === "undefined") {
      return "calendar";
    }

    const savedView = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    return savedView === "list" ? "list" : "calendar";
  });
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !entry.courseId || !preferences.hiddenCourseIds.includes(entry.courseId)),
    [entries, preferences.hiddenCourseIds],
  );
  const calendarCells = useMemo(
    () => buildCalendarCells(visibleEntries, displayedMonth.month, displayedMonth.year),
    [displayedMonth.month, displayedMonth.year, visibleEntries],
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  useEffect(() => {
    setDisplayedMonth({ month: initialMonth, year: initialYear });
    setEntries(initialEntries);
    setCurrentMonthLabel(monthLabel);
    setCurrentUpcomingEntries(initialEntries.slice(0, 8));
  }, [initialEntries, initialMonth, initialYear, monthLabel]);

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
  const visibleUpcomingEntries = visibleEntries.slice(0, 8);
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

  const loadMonth = async (year: number, month: number) => {
    const nextMonth = normalizeMonth(year, month);
    setLoadingMonth(true);

    try {
      const response = await fetch(`/api/calendar?month=${nextMonth.month}&year=${nextMonth.year}`);
      const payload = (await response.json()) as {
        entries?: CalendarEntry[];
        error?: string;
        month?: number;
        monthLabel?: string;
        year?: number;
      };

      if (!response.ok || !payload.entries || !payload.month || !payload.year || !payload.monthLabel) {
        throw new Error(payload.error ?? "Could not load calendar month");
      }

      setDisplayedMonth({ month: payload.month, year: payload.year });
      setEntries(payload.entries);
      setCurrentMonthLabel(payload.monthLabel);
      setCurrentUpcomingEntries(payload.entries.slice(0, 8));
    } finally {
      setLoadingMonth(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
      <div className="space-y-4">
        <Card className="border-black/20">
          <CardHeader>
            <div className="flex items-end justify-between gap-3">
              <div>
                <CardTitle>{currentMonthLabel}</CardTitle>
                <CardDescription>{visibleEntries.length} scheduled items</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-full border border-black/15 p-0.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => setViewMode("calendar")}
                    className={
                      viewMode === "calendar"
                        ? "rounded-full bg-black px-2.5 py-1 text-[11px] font-medium text-white"
                        : "rounded-full px-2.5 py-1 text-[11px] font-medium text-black/55"
                    }
                  >
                    Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={
                      viewMode === "list"
                        ? "rounded-full bg-black px-2.5 py-1 text-[11px] font-medium text-white"
                        : "rounded-full px-2.5 py-1 text-[11px] font-medium text-black/55"
                    }
                  >
                    List
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => loadMonth(displayedMonth.year, displayedMonth.month - 1)}
                  className="rounded-full border border-black/20 p-2 transition hover:border-black/40 hover:bg-black/[0.03]"
                  aria-label="Previous month"
                  disabled={loadingMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => loadMonth(displayedMonth.year, displayedMonth.month + 1)}
                  className="rounded-full border border-black/20 p-2 transition hover:border-black/40 hover:bg-black/[0.03]"
                  aria-label="Next month"
                  disabled={loadingMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="flex rounded-full border border-black/15 p-0.5 sm:hidden">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={
                  viewMode === "calendar"
                    ? "flex-1 rounded-full bg-black px-2.5 py-1.5 text-[11px] font-medium text-white"
                    : "flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-black/55"
                }
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "flex-1 rounded-full bg-black px-2.5 py-1.5 text-[11px] font-medium text-white"
                    : "flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-black/55"
                }
              >
                List
              </button>
            </div>

            {viewMode === "calendar" ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {WEEK_DAYS.map((weekDay, index) => (
                <div key={weekDay} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-black/45 sm:pb-2 sm:text-xs">
                  <span className="sm:hidden">{MOBILE_WEEK_DAYS[index]}</span>
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
                        ? "border-sky-300 bg-sky-50/80 text-black"
                        : isSelected
                          ? "border-black/50 bg-black/[0.05]"
                          : "border-black/15 bg-black/[0.02]"
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between sm:mb-2 sm:items-center">
                      <span className={`text-[11px] font-semibold sm:text-sm ${cell.isToday ? "text-sky-800" : "text-black"}`}>
                        {cell.dayNumber}
                      </span>
                      <span className={`text-[9px] sm:text-[10px] ${cell.isToday ? "text-sky-700/80" : "text-black/35"}`}>
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
                                  Done
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
                        <p className={`px-1 text-[11px] ${cell.isToday ? "text-sky-700/80" : "text-black/55"}`}>
                          +{cell.entries.length - 3} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
            ) : groupedEntries.length === 0 ? (
              <p className="text-sm text-black/70">No scheduled items found.</p>
            ) : (
              <div className="space-y-4">
                {groupedEntries.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <p className="text-sm font-medium text-black/60">{group.label}</p>
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
                                <p className="mt-1 text-xs text-black/55">{formatDueDate(entry.date)}</p>
                                {entry.locationName && <p className="mt-1 text-xs text-black/50">{entry.locationName}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {entry.completed && (
                                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                    Done
                                  </span>
                                )}
                                <span className="text-[11px] font-medium text-black/45">
                                  {entry.kind === "assignment" ? "Assignment" : "Event"}
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

        <Card className="border-black/20 sm:hidden">
          <CardHeader>
            <CardTitle>{selectedCell ? `Day ${selectedCell.dayNumber}` : "Upcoming"}</CardTitle>
            <CardDescription>
              {selectedCell ? "Activities due on the selected day" : "Next assignments and events"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedCell ? (
              currentUpcomingEntries.length === 0 ? (
                <p className="text-sm text-black/70">No upcoming items found.</p>
              ) : (
                visibleUpcomingEntries.map((entry) => {
                  const content = (
                    <div className="rounded-md border border-black/20 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                        <div className="flex items-center gap-2">
                          {entry.completed && (
                            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Done
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${entry.kind === "assignment" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}>
                            {entry.kind === "assignment" ? "Assignment" : "Event"}
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
                      <p className="mt-1 text-xs">{formatDueDate(entry.date)}</p>
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
              <p className="text-sm text-black/70">No activities scheduled for this day.</p>
            ) : (
              selectedCell.entries.map((entry) => {
                const content = (
                  <div className="rounded-md border border-black/20 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className={`text-sm font-medium ${entry.completed ? "text-black/55 line-through" : ""}`}>{entry.title}</p>
                      <div className="flex items-center gap-2">
                        {entry.completed && (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Done
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${entry.kind === "assignment" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}>
                          {entry.kind === "assignment" ? "Assignment" : "Event"}
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
                    <p className="mt-1 text-xs">{formatDueDate(entry.date)}</p>
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

      <Card className="hidden border-black/20 lg:block">
        <CardHeader>
          <CardTitle className="mb-1">{selectedCell ? `Day ${selectedCell.dayNumber}` : "Upcoming"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedCell ? (
              visibleUpcomingEntries.length === 0 ? (
                <p className="text-sm text-black/70">No upcoming items found.</p>
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
                            Done
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-black/45">
                          {entry.kind === "assignment" ? "Assignment" : "Event"}
                        </span>
                      </div>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-black/70">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor.borderColor }} />
                      <span>{entry.contextName}</span>
                    </p>
                    <p className="mt-1 text-xs">{formatDueDate(entry.date)}</p>
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
            <p className="text-sm text-black/70">No activities scheduled for this day.</p>
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
                          Done
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-black/45">
                        {entry.kind === "assignment" ? "Assignment" : "Event"}
                      </span>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-black/70">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor.borderColor }} />
                    <span>{entry.contextName}</span>
                  </p>
                  <p className="mt-1 text-xs">{formatDueDate(entry.date)}</p>
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
