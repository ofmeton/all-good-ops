"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Item = { src: string; aspect: string };
type Section = {
  label: string;
  caption: string;
  description: string;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    label: "LDK",
    caption: "リビング・ダイニング・キッチン",
    description:
      "木の天井と一面の窓。ソファ、楕円のダイニングテーブル、テレビが揃う、家族で集う空間。",
    items: [
      { src: "/images/rooms/ldk-01.jpg", aspect: "3/2" },
      { src: "/images/rooms/ldk-02.jpg", aspect: "3/2" },
      { src: "/images/rooms/ldk-03.jpg", aspect: "3/2" },
      { src: "/images/rooms/ldk-04.jpg", aspect: "3/2" },
    ],
  },
  {
    label: "Bedroom",
    caption: "最大 8 名の寝室",
    description:
      "二段ベッド 2 台 / セミダブル 1 台 / 布団 2 組。家族・友人グループでまとまって泊まれます。",
    items: [
      { src: "/images/rooms/bedroom-01.jpg", aspect: "3/2" },
      { src: "/images/rooms/bedroom-02.jpg", aspect: "3/2" },
    ],
  },
  {
    label: "Bath & Laundry",
    caption: "お風呂と水まわり",
    description:
      "ひのきに包まれたバスルーム。ドラム式洗濯機と真鍮の洗面ボウルが並ぶランドリー一体空間。",
    items: [
      { src: "/images/rooms/bath.jpg", aspect: "3/2" },
      { src: "/images/rooms/laundry.jpg", aspect: "3/2" },
    ],
  },
];

const AUTO_MS = 4500;

/**
 * セクション単位の自動送り横カルーセル。
 * - scroll-snap で 1 枚ずつ表示。手動スワイプ可。
 * - 自動送り（hover / フォーカス / prefers-reduced-motion で停止）。
 * - 各スライドはタップで lightbox 拡大（onZoom）。
 */
function SectionCarousel({
  section,
  onZoom,
}: {
  section: Section;
  onZoom: (src: string, alt: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceRef = useRef(false);
  const n = section.items.length;

  useEffect(() => {
    reduceRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = trackRef.current;
      if (!el) return;
      const target = ((i % n) + n) % n;
      el.scrollTo({
        left: target * el.clientWidth,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [n],
  );

  // 自動送り
  useEffect(() => {
    if (paused || reduceRef.current || n <= 1) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({
        left: ((current + 1) % n) * el.clientWidth,
        behavior: "smooth",
      });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  // スクロール位置から現在 index を同期
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div
      className="relative"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {section.items.map((it, i) => (
          <button
            type="button"
            key={it.src}
            onClick={() => onZoom(it.src, `${section.label} ${i + 1}`)}
            className="relative shrink-0 basis-full snap-start cursor-zoom-in bg-(--color-base-dark)/5"
            style={{ aspectRatio: "3/2" }}
            aria-label={`${section.label} の写真 ${i + 1} を拡大表示`}
          >
            <Image
              src={it.src}
              alt={`${section.label} ${i + 1}`}
              fill
              sizes="100vw"
              quality={88}
              className="object-cover object-center"
            />
          </button>
        ))}
      </div>

      {n > 1 && (
        <>
          {/* prev / next（md 以上） */}
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="前の写真"
            className="hidden md:flex absolute top-1/2 left-4 -translate-y-1/2 h-11 w-11 items-center justify-center bg-(--color-base-light)/85 text-(--color-base-dark) backdrop-blur-[2px] hover:bg-(--color-base-light) transition-colors"
          >
            <span aria-hidden className="text-[18px] leading-none -mt-0.5">
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="次の写真"
            className="hidden md:flex absolute top-1/2 right-4 -translate-y-1/2 h-11 w-11 items-center justify-center bg-(--color-base-light)/85 text-(--color-base-dark) backdrop-blur-[2px] hover:bg-(--color-base-light) transition-colors"
          >
            <span aria-hidden className="text-[18px] leading-none -mt-0.5">
              ›
            </span>
          </button>

          {/* dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {section.items.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => goTo(i)}
                aria-label={`${i + 1} 枚目へ`}
                aria-current={i === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-(--color-base-light)"
                    : "w-1.5 bg-(--color-base-light)/55 hover:bg-(--color-base-light)/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function RoomsGallery() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [lightbox]);

  const openZoom = useCallback((src: string, alt: string) => {
    setLightbox({ src, alt });
  }, []);

  return (
    <>
      {SECTIONS.map((section, sIdx) => (
        <section
          key={section.label}
          className={`relative ${
            sIdx % 2 === 1 ? "bg-(--color-paper)" : "bg-(--color-base-light)"
          }`}
        >
          {/* Section header */}
          <div className="mx-auto max-w-[1480px] px-6 md:px-12 mb-10 md:mb-16 pt-12 md:pt-16">
            <p className="font-garamond italic text-[clamp(11.1px,0.55vw,17.08px)] tracking-[0.42em] uppercase text-(--color-soil) mb-3">
              {section.caption}
            </p>
            <h2 className="font-serif text-[21.86px] md:text-[clamp(22.4px,1.84vw,47.04px)] leading-[1.2] tracking-[0.04em] text-(--color-base-dark) whitespace-nowrap mb-6 md:mb-8">
              {section.label}
            </h2>
            <p className="font-mincho text-[12.81px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/80 md:max-w-[760px]">
              {section.description}
            </p>
          </div>

          {/* Auto-advancing carousel */}
          <SectionCarousel section={section} onZoom={openZoom} />
        </section>
      ))}

      {/* Lightbox modal */}
      <div
        className={`fixed inset-0 z-[80] flex items-center justify-center bg-(--color-base-dark)/94 p-4 md:p-10 transition-opacity duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          lightbox
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setLightbox(null)}
        aria-hidden={!lightbox}
        role="dialog"
      >
        <button
          type="button"
          aria-label="閉じる"
          onClick={() => setLightbox(null)}
          className="absolute top-5 right-5 md:top-8 md:right-8 z-10 flex h-12 w-12 items-center justify-center text-(--color-base-light)"
        >
          <span className="relative block h-5 w-5">
            <span className="absolute top-1/2 left-0 block h-px w-full bg-(--color-base-light) rotate-45" />
            <span className="absolute top-1/2 left-0 block h-px w-full bg-(--color-base-light) -rotate-45" />
          </span>
        </button>
        {lightbox && (
          <div
            className="relative h-full w-full max-w-[1500px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.src}
              alt={lightbox.alt}
              fill
              sizes="92vw"
              quality={92}
              className="object-contain"
            />
          </div>
        )}
      </div>
    </>
  );
}
