"use client";

import { useState, useTransition } from "react";
import type { OptimizerProposal, ProposedAction } from "@/lib/optimizer/types";
import type { ProposalSample } from "@/lib/optimizer/proposals-queries";
import {
  applyProposal,
  rejectProposal,
  dismissProposal,
  editAndApply,
  type OptimizerActionResult,
} from "@/lib/optimizer/actions";
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_TONE,
  CLASSIFICATION_OPTIONS,
  actionSummary,
  targetSummary,
} from "@/app/optimizer/labels";
import { yenSigned, shortDate } from "@/lib/format";

// 提案1件のカード。承認 / 却下(理由任意) / 修正して承認(主要フィールドのinline編集) / スキップ。
// 該当明細の金額も表示。分類・大項目・中項目はプルダウン（任意入力可）。

interface EditField {
  key: string;
  label: string;
  value: string;
  // text=自由入力 / number=数値 / match_type=一致方法select / classification=分類select / category=カテゴリselect(任意入力可)
  kind?: "text" | "number" | "match_type" | "classification" | "category";
}

// action から編集可能フィールドを抽出。空配列 = inline 編集不可（修正ボタン非表示）。
function editableFields(action: ProposedAction | null): EditField[] {
  if (!action) return [];
  switch (action.type) {
    case "add_rule":
      return [
        { key: "pattern", label: "パターン（取引の摘要）", value: action.pattern },
        { key: "match_type", label: "一致方法", value: action.match_type, kind: "match_type" },
        { key: "classification", label: "分類", value: action.classification, kind: "classification" },
        { key: "category_major", label: "大項目", value: action.category_major ?? "", kind: "category" },
        { key: "category_middle", label: "中項目", value: action.category_middle ?? "", kind: "category" },
      ];
    case "edit_rule":
      return [
        { key: "classification", label: "分類", value: String(action.patch.classification ?? ""), kind: "classification" },
        { key: "category_major", label: "大項目", value: String(action.patch.category_major ?? ""), kind: "category" },
        { key: "category_middle", label: "中項目", value: String(action.patch.category_middle ?? ""), kind: "category" },
      ];
    case "set_override":
      return [
        { key: "classification", label: "分類", value: action.fields.classification ?? "", kind: "classification" },
        { key: "category_major", label: "大項目", value: action.fields.category_major ?? "", kind: "category" },
        { key: "category_middle", label: "中項目", value: action.fields.category_middle ?? "", kind: "category" },
      ];
    case "regroup":
      return [{ key: "group_name", label: "グループ名", value: action.mappings[0]?.group_name ?? "" }];
    case "add_recurring":
      return [
        { key: "name", label: "名称", value: action.name },
        { key: "amount", label: "金額", value: String(action.amount), kind: "number" },
        { key: "day", label: "引落日(任意)", value: action.day != null ? String(action.day) : "", kind: "number" },
      ];
    default:
      return []; // delete_rule / mark_transfer は inline 編集対象なし
  }
}

// 編集値（key→string）を元 action にマージして patchedAction を再構築。
function rebuildAction(action: ProposedAction, values: Record<string, string>): ProposedAction {
  const v = (k: string, fallback: string) => (values[k] !== undefined ? values[k] : fallback);
  const orNull = (sv: string) => (sv.trim() === "" ? undefined : sv.trim());
  switch (action.type) {
    case "add_rule":
      return {
        ...action,
        pattern: v("pattern", action.pattern),
        match_type: v("match_type", action.match_type) === "exact" ? "exact" : "contains",
        classification: v("classification", action.classification),
        category_major: orNull(v("category_major", action.category_major ?? "")),
        category_middle: orNull(v("category_middle", action.category_middle ?? "")),
      };
    case "edit_rule": {
      const patch: Record<string, unknown> = { ...action.patch };
      for (const k of ["classification", "category_major", "category_middle"]) {
        if (values[k] !== undefined) patch[k] = values[k].trim();
      }
      return { ...action, patch };
    }
    case "set_override":
      return {
        ...action,
        fields: {
          ...action.fields,
          classification: orNull(v("classification", action.fields.classification ?? "")),
          category_major: orNull(v("category_major", action.fields.category_major ?? "")),
          category_middle: orNull(v("category_middle", action.fields.category_middle ?? "")),
        },
      };
    case "regroup":
      return {
        ...action,
        mappings: action.mappings.map((m, i) =>
          i === 0 ? { ...m, group_name: v("group_name", m.group_name) } : m,
        ),
      };
    case "add_recurring":
      return {
        ...action,
        name: v("name", action.name),
        amount: Number(v("amount", String(action.amount))),
        day:
          v("day", action.day != null ? String(action.day) : "").trim() === ""
            ? null
            : Number(v("day", "")),
      };
    default:
      return action;
  }
}

