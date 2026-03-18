import AsyncStorage from "@react-native-async-storage/async-storage";
import { BOOKMARKS_STORAGE_KEY, sortBookmarks, type BookmarkItem } from "@canvas/shared";

export async function readBookmarks() {
  const storedValue = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);

  if (!storedValue) {
    return [] as BookmarkItem[];
  }

  try {
    return sortBookmarks(JSON.parse(storedValue) as BookmarkItem[]);
  } catch {
    await AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    return [] as BookmarkItem[];
  }
}

export async function writeBookmarks(bookmarks: BookmarkItem[]) {
  await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(sortBookmarks(bookmarks)));
}

export async function toggleBookmark(bookmark: Omit<BookmarkItem, "savedAt">) {
  const bookmarks = await readBookmarks();
  const exists = bookmarks.some((item) => item.id === bookmark.id);

  if (exists) {
    await writeBookmarks(bookmarks.filter((item) => item.id !== bookmark.id));
    return false;
  }

  await writeBookmarks([
    {
      ...bookmark,
      savedAt: new Date().toISOString(),
    },
    ...bookmarks,
  ]);

  return true;
}

export async function removeBookmark(id: string) {
  await writeBookmarks((await readBookmarks()).filter((bookmark) => bookmark.id !== id));
}
