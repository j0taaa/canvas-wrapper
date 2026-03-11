import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { unstable_cache } from "next/cache";

const execFileAsync = promisify(execFile);

const DEFAULT_CANVAS_API_BASE = "https://pucminas.instructure.com/api/v1";

const canvasApiBase = process.env.CANVAS_API_BASE ?? DEFAULT_CANVAS_API_BASE;
const canvasApiKey = process.env.CANVAS_KEY ?? process.env.CANVAS_API_KEY;

const DATA_REVALIDATE_SECONDS = 300;

type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
  workflow_state?: string;
  image_download_url?: string;
  html_url?: string;
};

type CanvasProfile = {
  id: number;
  name: string;
  short_name?: string;
  primary_email?: string;
  avatar_url?: string;
};

type CanvasTodoItem = {
  type: string;
  assignment?: {
    id: number;
    name: string;
    due_at?: string;
    course_id?: number;
    html_url?: string;
  };
  context_name?: string;
};

type CanvasDashboardCard = {
  id: string;
  shortName: string;
  originalName: string;
  href?: string;
};

async function canvasCurlFetch<T>(path: string): Promise<T> {
  const { stdout } = await execFileAsync("curl", [
    "-sS",
    "--fail",
    "-H",
    `Authorization: Bearer ${canvasApiKey}`,
    `${canvasApiBase}${path}`,
  ]);

  return JSON.parse(stdout) as T;
}

async function canvasFetch<T>(path: string): Promise<T> {
  if (!canvasApiKey) {
    throw new Error("Missing CANVAS_KEY (or CANVAS_API_KEY) environment variable");
  }

  try {
    const response = await fetch(`${canvasApiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${canvasApiKey}`,
      },
      cache: "force-cache",
      next: {
        revalidate: DATA_REVALIDATE_SECONDS,
        tags: ["canvas", `canvas:${path}`],
      },
    });

    if (!response.ok) {
      throw new Error(`Canvas API request failed (${response.status}) for ${path}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";

    if (message.includes("fetch failed")) {
      return canvasCurlFetch<T>(path);
    }

    throw error;
  }
}

const loadDashboardData = unstable_cache(
  async () => {
    const [profile, courses, todo, dashboardCards] = await Promise.all([
      canvasFetch<CanvasProfile>("/users/self/profile"),
      canvasFetch<CanvasCourse[]>("/courses?per_page=12&enrollment_state=active&state[]=available"),
      canvasFetch<CanvasTodoItem[]>("/users/self/todo?per_page=10"),
      canvasFetch<CanvasDashboardCard[]>("/dashboard/dashboard_cards"),
    ]);

    return {
      apiBase: canvasApiBase,
      profile,
      courses,
      todo,
      dashboardCards,
    };
  },
  ["canvas-dashboard-data", canvasApiBase],
  {
    revalidate: DATA_REVALIDATE_SECONDS,
    tags: ["canvas", "canvas:dashboard"],
  },
);

export async function getDashboardData() {
  return loadDashboardData();
}
