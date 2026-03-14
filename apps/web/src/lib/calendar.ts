import { CanvasCalendarData } from "@/lib/canvas";
import { formatSubjectName } from "@/lib/utils";

export const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

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

export function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
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
  return [
    ...calendarData.assignments
      .filter((assignment) => assignment.start_at)
      .map((assignment) => {
        const assignmentId =
          assignment.assignment_id ?? String(assignment.id ?? "").match(/(\d+)$/)?.[1] ?? assignment.id;

        return {
          id: `assignment-${assignmentId}`,
          title: assignment.title,
          date: assignment.start_at as string,
          kind: "assignment" as const,
          courseId: (() => {
            const courseId = Number(assignment.context_code?.replace("course_", ""));
            return Number.isFinite(courseId) ? courseId : undefined;
          })(),
          href: (() => {
            const courseId = Number(assignment.context_code?.replace("course_", ""));
            return Number.isFinite(courseId)
              ? `/subjects/${courseId}/assignments/${assignmentId}`
              : assignment.html_url;
          })(),
          contextName: formatSubjectName(assignment.context_name ?? "Unknown course"),
          completed: assignment.workflow_state === "completed",
        };
      }),
    ...calendarData.events
      .filter((event) => event.start_at)
      .map((event) => ({
        id: `event-${event.id}`,
        title: event.title,
        date: event.start_at as string,
        kind: "event" as const,
        href: event.html_url,
        contextName: formatSubjectName(event.context_name ?? "General"),
        courseId: (() => {
          const courseId = Number(event.context_code?.replace("course_", ""));
          return Number.isFinite(courseId) ? courseId : undefined;
        })(),
        locationName: event.location_name,
      })),
  ].sort((left, right) => left.date.localeCompare(right.date));
}
