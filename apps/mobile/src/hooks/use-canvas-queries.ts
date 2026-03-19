import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  addAssignmentComment,
  addConversationMessage,
  buildCalendarEntries,
  getAppShellData,
  getAssignmentDetails,
  getCalendarData,
  getConversationData,
  getCourseContent,
  getCourseDiscussions,
  getCourseFiles,
  getCourseGradeData,
  getCourseGroupCreateAccess,
  getCourseGroups,
  getCourseLookupData,
  getCoursePage,
  getCoursePeople,
  getCoursePerson,
  getDashboardData,
  getFileById,
  getFileContent,
  getGroupDetails,
  getGroupUsers,
  getInboxData,
  getMonthRange,
  getQuizDetails,
  getQuizQuestions,
  getSubjectShellData,
  submitAssignment,
  type CanvasAppShellData,
  type CanvasAssignment,
  type CanvasCalendarData,
  type CanvasClientConfig,
  type CanvasConversation,
  type CanvasConversationDetail,
  type CanvasCourse,
  type CanvasCourseContent,
  type CanvasCourseFile,
  type CanvasCourseGradeData,
  type CanvasCoursePage,
  type CanvasCourseUser,
  type CanvasDashboardData,
  type CanvasDiscussionTopic,
  type CanvasInboxData,
  type CanvasCourseGroup,
  type CanvasGroupCreateAccess,
  type CanvasQuiz,
  type CanvasQuizQuestion,
  type CanvasSubjectShellData,
  type CanvasSubmission,
} from "@canvas/shared";
import { queryKeys } from "../../src/lib/query-keys";
import { syncDeviceIntegrations } from "../../src/lib/device-integration-sync";
import { useCanvasSession } from "../../src/providers/canvas-session";

type SubjectQueryData = {
  content: CanvasCourseContent;
  discussions: CanvasDiscussionTopic[];
  files: CanvasCourseFile[];
  grades: CanvasCourseGradeData;
  groupCreateAccess: CanvasGroupCreateAccess;
  groups: CanvasCourseGroup[];
  people: CanvasCourseUser[];
  shell: CanvasSubjectShellData;
};

type QuizQueryData = {
  questions: CanvasQuizQuestion[];
  quiz: CanvasQuiz;
};

type FileQueryData = {
  content: Awaited<ReturnType<typeof getFileContent>> | null;
  file: CanvasCourseFile;
};

type GroupQueryData = {
  group: CanvasCourseGroup;
  members: CanvasCourseUser[];
};

type CalendarQueryData = {
  entries: ReturnType<typeof buildCalendarEntries>;
  lookup: Awaited<ReturnType<typeof getCourseLookupData>>;
};

async function fetchSubjectQueryData(courseId: number, config: CanvasClientConfig): Promise<SubjectQueryData> {
  const [shell, content, grades, people, discussions, groups, files] = await Promise.all([
    getSubjectShellData(courseId, config),
    getCourseContent(courseId, config),
    getCourseGradeData(courseId, config),
    getCoursePeople(courseId, config),
    getCourseDiscussions(courseId, config),
    getCourseGroups(courseId, config).catch(() => []),
    getCourseFiles(courseId, config).catch(() => []),
  ]);

  return {
    content,
    discussions,
    files,
    grades,
    groups,
    groupCreateAccess: await getCourseGroupCreateAccess(groups, config).catch(() => ({
      canCreate: false,
      groupCategoryId: null,
    })),
    people,
    shell,
  };
}

async function fetchCalendarQueryData(
  year: number,
  month: number,
  config: CanvasClientConfig,
): Promise<CalendarQueryData> {
  const lookup = await getCourseLookupData(config);
  const range = getMonthRange(year, month);
  const calendar = await getCalendarData(
    lookup.courses.map((course) => course.id),
    range,
    config,
  );

  return {
    entries: buildCalendarEntries(calendar),
    lookup,
  };
}

function getDashboardCourse(dashboard: CanvasDashboardData | undefined, courseId: number) {
  if (!dashboard) {
    return null;
  }

  return (
    dashboard.courses.find((course) => course.id === courseId) ??
    dashboard.pastCourses.find((course) => course.id === courseId) ??
    null
  );
}

