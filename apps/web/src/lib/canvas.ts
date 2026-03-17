import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const DEFAULT_CANVAS_API_BASE = "https://pucminas.instructure.com/api/v1";
const DATA_REVALIDATE_SECONDS = 300;
const CANVAS_API_BASE_COOKIE = "canvasApiBase";
const CANVAS_FETCH_CONCURRENCY = 4;

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

export type CanvasCourse = {
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
  submission_type?: string;
  attachments?: CanvasSubmissionAttachment[];
  submission_comments?: CanvasSubmissionComment[];
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
  created_at?: string;
  sis_user_id?: string;
  integration_id?: string | null;
  enrollments?: CanvasEnrollment[];
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
  users?: CanvasCourseUser[];
  usersAccessDenied?: boolean;
  canOpen?: boolean;
  group_category_id?: number;
  role?: string | null;
  is_public?: boolean;
  max_membership?: number | null;
};

export type CanvasGroupCreateAccess = {
  canCreate: boolean;
  groupCategoryId: number | null;
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

export type CanvasSubmissionAttachment = {
  id?: number;
  "content-type"?: string;
  display_name?: string;
  filename?: string;
  url?: string;
  size?: number;
};

export type CanvasSubmissionComment = {
  id?: number;
  author_name?: string;
  author_id?: number;
  comment?: string;
  created_at?: string;
  attachments?: CanvasSubmissionAttachment[];
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

export type CanvasDashboardData = {
  apiBase: string;
  generatedAt: string;
  profile: CanvasProfile;
  courses: CanvasCourse[];
  pastCourses: CanvasCourse[];
  todo: CanvasTodoItem[];
};

export type CanvasAppShellData = {
  apiBase: string;
  profile: CanvasProfile;
  courses: CanvasCourse[];
};

export type CanvasCourseLookupData = CanvasAppShellData & {
  pastCourses: CanvasCourse[];
};

export type CanvasSubjectShellData = CanvasCourseLookupData & {
  course: CanvasCourse | null;
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

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<PromiseSettledResult<R>>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= items.length) {
          return;
        }

        try {
          const value = await mapper(items[currentIndex]);
          results[currentIndex] = { status: "fulfilled", value };
        } catch (error) {
          results[currentIndex] = { status: "rejected", reason: error };
        }
      }
    }),
  );

  return results;
}

async function getActiveCourses(apiKey: string, apiBase: string) {
  return canvasFetch<CanvasCourse[]>(
    "/courses?per_page=24&enrollment_state=active&state[]=available&include[]=enrollments&include[]=total_scores&include[]=current_grading_period_scores",
    apiKey,
    apiBase,
  );
}

async function getCourseLookupPool(apiKey: string, apiBase: string) {
  return canvasFetch<CanvasCourse[]>(
    "/courses?per_page=100&include[]=concluded&state[]=available&state[]=completed",
    apiKey,
    apiBase,
  );
}

export async function getAppShellData(apiKey?: string, apiBase?: string): Promise<CanvasAppShellData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [profile, courses] = await Promise.all([
    canvasFetch<CanvasProfile>("/users/self/profile", resolvedApiKey, resolvedApiBase),
    getActiveCourses(resolvedApiKey, resolvedApiBase),
  ]);

  return {
    apiBase: resolvedApiBase,
    profile,
    courses,
  };
}

export async function getCourseLookupData(apiKey?: string, apiBase?: string): Promise<CanvasCourseLookupData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [profile, courses, allCourses] = await Promise.all([
    canvasFetch<CanvasProfile>("/users/self/profile", resolvedApiKey, resolvedApiBase),
    getActiveCourses(resolvedApiKey, resolvedApiBase),
    getCourseLookupPool(resolvedApiKey, resolvedApiBase),
  ]);

  const activeCourseIds = new Set(courses.map((course) => course.id));
  const pastCourses = allCourses.filter(
    (course) => !activeCourseIds.has(course.id) && (course.concluded || course.workflow_state === "completed"),
  );

  return {
    apiBase: resolvedApiBase,
    profile,
    courses,
    pastCourses,
  };
}

