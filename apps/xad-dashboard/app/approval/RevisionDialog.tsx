"use client";
import { useEffect, useState } from "react";
import { FmatTemplatePicker, UNSET_VALUE } from "@/app/components/FmatTemplatePicker";
import { useRecommendations } from "@/app/components/useRecommendations";
import {
  type TemplateOption,
  type RecommendMaterialInput,
} from "@/lib/curation-formats";
import {
  validateInstruction,
  type ApprovalDraft,
  type ApprovalSource,
} from "@/lib/drafts-logic";

/**
 * RevisionDialog — 指示文つき修正依頼（要件4+5）。
 *
 * - 指示文 textarea（必須・validateInstruction で 1〜2000字）。
 * - FmatTemplatePicker（allowUnset・既定「未指定（現状維持）」）で format/template を
 *   選び直せる。未指定なら API へ渡さず現状維持。
 * - useRecommendations の推薦ボタン。推薦入力は draft の sources[] から構築する
 *   （/api/curation/recommend へ。その API は変更しない）。
 *
 * 確定すると親（ApprovalClient）が /api/drafts/revise を叩き、成功時に再生成が起動する。
 * 人間ゲート不変: 再生成後も check → 人間承認へ戻る。
 */

/** draft の元ネタ sources[] を推薦 API の入力へ変換する（本文のある素材のみ）。 */
function sourcesToRecommendInput(sources: ApprovalSource[]): RecommendMaterialInput[] {
  return (sources ?? [])
    .map((s) => ({
      id: s.id,
      text: (s.translation || s.raw_text || "").trim(),
      lang: s.lang,
      hasMedia: !!(s.media && s.media.length > 0),
      engagement: s.engagement,
    }))
    .filter((m) => m.text.length > 0);
}

export function RevisionDialog({
  draft,
  templateOptions,
  busy,
  onSubmit,
  onClose,
}: {
  draft: ApprovalDraft;
  templateOptions: TemplateOption[];
  busy: boolean;
  /** 確定。desiredFmat/templateId は「未指定（現状維持）」のとき undefined。 */
  onSubmit: (args: {
    instruction: string;
    desiredFmat?: string;
    templateId?: string;
  }) => void;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  // 既定は「未指定（現状維持）」= UNSET_VALUE。推薦適用時のみ具体値が入る。
  const [desiredFmat, setDesiredFmat] = useState<string>(UNSET_VALUE);
  const [templateId, setTemplateId] = useState<string>(UNSET_VALUE);
  const rec = useRecommendations();

  // ダイアログを開くたびに前回の推薦結果の残留を防ぐ。
  useEffect(() => {
    rec.reset();
    // draft 単位で開閉。rec は安定参照のため依存に入れない（reset は冪等）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const v = validateInstruction(instruction);
  const canSubmit = v.ok && !busy;

  async function applyRecommendation() {
    const input = sourcesToRecommendInput(draft.sources);
    const picked = await rec.run(input);
    if (picked) {
      // 推薦の最頻 fmat/template を「未指定」から具体値へ昇格（編集可・最終決定は人）。
      setDesiredFmat(picked.fmat);
      setTemplateId(picked.templateId);
    }
  }

  function submit() {
    if (!v.ok) return;
    onSubmit({
      instruction: v.value,
      // UNSET_VALUE（現状維持）は渡さない＝既存値を保持。
      ...(desiredFmat && desiredFmat !== UNSET_VALUE ? { desiredFmat } : {}),
      ...(templateId && templateId !== UNSET_VALUE ? { templateId } : {}),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="修正依頼"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">修正依頼</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            指示文を添えて書き直しを依頼します。送信後に再生成が起動し、点検を経て再び承認待ちに戻ります。
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 指示文（必須） */}
          <div className="space-y-1">
            <label
              htmlFor={`revision-instruction-${draft.id}`}
              className="block text-xs font-medium text-slate-600"
            >
              指示文（必須）
            </label>
            <textarea
              id={`revision-instruction-${draft.id}`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              disabled={busy}
              placeholder="例: もっと具体例を入れて、煽り表現を弱めてください"
              className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-50"
            />
            {!v.ok && instruction.length > 0 && (
              <p className="text-xs text-rose-600">{v.error}</p>
            )}
          </div>

          {/* フォーマット / テンプレート（未指定=現状維持） */}
          <div className="grid grid-cols-2 gap-3">
            <FmatTemplatePicker
              fmat={desiredFmat}
              templateId={templateId}
              onFmatChange={setDesiredFmat}
              onTemplateChange={setTemplateId}
              templateOptions={templateOptions}
              allowUnset
              idPrefix={`revision-${draft.id}`}
            />
          </div>

          {/* AI 推薦（任意・on-demand） */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={applyRecommendation}
              disabled={busy || rec.loading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {rec.loading ? "推薦中…" : "AI に format/template を推薦してもらう"}
            </button>
            {rec.error && <p className="text-xs text-amber-600">{rec.error}</p>}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            修正依頼を送信
          </button>
        </div>
      </div>
    </div>
  );
}
