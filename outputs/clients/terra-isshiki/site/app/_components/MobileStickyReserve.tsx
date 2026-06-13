const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function MobileStickyReserve() {
  return (
    <a
      href={AIRBNB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="ご予約はこちら（Airbnb）"
      className="group xl:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full bg-(--color-base-dark) text-(--color-base-light) px-5 py-3.5 shadow-[0_8px_28px_-6px_rgba(26,20,16,0.55)] backdrop-blur-[2px] hover:bg-(--color-base-dark)/90 transition-colors duration-300"
    >
      <span className="font-mincho text-[11.1px] tracking-[0.18em] leading-none">
        ご予約はこちら
      </span>
      {/* Thin custom arrow — 細い水平線 + 控えめなシェブロン */}
      <svg
        viewBox="0 0 28 10"
        className="w-[16px] h-[7px] overflow-visible transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="0" y1="5" x2="25" y2="5" />
        <polyline points="20,1 26,5 20,9" />
      </svg>
    </a>
  );
}
