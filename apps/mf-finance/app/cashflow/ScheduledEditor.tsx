"use client";

import { useState, useTransition } from "react";
import type { ScheduledListRow } from "@/lib/cashflow-queries";
import {
  addScheduled,
  convertScheduledToRecurring,
  deletePastScheduled,
  deleteScheduled,
  setScheduledAccount,
} from "@/lib/cashflow-actions";
import { KIND_LABEL, type BalanceKind } from "@/lib/cashflow/kinds";
import { yen, shortDate } from "@/lib/format";

// 単発予定（特定日の入金/引落）の登録・一覧・削除 UI。
// 楽観的更新はせず、action 後の revalidate による再描画に委ねる。

const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

type AccountOption = { account: string; kind: BalanceKind };

function accountOptionsWithCurrent(options: AccountOption[], current: string | null): AccountOption[] {
  if (!current || options.some((option) => option.account === current)) return options;
  return [...options, { account: current, kind: "other" }];
}

function ScheduledRowItem({ item, accountOptions }: { item: ScheduledListRow; accountOptions: AccountOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState(item.account ?? "");
  const isIncome = item.kind === "income";
  const options = accountOptionsWithCurrent(accountOptions, item.account);

  const onDelete = () => {
    if (!window.confirm(`「${item.name}」（${shortDate(item.scheduled_date)}）を削除します。よろしいですか？`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteScheduled(item.id);
      if (!res.ok) setError(res.error);
    });
  };

  const onAccountChange = (value: string) => {
    setAccount(value);
    setError(null);
    startTransition(async () => {
      const res = await setScheduledAccount(item.id, value || null);
      if (!res.ok) {
        setAccount(item.account ?? "");
        setError(res.error);
      }
    });
  };

  const onConvertToRecurring = () => {
    if (!window.confirm(`「${item.name}」を今後毎月の定期に変換します。元の単発予定は削除されます。よろしいですか？`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await convertScheduledToRecurring(item.id);
        if (!res.ok) setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "毎月の定期への変換に失敗しました");
      }
    });
  };

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm transition-opacity duration-150 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="tabular shrink-0 text-[11px] text-muted">
          {shortDate(item.scheduled_date)}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          title={item.name}
        >
          {item.name}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <label className="sr-only" htmlFor={`sched-account-${item.id}`}>
          {item.name} の資金場所
        </label>
        <select
          id={`sched-account-${item.id}`}
          value={account}
          onChange={(e) => onAccountChange(e.target.value)}
          disabled={pending}
          className="h-11 w-full max-w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50 sm:w-64"
        >
          <option value="">未指定</option>
          {options.map((option) => (
            <option key={option.account} value={option.account}>
              {option.account}（{KIND_LABEL[option.kind]}）
            </option>
          ))}
        </select>
        <span
          className={`tabular whitespace-nowrap text-sm font-medium ${
            isIncome ? "text-positive" : "text-foreground"
          }`}
        >
          <span aria-hidden className="mr-0.5">
            {isIncome ? "+" : "▲"}
          </span>
          <span className="sr-only">{isIncome ? "入金 " : "引落 "}</span>
          ¥{yen(item.amount)}
        </span>
        <button
          type="button"
          onClick={onConvertToRecurring}
          disabled={pending}
          className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-primary/40 px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          毎月にする
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`${item.name} を削除`}
          className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative transition-colors duration-150 hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-40"
        >
          削除
        </button>
      </div>
      {error && (
        <p className="text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function AddScheduledForm({ accountOptions }: { accountOptions: AccountOption[] }) {
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("日付を入力してください");
      return;
    }
    if (name.trim().length === 0) {
      setError("名称を入力してください");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("金額は正の数で入力してください");
      return;
    }
    startTransition(async () => {
      const res = await addScheduled({
        kind,
        name: name.trim(),
        amount: amt,
        scheduled_date: date,
        account: account.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDate("");
      setKind("expense");
      setAmount("");
      setName("");
      setAccount("");
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 rounded-xl border border-dashed border-border bg-background/40 p-3 sm:p-4"
      aria-label="単発予定を追加"
    >
      <p className="mb-2 text-xs font-medium text-muted">単発予定を追加</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="sched-date" className="text-[11px] text-muted">
            日付 <span className="text-negative">必須</span>
          </label>
          <input
            id="sched-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={pending}
            required
            className={`tabular ${INPUT_CLS}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sched-kind" className="text-[11px] text-muted">
            種別
          </label>
          <select
            id="sched-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value === "income" ? "income" : "expense")}
            disabled={pending}
            className={INPUT_CLS}
          >
            <option value="expense">引落</option>
            <option value="income">入金</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sched-amount" className="text-[11px] text-muted">
            金額 <span className="text-negative">必須</span>
          </label>
          <input
            id="sched-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
            required
            className={`tabular w-28 text-right ${INPUT_CLS}`}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="sched-name" className="text-[11px] text-muted">
            名称 <span className="text-negative">必須</span>
          </label>
          <input
            id="sched-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            required
            className={INPUT_CLS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sched-account" className="text-[11px] text-muted">
            口座（任意）
          </label>
          <select
            id="sched-account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            <option value="">未指定</option>
            {accountOptions.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "追加中…" : "追加"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function ScheduledEditor({
  items,
  accountOptions,
  today,
}: {
  items: ScheduledListRow[];
  accountOptions: AccountOption[];
  today: string;
}) {
  const [showPast, setShowPast] = useState(false);
  const [deletingPast, startDeletePast] = useTransition();
  const [pastError, setPastError] = useState<string | null>(null);
  const pastItems = items.filter((item) => item.scheduled_date < today);
  const visibleItems = showPast ? items : items.filter((item) => item.scheduled_date >= today);

  const onDeletePast = () => {
    if (!window.confirm(`過去の単発予定 ${pastItems.length}件を削除します。よろしいですか？`)) return;
    setPastError(null);
    startDeletePast(async () => {
      try {
        const res = await deletePastScheduled();
        if (!res.ok) setPastError(res.error);
      } catch (e) {
        setPastError(e instanceof Error ? e.message : "過去分の削除に失敗しました");
      }
    });
  };

  return (
    <section className="mt-6" aria-label="単発予定">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          単発予定（特定日の入金・引落）
          <span className="ml-2 tabular text-xs font-normal text-muted">
            {visibleItems.length}件
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {pastItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowPast((value) => !value)}
                className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-border/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {showPast ? "過去を隠す" : "過去も表示"}
              </button>
              <button
                type="button"
                onClick={onDeletePast}
                disabled={deletingPast}
                className="h-9 rounded-lg border border-negative/40 px-3 text-xs font-medium text-negative hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:opacity-40"
              >
                {deletingPast ? "削除中…" : `過去分を削除（${pastItems.length}件）`}
              </button>
            </>
          )}
        </div>
      </div>
      {visibleItems.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          {pastItems.length > 0 && !showPast ? "今後の単発予定はありません。" : "登録済みの単発予定はありません。"}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((item) => (
            <ScheduledRowItem key={item.id} item={item} accountOptions={accountOptions} />
          ))}
        </ul>
      )}
      {pastError && <p className="mt-2 text-xs font-medium text-negative" role="alert">{pastError}</p>}
      <AddScheduledForm accountOptions={accountOptions} />
    </section>
  );
}
