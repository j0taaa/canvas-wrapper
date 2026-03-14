import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const DEFAULT_CANVAS_API_BASE = "https://pucminas.instructure.com/api/v1";
const DATA_REVALIDATE_SECONDS = 300;
const CANVAS_API_BASE_COOKIE = "canvasApiBase";

const envCanvasApiKey = process.env.CANVAS_KEY ?? process.env.CANVAS_API_KEY;

export function normalizeCanvasProviderUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return DEFAULT_CANVAS_API_BASE;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  const path = url.pathname.replace(/\/+$/, "");

  url.pathname = path.endsWith("/api/v1") ? path : `${path}/api/v1`;
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/+$/, "");
}

async function resolveCanvasApiBase(apiBase?: string) {
  if (apiBase) {
    return normalizeCanvasProviderUrl(apiBase);
  }

  try {
    const cookieStore = await cookies();
    const storedApiBase = cookieStore.get(CANVAS_API_BASE_COOKIE)?.value;

    if (storedApiBase) {
      return normalizeCanvasProviderUrl(storedApiBase);
    }
  } catch {
    // Ignore request-scope cookie access failures and fall back below.
  }

  return normalizeCanvasProviderUrl(process.env.CANVAS_API_BASE ?? DEFAULT_CANVAS_API_BASE);
}

type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
  workflow_state?: string;
  image_download_url?: string;
  html_url?: string;
  concluded?: boolean;
  enrollments?: Array<{
    computed_current_score?: number;
    current_period_computed_current_score?: number;
    grades?: {
      current_score?: number;
    };
  }>;
};

type CanvasModuleItem = {
  id: number;
  title?: string;
  type?: string;
  html_url?: string;
  page_url?: string;
  url?: string;
  content_id?: number;
  completion_requirement?: {
    completed?: boolean;
  };
};

type CanvasModule = {
  id: number;
  name: string;
  state?: string;
  items_count?: number;
  items?: CanvasModuleItem[];
};

export type CanvasAssignment = {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  html_url?: string;
  points_possible?: number;
  submission_types?: string[];
  allowed_attempts?: number;
  published?: boolean;
  locked_for_user?: boolean;
  unlock_at?: string;
  lock_at?: string;
  submission?: CanvasSubmission;
};

type CanvasCalendarEvent = {
  id: number | string;
  assignment_id?: number;
  title: string;
  start_at?: string;
  end_at?: string;
  html_url?: string;
  context_name?: string;
  description?: string;
  location_name?: string;
  workflow_state?: string;
  context_code?: string;
};

type CanvasSubmission = {
  assignment_id?: number;
  course_id?: number;
  workflow_state?: string;
  submitted_at?: string;
  graded_at?: string;
  excused?: boolean;
  missing?: boolean;
  score?: number;
  grade?: string;
  body?: string;
  url?: string;
  attempt?: number;
};

type CanvasEnrollmentGrades = {
  html_url?: string;
  current_grade?: string;
  final_grade?: string;
  current_score?: number;
  final_score?: number;
};

type CanvasEnrollment = {
  id: number;
  type?: string;
  role?: string;
  enrollment_state?: string;
  grades?: CanvasEnrollmentGrades;
};

export type CanvasCourseUser = {
  id: number;
  name: string;
  short_name?: string;
  sortable_name?: string;
  avatar_url?: string;
};

export type CanvasCourseFile = {
  id: number;
  display_name?: string;
  filename?: string;
  url?: string;
  size?: number;
  "content-type"?: string;
  updated_at?: string;
  created_at?: string;
};

export type CanvasDiscussionTopic = {
  id: number;
  title?: string;
  message?: string;
  html_url?: string;
  posted_at?: string;
  discussion_subentry_count?: number;
  unread_count?: number;
  author?: {
    id?: number;
    display_name?: string;
    avatar_image_url?: string;
  };
};

export type CanvasCourseGroup = {
  id: number;
  name: string;
  description?: string;
  members_count?: number;
  join_level?: string;
  html_url?: string;
};

type CanvasConversationParticipant = {
  id: number;
  name: string;
  full_name?: string;
  avatar_url?: string;
};

