"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Phase 5 書込 server actions。全て prepared statement（インジェクション防止）。
// 入力は信頼しない: 数値は Number 変換 + NaN ガード、文字列は trim。
// 各 action 末尾でダッシュボード・設定の両ページを revalidate。

function revalidate(): void {
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/cashflow");
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

function parseMonthlyDay(v: unknown, required: boolean): number | null {
  if (v == null || v === "") {
    if (required) throw new Error("日を1〜31で入力してください");
    return null;
  }
  const d = Number(v);
  if (!Number.isInteger(d) || d < 1 || d > 31) {
    throw new Error("日を1〜31で入力してください");
  }
  return d;
}

function positiveOverrideAmount(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("金額は正の数で入力してください");
  }
  const rounded = Math.round(n);
  if (rounded <= 0) {
    throw new Error("金額は正の数で入力してください");
  }
  return rounded;
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
  frequency?: "monthly" | "weekly";
  weekday?: number | null;
  amount_type?: "fixed" | "variable";
  account?: string | null;
}

export async function addRecurring(input: AddRecurringInput): Promise<void> {
  const kind = input.kind === "income" ? "income" : "expense";
  const name = trimOrNull(input.name);
  if (!name) throw new Error("名前は必須です");
  let amount = toPositiveInt(input.amount);
  let day: number | null = null;
  let frequency: "monthly" | "weekly" = "monthly";
  let weekday: number | null = null;
  let amountType: "fixed" | "variable" = "fixed";

  if (kind === "income") {
    frequency = input.frequency === "weekly" ? "weekly" : "monthly";
    amountType = input.amount_type === "variable" ? "variable" : "fixed";
  }

  if (kind === "expense") {
    frequency = "monthly";
    weekday = null;
    amountType = "fixed";
    day = parseMonthlyDay(input.day, false);
  } else if (frequency === "weekly") {
    const wd = Number(input.weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
      throw new Error("曜日を選択してください");
    }
    day = null;
    weekday = wd;
  } else {
    day = parseMonthlyDay(input.day, true);
    weekday = null;
  }

  if (amountType === "fixed" && amount <= 0) {
    throw new Error("金額は正の数で入力してください");
  }
  if (amountType === "variable") {
    amount = 0;
  }
  const account = trimOrNull(input.account);

  db.prepare(
    "INSERT INTO recurring_items (kind, name, amount, day, frequency, weekday, amount_type, account, active, confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'user')",
  ).run(kind, name, amount, day, frequency, weekday, amountType, account);
  revalidate();
}

export async function updateRecurringAccount(
  id: number,
  account: string | null,
): Promise<void> {
  const _id = ensureId(id);
  // 資金場所もユーザー編集なので、金額編集と同じく確認済みにする。
  const info = db.prepare(
    "UPDATE recurring_items SET account = ?, confirmed = 'user' WHERE id = ?",
  ).run(trimOrNull(account), _id);
  if (info.changes === 0) {
    throw new Error("対象の定期項目が見つかりません");
  }
  revalidate();
}

export async function deleteRecurring(id: number): Promise<void> {
  const _id = ensureId(id);
  db.prepare("DELETE FROM recurring_items WHERE id = ?").run(_id);
  revalidate();
}

function ensureIsoDate(date: unknown): string {
  const s = trimOrNull(date);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error("日付形式が不正です");
  }
  return s;
}

export async function setOccurrenceOverride(
  recurringId: number,
  date: string,
  patch: { skip?: boolean; amount?: number | null },
): Promise<void> {
  const _id = ensureId(recurringId);
  const occurrenceDate = ensureIsoDate(date);
  const recurring = db
    .prepare("SELECT kind FROM recurring_items WHERE id = ?")
    .get(_id) as { kind: "income" | "expense" } | undefined;
  if (!recurring) throw new Error("定期項目が見つかりません");
  if (recurring.kind !== "income") {
    throw new Error("発生回の上書きは定期収入のみ対応しています");
  }
  const skip = patch.skip === true ? 1 : 0;
  const amount =
    Object.prototype.hasOwnProperty.call(patch, "amount") && patch.amount != null
      ? positiveOverrideAmount(patch.amount)
      : null;

  db.prepare(
    `INSERT INTO recurring_overrides (recurring_id, occurrence_date, skip, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(recurring_id, occurrence_date) DO UPDATE SET
       skip = excluded.skip,
       amount = excluded.amount`,
  ).run(_id, occurrenceDate, skip, amount);
  revalidatePath("/");
  revalidatePath("/cashflow");
}

export async function clearOccurrenceOverride(
  recurringId: number,
  date: string,
): Promise<void> {
  const _id = ensureId(recurringId);
  const occurrenceDate = ensureIsoDate(date);
  const recurring = db
    .prepare("SELECT kind FROM recurring_items WHERE id = ?")
    .get(_id) as { kind: "income" | "expense" } | undefined;
  if (!recurring) throw new Error("定期項目が見つかりません");
  if (recurring.kind !== "income") {
    throw new Error("発生回の上書きは定期収入のみ対応しています");
  }
  db.prepare("DELETE FROM recurring_overrides WHERE recurring_id = ? AND occurrence_date = ?").run(
    _id,
    occurrenceDate,
  );
  revalidatePath("/");
  revalidatePath("/cashflow");
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

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setTransferFee(from_account: string, fee: number): Promise<ActionResult> {
  try {
    const account = trimOrNull(from_account);
    if (!account) return { ok: false, error: "出金口座を選択してください" };
    const n = Number(fee);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "手数料は0以上で入力してください" };
    }
    const amount = Math.round(n);
    db.prepare(
      `INSERT INTO transfer_fees (from_account, fee, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
       ON CONFLICT(from_account) DO UPDATE SET
         fee = excluded.fee,
         updated_at = excluded.updated_at`,
    ).run(account, amount);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteTransferFee(from_account: string): Promise<ActionResult> {
  try {
    const account = trimOrNull(from_account);
    if (!account) return { ok: false, error: "出金口座が不正です" };
    db.prepare("DELETE FROM transfer_fees WHERE from_account = ?").run(account);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
