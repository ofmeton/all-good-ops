"use client";
import { useEffect, useState } from "react";

export interface MediaItem {
  type: string;
  url: string;
}

function isVideoType(t: string): boolean {
  return t === "video" || t === "animated_gif";
}

/** 原寸 lightbox。video は再生対応。Esc / backdrop / ×ボタンで閉じる。 */
export function MediaModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="閉じる"
        className="absolute top-3 right-4 text-white/80 hover:text-white text-3xl leading-none"
      >
        ×
      </button>
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
          <button
            key={i}
            type="button"
            onClick={() => setActive(md)}
            aria-label="メディアを拡大"
            className={`relative ${thumbClass} rounded border border-slate-200 overflow-hidden group`}
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
        ))}
      </div>
      {active && <MediaModal item={active} onClose={() => setActive(null)} />}
    </>
  );
}
