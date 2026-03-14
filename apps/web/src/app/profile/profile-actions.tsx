"use client";

import { useRouter } from "next/navigation";

const CANVAS_API_KEY_STORAGE = "canvasApiKey";
const CANVAS_API_BASE_STORAGE = "canvasApiBase";
const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";
const CANVAS_BOOTSTRAP_STORAGE = "canvasBootstrapData";

export function ProfileActions() {
  const router = useRouter();

  const clearKey = async () => {
    await fetch("/api/dashboard", { method: "DELETE" });
    localStorage.removeItem(CANVAS_API_KEY_STORAGE);
    localStorage.removeItem(CANVAS_API_BASE_STORAGE);
    localStorage.removeItem(CANVAS_DASHBOARD_STORAGE);
    localStorage.removeItem(CANVAS_BOOTSTRAP_STORAGE);
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={clearKey}
      className="text-sm text-black/50 transition hover:text-black/70"
    >
      Change API key
    </button>
  );
}
