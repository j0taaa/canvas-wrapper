import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { CanvasBootstrapPrefetcher } from "../src/components/canvas-bootstrap-prefetcher";
import { MobileChrome } from "../src/components/mobile-chrome";
import { QueryProvider } from "../src/components/query-provider";
import { AppPreferencesProvider, useAppPreferences } from "../src/providers/app-preferences";
import { CanvasSessionProvider } from "../src/providers/canvas-session";
import { DeviceIntegrationProvider } from "../src/providers/device-integrations";

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <CanvasSessionProvider>
        <QueryProvider>
          <RootNavigator />
        </QueryProvider>
      </CanvasSessionProvider>
    </AppPreferencesProvider>
  );
}

function RootNavigator() {
  const { resolvedTheme } = useAppPreferences();
  const backgroundColor = resolvedTheme === "dark" ? "#020617" : "#ffffff";

  return (
    <DeviceIntegrationProvider>
      <View style={{ flex: 1, backgroundColor }}>
        <View style={{ flex: 1 }}>
          <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
          <CanvasBootstrapPrefetcher />
          <Stack screenOptions={{ animation: "none", freezeOnBlur: true, headerShown: false }} />
        </View>
        <MobileChrome />
      </View>
    </DeviceIntegrationProvider>
  );
}
