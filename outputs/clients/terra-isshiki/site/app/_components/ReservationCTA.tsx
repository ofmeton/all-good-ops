const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function ReservationCTA({
  tone = "dark",
}: {
  tone?: "dark" | "light";
}) {
  const isDark = tone === "dark";
  const bg = isDark ? "bg-(--color-base-dark)" : "bg-(--color-paper)";
  const text = isDark ? "text-(--color-base-light)" : "text-(--color-base-dark)";
  const eyebrow = isDark
    ? "text-(--color-base-light)/65"
    : "text-(--color-soil)";
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
        <p
          className={`font-garamond italic text-[clamp(11.1px,0.6vw,18.79px)] tracking-[0.4em] uppercase ${eyebrow}`}
        >
          Reservation
        </p>
        <h2 className="font-serif text-[19.13px] md:text-[clamp(20.16px,1.74vw,44.8px)] leading-[1.32] tracking-[0.04em]">
          <span className="block md:inline">予約は Airbnb から。</span>
        </h2>
        <p
          className={`max-w-[680px] font-mincho text-[12.81px] md:text-[clamp(11.2px,0.66vw,16.8px)] leading-[2.0] tracking-[0.08em] ${subBody}`}
        >
          空き状況のご確認・お問い合わせ・ご予約は、Airbnb の物件ページから直接ご利用いただけます。
        </p>
        <a
          href={AIRBNB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`group inline-flex items-center gap-4 font-garamond text-[11.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.32em] uppercase px-8 md:px-[clamp(28px,2.19vw,56px)] py-4 md:py-[clamp(16px,1.09vw,28px)] transition-colors ${buttonCls}`}
        >
          <span>Book on Airbnb</span>
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
