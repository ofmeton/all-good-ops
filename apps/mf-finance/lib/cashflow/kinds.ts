// 口座種別（kind）の共有定数・純関数。DB非依存なので client/server 両用。
// （server-only の cashflow-queries から分離し、client component が安全に import できるようにする）

export type BalanceKind = "bank" | "card" | "emoney" | "cash" | "crypto" | "other";

export const KIND_LABEL: Record<BalanceKind, string> = {
  bank: "銀行",
  card: "カード",
  emoney: "電子マネー",
  cash: "現金",
  crypto: "暗号資産",
  other: "その他",
};

export const KIND_OPTIONS: BalanceKind[] = ["bank", "card", "emoney", "cash", "crypto", "other"];

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// 口座名 → kind の既定推定（投入時/未設定時のフォールバック）。
export function guessKind(account: string): BalanceKind {
  if (/銀行|ゆうちょ|bank/i.test(account)) return "bank";
  if (/カード|card|JCB|VISA|Vpass|Amazon/i.test(account)) return "card";
  if (/PayPay|PASMO|Suica|楽天ペイ|電子マネー|emoney/i.test(account)) return "emoney";
  if (/現金|cash/i.test(account)) return "cash";
  if (/暗号|crypto|bit/i.test(account)) return "crypto";
  return "other";
}
