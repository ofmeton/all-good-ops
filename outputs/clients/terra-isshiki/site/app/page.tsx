import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";
import { OpeningHero } from "./_components/OpeningHero";
import { RevealRoot } from "./_components/RevealRoot";
import { ParallaxLayer } from "./_components/ParallaxLayer";
import { PhotoMarquee } from "./_components/PhotoMarquee";
import { PeekSlideshow } from "./_components/PeekSlideshow";
import { SITE, TOP, POINTS } from "./copy";

/* 文言・写真パスはすべて app/copy.ts で編集できます。
   このファイルはレイアウト（見た目の構造）だけを持ちます。 */

const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  SITE.mapQuery,
)}`;

/* ---------------------------------------------------------------
 * 章の要約ストリップ（帯の直下に置く paper 背景のまとまり）
 * --------------------------------------------------------------- */

function DetailShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 pt-[clamp(40px,4.5vw,72px)] pb-[clamp(64px,6.3vw,104px)] md:px-12">
      <div className="mx-auto max-w-[1480px]">
        <div data-reveal className="reveal">
          <h3 className="font-serif text-[17px] md:text-[clamp(16.8px,1.2vw,30.8px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark)">
            {title}
          </h3>
        </div>
        <div data-reveal className="reveal mt-10 md:mt-14" style={{ transitionDelay: "120ms" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function RoomsDetail() {
  const d = TOP.roomsDetail;
  return (
    <div className="pt-[clamp(40px,4.5vw,72px)] pb-[clamp(64px,6.3vw,104px)]">
      <div className="mx-auto max-w-[1480px] px-6 md:px-12">
        <div data-reveal className="reveal">
          <h3 className="font-serif text-[17px] md:text-[clamp(16.8px,1.2vw,30.8px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark)">
            {d.title}
          </h3>
        </div>
        {/* Specs — nagare 型の一覧バー。詳細は /rooms#overview と同値 */}
        <dl
          data-reveal
          className="reveal mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-(--color-base-dark)/15 pt-8 sm:grid-cols-3 md:mt-14 md:grid-cols-5"
          style={{ transitionDelay: "120ms" }}
        >
          {d.specs.map((spec) => (
            <div key={spec.label}>
              <dt className="font-serif text-[12.8px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.08em] text-(--color-base-dark)">
                {spec.label}
              </dt>
              <dd className="mt-3 font-mincho text-[13.5px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.06em] text-(--color-base-dark)/90">
                {spec.value}
                {"note" in spec && spec.note ? (
                  <span className="mt-1 block text-[10.7px] md:text-[clamp(9.1px,0.49vw,12.6px)] text-(--color-base-dark)/55">
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
            href={d.moreHref}
            className="group mt-10 inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
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

function StayDetail() {
  const d = TOP.stayDetail;
  return (
    <div className="pt-[clamp(40px,4.5vw,72px)] pb-[clamp(64px,6.3vw,104px)]">
      {/* 写真のちょい見せスライドショー（テキストは載せない）。
          リンクは帯の「過ごし方を見る」に一本化（重複させない）。 */}
      <div data-reveal className="reveal">
        <PeekSlideshow images={d.slideshow} />
      </div>
    </div>
  );
}

function OwnerDetail() {
  const d = TOP.ownerDetail;
  return (
    <DetailShell title={d.title}>
      <p className="max-w-[820px] font-mincho text-[13px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.05] tracking-[0.07em] text-(--color-base-dark)/85">
        {d.intro}
      </p>

      <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-16 md:gap-x-8 lg:grid-cols-4">
        {d.works.map((work) => (
          <div key={work.title}>
            <div className="photo-float relative aspect-[4/3] w-full overflow-hidden bg-(--color-base-dark)/8">
              <ParallaxLayer>
                <Image
                  src={work.img}
                  alt={`TERRA HAYAMA — ${work.title}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  quality={84}
                  className="object-cover object-center"
                />
              </ParallaxLayer>
            </div>
            <h4 className="mt-4 font-serif text-[13.5px] md:text-[clamp(13.3px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
              {work.title}
            </h4>
            <p className="mt-2 font-mincho text-[11.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.9] tracking-[0.06em] text-(--color-base-dark)/80">
              {work.body}
            </p>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function NeighborhoodDetail() {
  const d = TOP.neighborhoodDetail;
  return (
    <DetailShell title={d.title}>
      <div className="border-t border-(--color-base-dark)/15">
        <div className="grid grid-cols-[64px_1fr] gap-x-6 py-5 md:grid-cols-[96px_1fr]">
          <p className="font-serif text-[12.8px] md:text-[clamp(11.9px,0.66vw,16.8px)] tracking-[0.08em] text-(--color-base-dark)/70 pt-[2px]">
            {d.addressLabel}
          </p>
          <div>
            <p className="font-mincho text-[12.8px] md:text-[clamp(11.2px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
              {SITE.postalAddress}
            </p>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 inline-flex items-center gap-3 font-serif text-[12px] md:text-[clamp(11.2px,0.6vw,15.4px)] tracking-[0.06em] text-(--color-base-dark)/70"
            >
              <span className="relative">
                {d.mapsCta}
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/25 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>

      <ul className="mt-6 grid gap-y-3 md:grid-cols-2 md:gap-x-12 md:gap-y-4">
        {POINTS.map((p) => (
          <li
            key={p.name}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-(--color-base-dark)/10 py-3"
          >
            <div>
              <p className="font-serif text-[14px] md:text-[clamp(13.3px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
                {p.name}
              </p>
              <p className="mt-1.5 font-mincho text-[11px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.06em] text-(--color-base-dark)/65">
                {p.note}
              </p>
            </div>
            <p className="font-mincho text-[11px] md:text-[clamp(10.5px,0.55vw,14px)] tracking-[0.08em] text-(--color-base-dark)/70 whitespace-nowrap">
              {p.time}
            </p>
          </li>
        ))}
      </ul>
    </DetailShell>
  );
}

