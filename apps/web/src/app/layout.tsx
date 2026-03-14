import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { GlobalHaptics } from "@/components/global-haptics";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeSync } from "@/components/theme-sync";
import {
  parseThemePreference,
  THEME_PREFERENCE_COOKIE,
  THEME_PREFERENCE_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme-preference";

export const metadata: Metadata = {
  title: "Canvas Wrapper",
  description: "A simple Canvas dashboard clone built with Next.js and shadcn/ui.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/canvas-icon.svg",
    apple: "/canvas-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Canvas Wrapper",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#10141c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootLayoutInner>{children}</RootLayoutInner>;
}

async function RootLayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialThemePreference = parseThemePreference(
    cookieStore.get(THEME_PREFERENCE_COOKIE)?.value,
  );
  const themeScript = `
    (function () {
      var root = document.documentElement;
      var preference = "system";

      try {
        preference = window.localStorage.getItem("${THEME_PREFERENCE_STORAGE_KEY}") || root.dataset.themePreference || "system";
      } catch (error) {
        preference = root.dataset.themePreference || "system";
      }

      var resolved = preference === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
      var themeColor = resolved === "dark" ? "#10141c" : "#ffffff";

      root.dataset.themePreference = preference;
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
      root.style.backgroundColor = themeColor;

      var themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute("content", themeColor);
      }
    })();
  `;

  return (
    <html
      lang="en"
      className={initialThemePreference === "dark" ? "dark" : undefined}
      suppressHydrationWarning
      data-theme-preference={initialThemePreference}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        <GlobalHaptics />
        <ThemeSync initialPreference={initialThemePreference as ThemePreference} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
