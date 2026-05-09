import Image from "next/image";

const HERO_SLIDES = [
  { src: "/images/hero/hero-01-living.jpg", alt: "TERRA HAYAMA リビングダイニング" },
  { src: "/images/hero/hero-02-bedroom.jpg", alt: "TERRA HAYAMA 寝室" },
  { src: "/images/hero/hero-03-dining.jpg", alt: "TERRA HAYAMA ダイニングとキッチン" },
  { src: "/images/hero/hero-04-arch.jpg", alt: "TERRA HAYAMA 和モダンの空間" },
];

const NAV = [
  { label: "Home", href: "#" },
  { label: "About", href: "#about" },
  { label: "Rooms", href: "#rooms" },
  { label: "Stay", href: "#stay" },
  { label: "Access", href: "#access" },
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
              style={{ animationDelay: `${i * 8}s` }}
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

        {/* Overlay (gradient for legibility) */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(135deg, rgba(26,20,16,0.55) 0%, rgba(26,20,16,0.20) 45%, rgba(26,20,16,0.55) 100%)",
          }}
        />

        {/* Subtle paper noise */}
        <div aria-hidden className="paper-noise absolute inset-0 z-[2]" />

        {/* Header (logo + nav) */}
        <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-6 py-7 md:px-12 md:py-10">
          <a
            href="#"
            className="block leading-none fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="block font-serif text-[22px] md:text-[26px] font-medium tracking-[0.18em] text-(--color-base-light)">
              TERRA
            </span>
            <span
              className="block mt-1 font-garamond text-[10px] md:text-[11px] uppercase tracking-[0.42em] text-(--color-base-light)/85"
            >
              Hayama, Isshiki
            </span>
          </a>

          <nav
            className="hidden md:block fade-up"
            style={{ animationDelay: "0.45s" }}
          >
            <ul className="flex items-center gap-9 font-garamond text-[14px] tracking-[0.22em] uppercase text-(--color-base-light)">
              {NAV.map((item) => (
                <li key={item.label} className="group">
                  <a
                    href={item.href}
                    className="relative inline-block py-2"
                  >
                    {item.label}
                    <span className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-(--color-base-light) transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            aria-label="メニューを開く"
            className="md:hidden flex h-10 w-10 items-center justify-center fade-up"
            style={{ animationDelay: "0.45s" }}
          >
            <span className="block h-px w-7 bg-(--color-base-light)" />
            <span className="sr-only">メニューを開く</span>
          </button>
        </header>

        {/* Main copy */}
        <div className="absolute bottom-[12svh] left-6 md:bottom-[14svh] md:left-12 z-10 max-w-[88%] md:max-w-[640px]">
          <p
            className="fade-up font-garamond italic text-[12px] md:text-[13px] tracking-[0.4em] text-(--color-base-light)/75 mb-6"
            style={{ animationDelay: "0.7s" }}
          >
            Hayama, Kanagawa
          </p>
          <h1
            className="fade-up font-serif font-medium text-[40px] leading-[1.18] md:text-[68px] md:leading-[1.12] tracking-[0.02em] text-(--color-base-light)"
            style={{ animationDelay: "0.95s" }}
          >
            <span className="block">葉山の風景に、</span>
            <span className="block">ゆっくり溶ける。</span>
          </h1>
          <p
            className="fade-up mt-6 md:mt-8 font-mincho text-[14px] md:text-[16px] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/80"
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
          className="fade-up hidden md:flex absolute right-0 top-1/2 z-10 -translate-y-1/2 vrl items-center gap-6 px-5 py-8 bg-(--color-base-dark)/55 hover:bg-(--color-base-dark)/85 transition-colors duration-500 backdrop-blur-[2px]"
          style={{ animationDelay: "1.5s" }}
        >
          <span className="font-mincho text-[14px] tracking-[0.42em] text-(--color-base-light)">
            予約は Airbnb から
          </span>
          <span
            aria-hidden
            className="font-garamond text-[11px] tracking-[0.32em] text-(--color-base-light)/65"
          >
            BOOK ↓
          </span>
        </a>

        {/* Mountain SVG silhouette (bottom) */}
        <svg
          aria-hidden
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 z-[3] h-[110px] w-full md:h-[150px] text-(--color-base-dark)/60"
        >
          <path
            d="M0,160 L0,90 L120,80 L240,108 L360,72 L480,96 L580,52 L680,88 L760,40 L860,76 L960,30 L1060,72 L1180,52 L1280,88 L1380,68 L1440,98 L1440,160 Z"
            fill="currentColor"
          />
          <path
            d="M0,160 L0,128 L160,118 L320,130 L500,108 L680,124 L860,100 L1040,118 L1220,108 L1440,128 L1440,160 Z"
            fill="currentColor"
            opacity="0.55"
          />
        </svg>

        {/* Mobile bottom CTA */}
        <a
          href={AIRBNB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fade-up md:hidden absolute bottom-6 right-6 z-10 inline-flex items-center gap-3 bg-(--color-base-dark)/70 px-5 py-3 text-(--color-base-light) backdrop-blur-[2px]"
          style={{ animationDelay: "1.35s" }}
        >
          <span className="font-mincho text-[12px] tracking-[0.32em]">
            予約は Airbnb から
          </span>
          <span
            aria-hidden
            className="font-garamond text-[10px] tracking-[0.32em] opacity-70"
          >
            ↗
          </span>
        </a>
      </section>

      {/* Spacer placeholder for next sections */}
      <section className="relative bg-(--color-base-light) px-6 py-32 md:px-12 md:py-48">
        <div className="mx-auto max-w-3xl">
          <p className="font-garamond italic text-[12px] tracking-[0.4em] uppercase text-(--color-soil) mb-6">
            About TERRA HAYAMA
          </p>
          <h2 className="font-serif text-[28px] md:text-[40px] leading-[1.4] tracking-[0.04em] text-(--color-base-dark)">
            葉山への愛から生まれた、<br className="hidden md:block" />
            一棟貸しの宿。
          </h2>
          <p className="mt-10 font-mincho text-[15px] md:text-[16px] leading-[2.0] tracking-[0.06em] text-(--color-base-dark)/85">
            海越しに望む富士山、棚田が広がる里山。<br />
            この土地に暮らして十年、私たちは今もなお、<br />
            この町の風景に魅了され続けています。
          </p>
        </div>
      </section>
    </main>
  );
}
