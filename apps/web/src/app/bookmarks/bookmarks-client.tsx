"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, FileText, ListChecks, NotebookPen, Trash2 } from "lucide-react";
import { t } from "@canvas/shared";
import { useLocale } from "@/components/locale-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { formatSubjectName, getSubjectColorStyle } from "@/lib/utils";
import { readBookmarks, removeBookmark, type BookmarkItem } from "@/lib/bookmarks";

function getBookmarkIcon(kind: BookmarkItem["kind"]) {
  if (kind === "assignment") return NotebookPen;
  if (kind === "quiz") return ListChecks;
  return FileText;
}

export default function BookmarksClient() {
  const { resolvedLocale } = useLocale();
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
    <Card className="border-border/80 bg-card/95">
      <CardContent className="space-y-3">
        {bookmarks.length === 0 && (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 px-6 text-center">
            <Bookmark className="mb-3 h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t(resolvedLocale, "bookmarks.empty")}</p>
          </div>
        )}
        {bookmarks.map((bookmark) => {
          const Icon = getBookmarkIcon(bookmark.kind);
          const subjectStyle = getSubjectColorStyle(bookmark.subjectName, preferences.colors[bookmark.courseId]);

          return (
            <div
              key={bookmark.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition hover:border-foreground/15 hover:bg-muted/65"
              style={{ boxShadow: `inset 4px 0 0 ${subjectStyle.borderColor}` }}
            >
              <Link href={bookmark.href} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{bookmark.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{formatSubjectName(bookmark.subjectName)}</span>
                    <span className="h-1 w-1 rounded-full bg-foreground/25" />
                    <span>{t(resolvedLocale, `bookmarks.${bookmark.kind}`)}</span>
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
                aria-label={t(resolvedLocale, "bookmarks.removeBookmarkAria", { title: bookmark.title })}
                title={t(resolvedLocale, "bookmarks.removeBookmarkAria", { title: bookmark.title })}
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
