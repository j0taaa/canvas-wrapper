import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Mail, UserRound } from "lucide-react";
import { t } from "@canvas/shared";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="border-b border-border/70">
              <CardTitle>{t(resolvedLocale, "common.account")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border/80">
                  <AvatarImage src={shellData.profile.avatar_url} alt={shellData.profile.name} />
                  <AvatarFallback>{getInitials(shellData.profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{shellData.profile.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{shellData.profile.primary_email}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    {t(resolvedLocale, "common.name")}
                  </div>
                  <p className="text-sm text-foreground">{shellData.profile.name}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {t(resolvedLocale, "common.email")}
                  </div>
                  <p className="text-sm text-foreground">
                    {shellData.profile.primary_email ?? t(resolvedLocale, "common.noEmailAvailable")}
                  </p>
                </div>
              </div>

              <ProfileActions />
            </CardContent>
          </Card>

          <ProfilePreferences courses={shellData.courses} />
        </div>
      </div>
    </DesktopAppShell>
  );
}
