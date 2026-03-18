import { useCallback, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { addConversationMessage, getConversationData } from "@canvas/shared";
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
import { formatDateTime, stripHtml } from "../../src/lib/format";
import { useCanvasSession } from "../../src/providers/canvas-session";

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = Number(params.conversationId);
  const { config } = useCanvasSession();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const loadConversation = useCallback(() => getConversationData(conversationId, config!), [config, conversationId]);
  const { data, error, loading, reload } = useAsyncResource(loadConversation, [config, conversationId], config != null);

  return (
    <RequireCanvasConfig>
      <AppScreen title="Conversation" subtitle={data?.subject ?? `Conversation #${conversationId}`}>
        {loading ? <LoadingState label="Loading conversation..." /> : null}
        {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!loading && !error && data ? (
          <>
            <SectionCard title={data.subject ?? "No subject"}>
              <RowMeta>{data.context_name ?? "General"}</RowMeta>
              <RowMeta>{data.participants?.map((participant) => participant.name).join(", ") || "No participants listed"}</RowMeta>
            </SectionCard>

            <SectionCard title="Messages">
              {(data.messages ?? []).map((message) => (
                <Row key={message.id}>
                  <RowTitle>{message.generated ? "System" : `Author #${message.author_id ?? "?"}`}</RowTitle>
                  <RowMeta>{formatDateTime(message.created_at)}</RowMeta>
                  <RowMeta>{stripHtml(message.body) || "No message body"}</RowMeta>
                </Row>
              ))}
            </SectionCard>

            <SectionCard title="Reply">
              <View style={styles.composer}>
                <TextInput
                  multiline
                  onChangeText={setDraft}
                  placeholder="Write your reply"
                  style={styles.input}
                  value={draft}
                />
                <PrimaryButton
                  disabled={sending || draft.trim().length === 0}
                  label={sending ? "Sending..." : "Send reply"}
                  onPress={() => {
                    setSending(true);

                    void addConversationMessage(conversationId, draft, config!)
                      .then(() => {
                        setDraft("");
                        return reload();
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
  composer: {
    gap: 12,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "rgba(15,23,42,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
});
