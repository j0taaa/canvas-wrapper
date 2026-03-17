import type {
  CanvasAssignment,
  CanvasCourseContent,
  CanvasCourseGradeData,
  CanvasCourseFile,
  CanvasCourseUser,
  CanvasDiscussionTopic,
  CanvasInboxData,
} from "@/lib/canvas";
import type { CalendarEntry } from "@/lib/calendar";

export const CANVAS_BOOTSTRAP_STORAGE = "canvasBootstrapData";

export type CanvasBootstrapData = {
  assignments: Record<string, CanvasAssignment>;
  calendar: {
    entries: CalendarEntry[];
    month: number;
    monthLabel: string;
    year: number;
  };
  courses: Record<string, {
    content: CanvasCourseContent;
    files: CanvasCourseFile[];
    forums: CanvasDiscussionTopic[];
    grades: CanvasCourseGradeData;
    people: CanvasCourseUser[];
  }>;
  generatedAt: string;
  inbox: CanvasInboxData;
};

export function getAssignmentCacheKey(courseId: number, assignmentId: number) {
  return `${courseId}:${assignmentId}`;
}
