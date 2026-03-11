import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Canvas Wrapper",
  description: "A simple Canvas dashboard clone built with Next.js and shadcn/ui.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/window.svg",
    apple: "/window.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Canvas Wrapper",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
