import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getSubjectColorPalette } from "@canvas/shared"
export { formatSubjectName, getSubjectColorHex } from "@canvas/shared"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dueDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
})

const shortDueDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
})

export function formatDueDate(value?: string) {
  if (!value) {
    return "No due date"
  }

  return dueDateFormatter.format(new Date(value))
}

export function formatDueDateShort(value?: string) {
  if (!value) {
    return "No due date"
  }

  return shortDueDateFormatter.format(new Date(value))
}

export function getSubjectColorStyle(name?: string | null, preferredColor?: string | null) {
  return getSubjectColorPalette(name, preferredColor)
}

function buildWrappedCanvasPath(pathname: string, currentCourseId?: number) {
  const normalizedPath = pathname.replace(/\/+$/, "")

  if (!normalizedPath) {
    return null
  }

  const segments = normalizedPath.split("/").filter(Boolean)

  if (segments[0] === "courses" && segments[1]) {
    const courseId = Number(segments[1])

    if (!Number.isFinite(courseId)) {
      return null
    }

    if (segments.length === 2) {
      return `/subjects/${courseId}`
    }

    if (segments[2] === "pages" && segments[3]) {
      return `/subjects/${courseId}/pages/${encodeURIComponent(segments.slice(3).join("/"))}`
    }

    if (segments[2] === "assignments" && segments[3]) {
      return `/subjects/${courseId}/assignments/${segments[3]}`
    }

    if (segments[2] === "quizzes" && segments[3]) {
      return `/subjects/${courseId}/quizzes/${segments[3]}`
    }

    if (segments[2] === "files" && segments[3]) {
      return `/subjects/${courseId}/files/${segments[3]}`
    }

    if (segments[2] === "modules") {
      return `/subjects/${courseId}?tab=modules`
    }

    if (segments[2] === "grades") {
      return `/subjects/${courseId}?tab=grades`
    }

    if (segments[2] === "users") {
      return `/subjects/${courseId}?tab=people`
    }

    if (segments[2] === "discussion_topics") {
      return `/subjects/${courseId}?tab=forums`
    }
  }

  if ((segments[0] === "files" && segments[1]) || (segments[0] === "files" && segments[2] === "download")) {
    if (!currentCourseId) {
      return null
    }

    return `/subjects/${currentCourseId}/files/${segments[1]}`
  }

  return null
}

export function rewriteCanvasHref(href: string, apiBase?: string, currentCourseId?: number) {
  const trimmedHref = href.trim()

  if (!trimmedHref || trimmedHref.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(trimmedHref)) {
    return href
  }

  const canvasOrigin = apiBase
    ? (() => {
        try {
          return new URL(apiBase).origin
        } catch {
          return null
        }
      })()
    : null

  let parsedUrl: URL

  try {
    parsedUrl = canvasOrigin
      ? new URL(trimmedHref, canvasOrigin)
      : new URL(trimmedHref, "https://canvas-wrapper.local")
  } catch {
    return href
  }

  const isCanvasOrigin = parsedUrl.origin === "https://canvas-wrapper.local" || (canvasOrigin != null && parsedUrl.origin === canvasOrigin)

  if (!isCanvasOrigin) {
    return href
  }

  const wrappedPath = buildWrappedCanvasPath(parsedUrl.pathname, currentCourseId)

  if (!wrappedPath) {
    return href
  }

  return `${wrappedPath}${parsedUrl.search}${parsedUrl.hash}`
}

export function rewriteCanvasHtmlLinks(html: string, apiBase?: string, currentCourseId?: number) {
  return html.replace(/href=(["'])(.*?)\1/gi, (match, quote: string, href: string) => {
    const rewrittenHref = rewriteCanvasHref(href, apiBase, currentCourseId)

    if (rewrittenHref === href) {
      return match
    }

    return `href=${quote}${rewrittenHref}${quote}`
  })
}
