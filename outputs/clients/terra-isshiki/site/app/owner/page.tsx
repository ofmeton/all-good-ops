import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { ParallaxLayer } from "../_components/ParallaxLayer";
import { StackedPhotos } from "../_components/StackedPhotos";
import { SiteFooter } from "../_components/SiteFooter";
import { OWNER_PAGE } from "../copy";

/* 文言・写真パスは app/copy.ts（OWNER_PAGE）で編集できます。 */

export const metadata = {
  title: OWNER_PAGE.metaTitle,
  description: OWNER_PAGE.metaDescription,
};

export default function OwnerPage() {
  const c = OWNER_PAGE;
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Owner" />

      {/* Hero */}
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
              "linear-gradient(180deg, rgba(26,20,16,0.18) 0%, rgba(26,20,16,0.08) 35%, rgba(26,20,16,0.65) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[820px]">
          <h1
            className="fade-up font-serif font-medium text-[clamp(17px,4.6vw,24px)] leading-[1.22] md:text-[clamp(14px,1.22vw,30.8px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.4s" }}
          >
            {c.hero.titleLines.map((line) => (
              <span key={line} className="block whitespace-nowrap">
                {line}
              </span>
            ))}
          </h1>
        </div>
      </section>

      {/* Intro — BEAT ICE とは */}
      <section className="relative px-6 py-[clamp(96px,10vw,160px)] md:px-12">
        <div className="mx-auto max-w-[1280px] grid gap-12 md:grid-cols-[180px_1fr] md:gap-16">
          <div className="md:pt-2">
            <p className="vrl hidden md:inline-block font-mincho text-[12px] md:text-[clamp(10.5px,0.66vw,16.8px)] tracking-[0.5em] text-(--color-base-dark)/55">
              {c.sideLabel}
            </p>
          </div>
          <div className="space-y-8 font-mincho text-[13.5px] md:text-[clamp(10.5px,0.84vw,16.8px)] leading-[2.05] tracking-[0.06em] text-(--color-base-dark)/90">
            {c.intro.map((paragraph, i) => (
              <p
                key={paragraph.slice(0, 12)}
                className={i === c.intro.length - 1 ? "text-(--color-base-dark)/75" : undefined}
              >
                {paragraph}
              </p>
            ))}
            <a
              href={c.officialCta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
            >
              <span className="relative">
                {c.officialCta.label}
                <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
              </span>
              <span aria-hidden className="text-[13px]">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="relative bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1480px]">
          <h2 className="font-serif text-[18px] md:text-[clamp(17.92px,1.4vw,35.84px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-14 md:mb-20">
            {c.worksTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12 md:gap-x-12 md:gap-y-16">
            {c.activities.map((a) => (
              <div key={a.title}>
                <StackedPhotos
                  images={a.images}
                  className="aspect-[4/3]"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
                <h3 className="mt-5 font-serif text-[15px] md:text-[clamp(14px,0.9vw,23px)] tracking-[0.04em] text-(--color-base-dark)">
                  {a.title}
                </h3>
                <p className="mt-3 font-mincho text-[12.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/80">
                  {a.body}
                </p>
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-4 inline-flex items-center gap-3 font-serif text-[12.5px] md:text-[clamp(11.2px,0.6vw,15.4px)] tracking-[0.06em] text-(--color-base-dark)"
                >
                  <span className="relative">
                    {a.linkLabel}
                    <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
                  </span>
                  <span aria-hidden className="text-[12px]">→</span>
                </a>
              </div>
            ))}
          </div>

          {/* SNS */}
          <div className="mt-20 md:mt-28 border-t border-(--color-base-dark)/15 pt-10 md:pt-14">
            <p className="font-mincho text-[12.5px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/75">
              {c.sns.body}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-8">
              {c.sns.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 font-serif text-[13px] md:text-[clamp(11.9px,0.66vw,16.8px)] tracking-[0.06em] text-(--color-base-dark)"
                >
                  <span className="relative">
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
                  </span>
                  <span aria-hidden className="text-[12px]">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <h3 className="font-serif text-[22px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
          {c.next.title}
        </h3>
        <Link
          href={c.next.href}
          className="group inline-flex items-center gap-4 font-serif text-[13.5px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.08em] text-(--color-base-dark)"
        >
          <span className="relative">
            {c.next.cta}
            <span className="absolute -bottom-1 left-0 h-px w-full bg-(--color-base-dark)/30 transition-colors duration-500 group-hover:bg-(--color-base-dark)" />
          </span>
          <span aria-hidden className="text-[13px]">→</span>
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
