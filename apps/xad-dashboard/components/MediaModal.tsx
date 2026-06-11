"use client";
import { useEffect, useRef, useState } from "react";
import { mediaDownloadHref } from "@/lib/media-download";

export interface MediaItem {
  type: string;
  url: string;
}

function isVideoType(t: string): boolean {
  return t === "video" || t === "animated_gif";
}

/** 原寸 lightbox。video は再生対応。Esc / backdrop / ×ボタンで閉じる。
 *  a11y: 開いたら閉じるボタンへ初期フォーカス、Tab は dialog 内に閉じ込め、閉じたら元の要素へ復帰。 */
export function MediaModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restoreTo = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // 簡易フォーカストラップ: Tab で dialog 外へ出たら閉じるボタンへ戻す。
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (root && !root.contains(document.activeElement)) {
          e.preventDefault();
          closeRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      restoreTo?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="メディアの拡大表示"
    >
      <div className="absolute top-3 right-4 flex items-center gap-3">
        <a
          href={mediaDownloadHref(item.url)}
          download
          onClick={(e) => e.stopPropagation()}
          aria-label="ダウンロード"
          className="rounded-md px-2 py-1 text-sm text-white/80 hover:text-white border border-white/30 hover:border-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          ⬇ ダウンロード
        </a>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="閉じる"
          className="rounded-md px-1 text-3xl leading-none text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          ×
        </button>
      </div>
      <div className="max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {isVideoType(item.type) ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-[90vh] max-w-full rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}

/** サムネ列（button 化）＋クリックで MediaModal を開く自己完結コンポーネント。 */
export function MediaThumbs({
  media,
  thumbClass = "h-20 w-20",
}: {
  media: MediaItem[] | null | undefined;
  thumbClass?: string;
}) {
  const [active, setActive] = useState<MediaItem | null>(null);
  if (!media || media.length === 0) return null;
  return (
    <>
      <div className="flex gap-2 mt-2 flex-wrap">
        {media.map((md, i) => (
          // button(拡大) と a(DL) を兄弟にする（<a> を <button> 内に入れると不正HTML）。
          <div key={i} className={`relative ${thumbClass} group`}>
            <button
              type="button"
              onClick={() => setActive(md)}
              aria-label="メディアを拡大"
              className="block h-full w-full rounded border border-slate-200 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={md.url}
                alt=""
                className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
              />
              {isVideoType(md.type) && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black/25">
                  ▶
                </span>
              )}
            </button>
            <a
              href={mediaDownloadHref(md.url)}
              download
              onClick={(e) => e.stopPropagation()}
              aria-label="ダウンロード"
              title="ダウンロード"
              className="absolute bottom-1 right-1 rounded bg-black/55 px-1 text-xs leading-tight text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              ⬇
            </a>
          </div>
        ))}
      </div>
      {active && <MediaModal item={active} onClose={() => setActive(null)} />}
    </>
  );
}