export type CanvasConversation = {
  id: number;
  subject?: string;
  workflow_state?: string;
  last_message?: string;
  last_message_at?: string;
  message_count?: number;
  context_name?: string;
  participants?: CanvasConversationParticipant[];
  private?: boolean;
  starred?: boolean;
};

type CanvasConversationAttachment = {
  "content-type"?: string;
  display_name?: string;
  filename?: string;
  url?: string;
};

export type CanvasConversationMessage = {
  id: number;
  created_at?: string;
  body?: string;
  author_id?: number;
  generated?: boolean;
  attachments?: CanvasConversationAttachment[];
};

export type CanvasConversationDetail = CanvasConversation & {
  participants?: CanvasConversationParticipant[];
  messages?: CanvasConversationMessage[];
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
    completed?: boolean;
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
  pastCourses: CanvasCourse[];
  todo: CanvasTodoItem[];
  dashboardCards: CanvasDashboardCard[];
};

export type CanvasCourseContent = {
  courseId: number;
  modules: CanvasModule[];
  assignments: CanvasAssignment[];
};

export type CanvasCoursePage = {
  page_id?: number;
  url?: string;
  title?: string;
  body?: string;
  html_url?: string;
  updated_at?: string;
  created_at?: string;
  front_page?: boolean;
  published?: boolean;
};

export type CanvasQuiz = {
  id: number;
  title?: string;
  description?: string;
  html_url?: string;
  points_possible?: number;
  question_count?: number;
  due_at?: string;
  lock_at?: string;
  unlock_at?: string;
  quiz_type?: string;
  assignment_id?: number;
};

export type CanvasQuizQuestion = {
  id: number;
  quiz_id?: number;
  position?: number;
  question_name?: string;
  question_type?: string;
  question_text?: string;
  points_possible?: number;
  answers?: Array<{
    id?: number;
    text?: string;
    weight?: number;
  }>;
};

export type CanvasCourseGradeData = {
  enrollment: CanvasEnrollment | null;
  assignments: CanvasAssignment[];
};

export type CanvasCalendarData = {
  assignments: CanvasCalendarEvent[];
  events: CanvasCalendarEvent[];
};

export type CanvasInboxData = {
  conversations: CanvasConversation[];
};

type CalendarRange = {
  endDate: string;
  startDate: string;
};

type CourseAssignmentReference = {
  assignmentId: number;
  courseId: number;
};

function getCalendarAssignmentId(assignment: CanvasCalendarEvent) {
  if (typeof assignment.assignment_id === "number" && Number.isFinite(assignment.assignment_id)) {
    return assignment.assignment_id;
  }

  if (typeof assignment.id === "number" && Number.isFinite(assignment.id)) {
    return assignment.id;
  }

  const fallbackId = String(assignment.id ?? "").match(/(\d+)$/)?.[1];
  const parsedId = Number(fallbackId);

  return Number.isFinite(parsedId) ? parsedId : null;
}

async function canvasCurlFetch<T>(path: string, apiKey: string, apiBase?: string): Promise<T> {
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);
  const { stdout } = await execFileAsync("curl", [
    "-sS",
    "--fail",
    "-H",
    `Authorization: Bearer ${apiKey}`,
    `${resolvedApiBase}${path}`,
  ]);

  return JSON.parse(stdout) as T;
}

async function rawCanvasFetch(path: string, apiKey: string, apiBase: string) {
  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Canvas API request failed (${response.status}) for ${path}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";

    if (message.includes("fetch failed")) {
      return canvasCurlFetch(path, apiKey, apiBase);
    }

    throw error;
  }
}

const cachedCanvasFetch = unstable_cache(
  async (path: string, apiKey: string, apiBase: string) => rawCanvasFetch(path, apiKey, apiBase),
  ["canvas-fetch"],
  { revalidate: DATA_REVALIDATE_SECONDS },
);

async function canvasFetch<T>(path: string, apiKey: string, apiBase?: string): Promise<T> {
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);
  return cachedCanvasFetch(path, apiKey, resolvedApiBase) as Promise<T>;
}

function isCompletedSubmission(submission?: CanvasSubmission) {
  if (!submission) {
    return false;
  }

  if (submission.excused) {
    return true;
  }

  return [
    "submitted",
    "graded",
    "pending_review",
    "complete",
  ].includes(submission.workflow_state ?? "");
}

