import Image from "next/image";
import { SiteHeader } from "../_components/SiteHeader";
import { ParallaxLayer } from "../_components/ParallaxLayer";
import { SiteFooter } from "../_components/SiteFooter";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";

/* 文言・写真パスは app/copy.ts（ACCESS_PAGE / POINTS / SITE）で編集できます。 */

export function AccessView({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const c = copy.ACCESS_PAGE;
  const { SITE, POINTS } = copy;

  // 住所 query で Google Maps の geocoding に任せる方式に統一（embed + link で
  // 同じピン位置が出るようにする）
  const MAPS_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(
    SITE.mapQuery,
  )}&z=16&output=embed`;
  const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    SITE.mapQuery,
  )}`;

  return (
    <main className="bg-(--color-base-light)">
      <SiteHeader variant="page" current="Access" locale={locale} copy={copy} />

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
            <span className={`block ${locale === "ja" ? "whitespace-nowrap" : ""}`}>{c.hero.title}</span>
          </h1>
          <p
            className="fade-up mt-5 md:mt-8 font-mincho text-[11.96px] md:text-[clamp(var(--fs-lv3),0.71vw,18.2px)] leading-[1.85] tracking-[0.16em] text-(--color-base-light)/85"
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

      {/* Address & POI */}
      <section className="relative pt-[clamp(40px,4vw,72px)] md:pb-[clamp(40px,4vw,72px)]">
        <div className="grid md:grid-cols-2 items-stretch">
          <div className="px-6 py-[clamp(80px,7.3vw,112px)] md:px-16 lg:px-24 flex flex-col justify-center">
            <h2 className="font-serif text-[19.13px] md:text-[clamp(19.04px,1.58vw,40.32px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-8">
              <span className="block">{c.location.title}</span>
            </h2>
            <dl className="border-t border-(--color-base-dark)/15 divide-y divide-(--color-base-dark)/10 mb-10">
              {c.location.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[88px_1fr] md:grid-cols-[120px_1fr] py-5"
                >
                  <dt className="font-serif text-[12.81px] md:text-[clamp(11.9px,0.66vw,16.8px)] tracking-[0.08em] text-(--color-base-dark)/70 pt-[2px]">
                    {row.label}
                  </dt>
                  <dd className="font-mincho text-[12.81px] md:text-[clamp(11.2px,0.6vw,15.4px)] leading-[1.85] tracking-[0.06em] text-(--color-base-dark)/90">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[82svh] w-full overflow-hidden">
            <ParallaxLayer>
              <Image
                src={c.location.sideImg.src}
                alt={c.location.sideImg.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                quality={88}
                className="object-cover object-center md:object-[50%_80%]"
              />
            </ParallaxLayer>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-(--color-paper) px-6 py-[clamp(96px,8.34vw,128px)] md:px-12">
        <div className="mx-auto max-w-[1480px]">
          <h2 className="font-serif text-[17.76px] md:text-[clamp(17.92px,1.4vw,35.84px)] leading-[1.4] tracking-[0.04em] text-(--color-base-dark) mb-10">
            {c.map.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>

          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden border border-(--color-base-dark)/10 bg-(--color-base-light)">
            <iframe
              src={MAPS_EMBED}
              loading="lazy"
              className="w-full h-full"
              style={{ border: 0, filter: "grayscale(0.4) sepia(0.05)" }}
              title={c.map.iframeTitle}
            />
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2 bottom-2 md:right-3 md:bottom-3 inline-flex items-center gap-1.5 md:gap-2 bg-(--color-base-light)/95 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 text-(--color-base-dark) font-serif text-[10px] md:text-[clamp(9.8px,0.55vw,13px)] tracking-[0.08em] border border-(--color-base-dark)/15 hover:bg-(--color-base-light)"
            >
              {c.map.mapsCta}
              <span aria-hidden>→</span>
            </a>
          </div>

          <ul className="mt-12 grid gap-y-3 md:grid-cols-2 md:gap-x-12 md:gap-y-4">
            {POINTS.map((p) => (
              <li
                key={p.name}
                className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-(--color-base-dark)/10 py-3"
              >
                <div>
                  <p className="font-serif text-[14.52px] md:text-[clamp(14px,0.82vw,21px)] tracking-[0.04em] text-(--color-base-dark)">
                    {p.name}
                  </p>
                  <p className="mt-1.5 font-mincho text-[11.1px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.06em] text-(--color-base-dark)/65">
                    {p.note}
                  </p>
                </div>
                <p className="font-mincho text-[11.1px] md:text-[clamp(9.8px,0.55vw,13px)] tracking-[0.08em] text-(--color-base-dark)/70 whitespace-nowrap">
                  {p.time}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter copy={copy} locale={locale} />
    </main>
  );
}
