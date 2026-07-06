"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * vibe-v2 (wireframes/v2-vibe/app.js の [data-paraimg]) の画像内パン視差を再現。
 * 画像を 1.16 倍に拡大した状態で、フレーム内を -8%〜8% で縦パンする。
 * アスペクト比に依らず全画像で均一に動く（object-position 方式は使わない）。
 * children には fill 指定の <Image> を渡す。
 */
export function ParallaxLayer({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frame = frameRef.current;
      const img = frame?.querySelector("img");
      if (reduce || !frame || !img) return;

      // will-change + force3D で GPU 合成レイヤーに乗せ、拡大した画像の
      // パンでフレーム落ちが出ないようにする。
      gsap.set(img, { willChange: "transform", force3D: true });
      gsap.fromTo(
        img,
        { yPercent: -8, scale: 1.16 },
        {
          yPercent: 8,
          scale: 1.16,
          ease: "none",
          scrollTrigger: {
            trigger: frame,
            start: "top bottom",
            end: "bottom top",
            // true（即追従）だとホイールの粗いステップでカクつくため、
            // 数値でスムージング（1 = 約1秒かけて目標位置へ追いつく）。
            scrub: 1,
          },
        }
      );
    },
    { scope: frameRef }
  );

  return (
    <div ref={frameRef} className="absolute inset-0 overflow-hidden">
      {children}
    </div>
  );
}
