import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LockKeyhole, UsersRound } from "lucide-react";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupDetails, getGroupUsers, getSubjectShellData } from "@/lib/canvas";
import { formatGroupJoinLevel, formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function SubjectGroupPage({
  params,
}: {
  params: Promise<{ courseId: string; groupId: string }>;
}) {
  const { courseId, groupId } = await params;
  const parsedCourseId = Number(courseId);
  const parsedGroupId = Number(groupId);

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedGroupId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const courseShellData = await getSubjectShellData(parsedCourseId, apiKey);
  const course = courseShellData.course;

  if (!course) {
    notFound();
  }

  let group = null;
  let members = [] as Awaited<ReturnType<typeof getGroupUsers>>;
  let accessDenied = false;

  try {
    [group, members] = await Promise.all([
      getGroupDetails(parsedGroupId, apiKey),
      getGroupUsers(parsedGroupId, apiKey),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("(403)")) {
      accessDenied = true;
    } else {
      throw error;
    }
  }

  const subjectStyle = getSubjectColorStyle(course.name);

  return (
    <DesktopAppShell profile={courseShellData.profile} courses={courseShellData.courses} currentCourseId={parsedCourseId}>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <HistoryBackButton fallbackHref={`/subjects/${parsedCourseId}?tab=people&peopleView=groups`} />
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  {accessDenied ? <LockKeyhole className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{group?.name ?? "Group"}</h1>
                  <p className="text-sm text-black/55">{formatSubjectName(course.name)}</p>
                </div>
              </div>
            </div>
            {group && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black">
                  {group.members_count ?? members.length} members
                </Badge>
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  {formatGroupJoinLevel(group.join_level)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Card className="border-black/15 bg-white/90">
          <CardHeader className="border-b border-black/10">
            <CardTitle>{accessDenied ? "Group locked" : "Members"}</CardTitle>
            <CardDescription>
              {accessDenied ? "Canvas does not allow this account to open this group." : "People visible inside this group"}
            </CardDescription>
          </CardHeader>
          <CardContent className={accessDenied ? "" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}>
            {accessDenied ? (
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm text-black/70">
                You do not have permission to view this group. Canvas currently only allows this account to open groups you are authorized to access.
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-black/70">No members available for this group.</p>
            ) : (
              members.map((person) => (
                <div key={person.id} className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="border border-black/15">
                      <AvatarImage src={person.avatar_url} alt={person.name} />
                      <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{person.name}</p>
                      <p className="truncate text-xs text-black/55">{person.short_name ?? person.sortable_name ?? "Canvas user"}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DesktopAppShell>
  );
}
