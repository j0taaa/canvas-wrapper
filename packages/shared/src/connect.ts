import { t, type AppLocale } from "./locale";

export type CanvasConnectHighlight = {
  id: "device" | "direct" | "quick";
  description: string;
  title: string;
};

export type CanvasConnectGuideSection = {
  id: "apiKey" | "url";
  steps: string[];
  title: string;
};

export function getCanvasConnectHighlights(locale: AppLocale): CanvasConnectHighlight[] {
  return [
    {
      id: "device",
      title: t(locale, "connect.highlightDeviceTitle"),
      description: t(locale, "connect.highlightDeviceBody"),
    },
    {
      id: "direct",
      title: t(locale, "connect.highlightDirectTitle"),
      description: t(locale, "connect.highlightDirectBody"),
    },
    {
      id: "quick",
      title: t(locale, "connect.highlightQuickTitle"),
      description: t(locale, "connect.highlightQuickBody"),
    },
  ];
}

export function getCanvasConnectGuideSections(locale: AppLocale): CanvasConnectGuideSection[] {
  return [
    {
      id: "apiKey",
      title: t(locale, "connect.howToGetKeyTitle"),
      steps: [
        t(locale, "connect.keyStep1"),
        t(locale, "connect.keyStep2"),
        t(locale, "connect.keyStep3"),
        t(locale, "connect.keyStep4"),
        t(locale, "connect.keyStep5"),
      ],
    },
    {
      id: "url",
      title: t(locale, "connect.whatUrlTitle"),
      steps: [
        t(locale, "connect.urlStep1"),
        t(locale, "connect.urlStep2"),
        t(locale, "connect.urlStep3"),
        t(locale, "connect.urlStep4"),
      ],
    },
  ];
}