function getSubjectPlaceholderFromCache(queryClient: QueryClient, courseId: number) {
  return queryClient.getQueryData<SubjectQueryData>(queryKeys.subject(courseId));
}

function getCourseShellPlaceholderFromCache(queryClient: QueryClient, courseId: number) {
  const exactShell = queryClient.getQueryData<CanvasSubjectShellData>(queryKeys.course(courseId));
  if (exactShell) {
    return exactShell;
  }

  const subjectData = getSubjectPlaceholderFromCache(queryClient, courseId);
  if (subjectData) {
    return subjectData.shell;
  }

  const dashboard = queryClient.getQueryData<CanvasDashboardData>(queryKeys.dashboard());
  const dashboardCourse = getDashboardCourse(dashboard, courseId);
  if (dashboard && dashboardCourse) {
    return {
      apiBase: dashboard.apiBase,
      course: dashboardCourse,
      courses: dashboard.courses,
      pastCourses: dashboard.pastCourses,
      profile: dashboard.profile,
    } satisfies CanvasSubjectShellData;
  }

  const appShell = queryClient.getQueryData<CanvasAppShellData>(queryKeys.userProfile());
  const course =
    appShell?.courses.find((candidate) => candidate.id === courseId) ??
    null;

  if (!appShell || !course) {
    return undefined;
  }

  return {
    ...appShell,
    course,
    pastCourses: [],
  } satisfies CanvasSubjectShellData;
}

function findCachedModuleItem(
  queryClient: QueryClient,
  courseId: number,
  matcher: (item: NonNullable<CanvasCourseContent["modules"][number]["items"]>[number]) => boolean,
) {
  const content =
    queryClient.getQueryData<CanvasCourseContent>(queryKeys.courseContent(courseId)) ??
    getSubjectPlaceholderFromCache(queryClient, courseId)?.content;

  for (const courseModule of content?.modules ?? []) {
    const matchedItem = courseModule.items?.find(matcher);

    if (matchedItem) {
      return matchedItem;
    }
  }

  return null;
}

function getSubjectPlaceholderData(queryClient: QueryClient, courseId: number) {
  const exact = getSubjectPlaceholderFromCache(queryClient, courseId);
  if (exact) {
    return exact;
  }

  const shell = getCourseShellPlaceholderFromCache(queryClient, courseId);
  const content = queryClient.getQueryData<CanvasCourseContent>(queryKeys.courseContent(courseId));
  const grades = queryClient.getQueryData<CanvasCourseGradeData>(queryKeys.courseGrades(courseId));
  const people = queryClient.getQueryData<CanvasCourseUser[]>(queryKeys.coursePeople(courseId));
  const discussions = queryClient.getQueryData<CanvasDiscussionTopic[]>(queryKeys.courseForums(courseId));
  const groups = queryClient.getQueryData<CanvasCourseGroup[]>(queryKeys.courseGroups(courseId));
  const files = queryClient.getQueryData<CanvasCourseFile[]>(queryKeys.courseFiles(courseId));

  if (!shell || (!content && !grades && !people && !discussions && !groups && !files)) {
    return undefined;
  }

  return {
    content: content ?? {
      assignments: [],
      courseId,
      modules: [],
    },
    discussions: discussions ?? [],
    files: files ?? [],
    grades: grades ?? {
      assignments: [],
      enrollment: null,
    },
    groupCreateAccess: {
      canCreate: false,
      groupCategoryId: null,
    },
    groups: groups ?? [],
    people: people ?? [],
    shell,
  } satisfies SubjectQueryData;
}

function getAssignmentPlaceholderData(queryClient: QueryClient, courseId: number, assignmentId: number) {
  const exact = queryClient.getQueryData<CanvasAssignment>(queryKeys.assignment(courseId, assignmentId));
  if (exact) {
    return exact;
  }

  const subjectData = getSubjectPlaceholderData(queryClient, courseId);
  return (
    subjectData?.content.assignments.find((assignment) => assignment.id === assignmentId) ??
    undefined
  );
}

