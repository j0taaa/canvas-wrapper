import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { buildSubjectHref, getSubjectContentNavigation, getSubjectRouteContext, t } from "@canvas/shared";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { SubjectContentPagination } from "@/components/subject-content-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourseContent, getCourseFiles, getCoursePage, getSubjectShellData } from "@/lib/canvas";
import { getRequestLocale } from "@/lib/request-locale";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle, rewriteCanvasHtmlLinks } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function SubjectContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; pageId: string }>;
  searchParams: Promise<{ peopleView?: string; tab?: string }>;
}) {
  const { courseId, pageId } = await params;
  const { peopleView, tab } = await searchParams;
  const parsedCourseId = Number(courseId);
  const { resolvedLocale } = await getRequestLocale();
  const originContext = getSubjectRouteContext(tab, peopleView);
  const subjectHref = buildSubjectHref(parsedCourseId, originContext ?? { tab: "modules" });

  if (!Number.isFinite(parsedCourseId) || !pageId) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [courseShellData, page, courseContent, files] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    getCoursePage(parsedCourseId, pageId, apiKey),
    getCourseContent(parsedCourseId, apiKey),
    getCourseFiles(parsedCourseId, apiKey).catch(() => []),
  ]);
  const course = courseShellData.course;

  if (!course || !page) {
    notFound();
  }

  const subjectStyle = getSubjectColorStyle(course.name);
  const renderedBody = rewriteCanvasHtmlLinks(
    page.body || `<p>${t(resolvedLocale, "subjects.noPageContent")}</p>`,
    courseShellData.apiBase,
    parsedCourseId,
  );
  const navigation = getSubjectContentNavigation(parsedCourseId, courseContent, files, {
    identifier: pageId,
    kind: "page",
  }, originContext);

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
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <BookOpenText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{page.title ?? t(resolvedLocale, "subjects.untitledPage")}</h1>
                    <BookmarkButton
                      bookmark={{
                        id: `page-${parsedCourseId}-${pageId}`,
                        kind: "page",
                        title: page.title ?? t(resolvedLocale, "subjects.untitledPage"),
                        href: `/subjects/${parsedCourseId}/pages/${pageId}`,
                        subjectName: course.name,
                        courseId: parsedCourseId,
                      }}
                    />
                  </div>
                  <Link
                    href={subjectHref}
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
                  {t(resolvedLocale, "subjects.frontPage")}
                </Badge>
              )}
              {page.updated_at && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  {t(resolvedLocale, "common.updated")} {formatDueDateShort(resolvedLocale, page.updated_at)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card size="sm" className="border-black/15 bg-white/90">
          <CardHeader className="border-b border-black/10">
            <CardTitle>{t(resolvedLocale, "subjects.pageContent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rich-content prose prose-sm max-w-none prose-p:my-3 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          </CardContent>
        </Card>

        <SubjectContentPagination
          locale={resolvedLocale}
          next={navigation.next}
          previous={navigation.previous}
        />
      </div>
    </DesktopAppShell>
  );
}
