import { SiteHeader } from "../_components/SiteHeader";
import { AvailabilityCalendar } from "../_components/AvailabilityCalendar";
import { SITE, RESERVE_PAGE, NOTICES } from "../copy";

/* 文言は app/copy.ts（RESERVE_PAGE / SITE / NOTICES）で編集できます。
   このページは自分自身への予約導線になるため、右下の予約 dock は隠す
  （studio ページの .studio-root と同じ body:has() パターン）。 */

export const metadata = {
  title: RESERVE_PAGE.metaTitle,
};

export default function ReservePage() {
  const c = RESERVE_PAGE;
  return (
    <main className="reserve-root bg-(--color-base-light)">
      {/* 右下の予約 dock（Airbnb 外部リンク）は、このページ自身が予約導線のため非表示にする */}
      <style>{`body:has(.reserve-root) .dock { display: none !important; }`}</style>

      <SiteHeader variant="page" current="Reserve" />

      {/* 写真なしの静かな導入 — ヘッダー分の余白を確保しつつ、下層ページの見出し級で始める */}
      <section className="px-6 pt-[clamp(140px,16vw,220px)] pb-[clamp(64px,6vw,96px)] md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="font-serif text-[22px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark)">
            {c.title}
          </h1>
          <p className="mt-6 md:mt-8 max-w-[640px] font-mincho text-[13px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[1.95] tracking-[0.07em] text-(--color-base-dark)/80">
            {c.lead}
          </p>
        </div>
      </section>

      {/* Availability calendar + Airbnb 予約ボタン */}
      <section className="px-6 pb-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <AvailabilityCalendar monthCount={3} />

          <div className="mt-14 md:mt-20 text-center md:text-left">
            <a
              href={SITE.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-4 bg-(--color-base-dark) text-(--color-base-light) font-serif text-[13px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.1em] px-8 py-4 hover:bg-(--color-base-dark)/85 transition-colors"
            >
              <span>{SITE.reserveButton}</span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ご利用にあたって — 注意事項の全文アコーディオン（初期閉、原文は copy.ts の NOTICES） */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <details className="group border-t border-(--color-base-dark)/15">
            <summary className="list-none cursor-pointer flex items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
              <span className="font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
                {c.notesTitle}
              </span>
              <span
                aria-hidden
                className="font-garamond text-[15px] text-(--color-base-dark)/60 transition-transform duration-300 group-open:rotate-45"
              >
                ＋
              </span>
            </summary>
            <ol className="border-t border-(--color-base-dark)/15">
              {NOTICES.map((text, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[32px_1fr] gap-x-4 border-b border-(--color-base-dark)/10 py-4"
                >
                  <span className="font-mincho text-[10.7px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.02em] text-(--color-base-dark)/40 pt-[2px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-mincho text-[12px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </section>
    </main>
  );
}
