const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function SideReserve() {
  return (
    <a
      href={AIRBNB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="ご予約はこちら（Airbnb）"
      className="group hidden xl:flex fixed right-6 2xl:right-12 top-1/2 z-30 -translate-y-1/2 vrl items-center px-6 py-6 2xl:px-8 2xl:py-7 rounded-full bg-(--color-base-dark)/85 hover:bg-(--color-base-dark) backdrop-blur-[10px] border border-(--color-base-light)/15 text-(--color-base-light) shadow-[0_12px_36px_-10px_rgba(26,20,16,0.6)] hover:shadow-[0_16px_48px_-10px_rgba(26,20,16,0.7)] hover:scale-[1.025] transition-[background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    >
      {/* Top / bottom accent strokes — expand on hover for inviting tactility */}
      <span
        aria-hidden
        className="absolute top-3 left-1/2 -translate-x-1/2 h-px w-5 bg-(--color-base-light)/35 group-hover:w-8 transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      />
      <span className="font-mincho text-[clamp(16px,1.09vw,28px)] tracking-[0.45em]">
        ご予約はこちら
      </span>
      <span
        aria-hidden
        className="absolute bottom-3 left-1/2 -translate-x-1/2 h-px w-5 bg-(--color-base-light)/35 group-hover:w-8 transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      />
    </a>
  );
}
