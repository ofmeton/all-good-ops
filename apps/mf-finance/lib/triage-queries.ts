import "server-only";
import { db } from "@/lib/db";

export interface TriageGroup {
  description: string;
  count: number;
  txnIds: string[];
  amountMin: number;
  amountMax: number;
  amountTotal: number;
  dateMin: string;
  dateMax: string;
  accounts: string[];
}

export interface CategoryOption {
  major: string;
  middle: string;
  usage: number;
}

export interface TriageSummary {
  unknownCount: number;
  groupCount: number;
}

export function getTriageGroups(): TriageGroup[] {
  const rows = db
    .prepare(
      `SELECT id, TRIM(description) AS description, amount, date, account
         FROM transactions
        WHERE classification = 'unknown' AND description IS NOT NULL`,
    )
    .all() as {
    id: string;
    description: string;
    amount: number;
    date: string;
    account: string | null;
  }[];
  const grouped = new Map<string, TriageGroup>();
  for (const row of rows) {
    const current = grouped.get(row.description);
    if (current) {
      current.count += 1;
      current.txnIds.push(row.id);
      current.amountMin = Math.min(current.amountMin, row.amount);
      current.amountMax = Math.max(current.amountMax, row.amount);
      current.amountTotal += row.amount;
      current.dateMin = row.date < current.dateMin ? row.date : current.dateMin;
      current.dateMax = row.date > current.dateMax ? row.date : current.dateMax;
      if (row.account && !current.accounts.includes(row.account)) {
        current.accounts.push(row.account);
      }
      continue;
    }
    grouped.set(row.description, {
      description: row.description,
      count: 1,
      txnIds: [row.id],
      amountMin: row.amount,
      amountMax: row.amount,
      amountTotal: row.amount,
      dateMin: row.date,
      dateMax: row.date,
      accounts: row.account ? [row.account] : [],
    });
  }
  return [...grouped.values()].sort(
    (a, b) =>
      b.count - a.count ||
      Math.abs(b.amountTotal) - Math.abs(a.amountTotal) ||
      a.description.localeCompare(b.description, "ja"),
  );
}

export function getCategoryOptions(): CategoryOption[] {
  return db
    .prepare(
      `SELECT category_major AS major, category_middle AS middle, COUNT(*) AS usage
         FROM transactions
        WHERE category_major IS NOT NULL
          AND category_middle IS NOT NULL
          AND TRIM(category_major) <> ''
          AND TRIM(category_middle) <> ''
          AND category_major <> '未分類'
          AND category_middle <> '未分類'
        GROUP BY category_major, category_middle
        ORDER BY usage DESC, major ASC, middle ASC`,
    )
    .all() as CategoryOption[];
}

export function getTriageSummary(): TriageSummary {
  const unknownCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM transactions WHERE classification = 'unknown'")
      .get() as { c: number }
  ).c;
  const groupCount = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT TRIM(description)) AS c
           FROM transactions
          WHERE classification = 'unknown' AND description IS NOT NULL`,
      )
      .get() as { c: number }
  ).c;
  return { unknownCount, groupCount };
}
