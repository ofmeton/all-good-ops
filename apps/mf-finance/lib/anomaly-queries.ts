import "server-only";
import { db } from "./db";
import { formatYm, shortDate, yen } from "./format";

// 異常検知（読み取り専用）。3ルール:
//   1. カテゴリ急増   — 当月支出 > max(直近3populated月平均×1.5, 平均+5000) かつ 当月 >= 10000
//   2. 二重請求疑い   — 同一 description × 同一 amount(<0) が3日以内に2回以上
//   3. 初出の大口支出 — amount <= -20000 で description が過去に一度も出現していない

export interface Anomaly {
  key: string;
  tone: "negative" | "warning";
  title: string;
  detail: string;
}

// 実績集計条件（queries.ts と同義・自ファイル再定義）。
const ACTUAL_WHERE =
  "included = 1 AND is_transfer = 0 AND is_internal_move = 0";
const CAT_EXPR = "COALESCE(NULLIF(TRIM(category_major), ''), '未分類')";

const MAX_ALERTS = 8;
const SURGE_MIN_SPEND = 10000; // ルール1: 当月支出の下限
const SURGE_RATIO = 1.5; // ルール1: 平均比
const SURGE_MARGIN = 5000; // ルール1: 平均+絶対差
const DUP_WINDOW_DAYS = 3; // ルール2: 同額同名の許容間隔
const FIRST_LARGE_THRESHOLD = -20000; // ルール3: 大口の閾値（amount がこれ以下）

// 'YYYY-MM-DD' → 通算日数（日付差の計算用。TZ 非依存）。
function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

// 重要度: negative 優先 → 同 tone 内は金額インパクト降順。
type Weighted = Anomaly & { weight: number };

function ruleCategorySurge(ym: string): Weighted[] {
  const rows = db
    .prepare(
      `WITH cur AS (
         SELECT ${CAT_EXPR} AS cat, SUM(-amount) AS spend
         FROM transactions
         WHERE ${ACTUAL_WHERE} AND amount < 0 AND substr(date, 1, 7) = ?
         GROUP BY cat
       ),
       monthly AS (
         SELECT ${CAT_EXPR} AS cat, substr(date, 1, 7) AS m, SUM(-amount) AS spend
         FROM transactions
         WHERE ${ACTUAL_WHERE} AND amount < 0 AND substr(date, 1, 7) < ?
         GROUP BY cat, m
         HAVING spend > 0
       ),
       ranked AS (
         SELECT cat, spend,
                ROW_NUMBER() OVER (PARTITION BY cat ORDER BY m DESC) AS rn
         FROM monthly
       ),
       avg3 AS (
         SELECT cat, AVG(spend) AS avg FROM ranked WHERE rn <= 3 GROUP BY cat
       )
       SELECT cur.cat AS cat, cur.spend AS spend, avg3.avg AS avg
       FROM cur JOIN avg3 ON avg3.cat = cur.cat`,
    )
    .all(ym, ym) as { cat: string; spend: number; avg: number }[];

  const out: Weighted[] = [];
  for (const r of rows) {
    const threshold = Math.max(r.avg * SURGE_RATIO, r.avg + SURGE_MARGIN);
    if (r.spend < SURGE_MIN_SPEND || r.spend <= threshold) continue;
    const pct = Math.round((r.spend / r.avg - 1) * 100);
    out.push({
      key: `surge-${r.cat}`,
      tone: "warning",
      title: `${r.cat}が平均より${pct}%多い`,
      detail: `今月 ¥${yen(r.spend)} / 直近3ヶ月平均 ¥${yen(Math.round(r.avg))}`,
      weight: r.spend - r.avg,
    });
  }
  return out;
}

function ruleDuplicateCharge(ym: string): Weighted[] {
  const groups = db
    .prepare(
      `SELECT description AS d, amount AS a,
              GROUP_CONCAT(date) AS dates, COUNT(*) AS n
       FROM transactions
       WHERE ${ACTUAL_WHERE} AND amount < 0 AND substr(date, 1, 7) = ?
         AND description IS NOT NULL AND TRIM(description) <> ''
       GROUP BY description, amount
       HAVING n >= 2`,
    )
    .all(ym) as { d: string; a: number; dates: string; n: number }[];

  const out: Weighted[] = [];
  for (const g of groups) {
    const dates = g.dates.split(",").sort();
    // 連続間隔が DUP_WINDOW_DAYS 以内のかたまり（最大のもの）を検出。
    let bestLen = 1;
    let bestStart = 0;
    let runStart = 0;
    for (let i = 1; i < dates.length; i++) {
      if (dayNumber(dates[i]) - dayNumber(dates[i - 1]) > DUP_WINDOW_DAYS) {
        runStart = i;
      }
      const len = i - runStart + 1;
      if (len > bestLen) {
        bestLen = len;
        bestStart = runStart;
      }
    }
    if (bestLen < 2) continue;
    const first = dates[bestStart];
    const last = dates[bestStart + bestLen - 1];
    out.push({
      key: `dup-${g.d}-${g.a}`,
      tone: "negative",
      title: `二重請求の可能性: ${g.d} ¥${yen(-g.a)} × ${bestLen}回`,
      detail:
        first === last
          ? `${shortDate(first)} に同額の支払いが${bestLen}回あります`
          : `${shortDate(first)}〜${shortDate(last)} に同額の支払いが${bestLen}回あります`,
      weight: -g.a * bestLen,
    });
  }
  return out;
}

function ruleFirstLargeExpense(ym: string): Weighted[] {
  const monthStart = `${ym}-01`;
  const rows = db
    .prepare(
      `SELECT t.id AS id, t.date AS date, t.description AS description, t.amount AS amount
       FROM transactions t
       WHERE ${ACTUAL_WHERE.replaceAll("included", "t.included")
         .replaceAll("is_transfer", "t.is_transfer")
         .replaceAll("is_internal_move", "t.is_internal_move")}
         AND substr(t.date, 1, 7) = ? AND t.amount <= ?
         AND t.description IS NOT NULL AND TRIM(t.description) <> ''
         AND NOT EXISTS (
           SELECT 1 FROM transactions p
           WHERE p.description = t.description AND p.date < ?
         )
       ORDER BY t.amount ASC`,
    )
    .all(ym, FIRST_LARGE_THRESHOLD, monthStart) as {
    id: string;
    date: string;
    description: string;
    amount: number;
  }[];

  return rows.map((r) => ({
    key: `first-${r.id}`,
    tone: "warning" as const,
    title: `初めての大口支出: ${r.description} ¥${yen(-r.amount)}`,
    detail: `${shortDate(r.date)}・過去に同じ明細はありません`,
    weight: -r.amount,
  }));
}

// 選択月の異常一覧。negative 優先 → 金額インパクト降順、最大8件。
export function getAnomalies(year: number, month: number): Anomaly[] {
  const ym = formatYm(year, month);
  const all: Weighted[] = [
    ...ruleDuplicateCharge(ym),
    ...ruleCategorySurge(ym),
    ...ruleFirstLargeExpense(ym),
  ];
  all.sort((a, b) => {
    if (a.tone !== b.tone) return a.tone === "negative" ? -1 : 1;
    return b.weight - a.weight;
  });
  return all
    .slice(0, MAX_ALERTS)
    .map(({ key, tone, title, detail }) => ({ key, tone, title, detail }));
}
