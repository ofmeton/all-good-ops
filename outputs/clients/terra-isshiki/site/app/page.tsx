import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";
import { OpeningHero } from "./_components/OpeningHero";
import { RevealRoot } from "./_components/RevealRoot";

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

// TOP は「浅く広く網羅 → 詳細は各ページへ」。6章構成で C（多め）の情報量を受ける。
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
    en: "Ways",
    jp: "過ごし方",
    body: "まずは一色海岸へ。晴れた日は海越しの富士山を眺めて、宿に戻ったら、置いてある抹茶を一服。",
    img: "/images/access/access-balcony.jpg",
    cta: "View Ways",
  },
  {
    href: "/owner",
    num: "03",
    en: "Owner",
    jp: "営むのは、BEAT ICE",
    body: "葉山の棚田で育てたお米から、アイスクリームをつくる BEAT ICE。田んぼも、学校給食も、この宿も、夫婦の暮らしの続きにあります。",
    img: "/images/about-hero-tanada.jpg",
    cta: "About BEAT ICE",
  },
  {
    href: "/access",
    num: "04",
    en: "Neighborhood",
    jp: "周辺とアクセス",
    body: "一色海岸まで歩いて 8 分。スーパー、バス停、森戸海岸、上山口の棚田まで、どれくらいで行けるかをまとめています。",
    img: "/images/access/access-balcony.jpg",
    cta: "View Access",
  },
  {
    href: "/rooms#overview",
    num: "05",
    en: "Amenities",
    jp: "設備と備品",
    body: "キッチン、調理器具、洗濯、アメニティ、注意事項まで。予約の前に知りたい実用情報を、詳しめにまとめました。",
    img: "/images/rooms/kitchen-01.jpg",
    cta: "View Amenities",
  },
  {
    href: "/access#reservation",
    num: "06",
    en: "Reservation",
    jp: "予約と空き状況",
    body: "予約は Airbnb から。空き状況、住所、地図、到着前の基本情報まで、一か所で確認できます。",
    img: "/images/access/access-entrance.jpg",
    cta: "Check Availability",
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

      <OpeningHero slides={HERO_SLIDES}>
      {/* Section bands — 6 chapters: Rooms / Ways / Owner / Neighborhood / Amenities / Reservation */}
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
      </OpeningHero>

      <RevealRoot />
    </main>
  );
}
