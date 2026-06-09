"use client";
import { useState } from "react";
import {
  validateBody,
  type ApprovalDraft,
  type ApprovalSource,
  type Attachment,
} from "@/lib/drafts-logic";
import { MediaThumbs } from "@/components/MediaModal";
import { AttachmentPicker } from "./AttachmentPicker";

function SourceSection({ sources }: { sources: ApprovalSource[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <details className="px-4 sm:px-5 pt-3 group" open>
      <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
        元ネタツイート（{sources.length}件）
      </summary>
      <div className="mt-2 space-y-2">
        {sources.map((s) => {
          const e = s.engagement;
          return (
            <div
              key={s.id}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-sm"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
                {s.source_ref && <span className="font-bold text-slate-600">@{s.source_ref}</span>}
                {s.lang && (
                  <span className="uppercase tracking-wide text-slate-400">{s.lang}</span>
                )}
                {e && (
                  <span className="tabular-nums">
                    ♥{e.like ?? 0} ↺{e.retweet ?? 0} 👁{e.view ?? 0}
                  </span>
                )}
                {s.tweet_url && (
                  <a
                    href={s.tweet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    原ツイート
                  </a>
                )}
              </div>
              {s.raw_text && (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{s.raw_text}</p>
              )}
              {s.translation && (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-600 mt-1.5 pl-2 border-l-2 border-slate-200">
                  <span className="text-[11px] text-slate-400 mr-1">日本語訳</span>
                  {s.translation}
                </p>
              )}
              <MediaThumbs media={s.media} />
            </div>
          );
        })}
      </div>
    </details>
  );
}

const FMAT_JP: Record<string, string> = {
  short: "短文",
  medium: "中尺",
  long: "長文",
  thread: "スレッド",
  article: "記事",
  carousel: "カルーセル",
};

export function DraftCard({
  draft,
  busy,
  onApprove,
  onReject,
  onSave,
}: {
  draft: ApprovalDraft;
  busy: boolean;
  onApprove: (attachments: Attachment[], reason?: string) => void;
  onReject: (reason?: string) => void;
  onSave: (body: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState(draft.body);
  // 写真添付の upload intent（承認押下時に atomic 送信）。既存値があれば引き継ぐ。
  const [attachments, setAttachments] = useState<Attachment[]>(draft.attachments ?? []);
  // 承認/却下理由（任意）。Stage 2B。
  const [reason, setReason] = useState("");
  const dirty = body !== draft.body;
  const v = validateBody(body);
  const high = draft.risk_level === "high";

  // 写真トグル: 同 sourceUrl があれば外す、無ければ加える。
  const togglePhoto = (att: Attachment) =>
    setAttachments((prev) =>
      prev.some((a) => a.sourceUrl === att.sourceUrl)
        ? prev.filter((a) => a.sourceUrl !== att.sourceUrl)
        : [...prev, att],
    );

  // 動画 deep-link を本文末尾へ追記（重複追記は防ぐ）。以後 plain text として編集可。
  const appendToBody = (text: string) =>
    setBody((prev) => {
      if (prev.includes(text)) return prev;
      const sep = prev.endsWith("\n") || prev.length === 0 ? "" : "\n";
      return `${prev}${sep}${text}`;
    });

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
        high ? "border-l-4 border-l-rose-400 border-slate-200" : "border-slate-200"
      }`}
    >
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            high ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {high ? "⚠ HIGH RISK" : "✓ low risk"}
        </span>
        {draft.fmat && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {FMAT_JP[draft.fmat] ?? draft.fmat}
          </span>
        )}
        <span className="text-xs text-slate-400 tabular-nums">{body.length}字</span>
        {draft.risk_reasons && draft.risk_reasons.length > 0 && (
          <span className="text-xs text-rose-600">
            {draft.risk_reasons.join(" / ")}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {new Date(draft.created_at).toLocaleString("ja-JP")}
        </span>
      </div>

      {draft.idea_title && (
        <p className="px-4 sm:px-5 mt-2 text-xs text-slate-500">
          核アイデア: <span className="text-slate-700">{draft.idea_title}</span>
        </p>
      )}

      {/* 元ネタツイート（原文＋日本語訳＋engagement＋メディア） */}
      <SourceSection sources={draft.sources} />

      {/* メディア添付（写真=DL添付 / 動画=本文 deep-link 追記） */}
      <AttachmentPicker
        sources={draft.sources}
        selected={attachments}
        onTogglePhoto={togglePhoto}
        onAppendToBody={appendToBody}
        disabled={busy}
      />

      {/* body editor */}
      <div className="px-4 sm:px-5 pt-3">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          本文（直接編集できます）
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={Math.min(Math.max(body.split("\n").length + 1, 5), 18)}
          className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-sans"
        />
        {!v.ok && <p className="text-xs text-rose-600 mt-1">{v.error}</p>}
      </div>

      {/* actions */}
      <div className="px-4 sm:px-5 py-3 mt-1 bg-slate-50 border-t border-slate-100 space-y-2">
        {/* 理由・メモ（任意）— LLM 改善用フィードバック */}
        <div>
          <label className="block text-xs text-slate-400 mb-0.5">理由・メモ（任意）</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            disabled={busy}
            placeholder="承認・却下の理由（LLM 品質改善用）"
            className="w-full resize-none rounded border border-slate-200 p-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400/30 focus:border-blue-300 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onApprove(attachments, reason.trim() || undefined)}
            disabled={busy || dirty || !v.ok}
            title={dirty ? "先に本文を保存してください" : undefined}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            承認{attachments.length > 0 ? `（📎${attachments.length}）` : ""}
          </button>
          <button
            onClick={() => onReject(reason.trim() || undefined)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            却下
          </button>
          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <button
                onClick={() => setBody(draft.body)}
                disabled={busy}
                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
              >
                変更を破棄
              </button>
            )}
            <button
              onClick={() => onSave(v.ok ? v.value : body)}
              disabled={busy || !dirty || !v.ok}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              本文を保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
