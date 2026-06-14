"use client";

import { useState, useTransition } from "react";
import type { RecurringRow } from "@/lib/write-queries";
import type { UpcomingOccurrence } from "@/lib/cashflow-queries";
import { WEEKDAY_LABELS } from "@/lib/cashflow/kinds";
import {
  toggleRecurring,
  updateRecurringAmount,
  deleteRecurring,
  addRecurring,
  setOccurrenceOverride,
  clearOccurrenceOverride,
} from "@/lib/actions";

// 定期項目（収入/固定費）の編集 UI。
// 楽観的更新はせず、action 後の revalidate による再描画に委ねる。送信中は disabled + 視覚フィードバック。

function actionErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "保存に失敗しました";
}

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

function OccurrenceEditor({ occurrence }: { occurrence: UpcomingOccurrence }) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(
    occurrence.overrideAmount != null ? String(occurrence.overrideAmount) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const saveAmount = () => {
    setError(null);
    const next = Number(amount);
    if (!Number.isFinite(next) || next <= 0) {
      setError("金額は正の数で入力してください");
      return;
    }
    startTransition(async () => {
      try {
        await setOccurrenceOverride(occurrence.recurringId, occurrence.date, { amount: next });
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  };
  const toggleSkip = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (occurrence.overrideSkip) {
          await clearOccurrenceOverride(occurrence.recurringId, occurrence.date);
        } else {
          await setOccurrenceOverride(occurrence.recurringId, occurrence.date, { skip: true });
        }
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  };
  const clear = () => {
    setError(null);
    startTransition(async () => {
      try {
        await clearOccurrenceOverride(occurrence.recurringId, occurrence.date);
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  };

  return (
    <li className={`grid gap-2 rounded-lg border border-border bg-background px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="tabular text-xs font-medium text-foreground">
          {occurrence.date}（{WEEKDAY_LABELS[occurrence.weekday]}）
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {occurrence.status === "skipped"
            ? "スキップ"
            : occurrence.status === "pending"
              ? "金額未定"
              : `¥${occurrence.amount.toLocaleString("ja-JP")}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={toggleSkip}
          disabled={pending}
          className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-border/40 disabled:opacity-40"
        >
          {occurrence.overrideSkip ? "スキップ解除" : "スキップ"}
        </button>
        <label className="sr-only" htmlFor={`occ-${occurrence.recurringId}-${occurrence.date}`}>
          {occurrence.date} の実額
        </label>
        <input
          id={`occ-${occurrence.recurringId}-${occurrence.date}`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={pending || occurrence.overrideSkip}
          placeholder="実額"
          className="tabular h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right text-xs text-foreground disabled:opacity-40"
        />
        <button
          type="button"
          onClick={saveAmount}
          disabled={pending || occurrence.overrideSkip || amount.trim() === ""}
          className="h-9 rounded-lg border border-primary bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40"
        >
          反映
        </button>
        {(occurrence.overrideSkip || occurrence.overrideAmount != null) && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-muted hover:bg-border/40 disabled:opacity-40"
          >
            戻す
          </button>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-medium text-negative sm:col-span-2" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function RecurringRowItem({
  item,
  occurrences,
}: {
  item: RecurringRow;
  occurrences: UpcomingOccurrence[];
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(item.amount));
  const [error, setError] = useState<string | null>(null);
  const dirty = amount.trim() !== String(item.amount);
  const isVariable = item.amount_type === "variable";

  const onToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await toggleRecurring(item.id, item.active !== 1);
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  };

  const onSaveAmount = () => {
    if (isVariable) return;
    setError(null);
    const next = Number(amount);
    if (!Number.isFinite(next)) {
      setError("金額は正の数で入力してください");
      return;
    }
    startTransition(async () => {
      try {
        await updateRecurringAmount(item.id, next);
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  };

  const onDelete = () => {
    setError(null);
    if (
      !window.confirm(`「${item.name}」を削除します。よろしいですか？`)
    )
      return;
    startTransition(async () => {
      try {
        await deleteRecurring(item.id);
      } catch (e) {
        setError(actionErrorMessage(e));
      }
    });
  };

  const inactive = item.active !== 1;

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-opacity duration-150 sm:p-4 ${
        pending ? "opacity-60" : ""
      } ${inactive ? "opacity-70" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
        {item.frequency === "weekly" && item.weekday != null ? (
          <span className="tabular shrink-0 text-[11px] text-muted">
            毎週{WEEKDAY_LABELS[item.weekday]}曜
          </span>
        ) : item.day != null ? (
          <span className="tabular shrink-0 text-[11px] text-muted">
            毎月{item.day}日
          </span>
        ) : null}
        {isVariable && (
          <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
            変動
          </span>
        )}
      </div>

      {!isVariable && (
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
      )}

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
      </div>
      {error && (
        <p className="text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
      {item.kind === "income" && occurrences.length > 0 && (
        <div className="mt-1 border-t border-border/60 pt-2">
          <p className="mb-1 text-[11px] font-medium text-muted">発生予定</p>
          <ul className="space-y-1.5">
            {occurrences.map((occurrence) => (
              <OccurrenceEditor
                key={`${occurrence.recurringId}-${occurrence.date}`}
                occurrence={occurrence}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function AddRecurringForm({ kind }: { kind: "income" | "expense" }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");
  const [weekday, setWeekday] = useState("1");
  const [variable, setVariable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIncome = kind === "income";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("名前を入力してください");
      return;
    }
    const amt = variable ? 0 : Number(amount);
    if (!variable && (!Number.isFinite(amt) || amt <= 0)) {
      setError("金額は正の数で入力してください");
      return;
    }
    const d = frequency === "weekly" ? null : Number(day);
    if (isIncome && frequency === "monthly" && (!Number.isInteger(Number(day)) || Number(day) < 1 || Number(day) > 31)) {
      setError("日を1〜31で入力してください");
      return;
    }
    startTransition(async () => {
      try {
        await addRecurring({
          kind,
          name,
          amount: amt,
          day: kind === "expense" && day.trim() === "" ? null : d,
          frequency: isIncome ? frequency : "monthly",
          weekday: isIncome && frequency === "weekly" ? Number(weekday) : null,
          amount_type: isIncome && variable ? "variable" : "fixed",
        });
        setName("");
        setAmount("");
        setDay("");
        setFrequency("monthly");
        setWeekday("1");
        setVariable(false);
      } catch (e) {
        setError(actionErrorMessage(e));
      }
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
        {isIncome && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${fieldId}-frequency`} className="text-[11px] text-muted">
              頻度
            </label>
            <select
              id={`${fieldId}-frequency`}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "monthly" | "weekly")}
              disabled={pending}
              className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
            >
              <option value="monthly">毎月</option>
              <option value="weekly">毎週</option>
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-amount`}
            className="text-[11px] text-muted"
          >
            金額 {!variable && <span className="text-negative">必須</span>}
          </label>
          <input
            id={`${fieldId}-amount`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending || variable}
            required={!variable}
            className="tabular h-11 w-28 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          />
        </div>
        {isIncome && (
          <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-foreground">
            <input
              type="checkbox"
              checked={variable}
              onChange={(e) => setVariable(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-border text-primary"
            />
            金額登録なし
          </label>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-day`} className="text-[11px] text-muted">
            {isIncome && frequency === "weekly" ? "曜日" : kind === "income" ? "日" : "日（任意）"}
          </label>
          {isIncome && frequency === "weekly" ? (
            <select
              id={`${fieldId}-day`}
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              disabled={pending}
              className="h-11 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
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
              required={isIncome}
              className="tabular h-11 w-20 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
            />
          )}
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
  occurrences,
}: {
  title: string;
  kind: "income" | "expense";
  items: RecurringRow[];
  occurrences: UpcomingOccurrence[];
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
            <RecurringRowItem
              key={item.id}
              item={item}
              occurrences={occurrences.filter((o) => o.recurringId === item.id)}
            />
          ))}
        </ul>
      )}
      <AddRecurringForm kind={kind} />
    </section>
  );
}

export function RecurringEditor({
  items,
  occurrences,
}: {
  items: RecurringRow[];
  occurrences: UpcomingOccurrence[];
}) {
  const income = items.filter((i) => i.kind === "income");
  const expense = items.filter((i) => i.kind === "expense");

  return (
    <div>
      <Section title="定期収入" kind="income" items={income} occurrences={occurrences} />
      <Section title="固定費（定期支出）" kind="expense" items={expense} occurrences={[]} />
    </div>
  );
}
