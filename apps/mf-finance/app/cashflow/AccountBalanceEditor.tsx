"use client";

import { useState, useTransition } from "react";
// kind 定数は純モジュールから（client が db を引き込まないため）。型のみ cashflow-queries から。
import { KIND_LABEL, KIND_OPTIONS, type BalanceKind } from "@/lib/cashflow/kinds";
import type { AccountBalanceRow } from "@/lib/cashflow-queries";
import {
  setAccountBalance,
  deleteAccountBalance,
} from "@/lib/cashflow-actions";
import { yen } from "@/lib/format";

// 口座残高の手入力 UI（MF未連携口座・現金など）。source='manual' で保存。
// 楽観的更新はせず、action 後の revalidate による再描画に委ねる。

const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

function BalanceRowItem({ item }: { item: AccountBalanceRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(item.balance));

  const onDelete = () => {
    if (!window.confirm(`「${item.account}」の残高を削除します。よろしいですか？`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAccountBalance(item.account);
      if (!res.ok) setError(res.error);
    });
  };

  const startEdit = () => {
    setError(null);
    setDraft(String(item.balance));
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };
  const onSave = () => {
    const bal = Number(draft);
    if (!Number.isFinite(bal)) {
      setError("残高は数値で入力してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      // 手入力（source='manual'）として保存。kind は据え置き。
      // ※MF再取得時は最新MF値で上書きされる（一時的な修正という位置づけ）。
      const res = await setAccountBalance(item.account, bal, item.kind);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  };

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm transition-opacity duration-150 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          title={item.account}
        >
          {item.account}
        </span>
        <span className="shrink-0 rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-muted">
          {KIND_LABEL[item.kind]}
        </span>
        <span
          className="shrink-0 text-[11px] text-muted"
          title={item.source === "mf" ? "MFから取得" : "手入力"}
        >
          {item.source === "mf" ? "MF取得" : "手入力"}
        </span>
      </div>

      {editing ? (
        <div className="flex items-center justify-end gap-2">
          <input
            type="number"
            inputMode="numeric"
            step={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            autoFocus
            aria-label={`${item.account} の残高`}
            className={`tabular w-32 text-right ${INPUT_CLS}`}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="flex h-11 cursor-pointer items-center rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={pending}
            className="flex h-11 cursor-pointer items-center rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="tabular whitespace-nowrap text-sm font-semibold text-foreground">
            <span className="text-xs" aria-hidden>
              {item.balance < 0 ? "−¥" : "¥"}
            </span>
            {yen(Math.abs(item.balance))}
          </span>
          <button
            type="button"
            onClick={startEdit}
            disabled={pending}
            aria-label={`${item.account} の残高を編集`}
            className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            編集
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label={`${item.account} の残高を削除`}
            className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative transition-colors duration-150 hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-40"
          >
            削除
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function AddBalanceForm() {
  const [pending, startTransition] = useTransition();
  const [account, setAccount] = useState("");
  const [kind, setKind] = useState<BalanceKind>("bank");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (account.trim().length === 0) {
      setError("口座名を入力してください");
      return;
    }
    const bal = Number(balance);
    if (!Number.isFinite(bal)) {
      setError("残高は数値で入力してください");
      return;
    }
    startTransition(async () => {
      const res = await setAccountBalance(account.trim(), bal, kind);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAccount("");
      setKind("bank");
      setBalance("");
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 rounded-xl border border-dashed border-border bg-background/40 p-3 sm:p-4"
      aria-label="口座残高を追加・更新"
    >
      <p className="mb-2 text-xs font-medium text-muted">残高を追加・更新</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="bal-account" className="text-[11px] text-muted">
            口座名 <span className="text-negative">必須</span>
          </label>
          <input
            id="bal-account"
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            disabled={pending}
            required
            className={INPUT_CLS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bal-kind" className="text-[11px] text-muted">
            種別
          </label>
          <select
            id="bal-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as BalanceKind)}
            disabled={pending}
            className={INPUT_CLS}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bal-balance" className="text-[11px] text-muted">
            残高 <span className="text-negative">必須</span>
          </label>
          <input
            id="bal-balance"
            type="number"
            inputMode="numeric"
            step={1}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            disabled={pending}
            required
            className={`tabular w-32 text-right ${INPUT_CLS}`}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "保存中…" : "保存"}
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

export function AccountBalanceEditor({ items }: { items: AccountBalanceRow[] }) {
  return (
    <section className="mt-6" aria-label="口座残高の手入力">
      <h2 className="mb-1 text-sm font-semibold text-foreground">
        口座残高の手入力
        <span className="ml-2 tabular text-xs font-normal text-muted">
          {items.length}件
        </span>
      </h2>
      <p className="mb-2 text-[11px] text-muted">
        各行の「編集」で残高を手入力できます（PayPay・現金など）。手入力すると手入力（manual）扱いになりますが、MF再取得時は最新のMF値で上書きされます。
      </p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          登録済みの口座残高はありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <BalanceRowItem key={item.account} item={item} />
          ))}
        </ul>
      )}
      <AddBalanceForm />
    </section>
  );
}
