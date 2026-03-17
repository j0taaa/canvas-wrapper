"use client";

import { ReactNode, useMemo } from "react";
import type { CanvasDashboardData } from "@/lib/canvas";
import type { CanvasBootstrapData } from "@/lib/app-bootstrap";
import { CANVAS_BOOTSTRAP_STORAGE } from "@/lib/app-bootstrap";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import type { SidebarActiveItem } from "@/components/desktop-sidebar";

const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";

function readStoredJson<T>(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(storageKey);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function useCachedAppLoadingData() {
  const bootstrapData = useMemo(
    () => readStoredJson<CanvasBootstrapData>(CANVAS_BOOTSTRAP_STORAGE),
    [],
  );
  const dashboardData = useMemo(
    () => readStoredJson<CanvasDashboardData>(CANVAS_DASHBOARD_STORAGE),
    [],
  );

  return {
    bootstrapData,
    dashboardData,
  };
}

export function CachedAppShell({
  active,
  children,
}: {
  active?: SidebarActiveItem;
  children: ReactNode;
}) {
  const { dashboardData } = useCachedAppLoadingData();

  return (
    <DesktopAppShell active={active} profile={dashboardData?.profile} courses={dashboardData?.courses}>
      {children}
    </DesktopAppShell>
  );
}
