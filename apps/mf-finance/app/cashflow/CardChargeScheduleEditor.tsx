"use client";

import { useState, useTransition } from "react";
import type { CardChargeScheduleRow } from "@/lib/cashflow-queries";
import {
  addCardChargeSchedule,
  deleteCardChargeSchedule,
  toggleCardChargeSchedule,
  updateCardChargeSchedule,
} from "@/lib/cashflow-actions";
import { KIND_LABEL, type BalanceKind } from "@/lib/cashflow/kinds";
import { yen } from "@/lib/format";

type AccountOption = { account: string; kind: BalanceKind };
type AmountType = "fixed" | "variable";

const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";
const BILLING_MONTH_OFFSET_OPTIONS = [
  { value: 1, label: "締めの翌月" },
  { value: 2, label: "締めの翌々月" },
  { value: 3, label: "締めの3ヶ月後" },
] as const;
const CLOSING_DAY_OPTIONS = [
  { value: 1, label: "1日" },
  { value: 5, label: "5日" },
  { value: 10, label: "10日" },
  { value: 15, label: "15日" },
  { value: 20, label: "20日" },
  { value: 25, label: "25日" },
  { value: 31, label: "末日" },
] as const;

function toAmountType(value: string): AmountType {
  return value === "fixed" ? "fixed" : "variable";
}

