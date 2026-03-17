import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { PersonAvatarViewer } from "@/app/subjects/[courseId]/people/[personId]/person-avatar-viewer";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCoursePerson, getSharedActiveCourses, getSubjectShellData } from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatEnrollmentType(value?: string) {
  if (!value) {
    return "Course member";
  }

  return value.replace(/Enrollment$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

function formatEnrollmentState(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]+/g, " ");
}

function getRoleBadgeClass(value?: string) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized.includes("teacher")) {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (normalized.includes("student")) {
    return "border-sky-300 bg-sky-50 text-sky-800";
  }

  return "border-black/20 bg-white/80 text-black/75";
}

function getStatusBadgeClass(value?: string) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "active") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  if (normalized === "invited" || normalized === "creation_pending") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (normalized === "completed" || normalized === "inactive" || normalized === "deleted") {
    return "border-slate-300 bg-slate-50 text-slate-700";
  }

  return "border-black/20 bg-white/80 text-black/75";
}

export default async function SubjectPersonPage({
  params,
}: {
  params: Promise<{ courseId: string; personId: string }>;
}) {
  const { courseId, personId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedPersonId = Number(personId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedPersonId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [courseShellData, person] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    getCoursePerson(parsedCourseId, parsedPersonId, apiKey),
  ]);
  const course = courseShellData.course;

  if (!course || !person) {
    notFound();
  }

  const primaryEnrollment = person.enrollments?.[0];
  const sharedActiveCourses = await getSharedActiveCourses(courseShellData.courses, parsedPersonId, apiKey);

  return (
    <DesktopAppShell profile={courseShellData.profile} courses={courseShellData.courses} currentCourseId={parsedCourseId}>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <HistoryBackButton fallbackHref={`/subjects/${parsedCourseId}?tab=people`} />
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-4">
                <PersonAvatarViewer src={person.avatar_url} alt={person.name} fallback={getInitials(person.name)} />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{person.name}</h1>
                  <Link
                    href={`/subjects/${parsedCourseId}?tab=people`}
                    className="text-sm text-black/55 transition hover:text-black hover:underline"
                  >
                    {formatSubjectName(course.name)}
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={getRoleBadgeClass(primaryEnrollment?.type ?? primaryEnrollment?.role)}
              >
                {formatEnrollmentType(primaryEnrollment?.type ?? primaryEnrollment?.role)}
              </Badge>
              {primaryEnrollment?.enrollment_state && (
                <Badge
                  variant="outline"
                  className={getStatusBadgeClass(primaryEnrollment.enrollment_state)}
                >
                  {formatEnrollmentState(primaryEnrollment.enrollment_state)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Profile</CardTitle>
              <CardDescription>Information available from the Canvas course user record</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-black/45">Name</p>
                <p className="mt-2 text-sm font-medium">{person.name}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-black/45">Canvas user ID</p>
                <p className="mt-2 text-sm font-medium">{person.id}</p>
              </div>
              {person.sis_user_id && (
                <div className="rounded-xl border border-black/10 bg-white p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-black/45">Email</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    <span className="break-all">{person.sis_user_id}</span>
                  </div>
                </div>
              )}
              {person.created_at && (
                <div className="rounded-xl border border-black/10 bg-white p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-black/45">Canvas account created</p>
                  <p className="mt-2 text-sm font-medium">{formatDueDateShort(person.created_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Shared active subjects</CardTitle>
              <CardDescription>Active subjects that both you and this person are currently taking</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sharedActiveCourses.length === 0 ? (
                <p className="text-sm text-black/70">No shared active subjects were found.</p>
              ) : (
                sharedActiveCourses.map((sharedCourse) => {
                  const subjectStyle = getSubjectColorStyle(sharedCourse.name);

                  return (
                    <Link
                      key={sharedCourse.id}
                      href={`/subjects/${sharedCourse.id}`}
                      className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                      style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                    >
                      <p className="truncate text-sm font-medium">{formatSubjectName(sharedCourse.name)}</p>
                      <p className="mt-1 truncate text-xs text-black/55">{sharedCourse.course_code ?? "Active subject"}</p>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DesktopAppShell>
  );
}
