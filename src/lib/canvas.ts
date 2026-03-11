import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const DEFAULT_CANVAS_API_BASE = "https://pucminas.instructure.com/api/v1";
const DATA_REVALIDATE_SECONDS = 300;

export const canvasApiBase = process.env.CANVAS_API_BASE ?? DEFAULT_CANVAS_API_BASE;
const envCanvasApiKey = process.env.CANVAS_KEY ?? process.env.CANVAS_API_KEY;

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

export type CanvasDashboardData = {
  apiBase: string;
  profile: CanvasProfile;
  courses: CanvasCourse[];
  todo: CanvasTodoItem[];
  dashboardCards: CanvasDashboardCard[];
};

async function canvasCurlFetch<T>(path: string, apiKey: string): Promise<T> {
  const { stdout } = await execFileAsync("curl", [
    "-sS",
    "--fail",
    "-H",
    `Authorization: Bearer ${apiKey}`,
    `${canvasApiBase}${path}`,
  ]);

  return JSON.parse(stdout) as T;
}

async function canvasFetch<T>(path: string, apiKey: string): Promise<T> {
  try {
    const response = await fetch(`${canvasApiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
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
      return canvasCurlFetch<T>(path, apiKey);
    }

    throw error;
  }
}

export async function getDashboardData(apiKey?: string): Promise<CanvasDashboardData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [profile, courses, todo, dashboardCards] = await Promise.all([
    canvasFetch<CanvasProfile>("/users/self/profile", resolvedApiKey),
    canvasFetch<CanvasCourse[]>("/courses?per_page=12&enrollment_state=active&state[]=available", resolvedApiKey),
    canvasFetch<CanvasTodoItem[]>("/users/self/todo?per_page=10", resolvedApiKey),
    canvasFetch<CanvasDashboardCard[]>("/dashboard/dashboard_cards", resolvedApiKey),
  ]);

  return {
    apiBase: canvasApiBase,
    profile,
    courses,
    todo,
    dashboardCards,
  };
}
