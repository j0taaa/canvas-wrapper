import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import {
  clearStoredWebAppUrl,
  getDefaultWebAppUrl,
  getStoredWebAppUrl,
  normalizeWebAppUrl,
  saveWebAppUrl,
} from "../src/lib/web-app-url";

export default function IndexScreen() {
  const isDark = useColorScheme() === "dark";
  const [webAppUrl, setWebAppUrl] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState(getDefaultWebAppUrl());
  const [loadingStoredUrl, setLoadingStoredUrl] = useState(true);
  const [savingUrl, setSavingUrl] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [webKey, setWebKey] = useState(0);

  useEffect(() => {
    const loadStoredUrl = async () => {
      try {
        const storedUrl = await getStoredWebAppUrl();

        if (storedUrl) {
          setWebAppUrl(storedUrl);
          setDraftUrl(storedUrl);
        } else {
          setShowSetup(true);
        }
      } finally {
        setLoadingStoredUrl(false);
      }
    };

    void loadStoredUrl();
  }, []);

  const handleSaveUrl = useCallback(async () => {
    setSavingUrl(true);

    try {
      const nextUrl = await saveWebAppUrl(draftUrl);
      setWebAppUrl(nextUrl);
      setDraftUrl(nextUrl);
      setWebViewError(null);
      setShowSetup(false);
      setWebKey((current) => current + 1);
    } catch (error) {
      setWebViewError(error instanceof Error ? error.message : "Could not save the web app URL");
    } finally {
      setSavingUrl(false);
    }
  }, [draftUrl]);

  const allowedOrigin = useMemo(() => {
    if (!webAppUrl) {
      return "";
    }

    try {
      return new URL(webAppUrl).origin;
    } catch {
      return "";
    }
  }, [webAppUrl]);

  const openSetup = useCallback(() => {
    setShowSetup(true);
  }, []);

  const clearSavedUrl = useCallback(async () => {
    await clearStoredWebAppUrl();
    setWebAppUrl(null);
    setDraftUrl(getDefaultWebAppUrl());
    setWebViewError(null);
    setShowSetup(true);
  }, []);

  if (loadingStoredUrl) {
    return (
      <SafeAreaView style={[styles.centeredScreen, isDark && styles.centeredScreenDark]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={isDark ? "#f8fafc" : "#111111"} />
      </SafeAreaView>
    );
  }

  if (showSetup || !webAppUrl) {
    return (
      <SafeAreaView style={[styles.setupScreen, isDark && styles.setupScreenDark]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <KeyboardAvoidingView
          style={styles.keyboardWrapper}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.setupScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.setupCard, isDark && styles.setupCardDark]}>
              <Text style={[styles.setupTitle, isDark && styles.setupTitleDark]}>Connect the mobile app to the website</Text>
              <Text style={[styles.setupDescription, isDark && styles.setupDescriptionDark]}>
                The mobile app renders the real web app so mobile and web stay identical in features,
                design, and behavior.
              </Text>

              <View style={[styles.setupSection, isDark && styles.setupSectionDark]}>
                <Text style={[styles.setupSectionTitle, isDark && styles.setupSectionTitleDark]}>What URL to use</Text>
                <Text style={[styles.setupStep, isDark && styles.setupStepDark]}>1. Start the web app first.</Text>
                <Text style={[styles.setupStep, isDark && styles.setupStepDark]}>2. Paste the full URL where the website is running.</Text>
                <Text style={[styles.setupStep, isDark && styles.setupStepDark]}>
                  3. Example: `http://192.168.0.25:3000` on a phone, or `http://localhost:3000` on a simulator.
                </Text>
              </View>

              <TextInput
                value={draftUrl}
                onChangeText={setDraftUrl}
                placeholder="Web app URL"
                placeholderTextColor="rgba(0,0,0,0.38)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.input, isDark && styles.inputDark]}
              />

              <Pressable
                onPress={handleSaveUrl}
                disabled={savingUrl || !normalizeWebAppUrl(draftUrl)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (savingUrl || !normalizeWebAppUrl(draftUrl)) && styles.primaryButtonDisabled,
                  pressed && !(savingUrl || !normalizeWebAppUrl(draftUrl)) && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonLabel}>
                  {savingUrl ? "Saving..." : "Open mobile app"}
                </Text>
              </Pressable>

              {webViewError ? <Text style={[styles.errorText, isDark && styles.errorTextDark]}>{webViewError}</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.webViewScreen, isDark && styles.webViewScreenDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <WebView
        key={`${webKey}:${webAppUrl}`}
        source={{ uri: webAppUrl }}
        cacheEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        onLoadEnd={() => {
          setWebViewError(null);
        }}
        onError={({ nativeEvent }) => {
          setWebViewError(nativeEvent.description || "Could not load the web app");
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (!allowedOrigin) {
            return true;
          }

          try {
            const requestOrigin = new URL(request.url).origin;

            if (requestOrigin === allowedOrigin) {
              return true;
            }

            void Linking.openURL(request.url);
            return false;
          } catch {
            return true;
          }
        }}
        renderLoading={() => (
          <View style={[styles.loadingOverlay, isDark && styles.loadingOverlayDark]}>
            <ActivityIndicator size="large" color={isDark ? "#f8fafc" : "#111111"} />
          </View>
        )}
      />

      {webViewError ? (
        <View style={[styles.errorOverlay, isDark && styles.errorOverlayDark]}>
          <Text style={[styles.errorOverlayTitle, isDark && styles.errorOverlayTitleDark]}>Could not load the mobile app</Text>
          <Text style={[styles.errorOverlayText, isDark && styles.errorOverlayTextDark]}>{webViewError}</Text>
          <View style={styles.errorActions}>
            <Pressable onPress={() => setWebKey((current) => current + 1)} style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
              <Text style={[styles.secondaryButtonLabel, isDark && styles.secondaryButtonLabelDark]}>Retry</Text>
            </Pressable>
            <Pressable onPress={openSetup} style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
              <Text style={[styles.secondaryButtonLabel, isDark && styles.secondaryButtonLabelDark]}>Change URL</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable accessibilityLabel="Change web app URL" onLongPress={openSetup} style={styles.settingsHotspot} />
      )}

      {showSetup ? null : (
        <Pressable onLongPress={clearSavedUrl} style={styles.resetHotspot} accessibilityLabel="Reset web app URL" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredScreen: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
  },
  centeredScreenDark: {
    backgroundColor: "#020617",
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  errorOverlay: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    bottom: 0,
    left: 0,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    position: "absolute",
    right: 0,
  },
  errorOverlayDark: {
    backgroundColor: "rgba(2,6,23,0.96)",
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  errorOverlayText: {
    color: "rgba(0,0,0,0.62)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  errorOverlayTextDark: {
    color: "rgba(241,245,249,0.72)",
  },
  errorOverlayTitle: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "700",
  },
  errorOverlayTitleDark: {
    color: "#f8fafc",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    marginTop: 12,
  },
  errorTextDark: {
    color: "#fca5a5",
  },
  input: {
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 18,
    borderWidth: 1,
    color: "#111111",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputDark: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.14)",
    color: "#f8fafc",
  },
  keyboardWrapper: {
    flex: 1,
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
  },
  loadingOverlayDark: {
    backgroundColor: "#020617",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 18,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  resetHotspot: {
    height: 22,
    opacity: 0.01,
    position: "absolute",
    right: 0,
    top: 0,
    width: 22,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonDark: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryButtonLabel: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryButtonLabelDark: {
    color: "#f8fafc",
  },
  settingsHotspot: {
    height: 26,
    opacity: 0.01,
    position: "absolute",
    right: 0,
    top: 0,
    width: 26,
  },
  setupCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  setupCardDark: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
  },
  setupDescription: {
    color: "rgba(0,0,0,0.62)",
    fontSize: 15,
    lineHeight: 24,
  },
  setupDescriptionDark: {
    color: "rgba(241,245,249,0.72)",
  },
  setupScreen: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  setupScreenDark: {
    backgroundColor: "#020617",
  },
  setupScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  setupSection: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  setupSectionDark: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  setupSectionTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  setupSectionTitleDark: {
    color: "#f8fafc",
  },
  setupStep: {
    color: "rgba(0,0,0,0.62)",
    fontSize: 13,
    lineHeight: 20,
  },
  setupStepDark: {
    color: "rgba(241,245,249,0.68)",
  },
  setupTitle: {
    color: "#111111",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  setupTitleDark: {
    color: "#f8fafc",
  },
  webViewScreen: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  webViewScreenDark: {
    backgroundColor: "#020617",
  },
});
