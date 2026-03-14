"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Globe,
  Landmark,
  PenSquare,
  Sigma,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DesktopSidebar, MobileBottomNav } from "@/components/desktop-sidebar";
import { CanvasDashboardData } from "@/lib/canvas";
import {
  readSubjectPreferences,
  type SubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { CANVAS_BOOTSTRAP_STORAGE } from "@/lib/app-bootstrap";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_STORAGE = "canvasApiKey";
const CANVAS_API_BASE_STORAGE = "canvasApiBase";
const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";
const DISPLAY_TIME_ZONE = "America/Sao_Paulo";
const DASHBOARD_REFRESH_MIN_AGE_MS = 45_000;
const BOOTSTRAP_CACHE_MAX_AGE_MS = 5 * 60_000;
const PREFETCH_SUBJECT_LIMIT = 8;
const PREFETCH_ASSIGNMENT_LIMIT = 6;

type HomeClientProps = {
  initialData: CanvasDashboardData | null;
  initialPreferences: SubjectPreferences;
};

function getDateParts(value: Date | string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(typeof value === "string" ? new Date(value) : value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
  };
}

function getActivityAccent(dueAt?: string) {
  if (!dueAt) {
    return {
      label: "Later",
      className: "border-border bg-card/80 hover:border-foreground/15 hover:bg-muted/70",
      badgeClassName: "border-border text-muted-foreground",
    };
  }

  const nowParts = getDateParts(new Date());
  const dueParts = getDateParts(dueAt);
  const nowDate = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const dueDate = Date.UTC(dueParts.year, dueParts.month - 1, dueParts.day);
  const diffDays = Math.floor((dueDate - nowDate) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: "Overdue",
      className: "border-red-400 bg-red-50 hover:border-red-500 hover:bg-red-100/70 dark:border-red-400/70 dark:bg-red-950/35 dark:hover:bg-red-950/50",
      badgeClassName: "border-red-400 text-red-700 dark:border-red-400/70 dark:text-red-200",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      className: "border-red-300 bg-red-50/80 hover:border-red-400 hover:bg-red-50 dark:border-red-400/65 dark:bg-red-950/30 dark:hover:bg-red-950/45",
      badgeClassName: "border-red-300 text-red-700 dark:border-red-400/65 dark:text-red-200",
    };
  }

  if (diffDays <= 6) {
    return {
      label: "This week",
      className: "border-amber-300 bg-amber-50/80 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-400/65 dark:bg-amber-950/30 dark:hover:bg-amber-950/45",
      badgeClassName: "border-amber-300 text-amber-700 dark:border-amber-400/65 dark:text-amber-200",
    };
  }

  return {
    label: "Later",
    className: "border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-50 dark:border-white/12 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]",
    badgeClassName: "border-slate-300 text-slate-700 dark:border-white/12 dark:text-slate-200",
  };
}

function getCourseIcon(courseName?: string | null) {
  const normalized = (courseName ?? "").toLowerCase();

  if (normalized.includes("cálculo") || normalized.includes("calculo") || normalized.includes("mat")) return Calculator;
  if (normalized.includes("física") || normalized.includes("fisica") || normalized.includes("química") || normalized.includes("quimica")) return FlaskConical;
  if (normalized.includes("algorit") || normalized.includes("program") || normalized.includes("software") || normalized.includes("comput")) return Code2;
  if (normalized.includes("hist") || normalized.includes("direito") || normalized.includes("pol") || normalized.includes("soc")) return Landmark;
  if (normalized.includes("ingl") || normalized.includes("idioma") || normalized.includes("comun") || normalized.includes("texto")) return PenSquare;
  if (normalized.includes("gest") || normalized.includes("adm") || normalized.includes("econom") || normalized.includes("negó") || normalized.includes("nego")) return Briefcase;
  if (normalized.includes("estat") || normalized.includes("álgebra") || normalized.includes("algebra")) return Sigma;
  if (normalized.includes("geog") || normalized.includes("global") || normalized.includes("internac")) return Globe;

  return BookOpen;
}

