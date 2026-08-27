"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { yen } from "@/lib/format";
import { inferClassification, type Classification } from "@/lib/triage-classification";
import { commitTriage, type TriageDecision, type TriageResult, type TriageScope } from "@/lib/triage-actions";
import type { CategoryOption, TriageGroup, TriageSummary } from "@/lib/triage-queries";

const SCOPE_LABELS: Record<TriageScope, string> = {
  override: "この取引だけ",
  "rule-exact": "完全一致ルール",
  "rule-contains": "部分一致ルール",
};
const CLASSIFICATION_LABELS: Record<Classification, string> = {
  income: "収入",
  fixed: "固定費",
  variable: "変動費",
  transfer: "振替",
  internal: "資金移動",
};
const SCOPE_ORDER: TriageScope[] = ["override", "rule-exact", "rule-contains"];

type SelectedCategory = Pick<CategoryOption, "major" | "middle">;
type HistoryItem = { group: TriageGroup };

function defaultScope(group: TriageGroup): TriageScope {
  return group.count >= 2 ? "rule-exact" : "override";
}

function nextScope(scope: TriageScope): TriageScope {
  return SCOPE_ORDER[(SCOPE_ORDER.indexOf(scope) + 1) % SCOPE_ORDER.length];
}

function ScopeBadge({ scope }: { scope: TriageScope }) {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function TriageWorkbench({
  groups,
  categoryOptions,
  summary,
}: {
  groups: TriageGroup[];
  categoryOptions: CategoryOption[];
  summary: TriageSummary;
}) {
  const [queue, setQueue] = useState(groups);
  const [skipped, setSkipped] = useState<TriageGroup[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [decisions, setDecisions] = useState<TriageDecision[]>([]);
  const [category, setCategory] = useState<SelectedCategory | null>(null);
  const [classification, setClassification] = useState<Classification>("variable");
  const [scope, setScope] = useState<TriageScope>(() => defaultScope(groups[0]));
  const [pattern, setPattern] = useState(groups[0]?.description ?? "");
  const [query, setQuery] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const groupSignature = groups
    .map((group) => `${group.description}\u0000${group.txnIds.join("\u0001")}`)
    .join("\u0002");
  const latestGroupSignature = useRef(groupSignature);

  const current = queue[0];
  const topOptions = categoryOptions.slice(0, 12);
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ja-JP");
    if (!needle) return categoryOptions;
    return categoryOptions.filter((option) =>
      `${option.major} ${option.middle}`.toLocaleLowerCase("ja-JP").includes(needle),
    );
  }, [categoryOptions, query]);
  const processed = Math.min(groups.length, processedCount);
  const progress = groups.length === 0 ? 0 : (processed / groups.length) * 100;

  // server action の revalidate 後は新しいgroupsを正とし、古いローカルキューを残さない。
  // result は直後のフィードバックとして残す。
  useEffect(() => {
    if (latestGroupSignature.current === groupSignature) return;
    latestGroupSignature.current = groupSignature;
    setQueue(groups);
    setSkipped([]);
    setHistory([]);
    setDecisions([]);
    setProcessedCount(0);
    setCategory(null);
    setError(null);
  }, [groupSignature, groups]);

  useEffect(() => {
    if (!current) return;
    setCategory(null);
    setClassification("variable");
    setScope(defaultScope(current));
    setPattern(current.description);
    setQuery("");
    setShowFullDescription(false);
    setError(null);
  }, [current?.description]);

  const selectCategory = useCallback((option: SelectedCategory) => {
    setCategory(option);
    setClassification(inferClassification(option.major));
    setError(null);
  }, []);

  const cycleScope = useCallback(() => {
    setScope((value) => nextScope(value));
  }, []);

  const confirm = useCallback(() => {
    if (!current || pending) return;
    if (!category) {
      setError("カテゴリを選択してください");
      return;
    }
    const decision: TriageDecision = {
      description: current.description,
      scope,
      pattern: scope === "rule-exact" ? current.description.trim() : pattern,
      classification,
      categoryMajor: category.major,
      categoryMiddle: category.middle,
      txnIds: current.txnIds,
    };
    setDecisions((items) => [...items, decision]);
    setHistory((items) => [...items, { group: current }]);
    setQueue((items) => items.slice(1));
    setProcessedCount((count) => count + 1);
  }, [category, classification, current, pattern, pending, scope]);

  const skip = useCallback(() => {
    if (!current || pending) return;
    setSkipped((items) => [...items, current]);
    setQueue((items) => items.slice(1));
    setProcessedCount((count) => count + 1);
  }, [current, pending]);

  const undo = useCallback(() => {
    const last = history.at(-1);
    if (!last || pending) return;
    setHistory((items) => items.slice(0, -1));
    setQueue((items) => [last.group, ...items]);
    setProcessedCount((count) => Math.max(0, count - 1));
    setDecisions((items) => {
      const index = items.map((item) => item.description).lastIndexOf(last.group.description);
      return items.filter((_, itemIndex) => itemIndex !== index);
    });
  }, [history, pending]);

  const restartSkipped = () => {
    setQueue(skipped);
    setSkipped([]);
  };

  const removeDecision = (description: string) => {
    if (pending) return;
    const decisionIndex = decisions.map((item) => item.description).lastIndexOf(description);
    const group = groups.find((item) => item.description === description);
    setDecisions((items) => items.filter((_, index) => index !== decisionIndex));
    setHistory((items) =>
      items.filter((item) => item.group.description !== description),
    );
    if (group) {
      setQueue((items) => [group, ...items]);
      setProcessedCount((count) => Math.max(0, count - 1));
    }
  };

  const apply = () => {
    if (pending || decisions.length === 0) return;
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await commitTriage(decisions));
      } catch (err) {
        setError(err instanceof Error ? err.message : "まとめて適用に失敗しました");
      }
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        pending ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest("input, textarea, select") ||
          target.closest("[contenteditable='true']"))
      ) {
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        const option = topOptions[Number(event.key) - 1];
        if (option) {
          event.preventDefault();
          selectCategory(option);
        }
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        confirm();
      } else if (event.key.toLocaleLowerCase() === "s") {
        event.preventDefault();
        skip();
      } else if (event.key.toLocaleLowerCase() === "u") {
        event.preventDefault();
        undo();
      } else if (event.key.toLocaleLowerCase() === "r") {
        event.preventDefault();
        cycleScope();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirm, cycleScope, pending, skip, topOptions, undo]);

  return (
    <div>
      <section className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4" aria-label="仕分けの進捗">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{processed} / {groups.length}</p>
          <p className="text-xs text-muted">残り {queue.length} グループ・未分類 {summary.unknownCount} 件</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-label={`進捗 ${processed} / ${groups.length}`}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      </section>
      {error ? <p role="alert" className="mt-3 text-xs font-medium text-negative">{error}</p> : null}

      {current ? (
        <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-sm" aria-label="現在の未分類グループ">
          <fieldset disabled={pending} className="contents">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={showFullDescription ? "whitespace-pre-wrap break-words text-sm font-medium text-foreground" : "line-clamp-2 text-sm font-medium text-foreground"}>
                {current.description}
              </p>
              {current.description.length > 80 ? (
                <button type="button" onClick={() => setShowFullDescription((value) => !value)} className="mt-1 min-h-11 text-xs font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {showFullDescription ? "折りたたむ" : "全文"}
                </button>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{current.count}件</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <Detail label="金額">
              {current.count === 1 ? `¥${yen(current.amountTotal)}` : `¥${yen(current.amountMin)}〜¥${yen(current.amountMax)}（合計 ¥${yen(current.amountTotal)}）`}
            </Detail>
            <Detail label="日付">{current.dateMin === current.dateMax ? current.dateMin : `${current.dateMin}〜${current.dateMax}`}</Detail>
            <Detail label="口座">{current.accounts.length > 0 ? current.accounts.join(" / ") : "—"}</Detail>
          </dl>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted">カテゴリを選択</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topOptions.map((option, index) => {
                const active = category?.major === option.major && category.middle === option.middle;
                return <button key={`${option.major}/${option.middle}`} type="button" onClick={() => selectCategory(option)} className={`min-h-11 rounded-lg border px-3 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary"}`}>
                  {index < 9 ? <span className="mr-1 rounded border border-current/30 px-1 text-[10px]">{index + 1}</span> : null}
                  {option.major} / {option.middle}
                </button>;
              })}
            </div>
            <label htmlFor="triage-category-search" className="mt-4 block text-xs font-medium text-muted">カテゴリを検索</label>
            <input id="triage-category-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="大カテゴリ・中カテゴリで絞り込み" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary" />
            {query ? <div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto">
              {filteredOptions.map((option) => <button key={`${option.major}/${option.middle}`} type="button" onClick={() => selectCategory(option)} className={`min-h-11 rounded-lg border px-3 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${category?.major === option.major && category.middle === option.middle ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary"}`}>{option.major} / {option.middle} <span className="text-muted">{option.usage}</span></button>)}
              {filteredOptions.length === 0 ? <p className="py-2 text-xs text-muted">一致するカテゴリがありません。</p> : null}
            </div> : null}
          </div>

          <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <label htmlFor="triage-classification" className="block text-xs font-medium text-muted">分類</label>
              <select id="triage-classification" value={classification} onChange={(event) => setClassification(event.target.value as Classification)} className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
                {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">適用範囲</p>
              <button type="button" onClick={cycleScope} className="mt-1 flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
                <ScopeBadge scope={scope} /><span className="text-xs text-muted">切替（R）</span>
              </button>
            </div>
          </div>
          {scope === "rule-exact" ? <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted">完全一致パターン: <span className="text-foreground">{current.description.trim()}</span></p> : null}
          {scope === "rule-contains" ? <div className="mt-3"><label htmlFor="triage-pattern" className="block text-xs font-medium text-muted">部分一致パターン</label><input id="triage-pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary" /></div> : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={confirm} className="h-11 flex-1 rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">決定して次へ <span className="text-white/75">Enter</span></button>
            <button type="button" onClick={skip} className="h-11 rounded-lg border border-border px-4 text-sm font-medium text-muted transition-colors duration-150 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">スキップ <span className="text-xs">S</span></button>
          </div>
          </fieldset>
        </section>
      ) : skipped.length > 0 ? (
        <section className="mt-4 rounded-xl border border-dashed border-border bg-surface p-4 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">スキップした {skipped.length} グループがあります。</p>
          <button type="button" onClick={restartSkipped} className="mt-3 h-11 rounded-lg border border-primary px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">スキップ分を仕分ける</button>
        </section>
      ) : <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted shadow-sm">すべてのグループを確認しました。</p>}

      <section className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">決定済み {decisions.length} 件</summary>
          <ul className="mt-3 space-y-2">
            {decisions.map((decision) => <li key={decision.description} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground" title={decision.description}>{decision.description}</p><p className="mt-1 text-xs text-muted">{decision.categoryMajor} / {decision.categoryMiddle} ・ <ScopeBadge scope={decision.scope} /></p></div><button type="button" onClick={() => removeDecision(decision.description)} disabled={pending} className="h-11 min-w-11 rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative transition-colors duration-150 hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:opacity-40">取消</button></li>)}
            {decisions.length === 0 ? <li className="text-sm text-muted">まだ決定はありません。</li> : null}
          </ul>
        </details>
        <button type="button" onClick={apply} disabled={pending || decisions.length === 0} className="mt-4 h-11 w-full rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">{pending ? "適用中…" : "まとめて適用"}</button>
        {result ? <p className="mt-3 rounded-lg bg-positive/10 px-3 py-2 text-xs font-medium text-positive" role="status">ルール追加 {result.rulesAdded} 件・重複スキップ {result.rulesSkipped} 件・取引上書き {result.overridesAdded} 件・残り未分類 {result.remainingUnknown} 件</p> : null}
      </section>

      <p className="mt-4 text-center text-xs text-muted">ショートカット: 1〜9 カテゴリ選択 / Enter 決定して次へ / S スキップ / U 直前を取り消す / R 適用範囲を切替</p>
    </div>
  );
}
