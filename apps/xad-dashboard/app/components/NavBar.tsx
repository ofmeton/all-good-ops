"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** 共有契約 §1 のナビ IA（6エントリ・左→右）。
 *  /schedule・/publish は他チーム(A/B)が実装する route。リンクは常設してよい。 */
const NAV: { href: string; label: string }[] = [
  { href: "/", label: "工程図" },
  { href: "/curation", label: "キュレーション" },
  { href: "/approval", label: "承認" },
  { href: "/proposals", label: "提案" },
  { href: "/schedule", label: "スケジュール" },
  { href: "/publish", label: "今すぐ投稿" },
  { href: "/runs", label: "Runs" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavBar() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-base/70 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {/* brand */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 text-white no-underline"
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400 shadow-glow-primary animate-pulse-glow"
          />
          <span className="font-semibold tracking-tight text-sm sm:text-base whitespace-nowrap">
            xad <span className="text-slate-400 font-normal">observability</span>
          </span>
        </Link>

        {/* nav: 狭幅は横スクロール（6エントリの折返し崩れを回避） */}
        <nav
          aria-label="メインナビゲーション"
          className="flex-1 min-w-0 overflow-x-auto"
        >
          <ul className="flex items-center gap-0.5 sm:gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "relative inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap no-underline",
                      active
                        ? "text-white bg-white/10"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    ].join(" ")}
                  >
                    {item.label}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-blue-400 shadow-glow-primary"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
