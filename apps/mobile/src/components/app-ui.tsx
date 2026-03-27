import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  APP_WELCOME_STORAGE_KEY,
  getCanvasConnectGuideSections,
  getCanvasConnectHighlights,
  normalizeCanvasProviderUrl,
  t,
} from "@canvas/shared";
import {
  BookOpen,
  CalendarDays,
  Eye,
  EyeOff,
  Globe,
  Inbox,
  KeyRound,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useAppPreferences } from "../providers/app-preferences";
import { useCanvasSession } from "../providers/canvas-session";
import { RestorableScrollView } from "./restorable-scroll-view";

const connectHighlightIcons = {
  device: ShieldCheck,
  direct: Globe,
  quick: Sparkles,
} as const;
const connectGuideIcons = {
  apiKey: KeyRound,
  url: Link2,
} as const;

function useAppColors() {
  const { resolvedTheme } = useAppPreferences();

  if (resolvedTheme === "dark") {
    return {
      backgroundMuted: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.12)",
      buttonSecondaryText: "#f8fafc",
      card: "#000000",
      cardMuted: "rgba(255,255,255,0.05)",
      error: "#fca5a5",
      foreground: "#f8fafc",
      helper: "rgba(241,245,249,0.66)",
      input: "#000000",
      pillBackground: "rgba(255,255,255,0.08)",
      pillBorder: "rgba(255,255,255,0.16)",
      pillText: "#e2e8f0",
      primary: "#f8fafc",
      primaryText: "#0f172a",
      screen: "#000000",
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
  contentStyle,
  scroll = true,
  subtitle,
  title,
}: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle>; scroll?: boolean; subtitle?: string; title?: string }>) {
  const colors = useAppColors();
  const content = (
    <View style={[styles.content, contentStyle]}>
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
        <RestorableScrollView contentContainerStyle={styles.scrollContent}>
          {content}
        </RestorableScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function SectionCard({
  children,
  density = "default",
  title,
  subtitle,
}: PropsWithChildren<{ density?: "default" | "compact"; title: string; subtitle?: string }>) {
  const colors = useAppColors();
  return (
    <View
      style={[
        styles.card,
        density === "compact" ? styles.cardCompact : null,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
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
  const { resolvedLocale } = useAppPreferences();
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={colors.foreground} />
      <Text style={[styles.stateText, { color: colors.subtitle }]}>
        {label === "Loading..." ? t(resolvedLocale, "common.loading") : label}
      </Text>
    </View>
  );
}

export function InlineLoadingNotice({
  title = "Loading latest data",
  description,
}: {
  title?: string;
  description: string;
}) {
  const colors = useAppColors();
  return (
    <View style={[styles.inlineNotice, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
      <Text style={[styles.inlineNoticeTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.inlineNoticeDescription, { color: colors.subtitle }]}>{description}</Text>
    </View>
  );
}

export function PlaceholderBlock({
  height = 72,
}: {
  height?: number;
}) {
  const colors = useAppColors();
  return (
    <View
      style={[
        styles.placeholderBlock,
        {
          backgroundColor: colors.cardMuted,
          borderColor: colors.border,
          height,
        },
      ]}
    />
  );
}

export function EmptyState({ label }: { label: string }) {
  const colors = useAppColors();
  const { resolvedLocale } = useAppPreferences();
  return (
    <View style={styles.centerState}>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{t(resolvedLocale, "common.noneYet")}</Text>
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
  const { resolvedLocale } = useAppPreferences();
  return (
    <View style={styles.centerState}>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>{t(resolvedLocale, "common.errorTitle")}</Text>
      <Text style={[styles.stateText, { color: colors.subtitle }]}>{error}</Text>
      {onRetry ? (
        <PrimaryButton label={t(resolvedLocale, "common.retry")} onPress={onRetry} />
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

function WelcomeSplash({ onContinue }: { onContinue: () => void }) {
  const colors = useAppColors();
  const { resolvedLocale, resolvedTheme } = useAppPreferences();
  const floatPrimary = useRef(new Animated.Value(0)).current;
  const floatSecondary = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const isDark = resolvedTheme === "dark";
  const highlights = [
    {
      title: t(resolvedLocale, "welcome.highlightOneTitle"),
      description: t(resolvedLocale, "welcome.highlightOneBody"),
    },
    {
      title: t(resolvedLocale, "welcome.highlightTwoTitle"),
      description: t(resolvedLocale, "welcome.highlightTwoBody"),
    },
    {
      title: t(resolvedLocale, "welcome.highlightThreeTitle"),
      description: t(resolvedLocale, "welcome.highlightThreeBody"),
    },
  ];

  useEffect(() => {
    const primaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatPrimary, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatPrimary, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const secondaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatSecondary, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatSecondary, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    primaryLoop.start();
    secondaryLoop.start();
    pulseLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      pulseLoop.stop();
    };
  }, [floatPrimary, floatSecondary, pulse]);

  return (
    <View style={styles.welcomeScreen}>
      <View style={styles.welcomeHero}>
        <Animated.View
          style={[
            styles.welcomeGlow,
            styles.welcomeGlowLarge,
            {
              backgroundColor: isDark ? "rgba(251,191,36,0.18)" : "rgba(251,191,36,0.22)",
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.welcomeGlow,
            styles.welcomeGlowSmall,
            {
              backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(45,212,191,0.18)",
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1.04, 0.94] }) }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.welcomeBadge,
            styles.welcomeBadgeTop,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [
                { translateY: floatPrimary.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                { rotate: floatPrimary.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] }) },
              ],
            },
          ]}
        >
          <CalendarDays color="#f59e0b" size={18} />
          <View style={styles.welcomeBadgeTextWrap}>
            <Text style={[styles.welcomeBadgeLabel, { color: colors.foreground }]}>
              {t(resolvedLocale, "welcome.deadlinesTitle")}
            </Text>
            <Text style={[styles.welcomeBadgeMeta, { color: colors.helper }]}>
              {t(resolvedLocale, "welcome.deadlinesBody")}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.welcomeBadge,
            styles.welcomeBadgeBottom,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [
                { translateY: floatSecondary.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
                { rotate: floatSecondary.interpolate({ inputRange: [0, 1], outputRange: ["3deg", "-3deg"] }) },
              ],
            },
          ]}
        >
          <Inbox color="#14b8a6" size={18} />
          <View style={styles.welcomeBadgeTextWrap}>
            <Text style={[styles.welcomeBadgeLabel, { color: colors.foreground }]}>
              {t(resolvedLocale, "welcome.messagesTitle")}
            </Text>
            <Text style={[styles.welcomeBadgeMeta, { color: colors.helper }]}>
              {t(resolvedLocale, "welcome.messagesBody")}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.welcomeCenterCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: floatPrimary.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
            },
          ]}
        >
          <View
            style={[
              styles.welcomeCenterIcon,
              { backgroundColor: isDark ? "rgba(248,250,252,0.08)" : "rgba(15,23,42,0.06)" },
            ]}
          >
            <Sparkles color={colors.foreground} size={24} />
          </View>
          <Text style={[styles.welcomeCenterTitle, { color: colors.foreground }]}>Janvas</Text>
          <Text style={[styles.welcomeCenterSubtitle, { color: colors.helper }]}>
            {t(resolvedLocale, "welcome.appTagline")}
          </Text>
          <View style={styles.welcomeCenterPills}>
            <View style={[styles.welcomeMiniPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#fff7ed" }]}>
              <BookOpen color={isDark ? "#fde68a" : "#c2410c"} size={14} />
              <Text style={[styles.welcomeMiniPillText, { color: colors.foreground }]}>
                {t(resolvedLocale, "welcome.subjectsPill")}
              </Text>
            </View>
            <View style={[styles.welcomeMiniPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ecfeff" }]}>
              <CalendarDays color={isDark ? "#99f6e4" : "#0f766e"} size={14} />
              <Text style={[styles.welcomeMiniPillText, { color: colors.foreground }]}>
                {t(resolvedLocale, "welcome.calendarPill")}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.welcomeBody}>
        <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>{t(resolvedLocale, "welcome.title")}</Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.subtitle }]}>{t(resolvedLocale, "welcome.subtitle")}</Text>

        <View style={styles.welcomeHighlights}>
          {highlights.map((highlight) => (
            <View
              key={highlight.title}
              style={[styles.welcomeHighlight, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}
            >
              <Text style={[styles.welcomeHighlightTitle, { color: colors.foreground }]}>{highlight.title}</Text>
              <Text style={[styles.welcomeHighlightDescription, { color: colors.helper }]}>
                {highlight.description}
              </Text>
            </View>
          ))}
        </View>

        <PrimaryButton label={t(resolvedLocale, "welcome.cta")} onPress={onContinue} />
      </View>
    </View>
  );
}

export function RequireCanvasConfig({ children }: PropsWithChildren) {
  const { configured, ready } = useCanvasSession();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!ready || configured) {
      return () => {
        cancelled = true;
      };
    }

    void AsyncStorage.getItem(APP_WELCOME_STORAGE_KEY)
      .then((value) => {
        if (!cancelled) {
          setHasSeenWelcome(value === "true");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasSeenWelcome(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configured, ready]);

  if (!ready) {
    return <LoadingState label="Loading your Canvas configuration..." />;
  }

  if (!configured && hasSeenWelcome == null) {
    return <LoadingState label="Preparing your first launch..." />;
  }

  if (!configured && !hasSeenWelcome) {
    return (
      <AppScreen contentStyle={styles.welcomeScreenContent}>
        <WelcomeSplash
          onContinue={() => {
            void AsyncStorage.setItem(APP_WELCOME_STORAGE_KEY, "true").finally(() => {
              setHasSeenWelcome(true);
            });
          }}
        />
      </AppScreen>
    );
  }

  if (!configured) {
    return (
      <AppScreen
        contentStyle={styles.connectScreenContent}
      >
        <CanvasConfigForm mode="connect" />
      </AppScreen>
    );
  }

  return children;
}

export function CanvasConfigForm({
  mode = "settings",
  showClear = false,
}: {
  mode?: "connect" | "settings";
  showClear?: boolean;
}) {
  const colors = useAppColors();
  const { resolvedLocale } = useAppPreferences();
  const { clearConfig, config, saveConfig } = useCanvasSession();
  const router = useRouter();
  const [apiBase, setApiBase] = useState(() => config?.apiBase ?? normalizeCanvasProviderUrl(undefined));
  const [apiKey, setApiKey] = useState(() => config?.apiKey ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const normalizedApiBase = useMemo(() => normalizeCanvasProviderUrl(apiBase), [apiBase]);
  const isConnectMode = mode === "connect";
  const connectButtonLabel = saving ? t(resolvedLocale, "connect.connecting") : t(resolvedLocale, "connect.saveAndConnect");
  const settingsButtonLabel = saving ? t(resolvedLocale, "connect.savingConfig") : t(resolvedLocale, "connect.saveConfig");
  const connectHighlights = getCanvasConnectHighlights(resolvedLocale);
  const connectGuideSections = getCanvasConnectGuideSections(resolvedLocale);
  const formContent = (
    <>
      {isConnectMode ? (
        <View style={[styles.connectFormEyebrow, { backgroundColor: colors.backgroundMuted, borderColor: colors.border }]}>
          <LockKeyhole color={colors.foreground} size={14} />
          <Text style={[styles.connectFormEyebrowText, { color: colors.foreground }]}>
            {t(resolvedLocale, "connect.credentialsTitle")}
          </Text>
        </View>
      ) : null}

      <View style={styles.connectFieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{t(resolvedLocale, "connect.urlLabel")}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setApiBase}
          placeholder={t(resolvedLocale, "connect.urlPlaceholder")}
          placeholderTextColor={colors.helper}
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
          value={apiBase}
        />
        <View style={[styles.connectEndpointCard, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
          <Text style={[styles.connectEndpointLabel, { color: colors.helper }]}>
            {t(resolvedLocale, "connect.apiEndpointLabel")}
          </Text>
          <Text style={[styles.connectEndpointValue, { color: colors.foreground }]}>{normalizedApiBase}</Text>
        </View>
      </View>

      <View style={styles.connectFieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{t(resolvedLocale, "connect.apiKeyLabel")}</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setApiKey}
            placeholder={t(resolvedLocale, "connect.apiKeyPlaceholder")}
            placeholderTextColor={colors.helper}
            secureTextEntry={!showApiKey}
            style={[styles.inputField, { color: colors.foreground }]}
            value={apiKey}
          />
          <Pressable
            onPress={() => setShowApiKey((current) => !current)}
            style={({ pressed }) => [
              styles.inputToggle,
              { backgroundColor: colors.cardMuted, borderColor: colors.border },
              pressed && styles.rowPressed,
            ]}
          >
            {showApiKey ? <EyeOff color={colors.foreground} size={14} /> : <Eye color={colors.foreground} size={14} />}
            <Text style={[styles.inputToggleText, { color: colors.foreground }]}>
              {showApiKey ? t(resolvedLocale, "common.hide") : t(resolvedLocale, "common.show")}
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={[styles.connectErrorCard, { backgroundColor: colors.cardMuted, borderColor: colors.error }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      <PrimaryButton
        disabled={saving || apiKey.trim().length === 0}
        label={isConnectMode ? connectButtonLabel : settingsButtonLabel}
        onPress={() => {
          setSaving(true);
          setError(null);

          void saveConfig({ apiBase, apiKey })
            .catch((nextError) => {
              setError(nextError instanceof Error ? nextError.message : t(resolvedLocale, "connect.saveError"));
            })
            .finally(() => {
              setSaving(false);
            });
        }}
      />

      {showClear ? <SecondaryButton label={t(resolvedLocale, "connect.clearCredentials")} onPress={() => void clearConfig()} /> : null}
    </>
  );

  if (!isConnectMode) {
    return (
      <SectionCard title={t(resolvedLocale, "connect.credentialsTitle")}>
        {formContent}

        <Pressable
          onPress={() => {
            router.push("/privacy");
          }}
          style={({ pressed }) => [styles.instructionsLinkButton, pressed && styles.rowPressed]}
        >
          <Text style={[styles.instructionsLink, { color: colors.foreground }]}>
            {t(resolvedLocale, "common.privacyPolicy")}
          </Text>
        </Pressable>
      </SectionCard>
    );
  }

  return (
    <View style={styles.connectFlow}>
      <View style={[styles.connectHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.connectHeroGlow, styles.connectHeroGlowPrimary]} />
        <View style={[styles.connectHeroGlow, styles.connectHeroGlowSecondary]} />

        <View style={styles.connectHeroContent}>
          <View style={[styles.connectHeroPill, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
            <ShieldCheck color={colors.foreground} size={14} />
            <Text style={[styles.connectHeroPillText, { color: colors.foreground }]}>
              {t(resolvedLocale, "connect.setupEyebrow")}
            </Text>
          </View>

          <Text style={[styles.connectHeroTitle, { color: colors.foreground }]}>
            {t(resolvedLocale, "connect.accountTitle")}
          </Text>
          <Text style={[styles.connectHeroSubtitle, { color: colors.subtitle }]}>
            {t(resolvedLocale, "connect.accountSubtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.connectHighlights}>
        {connectHighlights.map((highlight) => {
          const Icon = connectHighlightIcons[highlight.id];
          const accent = highlight.id === "device"
            ? { backgroundColor: "rgba(251,191,36,0.16)", color: colors.foreground }
            : highlight.id === "direct"
              ? { backgroundColor: "rgba(45,212,191,0.14)", color: colors.foreground }
              : { backgroundColor: "rgba(52,211,153,0.14)", color: colors.foreground };

          return (
            <View
              key={highlight.id}
              style={[styles.connectHighlightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.connectHighlightIcon, { backgroundColor: accent.backgroundColor }]}>
                <Icon color={accent.color} size={16} />
              </View>
              <Text style={[styles.connectHighlightTitle, { color: colors.foreground }]}>{highlight.title}</Text>
              <Text style={[styles.connectHighlightDescription, { color: colors.subtitle }]}>
                {highlight.description}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionCard
        title={t(resolvedLocale, "connect.saveAndConnect")}
        subtitle={t(resolvedLocale, "connect.accountSubtitle")}
      >
        {formContent}
      </SectionCard>

      <View style={styles.connectGuideSections}>
        {connectGuideSections.map((section) => {
          const Icon = connectGuideIcons[section.id];

          return (
            <View
              key={section.id}
              style={[styles.connectGuideCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.connectGuideHeader}>
                <View style={[styles.connectGuideIcon, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                  <Icon color={colors.foreground} size={16} />
                </View>
                <Text style={[styles.connectGuideTitle, { color: colors.foreground }]}>{section.title}</Text>
              </View>

              <View style={styles.connectGuideList}>
                {section.steps.map((step) => (
                  <Text key={step} style={[styles.connectGuideStep, { color: colors.helper }]}>
                    {step}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.connectLinksRow}>
        <Pressable
          onPress={() => {
            void Linking.openURL("https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth");
          }}
          style={({ pressed }) => [
            styles.connectLinkButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.rowPressed,
          ]}
        >
          <Text style={[styles.connectLinkText, { color: colors.foreground }]}>{t(resolvedLocale, "connect.docsLink")}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            router.push("/privacy");
          }}
          style={({ pressed }) => [
            styles.connectLinkButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.rowPressed,
          ]}
        >
          <Text style={[styles.connectLinkText, { color: colors.foreground }]}>
            {t(resolvedLocale, "common.privacyPolicy")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  cardCompact: {
    borderRadius: 22,
    gap: 12,
    padding: 14,
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
  connectScreenContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 12,
  },
  connectEndpointCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  connectEndpointLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  connectEndpointValue: {
    fontSize: 13,
    lineHeight: 19,
  },
  connectErrorCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  connectFieldGroup: {
    gap: 8,
  },
  connectFlow: {
    gap: 16,
  },
  connectFormEyebrow: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectFormEyebrowText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  connectGuideCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  connectGuideHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  connectGuideIcon: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  connectGuideList: {
    gap: 7,
  },
  connectGuideSections: {
    gap: 12,
  },
  connectGuideStep: {
    fontSize: 13,
    lineHeight: 19,
  },
  connectGuideTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  connectHero: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: "relative",
  },
  connectHeroContent: {
    gap: 12,
    position: "relative",
  },
  connectHeroGlow: {
    borderRadius: 999,
    position: "absolute",
  },
  connectHeroGlowPrimary: {
    backgroundColor: "rgba(251,191,36,0.18)",
    height: 168,
    left: -32,
    top: -38,
    width: 168,
  },
  connectHeroGlowSecondary: {
    backgroundColor: "rgba(45,212,191,0.14)",
    height: 136,
    right: -18,
    top: 24,
    width: 136,
  },
  connectHeroPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectHeroPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  connectHeroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  connectHeroTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 34,
  },
  connectHighlightCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  connectHighlightDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  connectHighlightIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  connectHighlightTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  connectHighlights: {
    gap: 12,
  },
  connectLinkButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  connectLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  connectLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  inlineNotice: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inlineNoticeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  inlineNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  instructionsCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  instructionsLink: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  instructionsLinkButton: {
    alignSelf: "flex-start",
  },
  instructionsSection: {
    gap: 6,
  },
  instructionsStep: {
    fontSize: 13,
    lineHeight: 18,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputRow: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
    paddingRight: 10,
  },
  inputToggle: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  placeholderBlock: {
    borderRadius: 18,
    borderWidth: 1,
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
  welcomeBadge: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  welcomeBadgeBottom: {
    bottom: 14,
    right: 10,
    width: 188,
  },
  welcomeBadgeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  welcomeBadgeMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  welcomeBadgeTextWrap: {
    flex: 1,
    gap: 2,
  },
  welcomeBadgeTop: {
    left: 8,
    top: 16,
    width: 176,
  },
  welcomeBody: {
    gap: 14,
  },
  welcomeCenterCard: {
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 32,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
  welcomeCenterIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  welcomeCenterPills: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  welcomeCenterSubtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  welcomeCenterTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  welcomeGlow: {
    borderRadius: 999,
    position: "absolute",
  },
  welcomeGlowLarge: {
    height: 220,
    left: 22,
    top: 18,
    width: 220,
  },
  welcomeGlowSmall: {
    height: 156,
    right: 20,
    top: 82,
    width: 156,
  },
  welcomeHero: {
    justifyContent: "center",
    minHeight: 320,
    position: "relative",
  },
  welcomeHighlight: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  welcomeHighlightDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  welcomeHighlightTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  welcomeHighlights: {
    gap: 10,
  },
  welcomeMiniPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  welcomeMiniPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  welcomeScreen: {
    gap: 18,
    justifyContent: "center",
    paddingVertical: 6,
  },
  welcomeScreenContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  welcomeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1.1,
    lineHeight: 34,
  },
});
