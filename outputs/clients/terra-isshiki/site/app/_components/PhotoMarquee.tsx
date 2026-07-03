"use client";

import Image from "next/image";

type MarqueeImage = { src: string; alt: string };

/**
 * 緩やかに横へ流れ続ける写真マーキー。
 * - CSS animation で一定速度・連続スクロール（scroll-snap のキビキビ感を避ける）。
 * - 画像を 2 セット並べ、translateX(-50%) の無限ループで継ぎ目なくつなぐ。
 * - hover で一時停止、prefers-reduced-motion で停止（globals.css 側）。
 */
export function PhotoMarquee({
  images,
  durationSec = 64,
}: {
  images: MarqueeImage[];
  durationSec?: number;
}) {
  const doubled = [...images, ...images];
  return (
    <div className="marquee">
      <ul className="marquee__track" style={{ animationDuration: `${durationSec}s` }}>
        {doubled.map((img, i) => (
          <li key={`${img.src}-${i}`} className="marquee__item" aria-hidden={i >= images.length}>
            <Image
              src={img.src}
              alt={i < images.length ? img.alt : ""}
              fill
              sizes="(min-width: 768px) 32vw, 70vw"
              quality={84}
              className="object-cover object-center"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
