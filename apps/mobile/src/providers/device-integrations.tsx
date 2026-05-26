import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityReminderOffset } from "@canvas/shared";
import { readDeviceIntegrationState } from "../lib/device-integration-state";
import { registerDeviceIntegrationBackgroundTask, unregisterDeviceIntegrationBackgroundTask } from "../lib/device-integration-background";
import { clearManagedDeviceIntegrations, syncDeviceIntegrations } from "../lib/device-integration-sync";
import { useAppPreferences } from "./app-preferences";
import { useCanvasSession } from "./canvas-session";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type DeviceIntegrationsValue = {
  calendarPermissionStatus: string | null;
  lastSyncAt: string | null;
  notificationPermissionStatus: string | null;
  setCalendarSyncEnabled: (enabled: boolean) => Promise<boolean>;
  setReminderOffsets: (offsets: ActivityReminderOffset[]) => Promise<boolean>;
  syncError: string | null;
  syncNow: () => Promise<void>;
  syncing: boolean;
};

const DeviceIntegrationsContext = createContext<DeviceIntegrationsValue | null>(null);

export function DeviceIntegrationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { config, ready: sessionReady } = useCanvasSession();
  const {
    deviceIntegrationPreferences,
    ready: preferencesReady,
    updateDeviceIntegrationPreferences,
  } = useAppPreferences();
  const [calendarPermissionStatus, setCalendarPermissionStatus] = useState<string | null>(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const lastHandledResponseId = useRef<string | null>(null);

  const refreshLocalStatus = useCallback(async () => {
    const [calendarPermissions, notificationPermissions, integrationState] = await Promise.all([
      Calendar.getCalendarPermissionsAsync().catch(() => null),
      Notifications.getPermissionsAsync().catch(() => null),
      readDeviceIntegrationState(),
    ]);

    setCalendarPermissionStatus(calendarPermissions?.status ?? null);
    setNotificationPermissionStatus(notificationPermissions?.status ?? null);
    setLastSyncAt(integrationState.lastSuccessfulSyncAt);
  }, []);

  const syncNow = useCallback(async () => {
    if (!config) {
      await clearManagedDeviceIntegrations();
      await refreshLocalStatus();
      return;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncDeviceIntegrations({
        config,
        preferences: deviceIntegrationPreferences,
        queryClient,
        reason: "manual",
      });

      setCalendarPermissionStatus(result.calendarPermissionStatus);
      setNotificationPermissionStatus(result.notificationPermissionStatus);
      setLastSyncAt(result.lastSuccessfulSyncAt);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not sync activities");
      await refreshLocalStatus();
    } finally {
      setSyncing(false);
    }
  }, [config, deviceIntegrationPreferences, queryClient, refreshLocalStatus]);

  const handleCalendarSyncEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const response = await Calendar.requestCalendarPermissionsAsync().catch(() => null);
      setCalendarPermissionStatus(response?.status ?? null);

      if (!response?.granted) {
        return false;
      }
    }

    await updateDeviceIntegrationPreferences({
      ...deviceIntegrationPreferences,
      calendarSyncEnabled: enabled,
    });
    return true;
  }, [deviceIntegrationPreferences, updateDeviceIntegrationPreferences]);

  const handleReminderOffsets = useCallback(async (offsets: ActivityReminderOffset[]) => {
    if (offsets.length > 0) {
      const response = await Notifications.requestPermissionsAsync().catch(() => null);
      setNotificationPermissionStatus(response?.status ?? null);

      if (!response?.granted) {
        return false;
      }
    }

    await updateDeviceIntegrationPreferences({
      ...deviceIntegrationPreferences,
      activityReminderOffsets: Array.from(new Set(offsets)),
    });
    return true;
  }, [deviceIntegrationPreferences, updateDeviceIntegrationPreferences]);

  useEffect(() => {
    void refreshLocalStatus();
  }, [refreshLocalStatus]);

  useEffect(() => {
    if (!preferencesReady || !sessionReady) {
      return;
    }

    if (
      !deviceIntegrationPreferences.calendarSyncEnabled &&
      deviceIntegrationPreferences.activityReminderOffsets.length === 0
    ) {
      void unregisterDeviceIntegrationBackgroundTask();
    } else {
      void registerDeviceIntegrationBackgroundTask();
    }

    if (!config) {
      void clearManagedDeviceIntegrations().finally(() => {
        void refreshLocalStatus();
      });
      return;
    }

    void syncNow();
  }, [
    config,
    deviceIntegrationPreferences.activityReminderOffsets,
    deviceIntegrationPreferences.calendarSyncEnabled,
    preferencesReady,
    refreshLocalStatus,
    sessionReady,
    syncNow,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState !== "active") {
        return;
      }

      void refreshLocalStatus();

      if (config) {
        void syncNow();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [config, refreshLocalStatus, syncNow]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handleNotificationHref = (href?: string | null, responseId?: string | null) => {
      if (!href || (responseId && lastHandledResponseId.current === responseId)) {
        return;
      }

      lastHandledResponseId.current = responseId ?? href;

      if (href.startsWith("/")) {
        router.push(href);
      }
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const href = typeof response?.notification.request.content.data?.href === "string"
        ? response.notification.request.content.data.href
        : null;
      handleNotificationHref(href, response?.notification.request.identifier ?? null);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const href = typeof response.notification.request.content.data?.href === "string"
        ? response.notification.request.content.data.href
        : null;
      handleNotificationHref(href, response.notification.request.identifier);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const value = useMemo<DeviceIntegrationsValue>(() => ({
    calendarPermissionStatus,
    lastSyncAt,
    notificationPermissionStatus,
    setCalendarSyncEnabled: handleCalendarSyncEnabled,
    setReminderOffsets: handleReminderOffsets,
    syncError,
    syncNow,
    syncing,
  }), [
    calendarPermissionStatus,
    handleCalendarSyncEnabled,
    handleReminderOffsets,
    lastSyncAt,
    notificationPermissionStatus,
    syncError,
    syncNow,
    syncing,
  ]);

  return <DeviceIntegrationsContext.Provider value={value}>{children}</DeviceIntegrationsContext.Provider>;
}

export function useDeviceIntegrations() {
  const context = useContext(DeviceIntegrationsContext);

  if (!context) {
    throw new Error("useDeviceIntegrations must be used within DeviceIntegrationProvider");
  }

  return context;
}
