import "server-only";
import { db } from "./db";
import type { DisposableResult, RecurringItem, Tx } from "./types";
// 純Node .mjs（型なし→ allowJs で any 解決）。ロジックの SSOT はこちら（再実装しない）。
import { computeMonthlyDisposable } from "../scripts/lib/disposable.mjs";

// 月境界の文字列（'YYYY-MM-DD'）。tx.date が ISO 日付文字列なので辞書順比較で月抽出できる。
function monthBounds(year: number, month: number): { start: string; next: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const next = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, next };
}

export interface HomeData {
  year: number;
  month: number;
  disposable: DisposableResult;
}

export function getDisposable(year: number, month: number): HomeData {
  const { start, next } = monthBounds(year, month);
  const txs = db
    .prepare(
      "SELECT * FROM transactions WHERE included = 1 AND date >= ? AND date < ?",
    )
    .all(start, next) as Tx[];
  const recurring = db
    .prepare("SELECT * FROM recurring_items WHERE active = 1")
    .all() as RecurringItem[];

  const disposable = computeMonthlyDisposable(txs, recurring, {
    year,
    month,
  }) as DisposableResult;
  return { year, month, disposable };
}

// データの最新性（取引の最大日付）— 連携鮮度の簡易指標。
export function getLatestTxDate(): string | null {
  const row = db.prepare("SELECT MAX(date) d FROM transactions").get() as {
    d: string | null;
  };
  return row.d;
}
