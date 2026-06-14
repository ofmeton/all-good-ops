"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
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

export interface ScheduledInput {
  kind: "income" | "expense";
  name: string;
  amount: number;
  scheduled_date: string;
  account?: string | null;
  note?: string | null;
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