function CardChargeRowItem({
  item,
  cardOptions,
  debitAccountOptions,
}: {
  item: CardChargeScheduleRow;
  cardOptions: AccountOption[];
  debitAccountOptions: AccountOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cardAccount, setCardAccount] = useState(item.card_account);
  const [debitAccount, setDebitAccount] = useState(item.debit_account ?? "");
  const [chargeDay, setChargeDay] = useState(String(item.charge_day));
  const [amountType, setAmountType] = useState<AmountType>(item.amount_type);
  const [fixedAmount, setFixedAmount] = useState(item.fixed_amount ? String(item.fixed_amount) : "");
  const [billingMonthOffset, setBillingMonthOffset] = useState(String(item.billing_month_offset ?? 1));
  const [closingDay, setClosingDay] = useState(String(item.closing_day ?? 31));
  const [note, setNote] = useState(item.note ?? "");
  const active = item.active === 1;
  const options = cardOptions.some((option) => option.account === item.card_account)
    ? cardOptions
    : [...cardOptions, { account: item.card_account, kind: "card" as const }];
  const debitOptions =
    item.debit_account && !debitAccountOptions.some((option) => option.account === item.debit_account)
      ? [...debitAccountOptions, { account: item.debit_account, kind: "other" as const }]
      : debitAccountOptions;

  const buildInput = () => ({
    card_account: cardAccount,
    debit_account: debitAccount.trim() || null,
    charge_day: Number(chargeDay),
    amount_type: amountType,
    fixed_amount: amountType === "fixed" ? Number(fixedAmount) : null,
    billing_month_offset: Number(billingMonthOffset),
    closing_day: Number(closingDay),
    note: note.trim() || null,
    active: item.active,
  });

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateCardChargeSchedule(item.id, buildInput());
      if (!res.ok) setError(res.error);
    });
  };

  const onToggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await toggleCardChargeSchedule(item.id, !active);
      if (!res.ok) setError(res.error);
    });
  };

  const onDelete = () => {
    if (!window.confirm(`「${item.card_account}」のカード引落予定を削除します。よろしいですか？`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCardChargeSchedule(item.id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <li className={`rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">カード口座</span>
          <select
            value={cardAccount}
            onChange={(e) => setCardAccount(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            {options.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">引落先口座</span>
          <select
            value={debitAccount}
            onChange={(e) => setDebitAccount(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            <option value="">未指定</option>
            {debitOptions.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">引落日</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            step={1}
            value={chargeDay}
            onChange={(e) => setChargeDay(e.target.value)}
            disabled={pending}
            className={`tabular w-24 text-right ${INPUT_CLS}`}
          />
        </label>
        <fieldset className="flex h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3">
          <legend className="sr-only">引落額タイプ</legend>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-foreground">
            <input
              type="radio"
              name={`card-charge-type-${item.id}`}
              value="variable"
              checked={amountType === "variable"}
              onChange={(e) => setAmountType(toAmountType(e.target.value))}
              disabled={pending}
              className="size-4 accent-primary"
            />
            変動
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-foreground">
            <input
              type="radio"
              name={`card-charge-type-${item.id}`}
              value="fixed"
              checked={amountType === "fixed"}
              onChange={(e) => setAmountType(toAmountType(e.target.value))}
              disabled={pending}
              className="size-4 accent-primary"
            />
            固定
          </label>
        </fieldset>
        {amountType === "fixed" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">固定額</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              disabled={pending}
              className={`tabular w-32 text-right ${INPUT_CLS}`}
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">引落対象</span>
          <select
            value={billingMonthOffset}
            onChange={(e) => setBillingMonthOffset(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            {BILLING_MONTH_OFFSET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">締め日</span>
          <select
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            {CLOSING_DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-muted">メモ</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          />
        </label>
        <div className="flex items-center gap-2">
          {/* チェックボックス式トグル: checked=有効。押すと現在状態が反転する仕様を、
              状態を直接表すチェックボックスにして「有効と表示されているのに押すと無効化」する誤操作を防ぐ。 */}
          <label
            className={`flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium ${
              active ? "border-border text-foreground" : "border-warning/40 text-warning"
            } ${pending ? "opacity-40" : ""}`}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={onToggle}
              disabled={pending}
              className="h-4 w-4 cursor-pointer rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            {active ? "有効" : "停止中"}
          </label>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="h-11 rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
          >
            保存
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="h-11 rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative hover:bg-negative/10 disabled:opacity-40"
          >
            削除
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {amountType === "variable"
          ? "変動: 各引落は締め日で区切った前サイクルの利用額を見込みに反映。将来分でデータ無しなら¥0見込みで表示"
          : `固定: ¥${yen(Number(fixedAmount) || 0)} を見込みに反映`}
      </p>
      {error && (
        <p className="mt-2 text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function AddCardChargeScheduleForm({
  cardOptions,
  debitAccountOptions,
}: {
  cardOptions: AccountOption[];
  debitAccountOptions: AccountOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [cardAccount, setCardAccount] = useState("");
  const [debitAccount, setDebitAccount] = useState("");
  const [chargeDay, setChargeDay] = useState("27");
  const [amountType, setAmountType] = useState<AmountType>("variable");
  const [fixedAmount, setFixedAmount] = useState("");
  const [billingMonthOffset, setBillingMonthOffset] = useState("1");
  const [closingDay, setClosingDay] = useState("31");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasCards = cardOptions.length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hasCards) {
      setError("カード口座がありません。先に口座残高でカード口座を登録してください");
      return;
    }
    startTransition(async () => {
      const res = await addCardChargeSchedule({
        card_account: cardAccount,
        debit_account: debitAccount.trim() || null,
        charge_day: Number(chargeDay),
        amount_type: amountType,
        fixed_amount: amountType === "fixed" ? Number(fixedAmount) : null,
        billing_month_offset: Number(billingMonthOffset),
        closing_day: Number(closingDay),
        note: note.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCardAccount("");
      setDebitAccount("");
      setChargeDay("27");
      setAmountType("variable");
      setFixedAmount("");
      setBillingMonthOffset("1");
      setClosingDay("31");
      setNote("");
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-dashed border-border bg-background/40 p-3 sm:p-4">
      <p className="mb-2 text-xs font-medium text-muted">カード引落予定を追加</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">カード口座</span>
          <select
            value={cardAccount}
            onChange={(e) => setCardAccount(e.target.value)}
            disabled={pending || !hasCards}
            required
            className={INPUT_CLS}
          >
            <option value="">選択</option>
            {cardOptions.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">引落先口座</span>
          <select
            value={debitAccount}
            onChange={(e) => setDebitAccount(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            <option value="">未指定</option>
            {debitAccountOptions.map((option) => (
              <option key={option.account} value={option.account}>
                {option.account}（{KIND_LABEL[option.kind]}）
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">引落日</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            step={1}
            value={chargeDay}
            onChange={(e) => setChargeDay(e.target.value)}
            disabled={pending}
            required
            className={`tabular w-24 text-right ${INPUT_CLS}`}
          />
        </label>
        <fieldset className="flex h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3">
          <legend className="sr-only">引落額タイプ</legend>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-foreground">
            <input
              type="radio"
              name="new-card-charge-type"
              value="variable"
              checked={amountType === "variable"}
              onChange={(e) => setAmountType(toAmountType(e.target.value))}
              disabled={pending}
              className="size-4 accent-primary"
            />
            変動
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-foreground">
            <input
              type="radio"
              name="new-card-charge-type"
              value="fixed"
              checked={amountType === "fixed"}
              onChange={(e) => setAmountType(toAmountType(e.target.value))}
              disabled={pending}
              className="size-4 accent-primary"
            />
            固定
          </label>
        </fieldset>
        {amountType === "fixed" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">固定額</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              disabled={pending}
              required
              className={`tabular w-32 text-right ${INPUT_CLS}`}
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">引落対象</span>
          <select
            value={billingMonthOffset}
            onChange={(e) => setBillingMonthOffset(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            {BILLING_MONTH_OFFSET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">締め日</span>
          <select
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            disabled={pending}
            className={INPUT_CLS}
          >
            {CLOSING_DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-muted">メモ</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            placeholder="任意"
            className={INPUT_CLS}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !hasCards}
          className="h-11 rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
        >
          {pending ? "追加中…" : "追加"}
        </button>
      </div>
      {!hasCards && (
        <p className="mt-2 text-xs text-muted">カード口座が未登録です。口座残高で kind=card の口座を追加してください。</p>
      )}
      {error && (
        <p className="mt-2 text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function CardChargeScheduleEditor({
  items,
  cardOptions,
  accountOptions,
}: {
  items: CardChargeScheduleRow[];
  cardOptions: AccountOption[];
  accountOptions: AccountOption[];
}) {
  const debitAccountOptions = accountOptions.filter((option) => option.kind !== "card");

  return (
    <section className="mt-6" aria-label="カード引落予定">
      <h2 className="mb-1 text-sm font-semibold text-foreground">
        カード引落予定
        <span className="ml-2 tabular text-xs font-normal text-muted">{items.length}件</span>
      </h2>
      <p className="mb-2 text-[11px] text-muted">
        カードごとの引落日と締め日を登録すると、変動額は各引落＝締め日で区切った前サイクルの利用額を見込み残高に反映します。
        単発予定で同じカード引落を登録済みの場合は二重計上になります。どちらかに統一してください。
      </p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          登録済みのカード引落予定はありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <CardChargeRowItem
              key={item.id}
              item={item}
              cardOptions={cardOptions}
              debitAccountOptions={debitAccountOptions}
            />
          ))}
        </ul>
      )}
      <AddCardChargeScheduleForm cardOptions={cardOptions} debitAccountOptions={debitAccountOptions} />
    </section>
  );
}
