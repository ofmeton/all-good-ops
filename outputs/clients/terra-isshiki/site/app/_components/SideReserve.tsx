const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";

export function SideReserve() {
  return (
    <a
      href={AIRBNB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="ご予約はこちら（Airbnb）"
      className="hidden xl:flex fixed right-6 2xl:right-12 top-1/2 z-30 -translate-y-1/2 vrl items-center px-5 py-10 2xl:px-7 2xl:py-14 bg-(--color-base-dark)/65 hover:bg-(--color-base-dark)/85 transition-colors duration-500 backdrop-blur-[6px] border border-(--color-base-light)/20 text-(--color-base-light)"
    >
      <span className="font-mincho text-[clamp(16px,1.09vw,28px)] tracking-[0.45em]">
        ご予約はこちら
      </span>
    </a>
  );
}
