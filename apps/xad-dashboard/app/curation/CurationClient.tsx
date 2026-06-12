"use client";
import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  sortMaterials,
  filterMaterials,
  passesInboxTriage,
  type CurationMaterial,
  type SelectionStatus,
  type SortKey,
  type CurationAction,
  type FilterSpec,
} from "@/lib/curation-logic";
import {
  FMAT_OPTIONS,
  DEFAULT_FMAT,
  DEFAULT_TEMPLATE_ID,
  buildAssignments,
  type TemplateOption,
  type MaterialAssignment,
} from "@/lib/curation-formats";
import { FmatTemplatePicker } from "@/app/components/FmatTemplatePicker";
import { useRecommendations } from "@/app/components/useRecommendations";
import { MaterialCard } from "./MaterialCard";

const TABS: { key: SelectionStatus; label: string; color: string }[] = [
  { key: "collected", label: "未処理", color: "border-white/25" },
  { key: "selected", label: "温め", color: "border-emerald-500" },
  { key: "queued", label: "送信済", color: "border-blue-500" },
  { key: "rejected", label: "除外", color: "border-rose-400" },
  { key: "archived", label: "アーカイブ", color: "border-white/15" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "effective_overall", label: "総合（鮮度補正）" },
  { key: "overall_score", label: "総合（採点時）" },
  { key: "freshness", label: "鮮度" },
  { key: "velocity", label: "伸び率" },
  { key: "target_fit", label: "適合度" },
  { key: "collected_at", label: "新着順" },
  { key: "engagement", label: "反応数" },
];

// フィルタ行の select 共通スタイル（chevron 背景込み）。
const SELECT_CLASS =
  "h-7 pl-2 pr-6 text-sm border border-white/10 rounded bg-surface text-slate-300 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer";
const SELECT_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 6px center",
};

