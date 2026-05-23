import type { Metadata } from "next";
import { Noto_Sans_JP, Manrope } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-jp",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StayClean — 清掃管理 SaaS for 民泊",
  description: "民泊清掃の依頼・割当・報告・通知を一元管理する SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
