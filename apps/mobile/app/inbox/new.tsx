import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, MailPlus, Search, SendHorizontal, UsersRound, X } from "lucide-react-native";
import { formatSubjectName, getSubjectColorPalette } from "@canvas/shared";
import { createConversation } from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  PlaceholderBlock,
  PrimaryButton,
  RequireCanvasConfig,
  SectionCard,
} from "../../src/components/app-ui";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useAppShell, useCoursePeople } from "../../src/hooks/use-canvas-queries";
import { goBackOrPush } from "../../src/lib/navigation";
import { useAppPreferences } from "../../src/providers/app-preferences";
import { useCanvasSession } from "../../src/providers/canvas-session";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function NewConversationScreen() {
  const router = useRouter();
  const { config } = useCanvasSession();
  const { resolvedTheme, subjectPreferences, triggerSelectionHaptic } = useAppPreferences();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendIndividualMessages, setSendIndividualMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const colors = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      accent: isDark ? "#f8fafc" : "#0f172a",
      accentText: isDark ? "#0f172a" : "#ffffff",
      backgroundMuted: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
      border: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      card: isDark ? "#000000" : "#ffffff",
      danger: isDark ? "#fca5a5" : "#b91c1c",
      foreground: isDark ? "#f8fafc" : "#0f172a",
      input: isDark ? "#000000" : "#ffffff",
      muted: isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.48)",
      selected: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    };
  }, [resolvedTheme]);

  const {
    data: shellData,
    error: shellError,
    isLoading: shellLoading,
    isFetching: shellFetching,
    refetch: shellRefetch,
  } = useAppShell();
  const {
    data: peopleData,
    error: peopleError,
    isLoading: peopleLoading,
    isFetching: peopleFetching,
    refetch: peopleRefetch,
  } = useCoursePeople(selectedCourseId ?? 0, selectedCourseId !== null);
  const { onRefresh, refreshing } = useRefreshControl(async () => {
    await shellRefetch();
    if (selectedCourseId) {
      await peopleRefetch();
    }
  });

  useEffect(() => {
    if (selectedCourseId || !shellData?.courses.length) {
      return;
    }

    setSelectedCourseId(shellData.courses[0].id);
  }, [selectedCourseId, shellData]);

  const currentUserId = shellData?.profile.id ?? null;
  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    const courses = shellData?.courses ?? [];

    if (!query) {
      return courses;
    }

    return courses.filter((course) =>
      [course.name, course.course_code].filter(Boolean).join(" ").toLowerCase().includes(query),
    );
  }, [courseSearch, shellData?.courses]);

  const selectedCourse = useMemo(
    () => shellData?.courses.find((course) => course.id === selectedCourseId) ?? null,
    [selectedCourseId, shellData?.courses],
  );

  const availablePeople = useMemo(() => {
    const people = peopleData ?? [];
    if (currentUserId == null) {
      return people;
    }
    return people.filter((person) => person.id !== currentUserId);
  }, [currentUserId, peopleData]);

  const filteredPeople = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();

    if (!query) {
      return availablePeople;
    }

    return availablePeople.filter((person) =>
      [person.name, person.short_name, person.sortable_name].filter(Boolean).join(" ").toLowerCase().includes(query),
    );
  }, [availablePeople, recipientSearch]);

  const selectedRecipients = useMemo(
    () => availablePeople.filter((person) => selectedRecipientIds.includes(person.id)),
    [availablePeople, selectedRecipientIds],
  );

  const canSend = Boolean(selectedCourseId && selectedRecipientIds.length > 0 && subject.trim() && body.trim());
  const showShellError = !!shellError && !shellData;
  const showPeopleError = !!peopleError && !peopleData;

  const handleSend = () => {
    if (!selectedCourseId || !canSend) {
      setSubmitError("Choose a subject, select at least one recipient, add a title, and write a message first.");
      return;
    }

    setSending(true);
    setSubmitError("");

    void createConversation(
      {
        body,
        courseId: selectedCourseId,
        groupConversation: !sendIndividualMessages,
        recipientIds: selectedRecipientIds,
        subject,
      },
      config!,
    )
      .then((conversation) => {
        if (conversation?.id) {
          router.replace(`/inbox/${conversation.id}`);
          return;
        }

        router.replace("/inbox");
      })
      .catch((error) => {
        setSubmitError(error instanceof Error ? error.message : "Unable to send message.");
      })
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <RequireCanvasConfig>
      <AppScreen scroll={false}>
        <RestorableScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {!shellData && shellLoading ? <LoadingState label="Loading compose screen..." /> : null}
          {showShellError ? <ErrorState error={shellError.message} onRetry={shellRefetch} /> : null}

          {shellData ? (
            <View style={styles.container}>
              <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
                <Pressable
                  onPress={() => {
                    triggerSelectionHaptic();
                    goBackOrPush(router, "/inbox");
                  }}
                  style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <ArrowLeft size={16} color={colors.foreground} />
                </Pressable>
                <View style={styles.pageHeaderText}>
                  <Text style={[styles.pageTitle, { color: colors.foreground }]}>New message</Text>
                  <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
                    Start a Canvas conversation without leaving the app.
                  </Text>
                </View>
              </View>

              <SectionCard title="Send to">
                <View style={[styles.searchField, { borderColor: colors.border, backgroundColor: colors.input }]}>
                  <Search size={16} color={colors.muted} />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setCourseSearch}
                    placeholder="Search subjects"
                    placeholderTextColor={colors.muted}
                    style={[styles.searchInput, { color: colors.foreground }]}
                    value={courseSearch}
                  />
                </View>

                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={styles.selectorViewport}
                  contentContainerStyle={styles.selectorScrollContent}
                >
                  <View style={styles.courseGrid}>
                    {filteredCourses.map((course) => {
                      const palette = getSubjectColorPalette(course.name, subjectPreferences.colors[course.id]);
                      const selected = course.id === selectedCourseId;

                      return (
                        <Pressable
                          key={course.id}
                          onPress={() => {
                            triggerSelectionHaptic();
                            setSelectedCourseId(course.id);
                            setSelectedRecipientIds([]);
                            setRecipientSearch("");
                            setSubmitError("");
                          }}
                          style={[
                            styles.courseCard,
                            {
                              backgroundColor: selected ? colors.selected : colors.card,
                              borderColor: selected ? colors.foreground : colors.border,
                            },
                          ]}
                        >
                          <View style={styles.courseCardRow}>
                            <View style={[styles.courseDot, { backgroundColor: palette.borderColor }]} />
                            <View style={styles.courseCardText}>
                              <Text style={[styles.courseName, { color: colors.foreground }]} numberOfLines={2}>
                                {formatSubjectName(course.name)}
                              </Text>
                              <Text style={[styles.courseCode, { color: colors.muted }]} numberOfLines={2}>
                                {course.course_code ?? course.name}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {filteredCourses.length === 0 ? (
                  <Text style={[styles.helperText, { color: colors.muted }]}>No subjects matched your search.</Text>
                ) : null}
              </SectionCard>

              <SectionCard title="Recipients">
                <View style={[styles.searchField, { borderColor: colors.border, backgroundColor: colors.input }]}>
                  <Search size={16} color={colors.muted} />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!!selectedCourseId && !peopleLoading}
                    onChangeText={setRecipientSearch}
                    placeholder={selectedCourse ? "Search people in this subject" : "Choose a subject first"}
                    placeholderTextColor={colors.muted}
                    style={[styles.searchInput, { color: colors.foreground }]}
                    value={recipientSearch}
                  />
                </View>

                {selectedRecipients.length > 0 ? (
                  <View style={styles.selectedRecipients}>
                    {selectedRecipients.map((person) => (
                      <Pressable
                        key={person.id}
                        onPress={() => {
                          triggerSelectionHaptic();
                          setSelectedRecipientIds((current) => current.filter((recipientId) => recipientId !== person.id));
                        }}
                        style={[styles.recipientChip, { borderColor: colors.border, backgroundColor: colors.card }]}
                      >
                        <View style={[styles.recipientAvatar, { borderColor: colors.border, backgroundColor: colors.backgroundMuted }]}>
                          <Text style={[styles.recipientAvatarText, { color: colors.muted }]}>{getInitials(person.name)}</Text>
                        </View>
                        <Text style={[styles.recipientChipText, { color: colors.foreground }]} numberOfLines={1}>
                          {person.name}
                        </Text>
                        <X size={14} color={colors.muted} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {showPeopleError ? <ErrorState error={peopleError.message} onRetry={peopleRefetch} /> : null}

                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={styles.selectorViewport}
                  contentContainerStyle={styles.selectorScrollContent}
                >
                  <View style={styles.peopleList}>
                    {selectedCourseId && !peopleData && peopleLoading ? (
                      <>
                        <PlaceholderBlock height={76} />
                        <PlaceholderBlock height={76} />
                      </>
                    ) : null}

                    {!showPeopleError &&
                      filteredPeople.map((person) => {
                        const selected = selectedRecipientIds.includes(person.id);

                        return (
                          <Pressable
                            key={person.id}
                            onPress={() => {
                              triggerSelectionHaptic();
                              setSelectedRecipientIds((current) =>
                                current.includes(person.id)
                                  ? current.filter((recipientId) => recipientId !== person.id)
                                  : [...current, person.id],
                              );
                            }}
                            style={[
                              styles.personRow,
                              {
                                backgroundColor: selected ? colors.selected : colors.card,
                                borderColor: selected ? colors.foreground : colors.border,
                              },
                            ]}
                          >
                            <View style={[styles.personAvatar, { borderColor: colors.border, backgroundColor: colors.backgroundMuted }]}>
                              <Text style={[styles.personAvatarText, { color: colors.muted }]}>{getInitials(person.name)}</Text>
                            </View>
                            <View style={styles.personText}>
                              <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>
                                {person.name}
                              </Text>
                              <Text style={[styles.personMeta, { color: colors.muted }]} numberOfLines={1}>
                                {person.short_name ?? person.sortable_name ?? "Canvas user"}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.personSelection,
                                {
                                  backgroundColor: selected ? colors.accent : "transparent",
                                  borderColor: selected ? colors.accent : colors.border,
                                },
                              ]}
                            />
                          </Pressable>
                        );
                      })}

                    {!peopleLoading && selectedCourseId && filteredPeople.length === 0 && !showPeopleError ? (
                      <Text style={[styles.helperText, { color: colors.muted }]}>
                        {availablePeople.length === 0 ? "No people are available for this subject." : "No recipients matched your search."}
                      </Text>
                    ) : null}
                  </View>
                </ScrollView>
              </SectionCard>

              <SectionCard title="Delivery">
                <View style={styles.deliveryRow}>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      setSendIndividualMessages(false);
                    }}
                    style={[
                      styles.deliveryChip,
                      {
                        backgroundColor: !sendIndividualMessages ? colors.accent : colors.card,
                        borderColor: !sendIndividualMessages ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.deliveryChipText, { color: !sendIndividualMessages ? colors.accentText : colors.muted }]}>
                      Shared thread
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      triggerSelectionHaptic();
                      setSendIndividualMessages(true);
                    }}
                    style={[
                      styles.deliveryChip,
                      {
                        backgroundColor: sendIndividualMessages ? colors.accent : colors.card,
                        borderColor: sendIndividualMessages ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.deliveryChipText, { color: sendIndividualMessages ? colors.accentText : colors.muted }]}>
                      Separate private messages
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.deliveryHelperRow}>
                  <UsersRound size={16} color={colors.muted} />
                  <Text style={[styles.helperText, { color: colors.muted }]}>
                    {sendIndividualMessages
                      ? "Canvas sends one private copy to each selected person."
                      : "Everyone receives the same shared conversation thread."}
                  </Text>
                </View>
              </SectionCard>

              <SectionCard title="Message">
                <View style={styles.messageSection}>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Subject</Text>
                    <TextInput
                      maxLength={255}
                      onChangeText={setSubject}
                      placeholder="Message subject"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                      value={subject}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Message</Text>
                    <TextInput
                      multiline
                      onChangeText={setBody}
                      placeholder="Write your message"
                      placeholderTextColor={colors.muted}
                      style={[styles.multilineInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                      textAlignVertical="top"
                      value={body}
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard title="Current selection">
                <View style={styles.summaryBlock}>
                  <View style={styles.summaryRow}>
                    <MailPlus size={16} color={colors.muted} />
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      {selectedCourse ? formatSubjectName(selectedCourse.name) : "No subject selected"}
                    </Text>
                  </View>
                  <Text style={[styles.helperText, { color: colors.muted }]}>
                    {selectedCourse?.course_code ?? "Choose a subject to target the message."}
                  </Text>
                  <Text style={[styles.helperText, { color: colors.muted }]}>
                    {selectedRecipientIds.length === 0
                      ? "No recipients selected yet."
                      : `${selectedRecipientIds.length} recipient${selectedRecipientIds.length === 1 ? "" : "s"} selected`}
                  </Text>
                </View>
              </SectionCard>

              {submitError ? (
                <View style={[styles.errorCard, { borderColor: colors.danger, backgroundColor: `${colors.danger}14` }]}>
                  <Text style={[styles.errorCardText, { color: colors.danger }]}>{submitError}</Text>
                </View>
              ) : null}

              <PrimaryButton
                disabled={!canSend || sending}
                label={sending ? "Sending..." : "Send message"}
                onPress={handleSend}
              />
            </View>
          ) : null}
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  container: {
    gap: 16,
  },
  courseCard: {
    borderRadius: 16,
    borderWidth: 1,
    minWidth: "48%",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  courseCardRow: {
    flexDirection: "row",
    gap: 10,
  },
  courseCardText: {
    flex: 1,
  },
  courseCode: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  courseDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  courseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  courseName: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  deliveryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deliveryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  deliveryHelperRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  deliveryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  errorCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorCardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageSection: {
    gap: 16,
  },
  multilineInput: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 180,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pageHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 14,
  },
  pageHeaderText: {
    flex: 1,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  peopleList: {
    gap: 10,
  },
  personAvatar: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  personAvatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  personMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  personName: {
    fontSize: 14,
    fontWeight: "600",
  },
  personRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  personSelection: {
    borderRadius: 999,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  personText: {
    flex: 1,
  },
  recipientAvatar: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  recipientAvatarText: {
    fontSize: 10,
    fontWeight: "600",
  },
  recipientChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recipientChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 136,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchField: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  selectedRecipients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectorScrollContent: {
    flexGrow: 1,
  },
  selectorViewport: {
    maxHeight: 240,
  },
  summaryBlock: {
    gap: 8,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
