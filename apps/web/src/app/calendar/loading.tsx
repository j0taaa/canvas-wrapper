"use client";

import CalendarClient from "./calendar-client";
import { CachedAppShell, useCachedAppLoadingData } from "@/app/cached-app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export default function CalendarLoading() {
  const { bootstrapData } = useCachedAppLoadingData();

  return (
    <CachedAppShell active="calendar">
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
          </div>
        </div>

        {bootstrapData?.calendar ? (
          <CalendarClient
            initialEntries={bootstrapData.calendar.entries}
            initialMonth={bootstrapData.calendar.month}
            initialYear={bootstrapData.calendar.year}
            monthLabel={bootstrapData.calendar.monthLabel}
            todayKey={getTodayKey()}
          />
        ) : (
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Loading calendar...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-24 rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
              <div className="h-[45vh] rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]" />
            </CardContent>
          </Card>
        )}
      </div>
    </CachedAppShell>
  );
}
