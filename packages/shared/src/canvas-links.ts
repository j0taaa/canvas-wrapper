type WrappedCanvasLink = {
  kind: "assignment" | "file" | "forum" | "grade" | "module" | "page" | "people" | "quiz" | "subject";
  path: string;
};

function buildWrappedCanvasLink(pathname: string, currentCourseId?: number): WrappedCanvasLink | null {
  const normalizedPath = pathname.replace(/\/+$/, "");

  if (!normalizedPath) {
    return null;
  }

  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments[0] === "courses" && segments[1]) {
    const courseId = Number(segments[1]);

    if (!Number.isFinite(courseId)) {
      return null;
    }

    if (segments.length === 2) {
      return { kind: "subject", path: `/subjects/${courseId}` };
    }

    if (segments[2] === "pages" && segments[3]) {
      return {
        kind: "page",
        path: `/subjects/${courseId}/pages/${encodeURIComponent(segments.slice(3).join("/"))}`,
      };
    }

    if (segments[2] === "assignments" && segments[3]) {
      return { kind: "assignment", path: `/subjects/${courseId}/assignments/${segments[3]}` };
    }

    if (segments[2] === "quizzes" && segments[3]) {
      return { kind: "quiz", path: `/subjects/${courseId}/quizzes/${segments[3]}` };
    }

    if (segments[2] === "files" && segments[3]) {
      return { kind: "file", path: `/subjects/${courseId}/files/${segments[3]}` };
    }

    if (segments[2] === "modules") {
      return { kind: "module", path: `/subjects/${courseId}?tab=modules` };
    }

    if (segments[2] === "grades") {
      return { kind: "grade", path: `/subjects/${courseId}?tab=grades` };
    }

    if (segments[2] === "users") {
      return { kind: "people", path: `/subjects/${courseId}?tab=people` };
    }

    if (segments[2] === "discussion_topics") {
      return { kind: "forum", path: `/subjects/${courseId}?tab=forums` };
    }
  }

  if ((segments[0] === "files" && segments[1]) || (segments[0] === "files" && segments[2] === "download")) {
    if (!currentCourseId) {
      return null;
    }

    return { kind: "file", path: `/subjects/${currentCourseId}/files/${segments[1]}` };
  }

  return null;
}

export function rewriteCanvasHref(href: string, apiBase?: string, currentCourseId?: number) {
  const trimmedHref = href.trim();

  if (!trimmedHref || trimmedHref.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(trimmedHref)) {
    return href;
  }

  const canvasOrigin = apiBase
    ? (() => {
        try {
          return new URL(apiBase).origin;
        } catch {
          return null;
        }
      })()
    : null;

  let parsedUrl: URL;

  try {
    parsedUrl = canvasOrigin
      ? new URL(trimmedHref, canvasOrigin)
      : new URL(trimmedHref, "https://canvas-wrapper.local");
  } catch {
    return href;
  }

  const isCanvasOrigin =
    parsedUrl.origin === "https://canvas-wrapper.local" || (canvasOrigin != null && parsedUrl.origin === canvasOrigin);

  if (!isCanvasOrigin) {
    return href;
  }

  const wrappedLink = buildWrappedCanvasLink(parsedUrl.pathname, currentCourseId);

  if (!wrappedLink) {
    return href;
  }

  return `${wrappedLink.path}${parsedUrl.search}${parsedUrl.hash}`;
}
