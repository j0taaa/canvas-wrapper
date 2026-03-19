import { useState } from "react";
import { RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  AppScreen,
  ErrorState,
  PlaceholderBlock,
  LoadingState,
  PrimaryButton,
  RequireCanvasConfig,
  Row,
  RowMeta,
  RowTitle,
  SectionCard,
} from "../../src/components/app-ui";
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { useConversation, useSendReply } from "../../src/hooks/use-canvas-queries";
import { formatDateTime, stripHtml } from "../../src/lib/format";

function getAuthorName(
  participants: Array<{ full_name?: string; id: number; name: string }> | undefined,
  authorId?: number,
) {
  if (authorId == null) {
    return "Canvas";
  }

  const participant = participants?.find((item) => item.id === authorId);
  return participant?.name ?? participant?.full_name ?? `Author #${authorId}`;
}

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = Number(params.conversationId);
  const [draft, setDraft] = useState("");
  const { data, error, isLoading, isFetching, refetch } = useConversation(conversationId);
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const sendReply = useSendReply();
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);

  const handleSendReply = () => {
    if (!draft.trim()) return;
    
    sendReply.mutate(
      { conversationId, body: draft },
      {
        onSuccess: () => {
          setDraft("");
        },
      }
    );
  };

  return (
    <RequireCanvasConfig>
      <AppScreen title="Conversation" subtitle={data?.subject ?? `Conversation #${conversationId}`}>
        <RestorableScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {showColdLoading ? <LoadingState label="Loading conversation..." /> : null}
          {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
          {data ? (
            <>
              <SectionCard title={data.subject ?? "No subject"}>
                <RowMeta>{data.context_name ?? "General"}</RowMeta>
                <RowMeta>{data.participants?.map((participant) => participant.name).join(", ") || "No participants listed"}</RowMeta>
              </SectionCard>

              <SectionCard title="Messages">
                {(data.messages ?? []).length === 0 && showInlineRefresh ? (
                  <>
                    <PlaceholderBlock height={108} />
                    <PlaceholderBlock height={108} />
                  </>
                ) : null}
                {(data.messages ?? []).map((message) => (
                  <Row key={message.id}>
                    <RowTitle>
                      {message.generated ? "System" : getAuthorName(data.participants, message.author_id)}
                    </RowTitle>
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
                    disabled={sendReply.isPending || draft.trim().length === 0}
                    label={sendReply.isPending ? "Sending..." : "Send reply"}
                    onPress={handleSendReply}
                  />
                </View>
              </SectionCard>
            </>
          ) : null}
        </RestorableScrollView>
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
