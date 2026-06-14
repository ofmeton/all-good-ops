import "server-only";
import { db } from "@/lib/db";

// Phase 5 設定画面用の読取クエリ。active/confirmed を問わず全件返す（編集対象なので絞らない）。
// 既存 lib/queries.ts には足さず、書込 UI 専用の型・クエリをこのファイルに隔離。

// recurring_items の全フィールド（編集 UI が income/expense を分けて扱えるよう kind 含む全カラム）。
export interface RecurringRow {
  id: number;
  kind: "income" | "expense";
  name: string;
  amount: number; // 正の magnitude
  day: number | null;
  frequency: "monthly" | "weekly";
  weekday: number | null;
  amount_type: "fixed" | "variable";
  account: string | null;
  active: number; // 0/1
  confirmed: "auto" | "user";
}

// manual_liabilities の全フィールド。balance/rate/monthly_payment は未入力で null 可。
export interface LiabilityRow {
  id: number;
  name: string;
  lender: string | null;
  balance: number | null;
  rate: number | null;
  monthly_payment: number | null;
  as_of_date: string | null; // 'YYYY-MM-DD'
}

export function getRecurringItems(): RecurringRow[] {
  return db
    .prepare(
      "SELECT id, kind, name, amount, day, frequency, weekday, amount_type, account, active, confirmed FROM recurring_items ORDER BY kind, frequency, day IS NULL, day, weekday, id",
    )
    .all() as RecurringRow[];
}

export function getManualLiabilities(): LiabilityRow[] {
  return db
    .prepare(
      "SELECT id, name, lender, balance, rate, monthly_payment, as_of_date FROM manual_liabilities ORDER BY id",
    )
    .all() as LiabilityRow[];
}
