import type { Metadata } from "next";
import { Shippori_Mincho_B1, Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mincho = Shippori_Mincho_B1({
  variable: "--font-mincho",
  weight: ["500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const sans = Noto_Sans_JP({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BSA 受注台帳",
  description: "Lancers 案件収集 + 提案文生成 + 受注管理",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${mincho.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
