"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { isKnownCardAccount } from "@/lib/cashflow-queries";
import { guessKind, type BalanceKind } from "@/lib/cashflow/kinds";

// 資金繰り（scheduled_cashflow / account_balances）の書込 server actions。
// 全て prepared statement・入力検証。{ok}|{ok,error} 返却（UI 例外回避）。

export type CashflowActionResult = { ok: true } | { ok: false; error: string };

function revalidate(): void {
  revalidatePath("/cashflow");
  revalidatePath("/");
}

function toPositiveInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.abs(Math.round(n)) : 0;
}
function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function resolveTransferFee(fromAccount: string): number {
  const row = db
    .prepare(
      `SELECT fee FROM transfer_fees
       WHERE from_account IN (?, '__default__')
       ORDER BY CASE WHEN from_account = ? THEN 0 ELSE 1 END
       LIMIT 1`,
    )
    .get(fromAccount, fromAccount) as { fee: number } | undefined;
  return Math.max(0, Math.round(Number(row?.fee ?? 0)));
}

function accountExists(account: string): boolean {
  const row = db.prepare("SELECT 1 FROM account_balances WHERE account = ?").get(account);
  return Boolean(row);
}

function accountKind(account: string): BalanceKind | null {
  const row = db.prepare("SELECT kind FROM account_balances WHERE account = ?").get(account) as
    | { kind: BalanceKind }
    | undefined;
  return row?.kind ?? null;
}

function validateChargeDay(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) return 0;
  return n;
}

function validateBillingMonthOffset(value: unknown): number {
  if (value == null || value === "") return 1;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 6) return 0;
  return n;
}

function validateClosingDay(value: unknown): number {
  if (value == null || value === "") return 31;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) return 0;
  return n;
}

export interface ScheduledInput {
  kind: "income" | "expense";
  name: string;
  amount: number;
  scheduled_date: string;
  account?: string | null;
  note?: string | null;
}

export interface CardChargeScheduleInput {
  card_account: string;
  debit_account?: string | null;
  charge_day: number;
  amount_type: "fixed" | "variable";
  fixed_amount?: number | null;
  billing_month_offset?: number | null;
  closing_day?: number | null;
  note?: string | null;
  active?: number | boolean;
}

type NormalizedCardChargeInput =
  | { ok: false; error: string }
  | {
  ok: true;
  value: {
    cardAccount: string;
    debitAccount: string | null;
    chargeDay: number;
    amountType: "fixed" | "variable";
    fixedAmount: number | null;
    billingMonthOffset: number;
    closingDay: number;
    note: string | null;
    active: 0 | 1;
  };
};

function normalizeCardChargeInput(input: CardChargeScheduleInput): NormalizedCardChargeInput {
  const cardAccount = trimOrNull(input.card_account);
  if (!cardAccount) return { ok: false, error: "カード口座を選択してください" };
  if (!isKnownCardAccount(cardAccount)) return { ok: false, error: `カード口座が見つかりません: ${cardAccount}` };
  const debitAccount = trimOrNull(input.debit_account);
  if (debitAccount) {
    const kind = accountKind(debitAccount);
    if (!kind) return { ok: false, error: `引落先口座が見つかりません: ${debitAccount}` };
    if (kind === "card") return { ok: false, error: "引落先口座にはカード以外の口座を選択してください" };
  }
  const chargeDay = validateChargeDay(input.charge_day);
  if (chargeDay === 0) return { ok: false, error: "引落日は1〜31で入力してください" };
  const billingMonthOffset = validateBillingMonthOffset(input.billing_month_offset);
  if (billingMonthOffset === 0) return { ok: false, error: "引落対象は締め月から1〜6ヶ月後で選択してください" };
  const closingDay = validateClosingDay(input.closing_day);
  if (closingDay === 0) return { ok: false, error: "締め日は1〜31で選択してください" };
  const amountType = input.amount_type === "fixed" ? "fixed" : "variable";
  const fixedAmount = amountType === "fixed" ? toPositiveInt(input.fixed_amount) : null;
  if (amountType === "fixed" && (!fixedAmount || fixedAmount <= 0)) {
    return { ok: false, error: "固定額は正の金額で入力してください" };
  }
  const note = trimOrNull(input.note);
  const active = input.active === false || input.active === 0 ? 0 : 1;
  return { ok: true, value: { cardAccount, debitAccount, chargeDay, amountType, fixedAmount, billingMonthOffset, closingDay, note, active } };
}

