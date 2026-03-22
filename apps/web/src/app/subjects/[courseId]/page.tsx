import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, BookOpen, CircleDot, LockKeyhole } from "lucide-react";
import { t } from "@canvas/shared";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { GroupCreateForm } from "@/app/subjects/[courseId]/group-create-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCourseContent,
  getCourseDiscussions,
  getCourseFiles,
  getCourseGradeData,
  getCourseGroupCreateAccess,
  getCourseGroups,
  getCoursePeople,
  getSubjectShellData,
} from "@/lib/canvas";
import { getRequestLocale } from "@/lib/request-locale";
import { formatDueDateShort, formatGroupJoinLevel, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";
const SUBJECT_TABS = ["overview", "modules", "assignments", "grades", "people", "forums", "files"] as const;
type SubjectTab = typeof SUBJECT_TABS[number];
type PeopleSubtab = "people" | "groups";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeTab(value?: string): SubjectTab {
  return SUBJECT_TABS.includes(value as SubjectTab) ? (value as SubjectTab) : "overview";
}

function normalizePeopleSubtab(value?: string): PeopleSubtab {
  return value === "groups" ? "groups" : "people";
}

function getSubjectTabLabel(tab: SubjectTab, resolvedLocale: "en" | "pt-BR") {
  switch (tab) {
    case "overview":
      return t(resolvedLocale, "subjects.overview");
    case "modules":
      return t(resolvedLocale, "subjects.modules");
    case "assignments":
      return t(resolvedLocale, "subjects.assignments");
    case "grades":
      return t(resolvedLocale, "subjects.grades");
    case "people":
      return t(resolvedLocale, "subjects.people");
    case "forums":
      return t(resolvedLocale, "subjects.forums");
    case "files":
      return t(resolvedLocale, "subjects.files");
  }
}

function formatMetricNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getGradeTrendPoints(
  assignments: Array<{
    due_at?: string;
    points_possible?: number;
    submission?: { score?: number };
  }>,
) {
  const items = assignments
    .filter((assignment) => assignment.points_possible && assignment.points_possible > 0 && assignment.submission?.score != null)
    .map((assignment) => ({
      date: assignment.due_at ?? "",
      percentage: Math.max(0, Math.min(100, ((assignment.submission?.score ?? 0) / (assignment.points_possible ?? 1)) * 100)),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (items.length === 0) {
    return [];
  }

  const width = 240;
  const height = 96;
  const paddingX = 10;
  const paddingY = 10;

  return items.map((item, index) => {
    const x = items.length === 1
      ? width / 2
      : paddingX + (index / (items.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (item.percentage / 100) * (height - paddingY * 2);

    return {
      ...item,
      x,
      y,
    };
  });
}

function buildTrendPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function getModuleItemHref(courseId: number, item: { type?: string; page_url?: string; html_url?: string; content_id?: number }) {
  if (item.type === "Page" && item.page_url) {
    return `/subjects/${courseId}/pages/${encodeURIComponent(item.page_url)}`;
  }

  if (item.type === "File" && item.content_id) {
    return `/subjects/${courseId}/files/${item.content_id}`;
  }

  if (item.type === "Quiz" && item.content_id) {
    return `/subjects/${courseId}/quizzes/${item.content_id}`;
  }

  if (item.type === "Assignment" && item.content_id) {
    return `/subjects/${courseId}/assignments/${item.content_id}`;
  }

  return item.html_url;
}

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string; peopleView?: string }>;
}) {
  const { courseId } = await params;
  const { tab, peopleView } = await searchParams;
  const parsedCourseId = Number(courseId);
  const activeTab = normalizeTab(tab);
  const activePeopleView = normalizePeopleSubtab(peopleView);
  const { resolvedLocale } = await getRequestLocale();

  if (!Number.isFinite(parsedCourseId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const shouldLoadOverviewContent =
    activeTab === "overview" || activeTab === "modules" || activeTab === "assignments";

  const [courseShellData, courseContent] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    shouldLoadOverviewContent
      ? getCourseContent(parsedCourseId, apiKey)
      : Promise.resolve({ assignments: [], courseId: parsedCourseId, modules: [] }),
  ]);
  const [gradeDataResult, peopleResult, groupsResult, discussionsResult, filesResult] = await Promise.allSettled([
    activeTab === "grades" ? getCourseGradeData(parsedCourseId, apiKey) : Promise.resolve(null),
    activeTab === "people" ? getCoursePeople(parsedCourseId, apiKey) : Promise.resolve([]),
    activeTab === "people" && activePeopleView === "groups" ? getCourseGroups(parsedCourseId, apiKey) : Promise.resolve([]),
    activeTab === "forums" ? getCourseDiscussions(parsedCourseId, apiKey) : Promise.resolve([]),
    activeTab === "files" ? getCourseFiles(parsedCourseId, apiKey) : Promise.resolve([]),
  ]);
  const course = courseShellData.course;

  if (!course) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const gradeData = gradeDataResult.status === "fulfilled" ? gradeDataResult.value : null;
  const people = peopleResult.status === "fulfilled" ? peopleResult.value : [];
  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
  const groupCreateAccess =
    activeTab === "people" && activePeopleView === "groups" && groupsResult.status === "fulfilled"
      ? await getCourseGroupCreateAccess(groups, apiKey).catch(() => ({ canCreate: false, groupCategoryId: null }))
      : { canCreate: false, groupCategoryId: null };
  const discussions = discussionsResult.status === "fulfilled" ? discussionsResult.value : [];
  const files = filesResult.status === "fulfilled" ? filesResult.value : [];
  const filesUnavailable = activeTab === "files" && filesResult.status === "rejected";
  const peopleUnavailable = activeTab === "people" && activePeopleView === "people" && peopleResult.status === "rejected";
  const groupsUnavailable = activeTab === "people" && activePeopleView === "groups" && groupsResult.status === "rejected";
  const forumsUnavailable = activeTab === "forums" && discussionsResult.status === "rejected";
  const gradesUnavailable = activeTab === "grades" && gradeDataResult.status === "rejected";
  const totalDistributedPoints = gradeData?.assignments.reduce((sum, assignment) => {
    return sum + (assignment.points_possible ?? 0);
  }, 0) ?? 0;
  const absolutePoints = gradeData?.assignments.reduce((sum, assignment) => {
    return sum + (assignment.submission?.score ?? 0);
  }, 0) ?? 0;
  const gradePercentage = gradeData?.enrollment?.grades?.current_score ?? (totalDistributedPoints > 0 ? (absolutePoints / totalDistributedPoints) * 100 : null);
  const gradeTrendPoints = getGradeTrendPoints(gradeData?.assignments ?? []);
  const gradeTrendPath = buildTrendPath(gradeTrendPoints);

  return (
    <DesktopAppShell
      profile={courseShellData.profile}
      courses={courseShellData.courses}
      currentCourseId={parsedCourseId}
      contentClassName="p-4 pb-32 md:p-5 md:pb-6"
    >
      <div className="w-full">
        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{formatSubjectName(course.name)}</h1>
                  <p className="text-sm text-black/55">{course.course_code ?? t(resolvedLocale, "subjects.subjectOverview")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {SUBJECT_TABS.map((item) => (
            <Link
              key={item}
              href={`/subjects/${parsedCourseId}${item === "overview" ? "" : `?tab=${item}`}`}
              className={
                `${
                  item === "overview"
                    ? "hidden md:inline-block"
                    : item === "modules" || item === "assignments"
                      ? "inline-block md:hidden"
                      : "inline-block"
                } ${
                  activeTab === item || (activeTab === "overview" && item === "modules")
                    ? "rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/65 transition hover:border-black/45 hover:bg-black/[0.03] hover:text-black"
                }`
              }
            >
              {getSubjectTabLabel(item, resolvedLocale)}
            </Link>
          ))}
        </div>

        {(activeTab === "overview" || activeTab === "modules" || activeTab === "assignments") && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card
              className={
                activeTab === "assignments"
                  ? "hidden border-black/15 bg-white/90 lg:block"
                  : activeTab === "overview"
                    ? "border-black/15 bg-white/90"
                    : "border-none bg-transparent py-0 ring-0 shadow-none"
              }
            >
              {activeTab === "overview" ? (
                <CardHeader className="border-b border-black/10">
                  <CardTitle>{t(resolvedLocale, "subjects.modules")}</CardTitle>
                  <CardDescription>{t(resolvedLocale, "subjects.lessonsAndMaterials")}</CardDescription>
                </CardHeader>
              ) : null}
              <CardContent className={activeTab === "overview" ? "space-y-3" : "space-y-3 px-1"}>
                {courseContent.modules.length === 0 && (
                  <p className="text-sm text-black/70">{t(resolvedLocale, "subjects.noModules")}</p>
                )}
                {courseContent.modules.map((module) => (
                  <div key={module.id} className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{module.name}</p>
                        <p className="mt-1 text-xs text-black/50">{t(resolvedLocale, "subjects.courseMaterials")}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-black/15 px-2.5 py-1 text-xs text-black/60">
                        {t(resolvedLocale, "subjects.itemsCount", { count: module.items_count ?? module.items?.length ?? 0 })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {module.items?.slice(0, 12).map((item) => {
                        const itemHref = getModuleItemHref(parsedCourseId, item);

                        if (item.type === "SubHeader") {
                          return (
                            <div
                              key={item.id}
                              className="rounded-lg border border-black/8 bg-black/[0.03] px-3 py-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: subjectStyle.borderColor }}
                                />
                                <h3 className="text-sm font-semibold text-black/80">
                                  {item.title ?? t(resolvedLocale, "subjects.section")}
                                </h3>
                              </div>
                            </div>
                          );
                        }

                        const itemContent = (
                          <div className="flex items-start justify-between gap-3 rounded-lg border border-black/8 bg-white/80 px-3 py-2.5 text-sm transition hover:border-black/30 hover:bg-black/[0.03]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: subjectStyle.borderColor }}
                                />
                                <p className="truncate">{item.title ?? t(resolvedLocale, "subjects.untitledItem")}</p>
                              </div>
                              <p className="mt-1 text-xs text-black/55">{item.type ?? t(resolvedLocale, "subjects.content")}</p>
                            </div>
                            {item.completion_requirement?.completed && (
                              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-xs text-emerald-700">
                                {t(resolvedLocale, "calendar.done")}
                              </Badge>
                            )}
                          </div>
                        );

                        if (!itemHref) {
                          return <div key={item.id}>{itemContent}</div>;
                        }

                        return (
                          <Link
                            key={item.id}
                            href={itemHref}
                            target={itemHref.startsWith("/subjects/") ? undefined : "_blank"}
                            className="block"
                          >
                            {itemContent}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card
              className={
                activeTab === "modules" || activeTab === "overview"
                  ? "hidden border-black/15 bg-white/90 lg:block"
                  : "border-none bg-transparent py-0 ring-0 shadow-none"
              }
            >
              {activeTab === "overview" ? (
                <CardHeader className="border-b border-black/10">
                  <CardTitle>{t(resolvedLocale, "subjects.assignments")}</CardTitle>
                  <CardDescription>{t(resolvedLocale, "subjects.upcomingAndRecentWork")}</CardDescription>
                </CardHeader>
              ) : null}
              <CardContent className={activeTab === "overview" ? "space-y-3" : "space-y-3 px-1"}>
                {courseContent.assignments.length === 0 && (
                  <p className="text-sm text-black/70">{t(resolvedLocale, "subjects.noAssignments")}</p>
                )}
                {courseContent.assignments.map((assignment) => {
                  const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                  const assignmentHref = `/subjects/${parsedCourseId}/assignments/${assignment.id}`;
                  const assignmentContent = (
                    <div
                      className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                      style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CircleDot className="h-4 w-4 shrink-0 text-black/40" />
                            <p className={`text-sm font-medium ${isCompleted ? "text-black/55 line-through" : ""}`}>{assignment.name}</p>
                          </div>
                          <p className="mt-2 text-xs text-black/70">{t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}</p>
                          <p className="mt-1 text-xs text-black/55">
                            {assignment.points_possible != null ? t(resolvedLocale, "subjects.points", { count: assignment.points_possible }) : t(resolvedLocale, "subjects.noPointsListed")}
                          </p>
                        </div>
                        {isCompleted && (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                            {t(resolvedLocale, "calendar.done")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );

                  if (!assignmentHref && !assignment.html_url) {
                    return <div key={assignment.id}>{assignmentContent}</div>;
                  }

                  return (
                    <Link key={assignment.id} href={assignmentHref || assignment.html_url!} className="block">
                      {assignmentContent}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "grades" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-black/15 bg-white/90">
                <CardHeader className="border-b border-black/10">
                  <CardTitle>{t(resolvedLocale, "subjects.gradePercent")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{gradePercentage != null ? `${formatMetricNumber(gradePercentage)}%` : "--"}</p>
                  <p className="mt-1 text-sm text-black/55">
                    {t(resolvedLocale, "subjects.overallPercentage")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-black/15 bg-white/90">
                <CardHeader className="border-b border-black/10">
                  <CardTitle>{t(resolvedLocale, "subjects.absolute")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{formatMetricNumber(absolutePoints)}</p>
                  <p className="mt-1 text-sm text-black/55">
                    {t(resolvedLocale, "subjects.totalPointsEarned")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-black/15 bg-white/90">
                <CardHeader className="border-b border-black/10">
                  <CardTitle>{t(resolvedLocale, "subjects.trend")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {gradeTrendPoints.length > 1 ? (
                    <div>
                      <svg viewBox="0 0 240 96" className="h-24 w-full">
                        <path d="M 10 86 H 230" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                        <path d="M 10 48 H 230" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                        <path d="M 10 10 H 230" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                        <path
                          d={gradeTrendPath}
                          fill="none"
                          stroke={subjectStyle.borderColor}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {gradeTrendPoints.map((point, index) => (
                          <circle
                            key={`${point.x}-${point.y}-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={index === gradeTrendPoints.length - 1 ? 4 : 3}
                            fill={index === gradeTrendPoints.length - 1 ? subjectStyle.color : subjectStyle.borderColor}
                          >
                            <title>{`${formatMetricNumber(point.percentage)}%`}</title>
                          </circle>
                        ))}
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-sm text-black/55">
                      {t(resolvedLocale, "subjects.notEnoughGradedActivities")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-black/15 bg-white/90">
              <CardHeader className="border-b border-black/10">
                <CardTitle>{t(resolvedLocale, "subjects.assignmentGrades")}</CardTitle>
                <CardDescription>{t(resolvedLocale, "subjects.scoresAndSubmissionStatus")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gradeData?.assignments.length ? (
                  gradeData.assignments.map((assignment) => {
                    const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                    const assignmentHref = `/subjects/${parsedCourseId}/assignments/${assignment.id}`;
                    const content = (
                      <div
                        className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                        style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${isCompleted ? "text-black/55 line-through" : ""}`}>{assignment.name}</p>
                            <p className="mt-2 text-xs text-black/60">{t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, assignment.due_at) })}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">
                              {assignment.submission?.grade ?? (assignment.submission?.score != null ? String(assignment.submission.score) : "--")}
                            </p>
                            <p className="text-xs text-black/55">
                              {assignment.points_possible != null ? `of ${assignment.points_possible}` : t(resolvedLocale, "subjects.noPointsListed")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );

                    if (!assignmentHref && !assignment.html_url) {
                      return <div key={assignment.id}>{content}</div>;
                    }

                    return (
                      <Link key={assignment.id} href={assignmentHref || assignment.html_url!} className="block">
                        {content}
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-sm text-black/70">
                    {gradesUnavailable ? t(resolvedLocale, "subjects.gradesUnavailable") : t(resolvedLocale, "subjects.noGradeData")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "people" && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Link
                href={`/subjects/${parsedCourseId}?tab=people`}
                className={
                  activePeopleView === "people"
                    ? "rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/65 transition hover:border-black/45 hover:bg-black/[0.03] hover:text-black"
                }
              >
                {t(resolvedLocale, "subjects.people")}
              </Link>
              <Link
                href={`/subjects/${parsedCourseId}?tab=people&peopleView=groups`}
                className={
                  activePeopleView === "groups"
                    ? "rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/65 transition hover:border-black/45 hover:bg-black/[0.03] hover:text-black"
                }
              >
                {t(resolvedLocale, "subjects.groups")}
              </Link>
            </div>

            {activePeopleView === "groups" && (
              <div className="flex justify-end">
                <GroupCreateForm canCreate={groupCreateAccess.canCreate} courseId={parsedCourseId} />
              </div>
            )}

            <div className={activePeopleView === "groups" ? "space-y-3 px-1" : "grid gap-3 px-1 sm:grid-cols-2 xl:grid-cols-3"}>
                {activePeopleView === "people" && people.length === 0 && (
                  <p className="text-sm text-black/70">{peopleUnavailable ? t(resolvedLocale, "subjects.peopleUnavailable") : t(resolvedLocale, "subjects.noPeople")}</p>
                )}
                {activePeopleView === "people" && people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/subjects/${parsedCourseId}/people/${person.id}`}
                    className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="border border-black/15">
                        <AvatarImage src={person.avatar_url} alt={person.name} />
                        <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{person.name}</p>
                        <p className="truncate text-xs text-black/55">{person.short_name ?? person.sortable_name ?? t(resolvedLocale, "subjects.canvasUser")}</p>
                      </div>
                    </div>
                  </Link>
                ))}
                {activePeopleView === "groups" && groups.length === 0 && (
                  <p className="text-sm text-black/70">{groupsUnavailable ? t(resolvedLocale, "subjects.groupsUnavailable") : t(resolvedLocale, "subjects.noGroups")}</p>
                )}
                {activePeopleView === "groups" && groups.map((group) => {
                  return (
                    <div
                      key={group.id}
                      className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                      style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{group.name}</p>
                          <p className="mt-1 text-xs text-black/55">{group.description || t(resolvedLocale, "subjects.canvasGroup")}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-black/55">
                            <p>{t(resolvedLocale, "subjects.members", { count: group.members_count ?? 0 })}</p>
                            <p>{formatGroupJoinLevel(resolvedLocale, group.join_level)}</p>
                          </div>
                          {group.canOpen ? (
                            <Link
                              href={`/subjects/${parsedCourseId}/groups/${group.id}`}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-black/65 underline-offset-2 transition hover:text-black hover:underline"
                            >
                              <span>{t(resolvedLocale, "subjects.enterGroup")}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs text-black/45">
                              <LockKeyhole className="h-3.5 w-3.5" />
                              <span>{t(resolvedLocale, "subjects.locked")}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <details className="mt-4 rounded-lg border border-black/8 bg-black/[0.02] px-3 py-2 open:bg-black/[0.03]">
                        <summary className="cursor-pointer list-none text-sm font-medium text-black/75">
                          <span className="inline-flex items-center gap-2">
                            <CircleDot className="h-3.5 w-3.5" />
                            {t(resolvedLocale, "subjects.viewMembers")}
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {group.users && group.users.length > 0 ? (
                            group.users.map((person) => (
                              <Link
                                key={person.id}
                                href={`/subjects/${parsedCourseId}/people/${person.id}`}
                                className="flex items-center gap-3 rounded-lg border border-black/8 bg-white/85 px-3 py-2 transition hover:border-black/20 hover:bg-black/[0.03]"
                              >
                                <Avatar className="border border-black/15">
                                  <AvatarImage src={person.avatar_url} alt={person.name} />
                                  <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{person.name}</p>
                                  <p className="truncate text-xs text-black/55">{person.short_name ?? person.sortable_name ?? t(resolvedLocale, "subjects.canvasUser")}</p>
                                </div>
                              </Link>
                            ))
                          ) : group.usersAccessDenied ? (
                            <p className="text-xs text-black/55">{t(resolvedLocale, "subjects.restrictedGroupMembers")}</p>
                          ) : (
                            <p className="text-xs text-black/55">{t(resolvedLocale, "subjects.noMemberList")}</p>
                          )}
                        </div>
                      </details>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "forums" && (
          <div className="space-y-3 px-1">
              {discussions.length === 0 && <p className="text-sm text-black/70">{forumsUnavailable ? t(resolvedLocale, "subjects.forumsUnavailable") : t(resolvedLocale, "subjects.noForums")}</p>}
              {discussions.map((discussion) => {
                const content = (
                  <div
                    className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                    style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{discussion.title ?? t(resolvedLocale, "subjects.untitledForum")}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-black/60">{discussion.message?.replace(/<[^>]+>/g, " ") ?? t(resolvedLocale, "inbox.noPreview")}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-black/55">
                        <p>{t(resolvedLocale, "subjects.replies", { count: discussion.discussion_subentry_count ?? 0 })}</p>
                        {discussion.unread_count != null && <p>{t(resolvedLocale, "subjects.unreadCount", { count: discussion.unread_count })}</p>}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-black/50">{formatDueDateShort(discussion.posted_at)}</p>
                  </div>
                );

                if (!discussion.html_url) {
                  return <div key={discussion.id}>{content}</div>;
                }

                return (
                  <Link key={discussion.id} href={discussion.html_url} target="_blank" className="block">
                    {content}
                  </Link>
                );
              })}
          </div>
        )}

        {activeTab === "files" && (
          <div className="space-y-3 px-1">
              {files.length === 0 && <p className="text-sm text-black/70">{filesUnavailable ? t(resolvedLocale, "subjects.filesUnavailable") : t(resolvedLocale, "subjects.noFiles")}</p>}
              {files.map((file) => {
                const fileHref = `/subjects/${parsedCourseId}/files/${file.id}`;
                const content = (
                  <div
                    className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                    style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.display_name ?? file.filename ?? t(resolvedLocale, "subjects.untitledFile")}</p>
                        <p className="mt-1 text-xs text-black/55">{file["content-type"] ?? t(resolvedLocale, "subjects.files")}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-black/55">
                        <p>{file.size != null ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "--"}</p>
                        <p>{formatDueDateShort(file.updated_at ?? file.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );

                if (!fileHref) {
                  return <div key={file.id}>{content}</div>;
                }

                return (
                  <Link
                    key={file.id}
                    href={fileHref}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              })}
          </div>
        )}
      </div>
    </DesktopAppShell>
  );
}
