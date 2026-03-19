import { useEffect, useRef } from "react";
import { InteractionManager } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeMonth } from "@canvas/shared";
import {
  primeAppShellQuery,
  primeAssignmentQuery,
  primeCalendarQuery,
  primeInboxQuery,
  primeSubjectQueries,
  useDashboard,
} from "../hooks/use-canvas-queries";
import { syncDeviceIntegrations } from "../lib/device-integration-sync";
import { useCanvasSession } from "../providers/canvas-session";

const PREFETCH_SUBJECT_LIMIT = 8;
const PREFETCH_ASSIGNMENT_LIMIT = 6;

export function CanvasBootstrapPrefetcher() {
  const queryClient = useQueryClient();
  const { config, configured, ready } = useCanvasSession();
  const { data } = useDashboard(ready && configured);
  const lastBootstrapSignature = useRef<string>("");

  useEffect(() => {
    if (!config || !data) {
      return;
    }

    const signature = `${config.apiBase ?? "default"}:${data.generatedAt}`;

    if (lastBootstrapSignature.current === signature) {
      return;
    }

    lastBootstrapSignature.current = signature;

    const task = InteractionManager.runAfterInteractions(() => {
      void primeAppShellQuery(queryClient, config);
      void primeInboxQuery(queryClient, config);

      const now = new Date();
      const currentMonth = normalizeMonth(now.getUTCFullYear(), now.getUTCMonth() + 1);
      void primeCalendarQuery(queryClient, config, currentMonth.year, currentMonth.month);

      for (const course of data.courses.slice(0, PREFETCH_SUBJECT_LIMIT)) {
        void primeSubjectQueries(queryClient, config, course.id);
      }

      for (const todoItem of data.todo.slice(0, PREFETCH_ASSIGNMENT_LIMIT)) {
        if (!todoItem.assignment?.course_id || !todoItem.assignment.id) {
          continue;
        }

        void primeAssignmentQuery(
          queryClient,
          config,
          todoItem.assignment.course_id,
          todoItem.assignment.id,
        );
      }

      void syncDeviceIntegrations({
        config,
        queryClient,
        reason: "bootstrap-prefetch",
      });
    });

    return () => {
      task.cancel();
    };
  }, [config, data, queryClient]);

  return null;
}
