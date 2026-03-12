import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { FileImage, FileText } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData, getFileById } from "@/lib/canvas";
import { formatDueDateShort, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

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

export default async function SubjectFilePage({
  params,
}: {
  params: Promise<{ courseId: string; fileId: string }>;
}) {
  const { courseId, fileId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedFileId = Number(fileId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedFileId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const [dashboardData, file] = await Promise.all([
    getDashboardData(apiKey),
    getFileById(parsedFileId, apiKey),
  ]);
  const allCourses = [...dashboardData.courses, ...dashboardData.pastCourses];
  const course = allCourses.find((item) => item.id === parsedCourseId);

  if (!course || !file) {
    notFound();
  }

  const previewable = isPreviewableFile(file["content-type"], file.filename ?? file.display_name);
  const subjectStyle = getSubjectColorStyle(course.name);
  const fileSrc = `/api/files/${parsedFileId}`;
  const contentType = (file["content-type"] ?? "").toLowerCase();
  const isPdf = contentType === "application/pdf" || (file.filename ?? file.display_name ?? "").toLowerCase().endsWith(".pdf");
  const isImage = contentType.startsWith("image/");

  return (
    <DesktopAppShell profile={dashboardData.profile} courses={dashboardData.courses} currentCourseId={parsedCourseId}>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <HistoryBackButton fallbackHref={`/subjects/${parsedCourseId}?tab=files`} />
          <BookmarkButton
            bookmark={{
              id: `file-${parsedCourseId}-${parsedFileId}`,
              kind: "file",
              title: file.display_name ?? file.filename ?? "Untitled file",
              href: `/subjects/${parsedCourseId}/files/${parsedFileId}`,
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
                  {isPdf ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{file.display_name ?? file.filename ?? "Untitled file"}</h1>
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
              <Badge variant="outline" className="border-black/25 bg-white/80 text-black">
                {file["content-type"] ?? "File"}
              </Badge>
              {file.updated_at && (
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  Updated {formatDueDateShort(file.updated_at)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card className="border-black/15 bg-white/90">
          <CardHeader className="border-b border-black/10">
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!previewable ? (
              <p className="text-sm text-black/70">This file type can’t be previewed here.</p>
            ) : isPdf ? (
              <iframe
                src={fileSrc}
                title={file.display_name ?? file.filename ?? "File preview"}
                className="h-[75vh] w-full rounded-xl border border-black/10"
              />
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileSrc}
                alt={file.display_name ?? file.filename ?? "File preview"}
                className="max-h-[75vh] w-full rounded-xl border border-black/10 object-contain"
              />
            ) : (
              <p className="text-sm text-black/70">This file type can’t be previewed here.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DesktopAppShell>
  );
}