export async function addCardChargeSchedule(input: CardChargeScheduleInput): Promise<CashflowActionResult> {
  try {
    const normalized = normalizeCardChargeInput(input);
    if (!normalized.ok) return normalized;
    const v = normalized.value;
    db.prepare(
      `INSERT INTO card_charge_schedules
         (card_account, debit_account, charge_day, amount_type, fixed_amount, billing_month_offset, closing_day, note, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(v.cardAccount, v.debitAccount, v.chargeDay, v.amountType, v.fixedAmount, v.billingMonthOffset, v.closingDay, v.note, v.active);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateCardChargeSchedule(
  id: number,
  input: CardChargeScheduleInput,
): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    const normalized = normalizeCardChargeInput(input);
    if (!normalized.ok) return normalized;
    const v = normalized.value;
    const info = db
      .prepare(
        `UPDATE card_charge_schedules
            SET card_account = ?, debit_account = ?, charge_day = ?, amount_type = ?, fixed_amount = ?, billing_month_offset = ?, closing_day = ?, note = ?, active = ?
          WHERE id = ?`,
      )
      .run(v.cardAccount, v.debitAccount, v.chargeDay, v.amountType, v.fixedAmount, v.billingMonthOffset, v.closingDay, v.note, v.active, n);
    if (info.changes === 0) return { ok: false, error: "対象のカード引落予定が見つかりません" };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteCardChargeSchedule(id: number): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    const info = db.prepare("DELETE FROM card_charge_schedules WHERE id = ?").run(n);
    if (info.changes === 0) return { ok: false, error: "対象のカード引落予定が見つかりません" };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleCardChargeSchedule(id: number, active: boolean): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    const info = db.prepare("UPDATE card_charge_schedules SET active = ? WHERE id = ?").run(active ? 1 : 0, n);
    if (info.changes === 0) return { ok: false, error: "対象のカード引落予定が見つかりません" };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function addScheduled(input: ScheduledInput): Promise<CashflowActionResult> {
  try {
    const kind = input.kind === "income" ? "income" : "expense";
    const name = String(input.name ?? "").trim();
    const amount = toPositiveInt(input.amount);
    if (!name) return { ok: false, error: "名称を入力してください" };
    if (amount <= 0) return { ok: false, error: "金額を入力してください" };
    if (!isYmd(input.scheduled_date)) return { ok: false, error: "日付が不正です（YYYY-MM-DD）" };
    const account = typeof input.account === "string" && input.account.trim().length > 0 ? input.account.trim() : null;
    const note = typeof input.note === "string" && input.note.trim().length > 0 ? input.note.trim() : null;
    db.prepare(
      `INSERT INTO scheduled_cashflow (kind, name, amount, scheduled_date, account, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(kind, name, amount, input.scheduled_date, account, note);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteScheduled(id: number): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    db.prepare("DELETE FROM scheduled_cashflow WHERE id = ?").run(n);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setScheduledAccount(id: number, account: string | null): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    const acc = typeof account === "string" && account.trim().length > 0 ? account.trim() : null;
    const info = db.prepare("UPDATE scheduled_cashflow SET account = ? WHERE id = ?").run(acc, n);
    if (info.changes === 0) return { ok: false, error: "対象の予定が見つかりません" };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 口座残高の手入力上書き（MF未連携口座・現金など）。source='manual'。
export async function setAccountBalance(
  account: string,
  balance: number,
  kind?: BalanceKind,
): Promise<CashflowActionResult> {
  try {
    const acc = String(account ?? "").trim();
    if (!acc) return { ok: false, error: "口座名を入力してください" };
    const bal = Math.round(Number(balance));
    if (!Number.isFinite(bal)) return { ok: false, error: "残高が不正です" };
    const k = kind ?? guessKind(acc);
    const today = new Date();
    const asOf = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    db.prepare(
      `INSERT INTO account_balances (account, kind, balance, as_of, source)
       VALUES (?, ?, ?, ?, 'manual')
       ON CONFLICT(account) DO UPDATE SET
         balance = excluded.balance, kind = excluded.kind, as_of = excluded.as_of,
         source = 'manual', updated_at = (strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
    ).run(acc, k, bal, asOf);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteAccountBalance(account: string): Promise<CashflowActionResult> {
  try {
    const acc = String(account ?? "").trim();
    if (!acc) return { ok: false, error: "口座名が不正です" };
    db.prepare("DELETE FROM account_balances WHERE account = ?").run(acc);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface TransferInput {
  from_account: string;
  to_account: string;
  amount: number;
  scheduled_date: string;
  name?: string | null;
}

export async function addTransfer(input: TransferInput): Promise<CashflowActionResult> {
  try {
    const from = trimOrNull(input.from_account);
    const to = trimOrNull(input.to_account);
    const amount = toPositiveInt(input.amount);
    if (!from) return { ok: false, error: "出金口座を選択してください" };
    if (!to) return { ok: false, error: "入金口座を選択してください" };
    if (from === to) return { ok: false, error: "出金口座と入金口座は別にしてください" };
    if (!accountExists(from)) return { ok: false, error: `口座が見つかりません: ${from}` };
    if (!accountExists(to)) return { ok: false, error: `口座が見つかりません: ${to}` };
    if (amount <= 0) return { ok: false, error: "金額を入力してください" };
    if (!isYmd(input.scheduled_date)) return { ok: false, error: "日付が不正です（YYYY-MM-DD）" };
    const fee = resolveTransferFee(from);
    const name = trimOrNull(input.name);
    db.prepare(
      `INSERT INTO manual_transfers
         (from_account, to_account, amount, scheduled_date, name, fee, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    ).run(from, to, amount, input.scheduled_date, name, fee);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteTransfer(id: number): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    const info = db.prepare("DELETE FROM manual_transfers WHERE id = ?").run(n);
    if (info.changes === 0) return { ok: false, error: "対象の振替予定が見つかりません" };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function completeTransfer(id: number): Promise<CashflowActionResult> {
  try {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "無効な id です" };
    const info = db
      .prepare(
        `UPDATE manual_transfers
         SET status = 'done', done_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
         WHERE id = ? AND status = 'pending'`,
      )
      .run(n);
    if (info.changes === 0) return { ok: false, error: "対象の未完了振替が見つかりません" };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
