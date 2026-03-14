"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, CalendarDays, House, Inbox, LibraryBig, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  type SubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_STORAGE = "canvasApiKey";
const CANVAS_API_BASE_STORAGE = "canvasApiBase";
const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";
const CANVAS_BOOTSTRAP_STORAGE = "canvasBootstrapData";

type SidebarProfile = {
  name: string;
  primary_email?: string;
  avatar_url?: string;
};

type SidebarCourse = {
  id: number;
  name: string;
};

export type SidebarActiveItem = "dashboard" | "calendar" | "inbox" | "bookmarks" | "profile";

type DesktopSidebarProps = {
  active?: SidebarActiveItem;
  profile?: SidebarProfile;
  courses?: SidebarCourse[];
  currentCourseId?: number;
  initialPreferences?: SubjectPreferences;
};

const navItems: Array<{
  href: string;
  key: SidebarActiveItem;
  label: string;
  icon: typeof House;
}> = [
  { href: "/", key: "dashboard", label: "Dashboard", icon: House },
  { href: "/calendar", key: "calendar", label: "Calendar", icon: CalendarDays },
  { href: "/inbox", key: "inbox", label: "Inbox", icon: Inbox },
  { href: "/bookmarks", key: "bookmarks", label: "Bookmarks", icon: Bookmark },
];

const mobileNavItems = [...navItems, { href: "/profile", key: "profile" as const, label: "Profile", icon: UserRound }];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DesktopSidebar({
  active,
  profile,
  courses,
  currentCourseId,
  initialPreferences = DEFAULT_SUBJECT_PREFERENCES,
}: DesktopSidebarProps) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readSubjectPreferences());

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);
  const visibleCourses = courses?.filter((course) => !preferences.hiddenCourseIds.includes(course.id));

  const clearKey = async () => {
    await fetch("/api/dashboard", { method: "DELETE" });
    localStorage.removeItem(CANVAS_API_KEY_STORAGE);
    localStorage.removeItem(CANVAS_API_BASE_STORAGE);
    localStorage.removeItem(CANVAS_DASHBOARD_STORAGE);
    localStorage.removeItem(CANVAS_BOOTSTRAP_STORAGE);
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="hidden border-r border-border/80 bg-background/90 p-4 md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto">
      {profile && (
        <Link
          href="/profile"
          className="mb-6 flex items-center gap-3 border-b border-border/80 pb-4 transition hover:opacity-80"
        >
          <Avatar className="border border-border/80">
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
            <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.primary_email}</p>
          </div>
        </Link>
      )}
      <h1 className="mb-6 text-xl font-bold">Canvas</h1>
      <nav className="space-y-2 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={
              active === item.key
                ? "block rounded-md bg-primary px-3 py-2 text-primary-foreground"
                : "block rounded-md border border-border bg-card/70 px-3 py-2 text-foreground/80 transition hover:border-foreground/15 hover:bg-muted/85 hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        ))}
        {visibleCourses && visibleCourses.length > 0 && (
          <div className="mt-6 border-t border-border/80 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subjects</p>
            <div className="space-y-1">
              {visibleCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/subjects/${course.id}`}
                  className={
                    currentCourseId === course.id
                      ? "block rounded-md bg-primary px-3 py-2 text-primary-foreground"
                      : "block rounded-md px-3 py-2 text-foreground/75 transition hover:bg-muted/85 hover:text-foreground"
                  }
                  title={formatSubjectName(course.name)}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: getSubjectColorStyle(course.name, preferences.colors[course.id]).borderColor }}
                    />
                    <span className="block truncate">{formatSubjectName(course.name)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={clearKey}
          className="mt-4 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Change API key
        </button>
      </nav>
    </aside>
  );
}

export function MobileBottomNav({
  active,
  courses,
  currentCourseId,
  initialPreferences = DEFAULT_SUBJECT_PREFERENCES,
}: Omit<DesktopSidebarProps, "profile">) {
  const [preferences, setPreferences] = useState(initialPreferences);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readSubjectPreferences());

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(SUBJECT_PREFERENCES_EVENT, syncPreferences);
    };
  }, []);
  const visibleCourses = courses?.filter((course) => !preferences.hiddenCourseIds.includes(course.id));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur md:hidden">
      {preferences.showMobileSubjectBar && visibleCourses && visibleCourses.length > 0 && (
        <div className="overflow-x-auto border-b border-border/70 px-3 py-2">
          <div className="flex min-w-max items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground">
              <LibraryBig className="h-4 w-4" />
            </span>
            {visibleCourses.map((course) => (
              <Link
                key={course.id}
                href={`/subjects/${course.id}`}
                className={
                  currentCourseId === course.id
                    ? "flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    : "flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground/75"
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getSubjectColorStyle(course.name, preferences.colors[course.id]).borderColor }}
                />
                <span>{formatSubjectName(course.name)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="grid grid-cols-5 gap-1 px-2 py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                active === item.key
                  ? "flex flex-col items-center gap-1 rounded-2xl bg-primary px-2 py-2 text-[11px] font-medium text-primary-foreground"
                  : "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-muted-foreground"
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
