import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "x-buzz-radar",
  description: "海外 X バズツイート収集 + 媒体別発信ネタ化",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <nav>
          <a href="/">バズ一覧</a>
          <a href="/posts">投稿管理</a>
        </nav>
        <hr style={{ margin: "1rem 0", border: 0 }} />
        {children}
      </body>
    </html>
  );
}
