import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssignmentDetails, getDashboardData } from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";
import { AssignmentSubmissionForm } from "./submission-form";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function isCompletedAssignment(workflowState?: string, excused?: boolean) {
  return excused || ["submitted", "graded", "pending_review", "complete"].includes(workflowState ?? "");
}

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
}) {
  const { courseId, assignmentId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedAssignmentId = Number(assignmentId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [dashboardData, assignment] = await Promise.all([
    getDashboardData(apiKey),
    getAssignmentDetails(parsedCourseId, parsedAssignmentId, apiKey),
  ]);
  const allCourses = [...dashboardData.courses, ...dashboardData.pastCourses];
  const course = allCourses.find((item) => item.id === parsedCourseId);

  if (!course || !assignment) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const submissionTypes = assignment.submission_types ?? [];
  const canSubmitInApp = submissionTypes.includes("online_text_entry") || submissionTypes.includes("online_url");
  const isCompleted = isCompletedAssignment(assignment.submission?.workflow_state, assignment.submission?.excused);

  return (
    <DesktopAppShell profile={dashboardData.profile} courses={dashboardData.courses} currentCourseId={parsedCourseId}>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <HistoryBackButton fallbackHref={`/subjects/${parsedCourseId}`} />
          <BookmarkButton
            bookmark={{
              id: `assignment-${parsedCourseId}-${parsedAssignmentId}`,
              kind: "assignment",
              title: assignment.name,
              href: `/subjects/${parsedCourseId}/assignments/${parsedAssignmentId}`,
              subjectName: course.name,
              courseId: parsedCourseId,
            }}
          />
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className={`truncate text-2xl font-semibold ${isCompleted ? "text-black/60 line-through" : ""}`}>
                    {assignment.name}
                  </h1>
                  <Link
                    href={`/subjects/${parsedCourseId}`}
                    className="text-sm text-black/55 transition hover:text-black hover:underline"
                  >
                    {formatSubjectName(course.name)}
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isCompleted && (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                  Done
                </Badge>
              )}
              {assignment.points_possible != null && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  {assignment.points_possible} points
                </Badge>
              )}
              {assignment.due_at && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  Due {formatDueDateShort(assignment.due_at)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="prose prose-sm max-w-none text-black prose-p:text-black/85 prose-a:text-black prose-strong:text-black"
                dangerouslySetInnerHTML={{ __html: assignment.description || "<p>No assignment description available.</p>" }}
              />
              {assignment.html_url && (
                <Link href={assignment.html_url} target="_blank" className="inline-flex text-sm text-black/60 underline-offset-4 hover:underline">
                  Open in Canvas
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm text-black/65">
                <p>Status: {assignment.submission?.workflow_state ?? "Not submitted"}</p>
                {assignment.submission?.submitted_at && <p>Submitted: {formatDueDateShort(assignment.submission.submitted_at)}</p>}
                {assignment.submission?.grade && <p>Grade: {assignment.submission.grade}</p>}
              </div>

              {canSubmitInApp ? (
                <AssignmentSubmissionForm
                  assignmentId={parsedAssignmentId}
                  courseId={parsedCourseId}
                  existingBody={assignment.submission?.body}
                  existingUrl={assignment.submission?.url}
                  submissionTypes={submissionTypes}
                />
              ) : submissionTypes.includes("online_quiz") ? (
                <p className="text-sm text-black/70">This assignment is a quiz. Quiz content can be opened from module quiz items.</p>
              ) : (
                <p className="text-sm text-black/70">This assignment type can’t be submitted directly here yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DesktopAppShell>
  );
}
