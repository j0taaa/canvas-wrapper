import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react-native";
import type { BookmarkItem } from "@canvas/shared";
import { readBookmarks, toggleBookmark } from "../lib/bookmarks";
import { queryKeys } from "../lib/query-keys";
import { useAppPreferences } from "../providers/app-preferences";

export function BookmarkButton({
  bookmark,
  borderColor,
  fillColor,
  mutedColor,
  textColor,
}: {
  bookmark: Omit<BookmarkItem, "savedAt">;
  borderColor: string;
  fillColor: string;
  mutedColor: string;
  textColor: string;
}) {
  const queryClient = useQueryClient();
  const { triggerSelectionHaptic } = useAppPreferences();
  const { data } = useQuery({
    queryKey: queryKeys.bookmarks(),
    queryFn: () => readBookmarks(),
    placeholderData: (previousData) => previousData,
  });

  const saved = useMemo(
    () => (data ?? []).some((item) => item.id === bookmark.id),
    [bookmark.id, data],
  );

  return (
    <Pressable
      accessibilityLabel={saved ? `Remove bookmark: ${bookmark.title}` : `Bookmark: ${bookmark.title}`}
      accessibilityRole="button"
      onPress={() => {
        triggerSelectionHaptic();
        void toggleBookmark(bookmark).finally(() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks() });
        });
      }}
      style={({ pressed }) => [
        styles.button,
        { borderColor },
        pressed && styles.pressed,
      ]}
    >
      <Bookmark
        color={saved ? textColor : mutedColor}
        fill={saved ? fillColor : "transparent"}
        size={18}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pressed: {
    opacity: 0.84,
  },
});
