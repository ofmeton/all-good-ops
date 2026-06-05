import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xad observability — 工程可視化ダッシュボード",
  description: "x-account 発信システムの各工程の入出力・ロジック・実行を観測する",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b px-4 py-2 flex items-center gap-4 text-sm">
          <span className="font-bold">xad observability</span>
          <a href="/" className="text-blue-600 hover:underline">工程図</a>
          <a href="/runs" className="text-blue-600 hover:underline">Runs</a>
        </header>
        {children}
      </body>
    </html>
  );
}