export async function getSubjectShellData(
  courseId: number,
  apiKey?: string,
  apiBase?: string,
): Promise<CanvasSubjectShellData> {
  const shellData = await getAppShellData(apiKey, apiBase);
  const activeCourse = shellData.courses.find((course) => course.id === courseId) ?? null;

  if (activeCourse) {
    return {
      ...shellData,
      course: activeCourse,
      pastCourses: [],
    };
  }

  const lookupData = await getCourseLookupData(apiKey, apiBase);

  return {
    ...lookupData,
    course:
      lookupData.courses.find((course) => course.id === courseId) ??
      lookupData.pastCourses.find((course) => course.id === courseId) ??
      null,
  };
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

  const submissionResults = await mapWithConcurrency(
    uniqueAssignments,
    CANVAS_FETCH_CONCURRENCY,
    async ({ courseId, assignmentId }) => {
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
    },
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
  const overdueAssignments = await mapWithConcurrency(
    courses,
    CANVAS_FETCH_CONCURRENCY,
    async (course) => {
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
    },
  );

  return overdueAssignments.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function getDashboardData(apiKey?: string, apiBase?: string): Promise<CanvasDashboardData> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const [courseLookupData, todo] = await Promise.all([
    getCourseLookupData(resolvedApiKey, resolvedApiBase),
    canvasFetch<CanvasTodoItem[]>("/users/self/todo?per_page=10", resolvedApiKey, resolvedApiBase),
  ]);
  const { courses, pastCourses, profile } = courseLookupData;
  const overdueTodo = await getOverdueTodoItems(courses, resolvedApiKey, resolvedApiBase);

  const completionMap = await getAssignmentCompletionMap(
    todo.flatMap((item) => {
      if (!item.assignment?.id || !item.assignment.course_id || item.assignment.completed) {
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
    generatedAt: new Date().toISOString(),
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

  const [assignment, submission] = await Promise.all([
    canvasFetch<CanvasAssignment>(
      `/courses/${courseId}/assignments/${assignmentId}?include[]=submission`,
      resolvedApiKey,
    ),
    canvasFetch<CanvasSubmission>(
      `/courses/${courseId}/assignments/${assignmentId}/submissions/self?include[]=submission_comments`,
      resolvedApiKey,
    ).catch(() => null),
  ]);

  return {
    ...assignment,
    submission: submission ?? assignment.submission,
  };
}

export async function submitAssignment(
  courseId: number,
  assignmentId: number,
  submission: {
    submissionType: "online_text_entry" | "online_url" | "online_upload";
    body?: string;
    url?: string;
    fileIds?: number[];
    comment?: string;
  },
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

  if (submission.submissionType === "online_upload") {
    for (const fileId of submission.fileIds ?? []) {
      params.append("submission[file_ids][]", String(fileId));
    }
  }

  if (submission.comment?.trim()) {
    params.set("comment[text_comment]", submission.comment.trim());
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

export async function addAssignmentComment(
  courseId: number,
  assignmentId: number,
  comment: string,
  apiKey?: string,
): Promise<CanvasSubmission> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const trimmedComment = comment.trim();

  if (!trimmedComment) {
    throw new Error("Comment cannot be empty");
  }

  const params = new URLSearchParams();
  params.set("comment[text_comment]", trimmedComment);

  const response = await fetch(`${resolvedApiBase}/courses/${courseId}/assignments/${assignmentId}/submissions/self`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Canvas comment submission failed (${response.status}) for assignment ${assignmentId}`);
  }

  return (await response.json()) as CanvasSubmission;
}

export async function uploadAssignmentSubmissionFiles(
  courseId: number,
  assignmentId: number,
  files: Array<{ contentType?: string; data: Buffer; name: string; size: number }>,
  apiKey?: string,
): Promise<number[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const uploadedFileIds: number[] = [];

  for (const file of files) {
    const prepResponse = await fetch(`${resolvedApiBase}/courses/${courseId}/assignments/${assignmentId}/submissions/self/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        name: file.name,
        size: String(file.size),
        ...(file.contentType ? { content_type: file.contentType } : {}),
      }).toString(),
      cache: "no-store",
    });

    if (!prepResponse.ok) {
      throw new Error(`Canvas file upload preparation failed (${prepResponse.status}) for assignment ${assignmentId}`);
    }

    const prepPayload = (await prepResponse.json()) as {
      upload_params?: Record<string, string>;
      upload_url?: string;
    };

    if (!prepPayload.upload_url) {
      throw new Error("Canvas did not return an upload URL for the file submission");
    }

    const formData = new FormData();

    for (const [key, value] of Object.entries(prepPayload.upload_params ?? {})) {
      formData.append(key, value);
    }

    formData.append(
      "file",
      new Blob([new Uint8Array(file.data)], { type: file.contentType || "application/octet-stream" }),
      file.name,
    );

    const uploadResponse = await fetch(prepPayload.upload_url, {
      method: "POST",
      body: formData,
      cache: "no-store",
      redirect: "follow",
    });

    if (!uploadResponse.ok) {
      throw new Error(`Canvas file upload failed (${uploadResponse.status}) for ${file.name}`);
    }

    const uploadPayload = (await uploadResponse.json()) as { id?: number };

    if (!uploadPayload.id || !Number.isFinite(uploadPayload.id)) {
      throw new Error(`Canvas did not return a valid file id for ${file.name}`);
    }

    uploadedFileIds.push(uploadPayload.id);
  }

  return uploadedFileIds;
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

export async function getCoursePerson(courseId: number, userId: number, apiKey?: string): Promise<CanvasCourseUser | null> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  try {
    return await canvasFetch<CanvasCourseUser>(
      `/courses/${courseId}/users/${userId}?include[]=avatar_url&include[]=enrollments`,
      resolvedApiKey,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("(404)")) {
      return null;
    }

    const people = await canvasFetch<CanvasCourseUser[]>(
      `/courses/${courseId}/users?include[]=avatar_url&include[]=enrollments&per_page=100&sort=username`,
      resolvedApiKey,
    );

    return people.find((person) => person.id === userId) ?? null;
  }
}

export async function getUserActiveCourses(userId: number, apiKey?: string): Promise<CanvasCourse[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourse[]>(
    `/users/${userId}/courses?enrollment_state=active&per_page=100`,
    resolvedApiKey,
  );
}

export async function getSharedActiveCourses(
  currentCourses: CanvasCourse[],
  userId: number,
  apiKey?: string,
): Promise<CanvasCourse[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const membershipResults = await mapWithConcurrency(
    currentCourses,
    CANVAS_FETCH_CONCURRENCY,
    async (course) => {
      const person = await getCoursePerson(course.id, userId, resolvedApiKey);

      if (!person) {
        return null;
      }

      return course;
    },
  );

  return membershipResults
    .filter((result): result is PromiseFulfilledResult<CanvasCourse | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((course): course is CanvasCourse => course != null);
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

  const groups = await canvasFetch<CanvasCourseGroup[]>(
    `/courses/${courseId}/groups?per_page=50`,
    resolvedApiKey,
  );

  const groupUsersResults = await mapWithConcurrency(
    groups,
    CANVAS_FETCH_CONCURRENCY,
    async (group) => {
      const users = await canvasFetch<CanvasCourseUser[]>(
        `/groups/${group.id}/users?include[]=avatar_url&per_page=100&sort=username`,
        resolvedApiKey,
      );

      return {
        groupId: group.id,
        users,
      };
    },
  );

  const usersByGroupId = new Map<number, CanvasCourseUser[]>();
  const accessDeniedGroupIds = new Set<number>();

  groupUsersResults.forEach((result, index) => {
    const groupId = groups[index]?.id;

    if (!groupId) {
      return;
    }

    if (result.status === "fulfilled") {
      usersByGroupId.set(result.value.groupId, result.value.users);
      return;
    }

    if (result.reason instanceof Error && result.reason.message.includes("(403)")) {
      accessDeniedGroupIds.add(groupId);
    }
  });

  return groups.map((group) => ({
    ...group,
    users: usersByGroupId.get(group.id) ?? [],
    usersAccessDenied: accessDeniedGroupIds.has(group.id),
    canOpen: usersByGroupId.has(group.id),
  }));
}

export async function getGroupDetails(groupId: number, apiKey?: string): Promise<CanvasCourseGroup> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourseGroup>(`/groups/${groupId}`, resolvedApiKey);
}

export async function getGroupUsers(groupId: number, apiKey?: string): Promise<CanvasCourseUser[]> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return canvasFetch<CanvasCourseUser[]>(
    `/groups/${groupId}/users?include[]=avatar_url&per_page=100&sort=username`,
    resolvedApiKey,
  );
}

async function probeGroupCategoryCreatePermission(groupCategoryId: number, apiKey: string, apiBase?: string) {
  const resolvedApiBase = await resolveCanvasApiBase(apiBase);
  const response = await fetch(`${resolvedApiBase}/group_categories/${groupCategoryId}/groups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "",
    cache: "no-store",
  });

  if (response.status === 400 || response.status === 422) {
    return true;
  }

  if (response.status === 401 || response.status === 403) {
    return false;
  }

  throw new Error(`Canvas group create permission probe failed (${response.status}) for category ${groupCategoryId}`);
}

export async function getCourseGroupCreateAccess(
  groups: CanvasCourseGroup[],
  apiKey?: string,
): Promise<CanvasGroupCreateAccess> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const candidateCategoryIds = Array.from(
    new Set(
      groups
        .filter((group) => typeof group.group_category_id === "number")
        .sort((left, right) => (left.role === "student_organized" ? -1 : 1) - (right.role === "student_organized" ? -1 : 1))
        .map((group) => group.group_category_id as number),
    ),
  );

  for (const groupCategoryId of candidateCategoryIds) {
    if (await probeGroupCategoryCreatePermission(groupCategoryId, resolvedApiKey)) {
      return {
        canCreate: true,
        groupCategoryId,
      };
    }
  }

  return {
    canCreate: false,
    groupCategoryId: null,
  };
}

export async function createCourseGroup(
  groups: CanvasCourseGroup[],
  input: { description?: string; name: string },
  apiKey?: string,
): Promise<CanvasCourseGroup> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const access = await getCourseGroupCreateAccess(groups, resolvedApiKey);

  if (!access.groupCategoryId) {
    throw new Error("You are not allowed to create groups in this subject.");
  }

  const resolvedApiBase = await resolveCanvasApiBase();
  const body = new URLSearchParams();
  body.set("name", input.name.trim());

  if (input.description?.trim()) {
    body.set("description", input.description.trim());
  }

  const response = await fetch(`${resolvedApiBase}/group_categories/${access.groupCategoryId}/groups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Canvas group creation failed (${response.status}) for category ${access.groupCategoryId}`);
  }

  return (await response.json()) as CanvasCourseGroup;
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
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const conversations = await rawCanvasFetch(
    "/conversations?include[]=participant_avatars",
    resolvedApiKey,
    resolvedApiBase,
  );

  return {
    conversations: conversations as CanvasConversation[],
  };
}

export async function getConversationData(
  conversationId: number,
  apiKey?: string,
): Promise<CanvasConversationDetail> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  return rawCanvasFetch(
    `/conversations/${conversationId}?auto_mark_as_read=true&include[]=participant_avatars`,
    resolvedApiKey,
    resolvedApiBase,
  );
}

export async function createConversation(
  options: {
    body: string;
    courseId: number;
    groupConversation: boolean;
    recipientIds: number[];
    subject: string;
  },
  apiKey?: string,
): Promise<CanvasConversation | null> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const params = new URLSearchParams();
  for (const recipientId of options.recipientIds) {
    params.append("recipients[]", String(recipientId));
  }
  params.set("subject", options.subject);
  params.set("body", options.body);
  params.set("context_code", `course_${options.courseId}`);
  params.set("group_conversation", String(options.groupConversation));

  if (!options.groupConversation) {
    params.set("mode", "async");
  }

  const response = await fetch(`${resolvedApiBase}/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Canvas conversation request failed (${response.status})`);
  }

  const payload = (await response.json()) as CanvasConversation | CanvasConversation[];

  if (Array.isArray(payload)) {
    return payload[0] ?? null;
  }

  return payload ?? null;
}

export async function addConversationMessage(
  conversationId: number,
  body: string,
  apiKey?: string,
): Promise<CanvasConversationDetail> {
  const resolvedApiKey = apiKey ?? envCanvasApiKey;
  const resolvedApiBase = await resolveCanvasApiBase();

  if (!resolvedApiKey) {
    throw new Error("Missing Canvas API key");
  }

  const params = new URLSearchParams();
  params.set("body", body);

  const response = await fetch(`${resolvedApiBase}/conversations/${conversationId}/add_message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Canvas add-message request failed (${response.status})`);
  }

  return (await response.json()) as CanvasConversationDetail;
}
