import { useMemo } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ListChecks } from "lucide-react-native";
import {
  buildSubjectHref,
  formatSubjectName,
  getSubjectRouteContext,
  getSubjectContentNavigation,
  getSubjectColorPalette,
  t,
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
import { SubjectContentPagination } from "../../../../src/components/subject-content-pagination";
import { useRefreshControl } from "../../../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../../../src/components/restorable-scroll-view";
import { SubjectLayoutHeader } from "../../../../src/components/subject-layout";
import { useCourseContent, useCourseFiles, useQuiz, useCourseShell } from "../../../../src/hooks/use-canvas-queries";
import { formatDueDateShort } from "../../../../src/lib/format";
import { goBackOrPush, openCanvasUrl } from "../../../../src/lib/navigation";
import { useAppPreferences } from "../../../../src/providers/app-preferences";
import { useCanvasSession } from "../../../../src/providers/canvas-session";

export default function QuizDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId: string; peopleView?: string; quizId: string; tab?: string }>();
  const courseId = Number(params.courseId);
  const quizId = Number(params.quizId);
  const originContext = useMemo(() => getSubjectRouteContext(params.tab, params.peopleView), [params.peopleView, params.tab]);
  const subjectHref = useMemo(() => buildSubjectHref(courseId, originContext ?? { tab: "modules" }), [courseId, originContext]);
  const { config } = useCanvasSession();
  const { resolvedLocale, resolvedTheme, triggerSelectionHaptic } = useAppPreferences();

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      foreground: isDark ? "#f8fafc" : "#0f172a",
      mutedForeground: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      card: isDark ? "#000000" : "#ffffff",
      muted: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      primary: isDark ? "#f8fafc" : "#0f172a",
      primaryText: isDark ? "#0f172a" : "#ffffff",
    };
  }, [resolvedTheme]);

  const { data: shellData } = useCourseShell(courseId);
  const { data: courseContent } = useCourseContent(courseId);
  const { data: courseFiles } = useCourseFiles(courseId);
  const { data: quizData, error, isLoading, isFetching, refetch } = useQuiz(courseId, quizId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);

  const course = shellData?.course;
  const quiz = quizData?.quiz;
  const questions = quizData?.questions ?? [];
  const showColdLoading = isLoading && !course && !quiz && !error;
  const showBlockingError = !!error && !course && !quiz;
  const showInlineRefresh = !!course && !!quiz && (isFetching || isLoading);
  const navigation = useMemo(() => {
    if (!courseContent) {
      return null;
    }

    return getSubjectContentNavigation(courseId, courseContent, courseFiles ?? [], {
      identifier: quizId,
      kind: "quiz",
    }, originContext);
  }, [courseContent, courseFiles, courseId, originContext, quizId]);
  
  const palette = useMemo(() => {
    if (!course) return { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "#3b82f6", color: "rgba(29, 78, 216, 0.95)" };
    return getSubjectColorPalette(course.name);
  }, [course]);

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
            {showColdLoading ? <LoadingState label={t(resolvedLocale, "subjects.loadingQuiz")} /> : null}
            {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
            
            {course && quiz ? (
              <>
                {/* Header Card */}
                <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.headerTop, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerContent}>
                      <View style={[styles.iconContainer, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
                        <ListChecks size={20} color={palette.color} />
                      </View>
                      <View style={styles.headerText}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.quizTitle, { color: colors.foreground }]} numberOfLines={2}>
                            {quiz.title ?? t(resolvedLocale, "subjects.untitledQuiz")}
                          </Text>
                          <BookmarkButton
                            bookmark={{
                              courseId,
                              href: `/subjects/${courseId}/quizzes/${quizId}`,
                              id: `quiz-${courseId}-${quizId}`,
                              kind: "quiz",
                              subjectName: course.name,
                              title: quiz.title ?? t(resolvedLocale, "subjects.untitledQuiz"),
                            }}
                            borderColor={colors.border}
                            fillColor={colors.foreground}
                            mutedColor={colors.mutedForeground}
                            textColor={colors.foreground}
                          />
                        </View>
                        <Pressable onPress={() => goBackOrPush(router, subjectHref)}>
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
                            {t(resolvedLocale, "subjects.questionCount", { count: quiz.question_count })}
                          </Text>
                        </View>
                      )}
                      {quiz.points_possible != null && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {t(resolvedLocale, "subjects.points", { count: quiz.points_possible })}
                          </Text>
                        </View>
                      )}
                      {quiz.due_at && (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                            {t(resolvedLocale, "common.dueLabel", { value: formatDueDateShort(resolvedLocale, quiz.due_at) })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Quiz Details Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.quizDetails")}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {quiz.description ? (
                      <RichText currentCourseId={courseId} html={quiz.description} providerUrl={config?.apiBase} />
                    ) : showInlineRefresh ? (
                      <>
                        <PlaceholderBlock height={84} />
                        <PlaceholderBlock height={132} />
                      </>
                    ) : (
                      <RichText currentCourseId={courseId} html={`<p>${t(resolvedLocale, "subjects.noQuizDescription")}</p>`} providerUrl={config?.apiBase} />
                    )}
                    {quiz.html_url && (
                      <Pressable onPress={() => void openCanvasUrl(quiz.html_url)} style={[styles.openButton, { borderColor: colors.border }]}>
                        <Text style={[styles.openButtonText, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.openInCanvas")}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Questions Card */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t(resolvedLocale, "subjects.questions")}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    {questions.length === 0 && showInlineRefresh ? (
                      <>
                        <PlaceholderBlock height={96} />
                        <PlaceholderBlock height={96} />
                      </>
                    ) : questions.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        {t(resolvedLocale, "subjects.questionsUnavailable")}
                      </Text>
                    ) : (
                      questions.map((question, index) => (
                        <View key={question.id} style={[styles.questionCard, { borderColor: colors.border, backgroundColor: colors.card, borderLeftColor: palette.borderColor }]}>
                          <View style={styles.questionHeader}>
                            <Text style={[styles.questionName, { color: colors.foreground }]} numberOfLines={1}>
                              {question.question_name ?? t(resolvedLocale, "subjects.questionLabel", { number: index + 1 })}
                            </Text>
                            {question.points_possible != null && (
                              <Text style={[styles.pointsText, { color: colors.mutedForeground }]}>
                                {t(resolvedLocale, "subjects.pointsShort", { count: question.points_possible })}
                              </Text>
                            )}
                          </View>
                          <RichText currentCourseId={courseId} html={question.question_text || `<p>${t(resolvedLocale, "subjects.noQuestionText")}</p>`} providerUrl={config?.apiBase} />
                          {question.answers && question.answers.length > 0 && (
                            <View style={styles.answersList}>
                              {question.answers.map((answer, answerIndex) => (
                                <View key={`${question.id}-${answer.id ?? answerIndex}`} style={[styles.answerOption, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                                  <Text style={[styles.answerText, { color: colors.foreground }]}>
                                    {answer.text ?? t(resolvedLocale, "subjects.optionLabel", { number: answerIndex + 1 })}
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
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 4,
  },
  quizTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    padding: 14,
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
