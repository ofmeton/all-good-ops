"use client";
import { useState } from "react";
import {
  validateBody,
  type ApprovalDraft,
  type ApprovalSource,
  type Attachment,
} from "@/lib/drafts-logic";
import {
  joinThread,
  splitThread,
  validateThreadParts,
  THREAD_DELIM,
} from "@/lib/thread-logic";
import { MediaThumbs } from "@/components/MediaModal";
import { AttachmentPicker } from "./AttachmentPicker";

function SourceSection({ sources }: { sources: ApprovalSource[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <details className="px-4 sm:px-5 pt-3 group" open>
      <summary className="cursor-pointer select-none text-xs font-medium text-slate-400 hover:text-slate-200">
        元ネタツイート（{sources.length}件）
      </summary>
      <div className="mt-2 space-y-2">
        {sources.map((s) => {
          const e = s.engagement;
          return (
            <div
              key={s.id}
              className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm"
            >
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
                {s.source_ref && <span className="font-bold text-slate-300">@{s.source_ref}</span>}
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
                    className="text-blue-300 underline hover:text-blue-200"
                  >
                    原ツイート
                  </a>
                )}
              </div>
              {s.raw_text && (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{s.raw_text}</p>
              )}
              {s.translation && (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300 mt-1.5 pl-2 border-l-2 border-white/10">
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
  onRequestRevision,
}: {
  draft: ApprovalDraft;
  busy: boolean;
  onApprove: (attachments: Attachment[], reason?: string) => void;
  onReject: (reason?: string) => void;
  /** 本文を保存。thread draft のときは isThread=true で thread_bodies も更新させる。 */
  onSave: (body: string, isThread: boolean) => Promise<boolean>;
  /** 修正依頼ダイアログを開く（要件4+5）。state は ApprovalClient が持つ。 */
  onRequestRevision: () => void;
}) {
  // thread draft（要件7）: textarea には THREAD_DELIM 区切りの全文を表示・編集する。
  // thread_bodies が投稿時の正のため、初期値はそれを join した正準形にそろえる。
  const isThread = Array.isArray(draft.thread_bodies) && draft.thread_bodies.length > 0;
  const initialBody = isThread ? joinThread(draft.thread_bodies as string[]) : draft.body;
  const [body, setBody] = useState(initialBody);
  // 写真添付の upload intent（承認押下時に atomic 送信）。既存値があれば引き継ぐ。
  const [attachments, setAttachments] = useState<Attachment[]>(draft.attachments ?? []);
  // 承認/却下理由（任意）。Stage 2B。
  const [reason, setReason] = useState("");
  const dirty = body !== initialBody;
  const v = validateBody(body);
  // thread draft は分割後の本数・空 part も検証（保存・承認のブロック条件）。
  const threadParts = isThread ? splitThread(body) : [];
  const threadCheck = isThread
    ? validateThreadParts(threadParts)
    : { ok: true, errors: [] as string[] };
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
      className={`rounded-xl border bg-surface shadow-sm overflow-hidden ${
        high ? "border-l-4 border-l-rose-400 border-white/10" : "border-white/10"
      }`}
    >
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            high ? "bg-rose-400/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300"
          }`}
        >
          {high ? "⚠ HIGH RISK" : "✓ low risk"}
        </span>
        {draft.fmat && (
          <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            {FMAT_JP[draft.fmat] ?? draft.fmat}
          </span>
        )}
        {isThread && (
          <span className="text-xs font-medium text-indigo-300 bg-indigo-400/15 px-2 py-0.5 rounded-full">
            🧵 スレッド{threadParts.length}本
          </span>
        )}
        <span className="text-xs text-slate-400 tabular-nums">{body.length}字</span>
        {draft.risk_reasons && draft.risk_reasons.length > 0 && (
          <span className="text-xs text-rose-300">
            {draft.risk_reasons.join(" / ")}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {new Date(draft.created_at).toLocaleString("ja-JP")}
        </span>
      </div>

      {draft.idea_title && (
        <p className="px-4 sm:px-5 mt-2 text-xs text-slate-400">
          核アイデア: <span className="text-slate-300">{draft.idea_title}</span>
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
        <label className="block text-xs font-medium text-slate-400 mb-1">
          {isThread
            ? `本文（直接編集できます・「${THREAD_DELIM.trim()}」でツイートを区切ります）`
            : "本文（直接編集できます）"}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={Math.min(Math.max(body.split("\n").length + 1, 5), 18)}
          className="w-full resize-y rounded-lg border border-white/10 p-3 text-sm leading-relaxed text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-sans"
        />
        {!v.ok && <p className="text-xs text-rose-300 mt-1">{v.error}</p>}
        {v.ok && !threadCheck.ok && (
          <p className="text-xs text-rose-300 mt-1">{threadCheck.errors.join(" / ")}</p>
        )}
      </div>

      {/* actions */}
      <div className="px-4 sm:px-5 py-3 mt-1 bg-white/[0.03] border-t border-white/5 space-y-2">
        {/* 理由・メモ（任意）— LLM 改善用フィードバック */}
        <div>
          <label htmlFor={`reason-${draft.id}`} className="block text-xs text-slate-400 mb-0.5">
            理由・メモ（任意）
          </label>
          <textarea
            id={`reason-${draft.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            disabled={busy}
            placeholder="承認・却下の理由（LLM 品質改善用）"
            className="w-full resize-y rounded border border-white/10 p-2 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400/30 focus:border-blue-400/40 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onApprove(attachments, reason.trim() || undefined)}
            disabled={busy || dirty || !v.ok || !threadCheck.ok}
            title={dirty ? "先に本文を保存してください" : undefined}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            承認{attachments.length > 0 ? `（📎${attachments.length}）` : ""}
          </button>
          <button
            onClick={onRequestRevision}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface text-amber-300 border border-amber-400/30 hover:bg-amber-400/10 hover:border-amber-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            修正依頼
          </button>
          <button
            onClick={() => onReject(reason.trim() || undefined)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface text-rose-300 border border-rose-400/30 hover:bg-rose-400/10 hover:border-rose-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            却下
          </button>
          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <button
                onClick={() => setBody(initialBody)}
                disabled={busy}
                className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40"
              >
                変更を破棄
              </button>
            )}
            <button
              onClick={() => onSave(v.ok ? v.value : body, isThread)}
              disabled={busy || !dirty || !v.ok || !threadCheck.ok}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface text-slate-300 border border-white/15 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              本文を保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
