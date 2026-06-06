"use client";
import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  sortMaterials,
  filterMaterials,
  type CurationMaterial,
  type SelectionStatus,
  type SortKey,
  type CurationAction,
  type FilterSpec,
} from "@/lib/curation-logic";
import { MaterialCard } from "./MaterialCard";

const TABS: { key: SelectionStatus; label: string; color: string }[] = [
  { key: "collected", label: "未処理", color: "border-slate-400" },
  { key: "selected", label: "選抜済", color: "border-emerald-500" },
  { key: "queued", label: "送信済", color: "border-blue-500" },
  { key: "rejected", label: "除外", color: "border-rose-400" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "overall_score", label: "総合スコア" },
  { key: "freshness", label: "鮮度" },
  { key: "velocity", label: "伸び率" },
  { key: "target_fit", label: "適合度" },
  { key: "collected_at", label: "新着順" },
  { key: "engagement", label: "反応数" },
];

const ACTION_CONFIG: {
  action: CurationAction;
  label: string;
  variant: "primary" | "default" | "danger" | "ghost";
}[] = [
  { action: "send_to_compose", label: "執筆へ送る", variant: "primary" },
  { action: "select", label: "選抜", variant: "default" },
  { action: "reject", label: "除外", variant: "danger" },
  { action: "reset", label: "未処理へ戻す", variant: "ghost" },
];

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "primary" | "default" | "danger" | "ghost";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed select-none";
  const styles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm",
    default:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100",
    danger:
      "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 active:bg-rose-100",
    ghost:
      "text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

