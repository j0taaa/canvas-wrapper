import { AppScreen, CanvasConfigForm } from "../src/components/app-ui";

export default function SettingsScreen() {
  return (
    <AppScreen title="Settings" subtitle="Update the Canvas provider URL or API key saved on this device.">
      <CanvasConfigForm showClear />
    </AppScreen>
  );
}
