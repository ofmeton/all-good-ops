/**
 * デモ動画の脚本 SSOT。
 * - record.ts: 各 scene の actions を Playwright で順次実行・録画
 * - Remotion Demo.tsx: durationSec を frame に変換して subtitle/title をオーバーレイ
 */

export type SceneId =
  | "intro"
  | "admin-create-request"
  | "line-notify"
  | "staff-accept-start"
  | "staff-report"
  | "admin-confirm"
  | "owner-view"
  | "outro";

export interface Scene {
  id: SceneId;
  /** 30fps 前提の尺（秒） */
  durationSec: number;
  /** 動画上に出す大字幕（1行） */
  title: string;
  /** 補足字幕（小さめ・任意） */
  subtitle?: string;
  /** Playwright 録画の有無。intro/outro/line-notify/owner-view は静止画 */
  hasRecording: boolean;
}

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES: Scene[] = [
  {
    id: "intro",
    durationSec: 3,
    title: "StayClean",
    subtitle: "民泊清掃のすべてを 1 つに",
    hasRecording: false,
  },
  {
    id: "admin-create-request",
    durationSec: 12,
    title: "依頼を 30 秒で発行",
    subtitle: "物件を選んでチェックイン日を指定するだけ",
    hasRecording: true,
  },
  {
    id: "line-notify",
    durationSec: 5,
    title: "担当スタッフへ自動 LINE 通知",
    subtitle: "電話・LINE を 1 件ずつ送る作業から解放",
    hasRecording: false,
  },
  {
    id: "staff-accept-start",
    durationSec: 15,
    title: "スマホ 1 タップで承認・開始",
    subtitle: "現場到着 → ボタンを押すだけ",
    hasRecording: true,
  },
  {
    id: "staff-report",
    durationSec: 25,
    title: "チェックリスト + 写真で完了報告",
    subtitle: "物件ごとのテンプレが自動で表示",
    hasRecording: true,
  },
  {
    id: "admin-confirm",
    durationSec: 10,
    title: "管理画面で写真を確認 → 完了通知",
    subtitle: "クライアント (オーナー) に自動メール",
    hasRecording: true,
  },
  {
    id: "owner-view",
    durationSec: 8,
    title: "オーナーはいつでも履歴を閲覧",
    subtitle: "ログイン不要のセキュア URL",
    hasRecording: false,
  },
  {
    id: "outro",
    durationSec: 5,
    title: "お問合せ",
    subtitle: "ofmeton — off.me.ton@gmail.com",
    hasRecording: false,
  },
];

export const TOTAL_SEC = SCENES.reduce((s, x) => s + x.durationSec, 0);
export const TOTAL_FRAMES = TOTAL_SEC * FPS;
