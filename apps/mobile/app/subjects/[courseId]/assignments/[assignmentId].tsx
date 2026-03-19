import * as DocumentPicker from "expo-document-picker";
import { useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, ClipboardCheck, LockKeyhole, Send, Trophy } from "lucide-react-native";
import {
  addAssignmentComment,
  getSubjectShellData,
  submitAssignment,
  uploadAssignmentSubmissionFiles,
  formatSubjectName,
  getSubjectColorPalette,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  PlaceholderBlock,
  LoadingState,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { BookmarkButton } from "../../../../src/components/bookmark-button";
import { RichText } from "../../../../src/components/rich-text";
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { useAssignment, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDueDateShort, formatDateTime } from "../../../../src/lib/format";
import { goBackOrPush } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

type SubmitMode = "online_text_entry" | "online_url" | "online_upload";

function isCompletedAssignment(workflowState?: string, excused?: boolean) {
  return excused || ["submitted", "graded", "pending_review", "complete"].includes(workflowState ?? "");
}

function formatSubmissionStatus(workflowState?: string, excused?: boolean) {
  if (excused) return "Excused";
  if (!workflowState) return "Not submitted";
  return workflowState
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSubmissionTypes(submissionTypes: string[]) {
  if (submissionTypes.length === 0) return "Not specified";
  
  const labels = submissionTypes.map((type) => {
    switch (type) {
      case "online_upload": return "File upload";
      case "online_text_entry": return "Text entry";
      case "online_url": return "Website URL";
      case "online_quiz": return "Quiz";
      case "discussion_topic": return "Discussion";
      case "media_recording": return "Media recording";
      case "student_annotation": return "Student annotation";
      case "external_tool": return "External tool";
      case "none": return "No submission";
      case "on_paper": return "On paper";
      default: return type.replace(/[_-]+/g, " ").split(" ").filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }
  });
  
  return labels.join(", ");
}

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ assignmentId: string; courseId: string }>();
  const assignmentId = Number(params.assignmentId);
  const courseId = Number(params.courseId);
  const { resolvedTheme, triggerSelectionHaptic } = useAppPreferences();
  
  const [submissionType, setSubmissionType] = useState<SubmitMode>("online_text_entry");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [submissionComment, setSubmissionComment] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [commentStatus, setCommentStatus] = useState<string | null>(null);

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
      emerald: { bg: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", text: isDark ? "#34d399" : "#059669", border: isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.2)" },
      sky: { bg: isDark ? "rgba(14,165,233,0.2)" : "rgba(14,165,233,0.1)", text: isDark ? "#38bdf8" : "#0284c7", border: isDark ? "rgba(14,165,233,0.3)" : "rgba(14,165,233,0.2)" },
      amber: { bg: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)", text: isDark ? "#fbbf24" : "#d97706", border: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.2)" },
      rose: { bg: isDark ? "rgba(244,63,94,0.2)" : "rgba(244,63,94,0.1)", text: isDark ? "#fb7185" : "#e11d48", border: isDark ? "rgba(244,63,94,0.3)" : "rgba(244,63,94,0.2)" },
    };
  }, [resolvedTheme]);

  const { data: shellData } = useCourseShell(courseId);
  const { data: assignmentData, error, isLoading, isFetching, refetch } = useAssignment(courseId, assignmentId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const { config } = useCanvasSession();

  const course = shellData?.course;
  const assignment = assignmentData;
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  const submissionTypes = useMemo(() => assignment?.submission_types ?? [], [assignment]);
  const canSubmitInApp = useMemo(() => 
    submissionTypes.includes("online_text_entry") || 
    submissionTypes.includes("online_url") || 
    submissionTypes.includes("online_upload"),
  [submissionTypes]);

  const availableTypes = useMemo(() =>
    submissionTypes.filter((type): type is SubmitMode =>
      type === "online_text_entry" || type === "online_url" || type === "online_upload"
    ),
  [submissionTypes]);

  const effectiveSubmissionType = availableTypes.includes(submissionType) ? submissionType : availableTypes[0] ?? "online_text_entry";
  const isCompleted = useMemo(() => isCompletedAssignment(assignment?.submission?.workflow_state, assignment?.submission?.excused), [assignment]);
  const submissionStatusText = useMemo(() => formatSubmissionStatus(assignment?.submission?.workflow_state, assignment?.submission?.excused), [assignment]);
  const showColdLoading = isLoading && !course && !assignment && !error;
  const showBlockingError = !!error && !course && !assignment;
  const showInlineRefresh = !!course && !!assignment && (isFetching || isLoading);

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
            {showColdLoading ? <LoadingState label="Loading assignment..." /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            <SubjectLayoutHeader />
            
            {course && assignment ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      goBackOrPush(router, `/subjects/${courseId}`);
                    }}
                    style={styles.backButton}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to subject</Text>
                  </Pressable>
                  {course && assignment ? (
                    <BookmarkButton
                      bookmark={{
                        courseId,
                        href: `/subjects/${courseId}/assignments/${assignmentId}`,
                        id: `assignment-${courseId}-${assignmentId}`,
                        kind: "assignment",
                        subjectName: course.name,
                        title: assignment.name ?? "Untitled assignment",
                      }}
                      borderColor={colors.border}
                      fillColor={colors.foreground}
                      mutedColor={colors.mutedForeground}
                      textColor={colors.foreground}
                    />
                  ) : null}
                </View>

                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <ClipboardCheck size={20} color={palette.color} />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={[styles.assignmentName, { color: colors.foreground }, isCompleted && styles.completedText]} numberOfLines={2}>
                          {assignment.name}
                        </Text>
                        <Pressable onPress={() => goBackOrPush(router, `/subjects/${courseId}`)}>
                          <Text style={[styles.courseLink, { color: colors.mutedForeground }]}>
                            {formatSubjectName(course.name)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.badges}>
                      {isCompleted && (
                        <View style={[styles.badge, { borderColor: colors.emerald.border, backgroundColor: colors.emerald.bg }]}>
                          <Text style={[styles.badgeText, { color: colors.emerald.text }]}>Done</Text>
                        </View>
                      )}
                      {assignment.points_possible != null && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {assignment.points_possible} points
                          </Text>
                        </View>
                      )}
                      {assignment.due_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            Due {formatDueDateShort(assignment.due_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Details Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Details</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {assignment.description ? (
                      <RichText currentCourseId={courseId} html={assignment.description} providerUrl={config?.apiBase} />
                    ) : showInlineRefresh ? (
                      <>
                        <PlaceholderBlock height={84} />
                        <PlaceholderBlock height={144} />
                      </>
                    ) : (
                      <RichText currentCourseId={courseId} html="<p>No assignment description available.</p>" providerUrl={config?.apiBase} />
                    )}
                    {assignment.html_url && (
                      <Pressable onPress={() => Linking.openURL(assignment.html_url!)}>
                        <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Open in Canvas</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Submission Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Submission</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {/* Status Cards */}
                    <View style={styles.statusGrid}>
                      <View style={[styles.statusCard, { borderColor: colors.sky.border, backgroundColor: colors.sky.bg }]}>
                        <View style={styles.statusCardContent}>
                          <View style={[styles.statusIcon, { backgroundColor: isDark(resolvedTheme) ? "rgba(14,165,233,0.2)" : "rgba(14,165,233,0.1)" }]}>
                            <Send size={16} color={colors.sky.text} />
                          </View>
                          <View>
                            <Text style={[styles.statusLabel, { color: colors.sky.text }]}>SUBMITTING</Text>
                            <Text style={[styles.statusValue, { color: colors.foreground }]}>{formatSubmissionTypes(submissionTypes)}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.statusCard, { borderColor: colors.amber.border, backgroundColor: colors.amber.bg }]}>
                        <View style={styles.statusCardContent}>
                          <View style={[styles.statusIcon, { backgroundColor: isDark(resolvedTheme) ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)" }]}>
                            <CalendarClock size={16} color={colors.amber.text} />
                          </View>
                          <View>
                            <Text style={[styles.statusLabel, { color: colors.amber.text }]}>AVAILABLE</Text>
                            <Text style={[styles.statusValue, { color: colors.foreground }]}>
                              {assignment.unlock_at ? formatDueDateShort(assignment.unlock_at) : "Now"}
                            </Text>
                            <Text style={[styles.statusSubtext, { color: colors.mutedForeground }]}>
                              until {assignment.lock_at ? formatDueDateShort(assignment.lock_at) : "No lock date"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.statusCard, { borderColor: colors.emerald.border, backgroundColor: colors.emerald.bg }]}>
                        <View style={styles.statusCardContent}>
                          <View style={[styles.statusIcon, { backgroundColor: isDark(resolvedTheme) ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)" }]}>
                            <Trophy size={16} color={colors.emerald.text} />
                          </View>
                          <View>
                            <Text style={[styles.statusLabel, { color: colors.emerald.text }]}>STATUS</Text>
                            <Text style={[styles.statusValueLarge, { color: colors.foreground }]}>
                              {isCompleted ? "Submitted" : submissionStatusText}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {assignment.submission?.submitted_at && (
                        <View style={[styles.statusCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                          <View>
                            <Text style={[styles.statusLabelMuted, { color: colors.mutedForeground }]}>SUBMITTED AT</Text>
                            <Text style={[styles.statusValue, { color: colors.foreground }]}>
                              {formatDueDateShort(assignment.submission.submitted_at)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {assignment.submission?.grade && (
                        <View style={[styles.statusCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                          <View>
                            <Text style={[styles.statusLabelMuted, { color: colors.mutedForeground }]}>GRADE</Text>
                            <Text style={[styles.statusValue, { color: colors.foreground }]}>{assignment.submission.grade}</Text>
                          </View>
                        </View>
                      )}

                      {assignment.allowed_attempts != null && assignment.allowed_attempts > 0 && (
                        <View style={[styles.statusCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                          <View>
                            <Text style={[styles.statusLabelMuted, { color: colors.mutedForeground }]}>ATTEMPTS ALLOWED</Text>
                            <Text style={[styles.statusValue, { color: colors.foreground }]}>{assignment.allowed_attempts}</Text>
                          </View>
                        </View>
                      )}

                      {assignment.locked_for_user && (
                        <View style={[styles.statusCard, { borderColor: colors.rose.border, backgroundColor: colors.rose.bg }]}>
                          <View style={styles.statusCardContent}>
                            <View style={[styles.statusIcon, { backgroundColor: isDark(resolvedTheme) ? "rgba(244,63,94,0.2)" : "rgba(244,63,94,0.1)" }]}>
                              <LockKeyhole size={16} color={colors.rose.text} />
                            </View>
                            <View>
                              <Text style={[styles.statusLabel, { color: colors.rose.text }]}>ACCESS</Text>
                              <Text style={[styles.statusValue, { color: colors.foreground }]}>Locked for you</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Submission Form */}
                    {canSubmitInApp ? (
                      <View style={styles.submissionForm}>
                        {availableTypes.length > 0 && (
                          <View style={styles.modeSelector}>
                            {availableTypes.map((type) => (
                              <Pressable
                                key={type}
                                onPress={() => {
                                  triggerSelectionHaptic();
                                  setSubmissionType(type);
                                }}
                                style={[
                                  styles.modeChip,
                                  { borderColor: effectiveSubmissionType === type ? colors.primary : colors.border },
                                  effectiveSubmissionType === type && { backgroundColor: colors.primary },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.modeChipText,
                                    { color: effectiveSubmissionType === type ? colors.primaryText : colors.mutedForeground },
                                  ]}
                                >
                                  {type === "online_text_entry" ? "Text entry" : type === "online_url" ? "Website URL" : "File upload"}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}

                        {effectiveSubmissionType === "online_text_entry" && (
                          <TextInput
                            multiline
                            onChangeText={setBody}
                            placeholder="Write your submission here"
                            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                            value={body}
                          />
                        )}

                        {effectiveSubmissionType === "online_url" && (
                          <TextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            onChangeText={setUrl}
                            placeholder="https://example.com"
                            style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                            value={url}
                          />
                        )}

                        {effectiveSubmissionType === "online_upload" && (
                          <View style={styles.uploadSection}>
                            <Pressable
                              onPress={() => {
                                triggerSelectionHaptic();
                                void DocumentPicker.getDocumentAsync({
                                  copyToCacheDirectory: true,
                                  multiple: true,
                                }).then((result) => {
                                  if (!result.canceled) {
                                    setSelectedFiles(result.assets);
                                  }
                                });
                              }}
                              style={[styles.uploadButton, { borderColor: colors.border }]}
                            >
                              <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
                                {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : "Choose files"}
                              </Text>
                            </Pressable>
                            {selectedFiles.map((file) => (
                              <Text key={`${file.uri}:${file.name}`} style={[styles.fileName, { color: colors.mutedForeground }]}>
                                {file.name}
                              </Text>
                            ))}
                          </View>
                        )}

                        <TextInput
                          multiline
                          onChangeText={setSubmissionComment}
                          placeholder="Optional submission comment"
                          style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                          value={submissionComment}
                        />

                        {assignment.submission?.attachments?.length ? (
                          <View style={styles.attachmentSection}>
                            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Submitted files</Text>
                            {assignment.submission.attachments.map((attachment, index) =>
                              attachment.url ? (
                                <Pressable
                                  key={`${attachment.url}-${index}`}
                                  onPress={() => Linking.openURL(attachment.url!)}
                                  style={[styles.attachmentButton, { borderColor: colors.emerald.border, backgroundColor: colors.emerald.bg }]}
                                >
                                  <Text style={[styles.attachmentButtonText, { color: colors.emerald.text }]} numberOfLines={1}>
                                    {attachment.display_name ?? attachment.filename ?? "Download file"}
                                  </Text>
                                </Pressable>
                              ) : null
                            )}
                          </View>
                        ) : null}

                        {submissionStatus && (
                          <Text style={[styles.statusMessage, { color: colors.mutedForeground }]}>{submissionStatus}</Text>
                        )}

                        <Pressable
                          disabled={
                            submitting ||
                            availableTypes.length === 0 ||
                            (effectiveSubmissionType === "online_text_entry" && body.trim().length === 0) ||
                            (effectiveSubmissionType === "online_url" && url.trim().length === 0) ||
                            (effectiveSubmissionType === "online_upload" && selectedFiles.length === 0)
                          }
                          onPress={() => {
                            setSubmitting(true);
                            setSubmissionStatus(null);

                            const run = async () => {
                              const fileIds =
                                effectiveSubmissionType === "online_upload"
                                  ? await uploadAssignmentSubmissionFiles(
                                      courseId,
                                      assignmentId,
                                      await Promise.all(
                                        selectedFiles.map(async (file) => {
                                          const response = await fetch(file.uri);
                                          return {
                                            contentType: file.mimeType,
                                            data: await response.arrayBuffer(),
                                            name: file.name,
                                            size: file.size ?? 0,
                                          };
                                        })
                                      ),
                                      config!
                                    )
                                  : undefined;

                              await submitAssignment(
                                courseId,
                                assignmentId,
                                { body, comment: submissionComment, fileIds, submissionType: effectiveSubmissionType, url },
                                config!
                              );

                              setBody("");
                              setUrl("");
                              setSubmissionComment("");
                              setSelectedFiles([]);
                              setSubmissionStatus("Submitted successfully");
                              await refetch();
                            };

                            void run()
                              .catch((err) => setSubmissionStatus(err instanceof Error ? err.message : "Could not submit assignment"))
                              .finally(() => setSubmitting(false));
                          }}
                          style={[
                            styles.submitButton,
                            { backgroundColor: colors.primary },
                            submitting && styles.submitButtonDisabled,
                          ]}
                        >
                          <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                            {submitting ? "Submitting..." : "Submit assignment"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : submissionTypes.includes("online_quiz") ? (
                      <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                        This assignment is a quiz. Quiz content can be opened from module quiz items.
                      </Text>
                    ) : (
                      <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                        This assignment type can't be submitted directly here yet.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Comments Card */}
                {(assignment.submission?.submission_comments?.length ?? 0) > 0 && (
                  <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Comments</Text>
                    </View>
                    <View style={styles.cardContent}>
                      {assignment.submission?.submission_comments?.map((comment, index) => (
                        <View key={comment.id ?? index} style={[styles.commentCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                          <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{comment.author_name ?? "Unknown author"}</Text>
                          <Text style={[styles.commentDate, { color: colors.mutedForeground }]}>{formatDateTime(comment.created_at)}</Text>
                          <Text style={[styles.commentText, { color: colors.foreground }]}>{comment.comment ?? "No comment body"}</Text>
                        </View>
                      ))}

                      <View style={styles.commentComposer}>
                        <TextInput
                          multiline
                          onChangeText={setCommentDraft}
                          placeholder="Add a comment"
                          style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
                          value={commentDraft}
                        />
                        <Pressable
                          disabled={submitting || commentDraft.trim().length === 0}
                          onPress={() => {
                            setSubmitting(true);
                            setCommentStatus(null);
                            void addAssignmentComment(courseId, assignmentId, commentDraft, config!)
                              .then(() => {
                                setCommentDraft("");
                                setCommentStatus("Comment sent successfully");
                                return refetch();
                              })
                              .catch((err) => setCommentStatus(err instanceof Error ? err.message : "Could not send comment"))
                              .finally(() => setSubmitting(false));
                          }}
                          style={[
                            styles.submitButton,
                            { backgroundColor: colors.primary },
                            (submitting || commentDraft.trim().length === 0) && styles.submitButtonDisabled,
                          ]}
                        >
                          <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                            {submitting ? "Sending..." : "Send comment"}
                          </Text>
                        </Pressable>
                        {commentStatus && <Text style={[styles.statusMessage, { color: colors.mutedForeground }]}>{commentStatus}</Text>}
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

function isDark(resolvedTheme: string) {
  return resolvedTheme === "dark";
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  navBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  assignmentName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  courseLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: "underline",
    marginTop: 12,
  },
  statusGrid: {
    gap: 10,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  statusCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  statusLabelMuted: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusValueLarge: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  submissionForm: {
    gap: 12,
  },
  modeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  uploadSection: {
    gap: 8,
  },
  uploadButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileName: {
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  attachmentSection: {
    gap: 8,
  },
  attachmentButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  submitButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusMessage: {
    fontSize: 13,
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
  },
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
  },
  commentDate: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    marginTop: 4,
  },
  commentComposer: {
    gap: 12,
    marginTop: 16,
  },
});
