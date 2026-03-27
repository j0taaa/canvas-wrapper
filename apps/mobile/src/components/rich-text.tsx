import { useMemo } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import RenderHTML, { HTMLElementModel, HTMLContentModel } from "react-native-render-html";
import { WebView } from "react-native-webview";
import {
  getCanvasSessionLaunchTarget,
  isCanvasHostedVideoUrl,
  rewriteCanvasHref,
  rewriteCanvasHtmlEmbeddedMedia,
} from "@canvas/shared";
import { openAppHref, openCanvasUrl } from "../lib/navigation";
import { useAppPreferences } from "../providers/app-preferences";

const customHTMLElementModels = {
  embed: HTMLElementModel.fromCustomModel({
    contentModel: HTMLContentModel.block,
    tagName: "embed",
  }),
  iframe: HTMLElementModel.fromCustomModel({
    contentModel: HTMLContentModel.block,
    tagName: "iframe",
  }),
  object: HTMLElementModel.fromCustomModel({
    contentModel: HTMLContentModel.block,
    tagName: "object",
  }),
  video: HTMLElementModel.fromCustomModel({
    contentModel: HTMLContentModel.block,
    tagName: "video",
  }),
  source: HTMLElementModel.fromCustomModel({
    contentModel: HTMLContentModel.block,
    tagName: "source",
  }),
};

function getEmbedHeight(attributes: Record<string, string | undefined>) {
  const explicitHeight = Number(attributes.height);

  if (Number.isFinite(explicitHeight) && explicitHeight > 0) {
    return Math.min(Math.max(explicitHeight, 180), 480);
  }

  const styleHeight = attributes.style?.match(/height:\s*(\d+)px/i)?.[1];
  const parsedStyleHeight = Number(styleHeight);

  if (Number.isFinite(parsedStyleHeight) && parsedStyleHeight > 0) {
    return Math.min(Math.max(parsedStyleHeight, 180), 480);
  }

  return 240;
}

