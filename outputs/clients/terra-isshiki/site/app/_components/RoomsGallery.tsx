"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
      "杉板に包まれたバスルーム。ドラム式洗濯機と黒の洗面シンクが並ぶランドリー一体空間。",
    items: [
      { src: "/images/rooms/bath.jpg", aspect: "3/2" },
      { src: "/images/rooms/laundry.jpg", aspect: "3/2" },
    ],
  },
  {
    label: "Kitchen",
    caption: "キッチンと食卓",
    description:
      "フルキッチン + 抹茶マシーン。地元の食材を持ち込み、自分たちの食卓を整える滞在。",
    items: [
      { src: "/images/rooms/kitchen-01.jpg", aspect: "3/2" },
      { src: "/images/rooms/kitchen-02.jpg", aspect: "3/2" },
      { src: "/images/rooms/kitchen-03.jpg", aspect: "3/2" },
      { src: "/images/rooms/kitchen-04.jpg", aspect: "3/2" },
    ],
  },
];

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

  return (
    <>
      {SECTIONS.map((section, sIdx) => (
        <section
          key={section.label}
          className={`relative ${
            sIdx % 2 === 1 ? "bg-(--color-paper)" : "bg-(--color-base-light)"
          }`}
        >
          {/* Section header — readable width, padded.
             section 自体には py をかけず、header に pt のみ持たせて
             gallery sections 間の余白を最小化する。 */}
          <div className="mx-auto max-w-[1480px] px-6 md:px-12 mb-10 md:mb-16 pt-12 md:pt-16">
            <p className="font-garamond italic text-[clamp(9.1px,0.55vw,14px)] tracking-[0.42em] uppercase text-(--color-soil) mb-3">
              {section.caption}
            </p>
            <h2 className="font-serif text-[17.92px] md:text-[clamp(22.4px,1.84vw,47.04px)] leading-[1.2] tracking-[0.04em] text-(--color-base-dark) whitespace-nowrap mb-6 md:mb-8">
              {section.label}
            </h2>
            <p className="font-mincho text-[10.5px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/80 md:max-w-[760px]">
              {section.description}
            </p>
          </div>

          {/* Image grid — full bleed, edge to edge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
            {section.items.map((it, i) => (
              <button
                type="button"
                key={it.src}
                onClick={() =>
                  setLightbox({
                    src: it.src,
                    alt: `${section.label} ${i + 1}`,
                  })
                }
                className="group relative overflow-hidden bg-(--color-base-dark)/5 cursor-zoom-in"
                style={{ aspectRatio: it.aspect }}
                aria-label={`${section.label} の写真 ${i + 1} を拡大表示`}
              >
                <Image
                  src={it.src}
                  alt={`${section.label} ${i + 1}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  quality={88}
                  className="object-cover object-center transition-transform duration-[1100ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.05]"
                />
                <span className="pointer-events-none absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center bg-(--color-base-dark)/55 text-(--color-base-light) opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-[2px]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  >
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="M15.5 15.5 L21 21 M10.5 7.5 V13.5 M7.5 10.5 H13.5" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
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
