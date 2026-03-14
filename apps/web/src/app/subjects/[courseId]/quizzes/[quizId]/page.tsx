import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuizDetails, getQuizQuestions, getSubjectShellData } from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle, rewriteCanvasHtmlLinks } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const { courseId, quizId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedQuizId = Number(quizId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedQuizId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [courseShellData, quizResult, questionsResult] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    getQuizDetails(parsedCourseId, parsedQuizId, apiKey),
    getQuizQuestions(parsedCourseId, parsedQuizId, apiKey).catch(() => []),
  ]);
  const course = courseShellData.course;

  if (!course || !quizResult) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const renderedDescription = rewriteCanvasHtmlLinks(
    quizResult.description || "<p>No quiz description available.</p>",
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
              id: `quiz-${parsedCourseId}-${parsedQuizId}`,
              kind: "quiz",
              title: quizResult.title ?? "Untitled quiz",
              href: `/subjects/${parsedCourseId}/quizzes/${parsedQuizId}`,
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
                  <ListChecks className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{quizResult.title ?? "Untitled quiz"}</h1>
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
              {quizResult.question_count != null && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  {quizResult.question_count} questions
                </Badge>
              )}
              {quizResult.points_possible != null && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  {quizResult.points_possible} points
                </Badge>
              )}
              {quizResult.due_at && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  Due {formatDueDateShort(quizResult.due_at)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Quiz details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="rich-content prose prose-sm max-w-none prose-p:my-3 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderedDescription }}
              />
              {quizResult.html_url && (
                <Link href={quizResult.html_url} target="_blank" className="inline-flex text-sm text-black/60 underline-offset-4 hover:underline">
                  Open in Canvas
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-black/15 bg-white/90">
            <CardHeader className="border-b border-black/10">
              <CardTitle>Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionsResult.length === 0 && (
                <p className="text-sm text-black/70">Questions are not available for this quiz through the API.</p>
              )}
              {questionsResult.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-black/10 bg-white p-4"
                  style={{ boxShadow: `inset 3px 0 0 ${subjectStyle.borderColor}` }}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{question.question_name ?? `Question ${index + 1}`}</p>
                    {question.points_possible != null && (
                      <span className="text-xs text-black/55">{question.points_possible} pts</span>
                    )}
                  </div>
                  <div
                    className="rich-content prose prose-sm max-w-none prose-p:my-0 dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: rewriteCanvasHtmlLinks(
                        question.question_text || "<p>No question text available.</p>",
                        courseShellData.apiBase,
                        parsedCourseId,
                      ),
                    }}
                  />
                  {question.answers && question.answers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {question.answers.map((answer, answerIndex) => (
                        <div key={`${question.id}-${answer.id ?? answerIndex}`} className="rounded-lg border border-black/8 bg-black/[0.02] px-3 py-2 text-sm text-black/75">
                          {answer.text ?? `Option ${answerIndex + 1}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DesktopAppShell>
  );
}
