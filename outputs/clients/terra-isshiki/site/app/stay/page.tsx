import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { ReservationCTA } from "../_components/ReservationCTA";

export const metadata = {
  title: "過ごし方",
  description:
    "TERRA HAYAMA での過ごし方。一色海岸を第一に、海越しの富士山、置いてある抹茶、棚田と BEAT ICE の営みを軽やかに紹介します。",
};

const EXPERIENCES = [
  {
    no: "01",
    label: "まずは、一色海岸へ",
    sub: "Isshiki Beach first",
    body:
      "宿から海までは徒歩 8 分。朝の散歩、夕方の寄り道、何もしない時間。TERRA の過ごし方は、まず一色海岸から始まります。",
    image: null,
    icon: "wave",
    accent: "mist",
  },
  {
    no: "02",
    label: "海越しの富士山",
    sub: "Mt. Fuji from the coast",
    body:
      "空気が澄んだ日は、一色海岸の向こうに富士山が見えることも。鳥居越しに望む、その静かな稜線。",
    image: "/images/stay/stay-fuji.jpg",
    accent: "mist",
  },
  {
    no: "03",
    label: "置いてある抹茶を、気軽に",
    sub: "Matcha in the kitchen",
    body:
      "宿のキッチンに抹茶マシーンを置いてあります。特別な体験として構えすぎず、滞在中のひと息に、気軽にお楽しみください。",
    image: "/images/stay/stay-matcha.jpg",
    accent: "pine",
  },
  {
    no: "04",
    label: "棚田と BEAT ICE の営み",
    sub: "Tanada × BEAT ICE",
    body:
      "葉山の棚田で育てたお米が、BEAT ICE のアイスクリームに変わる。土地の営みを、宿の背景としてそっと感じられます。",
    image: "/images/stay/stay-tanada-tools.jpg",
    accent: "soil",
  },
];

const ICONS: Record<string, React.ReactNode> = {
  wave: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="0.9">
      <path d="M8 37 C 17 28, 25 28, 34 37 C 43 46, 51 46, 60 37" />
      <path d="M8 46 C 17 38, 25 38, 34 46 C 43 54, 51 54, 60 46" />
      <path d="M13 27 C 22 19, 31 19, 40 27" opacity="0.55" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="0.8">
      <circle cx="32" cy="32" r="13" />
      <path d="M32 4 V14 M32 50 V60 M4 32 H14 M50 32 H60 M11.7 11.7 L18.7 18.7 M45.3 45.3 L52.3 52.3 M52.3 11.7 L45.3 18.7 M18.7 45.3 L11.7 52.3" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="0.8">
      <path d="M14 50 C 14 24, 38 14, 54 14 C 54 38, 38 50, 14 50 Z" />
      <path d="M14 50 L 50 18" />
    </svg>
  ),
};

export default function StayPage() {
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Ways" />

      {/* Hero — full image */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <Image
          src="/images/hero/hero-06-137.jpg"
          alt="TERRA HAYAMA 過ごし方 — 床の間に飾られた棚田のアート"
          fill
          priority
          sizes="100vw"
          quality={88}
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,20,16,0.55) 0%, rgba(26,20,16,0.18) 35%, rgba(26,20,16,0.65) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[760px]">
          <p
            className="fade-up font-garamond italic text-[clamp(11.1px,0.6vw,18.79px)] tracking-[0.4em] text-(--color-base-light)/80 mb-5"
            style={{ animationDelay: "0.3s" }}
          >
            Ways — How to spend time
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(15.37px,3.57vw,22.2px)] leading-[1.22] md:text-[clamp(15.4px,1.47vw,36.4px)] md:leading-[1.16] tracking-[0.02em]"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="block">葉山らしさを、</span>
            <span className="block">軽やかな過ごし方で。</span>
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[11.96px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
            style={{ animationDelay: "0.85s" }}
          >
            一色海岸、海越しの富士山、抹茶、棚田。<br />
            同じテンションで並べる、葉山らしい過ごし方。
          </p>
        </div>
      </section>

      {/* Experiences */}
      <section className="relative py-[clamp(80px,7.3vw,112px)] bg-(--color-base-light)">
        <div className="grid gap-20 md:gap-32">
          {EXPERIENCES.map((exp) => {
            const accentColor =
              exp.accent === "soil"
                ? "text-(--color-soil)"
                : exp.accent === "pine"
                ? "text-(--color-pine)"
                : "text-(--color-mist)";

            return (
              <article key={exp.no}>
                {/* Text — readable width, padded — comes FIRST */}
                <div className="mx-auto max-w-[1480px] px-6 md:px-12 mb-8 md:mb-14">
                  <p
                    className={`font-garamond italic text-[clamp(11.1px,0.55vw,17.08px)] tracking-[0.42em] uppercase mb-3 ${accentColor}`}
                  >
                    {exp.no}・{exp.sub}
                  </p>
                  <h2 className="font-serif text-[17.76px] md:text-[clamp(17.92px,1.4vw,35.84px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-6 md:mb-8">
                    {exp.label}
                  </h2>
                  <p className="font-mincho text-[11.96px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/85 md:max-w-[900px]">
                    {exp.body}
                  </p>
                </div>

                {/* Visual — full bleed, large */}
                {exp.image ? (
                  <div className="relative aspect-[16/10] md:aspect-[5/2] w-full overflow-hidden bg-(--color-base-dark)/5">
                    <Image
                      src={exp.image}
                      alt={exp.label}
                      fill
                      sizes="100vw"
                      quality={88}
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[16/10] md:aspect-[5/2] w-full overflow-hidden bg-(--color-paper) flex items-center justify-center">
                    <div aria-hidden className="paper-noise absolute inset-0" />
                    <div
                      aria-hidden
                      className="absolute right-[3vw] top-[-4%] md:right-[2vw] md:top-[-6%] font-garamond italic text-[clamp(170.8px,12.6vw,375.76px)] leading-none text-(--color-base-dark)/[0.07] select-none"
                    >
                      {exp.no}
                    </div>
                    <div
                      className={`relative z-10 ${accentColor}/70 opacity-85 [&_svg]:w-[clamp(88px,7vw,160px)] [&_svg]:h-[clamp(88px,7vw,160px)]`}
                    >
                      {exp.icon ? ICONS[exp.icon] : null}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <ReservationCTA tone="dark" />

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <p className="font-garamond italic text-[clamp(11.1px,0.6vw,18.79px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6">
          Next
        </p>
        <h3 className="font-serif text-[22.2px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          海まで、徒歩 8 分。
        </h3>
        <Link
          href="/access"
          className="group inline-flex items-center gap-4 font-garamond text-[11.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
        >
          <span className="relative">
            View Access
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[11.96px]">→</span>
        </Link>
      </section>
    </main>
  );
}
