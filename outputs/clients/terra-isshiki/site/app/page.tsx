import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./_components/SiteHeader";
import { HeroSlideshow } from "./_components/HeroSlideshow";

const HERO_SLIDES = [
  { src: "/images/hero/hero-01-living.jpg", alt: "TERRA HAYAMA リビングダイニング" },
  { src: "/images/hero/hero-05-135.jpg", alt: "TERRA HAYAMA 押し花と『Beat Ice Harmony』の詩" },
  { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
  { src: "/images/hero/hero-06-137.jpg", alt: "TERRA HAYAMA 床の間に飾られた棚田のアート" },
  { src: "/images/hero/hero-03-dining.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
  { src: "/images/hero/hero-07-125.jpg", alt: "TERRA HAYAMA 葉山ふるさと古里かるたの籐籠" },
  { src: "/images/hero/hero-04-arch.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
  { src: "/images/hero/hero-08-139.jpg", alt: "TERRA HAYAMA 棚に並ぶ『たんぼ』の写真集" },
];

const AIRBNB_URL =
  "https://www.airbnb.jp/rooms/1399746059557999139";

export default function Home() {
  return (
    <main className="bg-(--color-base-light)">
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

        <SiteHeader variant="hero" current="Home" />


        {/* Main copy — anchored to bottom-left corner */}
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[calc(100%-32px)] md:max-w-[80vw]">
          <p
            className="fade-up font-garamond italic text-[8.4px] md:text-[clamp(10.5px,0.71vw,18.2px)] tracking-[0.4em] text-(--color-base-light)/80 mb-6"
            style={{ animationDelay: "0.7s" }}
          >
            Hayama, Kanagawa
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(14px,3.78vw,19.6px)] leading-[1.18] md:text-[clamp(19.6px,1.75vw,42px)] md:leading-[1.12] tracking-[0.02em] text-(--color-base-light)"
            style={{ animationDelay: "0.95s" }}
          >
            <span className="block whitespace-nowrap">ゆっくり流れる、</span>
            <span className="block whitespace-nowrap">葉山時間。</span>
          </h1>
          <p
            className="fade-up mt-6 md:mt-8 font-mincho text-[9.8px] md:text-[clamp(10.5px,0.66vw,16.8px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/80"
            style={{ animationDelay: "1.25s" }}
          >
            一色海岸まで徒歩 8 分。<br />
            BEAT ICE が手がける、葉山一色の一棟貸し。
          </p>
        </div>

      </section>

      {/* Concept teaser */}
      <section className="relative bg-(--color-paper) px-6 py-[clamp(112px,11.5vw,176px)] md:px-12">
        <div className="mx-auto max-w-[1480px] grid gap-12 md:grid-cols-[180px_1fr] md:gap-16">
          <div>
            <p className="font-garamond italic text-[clamp(9.1px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-3">
              Concept
            </p>
            <p className="vrl hidden md:inline-block font-mincho text-[9.8px] md:text-[clamp(10.5px,0.66vw,16.8px)] tracking-[0.5em] text-(--color-base-dark)/55">
              風景に、呼吸を整える。
            </p>
          </div>
          <div className="md:max-w-none min-w-0">
            <h2 className="font-serif text-[14.56px] md:text-[clamp(19.04px,1.4vw,35.84px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-10">
              <span className="block">葉山への愛から生まれた、</span>
              <span className="block">一棟貸しの宿。</span>
            </h2>
            <p className="font-mincho text-[11.03px] md:text-[clamp(11.76px,0.69vw,17.64px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/85 mb-10">
              海越しに望む富士山、棚田が広がる里山。<br />
              ここでは、訪れる人と葉山との距離が、<br />
              ゆっくりとほどけていきます。
            </p>
            <Link
              href="/about"
              className="group inline-flex items-center gap-4 font-garamond text-[9.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
            >
              <span className="relative">
                More about TERRA
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden className="text-[9.8px]">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Section gateway cards */}
      <section className="relative bg-(--color-base-light) py-[clamp(96px,8.34vw,128px)]">
        <div className="mx-auto max-w-[1640px] px-6 md:px-12">
          <p className="font-garamond italic text-[clamp(9.1px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6 md:text-center">
            Explore
          </p>
          <h2 className="font-serif text-[14.56px] md:text-[clamp(19.04px,1.58vw,40.32px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) md:text-center mb-14 md:mb-20">
            TERRA HAYAMA について。
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2">
            {[
              {
                href: "/about",
                num: "01",
                en: "About",
                jp: "宿のはじまり",
                img: "/images/about-exterior.jpg",
              },
              {
                href: "/rooms",
                num: "02",
                en: "Rooms",
                jp: "部屋と空間",
                img: "/images/rooms/rooms-hero.jpg",
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
                  <p className="font-garamond italic text-[clamp(8.4px,0.49vw,12.6px)] md:text-[clamp(9.1px,0.55vw,14px)] tracking-[0.42em] uppercase opacity-85">
                    {card.num} — {card.en}
                  </p>
                  <div>
                    <h3 className="font-serif text-[16.8px] md:text-[clamp(16.8px,1.04vw,26.6px)] leading-[1.3] tracking-[0.04em] mb-2">
                      {card.jp}
                    </h3>
                    <p className="font-garamond text-[7.7px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase opacity-75">
                      View →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-(--color-base-dark) text-(--color-base-light) px-6 py-[clamp(64px,7vw,112px)] md:px-12">
        <div className="mx-auto max-w-[1640px] grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-serif text-[16.8px] md:text-[clamp(21px,1.53vw,39.2px)] tracking-[0.18em] mb-3">TERRA</p>
            <p className="font-garamond text-[7.7px] md:text-[clamp(8.4px,0.55vw,14px)] tracking-[0.42em] uppercase opacity-75 mb-6 md:mb-10">
              Hayama, Isshiki
            </p>
            <p className="font-mincho text-[9.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] opacity-80">
              〒240-0111 神奈川県三浦郡葉山町一色 1759-1-5<br />
              運営: 株式会社 BEAT ICE
            </p>
          </div>
          <a
            href={AIRBNB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-garamond text-[8.4px] md:text-[clamp(9.1px,0.49vw,12.6px)] tracking-[0.32em] uppercase border border-(--color-base-light)/20 px-7 py-4 md:px-[clamp(28px,2.19vw,56px)] md:py-[clamp(16px,1.09vw,28px)] hover:bg-(--color-base-light)/8 transition-colors"
          >
            <span>Reserve on Airbnb</span>
            <span aria-hidden>→</span>
          </a>
        </div>
        <p className="mt-12 md:mt-16 font-garamond text-[7px] md:text-[7.7px] lg:text-[8.4px] tracking-[0.32em] uppercase opacity-55 text-center md:text-left">
          © 2026 TERRA HAYAMA. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
