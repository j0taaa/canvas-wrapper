import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  formatDate as formatLocalizedDate,
  getCanvasSessionLaunchTarget,
  isCanvasHostedVideoUrl,
  formatDueDate as formatLocalizedDueDate,
  formatDueDateShort as formatLocalizedDueDateShort,
  getSubjectColorPalette,
  t,
  type AppLocale,
} from "@canvas/shared"
export { formatSubjectName, getSubjectColorHex, orderSubjectsByPreference } from "@canvas/shared"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isLocale(value?: string | null): value is AppLocale {
  return value === "en" || value === "pt-BR"
}

export function formatDueDate(localeOrValue?: AppLocale | string, maybeValue?: string) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en"
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue

  return formatLocalizedDueDate(locale, value)
}

export function formatDate(localeOrValue?: AppLocale | string, maybeValue?: string) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en"
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue

  return formatLocalizedDate(locale, value)
}

export function formatDueDateShort(localeOrValue?: AppLocale | string, maybeValue?: string) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en"
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue

  return formatLocalizedDueDateShort(locale, value)
}

export function getSubjectColorStyle(name?: string | null, preferredColor?: string | null) {
  return getSubjectColorPalette(name, preferredColor)
}

export function formatGroupJoinLevel(localeOrValue?: AppLocale | string | null, maybeValue?: string | null) {
  const locale = isLocale(localeOrValue) ? localeOrValue : "en"
  const value = isLocale(localeOrValue) ? maybeValue : localeOrValue

  if (!value) {
    return t(locale, "common.managed")
  }

  const normalized = value.replace(/[_-]+/g, " ").trim()

  if (!normalized) {
    return t(locale, "common.managed")
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
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

function getVisibleHtmlText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildEmbeddedMediaFallbackHtml(targetHref: string, locale: AppLocale) {
  return `<div style="margin: 1rem 0; overflow: hidden; border: 1px solid rgba(15,23,42,0.1); border-radius: 22px; background: linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.96) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);">
  <div style="padding: 1rem 1rem 0.85rem 1rem; border-bottom: 1px solid rgba(15,23,42,0.08);">
    <div style="display: inline-flex; align-items: center; border-radius: 999px; background: rgba(15,23,42,0.06); padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">${escapeHtml(t(locale, "subjects.canvasVideo"))}</div>
    <p style="margin: 0.85rem 0 0 0; font-size: 1rem; font-weight: 700; line-height: 1.4; color: rgb(15,23,42);">${escapeHtml(t(locale, "subjects.canvasVideoUnavailable"))}</p>
    <p style="margin: 0.45rem 0 0 0; font-size: 0.92rem; line-height: 1.55; color: rgba(15,23,42,0.72);">${escapeHtml(t(locale, "subjects.canvasVideoOpenOriginal"))}</p>
  </div>
  <div style="padding: 0.9rem 1rem 1rem 1rem;">
    <a href="${escapeHtml(targetHref)}" target="_blank" rel="noreferrer" data-embed-fallback-link="true" style="display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid rgba(15,23,42,0.14); padding: 0.7rem 1rem; color: rgb(15,23,42); text-decoration: none; font-weight: 700; background: #ffffff;">${escapeHtml(t(locale, "subjects.openInCanvas"))}</a>
  </div>
</div>`
}

function rewriteCanvasHtmlEmbeddedMediaForWebWithFallback(html: string, apiBase?: string, embeddedMediaFallbackHref?: string, locale: AppLocale = "en") {
  const rewriteMediaAttribute = () => (
    match: string,
    _quote: string,
    rawUrl: string,
  ) => {
    const launchTarget = getCanvasSessionLaunchTarget(rawUrl, apiBase) ?? (isCanvasHostedVideoUrl(rawUrl, apiBase) ? rawUrl : null)

    if (!launchTarget) {
      return match
    }

    return buildEmbeddedMediaFallbackHtml(embeddedMediaFallbackHref ?? launchTarget, locale)
  }

  return html
    .replace(/<iframe\b[^>]*?src=(["'])(.*?)\1[^>]*?>[\s\S]*?<\/iframe>/gi, rewriteMediaAttribute())
    .replace(/<embed\b[^>]*?src=(["'])(.*?)\1[^>]*?>/gi, rewriteMediaAttribute())
    .replace(/<object\b[^>]*?data=(["'])(.*?)\1[^>]*?>[\s\S]*?<\/object>/gi, rewriteMediaAttribute())
    .replace(/<video\b[^>]*?src=(["'])(.*?)\1[^>]*?>[\s\S]*?<\/video>/gi, rewriteMediaAttribute())
    .replace(/<source\b[^>]*?src=(["'])(.*?)\1[^>]*?>/gi, rewriteMediaAttribute())
}

export function rewriteCanvasHtmlLinks(html: string, apiBase?: string, currentCourseId?: number, embeddedMediaFallbackHref?: string, locale: AppLocale = "en") {
  return rewriteCanvasHtmlEmbeddedMediaForWebWithFallback(html, apiBase, embeddedMediaFallbackHref, locale).replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi, (match, beforeHref: string, quote: string, href: string, afterHref: string, innerHtml: string) => {
    if (`${beforeHref}${afterHref}`.includes("data-embed-fallback-link=")) {
      return match
    }

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

    if (wrappedLink.kind === "file" && !getVisibleHtmlText(innerHtml)) {
      return ""
    }

    const rewrittenHref = `${wrappedLink.path}${parsedUrl.search}${parsedUrl.hash}`

    let nextAttributes = appendAnchorClass(`${beforeHref}${afterHref}`, "canvas-wrapper-link")
    nextAttributes = appendAnchorAttribute(nextAttributes, "data-canvas-kind", wrappedLink.kind)

    return `<a${nextAttributes} href=${quote}${rewrittenHref}${quote}>${innerHtml}</a>`
  })
}
