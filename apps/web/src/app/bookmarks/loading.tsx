"use client";

import { CachedAppShell } from "@/app/cached-app-shell";
import BookmarksClient from "./bookmarks-client";

export default function BookmarksLoading() {
  return (
    <CachedAppShell active="bookmarks">
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <h1 className="text-2xl font-bold">Bookmarks</h1>
        </div>
        <BookmarksClient />
      </div>
    </CachedAppShell>
  );
}
