"use client";

import { useEffect, useState } from "react";

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function MobileStickyReserve() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      // Hero (64〜100svh) を 55% 抜けたあたりから出現
      setVisible(window.scrollY > window.innerHeight * 0.55);
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
      aria-label="ご予約はこちら（Airbnb）"
      className={`xl:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full bg-(--color-base-dark) text-(--color-base-light) px-5 py-3.5 shadow-[0_8px_28px_-6px_rgba(26,20,16,0.55)] backdrop-blur-[2px] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span className="font-mincho text-[13px] tracking-[0.18em] leading-none">
        ご予約はこちら
      </span>
      <span
        aria-hidden
        className="font-garamond text-[14px] leading-none -translate-y-px"
      >
        ↗
      </span>
    </a>
  );
}
