import { useMemo, useState } from "react";
import { Image, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { ChevronLeft, Download, FileImage, FileText, Presentation } from "lucide-react-native";
import {
  formatSubjectName,
  getSubjectContentNavigation,
  getSubjectColorPalette,
  type CanvasClientConfig,
  type CanvasCourseFile,
  t,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  PlaceholderBlock,
  LoadingState,
  PrimaryButton,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { BookmarkButton } from "../../../../src/components/bookmark-button";
import { SubjectContentPagination } from "../../../../src/components/subject-content-pagination";
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { useCourseContent, useCourseFiles, useFile, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDueDateShort } from "../../../../src/lib/format";
import { goBackOrPush } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

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

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function getCachedFileUri(file: CanvasCourseFile) {
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!baseDirectory) {
    throw new Error("No writable file directory is available on this device.");
  }

  const name = sanitizeFilename(file.filename ?? file.display_name ?? `file-${file.id}`);
  return `${baseDirectory}canvas-file-${file.id}-${name}`;
}

function getFileMimeType(file: CanvasCourseFile) {
  const normalizedType = (file["content-type"] ?? "").toLowerCase();

  if (normalizedType) {
    return normalizedType;
  }

  const normalizedName = (file.filename ?? file.display_name ?? "").toLowerCase();

  if (normalizedName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (normalizedName.endsWith(".png")) {
    return "image/png";
  }
  if (normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalizedName.endsWith(".gif")) {
    return "image/gif";
  }
  if (normalizedName.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalizedName.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  }
  if (normalizedName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (normalizedName.endsWith(".doc")) {
    return "application/msword";
  }
  if (normalizedName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "*/*";
}

async function ensureLocalFileUri(file: CanvasCourseFile, config: CanvasClientConfig) {
  if (!file.url) {
    throw new Error("File has no downloadable URL");
  }

  const targetUri = getCachedFileUri(file);
  const existing = await FileSystem.getInfoAsync(targetUri);
  const shouldDownload = !existing.exists || !existing.size;

  if (shouldDownload) {
    if (existing.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }

    const downloadResult = await FileSystem.downloadAsync(file.url, targetUri, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (downloadResult.status < 200 || downloadResult.status >= 300) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
      throw new Error(`Could not download file (HTTP ${downloadResult.status}).`);
    }
  }

  return targetUri;
}

export default function FileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; fileId: string }>();
  const courseId = Number(params.courseId);
  const fileId = Number(params.fileId);
  const { config } = useCanvasSession();
  const { resolvedLocale, resolvedTheme, triggerSelectionHaptic } = useAppPreferences();
  const [fileActionLoading, setFileActionLoading] = useState(false);
  const [fileActionError, setFileActionError] = useState<string | null>(null);

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
  const { data: courseContent } = useCourseContent(courseId);
  const { data: courseFiles } = useCourseFiles(courseId);
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
  const navigation = useMemo(() => {
    if (!courseContent) {
      return null;
    }

    return getSubjectContentNavigation(courseId, courseContent, courseFiles ?? [], {
      identifier: fileId,
      kind: "file",
    });
  }, [courseContent, courseFiles, courseId, fileId]);

  const handleOpenFile = async () => {
    if (!file || !config) {
      return;
    }

    setFileActionLoading(true);
    setFileActionError(null);

    try {
      const localUri = await ensureLocalFileUri(file, config);

      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(localUri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: getFileMimeType(file),
        });
      } else {
        await Linking.openURL(localUri);
      }
    } catch (nextError) {
      setFileActionError(nextError instanceof Error ? nextError.message : t(resolvedLocale, "subjects.previewUnavailable"));
    } finally {
      setFileActionLoading(false);
    }
  };

  return (
    <RequireCanvasConfig>
      <AppScreen contentStyle={styles.screenContent} scroll={false}>
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
            <SubjectLayoutHeader />
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "subjects.loadingFile")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {course && file ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    accessibilityLabel={t(resolvedLocale, "subjects.backToFiles")}
                    accessibilityRole="button"
                    onPress={() => {
                      triggerSelectionHaptic();
                      goBackOrPush(router, `/subjects/${courseId}?tab=files`);
                    }}
                    style={[styles.backButton, { borderColor: colors.border }]}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
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
                          title: file.display_name ?? file.filename ?? t(resolvedLocale, "subjects.untitledFile"),
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
                        void handleOpenFile();
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
                          {file.display_name ?? file.filename ?? t(resolvedLocale, "subjects.untitledFile")}
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
                          {file["content-type"] ?? t(resolvedLocale, "subjects.files")}
                        </Text>
                      </View>
                      {file.updated_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {t(resolvedLocale, "common.updated")} {formatDueDateShort(resolvedLocale, file.updated_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Preview Card */}
                <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.previewTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.preview")}</Text>
                  </View>
                  <View style={styles.previewContent}>
                    {!previewable ? (
                      <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                        {t(resolvedLocale, "subjects.previewUnavailable")}
                      </Text>
                    ) : isImage && file.url ? (
                      <Image
                        source={{ uri: file.url }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                    ) : isPdf ? (
                      <View style={styles.previewActionState}>
                        <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                          {t(resolvedLocale, "subjects.pdfMobileDescription")}
                        </Text>
                        <PrimaryButton
                          label={fileActionLoading ? t(resolvedLocale, "subjects.openingFile") : t(resolvedLocale, "subjects.openFile")}
                          onPress={() => {
                            void handleOpenFile();
                          }}
                        />
                        {fileActionError ? (
                          <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                            {fileActionError}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      showInlineRefresh ? (
                        <PlaceholderBlock height={140} />
                      ) : (
                        <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                          {t(resolvedLocale, "subjects.previewUnavailable")}
                        </Text>
                      )
                    )}
                  </View>
                </View>

                {/* File Info */}
                <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.infoTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.fileDetails")}</Text>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.size")}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {file.size != null ? `${Math.max(1, Math.round(file.size / 1024))} KB` : t(resolvedLocale, "common.unknown")}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.type")}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {file["content-type"] ?? t(resolvedLocale, "common.unknown")}
                    </Text>
                  </View>
                  {file.updated_at && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t(resolvedLocale, "common.updated")}</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>
                        {formatDueDateShort(resolvedLocale, file.updated_at)}
                      </Text>
                    </View>
                  )}
                </View>

                <SubjectContentPagination
                  colors={colors}
                  locale={resolvedLocale}
                  next={navigation?.next ?? null}
                  previous={navigation?.previous ?? null}
                  router={router}
                />
              </>
            ) : null}
          </View>
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    padding: 0,
  },
  container: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 12,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewContent: {
    padding: 14,
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
  previewActionState: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
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
