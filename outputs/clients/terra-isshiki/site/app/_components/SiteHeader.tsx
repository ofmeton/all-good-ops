"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SiteHeaderVariant = "hero" | "page";

const NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Rooms", href: "/rooms" },
  { label: "Stay", href: "/stay" },
  { label: "Access", href: "/access" },
];

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function SiteHeader({
  variant = "page",
  current,
  delayBase = 0.2,
}: {
  variant?: SiteHeaderVariant;
  current?: string;
  delayBase?: number;
}) {
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

  const isHero = variant === "hero";
  const textColor = isHero ? "text-(--color-base-light)" : "text-(--color-base-dark)";
  const subColor = isHero ? "text-(--color-base-light)/85" : "text-(--color-base-dark)/65";
  const navUnderline = isHero ? "bg-(--color-base-light)" : "bg-(--color-base-dark)";
  const positionCls = isHero
    ? "absolute inset-x-0 top-0 z-20"
    : "sticky top-0 z-40 bg-(--color-base-light)/95 backdrop-blur-[6px] border-b border-(--color-base-dark)/8";
  const burgerBar = isHero ? "bg-(--color-base-light)" : "bg-(--color-base-dark)";

  return (
    <>
      <header
        className={`${positionCls} flex items-start justify-between px-6 py-7 md:px-12 md:py-10`}
      >
        <Link
          href="/"
          className="block leading-none fade-up"
          style={{ animationDelay: `${delayBase}s` }}
        >
          <span
            className={`block font-serif text-[22px] md:text-[clamp(30px,2.34vw,60px)] font-medium tracking-[0.18em] ${textColor}`}
          >
            TERRA
          </span>
          <span
            className={`block mt-1 font-garamond text-[10px] md:text-[clamp(13px,0.86vw,22px)] uppercase tracking-[0.42em] ${subColor}`}
          >
            Hayama, Isshiki
          </span>
        </Link>

        <nav
          className="hidden md:block fade-up"
          style={{ animationDelay: `${delayBase + 0.25}s` }}
        >
          <ul
            className={`flex items-center gap-[clamp(22px,2.03vw,52px)] font-garamond text-[14px] md:text-[clamp(15px,1.02vw,26px)] tracking-[0.22em] uppercase ${textColor}`}
          >
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
                      className={`pointer-events-none absolute bottom-0 left-0 h-px ${
                        active ? "w-full" : "w-0"
                      } ${navUnderline} transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:w-full`}
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
          className="md:hidden flex h-10 w-10 items-center justify-center fade-up"
          style={{ animationDelay: `${delayBase + 0.25}s` }}
        >
          <span className={`block h-px w-7 ${burgerBar} relative`}>
            <span className={`absolute -top-2 left-0 block h-px w-7 ${burgerBar}`} />
            <span className={`absolute top-2 left-0 block h-px w-5 ${burgerBar}`} />
          </span>
          <span className="sr-only">メニューを開く</span>
        </button>
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
              <span className="block font-serif text-[22px] font-medium tracking-[0.18em] text-(--color-base-light)">
                TERRA
              </span>
              <span className="block mt-1 font-garamond text-[10px] uppercase tracking-[0.42em] text-(--color-base-light)/85">
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
                        <span className="font-garamond italic text-[11px] tracking-[0.32em] uppercase text-(--color-base-light)/55 w-8">
                          0{i + 1}
                        </span>
                        <span
                          className={`font-serif text-[34px] leading-[1.1] tracking-[0.04em] ${
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
              className="inline-flex items-center gap-3 font-garamond text-[12px] tracking-[0.32em] uppercase border border-(--color-base-light)/25 px-6 py-3.5 text-(--color-base-light)"
            >
              Reserve on Airbnb
              <span aria-hidden>↗</span>
            </a>
            <p className="mt-8 font-mincho text-[12px] leading-[1.85] tracking-[0.06em] text-(--color-base-light)/70">
              〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5<br />
              運営: 株式会社 BEAT ICE
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
