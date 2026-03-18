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

export function sortBookmarks(bookmarks: BookmarkItem[]) {
  return [...bookmarks].sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}
