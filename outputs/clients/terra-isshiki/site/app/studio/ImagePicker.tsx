"use client";

/*
 * studio 専用の写真選択モーダル。
 * /studio の編集 UI から「この写真を差し替える」操作で開かれ、
 * public/images 配下の全画像をディレクトリ別にグルーピングして一覧表示する。
 * クリックで onSelect(path) を呼ぶだけで、モーダルを閉じる判断は呼び出し側に委ねる。
 */

import { useEffect } from "react";

export function ImagePicker({
  open,
  current,
  images,
  onSelect,
  onClose,
}: {
  open: boolean;
  current: string;
  images: string[];
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  // 開いている間は背面スクロールをロックする
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Esc キーで閉じる
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const groups = groupImagesByDirectory(images);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-base-dark)/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85svh] w-full max-w-[1080px] flex-col overflow-hidden bg-(--color-base-light) text-(--color-base-dark) shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ヘッダ */}
        <div className="flex shrink-0 items-center justify-between border-b border-(--color-sand) px-6 py-4">
          <h2 className="font-(family-name:--font-serif) text-lg font-semibold tracking-wide">
            写真を選ぶ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-(--color-mist) transition hover:bg-(--color-paper) hover:text-(--color-base-dark)"
          >
            ×
          </button>
        </div>

        {/* 本体スクロール領域 */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* いま使っている写真 */}
          <section className="mb-8">
            <h3 className="sec-title mb-3 text-sm font-semibold text-(--color-mist)">
              いま使っている写真
            </h3>
            <div className="flex flex-col gap-1.5" style={{ width: "min(320px, 60%)" }}>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-sm border-2 border-(--color-soil) object-cover"
                  alt={current}
                />
              </div>
              <p className="break-all font-mono text-[10px] text-(--color-mist)">{current}</p>
            </div>
          </section>

          {/* ディレクトリ別グルーピング一覧 */}
          {groups.map((group) => (
            <section key={group.name} className="mb-8">
              <h3 className="sec-title mb-3 text-sm font-semibold text-(--color-mist)">
                {group.name}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {group.images.map((imgPath) => {
                  const isCurrent = imgPath === current;
                  return (
                    <button
                      key={imgPath}
                      type="button"
                      onClick={() => onSelect(imgPath)}
                      className="flex flex-col gap-1.5 text-left"
                    >
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgPath}
                          loading="lazy"
                          className={
                            "aspect-[3/2] w-full object-cover transition hover:brightness-110" +
                            (isCurrent ? " ring-2 ring-(--color-soil)" : "")
                          }
                          alt={imgPath}
                        />
                        {isCurrent ? (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-(--color-soil) px-2 py-0.5 text-[10px] font-medium text-(--color-base-light)">
                            使用中
                          </span>
                        ) : null}
                      </div>
                      <p className="break-all font-mono text-[10px] text-(--color-mist)">{imgPath}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* 注記 */}
        <div className="shrink-0 border-t border-(--color-sand) px-6 py-3">
          <p className="text-xs text-(--color-mist)">
            新しい写真の追加や写真の加工は Claude に依頼してください。
          </p>
        </div>
      </div>
    </div>
  );
}

type ImageGroup = { name: string; images: string[] };

/*
 * images のパス（/images/<dir>/...）を 2 階層目のディレクトリ名でグルーピングする。
 * 直下（サブディレクトリなし）は「その他」に集約する。
 * library を先頭グループに固定し、残りはアルファベット順に並べる。
 */
function groupImagesByDirectory(images: string[]): ImageGroup[] {
  const byDir = new Map<string, string[]>();

  for (const imgPath of images) {
    const match = /^\/images\/([^/]+)\//.exec(imgPath);
    const dir = match ? match[1] : "その他";
    const existing = byDir.get(dir);
    if (existing) {
      existing.push(imgPath);
    } else {
      byDir.set(dir, [imgPath]);
    }
  }

  const dirNames = Array.from(byDir.keys());
  const rest = dirNames.filter((name) => name !== "library").sort((a, b) => a.localeCompare(b));
  const ordered = dirNames.includes("library") ? ["library", ...rest] : rest;

  return ordered.map((name) => ({ name, images: byDir.get(name)! }));
}