async function getAssignmentCompletionMap(
  assignments: CourseAssignmentReference[],
  apiKey: string,
  apiBase?: string,
): Promise<Map<string, boolean>> {
  const uniqueAssignments = Array.from(
    new Map(
      assignments.map((assignment) => [`${assignment.courseId}:${assignment.assignmentId}`, assignment]),
    ).values(),
  );

  const submissionResults = await Promise.allSettled(
    uniqueAssignments.map(async ({ courseId, assignmentId }) => {
      const assignment = await canvasFetch<CanvasAssignment>(
        `/courses/${courseId}/assignments/${assignmentId}?include[]=submission`,
        apiKey,
        apiBase,
      );

      return {
        assignmentId,
        completed: isCompletedSubmission(assignment.submission),
        courseId,
      };
    }),
  );

  const completionMap = new Map<string, boolean>();

  for (const result of submissionResults) {
    if (result.status !== "fulfilled") {
      continue;
    }

    completionMap.set(
      `${result.value.courseId}:${result.value.assignmentId}`,
      result.value.completed,
    );
  }

  return completionMap;
}

async function getOverdueTodoItems(courses: CanvasCourse[], apiKey: string, apiBase?: string): Promise<CanvasTodoItem[]> {
  const overdueAssignments = await Promise.allSettled(
    courses.map(async (course) => {
      const assignments = await canvasFetch<CanvasAssignment[]>(
        `/courses/${course.id}/assignments?bucket=overdue&include[]=submission&per_page=20`,
        apiKey,
        apiBase,
      );

      return assignments.map((assignment) => ({
        type: "overdue",
        assignment: {
          id: assignment.id,
          name: assignment.name,
          due_at: assignment.due_at,
          course_id: course.id,
          html_url: assignment.html_url,
          completed: isCompletedSubmission(assignment.submission),
        },
        context_name: course.name,
      }));
    }),
  );

  return overdueAssignments.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function getDashboardData(apiKey?: string, apiBase?: string): Promise<CanvasDashboardData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [profile, activeCourses, allCourses, todo, dashboardCards] = await Promise.all([
    canvasFetch<CanvasProfile>("/users/self/profile", resolvedApiKey, resolvedApiBase),
    canvasFetch<CanvasCourse[]>(
      "/courses?per_page=24&enrollment_state=active&state[]=available&include[]=enrollments&include[]=total_scores&include[]=current_grading_period_scores",
      resolvedApiKey,
      resolvedApiBase,
    ),
    canvasFetch<CanvasCourse[]>("/courses?per_page=100&include[]=concluded&state[]=available&state[]=completed", resolvedApiKey, resolvedApiBase),
    canvasFetch<CanvasTodoItem[]>("/users/self/todo?per_page=10", resolvedApiKey, resolvedApiBase),
    canvasFetch<CanvasDashboardCard[]>("/dashboard/dashboard_cards", resolvedApiKey, resolvedApiBase),
  ]);
  const courses = activeCourses;
  const activeCourseIds = new Set(activeCourses.map((course) => course.id));
  const pastCourses = allCourses.filter(
    (course) => !activeCourseIds.has(course.id) && (course.concluded || course.workflow_state === "completed"),
  );
  const overdueTodo = await getOverdueTodoItems(courses, resolvedApiKey, resolvedApiBase);

  const completionMap = await getAssignmentCompletionMap(
    [...todo, ...overdueTodo].flatMap((item) => {
      if (!item.assignment?.id || !item.assignment.course_id) {
        return [];
      }

      return [{
        assignmentId: item.assignment.id,
        courseId: item.assignment.course_id,
      }];
    }),
    resolvedApiKey,
    resolvedApiBase,
  );

  return {
    apiBase: resolvedApiBase,
    profile,
    courses,
    pastCourses,
    todo: [...todo, ...overdueTodo]
      .map((item) => {
        if (!item.assignment?.id || !item.assignment.course_id) {
          return item;
        }

        return {
          ...item,
          assignment: {
            ...item.assignment,
            completed: completionMap.get(`${item.assignment.course_id}:${item.assignment.id}`) ?? item.assignment.completed ?? false,
          },
        };
      })
      .filter((item) => !item.assignment?.completed)
      .filter((item, index, items) => {
        if (!item.assignment?.id || !item.assignment.course_id) {
          return true;
        }

        return (
          items.findIndex(
            (candidate) =>
              candidate.assignment?.id === item.assignment?.id &&
              candidate.assignment?.course_id === item.assignment?.course_id,
          ) === index
        );
      })
      .sort((left, right) => {
        const leftDate = left.assignment?.due_at ?? "";
        const rightDate = right.assignment?.due_at ?? "";
        return leftDate.localeCompare(rightDate);
      }),
    dashboardCards,
  };
}

