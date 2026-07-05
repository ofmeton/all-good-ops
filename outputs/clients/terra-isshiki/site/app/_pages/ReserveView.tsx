import { SiteHeader } from "../_components/SiteHeader";
import { AvailabilityCalendar } from "../_components/AvailabilityCalendar";
import { SiteFooter } from "../_components/SiteFooter";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";

/* 文言は app/copy.ts（RESERVE_PAGE / SITE / NOTICES）で編集できます。
   このページは自分自身への予約導線になるため、右下の予約 dock は隠す
  （studio ページの .studio-root と同じ body:has() パターン）。 */

export function ReserveView({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const c = copy.RESERVE_PAGE;
  const { SITE } = copy;
  return (
    <main className="reserve-root bg-(--color-base-light)">
      {/* 右下の予約 dock（Airbnb 外部リンク）は、このページ自身が予約導線のため非表示にする */}
      <style>{`body:has(.reserve-root) .dock { display: none !important; }`}</style>

      <SiteHeader variant="page" current="Reserve" locale={locale} copy={copy} />

      {/* 写真なしの静かな導入 — ヘッダー分の余白を確保しつつ、下層ページの見出し級で始める */}
      <section className="px-6 pt-[clamp(140px,16vw,220px)] pb-[clamp(64px,6vw,96px)] md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="font-serif text-[22px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark)">
            {c.title}
          </h1>
          <p className="mt-6 md:mt-8 max-w-[640px] font-mincho text-[13px] md:text-[clamp(var(--fs-lv3),0.71vw,18.2px)] leading-[1.95] tracking-[0.07em] text-(--color-base-dark)/80">
            {c.lead}
          </p>
        </div>
      </section>

      {/* Availability calendar + Airbnb 予約ボタン */}
      <section className="px-6 pb-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <AvailabilityCalendar monthCount={3} copy={copy} locale={locale} />

          <div className="mt-14 md:mt-20 text-center md:text-left">
            <a
              href={SITE.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-4 bg-(--color-base-dark) text-(--color-base-light) font-serif text-[13px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.1em] px-8 py-4 hover:bg-(--color-base-dark)/85 transition-colors"
            >
              <span>{SITE.reserveButton}</span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter copy={copy} locale={locale} ctaMode="airbnb" />
    </main>
  );
}
