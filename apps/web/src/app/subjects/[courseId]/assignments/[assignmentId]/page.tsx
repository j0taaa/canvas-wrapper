import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, LockKeyhole, Send, Trophy } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssignmentDetails, getSubjectShellData } from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle, rewriteCanvasHtmlLinks } from "@/lib/utils";
import { AssignmentSubmissionForm } from "./submission-form";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function isCompletedAssignment(workflowState?: string, excused?: boolean) {
  return excused || ["submitted", "graded", "pending_review", "complete"].includes(workflowState ?? "");
}

function formatSubmissionStatus(workflowState?: string, excused?: boolean) {
  if (excused) {
    return "Excused";
  }

  if (!workflowState) {
    return "Not submitted";
  }

  return workflowState
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSubmissionTypes(submissionTypes: string[]) {
  if (submissionTypes.length === 0) {
    return "Not specified";
  }

  const labels = submissionTypes.map((submissionType) => {
    switch (submissionType) {
      case "online_upload":
        return "File upload";
      case "online_text_entry":
        return "Text entry";
      case "online_url":
        return "Website URL";
      case "online_quiz":
        return "Quiz";
      case "discussion_topic":
        return "Discussion";
      case "media_recording":
        return "Media recording";
      case "student_annotation":
        return "Student annotation";
      case "external_tool":
        return "External tool";
      case "none":
        return "No submission";
      case "on_paper":
        return "On paper";
      default:
        return submissionType
          .replace(/[_-]+/g, " ")
          .split(" ")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
    }
  });

  return labels.join(", ");
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

  const [courseShellData, assignment] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    getAssignmentDetails(parsedCourseId, parsedAssignmentId, apiKey),
  ]);
  const course = courseShellData.course;

  if (!course || !assignment) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const submissionTypes = assignment.submission_types ?? [];
  const canSubmitInApp =
    submissionTypes.includes("online_text_entry") ||
    submissionTypes.includes("online_url") ||
    submissionTypes.includes("online_upload");
  const isCompleted = isCompletedAssignment(assignment.submission?.workflow_state, assignment.submission?.excused);
  const submissionStatus = formatSubmissionStatus(assignment.submission?.workflow_state, assignment.submission?.excused);
  const renderedDescription = rewriteCanvasHtmlLinks(
    assignment.description || "<p>No assignment description available.</p>",
    courseShellData.apiBase,
    parsedCourseId,
  );

  return (
    <DesktopAppShell profile={courseShellData.profile} courses={courseShellData.courses} currentCourseId={parsedCourseId}>
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

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="rich-content prose prose-sm max-w-none prose-p:my-3 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderedDescription }}
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
              <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
                <div className="grid gap-3 text-sm text-black/70 sm:grid-cols-2">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-sky-100 p-2 text-sky-700">
                        <Send className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700/75">Submitting</p>
                        <p className="mt-1 font-medium text-sky-950">{formatSubmissionTypes(submissionTypes)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-700/75">Available</p>
                        <p className="mt-1 font-medium text-amber-950">
                          {assignment.unlock_at ? formatDueDateShort(assignment.unlock_at) : "Now"}
                        </p>
                        <p className="mt-1 text-xs text-amber-900/65">
                          until {assignment.lock_at ? formatDueDateShort(assignment.lock_at) : "No lock date"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-700">
                        <Trophy className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/75">Status</p>
                        <p className="mt-1 text-xl font-semibold text-emerald-950">{isCompleted ? "Submitted" : submissionStatus}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-black/45">Submitted at</p>
                    <p className="mt-1 font-medium text-black/85">
                      {assignment.submission?.submitted_at ? formatDueDateShort(assignment.submission.submitted_at) : "Not submitted yet"}
                    </p>
                  </div>
                  {assignment.submission?.grade && (
                    <div className="rounded-xl border border-black/10 bg-white/80 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-black/45">Grade</p>
                      <p className="mt-1 font-medium text-black/85">{assignment.submission.grade}</p>
                    </div>
                  )}
                  {assignment.allowed_attempts != null && assignment.allowed_attempts > 0 && (
                    <div className="rounded-xl border border-black/10 bg-white/80 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-black/45">Attempts allowed</p>
                      <p className="mt-1 font-medium text-black/85">{assignment.allowed_attempts}</p>
                    </div>
                  )}
                  {assignment.locked_for_user && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-lg bg-rose-100 p-2 text-rose-700">
                          <LockKeyhole className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-rose-700/75">Access</p>
                          <p className="mt-1 font-medium text-rose-950">Locked for you</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {canSubmitInApp ? (
                <AssignmentSubmissionForm
                  assignmentId={parsedAssignmentId}
                  courseId={parsedCourseId}
                  existingBody={assignment.submission?.body}
                  existingUrl={assignment.submission?.url}
                  existingAttachments={assignment.submission?.attachments}
                  existingComments={assignment.submission?.submission_comments}
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
