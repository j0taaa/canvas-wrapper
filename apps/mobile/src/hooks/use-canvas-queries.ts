import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardData,
  getCourseContent,
  getCourseFiles,
  getCoursePeople,
  getCourseGradeData,
  getCourseDiscussions,
  getCourseGroups,
  getCoursePage,
  getAssignmentDetails,
  getQuizDetails,
  getQuizQuestions,
  getFileById,
  getFileContent,
  getCoursePerson,
  getGroupDetails,
  getGroupUsers,
  getInboxData,
  getConversationData,
  getCalendarData,
  getCourseLookupData,
  buildCalendarEntries,
  getMonthRange,
  submitAssignment,
  addAssignmentComment,
  addConversationMessage,
  type CanvasClientConfig,
  type CanvasDashboardData,
  type CanvasCourseContent,
  type CanvasCourseFile,
  type CanvasCourseUser,
  type CanvasCourseGradeData,
  type CanvasDiscussionTopic,
  type CanvasCourseGroup,
  type CanvasAssignment,
  type CanvasQuiz,
  type CanvasInboxData,
  type CanvasConversation,
  type CanvasCalendarData,
  type CanvasCourseLookupData,
} from "@canvas/shared";
import { queryKeys } from "../../src/lib/query-keys";
import { useCanvasSession } from "../../src/providers/canvas-session";

export function useDashboard(enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => getDashboardData(config!),
    enabled: enabled && !!config,
    placeholderData: (previousData) => previousData,
  });
}

export function useCourseContent(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.courseContent(courseId),
    queryFn: () => getCourseContent(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCourseFiles(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.courseFiles(courseId),
    queryFn: () => getCourseFiles(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCoursePeople(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.coursePeople(courseId),
    queryFn: () => getCoursePeople(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCourseGrades(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.courseGrades(courseId),
    queryFn: () => getCourseGradeData(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCourseForums(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.courseForums(courseId),
    queryFn: () => getCourseDiscussions(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCourseGroups(courseId: number, enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.courseGroups(courseId),
    queryFn: () => getCourseGroups(courseId, config!),
    enabled: enabled && !!config && !!courseId,
    placeholderData: (previousData) => previousData,
  });
}

export function useAssignment(
  courseId: number,
  assignmentId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.assignment(courseId, assignmentId),
    queryFn: () => getAssignmentDetails(courseId, assignmentId, config!),
    enabled: enabled && !!config && !!courseId && !!assignmentId,
    placeholderData: (previousData) => previousData,
  });
}

export function useQuiz(
  courseId: number,
  quizId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
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
    placeholderData: (previousData) => previousData,
  });
}

export function useFile(
  courseId: number,
  fileId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.file(courseId, fileId),
    queryFn: async () => {
      const file = await getFileById(fileId, config!);
      const content = await getFileContent(fileId, config!);
      return { file, content };
    },
    enabled: enabled && !!config && !!fileId,
    placeholderData: (previousData) => previousData,
  });
}

export function usePage(
  courseId: number,
  pageId: string,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.page(courseId, pageId),
    queryFn: () => getCoursePage(courseId, pageId, config!),
    enabled: enabled && !!config && !!courseId && !!pageId,
    placeholderData: (previousData) => previousData,
  });
}

export function usePerson(
  courseId: number,
  personId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.person(courseId, personId),
    queryFn: () => getCoursePerson(courseId, personId, config!),
    enabled: enabled && !!config && !!courseId && !!personId,
    placeholderData: (previousData) => previousData,
  });
}

export function useGroup(
  courseId: number,
  groupId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.group(courseId, groupId),
    queryFn: async () => {
      const group = await getGroupDetails(groupId, config!);
      const members = await getGroupUsers(groupId, config!);
      return { group, members };
    },
    enabled: enabled && !!config && !!groupId,
    placeholderData: (previousData) => previousData,
  });
}

export function useInbox(enabled = true) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.inbox(),
    queryFn: () => getInboxData(config!),
    enabled: enabled && !!config,
    placeholderData: (previousData) => previousData,
  });
}

export function useConversation(
  conversationId: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: () => getConversationData(conversationId, config!),
    enabled: enabled && !!config && !!conversationId,
    placeholderData: (previousData) => previousData,
  });
}

export function useCalendar(
  year: number,
  month: number,
  enabled = true,
) {
  const { config } = useCanvasSession();
  return useQuery({
    queryKey: queryKeys.calendar(year, month),
    queryFn: async () => {
      const lookup = await getCourseLookupData(config!);
      const range = getMonthRange(year, month);
      const calendar = await getCalendarData(
        lookup.courses.map((course) => course.id),
        range,
        config!,
      );
      return {
        entries: buildCalendarEntries(calendar),
        lookup,
      };
    },
    enabled: enabled && !!config,
    placeholderData: (previousData) => previousData,
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
