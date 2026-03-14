import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCoursePage, getSubjectShellData } from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle, rewriteCanvasHtmlLinks } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function SubjectContentPage({
  params,
}: {
  params: Promise<{ courseId: string; pageId: string }>;
}) {
  const { courseId, pageId } = await params;
  const parsedCourseId = Number(courseId);

  if (!Number.isFinite(parsedCourseId) || !pageId) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [courseShellData, page] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    getCoursePage(parsedCourseId, pageId, apiKey),
  ]);
  const course = courseShellData.course;

  if (!course || !page) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const renderedBody = rewriteCanvasHtmlLinks(
    page.body || "<p>No content available for this page.</p>",
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
              id: `page-${parsedCourseId}-${pageId}`,
              kind: "page",
              title: page.title ?? "Untitled page",
              href: `/subjects/${parsedCourseId}/pages/${pageId}`,
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
                  <BookOpenText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{page.title ?? "Untitled page"}</h1>
                  <Link
                    href={`/subjects/${parsedCourseId}`}
                    className="text-sm text-black/55 transition hover:text-black hover:underline"
                  >
                    {formatSubjectName(course.name)}
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {page.front_page && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black">
                  Front page
                </Badge>
              )}
              {page.updated_at && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  Updated {formatDueDateShort(page.updated_at)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card className="border-black/15 bg-white/90">
          <CardHeader className="border-b border-black/10">
            <CardTitle>Page content</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rich-content prose prose-sm max-w-none prose-p:my-3 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          </CardContent>
        </Card>
      </div>
    </DesktopAppShell>
  );
}
