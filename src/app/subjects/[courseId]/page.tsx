import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { BookOpen, CircleDot } from "lucide-react";
import { DesktopAppShell } from "@/components/desktop-app-shell";
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
  getCourseGroups,
  getCoursePeople,
  getDashboardData,
} from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

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

function isPreviewableFile(contentType?: string, filename?: string) {
  const normalizedType = (contentType ?? "").toLowerCase();
  const normalizedName = (filename ?? "").toLowerCase();

  return (
    normalizedType === "application/pdf" ||
    normalizedType.startsWith("image/") ||
    normalizedName.endsWith(".pdf") ||
    normalizedName.endsWith(".png") ||
    normalizedName.endsWith(".jpg") ||
    normalizedName.endsWith(".jpeg") ||
    normalizedName.endsWith(".gif") ||
    normalizedName.endsWith(".webp")
  );
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

  if (!Number.isFinite(parsedCourseId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [dashboardData, courseContent] = await Promise.all([
    getDashboardData(apiKey),
    getCourseContent(parsedCourseId, apiKey),
  ]);
  const [gradeDataResult, peopleResult, groupsResult, discussionsResult, filesResult] = await Promise.allSettled([
    activeTab === "grades" ? getCourseGradeData(parsedCourseId, apiKey) : Promise.resolve(null),
    activeTab === "people" ? getCoursePeople(parsedCourseId, apiKey) : Promise.resolve([]),
    activeTab === "people" && activePeopleView === "groups" ? getCourseGroups(parsedCourseId, apiKey) : Promise.resolve([]),
    activeTab === "forums" ? getCourseDiscussions(parsedCourseId, apiKey) : Promise.resolve([]),
    activeTab === "files" ? getCourseFiles(parsedCourseId, apiKey) : Promise.resolve([]),
  ]);
  const allCourses = [...dashboardData.courses, ...dashboardData.pastCourses];

  const course = allCourses.find((item) => item.id === parsedCourseId);

  if (!course) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const gradeData = gradeDataResult.status === "fulfilled" ? gradeDataResult.value : null;
  const people = peopleResult.status === "fulfilled" ? peopleResult.value : [];
  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
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
    <DesktopAppShell profile={dashboardData.profile} courses={dashboardData.courses} currentCourseId={parsedCourseId}>
      <div className="w-full">
        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-6">
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
                  <p className="text-sm text-black/55">{course.course_code ?? "Subject overview"}</p>
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
                  activeTab === item
                    ? "rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/65 transition hover:border-black/30 hover:text-black"
                }`
              }
            >
              {item === "overview"
                ? "Overview"
                : item === "modules"
                  ? "Modules"
                  : item === "assignments"
                    ? "Assignments"
                    : item === "grades"
                      ? "Grades"
                      : item === "people"
                        ? "People"
                        : item === "forums"
                          ? "Forums"
                          : "Files"}
            </Link>
          ))}
        </div>

        {(activeTab === "overview" || activeTab === "modules" || activeTab === "assignments") && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className={activeTab === "assignments" ? "hidden border-black/15 bg-white/90 lg:block" : "border-black/15 bg-white/90"}>
              <CardHeader className="border-b border-black/10">
                <CardTitle>Modules</CardTitle>
                <CardDescription>Lessons and organized course materials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courseContent.modules.length === 0 && (
                  <p className="text-sm text-black/70">No modules available for this subject.</p>
                )}
                {courseContent.modules.map((module) => (
                  <div key={module.id} className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{module.name}</p>
                        <p className="mt-1 text-xs text-black/50">Course materials</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-black/15 px-2.5 py-1 text-xs text-black/60">
                        {module.items_count ?? module.items?.length ?? 0} items
                      </span>
                    </div>
                    <div className="space-y-2">
                      {module.items?.slice(0, 12).map((item) => {
                        const itemHref = getModuleItemHref(parsedCourseId, item);
                        const itemContent = (
                          <div className="flex items-start justify-between gap-3 rounded-lg border border-black/8 bg-white/80 px-3 py-2.5 text-sm transition hover:border-black/15 hover:bg-white">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: subjectStyle.borderColor }}
                                />
                                <p className="truncate">{item.title ?? "Untitled item"}</p>
                              </div>
                              <p className="mt-1 text-xs text-black/55">{item.type ?? "Content"}</p>
                            </div>
                            {item.completion_requirement?.completed && (
                              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-xs text-emerald-700">
                                Done
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

              <Card className={activeTab === "modules" ? "hidden border-black/15 bg-white/90 lg:block" : "border-black/15 bg-white/90"}>
              <CardHeader className="border-b border-black/10">
                <CardTitle>Assignments</CardTitle>
                <CardDescription>Upcoming and recent work for this subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courseContent.assignments.length === 0 && (
                  <p className="text-sm text-black/70">No assignments available for this subject.</p>
                )}
                {courseContent.assignments.map((assignment) => {
                  const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                  const assignmentHref = `/subjects/${parsedCourseId}/assignments/${assignment.id}`;
                  const assignmentContent = (
                    <div
                      className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/15 hover:bg-black/[0.01]"
                      style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CircleDot className="h-4 w-4 shrink-0 text-black/40" />
                            <p className={`text-sm font-medium ${isCompleted ? "text-black/55 line-through" : ""}`}>{assignment.name}</p>
                          </div>
                          <p className="mt-2 text-xs text-black/70">Due: {formatDueDateShort(assignment.due_at)}</p>
                          <p className="mt-1 text-xs text-black/55">
                            {assignment.points_possible != null ? `${assignment.points_possible} points` : "No points listed"}
                          </p>
                        </div>
                        {isCompleted && (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                            Done
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
                  <CardTitle>Grade %</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{gradePercentage != null ? `${formatMetricNumber(gradePercentage)}%` : "--"}</p>
                  <p className="mt-1 text-sm text-black/55">
                    Overall percentage in the subject
                  </p>
                </CardContent>
              </Card>
              <Card className="border-black/15 bg-white/90">
                <CardHeader className="border-b border-black/10">
                  <CardTitle>Absolute</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{formatMetricNumber(absolutePoints)}</p>
                  <p className="mt-1 text-sm text-black/55">
                    Total points earned by you
                  </p>
                </CardContent>
              </Card>
              <Card className="border-black/15 bg-white/90">
                <CardHeader className="border-b border-black/10">
                  <CardTitle>Trend</CardTitle>
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
                      Not enough graded activities yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-black/15 bg-white/90">
              <CardHeader className="border-b border-black/10">
                <CardTitle>Assignment grades</CardTitle>
                <CardDescription>Scores and submission status for this subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gradeData?.assignments.length ? (
                  gradeData.assignments.map((assignment) => {
                    const isCompleted = assignment.submission?.excused || ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? "");
                    const assignmentHref = `/subjects/${parsedCourseId}/assignments/${assignment.id}`;
                    const content = (
                      <div
                        className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/15 hover:bg-black/[0.01]"
                        style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${isCompleted ? "text-black/55 line-through" : ""}`}>{assignment.name}</p>
                            <p className="mt-2 text-xs text-black/60">Due: {formatDueDateShort(assignment.due_at)}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">
                              {assignment.submission?.grade ?? (assignment.submission?.score != null ? String(assignment.submission.score) : "--")}
                            </p>
                            <p className="text-xs text-black/55">
                              {assignment.points_possible != null ? `of ${assignment.points_possible}` : "No points listed"}
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
                    {gradesUnavailable ? "Grades are not available for this subject." : "No grade data available for this subject."}
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
                    : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/65 transition hover:border-black/30 hover:text-black"
                }
              >
                People
              </Link>
              <Link
                href={`/subjects/${parsedCourseId}?tab=people&peopleView=groups`}
                className={
                  activePeopleView === "groups"
                    ? "rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    : "rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-black/65 transition hover:border-black/30 hover:text-black"
                }
              >
                Groups
              </Link>
            </div>

            <Card className="border-black/15 bg-white/90">
              <CardHeader className="border-b border-black/10">
                <CardTitle>{activePeopleView === "groups" ? "Groups" : "People"}</CardTitle>
                <CardDescription>
                  {activePeopleView === "groups" ? "All groups visible in this subject" : "Everyone currently visible in this subject"}
                </CardDescription>
              </CardHeader>
              <CardContent className={activePeopleView === "groups" ? "space-y-3" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}>
                {activePeopleView === "people" && people.length === 0 && (
                  <p className="text-sm text-black/70">{peopleUnavailable ? "People are not available for this subject." : "No people available for this subject."}</p>
                )}
                {activePeopleView === "people" && people.map((person) => (
                  <div key={person.id} className="rounded-xl border border-black/10 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="border border-black/15">
                        <AvatarImage src={person.avatar_url} alt={person.name} />
                        <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{person.name}</p>
                        <p className="truncate text-xs text-black/55">{person.short_name ?? person.sortable_name ?? "Canvas user"}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {activePeopleView === "groups" && groups.length === 0 && (
                  <p className="text-sm text-black/70">{groupsUnavailable ? "Groups are not available for this subject." : "No groups available for this subject."}</p>
                )}
                {activePeopleView === "groups" && groups.map((group) => {
                  const content = (
                    <div
                      className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/15 hover:bg-black/[0.01]"
                      style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{group.name}</p>
                          <p className="mt-1 text-xs text-black/55">{group.description || "Canvas group"}</p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-black/55">
                          <p>{group.members_count ?? 0} members</p>
                          <p>{group.join_level ?? "managed"}</p>
                        </div>
                      </div>
                    </div>
                  );

                  if (!group.html_url) {
                    return <div key={group.id}>{content}</div>;
                  }

                  return (
                    <Link key={group.id} href={group.html_url} target="_blank" className="block">
                      {content}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "forums" && (
          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Forums</CardTitle>
              <CardDescription>Discussion topics for this subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {discussions.length === 0 && <p className="text-sm text-black/70">{forumsUnavailable ? "Forums are not available for this subject." : "No forums available for this subject."}</p>}
              {discussions.map((discussion) => {
                const content = (
                  <div
                    className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/15 hover:bg-black/[0.01]"
                    style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{discussion.title ?? "Untitled forum"}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-black/60">{discussion.message?.replace(/<[^>]+>/g, " ") ?? "No preview available."}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-black/55">
                        <p>{discussion.discussion_subentry_count ?? 0} replies</p>
                        {discussion.unread_count != null && <p>{discussion.unread_count} unread</p>}
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
            </CardContent>
          </Card>
        )}

        {activeTab === "files" && (
          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Files</CardTitle>
              <CardDescription>Course files and materials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {files.length === 0 && <p className="text-sm text-black/70">{filesUnavailable ? "Files are not available for this subject." : "No files available for this subject."}</p>}
              {files.map((file) => {
                const previewHref = isPreviewableFile(file["content-type"], file.filename ?? file.display_name)
                  ? `/subjects/${parsedCourseId}/files/${file.id}`
                  : file.url;
                const content = (
                  <div
                    className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/15 hover:bg-black/[0.01]"
                    style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.display_name ?? file.filename ?? "Untitled file"}</p>
                        <p className="mt-1 text-xs text-black/55">{file["content-type"] ?? "File"}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-black/55">
                        <p>{file.size != null ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "--"}</p>
                        <p>{formatDueDateShort(file.updated_at ?? file.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );

                if (!previewHref) {
                  return <div key={file.id}>{content}</div>;
                }

                return (
                  <Link
                    key={file.id}
                    href={previewHref}
                    target={previewHref.startsWith("/subjects/") ? undefined : "_blank"}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DesktopAppShell>
  );
}
