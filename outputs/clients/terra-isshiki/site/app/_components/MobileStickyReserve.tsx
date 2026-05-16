"use client";

import { useEffect, useState } from "react";

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function MobileStickyReserve() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      // Hero を 60% 抜けたあたりから出現させる（Hero は概ね 64svh〜100svh）
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <a
      href={AIRBNB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Airbnb で予約する"
      className={`md:hidden fixed bottom-6 right-6 z-40 inline-flex items-center justify-center w-14 h-14 rounded-full bg-(--color-base-dark) text-(--color-base-light) shadow-[0_8px_28px_-6px_rgba(26,20,16,0.45)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span aria-hidden className="font-garamond text-[20px] leading-none -translate-y-px">
        ↗
      </span>
      <span className="sr-only">Airbnb で予約する</span>
    </a>
  );
}
