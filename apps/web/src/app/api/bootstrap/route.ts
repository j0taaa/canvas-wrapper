import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CanvasBootstrapData, getAssignmentCacheKey } from "@/lib/app-bootstrap";
import { getAssignmentDetails, getAppShellData, getCalendarData, getCourseContent, getCourseGradeData, getInboxData } from "@/lib/canvas";
import { buildCalendarEntries, getMonthLabel, getMonthRange, getZonedDateParts } from "@/lib/calendar";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

type BootstrapRequestBody = {
  courseIds?: number[];
  todoAssignments?: Array<{
    assignmentId?: number;
    courseId?: number;
  }>;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Canvas API key" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as BootstrapRequestBody;
    let courseIds = Array.from(
      new Set(
        (body.courseIds ?? [])
          .map((courseId) => Number(courseId))
          .filter((courseId) => Number.isFinite(courseId)),
      ),
    );

    if (courseIds.length === 0) {
      const fallbackShellData = await getAppShellData(apiKey);
      courseIds = fallbackShellData.courses.map((course) => course.id);
    }

    const todoAssignments = Array.from(
      new Map(
        (body.todoAssignments ?? [])
          .map((item) => ({
            assignmentId: Number(item.assignmentId),
            courseId: Number(item.courseId),
          }))
          .filter((item) => Number.isFinite(item.assignmentId) && Number.isFinite(item.courseId))
          .map((item) => [`${item.courseId}:${item.assignmentId}`, item]),
      ).values(),
    );
    const today = getZonedDateParts(new Date());
    const calendarRange = getMonthRange(today.year, today.month);

    const [calendarResult, inboxResult, courseResults, assignmentResults] = await Promise.all([
      Promise.allSettled([
        getCalendarData(
          courseIds,
          calendarRange,
          apiKey,
        ),
      ]),
      Promise.allSettled([getInboxData(apiKey)]),
      Promise.allSettled(
        courseIds.map(async (courseId) => [
          String(courseId),
          {
            content: await getCourseContent(courseId, apiKey),
            grades: await getCourseGradeData(courseId, apiKey),
          },
        ] as const),
      ),
      Promise.allSettled(
        todoAssignments.map((item) =>
          getAssignmentDetails(
            item.courseId as number,
            item.assignmentId as number,
            apiKey,
          ).then((assignment) => [
            getAssignmentCacheKey(item.courseId as number, item.assignmentId as number),
            assignment,
          ] as const),
        ),
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
