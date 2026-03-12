import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import CalendarClient from "./calendar-client";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { getCalendarData, getDashboardData } from "@/lib/canvas";
import { formatSubjectName } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";
const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

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

function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function getMonthRange(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    endDate: endDate.toISOString().slice(0, 10),
    startDate: startDate.toISOString().slice(0, 10),
  };
}

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }
  const today = getZonedDateParts(new Date());
  const displayedMonth = { month: today.month, year: today.year };
  const monthRange = getMonthRange(displayedMonth.year, displayedMonth.month);

  const dashboardData = await getDashboardData(apiKey);
  const calendarData = await getCalendarData(
    dashboardData.courses.map((course) => course.id),
    monthRange,
    apiKey,
  );

  const entries: CalendarEntry[] = [
    ...calendarData.assignments
      .filter((assignment) => assignment.start_at)
      .map((assignment) => {
        const assignmentId = assignment.assignment_id ?? String(assignment.id ?? "").match(/(\d+)$/)?.[1] ?? assignment.id;
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
          return Number.isFinite(courseId) ? `/subjects/${courseId}/assignments/${assignmentId}` : assignment.html_url;
        })(),
        contextName: formatSubjectName(assignment.context_name ?? "Unknown course"),
        completed: assignment.workflow_state === "completed",
      }}),
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

  const monthLabel = getMonthLabel(displayedMonth.year, displayedMonth.month);

  return (
    <DesktopAppShell active="calendar" profile={dashboardData.profile} courses={dashboardData.courses}>
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-3 border-b border-black/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
          </div>
        </div>

        <CalendarClient
          initialEntries={entries}
          initialMonth={displayedMonth.month}
          monthLabel={monthLabel}
          initialYear={displayedMonth.year}
        />
      </div>
    </DesktopAppShell>
  );
}
