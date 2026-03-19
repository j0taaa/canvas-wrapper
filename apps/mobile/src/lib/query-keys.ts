export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  bootstrap: () => ["bootstrap"] as const,
  
  course: (courseId: number) => ["course", courseId] as const,
  subject: (courseId: number) => ["course", courseId, "subject"] as const,
  courseContent: (courseId: number) => ["course", courseId, "content"] as const,
  courseFiles: (courseId: number) => ["course", courseId, "files"] as const,
  coursePeople: (courseId: number) => ["course", courseId, "people"] as const,
  courseGrades: (courseId: number) => ["course", courseId, "grades"] as const,
  courseForums: (courseId: number) => ["course", courseId, "forums"] as const,
  courseGroups: (courseId: number) => ["course", courseId, "groups"] as const,
  coursePages: (courseId: number) => ["course", courseId, "pages"] as const,
  
  assignment: (courseId: number, assignmentId: number) =>
    ["assignment", courseId, assignmentId] as const,
  assignmentSubmission: (courseId: number, assignmentId: number) =>
    ["assignment", courseId, assignmentId, "submission"] as const,
  
  quiz: (courseId: number, quizId: number) =>
    ["quiz", courseId, quizId] as const,
  
  file: (courseId: number, fileId: number) =>
    ["file", courseId, fileId] as const,
  
  page: (courseId: number, pageId: string) =>
    ["page", courseId, pageId] as const,
  
  person: (courseId: number, personId: number) =>
    ["person", courseId, personId] as const,
  
  group: (courseId: number, groupId: number) =>
    ["group", courseId, groupId] as const,
  
  inbox: () => ["inbox"] as const,
  conversation: (conversationId: number) =>
    ["conversation", conversationId] as const,
  
  calendar: (year: number, month: number) =>
    ["calendar", year, month] as const,
  calendarDay: (year: number, month: number, day: number) =>
    ["calendar", year, month, day] as const,
  
  userProfile: () => ["user", "profile"] as const,
  userSettings: () => ["user", "settings"] as const,
  
  bookmarks: () => ["bookmarks"] as const,
};