export async function getCourseContent(courseId: number, apiKey?: string): Promise<CanvasCourseContent> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [modulesResult, assignmentsResult] = await Promise.allSettled([
    canvasFetch<CanvasModule[]>(
      `/courses/${courseId}/modules?include[]=items&include[]=content_details&per_page=50`,
      resolvedApiKey,
    ),
    canvasFetch<CanvasAssignment[]>(
      `/courses/${courseId}/assignments?include[]=submission&per_page=20&order_by=due_at`,
      resolvedApiKey,
    ),
  ]);

  return {
    courseId,
    modules: modulesResult.status === "fulfilled" ? modulesResult.value : [],
    assignments: assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [],
  };
}

export async function getCoursePage(
  courseId: number,
  pageIdOrUrl: string,
  apiKey?: string,
): Promise<CanvasCoursePage> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCoursePage>(
    `/courses/${courseId}/pages/${encodeURIComponent(pageIdOrUrl)}`,
    resolvedApiKey,
  );
}

export async function getCourseGradeData(courseId: number, apiKey?: string): Promise<CanvasCourseGradeData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [enrollmentResult, assignmentsResult] = await Promise.allSettled([
    canvasFetch<CanvasEnrollment[]>(
      `/courses/${courseId}/enrollments?user_id=self&include[]=grades&per_page=10`,
      resolvedApiKey,
    ),
    canvasFetch<CanvasAssignment[]>(
      `/courses/${courseId}/assignments?include[]=submission&per_page=50&order_by=due_at`,
      resolvedApiKey,
    ),
  ]);

  return {
    enrollment:
      enrollmentResult.status === "fulfilled"
        ? enrollmentResult.value.find((enrollment) => enrollment.grades) ?? enrollmentResult.value[0] ?? null
        : null,
    assignments: assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [],
  };
}

export async function getAssignmentDetails(
  courseId: number,
  assignmentId: number,
  apiKey?: string,
): Promise<CanvasAssignment> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasAssignment>(
    `/courses/${courseId}/assignments/${assignmentId}?include[]=submission`,
    resolvedApiKey,
  );
}

export async function submitAssignment(
  courseId: number,
  assignmentId: number,
  submission: { submissionType: "online_text_entry" | "online_url"; body?: string; url?: string },
  apiKey?: string,
): Promise<CanvasSubmission> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const params = new URLSearchParams();
  params.set("submission[submission_type]", submission.submissionType);

  if (submission.submissionType === "online_text_entry") {
    params.set("submission[body]", submission.body ?? "");
  }

  if (submission.submissionType === "online_url") {
    params.set("submission[url]", submission.url ?? "");
  }

  const response = await fetch(`${resolvedApiBase}/courses/${courseId}/assignments/${assignmentId}/submissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Canvas submission failed (${response.status}) for assignment ${assignmentId}`);
  }

  return (await response.json()) as CanvasSubmission;
}

export async function getQuizDetails(
  courseId: number,
  quizId: number,
  apiKey?: string,
): Promise<CanvasQuiz> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasQuiz>(`/courses/${courseId}/quizzes/${quizId}`, resolvedApiKey);
}

export async function getQuizQuestions(
  courseId: number,
  quizId: number,
  apiKey?: string,
): Promise<CanvasQuizQuestion[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasQuizQuestion[]>(
    `/courses/${courseId}/quizzes/${quizId}/questions?per_page=100`,
    resolvedApiKey,
  );
}

