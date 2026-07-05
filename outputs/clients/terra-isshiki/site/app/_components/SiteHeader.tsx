"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";
import { localizeHref, switchLocalePath } from "../i18n/routing";
import { getDict } from "../i18n/dictionary";

/* ナビ項目・住所・予約ボタン文言は app/copy.ts で編集できます。 */

export type SiteHeaderVariant = "hero" | "page";

export function SiteHeader({
  variant = "page",
  current,
  delayBase = 0.2,
  locale,
  copy,
}: {
  // variant は現在 styling には未使用。current の active 表示と互換性のため残置。
  variant?: SiteHeaderVariant;
  current?: string;
  delayBase?: number;
  locale: Locale;
  copy: SiteCopy;
}) {
  void variant; // 互換性のため受け取るだけ
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = getDict(locale);
  const { NAV, SITE } = copy;

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
      {/* 上→下フェードのグラデ背景。ヘッダー文字の可読性を底上げする。
          header 本体の mix-blend-mode:difference の影響を受けないよう header の外・後ろ(z下)に敷き、
          下端は境界が分からないよう base-dark を transparent へフェードさせる。 */}
      <div
        aria-hidden
        className="header-scrim pointer-events-none fixed inset-x-0 top-0 z-30 h-[clamp(88px,13vh,150px)]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(26,20,16,0.42) 0%, rgba(26,20,16,0.16) 50%, rgba(26,20,16,0) 100%)",
        }}
      />
      {/* 背景色は変えず mix-blend-mode:difference のみで反転させる（vibe-v2 踏襲）。
          暗い写真の上では白、明るい紙背景の上では自動的に黒く見える。 */}
      <header
        className="site-header fixed inset-x-0 top-0 z-40 flex items-start justify-between px-6 py-5 md:px-12 md:py-8 text-(--color-base-light)"
        style={{ mixBlendMode: "difference" }}
      >
        <Link
          href={localizeHref("/", locale)}
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
          <div
            aria-label={t.langSwitchAria}
            className="font-garamond italic text-[12px] md:text-[13px] tracking-[0.14em]"
          >
            <Link
              href={switchLocalePath(pathname, "ja")}
              aria-current={locale === "ja" ? "true" : undefined}
              className={
                locale === "ja"
                  ? "opacity-100"
                  : "opacity-55 transition-opacity hover:opacity-100"
              }
            >
              JP
            </Link>
            <span className="text-(--color-base-light)/85"> / </span>
            <Link
              href={switchLocalePath(pathname, "en")}
              aria-current={locale === "en" ? "true" : undefined}
              className={
                locale === "en"
                  ? "opacity-100"
                  : "opacity-55 transition-opacity hover:opacity-100"
              }
            >
              EN
            </Link>
          </div>

          <nav className="hidden md:block">
            <ul className="flex items-center gap-[clamp(22px,2.03vw,52px)] font-garamond text-[11.96px] md:text-[clamp(10.5px,0.71vw,18.2px)] tracking-[0.22em] uppercase">
              {NAV.map((item) => {
                const active = current === item.label;
                return (
                  <li key={item.label} className="group">
                    <Link
                      href={localizeHref(item.href, locale)}
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
            aria-label={t.openMenu}
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="md:hidden flex h-10 w-10 items-center justify-center"
          >
            <span className="block h-px w-7 bg-(--color-base-light) relative">
              <span className="absolute -top-2 left-0 block h-px w-7 bg-(--color-base-light)" />
              <span className="absolute top-2 left-0 block h-px w-5 bg-(--color-base-light)" />
            </span>
            <span className="sr-only">{t.openMenu}</span>
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
              href={localizeHref("/", locale)}
              onClick={() => setOpen(false)}
              className="block leading-none"
            >
              <span className="block font-serif text-[18.79px] font-medium tracking-[0.18em] text-(--color-base-light)">
                {SITE.footerBrand}
              </span>
              <span className="block mt-1 font-garamond text-[8.54px] uppercase tracking-[0.42em] text-(--color-base-light)/85">
                {SITE.footerArea}
              </span>
            </Link>
            <button
              type="button"
              aria-label={t.closeMenu}
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
                      href={localizeHref(item.href, locale)}
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
              href={SITE.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-mincho text-[11px] tracking-[0.22em] border border-(--color-base-light)/25 px-6 py-3.5 text-(--color-base-light)"
            >
              {SITE.reserveDock}
              <span aria-hidden>→</span>
            </a>
            <p className="mt-8 font-mincho text-[10.25px] leading-[1.85] tracking-[0.06em] text-(--color-base-light)/70">
              {SITE.postalAddress}
              <br />
              {SITE.operator}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
