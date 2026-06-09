"use client";

import { useEffect } from "react";

/**
 * スクロール出現演出のルート。
 * ページ内の [data-reveal] 要素を IntersectionObserver で観測し、
 * viewport に入ったら .is-visible を付与する（一度きり）。
 *
 * - ラッパー div を増やさず既存要素に class を足すだけなので、
 *   grid 等のレイアウト（例: バンドの md:grid-cols-2 / [&>a]:order-2）を壊さない。
 * - prefers-reduced-motion / IO 非対応時は即表示にフォールバック。
 * - client component がページ毎にマウントされるため、SPA 遷移後も張り直される。
 */
export function RevealRoot() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (els.length === 0) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
