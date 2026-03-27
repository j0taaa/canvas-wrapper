"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { t } from "@canvas/shared";
import { useLocale } from "@/components/locale-provider";

const CANVAS_API_KEY_STORAGE = "canvasApiKey";
const CANVAS_API_BASE_STORAGE = "canvasApiBase";
const CANVAS_DASHBOARD_STORAGE = "canvasDashboardData";
const CANVAS_BOOTSTRAP_STORAGE = "canvasBootstrapData";

export function ProfileActions() {
  const router = useRouter();
  const { resolvedLocale } = useLocale();

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
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-white/84 dark:border-white/12 dark:bg-white/[0.06] dark:hover:border-white/18 dark:hover:bg-white/[0.1]"
    >
      <Sparkles className="h-4 w-4" />
      {t(resolvedLocale, "common.changeApiKey")}
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
