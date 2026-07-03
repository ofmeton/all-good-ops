"use client";

/* TOP 過ごし方セクションの写真ちょい見せスライドショー。
 * 写真は app/copy.ts（TOP.stayDetail.slideshow）で編集 */

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_MS = 4200;
const RESUME_AFTER_TOUCH_MS = 6000;

export function PeekSlideshow({
  images,
}: {
  images: { src: string; alt: string }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = images.length;

  useEffect(() => {
    reduceRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // peek 型はスライド幅 ≠ コンテナ幅なので、現在位置は「スクロール位置に
  // 最も近いスライド」で求める（clientWidth 割りだと最終スライドで詰まる）。
  // scroll 目標も snap 位置（offsetLeft − 左パディング）に合わせ、snap との
  // 引っ張り合いをなくす。
  const nearestIndex = (el: HTMLDivElement) => {
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const x = el.scrollLeft + pad;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const d = Math.abs((child as HTMLElement).offsetLeft - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  // 自動送り: 次スライドの snap 位置へスクロール。最後は先頭へ戻る。
  useEffect(() => {
    if (paused || reduceRef.current || n <= 1) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
      const nextIndex = (nearestIndex(el) + 1) % n;
      const nextSlide = el.children[nextIndex] as HTMLElement | undefined;
      if (!nextSlide) return;
      el.scrollTo({ left: nextSlide.offsetLeft - pad, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  // スクロール位置から現在 index を同期
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(nearestIndex(el));
  };

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  // タッチ開始で止め、6 秒後に自動再開
  const onTouchStart = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setPaused(false);
    }, RESUME_AFTER_TOUCH_MS);
  }, []);

  return (
    <div
      ref={trackRef}
      onScroll={onScroll}
      onPointerEnter={pause}
      onPointerLeave={resume}
      onTouchStart={onTouchStart}
      onFocusCapture={pause}
      onBlurCapture={resume}
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-5 md:scroll-pl-12 px-5 md:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {images.map((img, i) => (
        <div
          key={img.src}
          className="relative shrink-0 basis-[82%] md:basis-[46%] lg:basis-[38%] snap-start overflow-hidden bg-(--color-base-dark)/5"
          style={{ aspectRatio: "3/2" }}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(min-width:768px) 46vw, 82vw"
            quality={86}
            className="object-cover object-center"
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
