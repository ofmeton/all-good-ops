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