function AmenitiesDetail() {
  const d = TOP.amenitiesDetail;
  return (
    <DetailShell title={d.title}>
      <dl className="grid gap-y-8 md:grid-cols-2 md:gap-x-16 md:gap-y-10">
        {d.groups.map((group) => (
          <div key={group.title} className="border-t border-(--color-base-dark)/15 pt-5">
            <dt className="mb-3 font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
              {group.title}
            </dt>
            <dd className="font-mincho text-[12px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
              {group.body}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 font-mincho text-[11.5px] md:text-[clamp(10.5px,0.55vw,14px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/60 md:mt-12">
        {d.note}
      </p>
    </DetailShell>
  );
}

function ReservationDetail() {
  const d = TOP.reservationDetail;
  return (
    <DetailShell title={d.title}>
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        {/* 予約の基本 */}
        <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10">
          {d.info.map((info) => (
            <div
              key={info.label}
              className="grid grid-cols-[112px_1fr] gap-x-6 py-5 md:grid-cols-[160px_1fr]"
            >
              <dt className="font-serif text-[12.8px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.08em] text-(--color-base-dark)">
                {info.label}
              </dt>
              <dd className="font-mincho text-[12.8px] md:text-[clamp(11.2px,0.66vw,16.8px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90 pt-[2px]">
                {info.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* 到着前に知っておきたいこと */}
        <div>
          <p className="border-t border-(--color-base-dark)/15 pt-5 mb-2 font-serif text-[14.5px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
            {d.notesTitle}
          </p>
          <ol>
            {d.notes.map((text, i) => (
              <li
                key={text}
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
          <Link
            href={d.allNotesHref}
            className="group mt-6 inline-flex items-center gap-3 font-serif text-[12px] md:text-[clamp(11.2px,0.6vw,15.4px)] tracking-[0.06em] text-(--color-base-dark)/70"
          >
            <span className="relative">
              {d.allNotesCta}
              <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/25 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
            </span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-10 md:mt-16">
        <a
          href={SITE.airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-4 bg-(--color-base-dark) text-(--color-base-light) font-serif text-[13px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.1em] px-8 py-4 hover:bg-(--color-base-dark)/85 transition-colors"
        >
          <span>{SITE.reserveButton}</span>
          <span aria-hidden>→</span>
        </a>
        <Link
          href={d.availabilityHref}
          className="group inline-flex items-center gap-4 font-serif text-[13px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
        >
          <span className="relative">
            {d.availabilityCta}
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </DetailShell>
  );
}

/* ---------------------------------------------------------------
 * 6 章の帯 + 要約ストリップ。
 * TOP は「下までスクロールすれば主要な情報が揃う」構成。
 * 帯 = 章の入口（タイトル → 写真 → 導入文 → 詳細リンク）、
 * ストリップ = その章の実用情報の要約。深掘りは各ページへ。
 * --------------------------------------------------------------- */

// 帯と同じ並び順で対応する要約ストリップ
const DETAILS = [
  RoomsDetail,
  StayDetail,
  OwnerDetail,
  NeighborhoodDetail,
  AmenitiesDetail,
  ReservationDetail,
];

export default function Home() {
  return (
    <main className="bg-(--color-base-light)">
      {/* SiteHeader は hero section の外（main 直下）に置く。
          hero section の `isolate` が作るスタッキングコンテキストに
          fixed ヘッダーを閉じ込めると、スクロールで後続セクションが
          ヘッダーを覆い、ハンバーガーが押せなくなるため。 */}
      <SiteHeader variant="hero" current="Home" />

      <OpeningHero slides={TOP.heroSlides}>
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
                {/* タイトル */}
                <h2
                  data-reveal
                  className={`reveal sec-title px-6 pt-[clamp(48px,6vw,88px)] md:px-12 lg:px-20 md:pt-0 md:self-end font-serif font-medium text-[23px] md:text-[clamp(21px,1.8vw,47px)] leading-[1.3] tracking-[0.04em] text-(--color-base-dark) md:row-start-1 ${
                    imageFirst ? "md:col-start-2" : "md:col-start-1"
                  }`}
                >
                  {band.title}
                </h2>

                {/* 写真 — タイトルの下（モバイル）／反対カラムで 2 行ぶち抜き（PC） */}
                <Link
                  href={band.href}
                  aria-label={`${band.title}を見る`}
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

                {/* 本文 + CTA */}
                <div
                  data-reveal
                  className={`reveal px-6 pt-8 pb-[clamp(48px,6vw,88px)] md:px-12 lg:px-20 md:pt-6 md:pb-0 md:self-start md:row-start-2 ${
                    imageFirst ? "md:col-start-2" : "md:col-start-1"
                  }`}
                  style={{ transitionDelay: "120ms" }}
                >
                  <p className="font-mincho text-[13.5px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.0] tracking-[0.07em] text-(--color-base-dark)/85 md:max-w-[460px] mb-10">
                    {band.body}
                  </p>
                  <Link
                    href={band.href}
                    className="group inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
                  >
                    <span className="relative">
                      {band.cta}
                      <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
                    </span>
                    <span aria-hidden className="text-[13px]">→</span>
                  </Link>
                </div>
              </div>

              {/* 章の要約ストリップ — TOP だけで主要情報を追える密度に */}
              {Detail ? <Detail /> : null}
            </div>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="bg-(--color-base-dark) text-(--color-base-light) px-6 py-[clamp(64px,7vw,112px)] md:px-12">
        <div className="mx-auto max-w-[1640px] grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-serif text-[20px] md:text-[clamp(21px,1.53vw,39.2px)] tracking-[0.18em] mb-3">
              {SITE.footerBrand}
            </p>
            <p className="font-garamond text-[9.5px] md:text-[clamp(8.4px,0.55vw,14px)] tracking-[0.42em] uppercase opacity-75 mb-6 md:mb-10">
              {SITE.footerArea}
            </p>
            <p className="font-mincho text-[11.5px] md:text-[clamp(9.8px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] opacity-80">
              {SITE.postalAddress}
              <br />
              {SITE.operator}
            </p>
          </div>
          <a
            href={SITE.airbnbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-serif text-[12.5px] md:text-[clamp(11.2px,0.6vw,15.4px)] tracking-[0.1em] border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>{SITE.reserveButton}</span>
            <span aria-hidden className="cta-arrow group-hover:[animation-play-state:paused]">→</span>
          </a>
        </div>
        <p className="mt-12 md:mt-16 font-garamond text-[8.5px] md:text-[7.7px] lg:text-[8.4px] tracking-[0.32em] uppercase opacity-55 text-center md:text-left">
          {SITE.copyright}
        </p>
      </footer>
      </OpeningHero>

      <RevealRoot />
    </main>
  );
}
