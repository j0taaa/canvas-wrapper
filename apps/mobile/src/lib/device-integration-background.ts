import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { getStoredCanvasConfig } from "./canvas-config";
import { readDeviceIntegrationPreferences } from "./preferences";
import { syncDeviceIntegrations } from "./device-integration-sync";

export const DEVICE_INTEGRATION_BACKGROUND_TASK = "canvas-wrapper-device-integration-sync";

if (!TaskManager.isTaskDefined(DEVICE_INTEGRATION_BACKGROUND_TASK)) {
  TaskManager.defineTask(DEVICE_INTEGRATION_BACKGROUND_TASK, async () => {
    try {
      const [config, preferences] = await Promise.all([
        getStoredCanvasConfig(),
        readDeviceIntegrationPreferences(),
      ]);

      if (!config || (!preferences.calendarSyncEnabled && preferences.activityReminderOffsets.length === 0)) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      await syncDeviceIntegrations({
        config,
        preferences,
        reason: "background-task",
      });

      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerDeviceIntegrationBackgroundTask() {
  const status = await BackgroundTask.getStatusAsync().catch(() => null);

  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return false;
  }

  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(DEVICE_INTEGRATION_BACKGROUND_TASK).catch(() => false);

  if (!alreadyRegistered) {
    await BackgroundTask.registerTaskAsync(DEVICE_INTEGRATION_BACKGROUND_TASK, {
      minimumInterval: 60,
    });
  }

  return true;
}

export async function unregisterDeviceIntegrationBackgroundTask() {
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(DEVICE_INTEGRATION_BACKGROUND_TASK).catch(() => false);

  if (!alreadyRegistered) {
    return;
  }

  await BackgroundTask.unregisterTaskAsync(DEVICE_INTEGRATION_BACKGROUND_TASK);
}
