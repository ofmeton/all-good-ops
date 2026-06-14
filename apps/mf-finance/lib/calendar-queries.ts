import "server-only";
import { db } from "@/lib/db";

// Plan 2 Phase 4: 引落予定 vs 残高カレンダー専用クエリ（server-only）。
// 既存 lib/queries.ts には触れず、本ファイルで型・クエリを自己完結させる。

// 最新の資産スナップショット（asset_history の最大日付の行）。
export interface LatestAsset {
  date: string; // 'YYYY-MM-DD'
  total: number; // 円
}

// その月の 1 件の引落／入金予定。amount は常に正の magnitude。
export interface PayoutItem {
  id: number;
  name: string;
  kind: "income" | "expense";
  day: number; // 1–31（recurring_items.day）
  amount: number; // 正値
  date: string; // 'YYYY-MM-DD'（その月の予定日。月末超過分は月末にクランプ）
}

// 予測残高推移の 1 件（予定 + 適用後残高）。
export type ProjectedItem = PayoutItem & { balanceAfter: number };

export interface ProjectedBalance {
  startBalance: number; // 起点（最新資産 total）。資産が無ければ 0。
  baseDate: string | null; // 起点の基準日（最新資産日付）。資産が無ければ null。
  items: ProjectedItem[]; // day 昇順、各時点の残高付き
  endBalance: number; // 全予定適用後の残高
  goesNegative: boolean; // 途中で残高がマイナスに転じるか
}

// asset_history の最新行。データが無ければ null。
export function getLatestAsset(): LatestAsset | null {
  const row = db
    .prepare(
      "SELECT date, total FROM asset_history WHERE total IS NOT NULL ORDER BY date DESC LIMIT 1",
    )
    .get() as { date: string; total: number } | undefined;
  return row ? { date: row.date, total: row.total } : null;
}

// その月の日数（month は 1–12）。day クランプに使う。
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// active かつ day が非NULL の recurring_items を、当月の引落／入金予定として返す（day 昇順）。
export function getPayoutSchedule(year: number, month: number): PayoutItem[] {
  const rows = db
    .prepare(
      `SELECT id, kind, name, amount, day
         FROM recurring_items
        WHERE active = 1 AND day IS NOT NULL
        ORDER BY day ASC, id ASC`,
    )
    .all() as {
    id: number;
    kind: "income" | "expense";
    name: string;
    amount: number;
    day: number;
  }[];

  const dim = daysInMonth(year, month);
  const mm = String(month).padStart(2, "0");

  return rows.map((r) => {
    const effDay = Math.min(r.day, dim); // 月末超過（例: 31日が30日まで）の予定は月末に寄せる
    const date = `${year}-${mm}-${String(effDay).padStart(2, "0")}`;
    return {
      id: r.id,
      name: r.name,
      kind: r.kind,
      day: r.day,
      amount: Math.abs(r.amount),
      date,
    };
  });
}

// 最新資産 total を起点に、その月の引落／入金予定を day 順に適用した予測残高推移。
// expense は減算・income は加算。途中で残高がマイナスに転じれば goesNegative=true。
export function getProjectedBalance(year: number, month: number): ProjectedBalance {
  const asset = getLatestAsset();
  const startBalance = asset?.total ?? 0;
  const baseDate = asset?.date ?? null;

  const schedule = getPayoutSchedule(year, month);

  let running = startBalance;
  let goesNegative = false;
  const items: ProjectedItem[] = schedule.map((p) => {
    running += p.kind === "income" ? p.amount : -p.amount;
    if (running < 0) goesNegative = true;
    return { ...p, balanceAfter: running };
  });

  return {
    startBalance,
    baseDate,
    items,
    endBalance: running,
    goesNegative,
  };
}
