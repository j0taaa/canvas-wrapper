"use client";

import { useMemo } from "react";

function CanvasWatermark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0.1 26.7 26.8"
      className="relative z-10 h-4.5 w-4.5 shrink-0 text-[#d64027]"
    >
      <g fill="currentColor">
        <path d="M3.9,13.5c0-2-1.5-3.6-3.4-3.8C0.2,10.9,0,12.1,0,13.5s0.2,2.6,0.5,3.8C2.4,17.1,3.9,15.4,3.9,13.5L3.9,13.5z" />
        <circle cx="6.2" cy="13.4" r="1.2" />
        <path d="M22.8,13.5c0,2,1.5,3.6,3.4,3.8c0.3-1.2,0.5-2.5,0.5-3.8s-0.2-2.6-0.5-3.8C24.3,9.9,22.8,11.5,22.8,13.5L22.8,13.5z" />
        <circle cx="20.2" cy="13.4" r="1.2" />
        <path d="M13.3,23c-2,0-3.6,1.5-3.8,3.4c1.2,0.3,2.5,0.5,3.8,0.5c1.3,0,2.6-0.2,3.8-0.5C16.9,24.5,15.3,23,13.3,23L13.3,23z" />
        <circle cx="13.2" cy="20.4" r="1.2" />
        <path d="M13.3,4c2,0,3.6-1.5,3.8-3.4c-1.2-0.3-2.5-0.5-3.8-0.5c-1.3,0-2.6,0.2-3.8,0.5C9.7,2.5,11.3,4,13.3,4L13.3,4z" />
        <circle cx="13.2" cy="6.4" r="1.2" />
        <path d="M20,20.2c-1.4,1.4-1.5,3.6-0.3,5.1c2.2-1.3,4.1-3.2,5.4-5.4C23.6,18.7,21.4,18.8,20,20.2L20,20.2z" />
        <circle cx="18.2" cy="18.4" r="1.2" />
        <path d="M6.6,6.8C8,5.4,8.1,3.2,6.9,1.7C4.7,3,2.8,4.9,1.5,7.1C3,8.3,5.2,8.2,6.6,6.8L6.6,6.8z" />
        <circle cx="8.2" cy="8.4" r="1.2" />
        <path d="M20,6.8c1.4,1.4,3.6,1.5,5.1,0.3c-1.3-2.2-3.2-4.1-5.4-5.4C18.5,3.2,18.6,5.4,20,6.8L20,6.8z" />
        <circle cx="18.2" cy="8.4" r="1.2" />
        <path d="M6.6,20.2c-1.4-1.4-3.6-1.5-5.1-0.3c1.3,2.2,3.2,4.1,5.4,5.4C8.1,23.7,8,21.6,6.6,20.2L6.6,20.2z" />
        <circle cx="8.2" cy="18.4" r="1.2" />
      </g>
    </svg>
  );
}

function buildCanvasDeepLink(canvasUrl: string, courseId: number, quizId: number) {
  try {
    const parsed = new URL(canvasUrl);
    return `canvas-courses://${parsed.host}/courses/${courseId}/quizzes/${quizId}`;
  } catch {
    return null;
  }
}

export function OpenInCanvasButton({
  canvasUrl,
  courseId,
  quizId,
}: {
  canvasUrl: string;
  courseId: number;
  quizId: number;
}) {
  const deepLink = useMemo(() => buildCanvasDeepLink(canvasUrl, courseId, quizId), [canvasUrl, courseId, quizId]);

  return (
    <a
      href={canvasUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative inline-flex min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-black/12 bg-black/[0.03] px-4 py-2 text-sm font-medium text-black/82 transition hover:border-black/18 hover:bg-black/[0.05] hover:text-black dark:border-white/12 dark:bg-white/[0.06] dark:text-white/88 dark:hover:border-white/20 dark:hover:bg-white/[0.1] dark:hover:text-white"
      onClick={(event) => {
        if (typeof window === "undefined" || deepLink == null) {
          return;
        }

        const mobileUserAgent = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
        if (!mobileUserAgent) {
          return;
        }

        event.preventDefault();

        const fallbackTimer = window.setTimeout(() => {
          window.open(canvasUrl, "_blank", "noopener,noreferrer");
        }, 900);

        const clearFallback = () => {
          window.clearTimeout(fallbackTimer);
          window.removeEventListener("pagehide", clearFallback);
          window.removeEventListener("blur", clearFallback);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };

        const handleVisibilityChange = () => {
          if (document.visibilityState === "hidden") {
            clearFallback();
          }
        };

        window.addEventListener("pagehide", clearFallback, { once: true });
        window.addEventListener("blur", clearFallback, { once: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);

        window.location.href = deepLink;
      }}
    >
      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#d64027]/[0.06] via-transparent to-transparent dark:from-[#d64027]/[0.08] dark:via-transparent dark:to-transparent" />
      <CanvasWatermark />
      <span className="relative z-10">Open in Canvas</span>
    </a>
  );
}
