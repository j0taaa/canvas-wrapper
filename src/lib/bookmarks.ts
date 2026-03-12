export const BOOKMARKS_STORAGE_KEY = "canvasBookmarks";

export type BookmarkKind = "page" | "assignment" | "file" | "quiz";

export type BookmarkItem = {
  id: string;
  kind: BookmarkKind;
  title: string;
  href: string;
  subjectName: string;
  courseId: number;
  savedAt: string;
};

function sortBookmarks(bookmarks: BookmarkItem[]) {
  return [...bookmarks].sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

export function readBookmarks() {
  if (typeof window === "undefined") {
    return [] as BookmarkItem[];
  }

  const storedValue = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);

  if (!storedValue) {
    return [] as BookmarkItem[];
  }

  try {
    return sortBookmarks(JSON.parse(storedValue) as BookmarkItem[]);
  } catch {
    window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    return [] as BookmarkItem[];
  }
}

export function writeBookmarks(bookmarks: BookmarkItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(sortBookmarks(bookmarks)));
  window.dispatchEvent(new CustomEvent("canvas-bookmarks-changed"));
}

export function isBookmarked(id: string) {
  return readBookmarks().some((bookmark) => bookmark.id === id);
}

export function toggleBookmark(bookmark: Omit<BookmarkItem, "savedAt">) {
  const bookmarks = readBookmarks();
  const exists = bookmarks.some((item) => item.id === bookmark.id);

  if (exists) {
    writeBookmarks(bookmarks.filter((item) => item.id !== bookmark.id));
    return false;
  }

  writeBookmarks([
    {
      ...bookmark,
      savedAt: new Date().toISOString(),
    },
    ...bookmarks,
  ]);
  return true;
}

export function removeBookmark(id: string) {
  writeBookmarks(readBookmarks().filter((bookmark) => bookmark.id !== id));
}
