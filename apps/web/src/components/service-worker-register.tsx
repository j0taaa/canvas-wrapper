"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((registration) => !registration.active?.scriptURL.includes("/sw.js?v=5"))
        .forEach((registration) => {
          registration.unregister().catch(() => {
            // Silent fail keeps UX clean in unsupported/blocked environments.
          });
        });
    });

    navigator.serviceWorker.register("/sw.js?v=5").then((registration) => {
      registration.update().catch(() => {
        // Silent fail keeps UX clean in unsupported/blocked environments.
      });
    }).catch(() => {
      // Silent fail keeps UX clean in unsupported/blocked environments.
    });
  }, []);

  return null;
}
