import { SITE, CTA } from "../copy";

/* 文言は app/copy.ts（CTA / SITE.reserveButton）で編集できます。 */

export function ReservationCTA({
  tone = "dark",
}: {
  tone?: "dark" | "light";
}) {
  const isDark = tone === "dark";
  const bg = isDark ? "bg-(--color-base-dark)" : "bg-(--color-paper)";
  const text = isDark ? "text-(--color-base-light)" : "text-(--color-base-dark)";
  const subBody = isDark
    ? "text-(--color-base-light)/80"
    : "text-(--color-base-dark)/75";
  const buttonCls = isDark
    ? "bg-(--color-base-light) text-(--color-base-dark) hover:bg-(--color-base-light)/85"
    : "bg-(--color-base-dark) text-(--color-base-light) hover:bg-(--color-base-dark)/85";

  return (
    <section
      className={`relative ${bg} ${text} px-6 py-[clamp(80px,7.3vw,112px)] md:px-12`}
    >
      <div className="mx-auto max-w-[1280px] flex flex-col items-start md:items-center md:text-center gap-8 md:gap-10">
        <h2 className="font-serif text-[19.13px] md:text-[clamp(20.16px,1.74vw,44.8px)] leading-[1.32] tracking-[0.04em]">
          <span className="block md:inline">{CTA.title}</span>
        </h2>
        <p
          className={`max-w-[680px] font-mincho text-[12.81px] md:text-[clamp(11.2px,0.66vw,16.8px)] leading-[2.0] tracking-[0.08em] ${subBody}`}
        >
          {CTA.body}
        </p>
        <a
          href={SITE.airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`group inline-flex items-center gap-4 font-serif text-[13px] md:text-[clamp(12.6px,0.71vw,17.5px)] tracking-[0.1em] px-8 md:px-[clamp(28px,2.19vw,56px)] py-4 md:py-[clamp(16px,1.09vw,28px)] transition-colors ${buttonCls}`}
        >
          <span>{SITE.reserveButton}</span>
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
