export type NavGroupKey =
  | "dashboard"
  | "cashflow"
  | "expense"
  | "assets"
  | "settings";

export type NavGroup = {
  key: NavGroupKey;
  label: string;
  href: string;
  icon:
    | "LayoutDashboard"
    | "ArrowLeftRight"
    | "Wallet"
    | "Landmark"
    | "Settings";
  children: { href: string; label: string }[];
};

export const navGroups: NavGroup[] = [
  {
    key: "dashboard",
    label: "ダッシュボード",
    href: "/",
    icon: "LayoutDashboard",
    children: [],
  },
  {
    key: "cashflow",
    label: "キャッシュフロー",
    href: "/cashflow",
    icon: "ArrowLeftRight",
    children: [],
  },
  {
    key: "expense",
    label: "支出",
    href: "/categories",
    icon: "Wallet",
    children: [
      { href: "/categories", label: "分析" },
      { href: "/budget", label: "予算" },
      { href: "/subscriptions", label: "サブスク" },
      { href: "/rules", label: "ルール" },
      { href: "/rules/triage", label: "仕分け" },
      { href: "/tax", label: "税・経費" },
    ],
  },
  {
    key: "assets",
    label: "資産",
    href: "/assets",
    icon: "Landmark",
    children: [],
  },
  {
    key: "settings",
    label: "設定",
    href: "/settings",
    icon: "Settings",
    children: [
      { href: "/settings", label: "設定" },
      { href: "/optimizer", label: "提案キュー" },
    ],
  },
];

const expensePaths = new Set(
  navGroups.find((group) => group.key === "expense")?.children.map((item) => item.href),
);

export function groupForPath(pathname: string): NavGroupKey {
  if (expensePaths.has(pathname) || pathname.startsWith("/rules/")) return "expense";
  if (pathname === "/settings" || pathname === "/optimizer") return "settings";
  if (pathname === "/cashflow") return "cashflow";
  if (pathname === "/assets") return "assets";
  return "dashboard";
}
