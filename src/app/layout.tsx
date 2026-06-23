import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "互动短剧编辑器 DramaEditor",
  description: "一键生成，可以玩的短剧 One Click, Boundless Stories。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
