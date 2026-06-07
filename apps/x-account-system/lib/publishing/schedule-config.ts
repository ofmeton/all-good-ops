/**
 * scheduled-publish のスロット割当を決める数値レバー（externalize）。
 *
 * 出典: チャエン分析のピーク帯（registry/chaen seed）
 *   - 朝 6-8（通勤前の可処分時間）
 *   - 昼 12（昼休み）
 *   - 夕 15-17（業務後半〜帰宅）
 * 平日は朝2枠+昼+夕2枠=5枠、週末は朝/昼/夕の3枠（在宅・分散傾向のため間引く）。
 * ピーク帯の出典は固定値ではなく Thompson 等で将来チューニングする前提の「初期 seed」。
 */
export interface ScheduleConfig {
  /** 平日(月-金)のピーク帯時刻(JST, 0-23) */
  peakHoursJstWeekday: number[];
  /** 週末(土日)のピーク帯時刻(JST, 0-23) */
  peakHoursJstWeekend: number[];
  /** 何日先まで予約を埋めるか（1=翌日のみ） */
  lookaheadDays: number;
  /** 1日あたりの上限。配列長で実質決まるが安全側の上限ガード */
  maxPerDay: number;
}

export const SCHEDULE_CONFIG: ScheduleConfig = {
  // chaen ピーク帯: 朝6-8 / 昼12 / 夕15-17。平日は朝2(7,8)+昼12+夕2(15,17)=5枠
  peakHoursJstWeekday: [7, 8, 12, 15, 17],
  // 週末は間引いて朝8 / 昼12 / 夕17 の3枠
  peakHoursJstWeekend: [8, 12, 17],
  lookaheadDays: 1,
  maxPerDay: 7,
};
