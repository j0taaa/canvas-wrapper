import { Platform } from "react-native";
import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import type { QueryClient } from "@tanstack/react-query";
import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  type NotificationPermissionsStatus,
} from "expo-notifications";
import {
  DISPLAY_TIME_ZONE,
  buildSyncableDueActivities,
  formatSubjectName,
  getAppShellData,
  getCourseGradeData,
  getCourseQuizzes,
  type ActivityReminderOffset,
  type CanvasClientConfig,
  type CanvasCourseGradeData,
  type CanvasQuiz,
  type DeviceIntegrationPreferences,
  type SyncableDueActivity,
} from "@canvas/shared";
import { readDeviceIntegrationPreferences } from "./preferences";
import {
  clearDeviceIntegrationState,
  readDeviceIntegrationState,
  writeDeviceIntegrationState,
  type DeviceIntegrationState,
  type ManagedActivityRecord,
  type ResolvedCalendarBinding,
} from "./device-integration-state";
import { queryKeys } from "./query-keys";

const CALENDAR_EVENT_DURATION_MS = 30 * 60 * 1000;
const LOOKAHEAD_DAYS = 180;
const LOOKBACK_DAYS = 7;
const NOTIFICATION_CHANNEL_ID = "activity-reminders";
const MANAGED_EVENT_MARKER = "Janvas";
const FETCH_CONCURRENCY = 4;

let inFlightSync: Promise<DeviceIntegrationSyncResult> | null = null;

export type DeviceIntegrationSyncResult = {
  calendarPermissionStatus: string | null;
  lastSuccessfulSyncAt: string | null;
  notificationPermissionStatus: string | null;
  syncedActivityCount: number;
};

function createAccountSignature(config: CanvasClientConfig) {
  return `${config.apiBase ?? ""}::${config.apiKey}`;
}

function isWithinManagedWindow(dueAt: string) {
  const date = new Date(dueAt);
  const now = Date.now();
  const start = now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const end = now + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
  return Number.isFinite(date.getTime()) && date.getTime() >= start && date.getTime() <= end;
}

function buildNotificationBody(activity: SyncableDueActivity, offset: ActivityReminderOffset) {
  const dueDateLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(activity.dueAt));

  if (offset === "day-7am") {
    return `${activity.subjectName} • Due today at ${dueDateLabel}`;
  }

  if (offset === "3h") {
    return `${activity.subjectName} • Due in 3 hours`;
  }

  return `${activity.subjectName} • Due in 1 hour`;
}

function getNotificationTriggerDate(activity: SyncableDueActivity, offset: ActivityReminderOffset) {
  const dueDate = new Date(activity.dueAt);

  if (!Number.isFinite(dueDate.getTime())) {
    return null;
  }

  const triggerDate = new Date(dueDate);

  if (offset === "day-7am") {
    triggerDate.setHours(7, 0, 0, 0);
  } else if (offset === "3h") {
    triggerDate.setTime(triggerDate.getTime() - 3 * 60 * 60 * 1000);
  } else {
    triggerDate.setTime(triggerDate.getTime() - 60 * 60 * 1000);
  }

  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  return triggerDate;
}

function buildManagedNotificationId(activity: SyncableDueActivity, offset: ActivityReminderOffset) {
  return `canvas-wrapper:${activity.syncKey}:${offset}`;
}

