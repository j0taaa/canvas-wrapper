import type { CanvasCourseContent, CanvasCourseFile } from "./canvas";
import { appendSubjectRouteContext, type SubjectRouteContext } from "./subject-route-context";

export type SubjectContentKind = "assignment" | "file" | "page" | "quiz";

export type SubjectContentNavigationTarget = {
  href: string;
  identifier: number | string;
  kind: SubjectContentKind;
  title?: string;
};

type SubjectContentNavigationCurrent = {
  identifier: number | string;
  kind: SubjectContentKind;
};

function normalizePageIdentifier(identifier: string) {
  try {
    return decodeURIComponent(identifier);
  } catch {
    return identifier;
  }
}

function normalizeIdentifier(kind: SubjectContentKind, identifier: number | string) {
  if (kind === "page") {
    return normalizePageIdentifier(String(identifier));
  }

  return String(identifier);
}

function getNavigationKey(kind: SubjectContentKind, identifier: number | string) {
  return `${kind}:${normalizeIdentifier(kind, identifier)}`;
}

function getModuleItemTarget(
  courseId: number,
  item: NonNullable<CanvasCourseContent["modules"][number]["items"]>[number],
  context?: SubjectRouteContext,
): SubjectContentNavigationTarget | null {
  if (item.type === "Page" && item.page_url) {
    const identifier = normalizePageIdentifier(item.page_url);

    return {
      href: appendSubjectRouteContext(`/subjects/${courseId}/pages/${encodeURIComponent(identifier)}`, context),
      identifier,
      kind: "page",
      title: item.title,
    };
  }

  if (item.type === "File" && item.content_id) {
    return {
      href: appendSubjectRouteContext(`/subjects/${courseId}/files/${item.content_id}`, context),
      identifier: item.content_id,
      kind: "file",
      title: item.title,
    };
  }

  if (item.type === "Quiz" && item.content_id) {
    return {
      href: appendSubjectRouteContext(`/subjects/${courseId}/quizzes/${item.content_id}`, context),
      identifier: item.content_id,
      kind: "quiz",
      title: item.title,
    };
  }

  if (item.type === "Assignment" && item.content_id) {
    return {
      href: appendSubjectRouteContext(`/subjects/${courseId}/assignments/${item.content_id}`, context),
      identifier: item.content_id,
      kind: "assignment",
      title: item.title,
    };
  }

  return null;
}

export function buildSubjectContentNavigationTargets(
  courseId: number,
  content: CanvasCourseContent,
  files: CanvasCourseFile[],
  context?: SubjectRouteContext,
) {
  const targets: SubjectContentNavigationTarget[] = [];
  const seen = new Set<string>();

  const appendTarget = (target: SubjectContentNavigationTarget | null) => {
    if (!target) {
      return;
    }

    const key = getNavigationKey(target.kind, target.identifier);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    targets.push(target);
  };

  for (const module of content.modules) {
    for (const item of module.items ?? []) {
      appendTarget(getModuleItemTarget(courseId, item, context));
    }
  }

  for (const assignment of content.assignments) {
    appendTarget({
      href: appendSubjectRouteContext(`/subjects/${courseId}/assignments/${assignment.id}`, context),
      identifier: assignment.id,
      kind: "assignment",
      title: assignment.name,
    });
  }

  for (const file of files) {
    appendTarget({
      href: appendSubjectRouteContext(`/subjects/${courseId}/files/${file.id}`, context),
      identifier: file.id,
      kind: "file",
      title: file.display_name ?? file.filename,
    });
  }

  return targets;
}

export function getSubjectContentNavigation(
  courseId: number,
  content: CanvasCourseContent,
  files: CanvasCourseFile[],
  current: SubjectContentNavigationCurrent,
  context?: SubjectRouteContext,
) {
  const targets = buildSubjectContentNavigationTargets(courseId, content, files, context);
  const currentKey = getNavigationKey(current.kind, current.identifier);
  const currentIndex = targets.findIndex((target) => getNavigationKey(target.kind, target.identifier) === currentKey);

  return {
    currentIndex,
    next: currentIndex >= 0 ? (targets[currentIndex + 1] ?? null) : null,
    previous: currentIndex > 0 ? (targets[currentIndex - 1] ?? null) : null,
    targets,
  };
}
