import { PropsWithChildren, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { normalizeCanvasProviderUrl } from "@canvas/shared";
import { useAppPreferences } from "../providers/app-preferences";
import { useCanvasSession } from "../providers/canvas-session";

function useAppColors() {
  const { resolvedTheme } = useAppPreferences();

  if (resolvedTheme === "dark") {
    return {
      backgroundMuted: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.12)",
      buttonSecondaryText: "#f8fafc",
      card: "#0f172a",
      cardMuted: "rgba(255,255,255,0.05)",
      error: "#fca5a5",
      foreground: "#f8fafc",
      helper: "rgba(241,245,249,0.66)",
      input: "#111827",
      pillBackground: "rgba(255,255,255,0.08)",
      pillBorder: "rgba(255,255,255,0.16)",
      pillText: "#e2e8f0",
      primary: "#f8fafc",
      primaryText: "#0f172a",
      screen: "#020617",
      secondaryBorder: "rgba(255,255,255,0.16)",
      subtitle: "rgba(241,245,249,0.72)",
    };
  }

  return {
    backgroundMuted: "#fafafa",
    border: "rgba(15,23,42,0.08)",
    buttonSecondaryText: "#0f172a",
    card: "#ffffff",
    cardMuted: "#fafafa",
    error: "#b91c1c",
    foreground: "#0f172a",
    helper: "rgba(15,23,42,0.52)",
    input: "#ffffff",
    pillBackground: "#ffffff",
    pillBorder: "rgba(15,23,42,0.08)",
    pillText: "rgba(15,23,42,0.76)",
    primary: "#111111",
    primaryText: "#ffffff",
    screen: "#ffffff",
    secondaryBorder: "rgba(15,23,42,0.12)",
    subtitle: "rgba(15,23,42,0.54)",
  };
}

export function AppScreen({
  children,
  scroll = true,
  subtitle,
  title,
}: PropsWithChildren<{ scroll?: boolean; subtitle?: string; title?: string }>) {
  const colors = useAppColors();
  const content = (
    <View style={styles.content}>
      {title ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.subtitle }]}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function SectionCard({
  children,
  title,
  subtitle,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const colors = useAppColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.cardSubtitle, { color: colors.subtitle }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={colors.foreground} />
      <Text style={[styles.stateText, { color: colors.subtitle }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ label }: { label: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.centerState}>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>Nothing here yet</Text>
      <Text style={[styles.stateText, { color: colors.subtitle }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.centerState}>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>Something went wrong</Text>
      <Text style={[styles.stateText, { color: colors.subtitle }]}>{error}</Text>
      {onRetry ? (
        <PrimaryButton label="Retry" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function Row({
  children,
  onPress,
}: PropsWithChildren<{ onPress?: () => void }>) {
  const colors = useAppColors();
  const { triggerSelectionHaptic } = useAppPreferences();
  const content = (
    <View style={[styles.row, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
      {children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.cardMuted, borderColor: colors.border },
        pressed && styles.rowPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function RowTitle({ children }: PropsWithChildren) {
  const colors = useAppColors();
  return <Text style={[styles.rowTitle, { color: colors.foreground }]}>{children}</Text>;
}

export function RowMeta({ children }: PropsWithChildren) {
  const colors = useAppColors();
  return <Text style={[styles.rowMeta, { color: colors.helper }]}>{children}</Text>;
}

export function Pill({ children }: PropsWithChildren) {
  const colors = useAppColors();
  return (
    <View style={[styles.pill, { backgroundColor: colors.pillBackground, borderColor: colors.pillBorder }]}>
      <Text style={[styles.pillText, { color: colors.pillText }]}>{children}</Text>
    </View>
  );
}

export function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const { triggerSelectionHaptic } = useAppPreferences();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        triggerSelectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: colors.primary },
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.primaryButtonPressed,
      ]}
    >
      <Text style={[styles.primaryButtonLabel, { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const { triggerSelectionHaptic } = useAppPreferences();
  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: colors.secondaryBorder },
        pressed && styles.primaryButtonPressed,
      ]}
    >
      <Text style={[styles.secondaryButtonLabel, { color: colors.buttonSecondaryText }]}>{label}</Text>
    </Pressable>
  );
}

export function RequireCanvasConfig({ children }: PropsWithChildren) {
  const { configured, ready } = useCanvasSession();

  if (!ready) {
    return <LoadingState label="Loading your Canvas configuration..." />;
  }

  if (!configured) {
    return (
      <AppScreen
        title="Connect Canvas"
        subtitle="The native app talks directly to Canvas now, so it needs your provider URL and API key on-device."
      >
        <CanvasConfigForm />
      </AppScreen>
    );
  }

  return children;
}

export function CanvasConfigForm({ showClear = false }: { showClear?: boolean }) {
  const colors = useAppColors();
  const { clearConfig, config, saveConfig } = useCanvasSession();
  const [apiBase, setApiBase] = useState(() => config?.apiBase ?? normalizeCanvasProviderUrl(undefined));
  const [apiKey, setApiKey] = useState(() => config?.apiKey ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedApiBase = useMemo(() => normalizeCanvasProviderUrl(apiBase), [apiBase]);

  return (
    <SectionCard title="Credentials">
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Canvas provider URL</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setApiBase}
        placeholder="https://your-school.instructure.com"
        placeholderTextColor={colors.helper}
        style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
        value={apiBase}
      />

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Canvas API key</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setApiKey}
        placeholder="Paste your Canvas API key"
        placeholderTextColor={colors.helper}
        secureTextEntry
        style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
        value={apiKey}
      />

      <Text style={[styles.helperText, { color: colors.helper }]}>{normalizedApiBase}</Text>
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

      <PrimaryButton
        disabled={saving || apiKey.trim().length === 0}
        label={saving ? "Saving..." : "Save configuration"}
        onPress={() => {
          setSaving(true);
          setError(null);

          void saveConfig({ apiBase, apiKey })
            .catch((nextError) => {
              setError(nextError instanceof Error ? nextError.message : "Could not save the configuration");
            })
            .finally(() => {
              setSaving(false);
            });
        }}
      />

      {showClear ? <SecondaryButton label="Clear saved credentials" onPress={() => void clearConfig()} /> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  cardBody: {
    gap: 12,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  centerState: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    minHeight: 260,
    paddingHorizontal: 24,
  },
  content: {
    gap: 18,
    padding: 16,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  errorTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  header: {
    gap: 8,
  },
  helperText: {
    color: "rgba(15,23,42,0.56)",
    fontSize: 13,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 18,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonPressed: {
    opacity: 0.86,
  },
  row: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  rowMeta: {
    color: "rgba(15,23,42,0.56)",
    fontSize: 13,
    lineHeight: 18,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  secondaryButtonLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  stateText: {
    color: "rgba(15,23,42,0.64)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stateTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(15,23,42,0.54)",
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
});
