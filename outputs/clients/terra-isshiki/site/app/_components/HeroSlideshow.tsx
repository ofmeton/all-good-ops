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
 * kenburns ズーム（CSS animation）は「active になった瞬間」だけリスタート
 * させたいので、activation 世代（gens）を key に含める。
 * 逆に active → previous へ切り替わる瞬間に key が変わると img が再マウント
 * され、フェード中のズームが scale(1) に巻き戻って「カクッ」と見える。
 * そのため非 active 化では key を変えない（= 再マウントしない）。
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
  const activeRef = useRef(0);
  const gens = useRef<number[]>([]);
  if (gens.current.length !== slides.length) {
    gens.current = slides.map(() => 0);
  }
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const current = activeRef.current;
      const next = (current + 1) % slides.length;
      gens.current[next] += 1; // 新しく active になるスライドだけズームをリスタート
      activeRef.current = next;
      setPrevious(current);
      setActive(next);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setPrevious(null), fadeMs);
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
              key={`${s.src}-${gens.current[i]}`}
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
