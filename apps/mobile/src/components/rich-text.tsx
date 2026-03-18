import { useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import RenderHTML from "react-native-render-html";
import { rewriteCanvasHref } from "@canvas/shared";
import { openAppHref } from "../lib/navigation";
import { useAppPreferences } from "../providers/app-preferences";

export function RichText({
  currentCourseId,
  html,
  providerUrl,
}: {
  currentCourseId?: number;
  html?: string | null;
  providerUrl?: string;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { resolvedTheme } = useAppPreferences();

  if (!html?.trim()) {
    return null;
  }

  return (
    <RenderHTML
      contentWidth={Math.max(240, width - 64)}
      source={{ html }}
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
      }}
    />
  );
}
