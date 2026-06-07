/**
 * 決定的スロットプランナー（純関数・副作用なし）。
 *
 * 承認済みストック (post_drafts: human_approval_status='approved' AND scheduled_for IS NULL) を
 * 翌日以降のピーク帯スロット (JST) へ FIFO で割り当てる。Date.now() は使わず opts.now を
 * 基準にするためテストで決定的。DB アクセス・I/O は一切しない。
 *
 * JST(Asia/Tokyo, DST 無し=UTC+9 固定) でスロットを生成し、ISO は必ず +09:00 で出力する
 * (feedback_datetime_local_fixed_tz の流儀: datetime は Asia/Tokyo 固定)。
 */
import { SCHEDULE_CONFIG, type ScheduleConfig } from "./schedule-config.js";

export interface StockDraft {
  id: string;
  /** 承認時刻 (ISO)。null は末尾扱い (FIFO で最後) */
  human_approved_at: string | null;
}

export interface PlannedSlot {
  draftId: string;
  /** 予約公開時刻 ISO (JST, 例 "2026-06-08T07:00:00+09:00") */
  scheduledForISO: string;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 絶対時刻(Date) を JST のカレンダー要素に分解 */
function jstParts(d: Date): { year: number; month: number; day: number; hour: number; weekday: number } {
  const shifted = new Date(d.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1, // 1-12
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    weekday: shifted.getUTCDay(), // 0=Sun .. 6=Sat
  };
}

/** JST の y-m-d-hour スロットを表す絶対時刻(ms)。JST hour H = UTC H-9。 */
function jstSlotMs(year: number, month: number, day: number, hour: number): number {
  return Date.UTC(year, month - 1, day, hour - 9, 0, 0, 0);
}

/** JST の y-m-d-hour を +09:00 付き ISO 文字列に */
function jstSlotISO(year: number, month: number, day: number, hour: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:00:00+09:00`;
}

/** 既存予約 ISO を canonical な JST スロット ISO(分以下切り捨て) へ正規化 */
function canonicalizeExisting(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = jstParts(d);
  return jstSlotISO(p.year, p.month, p.day, p.hour);
}

/**
 * 承認済みストックを翌日以降のピーク帯スロットへ FIFO 割当する。
 *
 * 規則:
 *   1. stock を human_approved_at 昇順 (null は末尾) で安定ソート。
 *   2. now の「翌日0時」から lookaheadDays 日分、各日の曜日 (JST) で
 *      weekday/weekend のピーク帯時刻配列を選び、各時刻スロット(JST) を生成。
 *   3. now 以前 (<=now) のスロットは除外、existing(既予約) と同一時刻スロットは除外。
 *   4. 空きスロットへ FIFO で draft を 1 件ずつ割当。スロットを使い切ったら余剰は割当てない。
 *   5. 1日あたり maxPerDay を超えない (ピーク配列長で実質決まるが上限ガード)。
 */
export function planSlots(
  stock: StockDraft[],
  opts: { now: Date; config?: ScheduleConfig; existing?: string[] },
): PlannedSlot[] {
  const config = opts.config ?? SCHEDULE_CONFIG;
  const nowMs = opts.now.getTime();

  // existing を canonical JST スロット ISO 集合へ
  const existingSet = new Set<string>();
  for (const e of opts.existing ?? []) {
    const c = canonicalizeExisting(e);
    if (c) existingSet.add(c);
  }

  // now の JST 0時 (翌日起点の基準) の絶対時刻
  const nowJst = jstParts(opts.now);
  const nowMidnightMs = jstSlotMs(nowJst.year, nowJst.month, nowJst.day, 0);

  // 翌日(=i:1)から lookaheadDays 日分、空きスロットを時系列順に収集
  const slots: string[] = [];
  for (let i = 1; i <= config.lookaheadDays; i++) {
    const dayMs = nowMidnightMs + i * 24 * 60 * 60 * 1000;
    const day = jstParts(new Date(dayMs));
    const isWeekend = day.weekday === 0 || day.weekday === 6;
    const peakHours = (isWeekend ? config.peakHoursJstWeekend : config.peakHoursJstWeekday)
      .slice()
      .sort((a, b) => a - b)
      .slice(0, config.maxPerDay); // 上限ガード

    for (const hour of peakHours) {
      const slotMs = jstSlotMs(day.year, day.month, day.day, hour);
      if (slotMs <= nowMs) continue; // 過去/現在スロットは除外
      const iso = jstSlotISO(day.year, day.month, day.day, hour);
      if (existingSet.has(iso)) continue; // 既予約と衝突回避
      slots.push(iso);
    }
  }

  // stock を human_approved_at 昇順 (null 末尾) で安定ソート
  const sorted = stock
    .map((d, idx) => ({ d, idx }))
    .sort((a, b) => {
      const av = a.d.human_approved_at;
      const bv = b.d.human_approved_at;
      if (av === null && bv === null) return a.idx - b.idx; // 安定
      if (av === null) return 1; // null 末尾
      if (bv === null) return -1;
      if (av === bv) return a.idx - b.idx; // 安定
      return av < bv ? -1 : 1;
    })
    .map((x) => x.d);

  // FIFO 割当: スロット数まで
  const planned: PlannedSlot[] = [];
  const n = Math.min(sorted.length, slots.length);
  for (let i = 0; i < n; i++) {
    planned.push({ draftId: sorted[i].id, scheduledForISO: slots[i] });
  }
  return planned;
}
