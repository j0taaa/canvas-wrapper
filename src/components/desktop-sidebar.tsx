"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, CalendarDays, House, Inbox, LibraryBig, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { formatSubjectName, getSubjectColorStyle } from "@/lib/utils";

const CANVAS_API_KEY_STORAGE = "canvasApiKey";
const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";

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

export function DesktopSidebar({ active, profile, courses, currentCourseId }: DesktopSidebarProps) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);

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
    localStorage.removeItem(CANVAS_DASHBOARD_STORAGE);
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="hidden border-r border-black/20 p-4 md:block">
      {profile && (
        <div className="mb-6 flex items-center gap-3 border-b border-black/20 pb-4">
          <Avatar className="border border-black/30">
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
            <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name}</p>
            <p className="truncate text-xs text-black/60">{profile.primary_email}</p>
          </div>
        </div>
      )}
      <h1 className="mb-6 text-xl font-bold">Canvas</h1>
      <nav className="space-y-2 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={
              active === item.key
                ? "block rounded-md bg-black px-3 py-2 text-white"
                : "block rounded-md border border-black/20 px-3 py-2 transition hover:border-black/40"
            }
          >
            {item.label}
          </Link>
        ))}
        {visibleCourses && visibleCourses.length > 0 && (
          <div className="mt-6 border-t border-black/20 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45">Subjects</p>
            <div className="space-y-1">
              {visibleCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/subjects/${course.id}`}
                  className={
                    currentCourseId === course.id
                      ? "block rounded-md bg-black px-3 py-2 text-white"
                      : "block rounded-md px-3 py-2 text-black/70 transition hover:bg-black/[0.03] hover:text-black"
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
          className="mt-4 text-xs text-black/45 transition hover:text-black/70"
        >
          Change API key
        </button>
      </nav>
    </aside>
  );
}

export function MobileBottomNav({ active, courses, currentCourseId }: Omit<DesktopSidebarProps, "profile">) {
  const [preferences, setPreferences] = useState(DEFAULT_SUBJECT_PREFERENCES);

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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/15 bg-white/95 backdrop-blur md:hidden">
      {visibleCourses && visibleCourses.length > 0 && (
        <div className="overflow-x-auto border-b border-black/10 px-3 py-2">
          <div className="flex min-w-max items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] text-black/45">
              <LibraryBig className="h-4 w-4" />
            </span>
            {visibleCourses.map((course) => (
              <Link
                key={course.id}
                href={`/subjects/${course.id}`}
                className={
                  currentCourseId === course.id
                    ? "flex shrink-0 items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
                    : "flex shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65"
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
                  ? "flex flex-col items-center gap-1 rounded-2xl bg-black px-2 py-2 text-[11px] font-medium text-white"
                  : "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-black/55"
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
