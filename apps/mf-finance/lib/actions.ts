"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Phase 5 書込 server actions。全て prepared statement（インジェクション防止）。
// 入力は信頼しない: 数値は Number 変換 + NaN ガード、文字列は trim。
// 各 action 末尾でダッシュボード・設定の両ページを revalidate。

function revalidate(): void {
  revalidatePath("/");
  revalidatePath("/settings");
}

// 正の整数に正規化（金額・残高など magnitude 用）。NaN は 0。
function toPositiveInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.abs(Math.round(n));
}

// id ガード（正の整数でなければ throw して無効操作を弾く）。
function ensureId(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("無効な id です");
  }
  return n;
}

// 文字列 trim。空文字は null へ（任意項目用）。
function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// --- recurring_items ---

export async function toggleRecurring(
  id: number,
  active: boolean,
): Promise<void> {
  const _id = ensureId(id);
  db.prepare(
    "UPDATE recurring_items SET active = ?, confirmed = 'user' WHERE id = ?",
  ).run(active ? 1 : 0, _id);
  revalidate();
}

export async function updateRecurringAmount(
  id: number,
  amount: number,
): Promise<void> {
  const _id = ensureId(id);
  const amt = toPositiveInt(amount);
  db.prepare(
    "UPDATE recurring_items SET amount = ?, confirmed = 'user' WHERE id = ?",
  ).run(amt, _id);
  revalidate();
}

export interface AddRecurringInput {
  kind: "income" | "expense";
  name: string;
  amount: number;
  day?: number | null;
}

export async function addRecurring(input: AddRecurringInput): Promise<void> {
  const kind = input.kind === "income" ? "income" : "expense";
  const name = trimOrNull(input.name);
  if (!name) throw new Error("名前は必須です");
  const amount = toPositiveInt(input.amount);
  let day: number | null = null;
  if (input.day != null) {
    const d = Number(input.day);
    if (Number.isInteger(d) && d >= 1 && d <= 31) day = d;
  }
  db.prepare(
    "INSERT INTO recurring_items (kind, name, amount, day, active, confirmed) VALUES (?, ?, ?, ?, 1, 'user')",
  ).run(kind, name, amount, day);
  revalidate();
}

export async function deleteRecurring(id: number): Promise<void> {
  const _id = ensureId(id);
  db.prepare("DELETE FROM recurring_items WHERE id = ?").run(_id);
  revalidate();
}

// --- manual_liabilities ---

export interface AddManualLiabilityInput {
  name: string;
  lender?: string;
  balance?: number;
  rate?: number;
  monthly_payment?: number;
  as_of_date?: string;
}

export async function addManualLiability(
  input: AddManualLiabilityInput,
): Promise<void> {
  const name = trimOrNull(input.name);
  if (!name) throw new Error("名前は必須です");
  const lender = trimOrNull(input.lender);
  // balance / monthly_payment は整数 magnitude、rate は実数（%）。未入力は null。
  const balance =
    input.balance == null || input.balance === ("" as unknown)
      ? null
      : toPositiveInt(input.balance);
  const monthly =
    input.monthly_payment == null || input.monthly_payment === ("" as unknown)
      ? null
      : toPositiveInt(input.monthly_payment);
  let rate: number | null = null;
  if (input.rate != null && input.rate !== ("" as unknown)) {
    const r = Number(input.rate);
    if (Number.isFinite(r) && r >= 0) rate = r;
  }
  // 'YYYY-MM-DD' 形式のみ受理（date input 由来）。それ以外は null。
  const asOf = trimOrNull(input.as_of_date);
  const asOfDate = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : null;

  db.prepare(
    "INSERT INTO manual_liabilities (name, lender, balance, rate, monthly_payment, as_of_date) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(name, lender, balance, rate, monthly, asOfDate);
  revalidate();
}

export async function deleteManualLiability(id: number): Promise<void> {
  const _id = ensureId(id);
  db.prepare("DELETE FROM manual_liabilities WHERE id = ?").run(_id);
  revalidate();
}
