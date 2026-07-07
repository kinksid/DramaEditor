"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = useSettingsStore((s) => s.language);
  const theme = useSettingsStore((s) => s.theme);
  return (
    <html lang={language === "zh" ? "zh-CN" : "en"} data-theme={theme}>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
