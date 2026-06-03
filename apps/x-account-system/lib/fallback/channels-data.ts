/**
 * channels-data.ts — fallback_channels.yaml の TS 定数化 (Worker SSOT)
 *
 * Node:fs / js-yaml を使わず、Cloudflare Worker でそのまま import できる。
 * 元 YAML: config/fallback_channels.yaml (参照用に残置、SSOT はこのファイル)
 */

type FallbackConfig = {
  primary: { platform: string; account: string };
  fallbacks: Array<{
    name: string;
    type: string;
    description: string;
    target_subscribers?: number;
    domain?: string;
    cost_jpy_per_month: number;
    setup_steps: string[];
  }>;
  triggers: Record<
    string,
    {
      description: string;
      detection: string;
      action: string;
      human_notification: boolean;
      cooldown_min?: number;
    }
  >;
  recovery: { resume_x_after_minutes: number; manual_resume_only: string[] };
};

export type { FallbackConfig };

export const FALLBACK_CONFIG: FallbackConfig = {
  primary: {
    platform: "x",
    account: "ofmeton",
  },
  fallbacks: [
    {
      name: "note_email_subscription",
      type: "email_list",
      description:
        "note の Form Builder (https://note.com/<user>/membership) でメール購読を取り、\nX 障害時に「次回 note 更新まで note 上で発信を続けます」と LINE 通知 + note 投稿。\n",
      target_subscribers: 50,
      cost_jpy_per_month: 0,
      setup_steps: [
        "note Form Builder を有効化 (Phase 0 Week 0)",
        "X bio / Linktree に 'note 更新通知' リンク追加",
        "ファースト 5 投稿の note で購読を呼びかけ",
      ],
    },
    {
      name: "owned_domain_blog",
      type: "blog",
      description:
        "ofmeton.com (要取得) に Astro 静的サイトで blog 機能を実装し、\nX 障害時はここに primary content を流して X → 復旧後に同期。\n",
      domain: "ofmeton.com",
      cost_jpy_per_month: 0,
      setup_steps: [
        "ofmeton.com を取得",
        "Vercel に Astro リポを deploy (apps/x-account-system/blog 等)",
        "X bio に owned domain を明記",
      ],
    },
    {
      name: "line_consented_subscribers",
      type: "line_messaging",
      description:
        "X bio / note 公開許諾済の LINE 友達 (consent_obtained_from='line') に\nX 障害時に「今日の発信」を LINE で配信。\n",
      target_subscribers: 30,
      cost_jpy_per_month: 0,
      setup_steps: [
        "LINE 公式アカウント (友達追加 URL を bio に追加)",
        "公開許諾 gate (Supabase materials_store) で consent='granted' 取得",
        "週次 batch でメッセージ配信 (interview_records.publication_consent と整合)",
      ],
    },
  ],
  triggers: {
    x_suspended: {
      description: "X アカウント停止",
      detection: "GET /2/users/me で 403 / suspended エラー",
      action: "switch_to_all_owned_channels",
      human_notification: true,
    },
    x_rate_limit_429: {
      description: "短時間 429 連続 (5 回 / 1 時間)",
      detection: "投稿 cron で 429 5 回連続",
      action: "throttle_posting + notify_human",
      human_notification: true,
      cooldown_min: 60,
    },
    x_shadowban: {
      description: "impressions 急落 (前週比 -70% 以上が 3 日連続)",
      detection: "performance_metrics で impressions trend",
      action: "switch_to_owned_channels_primary + manual_review",
      human_notification: true,
    },
    oauth_blocked: {
      description: "refresh_token 失効 (pkce-test.ts step 5 で検出)",
      detection: "refresh API 401 / invalid_grant",
      action: "pause_posting_cron + notify_human",
      human_notification: true,
    },
  },
  recovery: {
    resume_x_after_minutes: 60,
    manual_resume_only: ["x_suspended", "oauth_blocked"],
  },
};
