"use client";

import { useState, useTransition } from "react";
import type { TaxMajorRow, TaxMiddleRow } from "@/lib/tax-queries";
import { upsertTaxMapping, deleteTaxMapping } from "@/lib/tax-actions";
import { yen } from "@/lib/format";

// 経費集計表（大項目→中項目階層）。按分%・青色科目をその場で編集→保存。
// 楽観的更新はせず action 後の revalidate に委ねる（RecurringEditor と同じ作法）。

// 0..1 → '80' のような % 表示文字列（小数按分も崩さない）。
function ratioToPctString(ratio: number): string {
  const pct = ratio * 100;
  return String(Number.isInteger(pct) ? pct : Math.round(pct * 10) / 10);
}

interface EditorProps {
  major: string;
  middle: string; // '' = 大項目全体
  mappingId: number | null; // 自身のマッピング id（あれば削除可能）
  initialPct: string; // 自身の設定値（% 文字列）。未設定は ''
  initialAoiro: string;
  inheritedPct: string | null; // 大項目全体からの継承値（placeholder 表示用）
  inheritedAoiro: string | null;
  label: string; // aria 用
}

// 1 行分の編集 UI（按分% + 青色科目 + 保存/解除）。大項目行・中項目行で共用。
function MappingEditor({
  major,
  middle,
  mappingId,
  initialPct,
  initialAoiro,
  inheritedPct,
  inheritedAoiro,
  label,
}: EditorProps) {
  const [pending, startTransition] = useTransition();
  const [pct, setPct] = useState(initialPct);
  const [aoiro, setAoiro] = useState(initialAoiro);
  const [error, setError] = useState<string | null>(null);
  const dirty = pct.trim() !== initialPct || aoiro.trim() !== initialAoiro;

  const idBase = `tax-${major}-${middle || "__major__"}`.replace(/\s/g, "_");

  const onSave = () => {
    setError(null);
    const n = Number(pct);
    if (pct.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      setError("按分は 0〜100 で入力してください");
      return;
    }
    startTransition(async () => {
      await upsertTaxMapping({
        category_major: major,
        category_middle: middle,
        business_ratio: n,
        aoiro_item: aoiro,
      });
    });
  };

  const onClear = () => {
    if (mappingId == null) return;
    if (!window.confirm(`「${label}」の按分設定を解除します。よろしいですか？`))
      return;
    startTransition(async () => {
      await deleteTaxMapping(mappingId);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`${idBase}-pct`}>
        {label} の事業按分（%）
      </label>
      <div className="flex items-center gap-1">
        <input
          id={`${idBase}-pct`}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={pct}
          placeholder={inheritedPct ?? "0"}
          onChange={(e) => setPct(e.target.value)}
          disabled={pending}
          className="tabular h-11 w-20 rounded-lg border border-border bg-background px-2 text-right text-sm text-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span aria-hidden className="text-xs text-muted">
          %
        </span>
      </div>
      <label className="sr-only" htmlFor={`${idBase}-aoiro`}>
        {label} の青色申告科目
      </label>
      <input
        id={`${idBase}-aoiro`}
        type="text"
        value={aoiro}
        placeholder={inheritedAoiro ?? "科目（例: 通信費）"}
        onChange={(e) => setAoiro(e.target.value)}
        disabled={pending}
        className="h-11 w-36 rounded-lg border border-border bg-background px-2 text-sm text-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={pending || !dirty}
        className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        保存
      </button>
      {mappingId != null && (
        <button
          type="button"
          onClick={onClear}
          disabled={pending}
          aria-label={`${label} の按分設定を解除`}
          className="h-11 shrink-0 cursor-pointer rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative transition-colors duration-150 hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-40"
        >
          解除
        </button>
      )}
      {error && (
        <p className="w-full text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function MiddleRowItem({
  majorRow,
  row,
}: {
  majorRow: TaxMajorRow;
  row: TaxMiddleRow;
}) {
  const inheritedPct =
    row.mapping == null && majorRow.majorMapping != null
      ? ratioToPctString(majorRow.majorMapping.business_ratio)
      : null;
  const inheritedAoiro =
    row.mapping == null ? (majorRow.majorMapping?.aoiro_item ?? null) : null;

  return (
    <li className="flex flex-col gap-2 border-t border-border px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className="min-w-0 flex-1 truncate text-sm text-foreground"
          title={row.middle}
        >
          {row.middle}
          {row.inherited && (
            <span className="ml-2 inline-flex shrink-0 items-center rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-muted">
              大項目から継承
            </span>
          )}
        </span>
        <span className="tabular shrink-0 text-sm text-foreground">
          ¥{yen(row.spend)}
          <span className="ml-1 text-[11px] text-muted">{row.count}件</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MappingEditor
          major={majorRow.major}
          middle={row.middle}
          mappingId={row.mapping?.id ?? null}
          initialPct={
            row.mapping ? ratioToPctString(row.mapping.business_ratio) : ""
          }
          initialAoiro={row.mapping?.aoiro_item ?? ""}
          inheritedPct={inheritedPct}
          inheritedAoiro={inheritedAoiro}
          label={`${majorRow.major} › ${row.middle}`}
        />
        <span className="tabular text-sm font-medium text-positive">
          見込み ¥{yen(row.estimate)}
        </span>
      </div>
    </li>
  );
}

function MajorSection({ row }: { row: TaxMajorRow }) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
      aria-label={`${row.major} の年間支出と按分設定`}
    >
      <div className="flex flex-col gap-2 bg-background/40 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {row.major}
          </h3>
          <span className="tabular shrink-0 text-sm font-semibold text-foreground">
            ¥{yen(row.spend)}
            <span className="ml-1 text-[11px] font-normal text-muted">
              {row.count}件
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">
              大項目全体の按分（中項目で個別設定が無いものに適用）
            </span>
            <MappingEditor
              major={row.major}
              middle=""
              mappingId={row.majorMapping?.id ?? null}
              initialPct={
                row.majorMapping
                  ? ratioToPctString(row.majorMapping.business_ratio)
                  : ""
              }
              initialAoiro={row.majorMapping?.aoiro_item ?? ""}
              inheritedPct={null}
              inheritedAoiro={null}
              label={`${row.major}（大項目全体）`}
            />
          </div>
          <span className="tabular text-sm font-semibold text-positive">
            見込み計 ¥{yen(row.estimate)}
          </span>
        </div>
      </div>
      <ul>
        {row.middles.map((m) => (
          <MiddleRowItem key={m.middle} majorRow={row} row={m} />
        ))}
      </ul>
    </section>
  );
}

export function TaxMappingTable({ rows }: { rows: TaxMajorRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-sm text-muted">この年の支出データはありません。</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <MajorSection key={r.major} row={r} />
      ))}
    </div>
  );
}