function getQuizPlaceholderData(queryClient: QueryClient, courseId: number, quizId: number) {
  const exact = queryClient.getQueryData<QuizQueryData>(queryKeys.quiz(courseId, quizId));
  if (exact) {
    return exact;
  }

  const moduleItem = findCachedModuleItem(
    queryClient,
    courseId,
    (item) => item.type === "Quiz" && item.content_id === quizId,
  );

  if (!moduleItem) {
    return undefined;
  }

  return {
    questions: [],
    quiz: {
      id: quizId,
      html_url: moduleItem.html_url,
      title: moduleItem.title ?? "Untitled quiz",
    },
  } satisfies QuizQueryData;
}

function getPagePlaceholderData(queryClient: QueryClient, courseId: number, pageId: string) {
  const exact = queryClient.getQueryData<CanvasCoursePage>(queryKeys.page(courseId, pageId));
  if (exact) {
    return exact;
  }

  const normalizedPageId = decodeURIComponent(pageId);
  const moduleItem = findCachedModuleItem(
    queryClient,
    courseId,
    (item) => item.type === "Page" && item.page_url === normalizedPageId,
  );

  if (!moduleItem) {
    return undefined;
  }

  return {
    html_url: moduleItem.html_url,
    title: moduleItem.title ?? "Untitled page",
    url: normalizedPageId,
  } satisfies CanvasCoursePage;
}

function getFilePlaceholderData(queryClient: QueryClient, courseId: number, fileId: number) {
  const exact = queryClient.getQueryData<FileQueryData>(queryKeys.file(courseId, fileId));
  if (exact) {
    return exact;
  }

  const subjectData = getSubjectPlaceholderData(queryClient, courseId);
  const file =
    subjectData?.files.find((candidate) => candidate.id === fileId) ??
    undefined;

  if (!file) {
    return undefined;
  }

  return {
    content: null,
    file,
  } satisfies FileQueryData;
}

function getPersonPlaceholderData(queryClient: QueryClient, courseId: number, personId: number) {
  const exact = queryClient.getQueryData<CanvasCourseUser>(queryKeys.person(courseId, personId));
  if (exact) {
    return exact;
  }

  const subjectData = getSubjectPlaceholderData(queryClient, courseId);
  return (
    subjectData?.people.find((candidate) => candidate.id === personId) ??
    undefined
  );
}

function getGroupPlaceholderData(queryClient: QueryClient, courseId: number, groupId: number) {
  const exact = queryClient.getQueryData<GroupQueryData>(queryKeys.group(courseId, groupId));
  if (exact) {
    return exact;
  }

  const subjectData = getSubjectPlaceholderData(queryClient, courseId);
  const group =
    subjectData?.groups.find((candidate) => candidate.id === groupId) ??
    undefined;

  if (!group) {
    return undefined;
  }

  return {
    group,
    members: group.users ?? [],
  } satisfies GroupQueryData;
}

function getConversationPlaceholderData(queryClient: QueryClient, conversationId: number) {
  const exact = queryClient.getQueryData<CanvasConversationDetail>(queryKeys.conversation(conversationId));
  if (exact) {
    return exact;
  }

  const inbox = queryClient.getQueryData<CanvasInboxData>(queryKeys.inbox());
  const conversation =
    inbox?.conversations.find((candidate) => candidate.id === conversationId) ??
    undefined;

  if (!conversation) {
    return undefined;
  }

  return {
    ...conversation,
    messages: [],
    participants: conversation.participants ?? [],
  } satisfies CanvasConversationDetail;
}

export async function primeAppShellQuery(queryClient: QueryClient, config: CanvasClientConfig) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: () => getAppShellData(config),
    staleTime: 5 * 60 * 1000,
  });
}

export async function primeInboxQuery(queryClient: QueryClient, config: CanvasClientConfig) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.inbox(),
    queryFn: () => getInboxData(config),
    staleTime: 5 * 60 * 1000,
  });
}

export async function primeCalendarQuery(
  queryClient: QueryClient,
  config: CanvasClientConfig,
  year: number,
  month: number,
) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.calendar(year, month),
    queryFn: () => fetchCalendarQueryData(year, month, config),
    staleTime: 5 * 60 * 1000,
  });
}

export async function primeAssignmentQuery(
  queryClient: QueryClient,
  config: CanvasClientConfig,
  courseId: number,
  assignmentId: number,
) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.assignment(courseId, assignmentId),
    queryFn: () => getAssignmentDetails(courseId, assignmentId, config),
    staleTime: 5 * 60 * 1000,
  });
}

