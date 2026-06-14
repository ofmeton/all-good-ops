"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// budgets テーブル専用の server actions（書込はこのファイルからのみ）。
// 入力は信頼しない: カテゴリは trim + 空ガード、金額は正整数化。全て prepared statement。
// client から直接 await されるため throw せず result 型で返す
// （server action の例外は production で details が落ち、未ハンドルだと UI が壊れる）。

export type BudgetActionResult = { ok: true } | { ok: false; error: string };

function revalidate(): void {
  revalidatePath("/budget");
  revalidatePath("/");
}

// trim 済みカテゴリ。空・非文字列は null。
function normalizeCategory(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

// 正の整数（1以上）に正規化。それ以外（0円・負・NaN）は null。
function normalizePositiveInt(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// カテゴリ別予算の作成/更新（category_major UNIQUE への upsert）。
export async function upsertBudget(
  category_major: string,
  amount: number,
): Promise<BudgetActionResult> {
  const cat = normalizeCategory(category_major);
  if (cat === null) return { ok: false, error: "カテゴリが不正です" };
  const amt = normalizePositiveInt(amount);
  if (amt === null) {
    return { ok: false, error: "金額は1円以上の整数で入力してください" };
  }
  db.prepare(
    `INSERT INTO budgets (category_major, amount) VALUES (?, ?)
     ON CONFLICT(category_major) DO UPDATE SET amount = excluded.amount`,
  ).run(cat, amt);
  revalidate();
  return { ok: true };
}

// カテゴリ別予算の削除（未設定カテゴリ指定は no-op）。
export async function deleteBudget(
  category_major: string,
): Promise<BudgetActionResult> {
  const cat = normalizeCategory(category_major);
  if (cat === null) return { ok: false, error: "カテゴリが不正です" };
  db.prepare("DELETE FROM budgets WHERE category_major = ?").run(cat);
  revalidate();
  return { ok: true };
}
