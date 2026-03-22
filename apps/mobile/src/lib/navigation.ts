import * as IntentLauncher from "expo-intent-launcher";
import { Linking } from "react-native";
import { Platform } from "react-native";
import type { Router } from "expo-router";

const CANVAS_ANDROID_PACKAGE = "com.instructure.candroid";

function buildCanvasAppUrls(href: string) {
  try {
    const parsed = new URL(href);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    return [
      `canvas-student://${parsed.host}${path}`,
      `canvas-courses://${parsed.host}${path}`,
    ];
  } catch {
    return [];
  }
}

export async function openAppHref(router: Router, href?: string | null) {
  if (!href) {
    return;
  }

  if (href.startsWith("/")) {
    router.push(href);
    return;
  }

  await Linking.openURL(href);
}

export async function openCanvasUrl(href?: string | null) {
  if (!href) {
    return;
  }

  if (Platform.OS === "android") {
    for (const appUrl of buildCanvasAppUrls(href)) {
      try {
        const canOpen = await Linking.canOpenURL(appUrl);

        if (!canOpen) {
          continue;
        }

        await Linking.openURL(appUrl);
        return;
      } catch {
        // Try the next Canvas app URL shape before falling back.
      }
    }

    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: href,
        packageName: CANVAS_ANDROID_PACKAGE,
      });
      return;
    } catch {
      // Fall back to the browser when the Canvas app is unavailable or can't handle the URL.
    }
  }

  await Linking.openURL(href);
}

export function goBackOrPush(router: Router, fallbackHref: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}
