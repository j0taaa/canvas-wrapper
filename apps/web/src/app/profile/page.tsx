import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { t } from "@canvas/shared";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getAppShellData } from "@/lib/canvas";
import { getRequestLocale } from "@/lib/request-locale";
import { ProfileActions } from "./profile-actions";
import { ProfilePreferences } from "./profile-preferences";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const { resolvedLocale } = await getRequestLocale();
  const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

  if (!apiKey) {
    redirect("/");
  }

  const shellData = await getAppShellData(apiKey);

  return (
    <DesktopAppShell active="profile" profile={shellData.profile} courses={shellData.courses}>
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <h1 className="text-2xl font-bold">{t(resolvedLocale, "common.profile")}</h1>
        </div>

        <div className="space-y-6">
          <Card className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,247,237,0.82)_0%,rgba(255,255,255,0.96)_44%,rgba(240,249,255,0.92)_100%)] shadow-[0_26px_80px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(180deg,rgba(41,20,0,0.32)_0%,rgba(0,0,0,0.95)_54%,rgba(8,47,73,0.34)_100%)]">
            <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-200/10" />
            <div className="pointer-events-none absolute -bottom-10 left-0 h-32 w-32 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-300/10" />
            <CardContent className="relative space-y-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-foreground/75 uppercase backdrop-blur dark:border-white/12 dark:bg-white/8 dark:text-foreground/82">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t(resolvedLocale, "common.account")}
                </span>
                <ProfileActions />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="rounded-[1.75rem] border border-black/8 bg-white/72 p-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
                    <Avatar className="h-20 w-20 border border-border/80 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
                      <AvatarImage src={shellData.profile.avatar_url} alt={shellData.profile.name} />
                      <AvatarFallback>{getInitials(shellData.profile.name)}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Canvas</p>
                    <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
                      {shellData.profile.name}
                    </p>
                    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-black/8 bg-white/72 px-3 py-2 text-sm text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {shellData.profile.primary_email ?? t(resolvedLocale, "common.noEmailAvailable")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1.35rem] border border-black/8 bg-white/72 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                      {t(resolvedLocale, "common.name")}
                    </div>
                    <p className="text-sm text-foreground">{shellData.profile.name}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-black/8 bg-white/72 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {t(resolvedLocale, "common.email")}
                    </div>
                    <p className="text-sm text-foreground">
                      {shellData.profile.primary_email ?? t(resolvedLocale, "common.noEmailAvailable")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ProfilePreferences courses={shellData.courses} />
        </div>
      </div>
    </DesktopAppShell>
  );
}
