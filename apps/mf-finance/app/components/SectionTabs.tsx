"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, type NavGroupKey } from "./nav";

export function SectionTabs({ group }: { group: NavGroupKey }) {
  const pathname = usePathname();
  const items = navGroups.find((item) => item.key === group)?.children ?? [];

  if (items.length < 2) return null;

  return (
    <nav
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
      aria-label="セクション"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? "border-primary bg-surface text-primary shadow-sm"
                : "border-border bg-background text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
