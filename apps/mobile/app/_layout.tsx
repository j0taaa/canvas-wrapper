import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CanvasBootstrapPrefetcher } from "../src/components/canvas-bootstrap-prefetcher";
import { MobileChrome } from "../src/components/mobile-chrome";
import { QueryProvider } from "../src/components/query-provider";
import { useTabletLayout } from "../src/hooks/use-tablet-layout";
import { AppPreferencesProvider, useAppPreferences } from "../src/providers/app-preferences";
import { CanvasSessionProvider } from "../src/providers/canvas-session";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <CanvasSessionProvider>
          <QueryProvider>
            <RootNavigator />
          </QueryProvider>
        </CanvasSessionProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { resolvedTheme } = useAppPreferences();
  const { isTabletLandscape } = useTabletLayout();
  const backgroundColor = resolvedTheme === "dark" ? "#000000" : "#ffffff";

  const navigator = (
    <View
      style={{
        flex: 1,
        maxWidth: "100%",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        ...(isTabletLandscape ? { width: 0 } : null),
      }}
    >
      <StatusBar
        style={resolvedTheme === "dark" ? "light" : "dark"}
        backgroundColor={backgroundColor}
        translucent={false}
      />
      <CanvasBootstrapPrefetcher />
      <Stack
        screenOptions={{
          animation: "simple_push",
          animationDuration: 180,
          contentStyle: { backgroundColor },
          freezeOnBlur: true,
          fullScreenGestureEnabled: true,
          gestureEnabled: true,
          headerShown: false,
        }}
      />
    </View>
  );

  if (isTabletLandscape) {
    return (
      <View style={{ flex: 1, backgroundColor, flexDirection: "row", minHeight: 0 }}>
        <MobileChrome />
        {navigator}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignSelf: "stretch", backgroundColor, maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
      {navigator}
      <MobileChrome />
    </View>
  );
}
