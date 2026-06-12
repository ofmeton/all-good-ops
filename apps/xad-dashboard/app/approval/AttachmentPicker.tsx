"use client";
import {
  buildMediaDeepLink,
  type ApprovalSource,
  type Attachment,
} from "@/lib/drafts-logic";

function isVideoType(t: string): boolean {
  return t === "video" || t === "animated_gif";
}

/** 元ネタメディアを「自分の投稿の添付」として載せる選択 UI。
 *  - 写真 : 「添付する」トグル → upload intent(attachments) を構築（承認時に送信）。
 *  - 動画/GIF : deep-link バッジ + 「本文に追記」→ textarea 末尾へ `/video/1` を挿入。
 *  著作権ガード: 他者メディアの転載は出典明記前提・拡散歓迎の公式/本人投稿を推奨。 */
export function AttachmentPicker({
  sources,
  selected,
  onTogglePhoto,
  onAppendToBody,
  disabled,
}: {
  sources: ApprovalSource[];
  selected: Attachment[];
  onTogglePhoto: (att: Attachment) => void;
  onAppendToBody: (text: string) => void;
  disabled?: boolean;
}) {
  // メディアを持つ元ネタだけ対象
  const withMedia = (sources ?? []).filter((s) => s.media && s.media.length > 0);
  if (withMedia.length === 0) return null;

  const isSelected = (url: string) => selected.some((a) => a.sourceUrl === url);

  return (
    <div className="px-4 sm:px-5 pt-3">
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium text-amber-200">元ネタのメディアを添付</span>
          <span className="text-[11px] text-amber-300">
            写真=DLして添付 / 動画=本文にリンク追記
          </span>
        </div>

        <div className="mt-2 space-y-3">
          {withMedia.map((s) => {
            const link = s.tweet_url
              ? buildMediaDeepLink(s.tweet_url, "video", 1)
              : null;
            return (
              <div key={s.id} className="space-y-2">
                {s.source_ref && (
                  <p className="text-[11px] text-slate-400">@{s.source_ref}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(s.media ?? []).map((m, i) => {
                    if (isVideoType(m.type)) {
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={disabled || !link}
                          onClick={() => link && onAppendToBody(link)}
                          title={
                            link
                              ? "deep-link を本文末尾に追記します（X が動画を展開）"
                              : "原ツイートURLが無いため追記できません"
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/40 bg-surface px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <span aria-hidden>🎬</span>
                          {m.type === "animated_gif" ? "GIF を本文に追記" : "動画を本文に追記"}
                        </button>
                      );
                    }
                    // photo
                    const att: Attachment = {
                      kind: "upload",
                      mediaType: "photo",
                      sourceUrl: m.url,
                      sourceMaterialId: s.id,
                    };
                    const on = isSelected(m.url);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => onTogglePhoto(att)}
                        aria-pressed={on}
                        title={on ? "添付を外す" : "この写真を添付する"}
                        className={`relative h-20 w-20 rounded-lg border-2 overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          on
                            ? "border-emerald-500 ring-2 ring-emerald-400/30"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt=""
                          className={`h-full w-full object-cover ${on ? "" : "opacity-90"}`}
                        />
                        <span
                          className={`absolute bottom-0 inset-x-0 text-center text-[10px] font-bold py-0.5 ${
                            on ? "bg-emerald-500 text-white" : "bg-black/45 text-white"
                          }`}
                        >
                          {on ? "✓ 添付中" : "添付する"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-amber-300">
          ⚠️ 他者のメディアを転載するときは出典を明記し、拡散歓迎の公式/本人投稿に限ってください。権利侵害・規約違反の恐れがある素材は添付しないでください。
        </p>
      </div>
    </div>
  );
}
