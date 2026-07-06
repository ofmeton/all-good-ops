import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { ParallaxLayer } from "../_components/ParallaxLayer";
import { SiteFooter } from "../_components/SiteFooter";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";
import { localizeHref } from "../i18n/routing";

/* 文言・写真パスは app/copy.ts（STAY_PAGE）で編集できます。 */

export function StayView({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const c = copy.STAY_PAGE;
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Stay" locale={locale} copy={copy} />

      {/* Hero — full image */}
      <section className="relative h-[64svh] min-h-[420px] w-full overflow-hidden bg-(--color-base-dark) text-(--color-base-light)">
        <ParallaxLayer>
          <Image
            src={c.hero.img}
            alt={c.hero.alt}
            fill
            priority
            sizes="100vw"
            quality={88}
            className="object-cover"
            style={{ objectPosition: c.hero.focal }}
          />
        </ParallaxLayer>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,20,16,0.55) 0%, rgba(26,20,16,0.18) 35%, rgba(26,20,16,0.65) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[760px]">
          <h1
            className="fade-up font-serif font-medium text-[clamp(15.37px,3.57vw,22.2px)] leading-[1.22] md:text-[clamp(15.4px,1.47vw,36.4px)] md:leading-[1.16] tracking-[0.02em]"
            style={{ animationDelay: "0.4s" }}
          >
            {c.hero.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[11.96px] md:text-[clamp(var(--fs-lv3),0.71vw,18.2px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
            style={{ animationDelay: "0.7s" }}
          >
            {c.hero.lead}
          </p>
        </div>
      </section>

      {/* Experiences */}
      <section className="relative py-[clamp(80px,7.3vw,112px)] bg-(--color-base-light)">
        <div className="grid gap-20 md:gap-32">
          {c.items.map((exp, i) => {
            const accentColor =
              exp.accent === "soil"
                ? "text-(--color-soil)"
                : exp.accent === "pine"
                ? "text-(--color-pine)"
                : "text-(--color-mist)";

            // 上山口は補足扱い（全員が行ける場所ではないため前面に出さない）:
            // 番号・タイトルをワンサイズ小さくして温度感を落とす。
            // 写真は全幅で見せ（本人希望で左右の余白を解消）、切り抜き中心のみ下端に寄せる
            const isSupplement = i === 2;

            return (
              <article key={exp.no}>
                {/* Text — readable width, padded — comes FIRST */}
                <div className="mx-auto max-w-[1480px] px-6 md:px-12 mb-8 md:mb-14">
                  <p
                    className={`font-garamond italic tracking-[0.42em] mb-3 ${accentColor} ${
                      isSupplement
                        ? "text-[clamp(10px,0.5vw,15.4px)]"
                        : "text-[clamp(11.1px,0.55vw,17.08px)]"
                    }`}
                  >
                    {exp.no}
                  </p>
                  <h2
                    className={`font-serif leading-[1.36] tracking-[0.04em] text-(--color-base-dark) mb-6 md:mb-8 ${
                      isSupplement
                        ? "text-[16px] md:text-[clamp(16.13px,1.26vw,32.26px)]"
                        : "text-[17.76px] md:text-[clamp(17.92px,1.4vw,35.84px)]"
                    }`}
                  >
                    {exp.title}
                  </h2>
                  <p className="font-mincho text-[11.96px] md:text-[clamp(var(--fs-lv3),0.71vw,18.2px)] leading-[2.0] tracking-[0.08em] text-(--color-base-dark)/85 md:max-w-[900px]">
                    {exp.body}
                  </p>
                </div>

                {/* Visual — full bleed, large. image が null の場合は従来どおり画像なしレイアウト
                    （紙のノイズ + 大きな通し番号のみ、icon は廃止済みのため表示しない） */}
                {exp.image ? (
                  <div className="relative aspect-[16/10] md:aspect-[5/2] w-full overflow-hidden bg-(--color-base-dark)/5">
                    <ParallaxLayer>
                      <Image
                        src={exp.image}
                        alt={exp.title}
                        fill
                        sizes="100vw"
                        quality={88}
                        className={`object-cover object-center ${
                          isSupplement ? "md:object-bottom" : ""
                        }`}
                      />
                    </ParallaxLayer>
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
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <h3 className="font-serif text-[22.2px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          {c.next.title}
        </h3>
        <Link
          href={localizeHref(c.next.href, locale)}
          className="group inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(var(--fs-lv4),0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
        >
          <span className="relative">
            {c.next.cta}
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[13px]">→</span>
        </Link>
      </section>

      <SiteFooter copy={copy} locale={locale} />
    </main>
  );
}
