"use client";

import { useState, useTransition } from "react";
import type { LiabilityRow } from "@/lib/write-queries";
import { addManualLiability, deleteManualLiability } from "@/lib/actions";
import { yen, shortDate } from "@/lib/format";

// 手動負債の一覧 + 追加フォーム。残高合計を上部に表示。
// 楽観的更新はせず action 後の revalidate に委ねる。

function LiabilityItem({ item }: { item: LiabilityRow }) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm(`「${item.name}」を削除します。よろしいですか？`))
      return;
    startTransition(async () => {
      await deleteManualLiability(item.id);
    });
  };

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm transition-opacity duration-150 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground" title={item.name}>
            {item.name}
          </span>
          {item.lender && (
            <span className="shrink-0 text-[11px] text-muted">
              {item.lender}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-muted">
          <span>
            残高{" "}
            <span className="tabular font-medium text-foreground">
              ¥{yen(item.balance ?? 0)}
            </span>
          </span>
          {item.rate != null && (
            <span>
              金利 <span className="tabular">{item.rate}%</span>
            </span>
          )}
          {item.monthly_payment != null && (
            <span>
              月返済{" "}
              <span className="tabular">¥{yen(item.monthly_payment)}</span>
            </span>
          )}
          {item.as_of_date && <span>基準 {shortDate(item.as_of_date)}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label={`${item.name} を削除`}
        className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center self-start rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative transition-colors duration-150 hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
      >
        削除
      </button>
    </li>
  );
}

function AddForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [monthly, setMonthly] = useState("");
  const [asOf, setAsOf] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("名前を入力してください");
      return;
    }
    startTransition(async () => {
      await addManualLiability({
        name,
        lender,
        balance: balance.trim() === "" ? undefined : Number(balance),
        rate: rate.trim() === "" ? undefined : Number(rate),
        monthly_payment: monthly.trim() === "" ? undefined : Number(monthly),
        as_of_date: asOf.trim() === "" ? undefined : asOf,
      });
      setName("");
      setLender("");
      setBalance("");
      setRate("");
      setMonthly("");
      setAsOf("");
    });
  };

  const inputCls =
    "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-xl border border-dashed border-border bg-background/40 p-4"
      aria-label="負債を追加"
    >
      <p className="mb-3 text-sm font-semibold text-foreground">負債を追加</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="liab-name" className="text-[11px] text-muted">
            名前 <span className="text-negative">必須</span>
          </label>
          <input
            id="liab-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            required
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="liab-lender" className="text-[11px] text-muted">
            借入先
          </label>
          <input
            id="liab-lender"
            type="text"
            value={lender}
            onChange={(e) => setLender(e.target.value)}
            disabled={pending}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="liab-balance" className="text-[11px] text-muted">
            残高（円）
          </label>
          <input
            id="liab-balance"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            disabled={pending}
            className={`tabular text-right ${inputCls}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="liab-rate" className="text-[11px] text-muted">
            金利（%）
          </label>
          <input
            id="liab-rate"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={pending}
            className={`tabular text-right ${inputCls}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="liab-monthly" className="text-[11px] text-muted">
            月返済（円）
          </label>
          <input
            id="liab-monthly"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            disabled={pending}
            className={`tabular text-right ${inputCls}`}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="liab-asof" className="text-[11px] text-muted">
            基準日
          </label>
          <input
            id="liab-asof"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            disabled={pending}
            className={`tabular ${inputCls}`}
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 h-11 w-full cursor-pointer rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {pending ? "追加中…" : "負債を追加"}
      </button>
    </form>
  );
}

export function ManualLiabilityForm({ items }: { items: LiabilityRow[] }) {
  const total = items.reduce((sum, i) => sum + (i.balance ?? 0), 0);

  return (
    <section className="mt-8" aria-label="負債">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">負債</h2>
        <p className="text-xs text-muted">
          合計{" "}
          <span className="tabular font-semibold text-negative">
            ¥{yen(total)}
          </span>
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          登録された負債はありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <LiabilityItem key={item.id} item={item} />
          ))}
        </ul>
      )}

      <AddForm />
    </section>
  );
}
