"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBookmarked, toggleBookmark, type BookmarkItem } from "@/lib/bookmarks";

type BookmarkButtonProps = {
  bookmark: Omit<BookmarkItem, "savedAt">;
};

export function BookmarkButton({ bookmark }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(() => isBookmarked(bookmark.id));

  useEffect(() => {
    const syncSavedState = () => setSaved(isBookmarked(bookmark.id));

    window.addEventListener("storage", syncSavedState);
    window.addEventListener("canvas-bookmarks-changed", syncSavedState);

    return () => {
      window.removeEventListener("storage", syncSavedState);
      window.removeEventListener("canvas-bookmarks-changed", syncSavedState);
    };
  }, [bookmark.id]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setSaved(toggleBookmark(bookmark))}
      className="border-black/15 bg-white/80 text-black/65 hover:bg-black/[0.03] hover:text-black"
    >
      <Bookmark className={saved ? "fill-current" : ""} />
      {saved ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}
