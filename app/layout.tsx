import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import { MotionRoot } from "@/components/MotionRoot";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoBackToHomeIELTS",
  description:
    "中文雅思备考 · 句子级学术写作练习（1–2 句 / 约 50 词）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${notoSansSc.variable} antialiased`}>
        <MotionRoot />
        {children}
      </body>
    </html>
  );
}
