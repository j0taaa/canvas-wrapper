"use client";

import { useEffect, useRef, useState } from "react";
import { WebHaptics } from "web-haptics";
import {
  createHapticsBridgeMessage,
  HAPTICS_PREFERENCE_EVENT,
} from "@canvas/shared";
import { readHapticsPreference } from "@/lib/haptics-preference";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a[href], button, input:not([type='hidden']), textarea, select, summary, label, [role='button'], [role='link'], [data-slot='button'], [data-haptic]",
    ),
  );
}

function scheduleHaptics(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve().then(callback).catch(() => {
    // Ignore scheduling failures and keep taps responsive.
  });
}

export function GlobalHaptics() {
  const [enabled, setEnabled] = useState(false);
  const lastTriggeredAt = useRef(0);
  const webHapticsRef = useRef<WebHaptics | null>(null);

  useEffect(() => {
    const syncPreference = () => setEnabled(readHapticsPreference());

    syncPreference();
    window.addEventListener("storage", syncPreference);
    window.addEventListener(HAPTICS_PREFERENCE_EVENT, syncPreference);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(HAPTICS_PREFERENCE_EVENT, syncPreference);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.ReactNativeWebView?.postMessage || !WebHaptics.isSupported) {
      return;
    }

    webHapticsRef.current = new WebHaptics();

    return () => {
      webHapticsRef.current?.destroy();
      webHapticsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const enqueueHaptic = () => {
      const now = Date.now();

      if (now - lastTriggeredAt.current < 40) {
        return;
      }

      lastTriggeredAt.current = now;

      // Fire on the next microtask so taps stay responsive without losing user-gesture context.
      scheduleHaptics(() => {
        if (typeof window === "undefined") {
          return;
        }

        if (window.ReactNativeWebView?.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(createHapticsBridgeMessage("selection")));
          return;
        }

        void webHapticsRef.current?.trigger("selection").catch(() => {
          // Keep interactions silent on unsupported browsers rather than blocking.
        });
      });
    };

    const handleClick = (event: MouseEvent) => {
      if (!isInteractiveTarget(event.target)) {
        return;
      }

      enqueueHaptic();
    };
    document.addEventListener("click", handleClick, { capture: true, passive: true });

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [enabled]);

  return null;
}
