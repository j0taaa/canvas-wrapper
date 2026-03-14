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

type WrappedCanvasLink = {
  kind: "assignment" | "file" | "forum" | "grade" | "module" | "page" | "people" | "quiz" | "subject"
  path: string
}

function buildWrappedCanvasLink(pathname: string, currentCourseId?: number): WrappedCanvasLink | null {
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
      return { kind: "subject", path: `/subjects/${courseId}` }
    }

    if (segments[2] === "pages" && segments[3]) {
      return {
        kind: "page",
        path: `/subjects/${courseId}/pages/${encodeURIComponent(segments.slice(3).join("/"))}`,
      }
    }

    if (segments[2] === "assignments" && segments[3]) {
      return { kind: "assignment", path: `/subjects/${courseId}/assignments/${segments[3]}` }
    }

    if (segments[2] === "quizzes" && segments[3]) {
      return { kind: "quiz", path: `/subjects/${courseId}/quizzes/${segments[3]}` }
    }

    if (segments[2] === "files" && segments[3]) {
      return { kind: "file", path: `/subjects/${courseId}/files/${segments[3]}` }
    }

    if (segments[2] === "modules") {
      return { kind: "module", path: `/subjects/${courseId}?tab=modules` }
    }

    if (segments[2] === "grades") {
      return { kind: "grade", path: `/subjects/${courseId}?tab=grades` }
    }

    if (segments[2] === "users") {
      return { kind: "people", path: `/subjects/${courseId}?tab=people` }
    }

    if (segments[2] === "discussion_topics") {
      return { kind: "forum", path: `/subjects/${courseId}?tab=forums` }
    }
  }

  if ((segments[0] === "files" && segments[1]) || (segments[0] === "files" && segments[2] === "download")) {
    if (!currentCourseId) {
      return null
    }

    return { kind: "file", path: `/subjects/${currentCourseId}/files/${segments[1]}` }
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

  const wrappedLink = buildWrappedCanvasLink(parsedUrl.pathname, currentCourseId)

  if (!wrappedLink) {
    return href
  }

  return `${wrappedLink.path}${parsedUrl.search}${parsedUrl.hash}`
}

function appendAnchorClass(anchorAttributes: string, className: string) {
  if (/\bclass=(["']).*?\1/i.test(anchorAttributes)) {
    return anchorAttributes.replace(/\bclass=(["'])(.*?)\1/i, (match, quote: string, existingClasses: string) => {
      const nextClasses = new Set(existingClasses.split(/\s+/).filter(Boolean))
      nextClasses.add(className)
      return `class=${quote}${Array.from(nextClasses).join(" ")}${quote}`
    })
  }

  return `${anchorAttributes} class="${className}"`
}

function appendAnchorAttribute(anchorAttributes: string, attributeName: string, attributeValue: string) {
  if (new RegExp(`\\b${attributeName}=`, "i").test(anchorAttributes)) {
    return anchorAttributes.replace(new RegExp(`\\b${attributeName}=(["']).*?\\1`, "i"), `${attributeName}="${attributeValue}"`)
  }

  return `${anchorAttributes} ${attributeName}="${attributeValue}"`
}

export function rewriteCanvasHtmlLinks(html: string, apiBase?: string, currentCourseId?: number) {
  return html.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gi, (match, beforeHref: string, quote: string, href: string, afterHref: string) => {
    const trimmedHref = href.trim()
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
      return match
    }

    const isCanvasOrigin = parsedUrl.origin === "https://canvas-wrapper.local" || (canvasOrigin != null && parsedUrl.origin === canvasOrigin)

    if (!isCanvasOrigin) {
      return match
    }

    const wrappedLink = buildWrappedCanvasLink(parsedUrl.pathname, currentCourseId)

    if (!wrappedLink) {
      return match
    }

    const rewrittenHref = `${wrappedLink.path}${parsedUrl.search}${parsedUrl.hash}`

    let nextAttributes = appendAnchorClass(`${beforeHref}${afterHref}`, "canvas-wrapper-link")
    nextAttributes = appendAnchorAttribute(nextAttributes, "data-canvas-kind", wrappedLink.kind)

    return `<a${nextAttributes} href=${quote}${rewrittenHref}${quote}>`
  })
}
