import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActivityReminderOffset, SyncableDueActivity } from "@canvas/shared";

export const DEVICE_INTEGRATION_STATE_STORAGE_KEY = "canvasDeviceIntegrationState:v1";

export type ResolvedCalendarBinding = {
  calendarId: string;
  title?: string | null;
};

export type ManagedCalendarEventRecord = {
  calendarEventId: string;
  calendarId: string;
};

export type ManagedNotificationRecord = Partial<Record<ActivityReminderOffset, string>>;

export type ManagedActivityRecord = {
  calendar?: ManagedCalendarEventRecord;
  href: string;
  kind: SyncableDueActivity["kind"];
  notifications: ManagedNotificationRecord;
  title: string;
};

export type DeviceIntegrationState = {
  accountSignature: string | null;
  activities: Record<string, ManagedActivityRecord>;
  lastSuccessfulSyncAt: string | null;
  resolvedCalendar: ResolvedCalendarBinding | null;
  schemaVersion: 1;
};

export const DEFAULT_DEVICE_INTEGRATION_STATE: DeviceIntegrationState = {
  accountSignature: null,
  activities: {},
  lastSuccessfulSyncAt: null,
  resolvedCalendar: null,
  schemaVersion: 1,
};

export async function readDeviceIntegrationState() {
  const value = await AsyncStorage.getItem(DEVICE_INTEGRATION_STATE_STORAGE_KEY);

  if (!value) {
    return DEFAULT_DEVICE_INTEGRATION_STATE;
  }

  try {
    const parsed = JSON.parse(value) as Partial<DeviceIntegrationState>;

    return {
      accountSignature: typeof parsed.accountSignature === "string" ? parsed.accountSignature : null,
      activities: parsed.activities && typeof parsed.activities === "object" ? parsed.activities : {},
      lastSuccessfulSyncAt: typeof parsed.lastSuccessfulSyncAt === "string" ? parsed.lastSuccessfulSyncAt : null,
      resolvedCalendar:
        parsed.resolvedCalendar && typeof parsed.resolvedCalendar === "object" && typeof parsed.resolvedCalendar.calendarId === "string"
          ? {
              calendarId: parsed.resolvedCalendar.calendarId,
              title: typeof parsed.resolvedCalendar.title === "string" ? parsed.resolvedCalendar.title : null,
            }
          : null,
      schemaVersion: 1,
    } satisfies DeviceIntegrationState;
  } catch {
    return DEFAULT_DEVICE_INTEGRATION_STATE;
  }
}

export async function writeDeviceIntegrationState(state: DeviceIntegrationState) {
  await AsyncStorage.setItem(DEVICE_INTEGRATION_STATE_STORAGE_KEY, JSON.stringify(state));
}

export async function clearDeviceIntegrationState() {
  await AsyncStorage.removeItem(DEVICE_INTEGRATION_STATE_STORAGE_KEY);
}
