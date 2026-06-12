import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

// 信頼系フォント（design-system: Lexend）。大きな金額の可読性に効く。
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "家計ダッシュボード — mf-finance",
  description: "今月あといくら使えるかが一目で分かる、ローカル運用の家計ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${lexend.variable} light h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
