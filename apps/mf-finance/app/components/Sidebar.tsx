"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  Settings,
  Wallet,
} from "./icons";
import { groupForPath, navGroups } from "./nav";

const icons = {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Landmark,
  Settings,
};

export function Sidebar({ variant = "fixed" }: { variant?: "fixed" | "drawer" }) {
  const pathname = usePathname();
  const activeGroup = groupForPath(pathname);
  const shellClass =
    variant === "fixed"
      ? "hidden border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col"
      : "flex h-full w-60 flex-col border-r border-border bg-surface";

  return (
    <aside className={shellClass} aria-label="グローバルナビゲーション">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/"
          className="font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          家計
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navGroups.map((group) => {
          const Icon = icons[group.icon];
          const active = activeGroup === group.key;
          return (
            <Link
              key={group.key}
              href={group.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{group.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
