import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { createConversation, getAppShellData, getCoursePeople } from "@canvas/shared";
import {
  AppScreen,
  ErrorState,
  LoadingState,
  PrimaryButton,
  RequireCanvasConfig,
  Row,
  RowMeta,
  RowTitle,
  SectionCard,
} from "../../src/components/app-ui";
import { useAsyncResource } from "../../src/hooks/use-async-resource";
import { useCanvasSession } from "../../src/providers/canvas-session";

export default function NewConversationScreen() {
  const router = useRouter();
  const { config } = useCanvasSession();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [groupConversation, setGroupConversation] = useState(true);
  const [sending, setSending] = useState(false);

  const loadShell = useCallback(() => getAppShellData(config!), [config]);
  const shellState = useAsyncResource(loadShell, [config], config != null);

  useEffect(() => {
    if (selectedCourseId || !shellState.data?.courses.length) {
      return;
    }

    setSelectedCourseId(shellState.data.courses[0].id);
  }, [selectedCourseId, shellState.data]);

  const loadPeople = useCallback(() => {
    if (!selectedCourseId) {
      return Promise.resolve([]);
    }

    return getCoursePeople(selectedCourseId, config!);
  }, [config, selectedCourseId]);

  const peopleState = useAsyncResource(loadPeople, [config, selectedCourseId], config != null && selectedCourseId != null);
  const selectedCourse = useMemo(
    () => shellState.data?.courses.find((course) => course.id === selectedCourseId) ?? null,
    [selectedCourseId, shellState.data?.courses],
  );

  return (
    <RequireCanvasConfig>
      <AppScreen title="New Message" subtitle="Compose a Canvas inbox conversation natively.">
        {shellState.loading ? <LoadingState label="Loading subjects..." /> : null}
        {!shellState.loading && shellState.error ? <ErrorState error={shellState.error} onRetry={shellState.reload} /> : null}
        {!shellState.loading && !shellState.error && shellState.data ? (
          <>
            <SectionCard title="Subject">
              {shellState.data.courses.map((course) => (
                <Row
                  key={course.id}
                  onPress={() => {
                    setSelectedCourseId(course.id);
                    setSelectedRecipientIds([]);
                  }}
                >
                  <RowTitle>{course.name}</RowTitle>
                  <RowMeta>{selectedCourseId === course.id ? "Selected" : "Tap to use this subject"}</RowMeta>
                </Row>
              ))}
            </SectionCard>

            <SectionCard title="Recipients">
              {peopleState.loading ? <LoadingState label="Loading people..." /> : null}
              {!peopleState.loading && peopleState.error ? <ErrorState error={peopleState.error} onRetry={peopleState.reload} /> : null}
              {!peopleState.loading && !peopleState.error
                ? peopleState.data?.map((person) => {
                    const selected = selectedRecipientIds.includes(person.id);

                    return (
                      <Row
                        key={person.id}
                        onPress={() => {
                          setSelectedRecipientIds((current) =>
                            current.includes(person.id)
                              ? current.filter((id) => id !== person.id)
                              : [...current, person.id],
                          );
                        }}
                      >
                        <RowTitle>{person.name}</RowTitle>
                        <RowMeta>{selected ? "Selected" : "Tap to add recipient"}</RowMeta>
                      </Row>
                    );
                  })
                : null}
            </SectionCard>

            <SectionCard title="Message">
              <View style={styles.form}>
                <Text style={styles.label}>Selected subject</Text>
                <Text style={styles.value}>{selectedCourse?.name ?? "No subject selected"}</Text>

                <Text style={styles.label}>Conversation subject</Text>
                <TextInput onChangeText={setSubject} placeholder="Subject line" style={styles.input} value={subject} />

                <Text style={styles.label}>Body</Text>
                <TextInput
                  multiline
                  onChangeText={setBody}
                  placeholder="Write your message"
                  style={styles.multilineInput}
                  value={body}
                />

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Group conversation</Text>
                  <Switch onValueChange={setGroupConversation} value={groupConversation} />
                </View>

                <PrimaryButton
                  disabled={sending || !selectedCourseId || selectedRecipientIds.length === 0 || !subject.trim() || !body.trim()}
                  label={sending ? "Sending..." : "Send message"}
                  onPress={() => {
                    if (!selectedCourseId) {
                      return;
                    }

                    setSending(true);

                    void createConversation(
                      {
                        body,
                        courseId: selectedCourseId,
                        groupConversation,
                        recipientIds: selectedRecipientIds,
                        subject,
                      },
                      config!,
                    )
                      .then((conversation) => {
                        if (conversation?.id) {
                          router.replace(`/inbox/${conversation.id}`);
                        } else {
                          router.replace("/(tabs)/inbox");
                        }
                      })
                      .finally(() => {
                        setSending(false);
                      });
                  }}
                />
              </View>
            </SectionCard>
          </>
        ) : null}
      </AppScreen>
    </RequireCanvasConfig>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "rgba(15,23,42,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  multilineInput: {
    backgroundColor: "#f8fafc",
    borderColor: "rgba(15,23,42,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  value: {
    color: "rgba(15,23,42,0.7)",
    fontSize: 14,
  },
});