const ACTION_CONFIG: {
  action: CurationAction;
  label: string;
  variant: "primary" | "default" | "danger" | "ghost";
}[] = [
  { action: "send_to_compose", label: "執筆へ送る", variant: "primary" },
  { action: "select", label: "温め（あとで）", variant: "default" },
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
      "bg-blue-500 text-white hover:bg-blue-400 active:bg-blue-600 shadow-sm",
    default:
      "bg-surface text-slate-300 border border-white/15 hover:bg-white/5 hover:border-white/30 active:bg-white/5",
    danger:
      "bg-surface text-rose-300 border border-rose-400/30 hover:bg-rose-400/10 hover:border-rose-400/40 active:bg-rose-400/15",
    ghost:
      "text-slate-400 hover:text-slate-200 hover:bg-white/10 active:bg-white/10",
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
  templateOptions,
}: {
  materials: Record<SelectionStatus, CurationMaterial[]>;
  counts: Record<SelectionStatus, number>;
  limit: number;
  templateOptions: TemplateOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<SelectionStatus>("collected");
  // 多軸ソート: 並び1（必須）/ 並び2・並び3（任意・"" で無効）。優先順に評価される（例: 新着順 × 総合）。
  const [sortKeys, setSortKeys] = useState<[SortKey, SortKey | "", SortKey | ""]>([
    "effective_overall",
    "",
    "",
  ]);
  const [filter, setFilter] = useState<FilterSpec>({});
  const [text, setText] = useState("");
  // lane レーン（要件4）: 既定は投稿候補のみ表示。参考(JP=二次流通)は別レーンに物理分離。
  const [lane, setLane] = useState<"candidate" | "reference" | "">("candidate");
  // トリアージ（要件2）: 未処理タブで高シグナルのみ表示（既定ON）。OFF で 50-69 帯も含む全件。
  const [triage, setTriage] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; type: "info" | "error" | "success" }>({
    text: "",
    type: "info",
  });
  // 執筆送信ダイアログ: 素材ごとに行（FmatTemplatePicker）で format/template を選ぶ（要件1）。
  const [composeOpen, setComposeOpen] = useState(false);
  // 行の編集値（素材 id → {fmat, templateId}）。各行の初期値は推薦（無ければ既定）。
  const [assignments, setAssignments] = useState<MaterialAssignment[]>([]);
  // AI 推薦の共通フック（CurationClient/承認ダイアログで共用・fail-open・timeout 25s）。
  const rec = useRecommendations();
  // 自動発火の二重起動ガード: 直近に推薦を投げた id セット（ソート済 join）を覚えておく。
  const lastRecKeyRef = useRef<string>("");

  const templateLabel = useCallback(
    (id: string) => templateOptions.find((o) => o.id === id)?.label ?? id,
    [templateOptions],
  );
  const fmatLabel = useCallback(
    (v: string) => FMAT_OPTIONS.find((o) => o.value === v)?.label ?? v,
    [],
  );

  // 選択素材の推薦入力（本文・言語・メディア・反応）を作る。本文の無い素材は除外。
  const buildRecPayload = useCallback(
    (ids: string[]) => {
      const byId = new Map((materials[tab] ?? []).map((m) => [m.id, m]));
      return ids
        .map((id) => byId.get(id))
        .filter((m): m is CurationMaterial => !!m)
        .map((m) => ({
          id: m.id,
          text: m.translation || m.raw_text || "",
          lang: m.lang,
          hasMedia: !!(m.media && m.media.length > 0),
          engagement: m.engagement,
        }))
        .filter((m) => m.text.trim().length > 0);
    },
    [materials, tab],
  );

  // ユーザーが手動編集した行 id（推薦で上書きしない＝人の操作を尊重）。
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());

  // 推薦を実行し、結果で未編集行の初期値を pre-fill（要件1）。最終決定は人（行は編集可）。
  // 推薦失敗（fail-open）でも assignments は既定で確定済なので送信導線は止まらない。
  const runRecommend = useCallback(
    async (ids: string[]) => {
      const payload = buildRecPayload(ids);
      const result = await rec.run(payload); // 内部で recommendations state も更新（行表示用）
      // run() は失敗時 null・成功時に最頻 1 組を返す。要件1 は素材ごとに当てたいので、
      // hook 内部が更新した recommendations を直接は読めない（setState は非同期）。
      // 代わりに run() の戻りで成否だけ判定し、行反映は下の effect-less 同期ブロックで recommendations から行う。
      void result;
    },
    [buildRecPayload, rec],
  );

  function openCompose() {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    // 各行を既定で初期化（この時点で送信可能＝推薦は付加価値）。編集履歴もリセット。
    setAssignments(buildAssignments(ids, []));
    setEditedIds(new Set());
    appliedRecKeyRef.current = "";
    rec.reset();
    setComposeOpen(true);
    // ダイアログを開いた直後に推薦を 1 回 batch 自動発火（同一 id セットでは再発火しない）。
    const key = [...ids].sort().join(",");
    if (key !== lastRecKeyRef.current) {
      lastRecKeyRef.current = key;
      void runRecommend(ids);
    }
  }

  // 推薦結果が届いたら未編集行の初期値へ反映（手動編集済の行は上書きしない）。
  // render 中の setState は React が安全に折り畳む（key が変わった 1 回のみ実行）。
  const recsKey = rec.recommendations.map((r) => r.materialId).join(",");
  const appliedRecKeyRef = useRef<string>("");
  if (composeOpen && rec.recommendations.length > 0 && recsKey !== appliedRecKeyRef.current) {
    appliedRecKeyRef.current = recsKey;
    setAssignments((prev) => {
      const built = buildAssignments(prev.map((a) => a.id), rec.recommendations);
      return prev.map((a, i) => (editedIds.has(a.id) ? a : built[i]));
    });
  }

  // 手動再実行（同一 id セットのガードを無視して投げ直す）。
  function rerunRecommend() {
    const ids = assignments.map((a) => a.id);
    if (ids.length === 0) return;
    appliedRecKeyRef.current = ""; // 次の結果を再適用できるようにする
    void runRecommend(ids);
  }

  // 1 行の値を更新（= 手動編集としてマークし、以後の推薦反映から除外）。
  const updateAssignment = useCallback(
    (id: string, patch: Partial<Pick<MaterialAssignment, "fmat" | "templateId">>) => {
      setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      setEditedIds((prev) => new Set(prev).add(id));
    },
    [],
  );

  // 一括変更（上部の行）: 全行に同じ fmat/template を当てる。
  const [bulkFmat, setBulkFmat] = useState<string>(DEFAULT_FMAT);
  const [bulkTemplateId, setBulkTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  function applyBulk() {
    setAssignments((prev) => prev.map((a) => ({ ...a, fmat: bulkFmat, templateId: bulkTemplateId })));
    // 一括適用も手動操作＝以後の推薦反映から全行を除外する。
    setEditedIds(new Set(assignments.map((a) => a.id)));
  }

  // ソートスロット更新。重複キーは後方スロットを空にし、並び2 が空なら並び3 も詰める（穴を作らない）。
  const setSortSlot = useCallback((idx: 0 | 1 | 2, value: SortKey | "") => {
    setSortKeys((prev) => {
      const arr: (SortKey | "")[] = [prev[0], prev[1], prev[2]];
      arr[idx] = idx === 0 ? (value || "effective_overall") : value;
      for (let j = idx + 1; j < 3; j++) {
        if (value && arr[j] === value) arr[j] = "";
      }
      if (arr[1] === "") arr[2] = "";
      return [(arr[0] || "effective_overall") as SortKey, arr[1], arr[2]];
    });
  }, []);

  const base = materials[tab] ?? [];
  const activeSortKeys = sortKeys.filter(Boolean) as SortKey[];
  // 未処理タブ × トリアージON のときは「高シグナルだけ」を出す（lane セグメントは無効化し
  // 候補の高シグナル＋JPバズ参考の混成を見せる）。それ以外は lane セグメントで絞る。
  const triageActive = tab === "collected" && triage;
  const baseFiltered = filterMaterials(base, { ...filter, text });
  const laneScoped = triageActive
    ? baseFiltered.filter(passesInboxTriage)
    : baseFiltered.filter((m) => !lane || (m.lane ?? "candidate") === lane);
  const shown = sortMaterials(laneScoped, activeSortKeys);
  // レーン別件数（セグメント表示用）。lane 未設定の旧データは candidate 扱い。
  const laneCounts = {
    candidate: base.filter((m) => (m.lane ?? "candidate") === "candidate").length,
    reference: base.filter((m) => m.lane === "reference").length,
  };
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

  async function act(
    action: CurationAction,
    opts?: { assignments?: MaterialAssignment[] },
  ) {
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
      body: JSON.stringify({
        ids,
        action,
        note,
        // 要件1: 素材ごと希望を assignments で送る（route は per-item RPC を使う）。
        ...(opts?.assignments
          ? {
              assignments: opts.assignments.map((a) => ({
                id: a.id,
                desiredFmat: a.fmat,
                templateId: a.templateId,
              })),
            }
          : {}),
      }),
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

  async function confirmCompose() {
    setComposeOpen(false);
    await act("send_to_compose", { assignments });
  }

  const activeTab = TABS.find((t) => t.key === tab)!;
  const allShownSelected =
    shown.length > 0 && shown.every((m) => checked.has(m.id));

  return (
    <div className="min-h-screen bg-white/[0.03]">
      {/* ── Page header ── */}
      <div className="bg-surface border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                素材キュレーション
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                X収集素材のトリアージ・温め・発信工程への送信
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
                      ? `bg-white/[0.03] text-white border-t-2 ${t.color} border-x border-white/10 -mb-px z-10`
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/10",
                  ].join(" ")}
                >
                  {t.label}
                  <span
                    className={[
                      "ml-2 text-xs px-1.5 py-0.5 rounded-full font-mono tabular-nums",
                      active
                        ? "bg-white/10 text-slate-300"
                        : "bg-white/5 text-slate-400",
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
      <div className="sticky top-14 z-20 bg-surface border-b border-white/10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6">
          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 py-2.5 text-sm border-b border-white/5">
            {/* Sort（多軸: 並び1 必須 / 並び2・3 任意。優先順に評価＝例 新着順 × 総合） */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                並び
              </span>
              {([0, 1, 2] as const).map((idx) => {
                // 前段が未選択なら次段は出さない（並び1→2→3 の順に開く）。
                if (idx > 0 && sortKeys[idx - 1] === "") return null;
                const value = sortKeys[idx];
                // 他スロットで使用中のキーは選択肢から除外（重複指定を防ぐ）。
                const used = sortKeys.filter((k, j) => j !== idx && k) as SortKey[];
                const opts = SORTS.filter((s) => !used.includes(s.key));
                return (
                  <select
                    key={idx}
                    aria-label={`並び替え${idx + 1}`}
                    value={value}
                    onChange={(e) => setSortSlot(idx, e.target.value as SortKey | "")}
                    className={SELECT_CLASS}
                    style={SELECT_STYLE}
                  >
                    {idx > 0 && <option value="">—（なし）</option>}
                    {opts.map((s) => (
                      <option key={s.key} value={s.key}>
                        {idx > 0 ? `↳ ${s.label}` : s.label}
                      </option>
                    ))}
                  </select>
                );
              })}
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* トリアージ（要件2）: 未処理タブのみ。ON=高シグナルだけ / OFF=全件(50-69帯も) */}
            {tab === "collected" && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={triage}
                  onChange={(e) => {
                    setTriage(e.target.checked);
                    setChecked(new Set());
                  }}
                  className="w-3.5 h-3.5 rounded border-white/15 accent-blue-600"
                />
                <span className={`text-xs font-medium ${triage ? "text-blue-300" : "text-slate-400"}`}>
                  🎯 高シグナルのみ
                </span>
              </label>
            )}

            {/* Lane（要件4）: 投稿候補 / 参考(JP) / 全。トリアージON時は高シグ混成のため非表示。 */}
            {!triageActive && (
            <div className="inline-flex rounded border border-white/10 overflow-hidden" role="group" aria-label="レーン">
              {([
                { key: "candidate", label: "投稿候補", count: laneCounts.candidate },
                { key: "reference", label: "参考(JP)", count: laneCounts.reference },
                { key: "", label: "全" },
              ] as const).map((opt) => {
                const active = lane === opt.key;
                return (
                  <button
                    key={opt.key || "all"}
                    onClick={() => {
                      setLane(opt.key);
                      setChecked(new Set());
                    }}
                    aria-pressed={active}
                    className={[
                      "px-2.5 h-7 text-xs font-medium transition-colors border-r border-white/10 last:border-r-0",
                      active
                        ? opt.key === "reference"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-blue-400/15 text-blue-200"
                        : "bg-surface text-slate-400 hover:bg-white/5",
                    ].join(" ")}
                  >
                    {opt.label}
                    {"count" in opt && (
                      <span className="ml-1 tabular-nums opacity-70">{opt.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            )}

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Via */}
            <select
              value={filter.via ?? ""}
              onChange={(e) =>
                setFilter((f) => ({ ...f, via: e.target.value || undefined }))
              }
              className="h-7 pl-2 pr-6 text-sm border border-white/10 rounded bg-surface text-slate-300 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
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
              className="h-7 pl-2 pr-6 text-sm border border-white/10 rounded bg-surface text-slate-300 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer"
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
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={!!filter.hasMedia}
                onChange={(e) =>
                  setFilter((f) => ({
                    ...f,
                    hasMedia: e.target.checked || undefined,
                  }))
                }
                className="w-3.5 h-3.5 rounded border-white/15 accent-blue-600"
              />
              <span className="text-xs">メディア有</span>
            </label>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

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
                className="h-7 pl-2 pr-2 w-24 text-sm border border-white/10 rounded bg-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
                className="h-7 pl-6 pr-2 w-32 text-sm border border-white/10 rounded bg-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
              className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed underline-offset-2 hover:underline transition-colors select-none"
            >
              {allShownSelected ? "選択解除" : "全選択"}
            </button>

            <span className="text-xs text-slate-400 font-mono tabular-nums min-w-[4rem]">
              {checked.size > 0 ? (
                <span className="text-slate-300 font-medium">
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
                  onClick={() =>
                    action === "send_to_compose"
                      ? openCompose()
                      : act(action)
                  }
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
                    ? "bg-rose-400/10 text-rose-300 border border-rose-400/30"
                    : msg.type === "success"
                    ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                    : "bg-white/5 text-slate-300",
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
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-400/10 border border-amber-400/30">
            <svg
              className="w-4 h-4 text-amber-300 mt-0.5 shrink-0"
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
            <p className="text-xs text-amber-200">
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
          <h2 className="text-sm font-medium text-slate-300">
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
              <div className="text-slate-300 text-4xl mb-3 select-none">
                {triageActive && base.length > 0 ? "🎉" : "○"}
              </div>
              <p className="text-slate-400 text-sm">
                {triageActive && base.length > 0
                  ? "高シグナルの未処理はありません（inbox ゼロ達成）。"
                  : base.length === 0
                  ? "このタブに素材がありません。"
                  : "フィルタ条件に該当する素材がありません。"}
              </p>
              {triageActive && base.length > 0 ? (
                <div className="mt-2 flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => {
                      setTriage(false);
                      setChecked(new Set());
                    }}
                    className="text-xs text-blue-300 hover:underline"
                  >
                    全件を表示（50-69 帯も確認）
                  </button>
                  {/* 温めプール（要件5）への導線。捌き切ったら寝かせネタを見直す。 */}
                  {counts.selected > 0 && (
                    <button
                      onClick={() => {
                        setTab("selected");
                        setChecked(new Set());
                      }}
                      className="text-xs text-emerald-300 hover:underline"
                    >
                      🔥 温めプールに {counts.selected} 件あります。見直しますか
                    </button>
                  )}
                </div>
              ) : base.length > 0 ? (
                <button
                  onClick={() => {
                    setFilter({});
                    setText("");
                  }}
                  className="mt-2 text-xs text-blue-300 hover:underline"
                >
                  フィルタをリセット
                </button>
              ) : null}
            </div>
          ) : (
            shown.map((m) => (
              <MaterialCard
                key={m.id}
                m={m}
                checked={checked.has(m.id)}
                onToggle={toggle}
                showWarmAge={tab === "selected"}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 執筆送信ダイアログ（素材ごとに format / template を選択・要件1） ── */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-dialog-title"
          onClick={() => setComposeOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl bg-surface shadow-xl border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
              <h2
                id="compose-dialog-title"
                className="text-sm font-semibold text-white"
              >
                執筆へ送る
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                選択した{" "}
                <span className="font-medium text-slate-300 tabular-nums">
                  {checked.size}
                </span>{" "}
                件それぞれに、フォーマットとテンプレートを設定します（初期値は AI 推薦、無ければ既定）。最終決定はあなたです。
              </p>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto">
              {/* AI 推薦ステータス（自動発火・最終決定は人） */}
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-violet-900">
                    {rec.loading
                      ? "AI が各素材に最適な型を推薦中…"
                      : rec.recommendations.length > 0
                      ? `AI が ${rec.recommendations.length} 件の素材に型を推薦しました（初期値に反映済・編集可）`
                      : "AI 推薦（各素材の初期値に反映されます）"}
                  </span>
                  <button
                    type="button"
                    onClick={rerunRecommend}
                    disabled={rec.loading || assignments.length === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    {rec.loading ? "推薦中…" : "🤖 再推薦"}
                  </button>
                </div>
                {rec.error && (
                  <p className="text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded px-2 py-1">
                    {rec.error}
                  </p>
                )}
              </div>

              {/* 一括変更行（全行に同じ fmat/template を当てる） */}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-300">
                    一括変更（全 {assignments.length} 件に適用）
                  </span>
                  <button
                    type="button"
                    onClick={applyBulk}
                    disabled={assignments.length === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface text-slate-300 border border-white/15 hover:bg-white/10 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    全件に適用
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <FmatTemplatePicker
                    idPrefix="compose-bulk"
                    fmat={bulkFmat}
                    templateId={bulkTemplateId}
                    onFmatChange={setBulkFmat}
                    onTemplateChange={setBulkTemplateId}
                    templateOptions={templateOptions}
                    fmatHint={null}
                  />
                </div>
              </div>

              {/* 素材ごとの行 */}
              <div className="space-y-2.5">
                {assignments.map((a, i) => {
                  const m = (materials[tab] ?? []).find((x) => x.id === a.id);
                  const preview = (m?.translation || m?.raw_text || "(本文なし)").trim();
                  const r = rec.recommendations.find((x) => x.materialId === a.id);
                  return (
                    <div
                      key={a.id}
                      className="rounded-lg border border-white/10 p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5 shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs text-slate-300 leading-snug line-clamp-2 flex-1">
                          {preview}
                        </p>
                      </div>
                      {r && (
                        <p className="text-[11px] text-violet-700/90 bg-violet-50/70 border border-violet-100 rounded px-2 py-1 leading-snug">
                          AI推薦: {templateLabel(r.templateId)} / {fmatLabel(r.fmat)}
                          <span className="text-slate-400">
                            {" "}（確信度 {(r.confidence * 100).toFixed(0)}%）
                          </span>
                          {r.reason && <span className="block text-slate-400">{r.reason}</span>}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2.5">
                        <FmatTemplatePicker
                          idPrefix={`compose-row-${i}`}
                          fmat={a.fmat}
                          templateId={a.templateId}
                          onFmatChange={(v) => updateAssignment(a.id, { fmat: v })}
                          onTemplateChange={(v) => updateAssignment(a.id, { templateId: v })}
                          templateOptions={templateOptions}
                          fmatHint={null}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-white/[0.03] border-t border-white/5 shrink-0">
              <button
                onClick={() => setComposeOpen(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/15 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmCompose}
                disabled={pending || checked.size === 0}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-400 active:bg-blue-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