const INPUT_CLS =
  "h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";

// 大項目・中項目のプルダウン（既存カテゴリ＋「任意入力…」で自由入力欄）。
function CategorySelect({
  id,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [custom, setCustom] = useState(value !== "" && !options.includes(value));
  const selectVal = custom ? "__custom__" : options.includes(value) ? value : "";
  return (
    <>
      <select
        id={id}
        value={selectVal}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "__custom__") setCustom(true);
          else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className={INPUT_CLS}
      >
        <option value="">（指定なし）</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="__custom__">任意入力…</option>
      </select>
      {custom && (
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder="カテゴリ名を入力"
          onChange={(e) => onChange(e.target.value)}
          className={`mt-1 ${INPUT_CLS}`}
        />
      )}
    </>
  );
}

const BTN_BASE =
  "h-11 shrink-0 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export function ProposalCard({
  proposal,
  samples,
  sampleTotal,
  categoryOptions,
}: {
  proposal: OptimizerProposal;
  samples: ProposalSample[];
  sampleTotal: number;
  categoryOptions: { majors: string[]; middlesByMajor: Record<string, string[]> };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fields = editableFields(proposal.proposed_action);
  const targetText = targetSummary(proposal.kind, proposal.target_ref);

  const setVal = (key: string, val: string) =>
    setEditValues((v) => ({ ...v, [key]: val }));

  // 中項目は「選択中の大項目」で絞り込む。大項目を変えたら中項目はリセット。
  const majorField = fields.find((f) => f.key === "category_major");
  const currentMajor = editValues["category_major"] ?? majorField?.value ?? "";
  const middleOptions = categoryOptions.middlesByMajor[currentMajor] ?? [];

  const handle = (fn: () => Promise<OptimizerActionResult>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setShowReject(false);
        setShowEdit(false);
      }
    });
  };

  const onApprove = () => handle(() => applyProposal(proposal.id));
  const onSkip = () => handle(() => dismissProposal(proposal.id));
  const onReject = () =>
    handle(() => rejectProposal(proposal.id, rejectNote.trim() || undefined));
  const onEditApply = () => {
    if (!proposal.proposed_action) return;
    const patched = rebuildAction(proposal.proposed_action, editValues);
    handle(() => editAndApply(proposal.id, patched));
  };

  const openEdit = () => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = f.value;
    setEditValues(init);
    setShowEdit((s) => !s);
    setShowReject(false);
  };

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm transition-opacity duration-150 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          {proposal.title}
        </p>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIDENCE_TONE[proposal.confidence]}`}
        >
          {CONFIDENCE_LABEL[proposal.confidence]}
        </span>
      </div>

      {proposal.rationale && (
        <p className="text-xs leading-relaxed text-muted">{proposal.rationale}</p>
      )}

      {/* 該当明細（金額） */}
      {samples.length > 0 && (
        <div className="rounded-lg border border-border bg-background px-2 py-1.5">
          <p className="mb-1 text-[11px] font-medium text-muted">
            該当明細{" "}
            <span className="tabular">{sampleTotal}件</span>
            {sampleTotal > samples.length && (
              <span className="text-muted">（先頭{samples.length}件）</span>
            )}
          </p>
          <ul className="flex flex-col gap-0.5">
            {samples.map((s, i) => (
              <li
                key={`${s.date}-${i}`}
                className="flex items-baseline justify-between gap-2 text-[11px]"
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="tabular shrink-0 text-muted">
                    {shortDate(s.date)}
                  </span>
                  <span className="truncate text-foreground">{s.description}</span>
                </span>
                <span
                  className={`tabular shrink-0 font-medium ${
                    s.amount < 0 ? "text-foreground" : "text-positive"
                  }`}
                >
                  ¥{yenSigned(s.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {targetText && !samples.length && (
        <p className="tabular rounded-lg bg-background px-2 py-1 text-[11px] text-muted">
          {targetText}
        </p>
      )}

      <p className="rounded-lg border border-dashed border-border px-2 py-1 text-[11px] text-foreground">
        {actionSummary(proposal.proposed_action)}
      </p>

      {showEdit && fields.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-[11px] font-medium text-primary">
            修正して承認
          </p>
          <div className="flex flex-col gap-2">
            {fields.map((f) => {
              const id = `edit-${proposal.id}-${f.key}`;
              const cur = editValues[f.key] ?? f.value;
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <label htmlFor={id} className="text-[11px] text-muted">
                    {f.label}
                  </label>
                  {f.kind === "match_type" ? (
                    <select
                      id={id}
                      value={cur}
                      disabled={pending}
                      onChange={(e) => setVal(f.key, e.target.value)}
                      className={INPUT_CLS}
                    >
                      <option value="exact">完全一致（この摘要だけ）</option>
                      <option value="contains">部分一致（含む取引すべて）</option>
                    </select>
                  ) : f.kind === "classification" ? (
                    <select
                      id={id}
                      value={cur}
                      disabled={pending}
                      onChange={(e) => setVal(f.key, e.target.value)}
                      className={INPUT_CLS}
                    >
                      {CLASSIFICATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.kind === "category" ? (
                    <CategorySelect
                      key={f.key === "category_middle" ? `mid-${currentMajor}` : id}
                      id={id}
                      value={cur}
                      options={
                        f.key === "category_major" ? categoryOptions.majors : middleOptions
                      }
                      disabled={pending}
                      onChange={(val) =>
                        f.key === "category_major"
                          ? setEditValues((v) => ({
                              ...v,
                              category_major: val,
                              category_middle: "", // 大項目変更で中項目リセット
                            }))
                          : setVal(f.key, val)
                      }
                    />
                  ) : (
                    <input
                      id={id}
                      type={f.kind === "number" ? "number" : "text"}
                      inputMode={f.kind === "number" ? "numeric" : undefined}
                      value={cur}
                      disabled={pending}
                      onChange={(e) => setVal(f.key, e.target.value)}
                      className={INPUT_CLS}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onEditApply}
            disabled={pending}
            className={`mt-3 ${BTN_BASE} border-primary bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary`}
          >
            修正内容で承認
          </button>
        </div>
      )}

      {showReject && (
        <div className="flex flex-col gap-2 rounded-lg border border-negative/30 bg-negative/5 p-3">
          <label htmlFor={`reject-${proposal.id}`} className="text-[11px] text-muted">
            却下の理由（任意・今後の提案精度に使われます）
          </label>
          <input
            id={`reject-${proposal.id}`}
            type="text"
            value={rejectNote}
            disabled={pending}
            onChange={(e) => setRejectNote(e.target.value)}
            className={INPUT_CLS.replace("focus-visible:outline-primary", "focus-visible:outline-negative")}
          />
          <button
            type="button"
            onClick={onReject}
            disabled={pending}
            className={`${BTN_BASE} border-negative bg-negative text-white hover:bg-negative/90 focus-visible:outline-negative`}
          >
            却下する
          </button>
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={pending || !proposal.proposed_action}
          title={!proposal.proposed_action ? "アクションが無いため承認できません（却下/スキップを）" : undefined}
          className={`${BTN_BASE} border-primary bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary`}
        >
          承認
        </button>
        <button
          type="button"
          onClick={() => {
            setShowReject((s) => !s);
            setShowEdit(false);
          }}
          disabled={pending}
          className={`${BTN_BASE} border-negative/40 text-negative hover:bg-negative/10 focus-visible:outline-negative`}
        >
          却下
        </button>
        {fields.length > 0 && (
          <button
            type="button"
            onClick={openEdit}
            disabled={pending}
            className={`${BTN_BASE} border-border text-foreground hover:bg-background focus-visible:outline-primary`}
          >
            修正して承認
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className={`${BTN_BASE} border-border text-muted hover:bg-background focus-visible:outline-primary`}
        >
          スキップ
        </button>
      </div>

      {error && (
        <p className="text-xs font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
