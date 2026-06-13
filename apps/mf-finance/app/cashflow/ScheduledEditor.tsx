"use client";

import { useState, useTransition } from "react";
import type { ScheduledListRow } from "@/lib/cashflow-queries";
import { addScheduled, deleteScheduled } from "@/lib/cashflow-actions";
import { yen, shortDate } from "@/lib/format";

// 単発予定（特定日の入金/引落）の登録・一覧・削除 UI。
// 楽観的更新はせず、action 後の revalidate による再描画に委ねる。

const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

function ScheduledRowItem({ item }: { item: ScheduledListRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isIncome = item.kind === "income";

  const onDelete = () => {
    if (!window.confirm(`「${item.name}」（${shortDate(item.scheduled_date)}）を削除します。よろしいですか？`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteScheduled(item.id);
      if (!res.ok) setError(res.error);
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
        {item.account && (
          <span className="shrink-0 truncate text-[11px] text-muted" title={item.account}>
            {item.account}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
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

function AddScheduledForm() {
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
          <input
            id="sched-account"
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          />
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

export function ScheduledEditor({ items }: { items: ScheduledListRow[] }) {
  return (
    <section className="mt-6" aria-label="単発予定">
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        単発予定（特定日の入金・引落）
        <span className="ml-2 tabular text-xs font-normal text-muted">
          {items.length}件
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          登録済みの単発予定はありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ScheduledRowItem key={item.id} item={item} />
          ))}
        </ul>
      )}
      <AddScheduledForm />
    </section>
  );
}