function EmbeddedMedia({
  fallbackCanvasUrl,
  providerUrl,
  resolvedTheme,
  sourceUrl,
  targetHeight,
}: {
  fallbackCanvasUrl?: string;
  providerUrl?: string;
  resolvedTheme: "dark" | "light";
  sourceUrl: string;
  targetHeight: number;
}) {
  const sessionLaunchTarget = useMemo(
    () => getCanvasSessionLaunchTarget(sourceUrl, providerUrl),
    [providerUrl, sourceUrl],
  );
  const shouldFallbackToCanvas = useMemo(
    () => Boolean(sessionLaunchTarget) || isCanvasHostedVideoUrl(sourceUrl, providerUrl),
    [providerUrl, sessionLaunchTarget, sourceUrl],
  );
  const targetUrl = fallbackCanvasUrl ?? sessionLaunchTarget ?? sourceUrl;

  if (shouldFallbackToCanvas) {
    return (
      <View style={[styles.embedContainer, styles.embedFallbackButton]}>
        <View style={[styles.embedBadge, { backgroundColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }]}>
          <Text style={[styles.embedBadgeText, { color: resolvedTheme === "dark" ? "#e2e8f0" : "#0f172a" }]}>
            Canvas video
          </Text>
        </View>
        <Text style={[styles.embedTitle, { color: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a" }]}>
          This video can't be played inside Janvas.
        </Text>
        <Text style={[styles.embedStatus, { color: resolvedTheme === "dark" ? "#cbd5e1" : "#334155" }]}>
          Open the original Canvas page to watch it in the official player.
        </Text>
        <Pressable
          onPress={() => void openCanvasUrl(targetUrl)}
          style={[styles.embedAction, {
            backgroundColor: resolvedTheme === "dark" ? "#f8fafc" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.14)",
          }]}
        >
          <Text style={[styles.embedActionText, { color: "#0f172a" }]}>
            Open in Canvas
          </Text>
        </Pressable>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <Pressable onPress={() => void Linking.openURL(targetUrl)}>
        <Text style={[styles.embedLink, { color: resolvedTheme === "dark" ? "#93c5fd" : "#2563eb" }]}>
          Open embedded media
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.embedContainer}>
      <WebView
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        source={{ uri: sourceUrl }}
        style={{ height: targetHeight, width: "100%" }}
      />
    </View>
  );
}

function TableRenderer({ TDefaultRenderer, ...props }: any) {
  return (
    <View style={styles.tableWrapper}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        style={styles.tableScroll}
      >
        <TDefaultRenderer {...props} />
      </ScrollView>
    </View>
  );
}

export function RichText({
  currentCourseId,
  fallbackCanvasUrl,
  html,
  providerUrl,
}: {
  currentCourseId?: number;
  fallbackCanvasUrl?: string;
  html?: string | null;
  providerUrl?: string;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { resolvedTheme } = useAppPreferences();
  const contentWidth = Math.max(240, width - 64);
  const tableBorderColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)";
  const tableHeaderBackgroundColor = resolvedTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const tableCellBackgroundColor = resolvedTheme === "dark" ? "rgba(15,23,42,0.72)" : "#ffffff";
  const rewrittenHtml = useMemo(
    () => (html ? rewriteCanvasHtmlEmbeddedMedia(html, providerUrl) : html),
    [html, providerUrl],
  );

  if (!rewrittenHtml?.trim()) {
    return null;
  }

  return (
    <RenderHTML
      customHTMLElementModels={customHTMLElementModels}
      contentWidth={contentWidth}
      renderers={{
        embed: ({ tnode }: any) => {
          const src = tnode.attributes.src;

          if (!src) {
            return null;
          }
          return (
            <EmbeddedMedia
              fallbackCanvasUrl={fallbackCanvasUrl}
              providerUrl={providerUrl}
              resolvedTheme={resolvedTheme}
              sourceUrl={src}
              targetHeight={getEmbedHeight(tnode.attributes)}
            />
          );
        },
        iframe: ({ tnode }: any) => {
          const src = tnode.attributes.src;

          if (!src) {
            return null;
          }
          return (
            <EmbeddedMedia
              fallbackCanvasUrl={fallbackCanvasUrl}
              providerUrl={providerUrl}
              resolvedTheme={resolvedTheme}
              sourceUrl={src}
              targetHeight={getEmbedHeight(tnode.attributes)}
            />
          );
        },
        object: ({ tnode }: any) => {
          const data = tnode.attributes.data;

          if (!data) {
            return null;
          }
          return (
            <EmbeddedMedia
              fallbackCanvasUrl={fallbackCanvasUrl}
              providerUrl={providerUrl}
              resolvedTheme={resolvedTheme}
              sourceUrl={data}
              targetHeight={getEmbedHeight(tnode.attributes)}
            />
          );
        },
        video: ({ tnode }: any) => {
          const src = tnode.attributes.src;

          if (!src) {
            return null;
          }

          return (
            <EmbeddedMedia
              fallbackCanvasUrl={fallbackCanvasUrl}
              providerUrl={providerUrl}
              resolvedTheme={resolvedTheme}
              sourceUrl={src}
              targetHeight={getEmbedHeight(tnode.attributes)}
            />
          );
        },
        source: ({ tnode }: any) => {
          const src = tnode.attributes.src;

          if (!src) {
            return null;
          }

          return (
            <EmbeddedMedia
              fallbackCanvasUrl={fallbackCanvasUrl}
              providerUrl={providerUrl}
              resolvedTheme={resolvedTheme}
              sourceUrl={src}
              targetHeight={getEmbedHeight(tnode.attributes)}
            />
          );
        },
        table: TableRenderer,
      }}
      source={{ html: rewrittenHtml }}
      baseStyle={{
        color: resolvedTheme === "dark" ? "#f8fafc" : "#111111",
        fontSize: 15,
        lineHeight: 24,
      }}
      renderersProps={{
        a: {
          onPress: (_event, href) => {
            if (!href) {
              return;
            }

            void openAppHref(router, rewriteCanvasHref(href, providerUrl, currentCourseId));
          },
        },
      }}
      tagsStyles={{
        a: {
          color: resolvedTheme === "dark" ? "#93c5fd" : "#2563eb",
          textDecorationColor: resolvedTheme === "dark" ? "#93c5fd" : "#2563eb",
        },
        p: {
          marginTop: 0,
        },
        table: {
          alignSelf: "flex-start",
          borderColor: tableBorderColor,
          borderRadius: 12,
          borderWidth: 1,
          marginVertical: 8,
          minWidth: contentWidth,
          overflow: "hidden",
        },
        thead: {
          backgroundColor: tableHeaderBackgroundColor,
        },
        tr: {
          borderBottomColor: tableBorderColor,
          borderBottomWidth: 1,
        },
        th: {
          backgroundColor: tableHeaderBackgroundColor,
          borderRightColor: tableBorderColor,
          borderRightWidth: 1,
          flexBasis: "auto",
          flexGrow: 0,
          flexShrink: 0,
          fontWeight: "700",
          minWidth: 140,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        td: {
          backgroundColor: tableCellBackgroundColor,
          borderRightColor: tableBorderColor,
          borderRightWidth: 1,
          flexBasis: "auto",
          flexGrow: 0,
          flexShrink: 0,
          minWidth: 140,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        caption: {
          color: resolvedTheme === "dark" ? "#cbd5e1" : "#475569",
          marginBottom: 8,
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  embedContainer: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: "hidden",
    width: "100%",
  },
  tableWrapper: {
    width: "100%",
  },
  tableScroll: {
    width: "100%",
  },
  embedLink: {
    fontSize: 14,
    fontWeight: "500",
    marginVertical: 8,
    textDecorationLine: "underline",
  },
  embedFallbackButton: {
    alignItems: "center",
    backgroundColor: "rgba(241,245,249,0.96)",
    borderColor: "rgba(15,23,42,0.1)",
    borderWidth: 1,
    justifyContent: "center",
    gap: 8,
    minHeight: 120,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  embedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  embedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  embedTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  embedStatus: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  embedAction: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  embedActionText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
