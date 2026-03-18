import { useCallback, useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Download, FileImage, FileText, Presentation } from "lucide-react-native";
import { getFileById, getSubjectShellData, formatSubjectName, getSubjectColorPalette } from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
  SectionCard,
} from "../../../../src/components/app-ui";
import { useAsyncResource } from "../../../../src/hooks/use-async-resource";
import { formatDueDateShort } from "../../../../src/lib/format";
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

export default function FileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; fileId: string }>();
  const courseId = Number(params.courseId);
  const fileId = Number(params.fileId);
  const { config } = useCanvasSession();
  const { resolvedTheme, triggerSelectionHaptic } = useAppPreferences();

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

  const loadData = useCallback(async () => {
    const [shell, file] = await Promise.all([
      getSubjectShellData(courseId, config!),
      getFileById(fileId, config!),
    ]);
    return { course: shell.course, file };
  }, [config, courseId, fileId]);

  const { data, error, loading, reload } = useAsyncResource(loadData, [config, courseId, fileId], config != null);

  const course = data?.course;
  const file = data?.file;
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

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {loading ? <LoadingState label="Loading file..." /> : null}
            {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
            
            {!loading && !error && course && file ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      router.push(`/subjects/${courseId}?tab=files`);
                    }}
                    style={styles.backButton}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to files</Text>
                  </Pressable>
                  <View style={styles.actions}>
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
                        <Pressable onPress={() => router.push(`/subjects/${courseId}`)}>
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
                    ) : (
                      <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                        {isPdf 
                          ? "PDF preview is not available in the mobile app. Please download the file to view it."
                          : "This file type can't be previewed here."
                        }
                      </Text>
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
        </ScrollView>
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
