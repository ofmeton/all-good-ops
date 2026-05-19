import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { ReservationCTA } from "../_components/ReservationCTA";

export const metadata = {
  title: "Stay",
  description:
    "葉山で過ごす一日のために。棚田・夕陽・葉山の食・抹茶。TERRA HAYAMA で出会える 4 つの体験。",
};

const EXPERIENCES = [
  {
    no: "01",
    label: "棚田を見て、味わう",
    sub: "Tanada × BEAT ICE",
    body:
      "葉山の棚田で育てたお米が、BEAT ICE のアイスクリームに変わる。風景を「食べる」体験を、滞在中に。",
    image: "/images/stay/stay-tanada-tools.jpg",
    accent: "soil",
  },
  {
    no: "02",
    label: "海越しの富士山、夕陽",
    sub: "Mt. Fuji from the coast",
    body:
      "一色海岸まで徒歩 8 分。冬の晴れた日、海の向こうに富士山。沈む夕陽が、海と山を一筋に染める。",
    image: null,
    icon: "sun",
    accent: "mist",
  },
  {
    no: "03",
    label: "葉山の海の幸、山の幸",
    sub: "Local food, your kitchen",
    body:
      "葉山の漁港から朝の魚、山の畑から旬の野菜。地元の食材で、自分たちの食卓を整える喜び。",
    image: null,
    icon: "leaf",
    accent: "pine",
  },
  {
    no: "04",
    label: "抹茶マシーン",
    sub: "Cuzen Matcha at home",
    body:
      "京都生まれ Cuzen Matcha の抹茶マシーンを、宿のキッチンに。挽きたての一服を、いつでも手元に。",
    image: "/images/stay/stay-matcha.jpg",
    accent: "pine",
  },
];

const ICONS: Record<string, React.ReactNode> = {
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
      <SiteHeader variant="page" current="Stay" />

      {/* Hero — full image */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <Image
          src="/images/hero/hero-06-137.jpg"
          alt="TERRA HAYAMA Stay — 床の間に飾られた棚田のアート"
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
            className="fade-up font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] text-(--color-base-light)/80 mb-5"
            style={{ animationDelay: "0.3s" }}
          >
            Stay — Things to Experience
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(18px,5.1vw,26px)] leading-[1.22] md:text-[clamp(28px,2.7vw,64px)] md:leading-[1.16] tracking-[0.02em]"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="block">葉山らしさを、</span>
            <span className="block">四つの体験で。</span>
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[14px] md:text-[clamp(16px,1.02vw,26px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
            style={{ animationDelay: "0.85s" }}
          >
            棚田・海・地元の食材・抹茶。<br />
            滞在中に出会える、葉山らしい四つの過ごし方。
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
                      className="absolute right-[3vw] top-[-4%] md:right-[2vw] md:top-[-6%] font-garamond italic text-[clamp(200px,18vw,440px)] leading-none text-(--color-base-dark)/[0.07] select-none"
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

                {/* Text — readable width, padded */}
                <div className="mx-auto max-w-[1480px] px-6 md:px-12 mt-8 md:mt-14">
                  <p
                    className={`font-garamond italic text-[clamp(13px,0.78vw,20px)] tracking-[0.42em] uppercase mb-3 ${accentColor}`}
                  >
                    {exp.no}・{exp.sub}
                  </p>
                  <h2 className="font-serif text-[26px] md:text-[clamp(32px,2.5vw,64px)] leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-6 md:mb-8">
                    {exp.label}
                  </h2>
                  <p className="font-mincho text-[14px] md:text-[clamp(16px,1.02vw,26px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/85 md:max-w-[900px]">
                    {exp.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ReservationCTA tone="dark" />

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6">
          Next
        </p>
        <h3 className="font-serif text-[26px] md:text-[clamp(34px,2.81vw,72px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          海まで、徒歩 8 分。
        </h3>
        <Link
          href="/access"
          className="group inline-flex items-center gap-4 font-garamond text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
        >
          <span className="relative">
            View Access
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[14px]">→</span>
        </Link>
      </section>
    </main>
  );
}
