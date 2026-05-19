"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Slide = { src: string; alt: string };

/**
 * Layered cross-fade slideshow.
 *
 * 「次」を最上層に opacity 0→1 で fade-in しつつ、「前」は opacity 1 のまま
 * 直下に保持する。fade 完了後に previous をクリアして次サイクルへ。
 *
 * これにより crossfade 中も常に「下のレイヤーが opacity 1」で背景の dark を
 * 隠し続けるため、midpoint で画像全体が暗くなる現象（CSS 単純 crossfade の
 * 罠）を回避する。
 */
export function HeroSlideshow({
  slides,
  intervalMs = 4000,
  fadeMs = 1200,
}: {
  slides: Slide[];
  intervalMs?: number;
  fadeMs?: number;
}) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % slides.length;
        setPrevious(current);
        if (fadeTimer.current) clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => setPrevious(null), fadeMs);
        return next;
      });
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [slides.length, intervalMs, fadeMs]);

  return (
    <div aria-hidden className="absolute inset-0">
      {slides.map((s, i) => {
        const isActive = i === active;
        const isPrevious = i === previous;
        // active: 最上層 opacity 1 (fade-in)
        // previous: 直下 opacity 1 (保持)
        // others: 完全に隠す opacity 0 z-0
        const opacity = isActive || isPrevious ? 1 : 0;
        const z = isActive ? 2 : isPrevious ? 1 : 0;
        return (
          <div
            key={s.src}
            className="absolute inset-0"
            style={{
              opacity,
              zIndex: z,
              transition: `opacity ${fadeMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              quality={85}
              className="object-cover object-center"
            />
          </div>
        );
      })}
    </div>
  );
}
