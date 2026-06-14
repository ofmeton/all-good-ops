"use client";

import { useState, useTransition } from "react";
import type { RuleRow, RulesSummary } from "@/lib/rules-queries";
import {
  addRule,
  deleteRule,
  reapplyRules,
  type Classification,
} from "@/lib/rules-actions";

// 分類ルールの管理 UI（一覧・削除・手動追加・全再適用）。
// RecurringEditor と同じ作法: 楽観的更新はせず action 後の revalidate 再描画に委ね、
// 送信中は disabled + opacity でフィードバック。タップ対象は 44px（h-11 / min-w-11）。

const CLASSIFICATION_LABELS: Record<string, string> = {
  income: "収入",
  fixed: "固定費",
  variable: "変動費",
  transfer: "振替",
  internal: "資金移動",
};

function ClassificationBadge({ value }: { value: string | null }) {
  const label = value ? (CLASSIFICATION_LABELS[value] ?? value) : "—";
  const tone =
    value === "income"
      ? "bg-positive/10 text-positive"
      : value === "fixed"
        ? "bg-warning/10 text-warning"
        : value === "variable"
          ? "bg-primary/10 text-primary"
          : "bg-border/60 text-muted"; // transfer / internal / null
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isLlm = source === "llm";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isLlm ? "bg-primary/10 text-primary" : "bg-border/60 text-muted"
      }`}
      title={isLlm ? "LLM が提案したルール" : "手動で追加したルール"}
    >
      {isLlm ? "LLM" : "手動"}
    </span>
  );
}

function RuleItem({ rule }: { rule: RuleRow }) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (
      !window.confirm(
        `ルール「${rule.pattern}」を削除し、全ルールを再適用します。よろしいですか？`,
      )
    )
      return;
    startTransition(async () => {
      await deleteRule(rule.id);
    });
  };

  const category =
    rule.category_major == null
      ? "カテゴリ変更なし"
      : `${rule.category_major} / ${rule.category_middle ?? "—"}`;

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition-opacity duration-150 sm:p-4 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="min-w-0 truncate text-sm font-medium text-foreground"
            title={rule.pattern}
          >
            {rule.pattern}
          </span>
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
            {rule.match_type === "exact" ? "完全一致" : "部分一致"}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ClassificationBadge value={rule.classification} />
          <SourceBadge source={rule.source} />
          <span className="text-[11px] text-muted">{category}</span>
          <span className="tabular text-[11px] text-muted">
            ヒット {rule.hits}件
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label={`ルール ${rule.pattern} を削除`}
        className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-negative/40 px-3 text-sm font-medium text-negative transition-colors duration-150 hover:bg-negative/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-40"
      >
        削除
      </button>
    </li>
  );
}

function AddRuleForm() {
  const [pending, startTransition] = useTransition();
  const [pattern, setPattern] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "contains">("exact");
  const [classification, setClassification] =
    useState<Classification>("variable");
  const [major, setMajor] = useState("");
  const [middle, setMiddle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pattern.trim().length === 0) {
      setError("パターンを入力してください");
      return;
    }
    startTransition(async () => {
      try {
        await addRule({
          pattern,
          match_type: matchType,
          classification,
          category_major: major,
          category_middle: middle,
        });
        setPattern("");
        setMajor("");
        setMiddle("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "追加に失敗しました");
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-xl border border-dashed border-border bg-background/40 p-3 sm:p-4"
      aria-label="ルールを追加"
    >
      <p className="mb-2 text-xs font-medium text-muted">ルールを手動追加</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="rule-pattern" className="text-[11px] text-muted">
            パターン（説明文） <span className="text-negative">必須</span>
          </label>
          <input
            id="rule-pattern"
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            disabled={pending}
            required
            className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rule-match-type" className="text-[11px] text-muted">
            一致方式
          </label>
          <select
            id="rule-match-type"
            value={matchType}
            onChange={(e) =>
              setMatchType(e.target.value === "contains" ? "contains" : "exact")
            }
            disabled={pending}
            className="h-11 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          >
            <option value="exact">完全一致</option>
            <option value="contains">部分一致</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="rule-classification"
            className="text-[11px] text-muted"
          >
            分類 <span className="text-negative">必須</span>
          </label>
          <select
            id="rule-classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value as Classification)}
            disabled={pending}
            className="h-11 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          >
            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rule-major" className="text-[11px] text-muted">
            大カテゴリ（任意）
          </label>
          <input
            id="rule-major"
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            disabled={pending}
            placeholder="例: 食費"
            className="h-11 w-32 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rule-middle" className="text-[11px] text-muted">
            中カテゴリ（任意）
          </label>
          <input
            id="rule-middle"
            type="text"
            value={middle}
            onChange={(e) => setMiddle(e.target.value)}
            disabled={pending}
            placeholder="例: 食料品"
            className="h-11 w-32 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "追加中…" : "追加して再適用"}
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

function ReapplyButton() {
  const [pending, startTransition] = useTransition();
  const onClick = () => {
    startTransition(async () => {
      await reapplyRules();
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "再適用中…" : "全ルール再適用"}
    </button>
  );
}

export function RulesManager({
  rules,
  summary,
}: {
  rules: RuleRow[];
  summary: RulesSummary;
}) {
  return (
    <div>
      <section
        aria-label="ルール適用状況"
        className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4"
      >
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-muted">ルール</dt>
            <dd className="tabular font-semibold text-foreground">
              {summary.ruleCount}件
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-muted">ルール適用済み</dt>
            <dd className="tabular font-semibold text-positive">
              {summary.labeledCount}件
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-muted">未分類の残り</dt>
            <dd
              className={`tabular font-semibold ${
                summary.unknownCount > 0 ? "text-warning" : "text-positive"
              }`}
            >
              {summary.unknownCount}件
            </dd>
          </div>
        </dl>
        <ReapplyButton />
      </section>

      <AddRuleForm />

      <section className="mt-6" aria-label="ルール一覧">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          ルール一覧
          <span className="ml-2 tabular text-xs font-normal text-muted">
            適用順（先勝ち）
          </span>
        </h2>
        {rules.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            ルールがありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {rules.map((rule) => (
              <RuleItem key={rule.id} rule={rule} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
