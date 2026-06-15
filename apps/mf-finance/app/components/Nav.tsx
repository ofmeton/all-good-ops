"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// グローバルナビ。現在ページを usePathname で判定しアクティブ表示する。
// Link でクライアント遷移（フルリロードを避ける）。
const LINKS: ReadonlyArray<readonly [string, string]> = [
  ["/", "ダッシュボード"],
  ["/cashflow", "資金繰り"],
  ["/categories", "カテゴリ"],
  ["/subscriptions", "サブスク"],
  ["/assets", "資産"],
  ["/budget", "予算"],
  ["/rules", "ルール"],
  ["/tax", "税"],
  ["/settings", "設定"],
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm">
        <Link href="/" className="mr-1 font-semibold text-foreground">
          家計
        </Link>
        {LINKS.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-2 py-1 transition-colors duration-150 ${
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
