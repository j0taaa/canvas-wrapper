import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { getAppShellData, getCoursePeople } from "@/lib/canvas";
import { ComposeMessageForm } from "./compose-message-form";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export default async function NewInboxMessagePage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const shellData = await getAppShellData(apiKey);
  const initialCourseId = shellData.courses[0]?.id ?? null;
  const initialCoursePeople = initialCourseId ? await getCoursePeople(initialCourseId, apiKey).catch(() => []) : [];

  return (
    <DesktopAppShell active="inbox" profile={shellData.profile} courses={shellData.courses}>
      <ComposeMessageForm
        courses={shellData.courses}
        currentUserId={shellData.profile.id}
        initialCoursePeople={initialCoursePeople}
      />
    </DesktopAppShell>
  );
}
