import Image from "next/image";
import { SiteHeader } from "../_components/SiteHeader";
import { ReservationCTA } from "../_components/ReservationCTA";

export const metadata = {
  title: "About",
  description:
    "葉山への愛から生まれた一棟貸しの宿。TERRA HAYAMA のコンセプトと、運営の BEAT ICE について。",
};

export default function AboutPage() {
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="About" />

      {/* Hero — Beat Ice Harmony 詩のフレーム */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <Image
          src="/images/about-hero-tanada.jpg"
          alt="TERRA HAYAMA — 葉山アイス BEAT ICE の棚田、夕陽の風景"
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
            className="fade-up font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] text-(--color-base-light)/80 mb-5"
            style={{ animationDelay: "0.3s" }}
          >
            About TERRA HAYAMA
          </p>
          <h1
            className="fade-up font-serif font-medium text-[clamp(20px,6.2vw,30px)] leading-[1.22] md:text-[clamp(34px,2.97vw,72px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="block whitespace-nowrap">葉山への愛から、</span>
            <span className="block whitespace-nowrap">生まれた場所。</span>
          </h1>
        </div>
      </section>

      {/* Concept body */}
      <section className="relative px-6 py-[clamp(112px,11.5vw,176px)] md:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-x-12 gap-y-12 md:grid-cols-[180px_1fr]">
            <div className="md:pt-2">
              <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil)">
                Concept
              </p>
              <p className="mt-3 vrl hidden md:inline-block font-mincho text-[14px] md:text-[clamp(15px,0.94vw,24px)] tracking-[0.5em] text-(--color-base-dark)/55">
                風景に、息を整える。
              </p>
            </div>

            <div className="space-y-8 font-mincho text-[16px] md:text-[clamp(17px,1.4vw,22px)] min-[2200px]:!text-[clamp(24px,1.1vw,30px)] leading-[2.05] tracking-[0.06em] text-(--color-base-dark)/90">
              <p>
                TERRA は、葉山への愛から生まれました。<br />
                海越しに望む富士山、棚田が広がる里山。<br />
                この土地に暮らして十年、私たちは今もなお、<br />
                この町の風景に魅了され続けています。
              </p>
              <p>
                風景とはきっと、<br />
                人の営みと自然がゆっくりと重なり合い、<br />
                時間をかけて育まれてきたもの。
              </p>
              <p>
                ここでは、訪れる人と葉山との距離が、<br />
                ゆっくりとほどけていきます。
              </p>
              <p>
                海と山が織りなす自然のリズム、<br />
                ここに息づく人々の物語。<br />
                それらに触れる中で、時の流れが少し緩み、<br />
                呼吸が整っていく。
              </p>
              <p className="pt-2 text-(--color-base-dark)/75">
                そんなひとときを、ここで過ごしていただけたら嬉しいです。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Operator intro — BEAT ICE / 小休思 */}
      <section className="relative bg-(--color-paper)">
        <div className="grid md:grid-cols-2 items-stretch">
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[82svh] w-full overflow-hidden">
            <Image
              src="/images/about-exterior.jpg"
              alt="TERRA HAYAMA 外観 — 葉山一色の佇まい"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              quality={88}
              className="object-cover object-center"
            />
          </div>
          <div className="px-6 py-[clamp(64px,7vw,112px)] md:px-16 lg:px-24 flex flex-col justify-center">
            <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-5">
              Operator
            </p>
            <h2 className="font-serif text-[28px] md:text-[clamp(36px,3.12vw,80px)] leading-[1.34] tracking-[0.04em] text-(--color-base-dark) mb-8">
              <span className="block tracking-[0.16em] text-[20px] md:text-[36px] lg:text-[40px] text-(--color-base-dark)/60 mb-2 font-garamond uppercase">
                BEAT ICE
              </span>
              <span className="block">葉山アイス屋が営む、</span>
              <span className="block">一棟貸しの宿。</span>
            </h2>
            <div className="space-y-6 font-mincho text-[15px] md:text-[clamp(16px,1.02vw,26px)] leading-[2.0] tracking-[0.06em] text-(--color-base-dark)/85">
              <p>
                葉山町に根を張り、棚田で育てたお米から手づくりのアイスクリームを生み出す
                BEAT ICE。<br />
                棚田の景色と海の風景を行き来する暮らしから生まれた感性が、TERRA HAYAMA という宿のかたちを支えています。
              </p>
              <p>
                運営は、葉山に暮らして十年。地域の食材・棚田・海と寄り添いながら、訪れる人にも葉山の物語を体感してもらえる滞在を作っています。
              </p>
            </div>
            <p className="mt-10 font-garamond text-[12px] tracking-[0.32em] uppercase text-(--color-base-dark)/55">
              Hayama, Kanagawa — Established 2026
            </p>
          </div>
        </div>
      </section>

      <ReservationCTA tone="dark" />

      {/* Footer link teaser */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <p className="font-garamond italic text-[clamp(13px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil) mb-6">
          Next
        </p>
        <h3 className="font-serif text-[26px] md:text-[clamp(34px,2.81vw,72px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          部屋と空間を見る。
        </h3>
        <a
          href="/rooms"
          className="group inline-flex items-center gap-4 font-garamond text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.32em] uppercase text-(--color-base-dark)"
        >
          <span className="relative">
            View Rooms
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-[transform,background] duration-500 group-hover:bg-(--color-base-dark) origin-left" />
          </span>
          <span aria-hidden className="text-[14px]">→</span>
        </a>
      </section>
    </main>
  );
}
