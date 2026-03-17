"use client";

import { Mail, UserRound } from "lucide-react";
import { CachedAppShell, useCachedAppLoadingData } from "@/app/cached-app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilePreferences } from "./profile-preferences";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfileLoading() {
  const { dashboardData } = useCachedAppLoadingData();
  const profile = dashboardData?.profile;
  const courses = dashboardData?.courses ?? [];

  return (
    <CachedAppShell active="profile">
      <div className="w-full">
        <div className="mb-6 border-b border-border/80 pb-4">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border/80">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.name ?? "Profile"} />
                  <AvatarFallback>{getInitials(profile?.name ?? "PR")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{profile?.name ?? "Loading profile"}</p>
                  <p className="truncate text-sm text-muted-foreground">{profile?.primary_email ?? "Loading email"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    Name
                  </div>
                  <p className="text-sm text-foreground">{profile?.name ?? "Loading"}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="text-sm text-foreground">{profile?.primary_email ?? "Loading"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Configurations</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ProfilePreferences courses={courses} />
            </CardContent>
          </Card>
        </div>
      </div>
    </CachedAppShell>
  );
}
