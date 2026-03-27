"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bookmark, CalendarDays, House, Inbox, LibraryBig, UserRound } from "lucide-react";
import { t } from "@canvas/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/components/locale-provider";
import {
  DEFAULT_SUBJECT_PREFERENCES,
  readSubjectPreferences,
  type SubjectPreferences,
  SUBJECT_PREFERENCES_EVENT,
} from "@/lib/subject-preferences";
import { formatSubjectName, getSubjectColorStyle, orderSubjectsByPreference } from "@/lib/utils";

const CANVAS_API_KEY_STORAGE = "canvasApiKey";
const CANVAS_API_BASE_STORAGE = "canvasApiBase";
const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";
const CANVAS_BOOTSTRAP_STORAGE = "canvasBootstrapData";
const MOBILE_SUBJECT_BAR_SCROLL_STORAGE = "canvasMobileSubjectBarScrollLeft";
const LAST_DASHBOARD_ROUTE_STORAGE = "canvasLastDashboardRoute";
const DASHBOARD_SCROLL_STORAGE_PREFIX = "canvasDashboardScroll:";
const PENDING_DASHBOARD_SCROLL_RESTORE_STORAGE = "canvasPendingDashboardScrollRestore";

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
  const { resolvedLocale } = useLocale();
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
  const visibleCourses = courses
    ? orderSubjectsByPreference(
        courses.filter((course) => !preferences.hiddenCourseIds.includes(course.id)),
        preferences.orderedCourseIds,
      )
    : undefined;

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
      <div className="mb-6 flex items-center gap-3">
        <Image src="/canvas-icon.svg" alt="" width={28} height={28} className="shrink-0 rounded-lg" aria-hidden="true" />
        <h1 className="text-xl font-bold">{t(resolvedLocale, "common.canvas")}</h1>
      </div>
      <nav className="space-y-2 text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                active === item.key
                  ? "flex items-center gap-3 rounded-md bg-primary px-3 py-2 text-primary-foreground"
                  : "flex items-center gap-3 rounded-md border border-border bg-card/70 px-3 py-2 text-foreground/80 transition hover:border-foreground/15 hover:bg-muted/85 hover:text-foreground"
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(resolvedLocale, `navigation.${item.key}`)}</span>
            </Link>
          );
        })}
        {visibleCourses && visibleCourses.length > 0 && (
          <div className="mt-6 border-t border-border/80 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(resolvedLocale, "common.subjects")}
            </p>
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
          {t(resolvedLocale, "common.changeApiKey")}
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedLocale } = useLocale();
  const subjectBarRef = useRef<HTMLDivElement | null>(null);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [lastDashboardRoute, setLastDashboardRoute] = useState(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return window.sessionStorage.getItem(LAST_DASHBOARD_ROUTE_STORAGE) || "/";
  });

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
  const visibleCourses = courses
    ? orderSubjectsByPreference(
        courses.filter((course) => !preferences.hiddenCourseIds.includes(course.id)),
        preferences.orderedCourseIds,
      )
    : undefined;
  const visibleCourseKey = visibleCourses?.map((course) => course.id).join(",") ?? "";
  const isDashboardSection = pathname === "/" || pathname.startsWith("/subjects/");
  const effectiveActive: SidebarActiveItem | undefined = isDashboardSection ? "dashboard" : active;
  const currentRoute = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname;

  useEffect(() => {
    if (!isDashboardSection) {
      if (typeof window === "undefined") {
        return;
      }

      const storedRoute = window.sessionStorage.getItem(LAST_DASHBOARD_ROUTE_STORAGE) || "/";
      window.setTimeout(() => {
        setLastDashboardRoute((current) => (current === storedRoute ? current : storedRoute));
      }, 0);
      return;
    }

    const nextRoute = currentRoute;
    window.sessionStorage.setItem(LAST_DASHBOARD_ROUTE_STORAGE, nextRoute);

    window.setTimeout(() => {
      setLastDashboardRoute((current) => (current === nextRoute ? current : nextRoute));
    }, 0);
  }, [currentRoute, isDashboardSection]);

  useEffect(() => {
    if (!isDashboardSection) {
      return;
    }

    const storageKey = `${DASHBOARD_SCROLL_STORAGE_PREFIX}${currentRoute}`;
    const persistScroll = () => {
      window.sessionStorage.setItem(storageKey, String(window.scrollY));
    };

    persistScroll();
    window.addEventListener("scroll", persistScroll, { passive: true });

    return () => {
      persistScroll();
      window.removeEventListener("scroll", persistScroll);
    };
  }, [currentRoute, isDashboardSection]);

  useLayoutEffect(() => {
    if (!isDashboardSection) {
      return;
    }

    const pendingRestoreRoute = window.sessionStorage.getItem(PENDING_DASHBOARD_SCROLL_RESTORE_STORAGE);
    const savedScrollY = window.sessionStorage.getItem(`${DASHBOARD_SCROLL_STORAGE_PREFIX}${currentRoute}`);

    if (!savedScrollY) {
      if (pendingRestoreRoute === currentRoute) {
        window.sessionStorage.removeItem(PENDING_DASHBOARD_SCROLL_RESTORE_STORAGE);
      }
      return;
    }

    const parsedScrollY = Number(savedScrollY);

    if (!Number.isFinite(parsedScrollY)) {
      return;
    }

    let animationFrameId = 0;
    let nestedAnimationFrameId = 0;
    let timeoutId = 0;
    let nestedTimeoutAnimationFrameId = 0;

    const restoreScroll = () => {
      window.scrollTo({
        top: parsedScrollY,
        behavior: "auto",
      });
    };

    animationFrameId = window.requestAnimationFrame(() => {
      nestedAnimationFrameId = window.requestAnimationFrame(() => {
        restoreScroll();
      });
    });

    if (pendingRestoreRoute === currentRoute) {
      timeoutId = window.setTimeout(() => {
        nestedTimeoutAnimationFrameId = window.requestAnimationFrame(() => {
          restoreScroll();
          window.sessionStorage.removeItem(PENDING_DASHBOARD_SCROLL_RESTORE_STORAGE);
        });
      }, 120);
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(nestedAnimationFrameId);
      window.cancelAnimationFrame(nestedTimeoutAnimationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [currentRoute, isDashboardSection]);

  useLayoutEffect(() => {
    if (!preferences.showMobileSubjectBar || !subjectBarRef.current) {
      return;
    }

    const savedScrollLeft = window.sessionStorage.getItem(MOBILE_SUBJECT_BAR_SCROLL_STORAGE);

    if (!savedScrollLeft) {
      return;
    }

    const parsedScrollLeft = Number(savedScrollLeft);

    if (!Number.isFinite(parsedScrollLeft)) {
      return;
    }

    let animationFrameId = 0;
    let nestedAnimationFrameId = 0;

    animationFrameId = window.requestAnimationFrame(() => {
      nestedAnimationFrameId = window.requestAnimationFrame(() => {
        if (!subjectBarRef.current) {
          return;
        }

        subjectBarRef.current.scrollLeft = parsedScrollLeft;
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(nestedAnimationFrameId);
    };
  }, [pathname, preferences.showMobileSubjectBar, visibleCourseKey]);

  useEffect(() => {
    const subjectBar = subjectBarRef.current;

    if (!preferences.showMobileSubjectBar || !subjectBar) {
      return;
    }

    const handleScroll = () => {
      window.sessionStorage.setItem(
        MOBILE_SUBJECT_BAR_SCROLL_STORAGE,
        String(subjectBar.scrollLeft),
      );
    };

    subjectBar.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      subjectBar.removeEventListener("scroll", handleScroll);
    };
  }, [preferences.showMobileSubjectBar, visibleCourseKey]);

  const persistSubjectBarScroll = () => {
    if (!subjectBarRef.current) {
      return;
    }

    window.sessionStorage.setItem(
      MOBILE_SUBJECT_BAR_SCROLL_STORAGE,
      String(subjectBarRef.current.scrollLeft),
    );
  };

  const persistDashboardScroll = () => {
    if (!isDashboardSection) {
      return;
    }

    window.sessionStorage.setItem(
      `${DASHBOARD_SCROLL_STORAGE_PREFIX}${currentRoute}`,
      String(window.scrollY),
    );
  };

  const getMobileNavHref = (item: typeof mobileNavItems[number]) => {
    if (item.key !== "dashboard") {
      return item.href;
    }

    if (isDashboardSection) {
      return "/";
    }

    return lastDashboardRoute || "/";
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {preferences.showMobileSubjectBar && visibleCourses && visibleCourses.length > 0 && (
        <div ref={subjectBarRef} className="overflow-x-auto border-b border-border/70 px-3 py-2">
          <div className="flex min-w-max items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground">
              <LibraryBig className="h-4 w-4" />
            </span>
            {visibleCourses.map((course) => (
              <Link
                key={course.id}
                href={`/subjects/${course.id}`}
                onClick={persistSubjectBarScroll}
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
      <nav className="grid grid-cols-5 gap-1 px-2 py-1.5">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const href = getMobileNavHref(item);

          return (
            <Link
              key={item.key}
              href={href}
              scroll={item.key === "dashboard" ? false : undefined}
              onClick={() => {
                if (item.key === "dashboard" && !isDashboardSection) {
                  window.sessionStorage.setItem(PENDING_DASHBOARD_SCROLL_RESTORE_STORAGE, href);
                }

                persistDashboardScroll();
              }}
              className={
                effectiveActive === item.key
                  ? "flex flex-col items-center gap-1 rounded-2xl bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground"
                  : "flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
              }
            >
              <Icon className="h-4 w-4" />
              <span className="w-full text-center leading-tight">{t(resolvedLocale, `navigation.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
