import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { RefreshControl } from "react-native";
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
import { useRefreshControl } from "../../src/hooks/use-refresh-control";
import { RestorableScrollView } from "../../src/components/restorable-scroll-view";
import { readBookmarks, removeBookmark } from "../../src/lib/bookmarks";
import { formatDateTime } from "../../src/lib/format";
import { openAppHref } from "../../src/lib/navigation";
import { queryKeys } from "../../src/lib/query-keys";

function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks(),
    queryFn: () => readBookmarks(),
    placeholderData: (previousData) => previousData,
  });
}

export default function BookmarksTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error, isLoading, isFetching, refetch } = useBookmarks();
  const { onRefresh, refreshing } = useRefreshControl(refetch);
  const showColdLoading = isLoading && !data && !error;
  const showBlockingError = !!error && !data;
  const showInlineRefresh = !!data && (isFetching || isLoading);

  const handleRemoveBookmark = async (id: string) => {
    await removeBookmark(id);
    queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks() });
  };

  return (
    <RequireCanvasConfig>
      <AppScreen title="Bookmarks" subtitle="Saved pages, assignments, quizzes, and files.">
        <RestorableScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {showColdLoading ? <LoadingState label="Loading bookmarks..." /> : null}
          {showBlockingError ? <ErrorState error={error.message} onRetry={refetch} /> : null}
          {data ? (
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
                      void handleRemoveBookmark(bookmark.id);
                    }}
                  />
                </Row>
              ))}
            </SectionCard>
          ) : null}
        </RestorableScrollView>
      </AppScreen>
    </RequireCanvasConfig>
  );
}
