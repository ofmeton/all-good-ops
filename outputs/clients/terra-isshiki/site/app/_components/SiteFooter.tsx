import Image from "next/image";
import Link from "next/link";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";
import { localizeHref } from "../i18n/routing";

/* サイト共通フッター。ブランド・住所・運営表記・CTA・コピーライト。
   文言は app/copy.ts（SITE）で編集できます。
   CTA は既定で「空き状況を確認する」→ /reserve（サイト内一本化）。
   /reserve ページ自身だけは ctaMode="airbnb" で Airbnb 直リンクにする
  （自己ループを避けるため）。 */

export function SiteFooter({
  copy,
  locale,
  ctaMode = "reserve",
}: {
  copy: SiteCopy;
  locale: Locale;
  ctaMode?: "reserve" | "airbnb";
}) {
  const { SITE } = copy;
  const isAirbnb = ctaMode === "airbnb";

  return (
    <footer className="bg-(--color-base-dark) text-(--color-base-light) px-6 py-[clamp(64px,7vw,112px)] md:px-12">
      <div className="mx-auto max-w-[1640px] grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link
            href={localizeHref("/", locale)}
            className="block w-fit mb-6 md:mb-10"
            aria-label="TERRA HAYAMA"
          >
            <Image
              src="/images/logo-white.png"
              alt="TERRA HAYAMA"
              width={148}
              height={148}
              className="h-[clamp(96px,11vw,136px)] w-auto"
            />
          </Link>
          <p className="font-mincho text-[11.5px] md:text-[clamp(var(--fs-lv1),0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] opacity-80">
            {SITE.postalAddress}
            <br />
            {SITE.operator}
          </p>
        </div>
        {isAirbnb ? (
          <a
            href={SITE.airbnbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-serif text-[12.5px] md:text-[clamp(var(--fs-lv3),0.6vw,19.7px)] tracking-[0.1em] border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>{SITE.reserveButton}</span>
            <span aria-hidden className="cta-arrow group-hover:[animation-play-state:paused]">→</span>
          </a>
        ) : (
          <Link
            href={localizeHref("/reserve", locale)}
            className="group inline-flex items-center gap-3 font-serif text-[12.5px] md:text-[clamp(var(--fs-lv3),0.6vw,19.7px)] tracking-[0.1em] border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>{SITE.footerReserveCta}</span>
            <span aria-hidden className="cta-arrow group-hover:[animation-play-state:paused]">→</span>
          </Link>
        )}
      </div>
      <p className="mt-12 md:mt-16 font-garamond text-[8.5px] md:text-[7.7px] lg:text-[8.4px] tracking-[0.32em] uppercase opacity-55 text-center md:text-left">
        {SITE.copyright}
      </p>
    </footer>
  );
}
