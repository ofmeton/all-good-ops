// 表示フォーマッタ（円・日付）。client/server 両用（'use server' なし）。

export function yen(n: number): string {
  return `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("ja-JP")}`;
}

export function yenSigned(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(Math.round(n)).toLocaleString("ja-JP")}`;
}

export function monthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

// 'YYYY-MM-DD' → 'M月D日'
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

// --- 月キー（'YYYY-MM'）ユーティリティ。client/server 両用（月セレクタ + 集計クエリで共有） ---

// 'YYYY-MM' 形式かを厳密判定（searchParams など信頼できない入力のガード）。
export function isValidYm(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function parseYm(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

export function formatYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// 月キーに delta ヶ月を加算（負も可）。年跨ぎを正しく処理。
export function addMonths(ym: string, delta: number): string {
  const { year, month } = parseYm(ym);
  const total = year * 12 + (month - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return formatYm(ny, nm);
}

// 'YYYY-MM' → '2026年3月'
export function ymLabel(ym: string): string {
  const { year, month } = parseYm(ym);
  return monthLabel(year, month);
}

// 'YYYY-MM' → '3月'（軸ラベル等の短縮）
export function ymShort(ym: string): string {
  return `${parseYm(ym).month}月`;
}
