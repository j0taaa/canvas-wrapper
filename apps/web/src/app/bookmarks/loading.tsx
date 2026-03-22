"use client";

import { CachedAppShell } from "@/app/cached-app-shell";
import BookmarksClient from "./bookmarks-client";

export default function BookmarksLoading() {
  return (
    <CachedAppShell active="bookmarks">
      <div className="w-full">
        <BookmarksClient />
      </div>
    </CachedAppShell>
  );
}
