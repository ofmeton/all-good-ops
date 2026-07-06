import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { OpeningHero } from "../_components/OpeningHero";
import { RevealRoot } from "../_components/RevealRoot";
import { ParallaxLayer } from "../_components/ParallaxLayer";
import { PhotoMarquee } from "../_components/PhotoMarquee";
import { FadeSlideshow } from "../_components/FadeSlideshow";
import { SiteFooter } from "../_components/SiteFooter";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";
import { localizeHref } from "../i18n/routing";
import { getDict } from "../i18n/dictionary";

/* 文言・写真パスはすべて app/copy.ts で編集できます。
   このファイルはレイアウト（見た目の構造）だけを持ちます。 */

/* ---------------------------------------------------------------
 * 章の要約ストリップ（帯の直下に置く paper 背景のまとまり）
 * --------------------------------------------------------------- */

function DetailShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 pt-[clamp(40px,4.5vw,72px)] pb-[clamp(64px,6.3vw,104px)] md:px-12">
      <div className="mx-auto max-w-[1480px]">
        {title ? (
          <div data-reveal className="reveal">
            <h3 className="font-serif text-[17px] md:text-[clamp(16.8px,1.2vw,30.8px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark)">
              {title}
            </h3>
          </div>
        ) : null}
        <div
          data-reveal
          className={title ? "reveal mt-10 md:mt-14" : "reveal"}
          style={title ? { transitionDelay: "120ms" } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function RoomsDetail({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const d = copy.TOP.roomsDetail;
  return (
    <div className="pt-[clamp(40px,4.5vw,72px)] pb-[clamp(64px,6.3vw,104px)]">
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        {/* Specs — nagare 型の一覧バー。詳細は /rooms#overview と同値 */}
        <dl
          data-reveal
          className="reveal grid grid-cols-2 gap-x-6 gap-y-8 max-w-[560px] border-t border-(--color-base-dark)/15 pt-8 md:mx-auto"
        >
          {d.specs.map((spec) => (
            <div key={spec.label}>
              <dt className="font-serif text-[12.8px] md:text-[clamp(var(--fs-lv4),0.71vw,18.2px)] tracking-[0.08em] text-(--color-base-dark)">
                {spec.label}
              </dt>
              <dd className="mt-3 font-mincho text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,18.2px)] tracking-[0.06em] text-(--color-base-dark)/90">
                {spec.value}
                {"note" in spec && spec.note ? (
                  <span className="mt-1 block text-[10.7px] md:text-[clamp(var(--fs-lv1),0.49vw,17px)] text-(--color-base-dark)/55">
                    {spec.note}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 部屋写真を緩やかに横へ流すマーキー（全幅） */}
      <div data-reveal className="reveal mt-12 md:mt-16">
        <PhotoMarquee images={d.marquee} />
        <div className="mx-auto max-w-[1480px] px-6 md:px-12">
          <Link
            href={localizeHref(d.moreHref, locale)}
            className="group mt-10 inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark) md:flex md:w-fit md:ml-auto"
          >
            <span className="relative">
              {d.moreCta}
              <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
            </span>
            <span aria-hidden className="text-[13px]">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function AccessDetail({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const d = copy.TOP.accessDetail;
  return (
    <DetailShell>
      {/* 所在地の要約 dl。地図は帯側の写真枠に額装済みのためここでは持たない */}
      <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10 max-w-[720px] md:mx-auto">
        {d.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[104px_1fr] gap-x-6 py-5 md:grid-cols-[132px_1fr]"
          >
            <dt className="font-serif text-[12.8px] md:text-[clamp(var(--fs-lv4),0.66vw,16.8px)] tracking-[0.08em] text-(--color-base-dark)/70 pt-[2px]">
              {row.label}
            </dt>
            <dd className="font-mincho text-[12.8px] md:text-[clamp(var(--fs-lv3),0.6vw,19.7px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        href={localizeHref(d.moreHref, locale)}
        className="group mt-10 inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark) md:flex md:w-fit md:ml-auto"
      >
        <span className="relative">
          {d.moreCta}
          <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
        </span>
        <span aria-hidden className="text-[13px]">→</span>
      </Link>
    </DetailShell>
  );
}

function AmenitiesDetail({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const d = copy.TOP.amenitiesDetail;
  return (
    <DetailShell>
      <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10 max-w-[880px] md:mx-auto">
        {d.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[104px_1fr] gap-x-6 py-5 md:grid-cols-[132px_1fr]"
          >
            <dt className="font-serif text-[12.8px] md:text-[clamp(var(--fs-lv4),0.66vw,16.8px)] tracking-[0.08em] text-(--color-base-dark)/70 pt-[2px]">
              {row.label}
            </dt>
            <dd className="font-mincho text-[12.8px] md:text-[clamp(var(--fs-lv3),0.6vw,19.7px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 font-mincho text-[11.5px] md:text-[clamp(var(--fs-lv2),0.55vw,18px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/60 md:mt-10 md:max-w-[880px] md:mx-auto">
        {d.note}
      </p>
      <Link
        href={localizeHref(d.moreHref, locale)}
        className="group mt-10 inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark) md:flex md:w-fit md:ml-auto"
      >
        <span className="relative">
          {d.moreCta}
          <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
        </span>
        <span aria-hidden className="text-[13px]">→</span>
      </Link>
    </DetailShell>
  );
}

function ReservationDetail({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const d = copy.TOP.reservationDetail;
  return (
    <DetailShell>
      {/* ご利用にあたって — 注意事項の全文アコーディオン（初期閉、原文は copy.ts の NOTICES）。
          予約・空き状況の導線は帯自体（写真・タイトル）と /reserve ページに一本化したため、
          ここには重複する info / Airbnb ボタンは置かず、末尾に /reserve への入口リンクを1つだけ添える。
          md:pr-16: 右端固定の予約 dock と ＋ マークが中間幅(1280-1500px)で重ならないよう内側に寄せる */}
      <details className="group max-w-[720px] border-t border-(--color-base-dark)/15 md:pr-16 md:mx-auto">
        <summary className="list-none cursor-pointer flex items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
          <span className="font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
            {d.notesTitle}
          </span>
          <span
            aria-hidden
            className="font-garamond text-[15px] text-(--color-base-dark)/60 transition-transform duration-300 group-open:rotate-45"
          >
            ＋
          </span>
        </summary>
        <ol className="border-t border-(--color-base-dark)/15">
          {copy.NOTICES.map((text, i) => (
            <li
              key={i}
              className="grid grid-cols-[32px_1fr] gap-x-4 border-b border-(--color-base-dark)/10 py-4"
            >
              <span className="font-mincho text-[10.7px] md:text-[clamp(var(--fs-lv1),0.49vw,16.3px)] tracking-[0.02em] text-(--color-base-dark)/40 pt-[2px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-mincho text-[12px] md:text-[clamp(var(--fs-lv2),0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </details>
      <Link
        href={localizeHref(d.availabilityHref, locale)}
        className="group mt-8 inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark) md:flex md:w-fit md:ml-auto"
      >
        <span className="relative">
          {d.availabilityCta}
          <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
        </span>
        <span aria-hidden className="text-[13px]">→</span>
      </Link>
    </DetailShell>
  );
}

/* ---------------------------------------------------------------
 * 6 章の帯 + 要約ストリップ。
 * TOP は「下までスクロールすれば主要な情報が揃う」構成。
 * 帯 = 章の入口（タイトル → 写真 → 導入文 → 詳細リンク）、
 * ストリップ = その章の実用情報の要約。深掘りは各ページへ。
 * データ駆動: bands の要素に `mapEmbed: true` があれば、写真の代わりに
 * Google マップ埋め込みを額装する（アクセス章のみ想定）。
 * --------------------------------------------------------------- */

// 帯と同じ並び順で対応する要約ストリップ
const DETAILS = [
  RoomsDetail,
  AmenitiesDetail,
  null, // 過ごし方 — 帯ヘッドの slides スライドショーで見せる（章直下のストリップは無し）
  AccessDetail,
  null, // BEAT ICE — 帯だけ（章直下のストリップは無し）
  ReservationDetail,
];

export function HomeView({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const { SITE, TOP } = copy;
  const t = getDict(locale);
  const MAPS_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&z=16&output=embed`;

  return (
    <main className="bg-(--color-base-light)">
      {/* SiteHeader は hero section の外（main 直下）に置く。
          hero section の `isolate` が作るスタッキングコンテキストに
          fixed ヘッダーを閉じ込めると、スクロールで後続セクションが
          ヘッダーを覆い、ハンバーガーが押せなくなるため。 */}
      <SiteHeader variant="hero" current="Home" locale={locale} copy={copy} />

      <OpeningHero slides={TOP.heroSlides} opening={copy.OPENING}>
      {/* Section bands — 6 chapters */}
      <section className="relative">
        {TOP.bands.map((band, i) => {
          const imageFirst = i % 2 === 1; // PC で画像を左右交互に
          const Detail = DETAILS[i];
          return (
            <div key={band.href} className={i % 2 === 1 ? "bg-(--color-paper)" : "bg-(--color-base-light)"}>
              {/* 帯 — モバイルは「タイトル → 写真 → 本文 → CTA」の縦積み。
                  PC は 2 カラムで、タイトルと本文を片側、写真を反対側に置く。
                  （コンテナに border-t を付けると FV 直下に薄い横線が出るため付けない） */}
              <div className="grid items-center md:grid-cols-2 md:gap-x-12 lg:gap-x-20">
                {/* タイトル — 本文/CTAが両方無い帯（例: 設備・備品）は縦の相方が居ないため、
                    self-end(写真下端)ではなく、行を写真と同じ2行分(md:row-span-2)に広げた上で
                    self-center(写真の高さ全体の中央)に自動で揃える */}
                <h2
                  data-reveal
                  className={`reveal sec-title px-6 pt-[clamp(48px,6vw,88px)] md:px-12 lg:px-20 md:pt-0 ${
                    band.body || band.cta ? "md:self-end" : "md:self-center md:row-span-2"
                  } font-serif font-medium text-[23px] md:text-[clamp(21px,1.8vw,47px)] leading-[1.3] tracking-[0.04em] text-(--color-base-dark) md:row-start-1 ${
                    imageFirst ? "md:col-start-2" : "md:col-start-1"
                  }`}
                >
                  {band.title}
                </h2>

                {/* 写真 — タイトルの下（モバイル）／反対カラムで 2 行ぶち抜き（PC）。
                    アクセス章はヘッド写真の代わりに地図を「一枚の写真」として額装する */}
                {"slides" in band && band.slides ? (
                  <Link
                    href={localizeHref(band.href, locale)}
                    aria-label={t.bandViewAria(band.title)}
                    data-reveal
                    className={`reveal group photo-float block relative mt-8 mx-5 aspect-[4/3] overflow-hidden bg-(--color-base-dark)/10 md:mt-0 md:mx-8 lg:mx-10 md:my-8 lg:my-10 md:aspect-auto md:min-h-[60svh] md:self-stretch md:row-span-2 md:row-start-1 ${
                      imageFirst ? "md:col-start-1" : "md:col-start-2"
                    }`}
                  >
                    <FadeSlideshow
                      images={band.slides}
                      className="h-full w-full"
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(26,20,16,0.04) 0%, rgba(26,20,16,0.18) 100%)",
                      }}
                    />
                  </Link>
                ) : "mapEmbed" in band && band.mapEmbed ? (
                  <div
                    data-reveal
                    className={`reveal photo-float relative mt-8 mx-5 aspect-[4/3] overflow-hidden bg-(--color-base-light) md:mt-0 md:mx-8 lg:mx-10 md:my-8 lg:my-10 md:aspect-auto md:min-h-[60svh] md:self-stretch md:row-span-2 md:row-start-1 ${
                      imageFirst ? "md:col-start-1" : "md:col-start-2"
                    }`}
                  >
                    <iframe
                      src={MAPS_EMBED}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full"
                      style={{ border: 0, filter: "grayscale(0.4) sepia(0.05)" }}
                      title={TOP.accessDetail.iframeTitle}
                    />
                  </div>
                ) : (
                  <Link
                    href={localizeHref(band.href, locale)}
                    aria-label={t.bandViewAria(band.title)}
                    data-reveal
                    className={`reveal group photo-float block relative mt-8 mx-5 aspect-[4/3] overflow-hidden bg-(--color-base-dark)/10 md:mt-0 md:mx-8 lg:mx-10 md:my-8 lg:my-10 md:aspect-auto md:min-h-[60svh] md:self-stretch md:row-span-2 md:row-start-1 ${
                      imageFirst ? "md:col-start-1" : "md:col-start-2"
                    }`}
                  >
                    <ParallaxLayer>
                      <Image
                        src={band.img}
                        alt={band.title}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        quality={84}
                        className="object-cover object-center"
                      />
                    </ParallaxLayer>
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(26,20,16,0.04) 0%, rgba(26,20,16,0.18) 100%)",
                      }}
                    />
                  </Link>
                )}

                {/* 本文 + CTA — 両方空の帯（例: 設備）は div ごと出さない。
                    CTA が無い帯は次セクションまでの余白を詰める（CTA 用の広い pb を残さない） */}
                {(band.body || band.cta) ? (
                  <div
                    data-reveal
                    className={`reveal px-6 pt-8 md:px-12 lg:px-20 md:pt-6 md:pb-0 md:self-start md:row-start-2 ${
                      band.cta ? "pb-[clamp(48px,6vw,88px)]" : "pb-[clamp(24px,3.2vw,44px)]"
                    } ${imageFirst ? "md:col-start-2" : "md:col-start-1"}`}
                    style={{ transitionDelay: "120ms" }}
                  >
                    {band.body ? (
                      <p
                        className={`font-mincho text-[13.5px] md:text-[clamp(var(--fs-lv3),0.71vw,18.2px)] leading-[2.0] tracking-[0.07em] text-(--color-base-dark)/85 md:max-w-[460px] ${
                          band.cta ? "mb-10" : ""
                        }`}
                      >
                        {band.body.split("\n").map((line, li, arr) => (
                          <span key={li}>
                            {line}
                            {li < arr.length - 1 ? <br /> : null}
                          </span>
                        ))}
                      </p>
                    ) : null}
                    {band.cta ? (
                      <Link
                        href={localizeHref(band.href, locale)}
                        className="group inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
                      >
                        <span className="relative">
                          {band.cta}
                          <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
                        </span>
                        <span aria-hidden className="text-[13px]">→</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* 章の要約ストリップ — TOP だけで主要情報を追える密度に */}
              {Detail ? <Detail copy={copy} locale={locale} /> : null}
            </div>
          );
        })}
      </section>

      <SiteFooter copy={copy} locale={locale} />
      </OpeningHero>

      <RevealRoot />
    </main>
  );
}
