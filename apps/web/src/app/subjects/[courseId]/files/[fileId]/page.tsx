import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Download, FileImage, FileText, Presentation } from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFileById, getFileContent, getSubjectShellData } from "@/lib/canvas";
import { generateOfficePreview, getOfficePreviewKind } from "@/lib/office-preview";
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

  const [courseShellData, file] = await Promise.all([
    getSubjectShellData(parsedCourseId, apiKey),
    getFileById(parsedFileId, apiKey),
  ]);
  const course = courseShellData.course;

  if (!course || !file) {
    notFound();
  }

  const officePreviewKind = getOfficePreviewKind(file["content-type"], file.filename ?? file.display_name);
  const previewable = isPreviewableFile(file["content-type"], file.filename ?? file.display_name) || officePreviewKind != null;
  const subjectStyle = getSubjectColorStyle(course.name);
  const fileSrc = `/api/files/${parsedFileId}`;
  const contentType = (file["content-type"] ?? "").toLowerCase();
  const isPdf = contentType === "application/pdf" || (file.filename ?? file.display_name ?? "").toLowerCase().endsWith(".pdf");
  const isImage = contentType.startsWith("image/");
  const officePreview = officePreviewKind
    ? await getFileContent(parsedFileId, apiKey)
        .then(({ contentType: resolvedContentType, data }) =>
          generateOfficePreview(data, resolvedContentType, file.filename ?? file.display_name),
        )
        .catch(() => null)
    : null;
  const PreviewIcon = officePreviewKind === "pptx" ? Presentation : isPdf || officePreviewKind === "docx" ? FileText : FileImage;

  return (
    <DesktopAppShell profile={courseShellData.profile} courses={courseShellData.courses} currentCourseId={parsedCourseId}>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <HistoryBackButton fallbackHref={`/subjects/${parsedCourseId}?tab=files`} />
          <div className="flex items-center gap-2">
            <a
              href={fileSrc}
              download={file.filename ?? file.display_name ?? `file-${parsedFileId}`}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background text-foreground transition-all outline-none select-none hover:bg-muted/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Download file"
            >
              <Download className="h-4 w-4" />
            </a>
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
        </div>
        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <PreviewIcon className="h-5 w-5" />
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
            ) : officePreview?.kind === "docx" ? (
              <div className="space-y-4">
                {officePreview.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Some complex Word formatting may not render exactly the same in this preview.
                  </div>
                )}
                <div
                  className="rich-content prose prose-sm max-w-none rounded-xl border border-black/10 bg-white p-4 dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: officePreview.html }}
                />
              </div>
            ) : officePreview?.kind === "pptx" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/70">
                  This preview shows the extracted slide text. Complex layouts, animations, and some media may still look better in the original file.
                </div>
                {officePreview.slides.length === 0 ? (
                  <p className="text-sm text-black/70">No previewable slide text was found in this presentation.</p>
                ) : (
                  <div className="space-y-3">
                    {officePreview.slides.map((slide) => (
                      <div key={slide.number} className="rounded-xl border border-black/10 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-base font-semibold">{slide.title}</p>
                          <span className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-xs text-black/55">
                            Slide {slide.number}
                          </span>
                        </div>
                        {slide.items.length > 0 ? (
                          <ul className="space-y-2 text-sm text-black/75">
                            {slide.items.map((item, index) => (
                              <li key={`${slide.number}-${index}`} className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black/40" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-black/55">No additional text found on this slide.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-black/70">This file type can’t be previewed here.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DesktopAppShell>
  );
}