export async function primeSubjectQueries(
  queryClient: QueryClient,
  config: CanvasClientConfig,
  courseId: number,
) {
  const data = await queryClient.fetchQuery({
    queryKey: queryKeys.subject(courseId),
    queryFn: () => fetchSubjectQueryData(courseId, config),
    staleTime: 5 * 60 * 1000,
  });

  queryClient.setQueryData(queryKeys.course(courseId), data.shell);
  queryClient.setQueryData(queryKeys.courseContent(courseId), data.content);
  queryClient.setQueryData(queryKeys.courseGrades(courseId), data.grades);
  queryClient.setQueryData(queryKeys.coursePeople(courseId), data.people);
  queryClient.setQueryData(queryKeys.courseForums(courseId), data.discussions);
  queryClient.setQueryData(queryKeys.courseGroups(courseId), data.groups);
  queryClient.setQueryData(queryKeys.courseFiles(courseId), data.files);

  return data;
}

export function useDashboard(enabled = true) {
  const { config } = useCanvasSession();

  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => getDashboardData(config!),
    enabled: enabled && !!config,
  });
}

export function useAppShell(enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: () => getAppShellData(config!),
    enabled: enabled && !!config,
    placeholderData: () => {
      const exact = queryClient.getQueryData<CanvasAppShellData>(queryKeys.userProfile());
      if (exact) {
        return exact;
      }

      const dashboard = queryClient.getQueryData<CanvasDashboardData>(queryKeys.dashboard());
      if (!dashboard) {
        return undefined;
      }

      return {
        apiBase: dashboard.apiBase,
        courses: dashboard.courses,
        profile: dashboard.profile,
      } satisfies CanvasAppShellData;
    },
  });
}

export function useCourseContent(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.courseContent(courseId),
    queryFn: () => getCourseContent(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () =>
      queryClient.getQueryData<CanvasCourseContent>(queryKeys.courseContent(courseId)) ??
      getSubjectPlaceholderData(queryClient, courseId)?.content,
  });
}

export function useCourseFiles(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.courseFiles(courseId),
    queryFn: () => getCourseFiles(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () =>
      queryClient.getQueryData<CanvasCourseFile[]>(queryKeys.courseFiles(courseId)) ??
      getSubjectPlaceholderData(queryClient, courseId)?.files,
  });
}

export function useCoursePeople(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.coursePeople(courseId),
    queryFn: () => getCoursePeople(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () =>
      queryClient.getQueryData<CanvasCourseUser[]>(queryKeys.coursePeople(courseId)) ??
      getSubjectPlaceholderData(queryClient, courseId)?.people,
  });
}

export function useCourseGrades(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.courseGrades(courseId),
    queryFn: () => getCourseGradeData(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () =>
      queryClient.getQueryData<CanvasCourseGradeData>(queryKeys.courseGrades(courseId)) ??
      getSubjectPlaceholderData(queryClient, courseId)?.grades,
  });
}

export function useCourseForums(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.courseForums(courseId),
    queryFn: () => getCourseDiscussions(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () =>
      queryClient.getQueryData<CanvasDiscussionTopic[]>(queryKeys.courseForums(courseId)) ??
      getSubjectPlaceholderData(queryClient, courseId)?.discussions,
  });
}

export function useCourseGroups(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.courseGroups(courseId),
    queryFn: () => getCourseGroups(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () =>
      queryClient.getQueryData<CanvasCourseGroup[]>(queryKeys.courseGroups(courseId)) ??
      getSubjectPlaceholderData(queryClient, courseId)?.groups,
  });
}

export function useCourseShell(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => getSubjectShellData(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () => getCourseShellPlaceholderFromCache(queryClient, courseId),
  });
}

export function useSubject(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.subject(courseId),
    queryFn: () => fetchSubjectQueryData(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: () => getSubjectPlaceholderData(queryClient, courseId),
  });
}

export function useAssignment(
  courseId: number,
  assignmentId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.assignment(courseId, assignmentId),
    queryFn: () => getAssignmentDetails(courseId, assignmentId, config!),
    enabled: enabled && !!config && !!courseId && !!assignmentId,
    placeholderData: () => getAssignmentPlaceholderData(queryClient, courseId, assignmentId),
  });
}

