import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getPrivacyPolicyContent, PRIVACY_POLICY_CONTACT_EMAIL, PRIVACY_POLICY_EFFECTIVE_DATE, t } from "@canvas/shared";
import { AppScreen } from "../src/components/app-ui";
import { RestorableScrollView } from "../src/components/restorable-scroll-view";
import { useAppPreferences } from "../src/providers/app-preferences";

export default function PrivacyPolicyScreen() {
  const { resolvedLocale, resolvedTheme } = useAppPreferences();
  const policy = getPrivacyPolicyContent(resolvedLocale);
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(PRIVACY_POLICY_EFFECTIVE_DATE)),
    [resolvedLocale],
  );
  const colors = useMemo(
    () => ({
      background: resolvedTheme === "dark" ? "#000000" : "#ffffff",
      card: resolvedTheme === "dark" ? "#000000" : "#ffffff",
      border: resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      foreground: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
      mutedForeground: resolvedTheme === "dark" ? "rgba(241,245,249,0.68)" : "rgba(15,23,42,0.58)",
    }),
    [resolvedTheme],
  );

  return (
    <AppScreen title={t(resolvedLocale, "common.privacyPolicy")} scroll={false}>
      <RestorableScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.updatedText, { color: colors.mutedForeground }]}>
            {t(resolvedLocale, "common.lastUpdated")}: {formattedDate}
          </Text>
          {policy.intro.map((paragraph) => (
            <Text key={paragraph} style={[styles.paragraph, { color: colors.foreground }]}>
              {paragraph}
            </Text>
          ))}
        </View>

        {policy.sections.map((section) => (
          <View key={section.title} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={[styles.paragraph, { color: colors.foreground }]}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet) => (
              <Text key={bullet} style={[styles.bullet, { color: colors.foreground }]}>
                • {bullet}
              </Text>
            ))}
          </View>
        ))}

        <View style={[styles.footerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{PRIVACY_POLICY_CONTACT_EMAIL}</Text>
        </View>
      </RestorableScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bullet: {
    fontSize: 14,
    lineHeight: 22,
  },
  content: {
    gap: 12,
    padding: 12,
    paddingBottom: 28,
  },
  footerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerText: {
    fontSize: 13,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  updatedText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
