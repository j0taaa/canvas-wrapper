"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, FileText, ListChecks, NotebookPen, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { formatSubjectName, getSubjectColorStyle } from "@/lib/utils";
import { readBookmarks, removeBookmark, type BookmarkItem } from "@/lib/bookmarks";

const bookmarkTypeLabel: Record<BookmarkItem["kind"], string> = {
  assignment: "Assignment",
  file: "File",
  page: "Page",
  quiz: "Quiz",
};

function getBookmarkIcon(kind: BookmarkItem["kind"]) {
  if (kind === "assignment") return NotebookPen;
  if (kind === "quiz") return ListChecks;
  return FileText;
}

export default function BookmarksClient() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);

  useEffect(() => {
    const syncBookmarks = () => setBookmarks(readBookmarks());
    const syncPreferences = () => setPreferences(readSubjectPreferences());

    syncBookmarks();
    syncPreferences();
    window.addEventListener("storage", syncBookmarks);
    window.addEventListener("canvas-bookmarks-changed", syncBookmarks);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncBookmarks);
      window.removeEventListener("canvas-bookmarks-changed", syncBookmarks);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);

  return (
    <Card className="border-black/15 bg-white/90">
      <CardHeader className="border-b border-black/10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <CardTitle>Bookmarks</CardTitle>
          </div>
          <span className="text-sm font-medium text-black/45">{bookmarks.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookmarks.length === 0 && (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-black/[0.02] px-6 text-center">
            <Bookmark className="mb-3 h-5 w-5 text-black/35" />
            <p className="text-sm text-black/60">No bookmarks yet.</p>
          </div>
        )}
        {bookmarks.map((bookmark) => {
          const Icon = getBookmarkIcon(bookmark.kind);
          const subjectStyle = getSubjectColorStyle(bookmark.subjectName, preferences.colors[bookmark.courseId]);

          return (
            <div
              key={bookmark.id}
              className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 transition hover:border-black/20"
            >
              <Link href={bookmark.href} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black">{bookmark.title}</p>
                  <div className="flex items-center gap-2 text-xs text-black/55">
                    <span className="truncate">{formatSubjectName(bookmark.subjectName)}</span>
                    <span className="h-1 w-1 rounded-full bg-black/25" />
                    <span>{bookmarkTypeLabel[bookmark.kind]}</span>
                  </div>
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  removeBookmark(bookmark.id);
                  setBookmarks(readBookmarks());
                }}
                aria-label={`Remove ${bookmark.title} bookmark`}
                className="text-black/45 hover:text-black"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
