import { buildCalendarEntries as buildSharedCalendarEntries, DISPLAY_TIME_ZONE, formatMonthLabel, type AppLocale } from "@canvas/shared";
import { CanvasCalendarData } from "@/lib/canvas";
import { formatSubjectName } from "@/lib/utils";

export type CalendarEntry = {
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

export function normalizeMonth(year: number, month: number) {
  const normalizedDate = new Date(Date.UTC(year, month - 1, 1));

  return {
    month: normalizedDate.getUTCMonth() + 1,
    year: normalizedDate.getUTCFullYear(),
  };
}

export function getMonthRange(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    endDate: endDate.toISOString().slice(0, 10),
    startDate: startDate.toISOString().slice(0, 10),
  };
}

export function getMonthLabel(year: number, month: number, locale: AppLocale = "en") {
  return formatMonthLabel(locale, year, month);
}

export function getZonedDateParts(value: Date | string) {
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

export function buildCalendarEntries(calendarData: CanvasCalendarData): CalendarEntry[] {
  return buildSharedCalendarEntries(calendarData).map((entry) => ({
    ...entry,
    contextName: formatSubjectName(entry.contextName),
  }));
}
