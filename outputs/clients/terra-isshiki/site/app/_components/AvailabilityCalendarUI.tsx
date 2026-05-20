"use client";

import { useState } from "react";

const AIRBNB_URL = "https://www.airbnb.jp/rooms/1399746059557999139";
const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type PlainCell = { day: number; blocked: boolean; today: boolean } | null;
export type PlainMonth = { year: number; month: number; weeks: PlainCell[][] };

export function AvailabilityCalendarUI({
  months,
  isLive,
}: {
  months: PlainMonth[];
  isLive: boolean;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-y-3 mb-8 md:mb-12">
        <p className="font-garamond italic text-[9.1px] md:text-[clamp(9.8px,0.6vw,15.4px)] tracking-[0.4em] uppercase text-(--color-soil)">
          Availability
        </p>
        <p className="font-garamond text-[8.4px] md:text-[clamp(9.1px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/55">
          {isLive
            ? "Live from Airbnb · 1h cache"
            : "Coming soon — 当面は Airbnb で確認"}
        </p>
      </div>

      {/* Mobile tabs */}
      <div
        role="tablist"
        aria-label="表示する月"
        className="md:hidden grid grid-cols-3 mb-8 border-b border-(--color-base-dark)/15"
      >
        {months.map((m, i) => {
          const isActive = i === active;
          return (
            <button
              key={`tab-${m.year}-${m.month}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`relative pb-3 pt-1 text-center font-garamond tracking-[0.18em] text-[9.1px] transition-colors duration-300 ${
                isActive
                  ? "text-(--color-base-dark)"
                  : "text-(--color-base-dark)/40"
              }`}
            >
              {m.year}.{String(m.month + 1).padStart(2, "0")}
              <span
                aria-hidden
                className={`pointer-events-none absolute -bottom-px left-0 right-0 h-[2px] bg-(--color-base-dark) origin-center transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-12">
        {months.map((m, i) => (
          <div
            key={`${m.year}-${m.month}`}
            className={`${i === active ? "block" : "hidden"} md:block`}
            role={i === active ? undefined : "tabpanel"}
          >
            <div className="hidden md:flex mb-5 items-baseline gap-3">
              <h3 className="font-serif text-[16.8px] md:text-[clamp(18.2px,1.04vw,26.6px)] tracking-[0.04em] text-(--color-base-dark)">
                {m.year}.{String(m.month + 1).padStart(2, "0")}
              </h3>
              <span className="font-garamond italic text-[8.4px] md:text-[clamp(9.1px,0.49vw,12.6px)] tracking-[0.32em] uppercase text-(--color-base-dark)/55">
                {MONTH_LABELS[m.month]}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAYS_JP.map((w, wi) => (
                <div
                  key={w}
                  className={`font-garamond text-[7.7px] md:text-[clamp(8.4px,0.43vw,11.2px)] tracking-[0.32em] uppercase pb-2 border-b border-(--color-base-dark)/15 ${
                    wi === 0
                      ? "text-(--color-soil)"
                      : wi === 6
                      ? "text-(--color-mist)"
                      : "text-(--color-base-dark)/55"
                  }`}
                >
                  {w}
                </div>
              ))}
              {m.weeks.flat().map((cell, ci) =>
                !cell ? (
                  <div key={ci} className="aspect-square" />
                ) : cell.blocked ? (
                  <div
                    key={ci}
                    title="満室"
                    aria-label={`${cell.day}日 満室`}
                    className="relative aspect-square flex items-center justify-center font-garamond text-[10.5px] md:text-[clamp(11.2px,0.6vw,15.4px)] tracking-[0.04em] text-(--color-base-dark)/30 bg-(--color-base-dark)/[0.04]"
                  >
                    <span className="line-through decoration-(--color-base-dark)/40 decoration-[1px]">
                      {cell.day}
                    </span>
                  </div>
                ) : (
                  <a
                    key={ci}
                    href={AIRBNB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${cell.day}日 — Airbnb で予約`}
                    className={`relative aspect-square flex items-center justify-center font-garamond text-[10.5px] md:text-[clamp(11.2px,0.6vw,15.4px)] tracking-[0.04em] transition-colors duration-300 hover:bg-(--color-soil)/10 ${
                      cell.today
                        ? "text-(--color-soil) font-semibold"
                        : "text-(--color-base-dark)"
                    }`}
                  >
                    {cell.day}
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

      <div className="mt-10 md:mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 font-mincho text-[9.1px] md:text-[clamp(9.8px,0.49vw,12.6px)] tracking-[0.06em] text-(--color-base-dark)/65">
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
