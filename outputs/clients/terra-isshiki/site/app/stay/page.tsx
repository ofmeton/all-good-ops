import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";

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
    image: "/images/stay/stay-tanada.jpg",
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
    sub: "Citizen Matcha at home",
    body:
      "京都生まれ Citizen Matcha の抹茶マシーンを、宿のキッチンに。挽きたての一服を、いつでも手元に。",
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

      {/* Hero */}
      <section className="relative bg-(--color-paper) px-6 py-28 md:px-12 md:py-44 overflow-hidden">
        <div className="mx-auto max-w-[1480px] relative z-10">
          <p
            className="fade-up font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6"
            style={{ animationDelay: "0.2s" }}
          >
            Stay — Things to Experience
          </p>
          <h1
            className="fade-up font-serif font-medium text-[36px] leading-[1.22] md:text-[clamp(48px,4.69vw,120px)] md:leading-[1.16] tracking-[0.02em] text-(--color-base-dark)"
            style={{ animationDelay: "0.45s" }}
          >
            <span className="block">葉山で過ごす、</span>
            <span className="block">四つの一日。</span>
          </h1>
          <p
            className="fade-up mt-10 md:mt-14 max-w-[640px] font-mincho text-[15px] md:text-[23px] lg:text-[27px] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/80"
            style={{ animationDelay: "0.7s" }}
          >
            棚田・海・地元の食材・抹茶。滞在中に出会える、葉山らしい四つの過ごし方です。
          </p>
        </div>

        {/* Decorative number */}
        <div
          aria-hidden
          className="hidden md:block absolute right-[-40px] bottom-[-60px] font-garamond italic text-[260px] leading-none text-(--color-base-dark)/[0.04] select-none"
        >
          04
        </div>
      </section>

      {/* Experiences */}
      <section className="relative py-20 md:py-28 bg-(--color-base-light)">
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
                    <div
                      aria-hidden
                      className="absolute right-[2vw] top-[-6%] font-garamond italic text-[clamp(160px,17.19vw,440px)] leading-none text-(--color-base-dark)/[0.05] select-none"
                    >
                      {exp.no}
                    </div>
                    <div
                      className={`relative z-10 ${accentColor}/70 opacity-80 [&_svg]:w-[clamp(64px,5.47vw,140px)] [&_svg]:h-[clamp(64px,5.47vw,140px)]`}
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

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-20 md:px-12 md:py-28 text-center">
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
