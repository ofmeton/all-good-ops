"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCopy } from "../copy";
import { currentLocale, localizeHref } from "../i18n/routing";

/* ボタン文言は app/copy.ts（SITE.reserveDock）で編集できます。
   飛び先は空き状況・予約ページ（/reserve）— サイト内リンクなので Airbnb への外部遷移はしない。
   RootLayout 直下に置かれ locale を受け取れないため、usePathname() で自己判定する。 */

export function SideReserve() {
  const pathname = usePathname();
  const locale = currentLocale(pathname);
  const { SITE } = getCopy(locale);

  return (
    <Link
      href={localizeHref("/reserve", locale)}
      aria-label={SITE.reserveDock}
      className={`dock group hidden xl:flex fixed right-6 2xl:right-12 top-1/2 z-30 -translate-y-1/2 items-center px-6 py-4 2xl:px-7 2xl:py-5 rounded-full bg-(--color-base-dark)/85 hover:bg-(--color-base-dark) backdrop-blur-[10px] border border-(--color-base-light)/15 text-(--color-base-light) shadow-[0_12px_36px_-10px_rgba(26,20,16,0.6)] hover:shadow-[0_16px_48px_-10px_rgba(26,20,16,0.7)] hover:scale-[1.025] transition-[background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${locale === "ja" ? "vrl" : ""}`}
    >
      {/* Top / bottom accent strokes — expand on hover for inviting tactility */}
      <span
        aria-hidden
        className="absolute top-3 left-1/2 -translate-x-1/2 h-px w-5 bg-(--color-base-light)/35 group-hover:w-8 transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      />
      <span className={`font-mincho text-[clamp(var(--fs-lv4),0.66vw,21.11px)] ${locale === "ja" ? "tracking-[0.4em]" : "tracking-[0.12em]"}`}>
        {SITE.reserveDock}
      </span>
      <span
        aria-hidden
        className="absolute bottom-3 left-1/2 -translate-x-1/2 h-px w-5 bg-(--color-base-light)/35 group-hover:w-8 transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      />
    </Link>
  );
}
