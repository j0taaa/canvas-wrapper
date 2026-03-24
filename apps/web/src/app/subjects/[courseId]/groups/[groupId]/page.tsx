import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LockKeyhole, UsersRound } from "lucide-react";
import { appendSubjectRouteContext, buildSubjectHref, getSubjectRouteContext, t } from "@canvas/shared";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { HistoryBackButton } from "@/components/history-back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupDetails, getGroupUsers, getSubjectShellData } from "@/lib/canvas";
import { getRequestLocale } from "@/lib/request-locale";
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
  searchParams,
}: {
  params: Promise<{ courseId: string; groupId: string }>;
  searchParams: Promise<{ peopleView?: string; tab?: string }>;
}) {
  const { courseId, groupId } = await params;
  const { peopleView, tab } = await searchParams;
  const parsedCourseId = Number(courseId);
  const parsedGroupId = Number(groupId);
  const { resolvedLocale } = await getRequestLocale();
  const originContext = getSubjectRouteContext(tab, peopleView);
  const subjectHref = buildSubjectHref(parsedCourseId, originContext ?? { peopleView: "groups", tab: "people" });

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
    <DesktopAppShell
      profile={courseShellData.profile}
      courses={courseShellData.courses}
      currentCourseId={parsedCourseId}
      contentClassName="p-4 pb-32 md:p-5 md:pb-6"
    >
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <HistoryBackButton fallbackHref={subjectHref} />
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-black/15 bg-gradient-to-br from-white via-white to-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={subjectStyle}
                >
                  {accessDenied ? <LockKeyhole className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold">{group?.name ?? t(resolvedLocale, "subjects.group")}</h1>
                  <Link href={subjectHref} className="text-sm text-black/55 transition hover:text-black hover:underline">
                    {formatSubjectName(course.name)}
                  </Link>
                </div>
              </div>
            </div>
            {group && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black">
                  {t(resolvedLocale, "subjects.members", { count: group.members_count ?? members.length })}
                </Badge>
                <Badge variant="outline" className="border-black/25 bg-white/80 text-black/70">
                  {formatGroupJoinLevel(resolvedLocale, group.join_level)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Card size="sm" className="border-black/15 bg-white/90">
          <CardHeader className="border-b border-black/10">
            <CardTitle>{accessDenied ? t(resolvedLocale, "subjects.groupLocked") : t(resolvedLocale, "subjects.people")}</CardTitle>
            <CardDescription>
              {accessDenied ? t(resolvedLocale, "subjects.noPermissionToViewGroup") : t(resolvedLocale, "subjects.peopleVisibleInGroup")}
            </CardDescription>
          </CardHeader>
          <CardContent className={accessDenied ? "" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}>
            {accessDenied ? (
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm text-black/70">
                {t(resolvedLocale, "subjects.noPermissionToViewGroup")}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-black/70">{t(resolvedLocale, "subjects.noMembersInGroup")}</p>
            ) : (
              members.map((person) => (
                <Link
                  key={person.id}
                  href={appendSubjectRouteContext(`/subjects/${parsedCourseId}/people/${person.id}`, { peopleView: "groups", tab: "people" })}
                  className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-black/30 hover:bg-black/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="border border-black/15">
                      <AvatarImage src={person.avatar_url} alt={person.name} />
                      <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{person.name}</p>
                      <p className="truncate text-xs text-black/55">{person.short_name ?? person.sortable_name ?? t(resolvedLocale, "subjects.canvasUser")}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DesktopAppShell>
  );
}