export function useQuiz(
  courseId: number,
  quizId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.quiz(courseId, quizId),
    queryFn: async () => {
      const [quiz, questions] = await Promise.all([
        getQuizDetails(courseId, quizId, config!),
        getQuizQuestions(courseId, quizId, config!),
      ]);
      return { quiz, questions };
    },
    enabled: enabled && !!config && !!courseId && !!quizId,
    placeholderData: () => getQuizPlaceholderData(queryClient, courseId, quizId),
  });
}

export function useFile(
  courseId: number,
  fileId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery<FileQueryData>({
    queryKey: queryKeys.file(courseId, fileId),
    queryFn: async (): Promise<FileQueryData> => {
      const file = await getFileById(fileId, config!);
      const content = await getFileContent(fileId, config!);
      return { file, content };
    },
    enabled: enabled && !!config && !!fileId,
    placeholderData: () => getFilePlaceholderData(queryClient, courseId, fileId),
  });
}

export function usePage(
  courseId: number,
  pageId: string,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.page(courseId, pageId),
    queryFn: () => getCoursePage(courseId, pageId, config!),
    enabled: enabled && !!config && !!courseId && !!pageId,
    placeholderData: () => getPagePlaceholderData(queryClient, courseId, pageId),
  });
}

export function usePerson(
  courseId: number,
  personId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.person(courseId, personId),
    queryFn: () => getCoursePerson(courseId, personId, config!),
    enabled: enabled && !!config && !!courseId && !!personId,
    placeholderData: () => getPersonPlaceholderData(queryClient, courseId, personId),
  });
}

export function useGroup(
  courseId: number,
  groupId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.group(courseId, groupId),
    queryFn: async () => {
      const group = await getGroupDetails(groupId, config!);
      const members = await getGroupUsers(groupId, config!);
      return { group, members };
    },
    enabled: enabled && !!config && !!groupId,
    placeholderData: () => getGroupPlaceholderData(queryClient, courseId, groupId),
  });
}

export function useInbox(enabled = true) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.inbox(),
    queryFn: () => getInboxData(config!),
    enabled: enabled && !!config,
    placeholderData: () => queryClient.getQueryData<CanvasInboxData>(queryKeys.inbox()),
  });
}

export function useConversation(
  conversationId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: () => getConversationData(conversationId, config!),
    enabled: enabled && !!config && !!conversationId,
    placeholderData: () => getConversationPlaceholderData(queryClient, conversationId),
  });
}

export function useCalendar(
  year: number,
  month: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.calendar(year, month),
    queryFn: () => fetchCalendarQueryData(year, month, config!),
    enabled: enabled && !!config,
    placeholderData: () =>
      queryClient.getQueryData<CalendarQueryData>(queryKeys.calendar(year, month)),
  });
}

export function useSubmitAssignment() {
  const queryClient = useQueryClient();
  const { config } = useCanvasSession();

  return useMutation({
    mutationFn: ({
      courseId,
      assignmentId,
      submission,
    }: {
      courseId: number;
      assignmentId: number;
      submission: {
        submissionType: "online_text_entry" | "online_url" | "online_upload";
        body?: string;
        url?: string;
        fileIds?: number[];
        comment?: string;
      };
    }) =>
      submitAssignment(
        courseId,
        assignmentId,
        submission,
        config!,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignment(variables.courseId, variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.subject(variables.courseId),
      });

      if (config) {
        void syncDeviceIntegrations({
          config,
          queryClient,
          reason: "assignment-submitted",
        });
      }
    },
  });
}

export function useAddAssignmentComment() {
  const queryClient = useQueryClient();
  const { config } = useCanvasSession();

  return useMutation({
    mutationFn: ({
      courseId,
      assignmentId,
      comment,
    }: {
      courseId: number;
      assignmentId: number;
      comment: string;
    }) => addAssignmentComment(courseId, assignmentId, comment, config!),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignment(variables.courseId, variables.assignmentId),
      });
    },
  });
}

export function useSendReply() {
  const queryClient = useQueryClient();
  const { config } = useCanvasSession();

  return useMutation({
    mutationFn: ({
      conversationId,
      body,
    }: {
      conversationId: number;
      body: string;
    }) => addConversationMessage(conversationId, body, config!),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inbox(),
      });
    },
  });
}