export function CurationClient({
  materials,
  counts,
  limit,
}: {
  materials: Record<SelectionStatus, CurationMaterial[]>;
  counts: Record<SelectionStatus, number>;
  limit: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<SelectionStatus>("collected");
  const [sort, setSort] = useState<SortKey>("overall_score");
  const [filter, setFilter] = useState<FilterSpec>({});
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; type: "info" | "error" | "success" }>({
    text: "",
    type: "info",
  });

  const base = materials[tab] ?? [];
  const shown = sortMaterials(filterMaterials(base, { ...filter, text }), sort);
  const vias = Array.from(
    new Set(base.map((m) => m.discovery_via).filter(Boolean))
  ) as string[];
  const langs = Array.from(
    new Set(base.map((m) => m.lang).filter(Boolean))
  ) as string[];

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }, []);

  const selectAll = () => {
    setChecked(new Set(shown.map((m) => m.id)));
  };

  const clearAll = () => {
    setChecked(new Set());
  };

  async function act(action: CurationAction) {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    let note: string | null = null;
    if (action === "reject" || action === "select") {
      note = window.prompt("メモ（任意・スコア違和感など。空でOK）") || null;
    }
    setMsg({ text: "送信中…", type: "info" });
    const res = await fetch("/api/curation/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, action, note }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ text: `失敗: ${body.error ?? res.status}`, type: "error" });
      return;
    }
    setMsg({
      text: body.warning ?? `${body.updated} 件を更新しました`,
      type: body.warning ? "info" : "success",
    });
    setChecked(new Set());
    startTransition(() => router.refresh());
  }

  const activeTab = TABS.find((t) => t.key === tab)!;
  const allShownSelected =
    shown.length > 0 && shown.every((m) => checked.has(m.id));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                素材キュレーション
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                X収集素材のスコアリング・選抜・発信工程への送信
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono tabular-nums">
              総計{" "}
              {Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()}{" "}
              件
            </div>
          </div>

          {/* ── Tabs ── */}
          <nav className="flex gap-1" role="tablist">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.key);
                    setChecked(new Set());
                    setMsg({ text: "", type: "info" });
                  }}
                  className={[
                    "relative px-4 py-2 text-sm font-medium rounded-t transition-colors duration-150",
                    active
                      ? `bg-slate-50 text-slate-900 border-t-2 ${t.color} border-x border-slate-200 -mb-px z-10`
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {t.label}
                  <span
                    className={[
                      "ml-2 text-xs px-1.5 py-0.5 rounded-full font-mono tabular-nums",
                      active
                        ? "bg-slate-200 text-slate-700"
                        : "bg-slate-100 text-slate-400",
                    ].join(" ")}
                  >
                    {counts[t.key].toLocaleString()}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Controls + sticky action bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6">
          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 py-2.5 text-sm border-b border-slate-100">
            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                並び
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-7 pl-2 pr-6 text-sm border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-px h-4 bg-slate-200 mx-0.5" />

            {/* Via */}
            <select
              value={filter.via ?? ""}
              onChange={(e) =>
                setFilter((f) => ({ ...f, via: e.target.value || undefined }))
              }
              className="h-7 pl-2 pr-6 text-sm border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
            >
              <option value="">経路: 全</option>
              {vias.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Lang */}
            <select
              value={filter.lang ?? ""}
              onChange={(e) =>
                setFilter((f) => ({ ...f, lang: e.target.value || undefined }))
              }
              className="h-7 pl-2 pr-6 text-sm border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
            >
              <option value="">言語: 全</option>
              {langs.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            {/* Media checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-800 select-none">
              <input
                type="checkbox"
                checked={!!filter.hasMedia}
                onChange={(e) =>
                  setFilter((f) => ({
                    ...f,
                    hasMedia: e.target.checked || undefined,
                  }))
                }
                className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600"
              />
              <span className="text-xs">メディア有</span>
            </label>

            <div className="w-px h-4 bg-slate-200 mx-0.5" />

            {/* Source text input */}
            <div className="relative">
              <input
                placeholder="ソース"
                value={filter.source ?? ""}
                onChange={(e) =>
                  setFilter((f) => ({
                    ...f,
                    source: e.target.value || undefined,
                  }))
                }
                className="h-7 pl-2 pr-2 w-24 text-sm border border-slate-200 rounded bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>

            {/* Full-text search */}
            <div className="relative">
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                placeholder="本文検索"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-7 pl-6 pr-2 w-32 text-sm border border-slate-200 rounded bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>

            {/* Result count */}
            <span className="ml-auto text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
              {shown.length.toLocaleString()} / {base.length.toLocaleString()} 件
            </span>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 py-2">
            {/* Select all toggle */}
            <button
              onClick={allShownSelected ? clearAll : selectAll}
              disabled={shown.length === 0}
              className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed underline-offset-2 hover:underline transition-colors select-none"
            >
              {allShownSelected ? "選択解除" : "全選択"}
            </button>

            <span className="text-xs text-slate-400 font-mono tabular-nums min-w-[4rem]">
              {checked.size > 0 ? (
                <span className="text-slate-700 font-medium">
                  {checked.size} 件選択中
                </span>
              ) : (
                "0 件選択"
              )}
            </span>

            <div className="flex items-center gap-1.5 ml-1">
              {ACTION_CONFIG.map(({ action, label, variant }) => (
                <ActionButton
                  key={action}
                  onClick={() => act(action)}
                  disabled={pending || checked.size === 0}
                  variant={variant}
                >
                  {label}
                </ActionButton>
              ))}
            </div>

            {/* Status message */}
            {msg.text && (
              <span
                className={[
                  "ml-auto text-xs px-2.5 py-1 rounded-full font-medium",
                  msg.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : msg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        {/* Limit exceeded notice */}
        {counts[tab] > limit && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <svg
              className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-xs text-amber-800">
              <span className="font-semibold">{counts[tab].toLocaleString()} 件</span>
              {" "}中、overall 降順で上位{" "}
              <span className="font-semibold">{limit.toLocaleString()} 件</span>
              {" "}のみ表示しています。
            </p>
          </div>
        )}

        {/* Active tab indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-1 h-4 rounded-full ${activeTab.color.replace("border-", "bg-")}`} />
          <h2 className="text-sm font-medium text-slate-700">
            {activeTab.label}
          </h2>
          {shown.length !== base.length && (
            <span className="text-xs text-slate-400">
              （フィルタ適用中）
            </span>
          )}
        </div>

        {/* Card list */}
        <div className="space-y-2">
          {shown.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-slate-300 text-4xl mb-3 select-none">○</div>
              <p className="text-slate-500 text-sm">
                {base.length === 0
                  ? "このタブに素材がありません。"
                  : "フィルタ条件に該当する素材がありません。"}
              </p>
              {base.length > 0 && (
                <button
                  onClick={() => {
                    setFilter({});
                    setText("");
                  }}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  フィルタをリセット
                </button>
              )}
            </div>
          ) : (
            shown.map((m) => (
              <MaterialCard
                key={m.id}
                m={m}
                checked={checked.has(m.id)}
                onToggle={toggle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
