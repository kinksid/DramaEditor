"use client";

import { Instrument_Serif, Public_Sans } from "next/font/google";
import { useSettingsStore } from "@/stores/settingsStore";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

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
      <body className={`${publicSans.variable} ${instrumentSerif.variable}`}>{children}</body>
    </html>
  );
}
