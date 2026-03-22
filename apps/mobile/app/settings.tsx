import { t } from "@canvas/shared";
import { AppScreen, CanvasConfigForm } from "../src/components/app-ui";
import { useAppPreferences } from "../src/providers/app-preferences";

export default function SettingsScreen() {
  const { resolvedLocale } = useAppPreferences();

  return (
    <AppScreen
      title={t(resolvedLocale, "common.settings")}
      subtitle={t(resolvedLocale, "settings.updateCanvasCredentials")}
    >
      <CanvasConfigForm showClear />
    </AppScreen>
  );
}
