# Daily Digest (PR-D)

21:00 JST に当日 + 7 日累計 KPI を集計し、LINE で ofmeton 宛に送信する。
brownout / kill-switch 状態 / 異常検知 alert も同梱。

SSoT: `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §A-4

## 流れ

```
collectKpis(now, deps)         deps.getMonthlyCostJpy / getKillSwitchState / getPostStats
       ↓                       Phase 0.5 fallback では stub 0 を返す
KpiSnapshot                    当日 + 7 日累計 + brownout + kill-switch + alerts
       ↓
formatDigest(kpi, to)          markdown 風 LINE 用 text を生成
       ↓
sendToLine(payload)            LINE Messaging API POST
                               LINE_DRY_RUN=true で stdout 代替
```

## KPI 項目

| Section | 項目 |
|---|---|
| 当日       | 投稿数 / インプレッション / URL クリック / PCR |
| 7 日累計   | PCR 平均 / インプ合計 |
| コスト     | 当月累計 / brownout / kill-switch |
| Alerts     | brownout / monthly_limit / kill_switch / pcr_drop / impressions_drop |
| next-action | 通常運用 / Hook review / 月初リセット / kill-switch 復帰 |

PCR (profile-click rate) は北極星指標。`user_profile_clicks / impressions`。
0 投稿日は PCR null。

## env

| env | 用途 | Phase 0.5 default |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN`       | LINE 送信 token | unset → dry-run |
| `LINE_USER_ID_OFMETON`            | 宛先 | unset → "<LINE_USER_ID_OFMETON unset>" |
| `LINE_DRY_RUN=true`               | 強制 stdout 代替 | 推奨: true |
| `IN_MEMORY_FALLBACK=true`         | Supabase 呼ばず stub | 推奨: true |
| `BUDGET_BROWNOUT_THRESHOLD_JPY`   | brownout 閾値 | 11500 |
| `BUDGET_MONTHLY_LIMIT_JPY`        | 月予算 | 10000 |

## CLI

```bash
cd apps/x-account-system
IN_MEMORY_FALLBACK=true LINE_DRY_RUN=true npm run digest:cli
```

出力例 (dry-run):

```
[LINE DRY-RUN] to=<LINE_USER_ID_OFMETON unset> message:
📊 ofmeton Daily Digest 2026-05-27
...

{
  "date": "2026-05-27",
  "send_status": "dry_run",
  "meta": { "brownout": false, "kill_switch_on": false, "alert_count": 0 }
}
```

## cron スケジュール案

- Cloudflare Workers Scheduled Event: `0 12 * * *` UTC (= 21:00 JST)
- mac launchd ローカル (Phase 0.5 検証用): `Hour=21` `Minute=0`

## Phase 1+ TODO

- PCR -30% / インプ -50% / 7 日窓 異常検知を rollback-monitor.ts と接続して alerts に統合
- `daily_digest_log` (migration 0002 / 0005) への永続化
- causal_chain (v10.3 A-4) 文字列の自動生成 (例: "PCR -32% → transfer ingest 7 日 0 件 → 翻案率 12%")
- business_outcomes (UTM 売上 attribution) 連携 (v10.3 C-10)