export async function getCoursePeople(courseId: number, apiKey?: string): Promise<CanvasCourseUser[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourseUser[]>(
    `/courses/${courseId}/users?include[]=avatar_url&per_page=50&sort=username`,
    resolvedApiKey,
  );
}

export async function getCourseFiles(courseId: number, apiKey?: string): Promise<CanvasCourseFile[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourseFile[]>(
    `/courses/${courseId}/files?per_page=50&sort=updated_at&order=desc`,
    resolvedApiKey,
  );
}

export async function getFileById(fileId: number, apiKey?: string): Promise<CanvasCourseFile> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourseFile>(`/files/${fileId}`, resolvedApiKey);
}

export async function getFileContent(
  fileId: number,
  apiKey?: string,
): Promise<{ contentType: string; data: ArrayBuffer }> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const file = await getFileById(fileId, resolvedApiKey);

  if (!file.url) {
    throw new Error("File has no downloadable URL");
  }

  const response = await fetch(file.url, {
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Canvas file request failed (${response.status}) for file ${fileId}`);
  }

  return {
    contentType: response.headers.get("content-type") ?? file["content-type"] ?? "application/octet-stream",
    data: await response.arrayBuffer(),
  };
}

export async function getCourseDiscussions(courseId: number, apiKey?: string): Promise<CanvasDiscussionTopic[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasDiscussionTopic[]>(
    `/courses/${courseId}/discussion_topics?per_page=20`,
    resolvedApiKey,
  );
}

export async function getCourseGroups(courseId: number, apiKey?: string): Promise<CanvasCourseGroup[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourseGroup[]>(
    `/courses/${courseId}/groups?per_page=50`,
    resolvedApiKey,
  );
}

export async function getCalendarData(
  courseIds: number[],
  range?: CalendarRange,
  apiKey?: string,
): Promise<CanvasCalendarData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const startDateValue = range?.startDate ?? new Date().toISOString().slice(0, 10);
  const endDateValue = range?.endDate ?? new Date().toISOString().slice(0, 10);
  const contextQuery = courseIds.slice(0, 10).map((courseId) => `context_codes[]=course_${courseId}`).join("&");
  const sharedQuery = `start_date=${startDateValue}&end_date=${endDateValue}${contextQuery ? `&${contextQuery}` : ""}`;

  const [assignmentsResult, eventsResult] = await Promise.allSettled([
    canvasFetch<CanvasCalendarEvent[]>(`/calendar_events?type=assignment&${sharedQuery}`, resolvedApiKey),
    canvasFetch<CanvasCalendarEvent[]>(`/calendar_events?type=event&${sharedQuery}`, resolvedApiKey),
  ]);

  const assignments = assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [];
  const completionMap = await getAssignmentCompletionMap(
    assignments.flatMap((assignment) => {
      const assignmentId = getCalendarAssignmentId(assignment);
      const courseId = Number(assignment.context_code?.replace("course_", ""));

      if (assignmentId == null || !Number.isFinite(courseId)) {
        return [];
      }

      return [{
        assignmentId,
        courseId,
      }];
    }),
    resolvedApiKey,
  );

  return {
    assignments: assignments.map((assignment) => {
      const assignmentId = getCalendarAssignmentId(assignment);
      const courseId = Number(assignment.context_code?.replace("course_", ""));

      return {
        ...assignment,
        workflow_state:
          assignmentId != null && Number.isFinite(courseId) && completionMap.get(`${courseId}:${assignmentId}`)
            ? "completed"
            : assignment.workflow_state,
      };
    }),
    events: eventsResult.status === "fulfilled" ? eventsResult.value : [],
  };
}

export async function getInboxData(apiKey?: string): Promise<CanvasInboxData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const conversations = await canvasFetch<CanvasConversation[]>(
    "/conversations?include[]=participant_avatars",
    resolvedApiKey,
  );

  return {
    conversations,
  };
}

export async function getConversationData(
  conversationId: number,
  apiKey?: string,
): Promise<CanvasConversationDetail> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasConversationDetail>(
    `/conversations/${conversationId}?auto_mark_as_read=true&include[]=participant_avatars`,
    resolvedApiKey,
  );
}
