"use client";

import { BookOpen, CalendarDays, Inbox, Sparkles } from "lucide-react";
import { t } from "@canvas/shared";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function WelcomePanel({ onContinue }: { onContinue: () => void }) {
  const { resolvedLocale } = useLocale();
  const highlights = [
    {
      title: t(resolvedLocale, "welcome.highlightOneTitle"),
      description: t(resolvedLocale, "welcome.highlightOneBody"),
    },
    {
      title: t(resolvedLocale, "welcome.highlightTwoTitle"),
      description: t(resolvedLocale, "welcome.highlightTwoBody"),
    },
    {
      title: t(resolvedLocale, "welcome.highlightThreeTitle"),
      description: t(resolvedLocale, "welcome.highlightThreeBody"),
    },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_55%,#f7fbff_100%)] px-6 py-10 text-foreground dark:bg-[linear-gradient(180deg,#18120a_0%,#0f172a_55%,#07131f_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-52 w-52 rounded-full bg-amber-300/35 blur-3xl dark:bg-amber-300/20" />
        <div className="absolute bottom-[8%] right-[12%] h-60 w-60 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-300/18" />
      </div>

      <div className="relative grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[360px]">
          <div className="welcome-float absolute left-4 top-4 w-52 rounded-[1.6rem] border border-black/10 bg-white/88 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/12 dark:bg-slate-900/88">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-300/14 dark:text-amber-100">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold">{t(resolvedLocale, "welcome.deadlinesTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(resolvedLocale, "welcome.deadlinesBody")}</p>
          </div>

          <div className="welcome-drift absolute bottom-6 right-6 w-56 rounded-[1.6rem] border border-black/10 bg-white/88 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/12 dark:bg-slate-900/88">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-300/14 dark:text-cyan-100">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold">{t(resolvedLocale, "welcome.messagesTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(resolvedLocale, "welcome.messagesBody")}</p>
          </div>

          <div className="welcome-pulse absolute inset-x-12 top-16 rounded-[2rem] border border-black/10 bg-white/92 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur dark:border-white/12 dark:bg-slate-900/92">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="text-3xl font-semibold tracking-[-0.04em]">Janvas</p>
            <p className="mt-2 text-sm text-muted-foreground">{t(resolvedLocale, "welcome.appTagline")}</p>
            <div className="mt-5 flex justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:bg-white/8 dark:text-amber-100">
                <BookOpen className="h-3.5 w-3.5" />
                {t(resolvedLocale, "welcome.subjectsPill")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800 dark:bg-white/8 dark:text-cyan-100">
                <CalendarDays className="h-3.5 w-3.5" />
                {t(resolvedLocale, "welcome.calendarPill")}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/12 dark:bg-slate-950/78 sm:p-8">
          <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">{t(resolvedLocale, "welcome.title")}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{t(resolvedLocale, "welcome.subtitle")}</p>

          <div className="mt-8 space-y-3">
            {highlights.map((highlight) => (
              <div key={highlight.title} className="rounded-[1.25rem] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-sm font-semibold">{highlight.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{highlight.description}</p>
              </div>
            ))}
          </div>

          <Button className="mt-8 h-12 rounded-full px-6 text-sm font-semibold" onClick={onContinue}>
            {t(resolvedLocale, "welcome.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
