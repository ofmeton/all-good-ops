"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTransferFee, setTransferFee } from "@/lib/actions";
import { KIND_LABEL, type BalanceKind } from "@/lib/cashflow/kinds";
import type { TransferFeeRow } from "@/lib/write-queries";

type AccountOption = { account: string; kind: BalanceKind };

const DEFAULT_ACCOUNT = "__default__";
const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

function labelFor(account: string): string {
  return account === DEFAULT_ACCOUNT ? "既定手数料" : account;
}

function FeeRow({
  account,
  kind,
  initialFee,
}: {
  account: string;
  kind: BalanceKind | null;
  initialFee: number;
}) {
  const [fee, setFee] = useState(String(initialFee));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    const n = Number(fee);
    if (!Number.isFinite(n) || n < 0) {
      setError("手数料は0以上の数値で入力してください");
      return;
    }
    startTransition(async () => {
      const res = await setTransferFee(account, n);
      if (!res.ok) setError(res.error);
    });
  };

  const onDelete = () => {
    setError(null);
    const previousFee = fee;
    setFee("0");
    startTransition(async () => {
      const res = await deleteTransferFee(account);
      if (!res.ok) {
        setFee(previousFee);
        setError(res.error);
      }
    });
  };

  return (
    <li className={`rounded-xl border border-border bg-surface p-3 shadow-sm ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground" title={labelFor(account)}>
            {labelFor(account)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {account === DEFAULT_ACCOUNT ? "口座別設定がない場合に使います" : kind ? KIND_LABEL[kind] : "種別未設定"}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">手数料</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={pending}
              className={`tabular w-28 text-right ${INPUT_CLS}`}
            />
          </label>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="h-11 rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
          >
            保存
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="h-11 rounded-lg border border-border px-3 text-sm font-medium text-muted hover:bg-border/40 disabled:opacity-40"
          >
            解除
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-negative" role="alert">{error}</p>}
    </li>
  );
}

export function TransferFeeEditor({
  accounts,
  fees,
}: {
  accounts: AccountOption[];
  fees: TransferFeeRow[];
}) {
  const feeByAccount = useMemo(() => new Map(fees.map((row) => [row.from_account, row.fee])), [fees]);
  const rows = [{ account: DEFAULT_ACCOUNT, kind: null }, ...accounts];

  return (
    <section className="mt-6" aria-label="振替手数料">
      <h2 className="mb-1 text-sm font-semibold text-foreground">資金移動の手数料</h2>
      <p className="mb-2 text-[11px] text-muted">
        振替プラン作成時に、出金口座ごとの手数料を保存して反映します。
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <FeeRow
            key={row.account}
            account={row.account}
            kind={row.kind}
            initialFee={feeByAccount.get(row.account) ?? 0}
          />
        ))}
      </ul>
    </section>
  );
}
