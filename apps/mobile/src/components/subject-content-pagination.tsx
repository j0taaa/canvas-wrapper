import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Router } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { t, type AppLocale, type SubjectContentNavigationTarget } from "@canvas/shared";
import { openAppHref } from "../lib/navigation";

type SubjectContentPaginationProps = {
  colors: {
    border: string;
    card: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    primary: string;
    primaryText: string;
  };
  locale: AppLocale;
  next: SubjectContentNavigationTarget | null;
  previous: SubjectContentNavigationTarget | null;
  router: Router;
};

function getTargetTitle(locale: AppLocale, target: SubjectContentNavigationTarget | null) {
  if (!target) {
    return null;
  }

  if (target.title) {
    return target.title;
  }

  switch (target.kind) {
    case "page":
      return t(locale, "subjects.untitledPage");
    case "file":
      return t(locale, "subjects.untitledFile");
    case "quiz":
      return t(locale, "subjects.untitledQuiz");
    case "assignment":
      return t(locale, "subjects.assignments");
  }
}

export function SubjectContentPagination({
  colors,
  locale,
  next,
  previous,
  router,
}: SubjectContentPaginationProps) {
  if (!previous && !next) {
    return null;
  }

  const previousTitle = getTargetTitle(locale, previous);
  const nextTitle = getTargetTitle(locale, next);

  return (
    <View style={styles.container}>
      {previous ? (
        <Pressable
          onPress={() => void openAppHref(router, previous.href)}
          style={({ pressed }) => [
            styles.button,
            styles.previousButton,
            {
              backgroundColor: pressed ? colors.muted : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ArrowLeft size={18} color={colors.foreground} />
          <View style={styles.textContent}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {t(locale, "subjects.previousContent")}
            </Text>
            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
              {previousTitle}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      {next ? (
        <Pressable
          onPress={() => void openAppHref(router, next.href)}
          style={({ pressed }) => [
            styles.button,
            styles.nextButton,
            {
              backgroundColor: pressed ? colors.mutedForeground : colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.textContent}>
            <Text style={[styles.label, { color: `${colors.primaryText}CC` }]}>
              {t(locale, "subjects.nextContent")}
            </Text>
            <Text numberOfLines={1} style={[styles.title, { color: colors.primaryText }]}>
              {nextTitle}
            </Text>
          </View>
          <ArrowRight size={18} color={colors.primaryText} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  container: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
  },
  nextButton: {
    justifyContent: "space-between",
  },
  previousButton: {
    justifyContent: "flex-start",
  },
  spacer: {
    flex: 1,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
});
