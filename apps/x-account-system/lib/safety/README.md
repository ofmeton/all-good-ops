# Safety (PR-D)

3 つのガード装置を提供:

1. **kill-switch** — LINE `!stop` で 48h 全停止、`!resume` で即時復帰
2. **brownout-handler** — 月予算 ¥10,000 超 + brownout ¥11,500 で投稿停止 (計測継続)
3. **rollback-monitor** — PCR -30% / インプ -50% / 7 日窓 → Optimizer posterior 1 段戻し (Phase 0.5 は stub)

SSoT: `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §2.12 + `launch-roadmap.md` §5

## 共通: publishing_enabled flag

3 つのガードは Supabase `safety_state` テーブル (scope='global') の
`publishing_enabled` 列を共有する。Publisher 層は send 直前に
`assertPublishingEnabled()` を呼んで guard する。

| トリガー | publishing_enabled | resume_at | triggered_by |
|---|---|---|---|
| LINE `!stop` | false | now + 48h | LINE user_id |
| brownout | false | 月末 + 1d | "brownout" |
| LINE `!resume` | true | null | "manual:<user>" |
| monthStartReset (brownout 由来のみ) | true | null | "month_start_reset" |

## kill-switch

```ts
import { handleLineCommand, assertPublishingEnabled } from "./kill-switch.ts";

// LINE webhook で受信した text を流す
const result = await handleLineCommand(text, lineUserId);
//→ { command: 'stop' | 'resume' | 'noop', state: KillSwitchState }

// Publisher 側
await assertPublishingEnabled(); // false なら throw
```

## brownout-handler

```ts
import { evaluateBrownout } from "./brownout-handler.ts";

const monthlyCost = await getMonthlyCostJpy(); // budget-calculator から
const decision = await evaluateBrownout(monthlyCost);
//→ { status: 'ok' | 'over_limit' | 'brownout', should_stop_posting, ... }
```

月初 cron (`monthStartReset()`) で brownout 由来の停止のみ解除する
(LINE `!stop` 由来は別 cause なので残す)。

## rollback-monitor

Phase 0.5 では検出ロジックのみ実装。`rollback_steps` は 0 を返し、
PR-C (Optimizer) 完了後に `requestRollbackStep()` を実装に差し替える。

```ts
import { evaluateRollback } from "./rollback-monitor.ts";

const decision = evaluateRollback({
  pcr_current: 0.007,
  pcr_baseline: 0.010,
  impressions_current: 5000,
  impressions_baseline: 5000,
});
//→ { triggered: true, reasons: ['PCR drop -30.0% ...'], rollback_steps: 0 }
```

## Phase 0.5 fallback

すべて `IN_MEMORY_FALLBACK=true` で Supabase なしで動く。
in-memory state は process 内のみ保持 (テストの `beforeEach` で `__resetKillSwitchInMemory()`)。

## Phase 1+ TODO

- `safety_state` migration を 0006 として追加
- LINE webhook entry point (Cloudflare Workers) で `handleLineCommand` を呼ぶ
- `rollback-monitor` の hook を PR-C optimizer_state テーブル書き戻し実装に差し替え
- 月初 cron で `monthStartReset` を 0:01 JST に発火
- brownout 発火時に Daily Digest 即時送信 (次回 21:00 を待たない)
