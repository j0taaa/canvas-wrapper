import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Download, FileImage, FileText, Presentation } from "lucide-react-native";
import { formatSubjectName, getFileContent, getSubjectColorPalette } from "@canvas/shared";
import { WebView } from "react-native-webview";
import {
  AppScreen,
  ErrorState,
  PlaceholderBlock,
  LoadingState,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { BookmarkButton } from "../../../../src/components/bookmark-button";
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { useFile, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDueDateShort } from "../../../../src/lib/format";
import { goBackOrPush } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

const BASE64_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBase64(bytes: Uint8Array) {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const chunk = (first << 16) | (second << 8) | third;

    output += BASE64_CHARSET[(chunk >> 18) & 63];
    output += BASE64_CHARSET[(chunk >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_CHARSET[(chunk >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? BASE64_CHARSET[chunk & 63] : "=";
  }

  return output;
}

function escapeForHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPdfPreviewHtml({
  backgroundColor,
  borderColor,
  fileName,
  foregroundColor,
  mutedColor,
  pdfBase64,
}: {
  backgroundColor: string;
  borderColor: string;
  fileName: string;
  foregroundColor: string;
  mutedColor: string;
  pdfBase64: string;
}) {
  const title = escapeForHtml(fileName);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: ${backgroundColor};
        color: ${foregroundColor};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #status {
        padding: 18px 16px 8px;
        color: ${mutedColor};
        font-size: 13px;
      }
      #pages {
        padding: 0 12px 12px;
      }
      .page {
        margin-bottom: 12px;
        border: 1px solid ${borderColor};
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }
      canvas {
        display: block;
        width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div id="status">Loading preview…</div>
    <div id="pages"></div>
    <script type="module">
      import * as pdfjsLib from "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs";

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

      const status = document.getElementById("status");
      const pages = document.getElementById("pages");
      const binary = atob("${pdfBase64}");
      const data = new Uint8Array(binary.length);

      for (let index = 0; index < binary.length; index += 1) {
        data[index] = binary.charCodeAt(index);
      }

      try {
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        status.textContent = pdf.numPages === 1 ? "1 page" : pdf.numPages + " pages";
        const targetWidth = Math.max(window.innerWidth - 24, 320);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const initialViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: targetWidth / initialViewport.width });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          const wrapper = document.createElement("div");

          wrapper.className = "page";
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          wrapper.appendChild(canvas);
          pages.appendChild(wrapper);

          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (error) {
        status.textContent = "Could not load the PDF preview.";
        console.error(error);
      }
    </script>
  </body>
</html>`;
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

function getFileIcon(contentType?: string, filename?: string) {
  const normalizedType = (contentType ?? "").toLowerCase();
  const normalizedName = (filename ?? "").toLowerCase();

  if (normalizedName.endsWith(".pptx") || normalizedName.endsWith(".ppt")) {
    return Presentation;
  }
  if (normalizedName.endsWith(".pdf") || normalizedName.endsWith(".docx") || normalizedName.endsWith(".doc")) {
    return FileText;
  }
  return FileImage;
}

export default function FileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; fileId: string }>();
  const courseId = Number(params.courseId);
  const fileId = Number(params.fileId);
  const { config } = useCanvasSession();
  const { resolvedTheme, triggerSelectionHaptic } = useAppPreferences();
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      card: isDark ? "#0f172a" : "#ffffff",
      muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      primary: isDark ? "#f8fafc" : "#0f172a",
      primaryText: isDark ? "#0f172a" : "#ffffff",
    };
  }, [resolvedTheme]);

  const { data: shellData } = useCourseShell(courseId);
  const { data: fileData, error, isLoading, isFetching, refetch } = useFile(courseId, fileId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);

  const course = shellData?.course;
  const file = fileData?.file;
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  const FileIcon = useMemo(() => {
    if (!file) return FileImage;
    return getFileIcon(file["content-type"], file.filename ?? file.display_name);
  }, [file]);

  const previewable = useMemo(() => {
    if (!file) return false;
    return isPreviewableFile(file["content-type"], file.filename ?? file.display_name);
  }, [file]);

  const contentType = useMemo(() => (file?.["content-type"] ?? "").toLowerCase(), [file]);
  const isImage = contentType.startsWith("image/");
  const isPdf = contentType === "application/pdf" || (file?.filename ?? file?.display_name ?? "").toLowerCase().endsWith(".pdf");
  const showColdLoading = isLoading && !course && !file && !error;
  const showBlockingError = !!error && !course && !file;
  const showInlineRefresh = !!course && !!file && (isFetching || isLoading);
  const pdfPreviewHtml = useMemo(() => {
    if (!pdfBase64 || !file) {
      return null;
    }

    return buildPdfPreviewHtml({
      backgroundColor: colors.card,
      borderColor: colors.border,
      fileName: file.display_name ?? file.filename ?? "PDF preview",
      foregroundColor: colors.foreground,
      mutedColor: colors.mutedForeground,
      pdfBase64,
    });
  }, [colors.border, colors.card, colors.foreground, colors.mutedForeground, file, pdfBase64]);

  useEffect(() => {
    let cancelled = false;

    if (!config || !file?.id || !isPdf) {
      setPdfBase64(null);
      setPdfPreviewError(null);
      setPdfPreviewLoading(false);

      return () => {
        cancelled = true;
      };
    }

    setPdfPreviewLoading(true);
    setPdfPreviewError(null);

    void getFileContent(file.id, config)
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        setPdfBase64(encodeBase64(new Uint8Array(data)));
      })
      .catch((previewError) => {
        if (cancelled) {
          return;
        }

        setPdfBase64(null);
        setPdfPreviewError(previewError instanceof Error ? previewError.message : "Could not load the PDF preview.");
      })
      .finally(() => {
        if (!cancelled) {
          setPdfPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config, file?.id, isPdf]);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <RestorableScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.mutedForeground}
            />
          }
        >
          <View style={styles.container}>
            {showColdLoading ? <LoadingState label="Loading file..." /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            <SubjectLayoutHeader />
            
            {course && file ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      goBackOrPush(router, `/subjects/${courseId}?tab=files`);
                    }}
                    style={styles.backButton}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to files</Text>
                  </Pressable>
                  <View style={styles.actions}>
                    {course && file ? (
                      <BookmarkButton
                        bookmark={{
                          courseId,
                          href: `/subjects/${courseId}/files/${fileId}`,
                          id: `file-${courseId}-${fileId}`,
                          kind: "file",
                          subjectName: course.name,
                          title: file.display_name ?? file.filename ?? "Untitled file",
                        }}
                        borderColor={colors.border}
                        fillColor={colors.foreground}
                        mutedColor={colors.mutedForeground}
                        textColor={colors.foreground}
                      />
                    ) : null}
                    <Pressable
                      onPress={() => {
                        triggerSelectionHaptic();
                        // Download file
                      }}
                      style={[styles.iconButton, { borderColor: colors.border }]}
                    >
                      <Download size={18} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>

                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <FileIcon size={20} color={palette.color} />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={2}>
                          {file.display_name ?? file.filename ?? "Untitled file"}
                        </Text>
                        <Pressable onPress={() => goBackOrPush(router, `/subjects/${courseId}?tab=files`)}>
                          <Text style={[styles.courseLink, { color: colors.mutedForeground }]}>
                            {formatSubjectName(course.name)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.badges}>
                      <View style={[styles.badge, { borderColor: colors.border }]}>
                        <Text style={[styles.badgeText, { color: colors.foreground }]}>
                          {file["content-type"] ?? "File"}
                        </Text>
                      </View>
                      {file.updated_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            Updated {formatDueDateShort(file.updated_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Preview Card */}
                <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.previewTitle, { color: colors.foreground }]}>Preview</Text>
                  </View>
                  <View style={styles.previewContent}>
                    {!previewable ? (
                      <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                        This file type can't be previewed here.
                      </Text>
                    ) : isImage && file.url ? (
                      <Image
                        source={{ uri: file.url }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                    ) : isPdf ? (
                      pdfPreviewHtml ? (
                        <WebView
                          originWhitelist={["*"]}
                          source={{ html: pdfPreviewHtml }}
                          style={styles.pdfPreview}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        />
                      ) : pdfPreviewLoading ? (
                        <View style={styles.previewLoadingState}>
                          <ActivityIndicator size="small" color={colors.foreground} />
                          <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                            Loading PDF preview...
                          </Text>
                        </View>
                      ) : pdfPreviewError ? (
                        <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                          {pdfPreviewError}
                        </Text>
                      ) : (
                        <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                          PDF preview is not available right now.
                        </Text>
                      )
                    ) : (
                      showInlineRefresh ? (
                        <PlaceholderBlock height={140} />
                      ) : (
                        <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                          This file type can't be previewed here.
                        </Text>
                      )
                    )}
                  </View>
                </View>

                {/* File Info */}
                <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.infoTitle, { color: colors.foreground }]}>File Details</Text>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Size</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {file.size != null ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Unknown"}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Type</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {file["content-type"] ?? "Unknown"}
                    </Text>
                  </View>
                  {file.updated_at && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Updated</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>
                        {formatDueDateShort(file.updated_at)}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerTop: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  fileName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  courseLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewContent: {
    padding: 16,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  previewText: {
    fontSize: 14,
    textAlign: "center",
  },
  imagePreview: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  pdfPreview: {
    alignSelf: "stretch",
    borderRadius: 12,
    height: 560,
    overflow: "hidden",
  },
  previewLoadingState: {
    alignItems: "center",
    gap: 10,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
});
