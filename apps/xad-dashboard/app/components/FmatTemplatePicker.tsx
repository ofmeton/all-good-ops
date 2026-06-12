"use client";
import { FMAT_OPTIONS, type TemplateOption } from "@/lib/curation-formats";

/**
 * FmatTemplatePicker — fmat select + template select の制御コンポーネント。
 *
 * CurationClient の執筆送信ダイアログ（要件1）と承認の修正依頼ダイアログ（要件5）で共用する。
 * 値は呼び出し側が保持する制御コンポーネント（fmat/templateId + onChange）。
 *
 * allowUnset=true（要件5「未指定=現状維持」）のとき:
 *   - 各 select 先頭に「未指定（現状維持）」option（value=""）を追加する。
 *   - 値が "" のときは「現状維持」を意味し、呼び出し側は API へ desiredFmat/templateId を
 *     渡さない（= 既存値を保持）こと。
 *
 * select の見た目は元ダイアログの className/style をそのまま踏襲（drift 禁止）。
 */

/** 「未指定（現状維持）」を表す sentinel 値。allowUnset 時に option value として使う。 */
export const UNSET_VALUE = "";

const SELECT_CLASS =
  "w-full h-9 pl-2.5 pr-8 text-sm border border-white/10 rounded-lg bg-surface text-slate-300 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none cursor-pointer";

const SELECT_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

export function FmatTemplatePicker({
  fmat,
  templateId,
  onFmatChange,
  onTemplateChange,
  templateOptions,
  allowUnset = false,
  idPrefix = "compose",
  fmatHint = "記事は X 長文単発（スレッドのように分割しません）。",
}: {
  fmat: string;
  templateId: string;
  onFmatChange: (v: string) => void;
  onTemplateChange: (v: string) => void;
  templateOptions: TemplateOption[];
  /** true で先頭に「未指定（現状維持）」option を追加（要件5）。 */
  allowUnset?: boolean;
  /** select の id 衝突回避用 prefix（同一画面に複数置く場合）。 */
  idPrefix?: string;
  /** フォーマット欄下の補足文（null で非表示）。 */
  fmatHint?: string | null;
}) {
  return (
    <>
      {/* Format */}
      <div className="space-y-1">
        <label
          htmlFor={`${idPrefix}-fmat`}
          className="block text-xs font-medium text-slate-300"
        >
          フォーマット
        </label>
        <select
          id={`${idPrefix}-fmat`}
          value={fmat}
          onChange={(e) => onFmatChange(e.target.value)}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
        >
          {allowUnset && <option value={UNSET_VALUE}>未指定（現状維持）</option>}
          {FMAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {fmatHint && (
          <p className="text-[11px] leading-snug text-slate-400">{fmatHint}</p>
        )}
      </div>

      {/* Template */}
      <div className="space-y-1">
        <label
          htmlFor={`${idPrefix}-template`}
          className="block text-xs font-medium text-slate-300"
        >
          テンプレート
        </label>
        <select
          id={`${idPrefix}-template`}
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
        >
          {allowUnset && <option value={UNSET_VALUE}>未指定（現状維持）</option>}
          {templateOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
