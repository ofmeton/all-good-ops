"use client";

import { useState, useTransition } from "react";
import type { OptimizerProposal, ProposedAction } from "@/lib/optimizer/types";
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
  actionSummary,
  targetSummary,
} from "@/app/optimizer/labels";

// 提案1件のカード。承認 / 却下(理由任意) / 修正して承認(主要フィールドのinline編集) / スキップ。
// 楽観更新はせず action 後の revalidate に委ねる。送信中 disabled、{ok:false} はエラー表示。

// 「修正して承認」で編集可能なフィールド記述子（action type ごと）。
interface EditField {
  key: string;
  label: string;
  value: string;
  kind?: "text" | "number" | "match_type";
}

// action から編集可能フィールドを抽出。空配列 = inline 編集不可（修正ボタン非表示）。
function editableFields(action: ProposedAction | null): EditField[] {
  if (!action) return [];
  switch (action.type) {
    case "add_rule":
      return [
        { key: "pattern", label: "パターン", value: action.pattern },
        { key: "match_type", label: "一致", value: action.match_type, kind: "match_type" },
        { key: "classification", label: "分類", value: action.classification },
        { key: "category_major", label: "大項目", value: action.category_major ?? "" },
        { key: "category_middle", label: "中項目", value: action.category_middle ?? "" },
      ];
    case "edit_rule":
      return [
        { key: "classification", label: "分類", value: String(action.patch.classification ?? "") },
        { key: "category_major", label: "大項目", value: String(action.patch.category_major ?? "") },
        { key: "category_middle", label: "中項目", value: String(action.patch.category_middle ?? "") },
      ];
    case "set_override":
      return [
        { key: "classification", label: "分類", value: action.fields.classification ?? "" },
        { key: "category_major", label: "大項目", value: action.fields.category_major ?? "" },
        { key: "category_middle", label: "中項目", value: action.fields.category_middle ?? "" },
      ];
    case "regroup":
      return [
        { key: "group_name", label: "グループ名", value: action.mappings[0]?.group_name ?? "" },
      ];
    case "add_recurring":
      return [
        { key: "name", label: "名称", value: action.name },
        { key: "amount", label: "金額", value: String(action.amount), kind: "number" },
        { key: "day", label: "日(任意)", value: action.day != null ? String(action.day) : "", kind: "number" },
      ];
    default:
      return []; // delete_rule / mark_transfer は inline 編集対象なし
  }
}

// 編集値（key→string）を元 action にマージして patchedAction を再構築。
function rebuildAction(
  action: ProposedAction,
  values: Record<string, string>,
): ProposedAction {
  const v = (k: string, fallback: string) =>
    values[k] !== undefined ? values[k] : fallback;
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
        day: v("day", action.day != null ? String(action.day) : "").trim() === ""
          ? null
          : Number(v("day", "")),
      };
    default:
      return action;
  }
}

const BTN_BASE =
  "h-11 shrink-0 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export function ProposalCard({ proposal }: { proposal: OptimizerProposal }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fields = editableFields(proposal.proposed_action);
  const targetText = targetSummary(proposal.kind, proposal.target_ref);

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

      {targetText && (
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
            修正して承認（主要フィールド）
          </p>
          <div className="flex flex-col gap-2">
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <label
                  htmlFor={`edit-${proposal.id}-${f.key}`}
                  className="text-[11px] text-muted"
                >
                  {f.label}
                </label>
                {f.kind === "match_type" ? (
                  <select
                    id={`edit-${proposal.id}-${f.key}`}
                    value={editValues[f.key] ?? f.value}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    disabled={pending}
                    className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
                  >
                    <option value="contains">contains（部分一致）</option>
                    <option value="exact">exact（完全一致）</option>
                  </select>
                ) : (
                  <input
                    id={`edit-${proposal.id}-${f.key}`}
                    type={f.kind === "number" ? "number" : "text"}
                    inputMode={f.kind === "number" ? "numeric" : undefined}
                    value={editValues[f.key] ?? f.value}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    disabled={pending}
                    className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50"
                  />
                )}
              </div>
            ))}
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
          <label
            htmlFor={`reject-${proposal.id}`}
            className="text-[11px] text-muted"
          >
            却下の理由（任意・学習に使われます）
          </label>
          <input
            id={`reject-${proposal.id}`}
            type="text"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            disabled={pending}
            className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-negative disabled:opacity-50"
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
          disabled={pending}
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
