import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CanvasBootstrapData, getAssignmentCacheKey } from "@/lib/app-bootstrap";
import {
  getAssignmentDetails,
  getCalendarData,
  getCourseContent,
  getCourseGradeData,
  getDashboardData,
  getInboxData,
} from "@/lib/canvas";
import { buildCalendarEntries, getMonthLabel, getMonthRange, getZonedDateParts } from "@/lib/calendar";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Canvas API key" }, { status: 401 });
    }

    const dashboardData = await getDashboardData(apiKey);
    const today = getZonedDateParts(new Date());
    const calendarRange = getMonthRange(today.year, today.month);

    const [calendarResult, inboxResult, courseResults, assignmentResults] = await Promise.all([
      Promise.allSettled([
        getCalendarData(
          dashboardData.courses.map((course) => course.id),
          calendarRange,
          apiKey,
        ),
      ]),
      Promise.allSettled([getInboxData(apiKey)]),
      Promise.allSettled(
        dashboardData.courses.map(async (course) => [
          String(course.id),
          {
            content: await getCourseContent(course.id, apiKey),
            grades: await getCourseGradeData(course.id, apiKey),
          },
        ] as const),
      ),
      Promise.allSettled(
        dashboardData.todo.flatMap((item) => {
          if (!item.assignment?.id || !item.assignment.course_id) {
            return [];
          }

          return [
            getAssignmentDetails(
              item.assignment.course_id,
              item.assignment.id,
              apiKey,
            ).then((assignment) => [
              getAssignmentCacheKey(item.assignment?.course_id as number, item.assignment?.id as number),
              assignment,
            ] as const),
          ];
        }),
      ),
    ]);

    const payload: CanvasBootstrapData = {
      assignments: Object.fromEntries(
        assignmentResults
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value),
      ),
      calendar: {
        entries:
          calendarResult[0]?.status === "fulfilled"
            ? buildCalendarEntries(calendarResult[0].value)
            : [],
        month: today.month,
        monthLabel: getMonthLabel(today.year, today.month),
        year: today.year,
      },
      courses: Object.fromEntries(
        courseResults
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value),
      ),
      generatedAt: new Date().toISOString(),
      inbox:
        inboxResult[0]?.status === "fulfilled"
          ? inboxResult[0].value
          : { conversations: [] },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
