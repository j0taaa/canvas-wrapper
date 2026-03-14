import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppShellData, getCalendarData } from "@/lib/canvas";
import {
  buildCalendarEntries,
  getMonthLabel,
  getMonthRange,
  normalizeMonth,
} from "@/lib/calendar";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

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
    const shellData = await getAppShellData(apiKey);
    const calendarData = await getCalendarData(
      shellData.courses.map((course) => course.id),
      getMonthRange(displayedMonth.year, displayedMonth.month),
      apiKey,
    );
    const entries = buildCalendarEntries(calendarData);

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
