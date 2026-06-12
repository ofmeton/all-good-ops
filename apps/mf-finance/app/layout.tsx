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
      <body className="min-h-full">
        <nav className="border-b border-border bg-surface">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-2.5 text-sm">
            <a href="/" className="font-semibold text-foreground">
              家計
            </a>
            <a
              href="/"
              className="text-muted transition-colors duration-150 hover:text-primary"
            >
              ダッシュボード
            </a>
            <a
              href="/settings"
              className="text-muted transition-colors duration-150 hover:text-primary"
            >
              設定
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
