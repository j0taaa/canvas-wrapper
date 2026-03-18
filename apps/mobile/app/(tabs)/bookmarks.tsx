import { useCallback } from "react";
import { useRouter } from "expo-router";
import { formatSubjectName } from "@canvas/shared";
import {
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  RequireCanvasConfig,
  Row,
  RowMeta,
  RowTitle,
  SecondaryButton,
  SectionCard,
} from "../../src/components/app-ui";
import { useAsyncResource } from "../../src/hooks/use-async-resource";
import { readBookmarks, removeBookmark } from "../../src/lib/bookmarks";
import { formatDateTime } from "../../src/lib/format";
import { openAppHref } from "../../src/lib/navigation";

export default function BookmarksTab() {
  const router = useRouter();
  const loadBookmarks = useCallback(() => readBookmarks(), []);
  const { data, error, loading, reload } = useAsyncResource(loadBookmarks, [], true);

  return (
    <RequireCanvasConfig>
      <AppScreen title="Bookmarks" subtitle="Saved pages, assignments, quizzes, and files.">
        {loading ? <LoadingState label="Loading bookmarks..." /> : null}
        {!loading && error ? <ErrorState error={error} onRetry={reload} /> : null}
        {!loading && !error && data ? (
          <SectionCard title="Saved items">
            {data.length === 0 ? <EmptyState label="Save items from detail screens and they will show up here." /> : null}
            {data.map((bookmark) => (
              <Row
                key={bookmark.id}
                onPress={() => {
                  void openAppHref(router, bookmark.href);
                }}
              >
                <RowTitle>{bookmark.title}</RowTitle>
                <RowMeta>{formatSubjectName(bookmark.subjectName)}</RowMeta>
                <RowMeta>{bookmark.kind}</RowMeta>
                <RowMeta>{formatDateTime(bookmark.savedAt)}</RowMeta>
                <SecondaryButton
                  label="Remove"
                  onPress={() => {
                    void removeBookmark(bookmark.id).then(reload);
                  }}
                />
              </Row>
            ))}
          </SectionCard>
        ) : null}
      </AppScreen>
    </RequireCanvasConfig>
  );
}
