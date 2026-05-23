import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";

type NavKey =
  | "dashboard"
  | "requests"
  | "properties"
  | "staff"
  | "owners"
  | "supplies"
  | "admins";

type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  icon: IconName;
};

const NAV: NavItem[] = [
  { key: "dashboard", href: "/admin", label: "ダッシュボード", icon: "LayoutDashboard" },
  { key: "requests", href: "/admin/requests", label: "依頼管理", icon: "ClipboardList" },
  { key: "properties", href: "/admin/properties", label: "物件管理", icon: "Building2" },
  { key: "staff", href: "/admin/staff", label: "スタッフ管理", icon: "Users" },
  { key: "owners", href: "/admin/owners", label: "オーナー管理", icon: "IdCard" },
  { key: "supplies", href: "/admin/supplies", label: "備品管理", icon: "Package" },
  { key: "admins", href: "/admin/admins", label: "管理者", icon: "ShieldCheck" },
];

const BOTTOM_TABS: { key: NavKey; href: string; label: string; icon: IconName }[] = [
  { key: "dashboard", href: "/admin", label: "ホーム", icon: "LayoutDashboard" },
  { key: "requests", href: "/admin/requests", label: "依頼", icon: "ClipboardList" },
  { key: "properties", href: "/admin/properties", label: "物件", icon: "Building2" },
  { key: "staff", href: "/admin/staff", label: "スタッフ", icon: "Users" },
  { key: "owners", href: "/admin/owners", label: "その他", icon: "Ellipsis" },
];

type AdminShellProps = {
  current: NavKey;
  userName?: string;
  children: ReactNode;
};

export function AdminShell({ current, userName = "管", children }: AdminShellProps) {
  const initial = (userName || "管").trim().slice(0, 2);
  return (
    <div className="min-h-screen bg-ink-50">
      {/* ===== PC: sidebar shell (lg+) ===== */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-[232px] shrink-0 bg-ink-900 text-white flex flex-col">
          <div className="px-5 pt-5 pb-6 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Icon name="Sparkles" size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-extrabold text-[16px]">StayClean</div>
              <div className="text-[10px] text-ink-400">Admin Console</div>
            </div>
          </div>
          <nav className="px-3 flex-1 space-y-0.5">
            {NAV.map((n) => {
              const active = current === n.key;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] ${
                    active
                      ? "bg-white/10 text-white font-semibold"
                      : "text-ink-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon name={n.icon} size={16} />
                  <span className="flex-1">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="m-3 p-3 rounded-xl bg-white/[0.06] flex items-center gap-3">
            <Avatar name={initial} color="bg-brand-500" size={32} />
            <div className="leading-tight min-w-0">
              <div className="text-[12.5px] font-semibold truncate">{userName}</div>
              <div className="text-[10.5px] text-ink-400">Administrator</div>
            </div>
          </div>
        </aside>
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 bg-white border-b border-ink-200 flex items-center px-6 gap-4">
            <h1 className="text-[15px] font-bold text-ink-900 sr-only">{
              NAV.find((n) => n.key === current)?.label ?? "StayClean"
            }</h1>
            <div className="flex-1" />
            <button
              type="button"
              aria-label="通知"
              className="h-9 w-9 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-600"
            >
              <Icon name="Bell" size={16} />
            </button>
          </header>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </div>

      {/* ===== Mobile (<lg): top + bottom tab shell ===== */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-ink-200 flex items-center px-4 gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 min-w-0"
            aria-label="ダッシュボードへ"
          >
            <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Icon name="Sparkles" size={14} />
            </div>
            <div className="font-display font-extrabold text-[14px] text-ink-900 truncate">
              StayClean
            </div>
          </Link>
          <div className="flex-1" />
          <button
            type="button"
            aria-label="通知"
            className="h-9 w-9 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-600 relative"
          >
            <Icon name="Bell" size={16} />
          </button>
          <Avatar name={initial} color="bg-brand-500" size={28} />
        </header>

        <div className="flex-1 p-4">{children}</div>

        <nav className="sticky bottom-0 z-20 h-14 bg-white border-t border-ink-100 px-2 flex pt-1.5 pb-1">
          {BOTTOM_TABS.map((t) => {
            const active = current === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`flex-1 flex flex-col items-center gap-0.5 ${
                  active ? "text-brand-600" : "text-ink-500"
                }`}
              >
                <Icon name={t.icon} size={18} />
                <span className="text-[9.5px] font-semibold">{t.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
