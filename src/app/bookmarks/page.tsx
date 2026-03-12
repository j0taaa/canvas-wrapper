import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import BookmarksClient from "./bookmarks-client";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { getDashboardData } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function BookmarksPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const dashboardData = await getDashboardData(apiKey);

  return (
    <DesktopAppShell active="bookmarks" profile={dashboardData.profile} courses={dashboardData.courses}>
      <div className="w-full">
        <div className="mb-6 border-b border-black/20 pb-4">
          <h1 className="text-2xl font-bold">Bookmarks</h1>
        </div>
        <BookmarksClient />
      </div>
    </DesktopAppShell>
  );
}
