import { Linking } from "react-native";
import type { Router } from "expo-router";

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