function buildCalendarEventNotes(activity: SyncableDueActivity) {
  return [
    MANAGED_EVENT_MARKER,
    `Subject: ${activity.subjectName}`,
    `Type: ${activity.kind === "assignment" ? "Assignment" : "Quiz"}`,
    `Route: ${activity.href}`,
    activity.htmlUrl ? `Canvas: ${activity.htmlUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function ensureNotificationChannelAsync() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    importance: AndroidImportance.HIGH,
    lightColor: "#111827",
    name: "Activity reminders",
  });
}

async function resolveWritableCalendarAsync() {
  if (Platform.OS === "ios") {
    try {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      if (defaultCalendar?.allowsModifications) {
        return {
          calendarId: defaultCalendar.id,
          title: defaultCalendar.title,
        } satisfies ResolvedCalendarBinding;
      }
    } catch {
      // Fall through to generic resolution.
    }
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writableCalendar =
    calendars.find((calendar) => calendar.allowsModifications && calendar.isPrimary) ??
    calendars.find((calendar) => calendar.allowsModifications);

  if (!writableCalendar) {
    throw new Error("No writable calendar is available on this device");
  }

  return {
    calendarId: writableCalendar.id,
    title: writableCalendar.title,
  } satisfies ResolvedCalendarBinding;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: Array<R | null> = new Array(items.length).fill(null);
  let index = 0;

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
      while (index < items.length) {
        const currentIndex = index;
        index += 1;
        results[currentIndex] = await mapper(items[currentIndex] as T);
      }
    }),
  );

  return results.filter((value): value is R => value != null);
}

async function collectUpcomingDueActivities(config: CanvasClientConfig, queryClient?: QueryClient) {
  const appShell =
    queryClient?.getQueryData<Awaited<ReturnType<typeof getAppShellData>>>(queryKeys.userProfile()) ??
    (await getAppShellData(config));

  const courses = appShell.courses.filter((course) => course.name);

  const results = await mapWithConcurrency(courses, FETCH_CONCURRENCY, async (course) => {
    const cachedGrades = queryClient?.getQueryData<CanvasCourseGradeData>(queryKeys.courseGrades(course.id));
    const grades = cachedGrades ?? (await getCourseGradeData(course.id, config).catch(() => ({ assignments: [], enrollment: null })));

    if (!cachedGrades && queryClient) {
      queryClient.setQueryData(queryKeys.courseGrades(course.id), grades);
    }

    const quizzes = await getCourseQuizzes(course.id, config).catch(() => [] as CanvasQuiz[]);

    return {
      assignments: grades.assignments,
      course,
      quizzes,
    };
  });

  const assignments = results.flatMap(({ assignments, course }) =>
    assignments
      .filter((assignment) => assignment.due_at && isWithinManagedWindow(assignment.due_at))
      .map((assignment) => ({
        assignment,
        courseId: course.id,
        subjectName: formatSubjectName(course.name),
      })),
  );

  const completionByAssignmentKey = new Map(
    assignments.map((item) => [`${item.courseId}:${item.assignment.id}`, Boolean(item.assignment.submission?.excused) ||
      ["submitted", "graded", "pending_review", "complete"].includes(item.assignment.submission?.workflow_state ?? "")]),
  );

  const quizzes = results.flatMap(({ course, quizzes: courseQuizzes }) =>
    courseQuizzes
      .filter((quiz) => quiz.due_at && isWithinManagedWindow(quiz.due_at))
      .map((quiz) => ({
        completed:
          typeof quiz.assignment_id === "number"
            ? completionByAssignmentKey.get(`${course.id}:${quiz.assignment_id}`) ?? false
            : false,
        courseId: course.id,
        quiz,
        subjectName: formatSubjectName(course.name),
      })),
  );

  return buildSyncableDueActivities({
    assignments,
    quizzes,
  }).filter((activity) => !activity.completed);
}

async function deleteManagedEvent(activityRecord: ManagedActivityRecord | undefined) {
  if (!activityRecord?.calendar?.calendarEventId) {
    return;
  }

  try {
    await Calendar.deleteEventAsync(activityRecord.calendar.calendarEventId);
  } catch {
    // Ignore missing or inaccessible event cleanup failures.
  }
}

async function cancelManagedNotifications(activityRecord: ManagedActivityRecord | undefined) {
  if (!activityRecord) {
    return;
  }

  await Promise.all(
    Object.values(activityRecord.notifications).map(async (identifier) => {
      if (!identifier) {
        return;
      }

      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch {
        // Ignore already-removed notifications.
      }
    }),
  );
}

async function syncCalendarEvents(options: {
  desiredActivities: SyncableDueActivity[];
  previousState: DeviceIntegrationState;
  resolvedCalendar: ResolvedCalendarBinding;
}) {
  const nextCalendarRecords = new Map<string, ManagedActivityRecord["calendar"]>();

  for (const activity of options.desiredActivities) {
    const previousRecord = options.previousState.activities[activity.syncKey];
    const dueDate = new Date(activity.dueAt);
    const startDate = new Date(dueDate.getTime() - CALENDAR_EVENT_DURATION_MS);
    const eventPayload = {
      alarms: [],
      endDate: dueDate,
      notes: buildCalendarEventNotes(activity),
      startDate,
      timeZone: DISPLAY_TIME_ZONE,
      title: activity.title,
    };

    let calendarEventId = previousRecord?.calendar?.calendarEventId;
    const previousCalendarId = previousRecord?.calendar?.calendarId;

    if (calendarEventId && previousCalendarId === options.resolvedCalendar.calendarId) {
      try {
        await Calendar.updateEventAsync(calendarEventId, eventPayload);
      } catch {
        calendarEventId = undefined;
      }
    }

    if (!calendarEventId) {
      calendarEventId = await Calendar.createEventAsync(options.resolvedCalendar.calendarId, eventPayload);
    }

    nextCalendarRecords.set(activity.syncKey, {
      calendarEventId,
      calendarId: options.resolvedCalendar.calendarId,
    });
  }

  for (const [syncKey, activityRecord] of Object.entries(options.previousState.activities)) {
    if (nextCalendarRecords.has(syncKey)) {
      continue;
    }

    await deleteManagedEvent(activityRecord);
  }

  return nextCalendarRecords;
}

async function syncNotifications(options: {
  desiredActivities: SyncableDueActivity[];
  previousState: DeviceIntegrationState;
  reminderOffsets: ActivityReminderOffset[];
}) {
  const nextNotifications = new Map<string, ManagedActivityRecord["notifications"]>();

  for (const previousRecord of Object.values(options.previousState.activities)) {
    await cancelManagedNotifications(previousRecord);
  }

  for (const activity of options.desiredActivities) {
    const notificationRecord: ManagedActivityRecord["notifications"] = {};

    for (const offset of options.reminderOffsets) {
      const triggerDate = getNotificationTriggerDate(activity, offset);

      if (!triggerDate) {
        continue;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          body: buildNotificationBody(activity, offset),
          data: { href: activity.href },
          sound: false,
          title: activity.title,
        },
        identifier: buildManagedNotificationId(activity, offset),
        trigger: {
          date: triggerDate,
          type: SchedulableTriggerInputTypes.DATE,
        },
      });

      notificationRecord[offset] = identifier;
    }

    nextNotifications.set(activity.syncKey, notificationRecord);
  }

  return nextNotifications;
}

async function cleanupForAccountChange(previousState: DeviceIntegrationState) {
  for (const activityRecord of Object.values(previousState.activities)) {
    await deleteManagedEvent(activityRecord);
    await cancelManagedNotifications(activityRecord);
  }
}

export async function clearManagedDeviceIntegrations() {
  const previousState = await readDeviceIntegrationState();
  await cleanupForAccountChange(previousState);
  await clearDeviceIntegrationState();
}

async function performDeviceIntegrationSync(options: {
  config: CanvasClientConfig;
  preferences?: DeviceIntegrationPreferences;
  queryClient?: QueryClient;
}) {
  const preferences = options.preferences ?? (await readDeviceIntegrationPreferences());
  const previousState = await readDeviceIntegrationState();
  const accountSignature = createAccountSignature(options.config);

  if (
    previousState.accountSignature &&
    previousState.accountSignature !== accountSignature
  ) {
    await cleanupForAccountChange(previousState);
  }

  if (!preferences.calendarSyncEnabled && preferences.activityReminderOffsets.length === 0) {
    await cleanupForAccountChange(previousState);
    await clearDeviceIntegrationState();
    const notificationPermissions = await Notifications.getPermissionsAsync().catch(() => null);
    const calendarPermissions = await Calendar.getCalendarPermissionsAsync().catch(() => null);

    return {
      calendarPermissionStatus: calendarPermissions?.status ?? null,
      lastSuccessfulSyncAt: null,
      notificationPermissionStatus: notificationPermissions?.status ?? null,
      syncedActivityCount: 0,
    } satisfies DeviceIntegrationSyncResult;
  }

  await ensureNotificationChannelAsync();

  const [notificationPermissions, calendarPermissions, desiredActivities] = await Promise.all([
    Notifications.getPermissionsAsync().catch(() => null as NotificationPermissionsStatus | null),
    Calendar.getCalendarPermissionsAsync().catch(() => null),
    collectUpcomingDueActivities(options.config, options.queryClient),
  ]);

  const canSyncCalendar = preferences.calendarSyncEnabled && calendarPermissions?.granted;
  const canSyncNotifications = preferences.activityReminderOffsets.length > 0 && notificationPermissions?.granted;

  const nextActivities: DeviceIntegrationState["activities"] = {};
  let resolvedCalendar: ResolvedCalendarBinding | null = null;
  let nextCalendarRecords = new Map<string, ManagedActivityRecord["calendar"]>();
  let nextNotificationRecords = new Map<string, ManagedActivityRecord["notifications"]>();

  if (canSyncCalendar) {
    resolvedCalendar = await resolveWritableCalendarAsync();
    nextCalendarRecords = await syncCalendarEvents({
      desiredActivities,
      previousState,
      resolvedCalendar,
    });
  } else {
    for (const previousRecord of Object.values(previousState.activities)) {
      await deleteManagedEvent(previousRecord);
    }
  }

  if (canSyncNotifications) {
    nextNotificationRecords = await syncNotifications({
      desiredActivities,
      previousState,
      reminderOffsets: preferences.activityReminderOffsets,
    });
  } else {
    for (const previousRecord of Object.values(previousState.activities)) {
      await cancelManagedNotifications(previousRecord);
    }
  }

  for (const activity of desiredActivities) {
    nextActivities[activity.syncKey] = {
      calendar: nextCalendarRecords.get(activity.syncKey),
      href: activity.href,
      kind: activity.kind,
      notifications: nextNotificationRecords.get(activity.syncKey) ?? {},
      title: activity.title,
    };
  }

  const lastSuccessfulSyncAt = new Date().toISOString();

  await writeDeviceIntegrationState({
    accountSignature,
    activities: nextActivities,
    lastSuccessfulSyncAt,
    resolvedCalendar,
    schemaVersion: 1,
  });

  return {
    calendarPermissionStatus: calendarPermissions?.status ?? null,
    lastSuccessfulSyncAt,
    notificationPermissionStatus: notificationPermissions?.status ?? null,
    syncedActivityCount: desiredActivities.length,
  } satisfies DeviceIntegrationSyncResult;
}

export async function syncDeviceIntegrations(options: {
  config: CanvasClientConfig;
  preferences?: DeviceIntegrationPreferences;
  queryClient?: QueryClient;
  reason?: string;
}) {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = performDeviceIntegrationSync(options).finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
}
