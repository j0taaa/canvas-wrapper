import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import CalendarClient from "./calendar-client";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { getAppShellData, getCalendarData } from "@/lib/canvas";
import {
  buildCalendarEntries,
  getMonthLabel,
  getMonthRange,
  getZonedDateParts,
} from "@/lib/calendar";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }
  const today = getZonedDateParts(new Date());
  const displayedMonth = { month: today.month, year: today.year };
  const monthRange = getMonthRange(displayedMonth.year, displayedMonth.month);

  const shellData = await getAppShellData(apiKey);
  const calendarData = await getCalendarData(
    shellData.courses.map((course) => course.id),
    monthRange,
    apiKey,
  );
  const entries = buildCalendarEntries(calendarData);

  const monthLabel = getMonthLabel(displayedMonth.year, displayedMonth.month);

  return (
    <DesktopAppShell active="calendar" profile={shellData.profile} courses={shellData.courses}>
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
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
