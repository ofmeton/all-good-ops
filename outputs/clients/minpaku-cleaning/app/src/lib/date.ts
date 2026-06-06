// JST 基準の日付ユーティリティ。
// Vercel Serverless Runtime は TZ env を予約しており、サーバの実 TZ は UTC。
// new Date() のローカル日付/時刻に依存すると JST 00:00〜09:00 の間で日付が
// 1日ずれ、通知の冪等性（hasSentToday）やリマインド対象日がずれる。
// そのため日付計算はすべて Intl(timeZone: "Asia/Tokyo") を経由し、
// ランタイム TZ に依存しないようにする。

const JST = "Asia/Tokyo";

function ymdInJST(date: Date): string {
  // en-CA ロケールは YYYY-MM-DD を返す
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// JST の当日 YYYY-MM-DD。
export function todayInJST(): string {
  return ymdInJST(new Date());
}

// JST の翌日 YYYY-MM-DD。
export function tomorrowInJST(): string {
  return ymdInJST(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

// JST 当日 00:00 の瞬間を ISO 文字列で返す（timestamptz 比較の下限境界に使う）。
// 例: JST 2026-06-06 00:00 → "2026-06-05T15:00:00.000Z"
export function startOfTodayJstIso(): string {
  // JST は UTC+9 固定（DST なし）なので +09:00 を明示した瞬間を生成すれば確定する。
  return new Date(`${todayInJST()}T00:00:00+09:00`).toISOString();
}
