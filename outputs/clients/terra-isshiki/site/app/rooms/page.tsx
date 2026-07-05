import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../_components/SiteHeader";
import { RoomsGallery } from "../_components/RoomsGallery";
import { ReservationCTA } from "../_components/ReservationCTA";
import { ParallaxLayer } from "../_components/ParallaxLayer";
import { ROOMS_PAGE } from "../copy";

/* 文言・写真パスは app/copy.ts（ROOMS_PAGE）で編集できます。 */

export const metadata = {
  title: ROOMS_PAGE.metaTitle,
  description: ROOMS_PAGE.metaDescription,
};

export default function RoomsPage() {
  const c = ROOMS_PAGE;
  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Rooms" />

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
              "linear-gradient(180deg, rgba(26,20,16,0.30) 0%, rgba(26,20,16,0.05) 35%, rgba(26,20,16,0.55) 100%)",
          }}
        />
        <div className="absolute bottom-12 left-6 md:bottom-20 md:left-12 z-10 max-w-[88%] md:max-w-[760px]">
          <h1
            className="fade-up font-serif font-medium text-[clamp(13.66px,3.36vw,20.5px)] leading-[1.2] md:text-[clamp(14px,1.22vw,30.8px)] md:leading-[1.14] tracking-[0.02em]"
            style={{ animationDelay: "0.4s" }}
          >
            <span className="block whitespace-nowrap">{c.hero.title}</span>
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[11.96px] md:text-[clamp(11.2px,0.71vw,18.2px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
            style={{ animationDelay: "0.7s" }}
          >
            {c.hero.lead.split("\n").map((line, i, arr) => (
              <span key={line}>
                {line}
                {i < arr.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Sections with lightbox */}
      <RoomsGallery />

      {/* Overview — Specs / Facilities / Notices */}
      <section
        id="overview"
        className="relative bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12"
      >
        <div className="mx-auto max-w-[1480px]">
          {/* Specs table — overviewTitle は削除済み。ここから直に始まる */}
          <div className="mb-20 md:mb-28">
            <h3 className="font-serif text-[15.37px] md:text-[clamp(14px,0.9vw,23px)] tracking-[0.06em] text-(--color-base-dark) mb-6">
              {c.specsTitle}
            </h3>
            <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10">
              {c.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="grid grid-cols-[112px_1fr] md:grid-cols-[200px_1fr] gap-x-6 py-5 md:py-6"
                >
                  <dt className="font-serif text-[12.81px] md:text-[clamp(11.9px,0.71vw,18.2px)] tracking-[0.08em] text-(--color-base-dark)">
                    {spec.label}
                  </dt>
                  <dd className="font-mincho text-[12.81px] md:text-[clamp(11.2px,0.66vw,16.8px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90 pt-[3px]">
                    {spec.value}
                    {"note" in spec && spec.note ? (
                      <span className="block mt-1 text-[11.1px] md:text-[clamp(9.1px,0.49vw,12.6px)] text-(--color-base-dark)/55">
                        {spec.note}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Facilities */}
          <div className="mb-20 md:mb-28">
            <h3 className="font-serif text-[18.79px] md:text-[clamp(18.2px,1.36vw,35px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10 md:mb-14">
              {c.facilitiesTitle}
            </h3>
            <dl className="grid gap-y-10 md:gap-y-12 md:grid-cols-2 md:gap-x-16">
              {c.facilityGroups.map((group) => (
                <div
                  key={group.title}
                  className="border-t border-(--color-base-dark)/15 pt-5"
                >
                  <dt className="mb-3 font-serif text-[15.37px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.06em] text-(--color-base-dark)">
                    {group.title}
                  </dt>
                  <dd className="font-mincho text-[11.96px] md:text-[clamp(10.5px,0.6vw,15.4px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                    {group.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Notices */}
          <div>
            <h3 className="font-serif text-[18.79px] md:text-[clamp(18.2px,1.36vw,35px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10 md:mb-14">
              {c.noticesTitle}
            </h3>

            {/* Mobile: collapsed by default to save scroll */}
            <details className="md:hidden group border-t border-(--color-base-dark)/15">
              <summary className="list-none cursor-pointer flex items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
                <span className="font-mincho text-[11.96px] tracking-[0.06em] text-(--color-base-dark)">
                  ご注意事項 全 {c.notices.length} 件をひらく
                </span>
                <span
                  aria-hidden
                  className="font-garamond text-[13.66px] text-(--color-base-dark)/60 transition-transform duration-300 group-open:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <ol className="border-t border-(--color-base-dark)/15">
                {c.notices.map((text, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[36px_1fr] gap-x-4 border-b border-(--color-base-dark)/10 py-5"
                  >
                    <span className="font-mincho text-[11.1px] tracking-[0.06em] text-(--color-base-dark)/40 pt-[2px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-mincho text-[11.96px] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                      {text}
                    </p>
                  </li>
                ))}
              </ol>
            </details>

            {/* Desktop: always expanded */}
            <ol className="hidden md:block border-t border-(--color-base-dark)/15">
              {c.notices.map((text, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[60px_1fr] gap-x-8 border-b border-(--color-base-dark)/10 py-6"
                >
                  <span className="font-mincho text-[clamp(11.96px,0.55vw,17.08px)] tracking-[0.06em] text-(--color-base-dark)/40 pt-[2px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-mincho text-[clamp(12.81px,0.6vw,18.79px)] leading-[1.95] tracking-[0.06em] text-(--color-base-dark)/85">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <ReservationCTA tone="dark" />

      {/* Next link */}
      <section className="border-t border-(--color-base-dark)/10 px-6 py-[clamp(80px,7.3vw,112px)] md:px-12 text-center">
        <h3 className="font-serif text-[22.2px] md:text-[clamp(23.8px,1.97vw,50.4px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
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
    </main>
  );
}
