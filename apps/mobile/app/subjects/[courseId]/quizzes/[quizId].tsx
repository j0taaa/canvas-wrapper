import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ListChecks } from "lucide-react-native";
import {
  getQuizDetails,
  getQuizQuestions,
  getSubjectShellData,
  formatSubjectName,
  getSubjectColorPalette,
} from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
} from "../../../../src/components/app-ui";
import { RichText } from "../../../../src/components/rich-text";
import { useAsyncResource } from "../../../../src/hooks/use-async-resource";
import { formatDueDateShort } from "../../../../src/lib/format";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

export default function QuizDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; quizId: string }>();
  const courseId = Number(params.courseId);
  const quizId = Number(params.quizId);
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
    };
  }, [resolvedTheme]);

  const loadData = useCallback(async () => {
    const [shell, quiz, questions] = await Promise.all([
      getSubjectShellData(courseId, config!),
      getQuizDetails(courseId, quizId, config!),
      getQuizQuestions(courseId, quizId, config!).catch(() => []),
    ]);
    return { course: shell.course, quiz, questions };
  }, [config, courseId, quizId]);

  const { data, error, loading, reload } = useAsyncResource(loadData, [config, courseId, quizId], config != null);

  const course = data?.course;
  const quiz = data?.quiz;
  const questions = data?.questions ?? [];
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {loading ? <LoadingState label="Loading quiz..." /> : null}
            {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
            
            {!loading && !error && course && quiz ? (
              <>
                {/* Navigation Bar */}
                <View style={styles.navBar}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      router.push(`/subjects/${courseId}`);
                    }}
                    style={styles.backButton}
                  >
                    <ChevronLeft size={20} color={colors.foreground} />
                    <Text style={[styles.backText, { color: colors.foreground }]}>Back to subject</Text>
                  </Pressable>
                </View>

                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <ListChecks size={20} color={palette.color} />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={[styles.quizTitle, { color: colors.foreground }]} numberOfLines={2}>
                          {quiz.title ?? "Untitled quiz"}
                        </Text>
                        <Pressable onPress={() => router.push(`/subjects/${courseId}`)}>
                          <Text style={[styles.courseLink, { color: colors.mutedForeground }]}>
                            {formatSubjectName(course.name)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.badges}>
                      {quiz.question_count != null && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {quiz.question_count} questions
                          </Text>
                        </View>
                      )}
                      {quiz.points_possible != null && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {quiz.points_possible} points
                          </Text>
                        </View>
                      )}
                      {quiz.due_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            Due {formatDueDateShort(quiz.due_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Quiz Details Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Quiz details</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <RichText currentCourseId={courseId} html={quiz.description || "<p>No quiz description available.</p>"} providerUrl={config?.apiBase} />
                    {quiz.html_url && (
                      <Pressable onPress={() => {}} style={[styles.openButton, { borderColor: colors.border }]}>
                        <Text style={[styles.openButtonText, { color: colors.foreground }]}>Open in Canvas</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Questions Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Questions</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {questions.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        Questions are not available for this quiz through the API.
                      </Text>
                    ) : (
                      questions.map((question, index) => (
                        <View key={question.id} style={[styles.questionCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}>
                          <View style={styles.questionHeader}>
                            <Text style={[styles.questionName, { color: colors.foreground }]} numberOfLines={1}>
                              {question.question_name ?? `Question ${index + 1}`}
                            </Text>
                            {question.points_possible != null && (
                              <Text style={[styles.pointsText, { color: colors.mutedForeground }]}>
                                {question.points_possible} pts
                              </Text>
                            )}
                          </View>
                          <RichText currentCourseId={courseId} html={question.question_text || "<p>No question text available.</p>"} providerUrl={config?.apiBase} />
                          {question.answers && question.answers.length > 0 && (
                            <View style={styles.answersList}>
                              {question.answers.map((answer, answerIndex) => (
                                <View key={`${question.id}-${answer.id ?? answerIndex}`} style={[styles.answerOption, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                                  <Text style={[styles.answerText, { color: colors.foreground }]}>
                                    {answer.text ?? `Option ${answerIndex + 1}`}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))
                    )}
                  </View>
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
  quizTitle: {
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
    gap: 12,
  },
  openButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  questionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  questionName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  pointsText: {
    fontSize: 12,
  },
  answersList: {
    gap: 8,
    marginTop: 12,
  },
  answerOption: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  answerText: {
    fontSize: 13,
  },
});
