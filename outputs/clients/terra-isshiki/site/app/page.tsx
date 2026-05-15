import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";

const HERO_SLIDES = [
  { src: "/images/hero/hero-01-living.jpg", alt: "TERRA HAYAMA リビングダイニング" },
  { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
  { src: "/images/hero/hero-03-dining.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
  { src: "/images/hero/hero-04-arch.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
];

const AIRBNB_URL =
  "https://www.airbnb.jp/rooms/1399746059557999139";

export default function Home() {
  return (
    <main className="bg-(--color-base-light)">
      <section className="relative isolate h-[100svh] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        {/* Slideshow */}
        <div aria-hidden className="absolute inset-0">
          {HERO_SLIDES.map((s, i) => (
            <div
              key={s.src}
              className="hero-slide"
              style={{ animationDelay: `${i * 8 - 1.5}s` }}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                quality={85}
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

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

        <SiteHeader variant="hero" current="Home" />


        {/* Main copy */}
        <div className="absolute bottom-[12svh] left-6 md:bottom-[14svh] md:left-12 z-10 max-w-[calc(100%-32px)] md:max-w-[80vw]">
          <p
            className="fade-up font-garamond italic text-[12px] md:text-[clamp(15px,1.02vw,26px)] tracking-[0.4em] text-(--color-base-light)/80 mb-6"
            style={{ animationDelay: "0.7s" }}
          >
            Hayama, Kanagawa
          </p>
          <h1
            className="fade-up font-serif font-medium text-[40px] leading-[1.18] md:text-[clamp(56px,5.47vw,140px)] md:leading-[1.12] tracking-[0.02em] text-(--color-base-light)"
            style={{ animationDelay: "0.95s" }}
          >
            <span className="block whitespace-nowrap">葉山の風景に、</span>
            <span className="block whitespace-nowrap">ゆっくり溶ける。</span>
          </h1>
          <p
            className="fade-up mt-6 md:mt-8 font-mincho text-[14px] md:text-[clamp(15px,0.94vw,24px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/80"
            style={{ animationDelay: "1.25s" }}
          >
            一色海岸まで徒歩 8 分。<br />
            葉山アイス屋 BEAT ICE が営む、海と山の物語に出会う宿。
          </p>
        </div>

        {/* Vertical CTA (right) */}
        <a
          href={AIRBNB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fade-up hidden xl:flex absolute right-6 2xl:right-12 top-1/2 z-10 -translate-y-1/2 vrl items-center gap-9 2xl:gap-12 px-5 py-10 2xl:px-7 2xl:py-14 bg-(--color-base-dark)/55 hover:bg-(--color-base-dark)/85 transition-colors duration-500 backdrop-blur-[3px] border border-(--color-base-light)/20"
          style={{ animationDelay: "1.5s" }}
        >
          <span className="font-mincho text-[clamp(16px,1.09vw,28px)] tracking-[0.45em] text-(--color-base-light)">
            予約は Airbnb から
          </span>
          <span
            aria-hidden
            className="font-garamond text-[clamp(12px,0.7vw,18px)] tracking-[0.32em] text-(--color-base-light)/75"
          >
            BOOK ↓
          </span>
        </a>

        {/* Mountain SVG silhouette (bottom) — soft Hayama coastline + twin peaks */}
        <svg
          aria-hidden
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 z-[3] h-[120px] w-full md:h-[170px] text-(--color-base-dark)/55"
        >
          <path
            d="M0,200 L0,118 C 80,100 180,88 280,96 C 380,104 460,140 560,128 C 650,118 720,72 820,82 C 920,92 980,128 1080,118 C 1180,108 1260,80 1360,92 C 1400,96 1430,104 1440,108 L1440,200 Z"
            fill="currentColor"
          />
          <path
            d="M0,200 L0,158 C 120,148 280,164 460,150 C 640,136 800,158 1000,148 C 1200,138 1340,158 1440,150 L1440,200 Z"
            fill="currentColor"
            opacity="0.5"
          />
        </svg>

        {/* Mobile / tablet bottom CTA — shown below xl, replaced by vertical side CTA at xl+ */}
        <a
          href={AIRBNB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fade-up xl:hidden absolute bottom-6 right-6 md:bottom-10 md:right-12 z-10 inline-flex items-center gap-3 md:gap-5 bg-(--color-base-dark)/75 px-5 py-3 md:px-9 md:py-5 text-(--color-base-light) backdrop-blur-[2px]"
          style={{ animationDelay: "1.35s" }}
        >
          <span className="font-mincho text-[13px] md:text-[clamp(15px,0.86vw,22px)] tracking-[0.32em]">
            予約は Airbnb から
          </span>
          <span
            aria-hidden
            className="font-garamond text-[10px] md:text-[clamp(12px,0.62vw,16px)] tracking-[0.32em] opacity-75"
          >
            ↗
          </span>
        </a>
      </section>

      {/* Concept teaser */}
      <section className="relative bg-(--color-paper) px-6 py-28 md:px-12 md:py-44">
        <div className="mx-auto max-w-[1480px] grid gap-12 md:grid-cols-[180px_1fr] md:gap-16">
          <div>
            <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-3">
              Concept
            </p>
            <p className="vrl hidden md:inline-block font-mincho text-[14px] md:text-[clamp(15px,0.94vw,24px)] tracking-[0.5em] text-(--color-base-dark)/55">
              風景に、息を整える。
            </p>
          </div>
          <div className="md:max-w-none">
            <h2 className="font-serif text-[28px] md:text-[clamp(36px,2.73vw,70px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-10 whitespace-nowrap">
              葉山への愛から生まれた、一棟貸しの宿。
            </h2>
            <p className="font-mincho text-[15px] md:text-[clamp(16px,0.94vw,24px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/85 mb-10">
              海越しに望む富士山、棚田が広がる里山。<br />
              ここでは、訪れる人と葉山との距離が、<br />
              ゆっくりとほどけていきます。
            </p>
            <Link
              href="/about"
              className="group inline-flex items-center gap-4 font-garamond text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
            >
              <span className="relative">
                More about TERRA
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden className="text-[14px]">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Section gateway cards */}
      <section className="relative bg-(--color-base-light) py-24 md:py-32">
        <div className="mx-auto max-w-[1640px] px-6 md:px-12">
          <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6 md:text-center">
            Explore
          </p>
          <h2 className="font-serif text-[26px] md:text-[clamp(34px,2.81vw,72px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) md:text-center mb-14 md:mb-20">
            <span className="block md:inline">空間と、</span>
            <span className="block md:inline">葉山の物語を歩く。</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2">
            {[
              {
                href: "/rooms",
                num: "01",
                en: "Rooms",
                jp: "部屋と空間",
                img: "/images/rooms/rooms-hero.jpg",
              },
              {
                href: "/about",
                num: "02",
                en: "About",
                jp: "宿のはじまり",
                img: "/images/about-exterior.jpg",
              },
              {
                href: "/stay",
                num: "03",
                en: "Stay",
                jp: "葉山で過ごす一日",
                img: "/images/stay/stay-tanada.jpg",
              },
              {
                href: "/access",
                num: "04",
                en: "Access",
                jp: "海まで徒歩 8 分",
                img: "/images/access/access-balcony.jpg",
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group relative block aspect-[2/3] overflow-hidden bg-(--color-base-dark)/10"
              >
                <Image
                  src={card.img}
                  alt={card.jp}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                  quality={84}
                  className="object-cover object-center transition-transform duration-[1100ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.06]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(26,20,16,0.10) 0%, rgba(26,20,16,0.05) 40%, rgba(26,20,16,0.65) 100%)",
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 lg:p-10 text-(--color-base-light)">
                  <p className="font-garamond italic text-[clamp(12px,0.7vw,18px)] md:text-[clamp(13px,0.78vw,20px)] tracking-[0.42em] uppercase opacity-85">
                    {card.num} — {card.en}
                  </p>
                  <div>
                    <h3 className="font-serif text-[24px] md:text-[clamp(24px,1.48vw,38px)] leading-[1.3] tracking-[0.04em] mb-2">
                      {card.jp}
                    </h3>
                    <p className="font-garamond text-[11px] md:text-[clamp(12px,0.62vw,16px)] tracking-[0.32em] uppercase opacity-75">
                      View ↗
                    </p>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-(--color-base-dark) text-(--color-base-light) px-6 py-16 md:px-12 md:py-24 lg:py-28">
        <div className="mx-auto max-w-[1640px] grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-serif text-[24px] md:text-[clamp(30px,2.19vw,56px)] tracking-[0.18em] mb-3">TERRA</p>
            <p className="font-garamond text-[11px] md:text-[clamp(12px,0.78vw,20px)] tracking-[0.42em] uppercase opacity-75 mb-6 md:mb-10">
              Hayama, Isshiki
            </p>
            <p className="font-mincho text-[13px] md:text-[clamp(14px,0.86vw,22px)] leading-[1.85] tracking-[0.06em] opacity-80">
              〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5<br />
              運営: 株式会社 BEAT ICE
            </p>
          </div>
          <a
            href={AIRBNB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-garamond text-[12px] md:text-[clamp(13px,0.7vw,18px)] tracking-[0.32em] uppercase border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>Reserve on Airbnb</span>
            <span aria-hidden>↗</span>
          </a>
        </div>
        <p className="mt-12 md:mt-16 font-garamond text-[10px] md:text-[11px] lg:text-[12px] tracking-[0.32em] uppercase opacity-55 text-center md:text-left">
          © 2026 TERRA HAYAMA. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
