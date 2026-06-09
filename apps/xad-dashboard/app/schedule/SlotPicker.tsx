"use client";
import { useMemo } from "react";
import {
  candidateSlotsForDate,
  jstDateAtOffset,
  fmtJst,
  isWeekendJstDate,
} from "@/lib/schedule-logic";

/** 何日先まで手動候補を出すか（当日 or 翌日起点から）。 */
const PICKER_DAYS = 4;

/**
 * 1 draft のスロット手動編集。当日トグル(same-day)に応じて候補日の起点を変える。
 * 候補は空きピーク帯（過去帯・既使用スロットは除外）。最終 scheduledFor は confirm で
 * Worker の冪等ガードを必ず通るため、ここは UI アフォーダンス。
 */
export function SlotPicker({
  value,
  includeToday,
  nowMs,
  usedISO,
  disabled,
  onChange,
}: {
  value: string | undefined;
  includeToday: boolean;
  nowMs: number;
  usedISO: string[];
  disabled: boolean;
  onChange: (iso: string | undefined) => void;
}) {
  // 自分が今割当てている slot は exclude しない（自分の選択肢として残す）
  const excludeISO = useMemo(
    () => usedISO.filter((s) => s !== value),
    [usedISO, value],
  );

  const groups = useMemo(() => {
    const startOffset = includeToday ? 0 : 1;
    const out: { date: string; label: string; slots: string[] }[] = [];
    for (let k = 0; k < PICKER_DAYS; k++) {
      const date = jstDateAtOffset(nowMs, startOffset + k);
      const slots = candidateSlotsForDate(date, { nowMs, excludeISO });
      if (slots.length === 0) continue;
      const wkLabel = isWeekendJstDate(date) ? "週末" : "平日";
      out.push({ date, label: `${date.slice(5)}（${wkLabel}）`, slots });
    }
    return out;
  }, [includeToday, nowMs, excludeISO]);

  // 現在値が候補に無い場合（範囲外/既予約衝突回避で消えた等）でも選択を保持できるよう先頭に出す
  const valueInGroups = useMemo(
    () => (value ? groups.some((g) => g.slots.includes(value)) : true),
    [groups, value],
  );

  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-40"
    >
      <option value="">未割当（今回は予約しない）</option>
      {value && !valueInGroups && <option value={value}>{fmtJst(value)}（現在の割当）</option>}
      {groups.map((g) => (
        <optgroup key={g.date} label={g.label}>
          {g.slots.map((iso) => (
            <option key={iso} value={iso}>
              {fmtJst(iso)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
