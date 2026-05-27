/**
 * Dashboard / Daily Digest types (PR-D)
 *
 * SSoT: main-design-all-versions.md §A-4 Daily Digest 因果連鎖 + launch-roadmap §5
 */

export interface KpiSnapshot {
  /** ISO date 'YYYY-MM-DD' (JST 21:00 で集計した「今日」). */
  date: string;
  /** 当日投稿件数. */
  posts_today: number;
  /** 当日合計インプレッション. */
  impressions_today: number;
  /** 当日合計 url_link_clicks. */
  url_link_clicks_today: number;
  /** 当日 PCR (profile_clicks / impressions). 投稿 0 件 → null. */
  pcr_today: number | null;
  /** 7 日累計 PCR. */
  pcr_7d_avg: number | null;
  /** 7 日累計 impressions. */
  impressions_7d_sum: number;
  /** brownout 状態 (¥11,500 超でtrue). */
  brownout: boolean;
  /** kill-switch 発動中 (publishing_enabled=false). */
  kill_switch_on: boolean;
  /** 当月コスト累計 (JPY). */
  cost_jpy_mtd: number;
  /** 異常検知 alert. */
  alerts: Alert[];
}

export interface Alert {
  severity: "info" | "warn" | "critical";
  /** rule_id (rollback / brownout / kill_switch / pcr_drop / impressions_drop). */
  rule_id: string;
  message: string;
  /** 計測値. */
  value?: number;
  /** しきい値. */
  threshold?: number;
}

export interface DigestPayload {
  date: string;
  /** LINE 送信用 markdown 風 text. */
  text: string;
  /** LINE 送信先 user_id. */
  to: string;
  /** payload meta. */
  meta: {
    brownout: boolean;
    kill_switch_on: boolean;
    alert_count: number;
  };
}
