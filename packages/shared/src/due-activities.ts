import { CanvasAssignment, CanvasQuiz } from "./canvas";

export type SyncableDueActivity = {
  completed: boolean;
  courseId: number;
  dueAt: string;
  href: string;
  htmlUrl?: string;
  kind: "assignment" | "quiz";
  subjectName: string;
  syncKey: string;
  title: string;
};

export type SyncableAssignmentInput = {
  assignment: CanvasAssignment;
  courseId: number;
  subjectName: string;
};

export type SyncableQuizInput = {
  completed?: boolean;
  courseId: number;
  quiz: CanvasQuiz;
  subjectName: string;
};

export function buildActivitySyncKey(input: {
  assignmentId?: number | null;
  courseId: number;
  quizId?: number | null;
}) {
  if (typeof input.assignmentId === "number" && Number.isFinite(input.assignmentId)) {
    return `assignment:${input.courseId}:${input.assignmentId}`;
  }

  if (typeof input.quizId === "number" && Number.isFinite(input.quizId)) {
    return `quiz:${input.courseId}:${input.quizId}`;
  }

  throw new Error("buildActivitySyncKey requires an assignmentId or quizId");
}

export function buildSyncableDueActivities(input: {
  assignments: SyncableAssignmentInput[];
  quizzes: SyncableQuizInput[];
}) {
  const activities = new Map<string, SyncableDueActivity>();

  for (const { assignment, courseId, subjectName } of input.assignments) {
    if (!assignment.due_at) {
      continue;
    }

    activities.set(
      buildActivitySyncKey({ assignmentId: assignment.id, courseId }),
      {
        completed: Boolean(assignment.submission?.excused) ||
          ["submitted", "graded", "pending_review", "complete"].includes(assignment.submission?.workflow_state ?? ""),
        courseId,
        dueAt: assignment.due_at,
        href: `/subjects/${courseId}/assignments/${assignment.id}`,
        htmlUrl: assignment.html_url,
        kind: "assignment",
        subjectName,
        syncKey: buildActivitySyncKey({ assignmentId: assignment.id, courseId }),
        title: assignment.name,
      },
    );
  }

  for (const { completed, courseId, quiz, subjectName } of input.quizzes) {
    if (!quiz.due_at) {
      continue;
    }

    if (typeof quiz.assignment_id === "number" && Number.isFinite(quiz.assignment_id)) {
      const assignmentKey = buildActivitySyncKey({ assignmentId: quiz.assignment_id, courseId });
      const existing = activities.get(assignmentKey);

      activities.set(
        assignmentKey,
        existing ?? {
          completed: completed ?? false,
          courseId,
          dueAt: quiz.due_at,
          href: `/subjects/${courseId}/assignments/${quiz.assignment_id}`,
          htmlUrl: quiz.html_url,
          kind: "assignment",
          subjectName,
          syncKey: assignmentKey,
          title: quiz.title ?? "Untitled assignment",
        },
      );
      continue;
    }

    const quizKey = buildActivitySyncKey({ courseId, quizId: quiz.id });
    activities.set(quizKey, {
      completed: completed ?? false,
      courseId,
      dueAt: quiz.due_at,
      href: `/subjects/${courseId}/quizzes/${quiz.id}`,
      htmlUrl: quiz.html_url,
      kind: "quiz",
      subjectName,
      syncKey: quizKey,
      title: quiz.title ?? "Untitled quiz",
    });
  }

  return Array.from(activities.values()).sort((left, right) => left.dueAt.localeCompare(right.dueAt));
}
