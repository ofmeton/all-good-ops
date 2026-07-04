"use client";

/* 1 枚枠のクロスフェード・スライドショー。TOP 過ごし方・オーナー章で使用。
 * 写真は app/copy.ts で編集 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function FadeSlideshow({
  images,
  intervalMs = 5000,
  fadeMs = 1800,
  sizes = "100vw",
  className = "",
}: {
  images: { src: string; alt: string }[];
  intervalMs?: number;
  fadeMs?: number;
  sizes?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // 自動送り: prefers-reduced-motion では自動送りせず 1 枚目を固定表示する。
  useEffect(() => {
    if (reduceRef.current || images.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {images.map((img, i) => {
        const isActive = i === index;
        return (
          <div
            key={img.src}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{ opacity: isActive ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
            aria-hidden={!isActive}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes={sizes}
              quality={85}
              className="object-cover object-center"
            />
          </div>
        );
      })}
    </div>
  );
}
