import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";
import { HeroSlideshow } from "./_components/HeroSlideshow";
import { RevealRoot } from "./_components/RevealRoot";

// スクロール最初に要点を掴める「ファクト帯」。
const FACTS = [
  { label: "Type", value: "一棟貸し" },
  { label: "Capacity", value: "最大 8 名" },
  { label: "Size", value: "75 ㎡" },
  { label: "Parking", value: "2 台" },
  { label: "Check-in / out", value: "16:00 / 11:00" },
  { label: "Beach", value: "徒歩 8 分" },
];

// 設備ハイライト（詳細は Rooms へ）。
const AMENITIES = [
  "フルキッチン",
  "ひのきの風呂",
  "ドラム式洗濯機",
  "抹茶マシーン",
  "高速 Wi-Fi",
  "駐車場 2 台",
  "TV / 動画配信",
  "各室エアコン",
];

// FV は「建物の外観・内観が伝わる写真」のみ（世界観カットは不使用）。
// 外観 → 内観を交互に並べ、第一印象で建物が伝わる構成。
const HERO_SLIDES = [
  { src: "/images/hero/hero-exterior-01.jpg", alt: "TERRA HAYAMA 外観 — 白漆喰と焼杉の蔵のような佇まい" },
  { src: "/images/hero/hero-01-living.jpg", alt: "TERRA HAYAMA リビングダイニング" },
  { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
  { src: "/images/hero/hero-exterior-02.jpg", alt: "TERRA HAYAMA 外観 — 葉山一色の住宅地に建つ一軒家" },
  { src: "/images/hero/hero-03-dining.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
  { src: "/images/hero/hero-04-arch.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
];

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

// TOP は「浅く広く網羅 → 詳細は各ページへ」。各セクションを概要 + 写真 + → で並べる。
const BANDS = [
  {
    href: "/rooms",
    num: "01",
    en: "Rooms",
    jp: "部屋と空間",
    body: "一軒家の二階を、一棟まるごと。最大 8 名で泊まれるゆとりの間取りに、LDK・寝室・ひのきのバス・フルキッチンが整います。",
    img: "/images/rooms/rooms-hero.jpg",
    cta: "View Rooms",
  },
  {
    href: "/stay",
    num: "02",
    en: "Stay",
    jp: "葉山で過ごす一日",
    body: "棚田で米にふれ、抹茶を点て、海辺を歩く。何もしない贅沢から土地の営みまで、葉山らしい時間の過ごし方を。",
    img: "/images/stay/stay-matcha.jpg",
    cta: "View Stay",
  },
  {
    href: "/owner",
    num: "03",
    en: "Owner",
    jp: "営むのは、BEAT ICE",
    body: "葉山の棚田で育てたお米から、手づくりのアイスを生み出す BEAT ICE。学校給食や田畑の営みを行き来する暮らしが、この宿のかたちを支えています。",
    img: "/images/about-hero-tanada.jpg",
    cta: "About BEAT ICE",
  },
  {
    href: "/access",
    num: "04",
    en: "Access",
    jp: "海まで徒歩 8 分",
    body: "一色海岸まで歩いて 8 分。海と里山に抱かれた静かな住宅地に佇み、葉山の暮らしの中へ自然に溶け込んでいきます。",
    img: "/images/access/access-balcony.jpg",
    cta: "View Access",
  },
];

export default function Home() {
  return (
    <main className="bg-(--color-base-light)">
      {/* SiteHeader は hero section の外（main 直下）に置く。
          hero section の `isolate` が作るスタッキングコンテキストに
          fixed ヘッダーを閉じ込めると、スクロールで後続セクションが
          ヘッダーを覆い、ハンバーガーが押せなくなるため。 */}
      <SiteHeader variant="hero" current="Home" />

      <section className="relative isolate h-[100svh] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        {/* Slideshow */}
        <HeroSlideshow slides={HERO_SLIDES} intervalMs={4500} fadeMs={1200} />

        {/* Overlay: vertical vignette for top/bottom legibility, photo breathes in middle */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,20,16,0.32) 0%, rgba(26,20,16,0.06) 22%, rgba(26,20,16,0.06) 50%, rgba(26,20,16,0.62) 100%)",
          }}
        />

        {/* Subtle paper noise */}
        <div aria-hidden className="paper-noise absolute inset-0 z-[2]" />

        {/* Local legibility scrim — 写真の明暗に依存せずコピーを必ず読めるように、
            下端側を確実に暗くする（特にスマホ）。コピー(z-10)の背後 z-[3]。 */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[3] h-[58%] md:h-[48%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,20,16,0) 0%, rgba(26,20,16,0.42) 55%, rgba(26,20,16,0.72) 100%)",
          }}
        />

        {/* Main copy — anchored to bottom-left corner.
            スマホは下部の予約バー(MobileStickyReserve)と重ならないよう余白を確保。 */}
        <div className="absolute bottom-24 left-6 md:bottom-20 md:left-12 z-10 max-w-[calc(100%-32px)] md:max-w-[80vw]">
          <p
            className="fade-up font-garamond italic text-[11px] md:text-[clamp(10.5px,0.71vw,18.2px)] tracking-[0.4em] text-(--color-base-light)/85 mb-6"
            style={{ animationDelay: "0.7s" }}
          >
            Hayama, Kanagawa
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(21px,6vw,30px)] leading-[1.2] md:text-[clamp(19.6px,1.75vw,42px)] md:leading-[1.12] tracking-[0.02em] text-(--color-base-light)"
            style={{ animationDelay: "0.95s" }}
          >
            <span className="block whitespace-nowrap">ゆっくり流れる、</span>
            <span className="block whitespace-nowrap">葉山時間。</span>
          </h1>
          <p
            className="fade-up mt-6 md:mt-8 font-mincho text-[14px] md:text-[clamp(10.5px,0.66vw,16.8px)] leading-[1.9] tracking-[0.08em] text-(--color-base-light)/90"
            style={{ animationDelay: "1.25s" }}
          >
            一色海岸まで徒歩 8 分。<br />
            BEAT ICE が手がける、葉山一色の一棟貸し。
          </p>
        </div>
      </section>

      {/* Facts strip — スクロール最初に要点を掴む */}
      <section className="relative bg-(--color-base-light) border-b border-(--color-base-dark)/8 px-6 md:px-12">
        <dl className="mx-auto max-w-[1480px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {FACTS.map((f, i) => (
            <div
              key={f.label}
              data-reveal
              className="reveal flex flex-col gap-2 px-2 py-7 md:py-9 border-t border-(--color-base-dark)/10"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <dt className="font-garamond italic text-[9.5px] md:text-[clamp(8.4px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
                {f.label}
              </dt>
              <dd className="font-serif text-[14px] md:text-[clamp(13px,0.9vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Concept — about から移設した本文 */}
      <section className="relative bg-(--color-paper) px-6 py-[clamp(112px,11.5vw,176px)] md:px-12">
        <div className="mx-auto max-w-[1280px] grid gap-12 md:grid-cols-[180px_1fr] md:gap-16">
          <div className="md:pt-2">
            <p className="font-garamond italic text-[clamp(11px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-3">
              Concept
            </p>
            <p className="vrl hidden md:inline-block font-mincho text-[12px] md:text-[clamp(10.5px,0.66vw,16.8px)] tracking-[0.5em] text-(--color-base-dark)/55">
              風景に、息を整える。
            </p>
          </div>
          <div data-reveal className="reveal min-w-0">
            <h2 className="font-serif text-[18px] md:text-[clamp(19.04px,1.4vw,35.84px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-10">
              <span className="block">葉山への愛から生まれた、</span>
              <span className="block">一棟貸しの宿。</span>
            </h2>
            <div className="space-y-8 font-mincho text-[13.5px] md:text-[clamp(11.76px,0.69vw,17.64px)] leading-[2.0] tracking-[0.07em] text-(--color-base-dark)/85">
              <p>
                TERRA は、葉山への愛から生まれました。<br />
                海越しに望む富士山、棚田が広がる里山。<br />
                この土地に暮らして十年、私たちは今もなお、<br />
                この町の風景に魅了され続けています。
              </p>
              <p>
                風景とはきっと、人の営みと自然が<br />
                ゆっくりと重なり合い、<br />
                時間をかけて育まれてきたもの。
              </p>
              <p>
                海と山が織りなす自然のリズム、<br />
                ここに息づく人々の物語。<br />
                それらに触れる中で、時の流れが少し緩み、<br />
                呼吸が整っていく。
              </p>
              <p className="text-(--color-base-dark)/75">
                ここでは、訪れる人と葉山との距離が、<br />
                ゆっくりとほどけていきます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section bands — Rooms / Stay / Owner / Access */}
      <section className="relative bg-(--color-base-light)">
        {BANDS.map((band, i) => {
          const imageFirst = i % 2 === 1; // 交互レイアウト
          return (
            <div
              key={band.href}
              className={`grid items-stretch border-t border-(--color-base-dark)/8 md:grid-cols-2 ${
                imageFirst ? "" : "md:[&>a]:order-2"
              }`}
            >
              <Link
                href={band.href}
                aria-label={`${band.jp}（${band.en}）を見る`}
                data-reveal
                className="reveal group relative aspect-[4/3] md:aspect-auto md:min-h-[68svh] w-full overflow-hidden bg-(--color-base-dark)/10"
              >
                <Image
                  src={band.img}
                  alt={band.jp}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  quality={84}
                  className="object-cover object-center transition-transform duration-[1100ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.05]"
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

              <div
                data-reveal
                className="reveal px-6 py-[clamp(56px,7vw,112px)] md:px-12 lg:px-20 flex flex-col justify-center"
                style={{ transitionDelay: "120ms" }}
              >
                <p className="font-garamond italic text-[11px] md:text-[clamp(9.1px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-5">
                  {band.num} — {band.en}
                </p>
                <h2 className="font-serif text-[21px] md:text-[clamp(20.16px,1.74vw,44.8px)] leading-[1.3] tracking-[0.04em] text-(--color-base-dark) mb-7">
                  {band.jp}
                </h2>
                <p className="font-mincho text-[13.5px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.0] tracking-[0.07em] text-(--color-base-dark)/85 md:max-w-[460px] mb-10">
                  {band.body}
                </p>
                <Link
                  href={band.href}
                  className="group inline-flex items-center gap-4 font-garamond text-[11px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
                >
                  <span className="relative">
                    {band.cta}
                    <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
                  </span>
                  <span aria-hidden className="text-[12px]">→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Amenities highlight — 設備ハイライト（詳細は Rooms へ） */}
      <section className="relative bg-(--color-paper) px-6 py-[clamp(80px,8vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1480px]">
          <p
            data-reveal
            className="reveal font-garamond italic text-[clamp(11px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-4"
          >
            Amenities
          </p>
          <h2
            data-reveal
            className="reveal font-serif text-[18px] md:text-[clamp(17.92px,1.4vw,35.84px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-12 md:mb-16"
          >
            暮らすように過ごす、設備。
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-(--color-base-dark)/10 border border-(--color-base-dark)/10">
            {AMENITIES.map((a, i) => (
              <li
                key={a}
                data-reveal
                className="reveal bg-(--color-paper) px-5 py-7 md:py-9 font-mincho text-[13.5px] md:text-[clamp(11.2px,0.71vw,18.2px)] tracking-[0.06em] text-(--color-base-dark)/85"
                style={{ transitionDelay: `${i * 55}ms` }}
              >
                {a}
              </li>
            ))}
          </ul>
          <div data-reveal className="reveal mt-12">
            <Link
              href="/rooms"
              className="group inline-flex items-center gap-4 font-garamond text-[11px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
            >
              <span className="relative">
                View all facilities
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden className="text-[12px]">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-(--color-base-dark) text-(--color-base-light) px-6 py-[clamp(64px,7vw,112px)] md:px-12">
        <div className="mx-auto max-w-[1640px] grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-serif text-[20px] md:text-[clamp(21px,1.53vw,39.2px)] tracking-[0.18em] mb-3">TERRA</p>
            <p className="font-garamond text-[9.5px] md:text-[clamp(8.4px,0.55vw,14px)] tracking-[0.42em] uppercase opacity-75 mb-6 md:mb-10">
              Hayama, Isshiki
            </p>
            <p className="font-mincho text-[11.5px] md:text-[clamp(9.8px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] opacity-80">
              〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5<br />
              運営: 株式会社 BEAT ICE
            </p>
          </div>
          <a
            href={AIRBNB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-garamond text-[10.5px] md:text-[clamp(9.1px,0.49vw,12.6px)] tracking-[0.32em] uppercase border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>Reserve on Airbnb</span>
            <span aria-hidden className="cta-arrow group-hover:[animation-play-state:paused]">→</span>
          </a>
        </div>
        <p className="mt-12 md:mt-16 font-garamond text-[8.5px] md:text-[7.7px] lg:text-[8.4px] tracking-[0.32em] uppercase opacity-55 text-center md:text-left">
          © 2026 TERRA HAYAMA. All rights reserved.
        </p>
      </footer>

      <RevealRoot />
    </main>
  );
}
