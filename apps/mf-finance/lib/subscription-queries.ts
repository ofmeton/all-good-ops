import "server-only";
import { db } from "./db";
import { addMonths } from "./format";
// 純Node .mjs（型なし→ allowJs で解決）。検出ロジックの SSOT はこちら（再実装しない）。
import { detectRecurring } from "../scripts/lib/recurring.mjs";

// 実績集計条件（lib/queries.ts と同義。編集禁止ファイルのためこのファイルに再定義）。
const SPEND_WHERE = "included = 1 AND is_transfer = 0 AND is_internal_move = 0";

// --- 型（このモジュール専用） ---

export interface SubscriptionRow {
  name: string;
  monthly: number; // 月額（正値）
  yearly: number; // 年額換算（monthly × 12）
  lastChargedAt: string | null; // 最終課金日 'YYYY-MM-DD'（明細に一致が無ければ null）
  active: boolean; // recurring_items の active。候補は true 扱い（直近データで継続課金中のため）
  confirmed: boolean; // true = recurring_items 確定済み / false = detectRecurring 候補
}

export interface SubscriptionsResult {
  items: SubscriptionRow[]; // 年額換算の大きい順
  totalMonthly: number; // active のみの月額合計
  totalYearly: number; // active のみの年額換算合計
}

// detectRecurring の戻り値（recurring.mjs:30 の形。amountAvg は支出が負値）。
interface RecurringCandidate {
  name: string;
  kind: "income" | "expense";
  amountAvg: number;
  day: number;
  monthsSeen: number;
}

// サブスク一覧 = ①確定済み recurring_items(expense) ∪ ②未登録の検出候補。
export function getSubscriptions(): SubscriptionsResult {
  // ① 確定済み（active=0 の停止中も一覧には出す。合計からは除外）。
  const fixed = db
    .prepare(
      "SELECT name, amount, active FROM recurring_items WHERE kind = 'expense'",
    )
    .all() as { name: string; amount: number; active: number }[];

  // ② 候補検出。scripts/detect-recurring.mjs と同条件:
  //    直近12ヶ月（データ最大月基準）・included/transfer/internal 除外・minMonths=3。
  const maxYm = db
    .prepare("SELECT MAX(substr(date, 1, 7)) ym FROM transactions")
    .get() as { ym: string | null };
  const txs = maxYm.ym
    ? (db
        .prepare(
          `SELECT date, description, amount, is_transfer
           FROM transactions
           WHERE ${SPEND_WHERE} AND substr(date, 1, 7) >= ?`,
        )
        .all(addMonths(maxYm.ym, -11)) as {
        date: string;
        description: string | null;
        amount: number;
        is_transfer: number;
      }[])
    : [];
  const candidates = (
    detectRecurring(txs, {
      minMonths: 3,
      amountTolerance: 0.15,
    }) as RecurringCandidate[]
  ).filter((c) => c.kind === "expense");

  // 最終課金日: description 一致（支出のみ）の最大日付。
  // recurring_items.name は trim 済み description 由来のため TRIM で照合。
  const lastCharged = db.prepare(
    `SELECT MAX(date) d FROM transactions
     WHERE ${SPEND_WHERE} AND amount < 0 AND TRIM(COALESCE(description, '')) = ?`,
  );
  const getLast = (name: string): string | null =>
    (lastCharged.get(name) as { d: string | null }).d;

  const knownNames = new Set(fixed.map((f) => f.name));
  const items: SubscriptionRow[] = [];

  for (const f of fixed) {
    items.push({
      name: f.name,
      monthly: f.amount, // recurring_items.amount は正の magnitude（seed-recurring.mjs の規約）
      yearly: f.amount * 12,
      lastChargedAt: getLast(f.name),
      active: f.active === 1,
      confirmed: true,
    });
  }
  for (const c of candidates) {
    if (knownNames.has(c.name)) continue; // ①に既存の名前は確定側を採用
    const monthly = Math.abs(c.amountAvg);
    items.push({
      name: c.name,
      monthly,
      yearly: monthly * 12,
      lastChargedAt: getLast(c.name),
      active: true,
      confirmed: false,
    });
  }

  items.sort((a, b) => b.yearly - a.yearly);

  const actives = items.filter((i) => i.active);
  const totalMonthly = actives.reduce((s, i) => s + i.monthly, 0);
  return { items, totalMonthly, totalYearly: totalMonthly * 12 };
}
