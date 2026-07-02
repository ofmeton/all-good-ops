"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export type SiteHeaderVariant = "hero" | "page";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Rooms", href: "/rooms" },
  { label: "Stay", href: "/stay" },
  { label: "Owner", href: "/owner" },
  { label: "Access", href: "/access" },
];

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function SiteHeader({
  variant = "page",
  current,
  delayBase = 0.2,
}: {
  // variant は現在 styling には未使用。current の active 表示と互換性のため残置。
  variant?: SiteHeaderVariant;
  current?: string;
  delayBase?: number;
}) {
  void variant; // 互換性のため受け取るだけ
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open]);

  return (
    <>
      {/* 背景色は変えず mix-blend-mode:difference のみで反転させる（vibe-v2 踏襲）。
          暗い写真の上では白、明るい紙背景の上では自動的に黒く見える。 */}
      <header
        className="site-header fixed inset-x-0 top-0 z-40 flex items-start justify-between px-6 py-5 md:px-12 md:py-8 text-(--color-base-light)"
        style={{ mixBlendMode: "difference" }}
      >
        <Link
          href="/"
          className="block leading-none fade-up"
          style={{ animationDelay: `${delayBase}s` }}
          aria-label="TERRA HAYAMA"
        >
          <Image
            src="/images/logo-white.png"
            alt="TERRA HAYAMA"
            width={148}
            height={148}
            className="h-[clamp(52px,6.4vw,74px)] w-auto"
            priority
          />
        </Link>

        <div
          className="flex items-center gap-[clamp(14px,2vw,26px)] fade-up"
          style={{ animationDelay: `${delayBase + 0.25}s` }}
        >
          <button
            type="button"
            aria-label="Language / 言語切替"
            className="font-garamond italic text-[12px] md:text-[13px] tracking-[0.14em]"
          >
            JP <span className="text-(--color-base-light)/85">/</span> EN
          </button>

          <nav className="hidden md:block">
            <ul className="flex items-center gap-[clamp(22px,2.03vw,52px)] font-garamond text-[11.96px] md:text-[clamp(10.5px,0.71vw,18.2px)] tracking-[0.22em] uppercase">
              {NAV.map((item) => {
                const active = current === item.label;
                return (
                  <li key={item.label} className="group">
                    <Link
                      href={item.href}
                      className="relative inline-block py-2"
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                      <span
                        className={`pointer-events-none absolute bottom-0 left-0 h-px bg-(--color-base-light) ${
                          active ? "w-full" : "w-0"
                        } transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:w-full`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <button
            type="button"
            aria-label="メニューを開く"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="md:hidden flex h-10 w-10 items-center justify-center"
          >
            <span className="block h-px w-7 bg-(--color-base-light) relative">
              <span className="absolute -top-2 left-0 block h-px w-7 bg-(--color-base-light)" />
              <span className="absolute top-2 left-0 block h-px w-5 bg-(--color-base-light)" />
            </span>
            <span className="sr-only">メニューを開く</span>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-[60] ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
        role="dialog"
      >
        <div
          className={`absolute inset-0 bg-(--color-base-dark) paper-noise transition-opacity duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`relative h-full flex flex-col px-6 py-7 text-(--color-base-light) transition-all duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
          }`}
        >
          <div className="flex items-start justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block leading-none"
            >
              <span className="block font-serif text-[18.79px] font-medium tracking-[0.18em] text-(--color-base-light)">
                TERRA
              </span>
              <span className="block mt-1 font-garamond text-[8.54px] uppercase tracking-[0.42em] text-(--color-base-light)/85">
                Hayama, Isshiki
              </span>
            </Link>
            <button
              type="button"
              aria-label="メニューを閉じる"
              onClick={() => setOpen(false)}
              className="h-10 w-10 flex items-center justify-center text-(--color-base-light)"
            >
              <span className="relative block h-[18px] w-[18px]">
                <span className="absolute top-1/2 left-0 block h-px w-full bg-(--color-base-light) rotate-45" />
                <span className="absolute top-1/2 left-0 block h-px w-full bg-(--color-base-light) -rotate-45" />
              </span>
            </button>
          </div>

          <nav className="mt-16 flex-1">
            <ul className="flex flex-col gap-2">
              {NAV.map((item, i) => {
                const active = current === item.label;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="group block py-3 border-b border-(--color-base-light)/15"
                      style={{
                        transitionDelay: open ? `${i * 60}ms` : "0ms",
                      }}
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="font-garamond italic text-[9.39px] tracking-[0.32em] uppercase text-(--color-base-light)/55 w-8">
                          0{i + 1}
                        </span>
                        <span
                          className={`font-serif text-[29.04px] leading-[1.1] tracking-[0.04em] ${
                            active
                              ? "text-(--color-base-light)"
                              : "text-(--color-base-light)/85 group-hover:text-(--color-base-light)"
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="pt-10">
            <a
              href={AIRBNB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-garamond text-[10.25px] tracking-[0.32em] uppercase border border-(--color-base-light)/25 px-6 py-3.5 text-(--color-base-light)"
            >
              ご予約はこちら
              <span aria-hidden>→</span>
            </a>
            <p className="mt-8 font-mincho text-[10.25px] leading-[1.85] tracking-[0.06em] text-(--color-base-light)/70">
              〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5<br />
              運営: 株式会社 BEAT ICE
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
