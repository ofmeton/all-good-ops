"use client";

import { useState, useTransition } from "react";
import type { TransferRow } from "@/lib/cashflow-queries";
import { addTransfer, completeTransfer, deleteTransfer } from "@/lib/cashflow-actions";
import { KIND_LABEL, type BalanceKind } from "@/lib/cashflow/kinds";
import { yen, shortDate } from "@/lib/format";

type AccountOption = { account: string; kind: BalanceKind };

const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

export function TransferDoneButton({
  id,
  label = "完了",
}: {
  id: number;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await completeTransfer(id);
            if (!res.ok) setError(res.error);
          });
        }}
        disabled={pending}
        className="h-9 rounded-lg border border-primary bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40"
      >
        {pending ? "処理中…" : label}
      </button>
      {error && <span className="text-[11px] font-medium text-negative">{error}</span>}
    </span>
  );
}

function TransferRowItem({ item }: { item: TransferRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!window.confirm(`「${item.from_account} → ${item.to_account}」を削除します。よろしいですか？`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTransfer(item.id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <li className={`rounded-xl border border-border bg-surface p-3 shadow-sm ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="tabular text-[11px] text-muted">{shortDate(item.scheduled_date)}</span>
            <span className="truncate text-sm font-medium text-foreground">
              {item.from_account} → {item.to_account}
            </span>
            {item.name && <span className="text-[11px] text-muted">（{item.name}）</span>}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            手数料 ¥{yen(item.fee)} / 状態 {item.status === "pending" ? "未完了" : item.status === "done" ? "完了" : "取消"}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="tabular text-sm font-semibold text-foreground">¥{yen(item.amount)}</span>
          {item.status === "pending" && <TransferDoneButton id={item.id} />}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="h-9 rounded-lg border border-negative/40 px-3 text-xs font-medium text-negative hover:bg-negative/10 disabled:opacity-40"
          >
            削除
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-negative" role="alert">{error}</p>}
    </li>
  );
}

function AddTransferForm({ accountOptions }: { accountOptions: AccountOption[] }) {
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("日付を入力してください");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("金額は正の数で入力してください");
      return;
    }
    startTransition(async () => {
      const res = await addTransfer({
        from_account: from,
        to_account: to,
        amount: amt,
        scheduled_date: date,
        name: name.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDate("");
      setFrom("");
      setTo("");
      setAmount("");
      setName("");
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-dashed border-border bg-background/40 p-3 sm:p-4">
      <p className="mb-2 text-xs font-medium text-muted">振替予定を追加</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">期日</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={pending} required className={`tabular ${INPUT_CLS}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">出金口座</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)} disabled={pending} required className={INPUT_CLS}>
            <option value="">選択</option>
            {accountOptions.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">入金口座</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} disabled={pending} required className={INPUT_CLS}>
            <option value="">選択</option>
            {accountOptions.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">金額</span>
          <input type="number" inputMode="numeric" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={pending} required className={`tabular w-28 text-right ${INPUT_CLS}`} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-muted">名称</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} placeholder="任意" className={INPUT_CLS} />
        </label>
        <button type="submit" disabled={pending} className="h-11 rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40">
          {pending ? "追加中…" : "追加"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-negative" role="alert">{error}</p>}
    </form>
  );
}

export function TransferEditor({
  items,
  accountOptions,
}: {
  items: TransferRow[];
  accountOptions: AccountOption[];
}) {
  return (
    <section className="mt-6" aria-label="資金移動">
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        資金移動（振替）
        <span className="ml-2 tabular text-xs font-normal text-muted">{items.length}件</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          登録済みの振替予定はありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <TransferRowItem key={item.id} item={item} />
          ))}
        </ul>
      )}
      <AddTransferForm accountOptions={accountOptions} />
    </section>
  );
}
