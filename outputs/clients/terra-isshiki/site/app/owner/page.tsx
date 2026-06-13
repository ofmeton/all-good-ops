import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { ReservationCTA } from "../_components/ReservationCTA";

export const metadata = {
  title: "Owner",
  description:
    "TERRA HAYAMA を営む BEAT ICE。葉山の棚田で育てたお米から手づくりのアイスを生み、学校給食や田畑の営みと行き来する暮らしを紹介します。",
};

// 後日提供予定の活動写真の枠。写真到着後、各 placeholder を
// <Image src=... /> に差し替える（src は public/images/owner/ 配下を想定）。
// TODO(写真差替): アイス / 学校給食 / 田んぼで子供たちと / 夫婦
const ACTIVITIES = [
  {
    en: "Ice Cream",
    jp: "棚田米のアイスクリーム",
    body: "自分たちで育てたお米を使い、葉山の素材と合わせて一つひとつ手づくり。",
  },
  {
    en: "School Lunch",
    jp: "学校給食の提供",
    body: "地域の子どもたちへ。食を通じて葉山の恵みを次の世代へつないでいます。",
  },
  {
    en: "Rice Field",
    jp: "田んぼでの営み",
    body: "棚田で子どもたちと土にふれ、季節とともに米を育てる暮らし。",
  },
  {
    en: "Our Family",
    jp: "夫婦のものづくり",
    body: "葉山に暮らして十年。海と山に寄り添いながら、二人で営みを続けています。",
  },
];

export default function OwnerPage() {
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Owner" />

      {/* Hero */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <Image
          src="/images/about-hero-tanada.jpg"
          alt="TERRA HAYAMA — BEAT ICE が育てる葉山の棚田、夕陽の風景"
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
              "linear-gradient(180deg, rgba(26,20,16,0.18) 0%, rgba(26,20,16,0.08) 35%, rgba(26,20,16,0.65) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[820px]">
          <p
            className="fade-up font-garamond italic text-[11px] md:text-[clamp(9.1px,0.6vw,15.4px)] tracking-[0.4em] text-(--color-base-light)/80 mb-5"
            style={{ animationDelay: "0.3s" }}
          >
            Owner — BEAT ICE
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(17px,4.6vw,24px)] leading-[1.22] md:text-[clamp(14px,1.22vw,30.8px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="block whitespace-nowrap">葉山アイスを営む、</span>
            <span className="block whitespace-nowrap">私たちのこと。</span>
          </h1>
        </div>
      </section>

      {/* Intro — BEAT ICE とは */}
      <section className="relative px-6 py-[clamp(96px,10vw,160px)] md:px-12">
        <div className="mx-auto max-w-[1280px] grid gap-12 md:grid-cols-[180px_1fr] md:gap-16">
          <div className="md:pt-2">
            <p className="font-garamond italic text-[clamp(11px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil)">
              Who we are
            </p>
            <p className="mt-3 vrl hidden md:inline-block font-mincho text-[12px] md:text-[clamp(10.5px,0.66vw,16.8px)] tracking-[0.5em] text-(--color-base-dark)/55">
              葉山に暮らす。
            </p>
          </div>
          <div className="space-y-8 font-mincho text-[13.5px] md:text-[clamp(10.5px,0.84vw,16.8px)] leading-[2.05] tracking-[0.06em] text-(--color-base-dark)/90">
            <p>
              TERRA HAYAMA を営むのは、葉山町に根を張る BEAT ICE です。
              棚田で育てたお米から手づくりのアイスクリームを生み出し、
              海と里山の風景を行き来する暮らしを続けています。
            </p>
            <p>
              アイスづくりだけでなく、地域の学校給食への提供、
              子どもたちと汗を流す田んぼでの米づくり。
              葉山の食と風景に寄り添う日々の営みそのものが、
              この宿のかたちを支えています。
            </p>
            <p className="text-(--color-base-dark)/75">
              葉山に暮らして十年。私たちが惹かれ続けるこの町の物語を、
              訪れる人にも体感してもらえたら——
              そんな想いで TERRA HAYAMA を営んでいます。
            </p>
          </div>
        </div>
      </section>

      {/* Activities — 後日写真差替えのプレースホルダ枠 */}
      <section className="relative bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1480px]">
          <p className="font-garamond italic text-[clamp(11px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-4">
            Our work
          </p>
          <h2 className="font-serif text-[18px] md:text-[clamp(17.92px,1.4vw,35.84px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-14 md:mb-20">
            葉山での、私たちの営み。
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12 md:gap-x-12 md:gap-y-16">
            {ACTIVITIES.map((a) => (
              <div key={a.en}>
                {/* TODO(写真差替): public/images/owner/ に写真配置後、この div を <Image> へ */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-(--color-base-dark)/8 flex items-center justify-center">
                  <span className="font-garamond italic text-[10px] md:text-[clamp(8.4px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/35">
                    Photo coming soon
                  </span>
                </div>
                <div className="mt-5 flex items-baseline gap-4">
                  <p className="font-garamond italic text-[9px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase text-(--color-base-dark)/45">
                    {a.en}
                  </p>
                  <h3 className="font-serif text-[15px] md:text-[clamp(14px,0.9vw,23px)] tracking-[0.04em] text-(--color-base-dark)">
                    {a.jp}
                  </h3>
                </div>
                <p className="mt-3 font-mincho text-[12.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/80">
                  {a.body}
                </p>
              </div>
            ))}
          </div>

          {/* SNS — TODO(SNS URL): BEAT ICE の公式アカウント URL を取得して href を差し替える */}
          <div className="mt-20 md:mt-28 border-t border-(--color-base-dark)/15 pt-10 md:pt-14">
            <p className="font-garamond italic text-[clamp(11px,0.55vw,14px)] tracking-[0.42em] uppercase text-(--color-base-dark)/55 mb-6">
              Follow BEAT ICE
            </p>
            <p className="font-mincho text-[12.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/75">
              アイスや田畑の日々の様子は、SNS でも発信しています。
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
        <p className="font-garamond italic text-[clamp(11px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6">
          Next
        </p>
        <h3 className="font-serif text-[22px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          部屋と空間を見る。
        </h3>
        <Link
          href="/rooms"
          className="group inline-flex items-center gap-4 font-garamond text-[11px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
        >
          <span className="relative">
            View Rooms
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[12px]">→</span>
        </Link>
      </section>
    </main>
  );
}