function getCourseGradePercentage(course: CanvasDashboardData["courses"][number]) {
  const enrollment = course.enrollments?.[0];

  return (
    enrollment?.current_period_computed_current_score ??
    enrollment?.computed_current_score ??
    enrollment?.grades?.current_score ??
    null
  );
}

function formatGradePercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function scheduleBackgroundTask(callback: () => void, delay = 0) {
  let idleId: number | null = null;
  const timeoutId = window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => callback(), { timeout: 1500 });
      return;
    }

    callback();
  }, delay);

  return () => {
    window.clearTimeout(timeoutId);

    if (idleId != null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleId);
    }
  };
}

function getAgeMs(timestamp?: string) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(timestamp).getTime();

  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.now() - parsed;
}

function prefetchAppRoutes(router: ReturnType<typeof useRouter>, data: CanvasDashboardData, prefetchedRoutes: Set<string>) {
  const routes = new Set<string>(["/calendar", "/inbox", "/profile", "/bookmarks"]);

  for (const course of data.courses.slice(0, PREFETCH_SUBJECT_LIMIT)) {
    routes.add(`/subjects/${course.id}`);
  }

  for (const item of data.todo.slice(0, PREFETCH_ASSIGNMENT_LIMIT)) {
    if (!item.assignment?.course_id || !item.assignment.id) {
      continue;
    }

    routes.add(`/subjects/${item.assignment.course_id}/assignments/${item.assignment.id}`);
  }

  for (const route of routes) {
    if (prefetchedRoutes.has(route)) {
      continue;
    }

    prefetchedRoutes.add(route);
    router.prefetch(route);
  }
}

