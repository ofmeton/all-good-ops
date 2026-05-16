const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function MobileStickyReserve() {
  return (
    <a
      href={AIRBNB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="ご予約はこちら（Airbnb）"
      className="xl:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full bg-(--color-base-dark) text-(--color-base-light) px-5 py-3.5 shadow-[0_8px_28px_-6px_rgba(26,20,16,0.55)] backdrop-blur-[2px] hover:bg-(--color-base-dark)/90 transition-colors duration-300"
    >
      <span className="font-mincho text-[13px] tracking-[0.18em] leading-none">
        ご予約はこちら
      </span>
      <span
        aria-hidden
        className="font-garamond text-[14px] leading-none -translate-y-px"
      >
        ↗
      </span>
    </a>
  );
}
