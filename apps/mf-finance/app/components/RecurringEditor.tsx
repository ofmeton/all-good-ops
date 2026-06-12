"use client";

import { useState, useTransition } from "react";
import type { RecurringRow } from "@/lib/write-queries";
import {
  toggleRecurring,
  updateRecurringAmount,
  deleteRecurring,
  addRecurring,
} from "@/lib/actions";

// 定期項目（収入/固定費）の編集 UI。
// 楽観的更新はせず、action 後の revalidate による再描画に委ねる。送信中は disabled + 視覚フィードバック。

function ConfirmedBadge({ confirmed }: { confirmed: "auto" | "user" }) {
  const isUser = confirmed === "user";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isUser
          ? "bg-primary/10 text-primary"
          : "bg-border/60 text-muted"
      }`}
      title={isUser ? "あなたが確認・編集した項目" : "自動検出された未確認の項目"}
    >
      {isUser ? "確認済" : "自動"}
    </span>
  );
}

function RecurringRowItem({ item }: { item: RecurringRow }) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(item.amount));
  const dirty = amount.trim() !== String(item.amount);

  const onToggle = () => {
    startTransition(async () => {
      await toggleRecurring(item.id, item.active !== 1);
    });
  };

  const onSaveAmount = () => {
    const next = Number(amount);
    if (!Number.isFinite(next)) return;
    startTransition(async () => {
      await updateRecurringAmount(item.id, next);
    });
  };

  const onDelete = () => {
    if (
      !window.confirm(`「${item.name}」を削除します。よろしいですか？`)
    )
      return;
    startTransition(async () => {
      await deleteRecurring(item.id);
    });
  };

  const inactive = item.active !== 1;

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-opacity duration-150 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
        pending ? "opacity-60" : ""
      } ${inactive ? "opacity-70" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`min-w-0 flex-1 truncate text-sm font-medium ${
            inactive ? "text-muted line-through" : "text-foreground"
          }`}
          title={item.name}
        >
          {item.name}
        </span>
        <ConfirmedBadge confirmed={item.confirmed} />
        {item.day != null && (
          <span className="tabular shrink-0 text-[11px] text-muted">
            毎月{item.day}日
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`amount-${item.id}`}>
          {item.name} の金額
        </label>
        <span aria-hidden className="text-sm text-muted">
          ¥
        </span>
        <input
          id={`amount-${item.id}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={pending}
          className="tabular h-11 w-28 rounded-lg border border-border bg-background px-2 text-right text-sm text-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onSaveAmount}
          disabled={pending || !dirty}
          className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          保存
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <label
          htmlFor={`active-${item.id}`}
          className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
        >
          <input
            id={`active-${item.id}`}
            type="checkbox"
            checked={item.active === 1}
            onChange={onToggle}
            disabled={pending}
            className="h-5 w-5 cursor-pointer rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
          />
          <span>{item.active === 1 ? "有効" : "無効"}</span>
        </label>
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
    </li>
  );
}

function AddRecurringForm({ kind }: { kind: "income" | "expense" }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("名前を入力してください");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("金額は正の数で入力してください");
      return;
    }
    const d = day.trim() === "" ? null : Number(day);
    startTransition(async () => {
      await addRecurring({ kind, name, amount: amt, day: d });
      setName("");
      setAmount("");
      setDay("");
    });
  };

  const fieldId = `add-${kind}`;

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 rounded-xl border border-dashed border-border bg-background/40 p-3 sm:p-4"
      aria-label={`${kind === "income" ? "定期収入" : "固定費"}を追加`}
    >
      <p className="mb-2 text-xs font-medium text-muted">
        {kind === "income" ? "定期収入" : "固定費"}を追加
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${fieldId}-name`} className="text-[11px] text-muted">
            名前 <span className="text-negative">必須</span>
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            required
            className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-amount`}
            className="text-[11px] text-muted"
          >
            金額 <span className="text-negative">必須</span>
          </label>
          <input
            id={`${fieldId}-amount`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
            required
            className="tabular h-11 w-28 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-day`} className="text-[11px] text-muted">
            日（任意）
          </label>
          <input
            id={`${fieldId}-day`}
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            step={1}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={pending}
            className="tabular h-11 w-20 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
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

function Section({
  title,
  kind,
  items,
}: {
  title: string;
  kind: "income" | "expense";
  items: RecurringRow[];
}) {
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        {title}
        <span className="ml-2 tabular text-xs font-normal text-muted">
          {items.length}件
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          項目がありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <RecurringRowItem key={item.id} item={item} />
          ))}
        </ul>
      )}
      <AddRecurringForm kind={kind} />
    </section>
  );
}

export function RecurringEditor({ items }: { items: RecurringRow[] }) {
  const income = items.filter((i) => i.kind === "income");
  const expense = items.filter((i) => i.kind === "expense");

  return (
    <div>
      <Section title="定期収入" kind="income" items={income} />
      <Section title="固定費（定期支出）" kind="expense" items={expense} />
    </div>
  );
}
