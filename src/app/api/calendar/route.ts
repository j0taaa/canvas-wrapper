import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCalendarData, getDashboardData } from "@/lib/canvas";
import { formatSubjectName } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function normalizeMonth(year: number, month: number) {
  const normalizedDate = new Date(Date.UTC(year, month - 1, 1));

  return {
    month: normalizedDate.getUTCMonth() + 1,
    year: normalizedDate.getUTCFullYear(),
  };
}

function getMonthRange(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    endDate: endDate.toISOString().slice(0, 10),
    startDate: startDate.toISOString().slice(0, 10),
  };
}

function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Canvas API key" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedMonth = Number(searchParams.get("month"));
    const requestedYear = Number(searchParams.get("year"));
    const today = new Date();
    const fallbackMonth = today.getUTCMonth() + 1;
    const fallbackYear = today.getUTCFullYear();
    const displayedMonth = normalizeMonth(
      Number.isFinite(requestedYear) ? requestedYear : fallbackYear,
      Number.isFinite(requestedMonth) ? requestedMonth : fallbackMonth,
    );
    const dashboardData = await getDashboardData(apiKey);
    const calendarData = await getCalendarData(
      dashboardData.courses.map((course) => course.id),
      getMonthRange(displayedMonth.year, displayedMonth.month),
      apiKey,
    );

    const entries = [
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

    return NextResponse.json({
      entries,
      month: displayedMonth.month,
      monthLabel: getMonthLabel(displayedMonth.year, displayedMonth.month),
      year: displayedMonth.year,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
