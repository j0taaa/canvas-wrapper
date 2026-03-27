type WrappedCanvasLink = {
  kind: "assignment" | "file" | "forum" | "grade" | "module" | "page" | "people" | "quiz" | "subject";
  path: string;
};

function resolveCanvasOrigin(apiBase?: string) {
  if (!apiBase) {
    return null;
  }

  try {
    return new URL(apiBase).origin;
  } catch {
    return null;
  }
}

function parseCanvasAwareUrl(value: string, apiBase?: string) {
  const canvasOrigin = resolveCanvasOrigin(apiBase);

  try {
    return {
      canvasOrigin,
      parsedUrl: canvasOrigin
        ? new URL(value, canvasOrigin)
        : new URL(value, "https://canvas-wrapper.local"),
    };
  } catch {
    return null;
  }
}

function isCanvasOriginUrl(parsedUrl: URL, canvasOrigin: string | null) {
  return parsedUrl.origin === "https://canvas-wrapper.local" || (canvasOrigin != null && parsedUrl.origin === canvasOrigin);
}

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

  const resolvedUrl = parseCanvasAwareUrl(trimmedHref, apiBase);

  if (!resolvedUrl) {
    return href;
  }

  const { canvasOrigin, parsedUrl } = resolvedUrl;
  const isCanvasOrigin = isCanvasOriginUrl(parsedUrl, canvasOrigin);

  if (!isCanvasOrigin) {
    return href;
  }

  const wrappedLink = buildWrappedCanvasLink(parsedUrl.pathname, currentCourseId);

  if (!wrappedLink) {
    return href;
  }

  return `${wrappedLink.path}${parsedUrl.search}${parsedUrl.hash}`;
}

export function rewriteCanvasEmbeddedMediaUrl(url: string, apiBase?: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return url;
  }

  return getCanvasSessionLaunchTarget(trimmedUrl, apiBase) ?? url;
}

export function getCanvasSessionLaunchTarget(url: string, apiBase?: string) {
  const resolvedUrl = parseCanvasAwareUrl(url, apiBase);

  if (!resolvedUrl) {
    return null;
  }

  const { canvasOrigin, parsedUrl } = resolvedUrl;

  if (!isCanvasOriginUrl(parsedUrl, canvasOrigin)) {
    return null;
  }

  const isExternalToolRetrieve = /^\/courses\/\d+\/external_tools\/retrieve$/i.test(parsedUrl.pathname);

  if (!isExternalToolRetrieve) {
    return null;
  }

  const nestedUrlValue = parsedUrl.searchParams.get("url");

  if (!nestedUrlValue) {
    return null;
  }

  let nestedUrl: URL;

  try {
    nestedUrl = new URL(nestedUrlValue);
  } catch {
    return null;
  }

  const mediaId = nestedUrl.searchParams.get("custom_arc_media_id");
  const launchType = nestedUrl.searchParams.get("custom_arc_launch_type");
  const isStudioLaunch =
    nestedUrl.hostname.endsWith(".instructuremedia.com") &&
    nestedUrl.pathname === "/lti/launch" &&
    launchType === "bare_embed" &&
    typeof mediaId === "string" &&
    mediaId.length > 0;

  if (!isStudioLaunch) {
    return null;
  }

  return parsedUrl.toString();
}

export function isCanvasHostedVideoUrl(url: string, apiBase?: string) {
  const resolvedUrl = parseCanvasAwareUrl(url, apiBase);

  if (!resolvedUrl) {
    return false;
  }

  const { canvasOrigin, parsedUrl } = resolvedUrl;

  if (isCanvasOriginUrl(parsedUrl, canvasOrigin) && /^\/courses\/\d+\/external_tools\/retrieve$/i.test(parsedUrl.pathname)) {
    return true;
  }

  return parsedUrl.hostname.endsWith(".instructuremedia.com");
}

export function buildCanvasSessionBootstrapHtml(sessionUrl: string, targetUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #000;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        align-items: center;
        display: flex;
        justify-content: center;
        min-height: 100vh;
      }
      p {
        font-size: 14px;
        margin: 0;
        opacity: 0.82;
      }
      iframe {
        border: 0;
        height: 0;
        left: -9999px;
        position: absolute;
        top: -9999px;
        width: 0;
      }
    </style>
  </head>
  <body>
    <p>Loading embedded media…</p>
    <script>
      const sessionUrl = ${JSON.stringify(sessionUrl)};
      const targetUrl = ${JSON.stringify(targetUrl)};
      const bootstrapFrame = document.createElement("iframe");
      let launched = false;

      function launchTarget() {
        if (launched) {
          return;
        }

        launched = true;
        window.location.replace(targetUrl);
      }

      bootstrapFrame.src = sessionUrl;
      bootstrapFrame.setAttribute("aria-hidden", "true");
      bootstrapFrame.addEventListener("load", () => {
        window.setTimeout(launchTarget, 150);
      }, { once: true });

      document.body.appendChild(bootstrapFrame);
      window.setTimeout(launchTarget, 1800);
    </script>
  </body>
</html>`;
}

export function rewriteCanvasHtmlEmbeddedMedia(html: string, apiBase?: string) {
  const rewriteSrcAttribute = (
    match: string,
    beforeSrc: string,
    quote: string,
    src: string,
    afterSrc: string,
  ) => {
    const rewrittenSrc = rewriteCanvasEmbeddedMediaUrl(src, apiBase);

    if (rewrittenSrc === src) {
      return match;
    }

    return `<iframe${beforeSrc}src=${quote}${rewrittenSrc}${quote}${afterSrc}>`;
  };

  const rewriteDataAttribute = (
    match: string,
    beforeData: string,
    quote: string,
    data: string,
    afterData: string,
  ) => {
    const rewrittenData = rewriteCanvasEmbeddedMediaUrl(data, apiBase);

    if (rewrittenData === data) {
      return match;
    }

    return `<object${beforeData}data=${quote}${rewrittenData}${quote}${afterData}>`;
  };

  return html
    .replace(/<iframe\b([^>]*?)src=(["'])(.*?)\2([^>]*)>/gi, rewriteSrcAttribute)
    .replace(/<embed\b([^>]*?)src=(["'])(.*?)\2([^>]*)>/gi, (match, beforeSrc: string, quote: string, src: string, afterSrc: string) => {
      const rewrittenSrc = rewriteCanvasEmbeddedMediaUrl(src, apiBase);

      if (rewrittenSrc === src) {
        return match;
      }

      return `<embed${beforeSrc}src=${quote}${rewrittenSrc}${quote}${afterSrc}>`;
    })
    .replace(/<object\b([^>]*?)data=(["'])(.*?)\2([^>]*)>/gi, rewriteDataAttribute);
}
