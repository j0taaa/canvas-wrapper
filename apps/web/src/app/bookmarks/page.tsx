import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import BookmarksClient from "./bookmarks-client";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { getAppShellData } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function BookmarksPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const shellData = await getAppShellData(apiKey);

  return (
    <DesktopAppShell active="bookmarks" profile={shellData.profile} courses={shellData.courses}>
      <div className="w-full">
        <BookmarksClient />
      </div>
    </DesktopAppShell>
  );
}
