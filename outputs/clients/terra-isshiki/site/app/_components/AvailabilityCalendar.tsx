import {
  buildBlockedSet,
  buildUpcomingMonths,
  fetchAvailability,
} from "../_lib/availability";

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";
const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function AvailabilityCalendar({
  monthCount = 3,
}: {
  monthCount?: number;
}) {
  const ranges = await fetchAvailability();
  const blocked = buildBlockedSet(ranges);
  const months = buildUpcomingMonths(monthCount, blocked);
  const isLive = ranges.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-y-3 mb-8 md:mb-12">
        <p className="font-garamond italic text-[13px] md:text-[clamp(14px,0.86vw,22px)] tracking-[0.4em] uppercase text-(--color-soil)">
          Availability
        </p>
        <p className="font-garamond text-[12px] md:text-[clamp(13px,0.7vw,18px)] tracking-[0.32em] uppercase text-(--color-base-dark)/55">
          {isLive
            ? "Live from Airbnb · 1h cache"
            : "Coming soon — 当面は Airbnb で確認"}
        </p>
      </div>

      <div className="grid gap-10 md:gap-12 md:grid-cols-3">
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`}>
            <div className="mb-5 flex items-baseline gap-3">
              <h3 className="font-serif text-[24px] md:text-[clamp(26px,1.48vw,38px)] tracking-[0.04em] text-(--color-base-dark)">
                {m.year}.{String(m.month + 1).padStart(2, "0")}
              </h3>
              <span className="font-garamond italic text-[12px] md:text-[clamp(13px,0.7vw,18px)] tracking-[0.32em] uppercase text-(--color-base-dark)/55">
                {MONTH_LABELS[m.month]}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAYS_JP.map((w, i) => (
                <div
                  key={w}
                  className={`font-garamond text-[11px] md:text-[clamp(12px,0.62vw,16px)] tracking-[0.32em] uppercase pb-2 border-b border-(--color-base-dark)/15 ${
                    i === 0
                      ? "text-(--color-soil)"
                      : i === 6
                      ? "text-(--color-mist)"
                      : "text-(--color-base-dark)/55"
                  }`}
                >
                  {w}
                </div>
              ))}
              {m.weeks.flat().map((cell, i) =>
                !cell ? (
                  <div key={i} className="aspect-square" />
                ) : cell.blocked ? (
                  <div
                    key={i}
                    title="満室"
                    aria-label={`${cell.date.getDate()}日 満室`}
                    className="relative aspect-square flex items-center justify-center font-garamond text-[15px] md:text-[clamp(16px,0.86vw,22px)] tracking-[0.04em] text-(--color-base-dark)/30 bg-(--color-base-dark)/[0.04]"
                  >
                    <span className="line-through decoration-(--color-base-dark)/40 decoration-[1px]">
                      {cell.date.getDate()}
                    </span>
                  </div>
                ) : (
                  <a
                    key={i}
                    href={AIRBNB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${cell.date.getDate()}日 — Airbnb で予約`}
                    className={`relative aspect-square flex items-center justify-center font-garamond text-[15px] md:text-[clamp(16px,0.86vw,22px)] tracking-[0.04em] transition-colors duration-300 hover:bg-(--color-soil)/10 ${
                      cell.today
                        ? "text-(--color-soil) font-semibold"
                        : "text-(--color-base-dark)"
                    }`}
                  >
                    {cell.date.getDate()}
                    {cell.today && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-px w-3 bg-(--color-soil)" />
                    )}
                  </a>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 md:mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 font-mincho text-[13px] md:text-[clamp(14px,0.7vw,18px)] tracking-[0.06em] text-(--color-base-dark)/65">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 bg-(--color-base-dark)/[0.04] line-through decoration-(--color-base-dark)/40" />
          満室・チェックアウト前後
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 border border-(--color-base-dark)/30" />
          空き・クリックで Airbnb 予約画面へ
        </span>
        <span className="hidden md:inline">※ Airbnb の予約状況と最大 1 時間のラグがあります。</span>
      </div>
    </div>
  );
}