export default function HomeClient({ initialData, initialPreferences }: HomeClientProps) {
  const router = useRouter();
  const prefetchedRoutesRef = useRef(new Set<string>());
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(CANVAS_API_KEY_STORAGE)?.trim() ?? "";
  });
  const [providerUrl, setProviderUrl] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(CANVAS_API_BASE_STORAGE)?.trim() ?? "";
  });
  const [data, setData] = useState<CanvasDashboardData | null>(() => {
    if (initialData) {
      return initialData;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const savedDashboard = localStorage.getItem(CANVAS_DASHBOARD_STORAGE);

    if (!savedDashboard) {
      return null;
    }

    try {
      return JSON.parse(savedDashboard) as CanvasDashboardData;
    } catch {
      localStorage.removeItem(CANVAS_DASHBOARD_STORAGE);
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPastCourses, setShowPastCourses] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);
  const hasSavedKey = apiKey.trim().length > 0;

  const loadDashboard = async (key: string, provider: string) => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey: key, providerUrl: provider }),
    });

    const payload = (await response.json()) as CanvasDashboardData & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Could not load Canvas data");
    }

    setData(payload);
    localStorage.setItem(CANVAS_API_KEY_STORAGE, key);
    localStorage.setItem(CANVAS_API_BASE_STORAGE, payload.apiBase);
    localStorage.setItem(CANVAS_DASHBOARD_STORAGE, JSON.stringify(payload));
    localStorage.removeItem(CANVAS_BOOTSTRAP_STORAGE);
    setLoading(false);
  };

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    const refreshDelay = Math.max(0, DASHBOARD_REFRESH_MIN_AGE_MS - getAgeMs(data?.generatedAt));
    return scheduleBackgroundTask(() => {
      loadDashboard(apiKey, providerUrl).catch((loadError: unknown) => {
        const message = loadError instanceof Error ? loadError.message : "Could not load Canvas data";
        setError(message);
        setLoading(false);
      });
    }, refreshDelay);
  }, [apiKey, data?.generatedAt, providerUrl]);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readSubjectPreferences());

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    const cancelPrefetch = scheduleBackgroundTask(() => {
      prefetchAppRoutes(router, data, prefetchedRoutesRef.current);
    }, 300);

    const bootstrapCache = (() => {
      try {
        const storedValue = localStorage.getItem(CANVAS_BOOTSTRAP_STORAGE);
        return storedValue ? JSON.parse(storedValue) as { generatedAt?: string } : null;
      } catch {
        localStorage.removeItem(CANVAS_BOOTSTRAP_STORAGE);
        return null;
      }
    })();

    if (getAgeMs(bootstrapCache?.generatedAt) < BOOTSTRAP_CACHE_MAX_AGE_MS) {
      return cancelPrefetch;
    }

    const controller = new AbortController();
    const cancelBootstrap = scheduleBackgroundTask(async () => {
      try {
        const response = await fetch("/api/bootstrap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          cache: "no-store",
          body: JSON.stringify({
            courseIds: data.courses.map((course) => course.id),
            todoAssignments: data.todo.flatMap((item) => {
              if (!item.assignment?.course_id || !item.assignment.id) {
                return [];
              }

              return [{
                courseId: item.assignment.course_id,
                assignmentId: item.assignment.id,
              }];
            }),
          }),
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        localStorage.setItem(CANVAS_BOOTSTRAP_STORAGE, JSON.stringify(payload));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }, 1200);

    return () => {
      cancelPrefetch();
      cancelBootstrap();
      controller.abort();
    };
  }, [data, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await loadDashboard(apiKey.trim(), providerUrl.trim());
    } catch (loadError: unknown) {
      const message = loadError instanceof Error ? loadError.message : "Could not load Canvas data";
      setError(message);
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <Card className="w-full max-w-xl border-border/80 bg-card">
          <CardHeader>
            <CardTitle>Connect your Canvas account</CardTitle>
            <CardDescription>Paste your Canvas API key. It is saved on this device for future sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-2xl border border-border/70 bg-muted/35 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">How to get your API key</p>
              <ol className="space-y-1 text-sm text-muted-foreground">
                <li>1. Open Canvas and go to your profile or account settings page.</li>
                <li>2. Find the <span className="font-medium text-foreground">Approved Integrations</span> section.</li>
                <li>3. Click <span className="font-medium text-foreground">New Access Token</span> or <span className="font-medium text-foreground">Generate Token</span>.</li>
                <li>4. Add a purpose if Canvas asks for it, then generate the token.</li>
                <li>5. Copy it immediately and paste it here, because Canvas only shows it once.</li>
              </ol>
              <p className="mb-2 mt-4 text-sm font-medium text-foreground">What Canvas URL to use</p>
              <ol className="space-y-1 text-sm text-muted-foreground">
                <li>1. Open your Canvas in the browser.</li>
                <li>2. Copy the main site URL before any page-specific path.</li>
                <li>3. Example: if you are on <span className="font-medium text-foreground">https://school.instructure.com/courses/123</span>, use <span className="font-medium text-foreground">https://school.instructure.com</span>.</li>
                <li>4. You can also paste the full <span className="font-medium text-foreground">/api/v1</span> URL if you already know it.</li>
              </ol>
              <a
                href="https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Official Canvas docs
              </a>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Canvas URL (for example https://school.instructure.com)"
                value={providerUrl}
                onChange={(event) => setProviderUrl(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="Canvas API key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!hasSavedKey || loading}>
                {loading ? "Connecting..." : "Save key and connect"}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleCourses = data.courses.filter((course) => !preferences.hiddenCourseIds.includes(course.id));
  const visiblePastCourses = data.pastCourses.filter((course) => !preferences.hiddenCourseIds.includes(course.id));
  const visibleTodo = data.todo.filter((item) => !item.assignment?.course_id || !preferences.hiddenCourseIds.includes(item.assignment.course_id));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen w-full md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="order-1 md:order-0">
          <DesktopSidebar
            active="dashboard"
            profile={data.profile}
            courses={data.courses}
            initialPreferences={initialPreferences}
          />
        </div>

        <main className="order-0 flex flex-col p-6 pb-32 md:order-1 md:pb-6">
          <section className="order-0 mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Subjects</h2>
              {data.pastCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPastCourses((current) => !current)}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {showPastCourses ? "Hide old subjects" : "Show old subjects"}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCourses.map((course) => {
                const subjectName = formatSubjectName(course.name);
                const Icon = getCourseIcon(course.name);
                const iconStyle = getSubjectColorStyle(course.name, preferences.colors[course.id]);
                const gradePercentage = getCourseGradePercentage(course);
                return (
                  <Link key={course.id} href={`/subjects/${course.id}`} className="block">
                    <Card className="border-border/80 transition hover:border-foreground/20 hover:bg-muted/85 hover:ring-foreground/15">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span className="rounded-md border p-1.5" style={iconStyle}><Icon className="h-4 w-4" /></span>
                            <span className="line-clamp-1">{subjectName}</span>
                          </CardTitle>
                          {gradePercentage != null && (
                            <span className="shrink-0 text-sm font-medium text-muted-foreground">
                              {formatGradePercentage(gradePercentage)}%
                            </span>
                          )}
                        </div>
                        <CardDescription className="line-clamp-1">{course.course_code ?? "No code"}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
              {showPastCourses && visiblePastCourses.length > 0 && (
              <div className="mt-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Old subjects</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visiblePastCourses.map((course) => {
                    const subjectName = formatSubjectName(course.name);
                    const Icon = getCourseIcon(course.name);
                    const iconStyle = getSubjectColorStyle(course.name, preferences.colors[course.id]);
                    return (
                      <Link key={course.id} href={`/subjects/${course.id}`} className="block">
                        <Card className="border-border/70 bg-muted/25 transition hover:border-foreground/15 hover:bg-muted/70">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <span className="rounded-md border p-1.5" style={iconStyle}><Icon className="h-4 w-4" /></span>
                              <span className="line-clamp-1">{subjectName}</span>
                            </CardTitle>
                            <CardDescription className="line-clamp-1">
                              {course.course_code ?? "Old subject"}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="order-1">
            <Card className="border-border/80">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>To-Do</CardTitle>
                    <CardDescription>Upcoming activities</CardDescription>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{visibleTodo.length}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleTodo.length === 0 && <p className="text-sm text-muted-foreground">No pending activities right now.</p>}
                {visibleTodo.map((item) => {
                  const subjectName = formatSubjectName(item.context_name ?? "Unknown course");
                  const subjectColor = getSubjectColorStyle(
                    item.context_name ?? "Unknown course",
                    item.assignment?.course_id ? preferences.colors[item.assignment.course_id] : undefined,
                  );
                  const activityAccent = getActivityAccent(item.assignment?.due_at);
                  const activityContent = (
                    <div className={`rounded-md border p-3 transition ${activityAccent.className}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{item.assignment?.name ?? "Untitled task"}</p>
                        <div className="flex items-center gap-2">
                          {item.assignment?.completed && (
                            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Done
                            </span>
                          )}
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${activityAccent.badgeClassName}`}>
                            {activityAccent.label}
                          </span>
                        </div>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: subjectColor.borderColor }}
                        />
                        <span>{subjectName}</span>
                      </p>
                      <p className="mt-1 text-xs">Due: {formatDueDateShort(item.assignment?.due_at)}</p>
                    </div>
                  );

                  if (!item.assignment?.html_url) {
                    if (!item.assignment?.course_id || !item.assignment?.id) {
                      return <div key={`${item.type}-${item.assignment?.id}`}>{activityContent}</div>;
                    }

                    return (
                      <Link
                        key={`${item.type}-${item.assignment?.id}`}
                        href={`/subjects/${item.assignment.course_id}/assignments/${item.assignment.id}`}
                        className="block"
                      >
                        {activityContent}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={`${item.type}-${item.assignment?.id}`}
                      href={
                        item.assignment.course_id && item.assignment.id
                          ? `/subjects/${item.assignment.course_id}/assignments/${item.assignment.id}`
                          : item.assignment.html_url
                      }
                      className="block"
                    >
                      {activityContent}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <MobileBottomNav active="dashboard" courses={data.courses} initialPreferences={initialPreferences} />
    </div>
  );
}
