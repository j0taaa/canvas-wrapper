import { ReactNode } from "react";
import { DesktopSidebar, MobileBottomNav, SidebarActiveItem } from "./desktop-sidebar";

type DesktopAppShellProps = {
  active?: SidebarActiveItem;
  children: ReactNode;
  profile?: {
    name: string;
    primary_email?: string;
    avatar_url?: string;
  };
  courses?: {
    id: number;
    name: string;
  }[];
  currentCourseId?: number;
};

export function DesktopAppShell({ active, children, profile, courses, currentCourseId }: DesktopAppShellProps) {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="grid min-h-screen w-full md:grid-cols-[200px_minmax(0,1fr)]">
        <DesktopSidebar active={active} profile={profile} courses={courses} currentCourseId={currentCourseId} />
        <main className="min-w-0 p-6 pb-32 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav active={active} courses={courses} currentCourseId={currentCourseId} />
    </div>
  );
}
