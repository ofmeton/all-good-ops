import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { ReservationCTA } from "../_components/ReservationCTA";
import { ParallaxLayer } from "../_components/ParallaxLayer";

export const metadata = {
  title: "Owner",
  description:
    "TERRA HAYAMA を営む BEAT ICE のこと。棚田で育てたお米からつくるアイスクリーム、学校給食への提供、田んぼでの米づくりを紹介します。",
};

const ACTIVITIES: { jp: string; body: string; image?: string }[] = [
  {
    jp: "棚田米のアイスクリーム",
    body: "自分たちで育てたお米からつくる、米麹由来のやさしい甘みのアイスクリームです。",
    image: "/images/owner/owner-icecream.webp",
  },
  {
    jp: "学校給食の提供",
    body: "つくったアイスクリームを地域の学校給食に届けています。招かれて、教室で授業をすることもあります。",
    image: "/images/owner/owner-school-lunch.jpg",
  },
  {
    jp: "田んぼでの営み",
    body: "棚田で土にふれ、季節とともに米を育てています。",
    image: "/images/owner/owner-tanada-work.jpg",
  },
  {
    jp: "夫婦のものづくり",
    body: "2015 年に葉山へ移り住みました。暮らしも、ものづくりも、ふたりで続けています。",
    image: "/images/owner/owner-family.jpg",
  },
];

export default function OwnerPage() {
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Owner" />

      {/* Hero */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <ParallaxLayer>
          <Image
            src="/images/about-hero-tanada.jpg"
            alt="TERRA HAYAMA — BEAT ICE が育てる葉山の棚田、夕陽の風景"
            fill
            priority
            sizes="100vw"
            quality={88}
            className="object-cover object-center"
          />
        </ParallaxLayer>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,20,16,0.18) 0%, rgba(26,20,16,0.08) 35%, rgba(26,20,16,0.65) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[820px]">
          <h1
            className="fade-up font-serif font-medium text-[clamp(17px,4.6vw,24px)] leading-[1.22] md:text-[clamp(14px,1.22vw,30.8px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.4s" }}
          >
            <span className="block whitespace-nowrap">お米のアイスをつくる、</span>
            <span className="block whitespace-nowrap">私たちのこと。</span>
          </h1>
        </div>
      </section>

      {/* Intro — BEAT ICE とは */}
      <section className="relative px-6 py-[clamp(96px,10vw,160px)] md:px-12">
        <div className="mx-auto max-w-[1280px] grid gap-12 md:grid-cols-[180px_1fr] md:gap-16">
          <div className="md:pt-2">
            <p className="vrl hidden md:inline-block font-mincho text-[12px] md:text-[clamp(10.5px,0.66vw,16.8px)] tracking-[0.5em] text-(--color-base-dark)/55">
              葉山に暮らす。
            </p>
          </div>
          <div className="space-y-8 font-mincho text-[13.5px] md:text-[clamp(10.5px,0.84vw,16.8px)] leading-[2.05] tracking-[0.06em] text-(--color-base-dark)/90">
            <p>
              TERRA HAYAMA を営むのは、葉山の BEAT ICE です。
              棚田で育てたお米からアイスクリームをつくり、
              海と里山を行き来しながら暮らしています。
            </p>
            <p>
              田んぼでの米づくりから、学校給食への提供、
              料理教室やマルシェの主催まで。
              そうした暮らしの延長に、この宿があります。
            </p>
            <p className="text-(--color-base-dark)/75">
              葉山に移り住んで、十年。
              この町で私たちが好きになったものを、
              訪れる人にも見つけてもらえたらと願いながら、TERRA HAYAMA を営んでいます。
            </p>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="relative bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1480px]">
          <h2 className="font-serif text-[18px] md:text-[clamp(17.92px,1.4vw,35.84px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-14 md:mb-20">
            葉山での、私たちの営み。
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12 md:gap-x-12 md:gap-y-16">
            {ACTIVITIES.map((a) => (
              <div key={a.jp}>
                {a.image ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-(--color-base-dark)/8">
                    <ParallaxLayer>
                      <Image
                        src={a.image}
                        alt={`TERRA HAYAMA — ${a.jp}`}
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        quality={88}
                        className="object-cover object-center"
                      />
                    </ParallaxLayer>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-(--color-base-dark)/8 flex items-center justify-center">
                    <span className="font-mincho text-[11px] tracking-[0.12em] text-(--color-base-dark)/35">
                      準備中
                    </span>
                  </div>
                )}
                <h3 className="mt-5 font-serif text-[15px] md:text-[clamp(14px,0.9vw,23px)] tracking-[0.04em] text-(--color-base-dark)">
                  {a.jp}
                </h3>
                <p className="mt-3 font-mincho text-[12.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/80">
                  {a.body}
                </p>
              </div>
            ))}
          </div>

          {/* SNS — TODO(SNS URL): BEAT ICE 公式 Instagram(@beatice0923) を href に差し替える */}
          <div className="mt-20 md:mt-28 border-t border-(--color-base-dark)/15 pt-10 md:pt-14">
            <p className="font-mincho text-[12.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/75">
              アイスづくりや棚田の様子は、SNS でも発信しています。
              <span className="block mt-2 text-(--color-base-dark)/45">
                ※ アカウントリンクは準備中です。
              </span>
            </p>
          </div>
        </div>
      </section>

      <ReservationCTA tone="dark" />

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <h3 className="font-serif text-[22px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          部屋と空間を見る。
        </h3>
        <Link
          href="/rooms"
          className="group inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
        >
          <span className="relative">
            部屋を見る
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[13px]">→</span>
        </Link>
      </section>
    </main>
  );
}
