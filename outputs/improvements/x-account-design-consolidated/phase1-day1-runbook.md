# Phase 1 Day 1 Soft Launch Runbook

> 起案: 2026-05-27 / オーナー: ofmeton + Claude (system-engineer × brand-publisher)
> 上流 SSOT: `launch-roadmap.md` / `main-design-all-versions.md` / `initial-values-design.md` / `style-guide-all-versions.md`
> 適用日: **2026-06-08 (soft launch 当日)** + 前日準備 (2026-06-07)

---

## 0. このドキュメントについて

X+note Phase 1 soft launch (1 投稿/日 + 人間承認モード) 開始当日の手順書。

PR-A〜PR-E 全実装 + 人間タスク H-1〜H-5 + H-8 + H-10 が完了している前提で、初日 1 投稿を成功させ Daily Digest / kill-switch / brownout / rollback が動くことを確認する。

### 適用 Pre-condition

| 項目 | 状態 |
|---|---|
| H-1: X Developer Console + OAuth 2.0 PKCE | ✅ `X_CLIENT_ID` / `X_CLIENT_SECRET` 取得済 |
| H-2: Supabase project + migrations 0001-0005 apply | ✅ `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 取得済 |
| H-3: ANTHROPIC + OpenAI API key | ✅ 月予算 cap 設定済 |
| H-4: Cloudflare Workers OR launchd 代替 | ✅ cron 起動先確定 |
| H-5: LINE Messaging API | ✅ `LINE_CHANNEL_*` + `LINE_USER_ID_OFMETON` |
| H-8: note 購読 + ofmeton.com + LINE 友達 30 | ✅ 導線設置済 |
| H-10: budget-calculator + brownout 同意 | ✅ 月 ¥10,000 / brownout ¥11,500 同意済 |
| **PR-A** Editor 6+5 pipeline | ✅ main HEAD 反映 |
| **PR-B** Publisher X + Writer X + E2E | ✅ main HEAD 反映 |
| **PR-C** Optimizer Thompson + 死守ガード | ✅ main HEAD 反映 |
| **PR-D** Interviewer + Daily Digest + kill-switch + brownout + MA teardown | ✅ main HEAD 反映 |
| **PR-E** Visualizer + Writer note/IG + UTM | ✅ main HEAD 反映 |
| Phase 1 Month 1 Initial Content (C-2 industry_sop 6 + C-3 pinned + C-4 bio) | ✅ ofmeton 採用確定済 |
| verified failure_story (C-1) | ✅ 4 本以上の在庫確保済 (initial-values §3.2 cap) |

上記いずれかが未完なら soft launch は延期、`launch-roadmap.md` §6 クリティカルパスの該当ステップに戻る。

---

## 1. 前日 (6/7) チェックリスト

### 1.1 .env.local 確定

```bash
# apps/x-account-system/.env.local (cp from .env.example、値を埋める)
cd /Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system
cp .env.example .env.local

# money-bot からの流用 (ANTHROPIC + TWITTERAPI + LINE)
grep -E "^(ANTHROPIC_API_KEY|TWITTERAPI_IO_KEY|LINE_CHANNEL_ACCESS_TOKEN|LINE_CHANNEL_SECRET|LINE_TO_USER_ID)=" \
  ../../money-bot/.env.local >> .env.local

# LINE_TO_USER_ID → LINE_USER_ID_OFMETON にリネーム (sed)
sed -i '' 's/^LINE_TO_USER_ID=/LINE_USER_ID_OFMETON=/' .env.local

# 残り (X / Supabase / OpenAI) を H-1/H-2/H-3 から手動で追記
```

確認:
```bash
# 必須 9 key が空でないことを check
for k in ANTHROPIC_API_KEY OPENAI_API_KEY X_CLIENT_ID X_CLIENT_SECRET \
         SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY LINE_CHANNEL_ACCESS_TOKEN \
         LINE_CHANNEL_SECRET LINE_USER_ID_OFMETON; do
  v=$(grep "^${k}=" .env.local | cut -d= -f2-)
  [ -z "$v" ] && echo "❌ ${k} 未設定" || echo "✅ ${k} 設定済"
done
```

### 1.2 npm install + ビルド確認

```bash
cd apps/x-account-system
npm install
npm test                    # 全 PR-A〜PR-E test PASS 確認
npm run editor:cli < .data/fixtures/sample-input.json   # Editor dry-run
npm run pipeline:dryrun     # E2E dry-run smoke
```

期待結果:
- 全 test PASS
- Editor dry-run: `decision: "approved" or "rejected"` で出力
- E2E dry-run: `status: "dry_run"`, `totalDurationMs < 10000` (E-46 budget)

### 1.3 Supabase 接続確認

```bash
# 接続 + 主要 table 確認
IN_MEMORY_FALLBACK=false node -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
['materials_store','post_drafts','posted_records','optimizer_state','attribution_events'].forEach(async t => {
  const { count, error } = await s.from(t).select('*', { count: 'exact', head: true });
  console.log(t, error ? '❌ ' + error.message : '✅ ' + count + ' rows');
});
"
```

### 1.4 LINE 接続確認

```bash
# Daily Digest を手動実行して LINE に届くか確認
LINE_DRY_RUN=false IN_MEMORY_FALLBACK=true npm run digest:cli
```

ofmeton の LINE に「Phase 1 Day 0 (リハーサル) Daily Digest」が届けば OK。

### 1.5 cron 起動先の設定

**Option A: Cloudflare Workers Paid ($5/月)** — H-4 で契約済の場合:
```bash
# wrangler.toml + cron schedule 確認
cat apps/x-account-system/wrangler.toml
npx wrangler deploy
npx wrangler triggers list
```

**Option B: mac launchd (¥0)** — H-4 skip の場合:
```bash
# ~/Library/LaunchAgents/com.ofmeton.x-account.daily-digest.plist を作成
cp scripts/launchd/com.ofmeton.x-account.daily-digest.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ofmeton.x-account.daily-digest.plist
launchctl list | grep ofmeton
```

実行時刻確認:
- Daily Digest: 21:00 JST
- GitHub Trending fetch: 07:00 JST (H-14)
- Optimizer monthly update: 月初 02:00 JST (cron)

### 1.6 OAuth 動作確認

```bash
npm run oauth:test
# Step 1-5 を完走 (lib/oauth/oauth-test-checklist.md 参照)
```

期待: `tweet.read tweet.write users.read offline.access` の scope で access_token + refresh_token を取得。

### 1.7 初投稿の素材確定

| C-3 pinned post | 1 案選択して X に手動投稿 (固定表示)、note bio に同案を反映 |
|---|---|
| C-4 bio | X bio + note bio に反映 (note URL placeholder を実 URL に差し替え) |
| C-2 industry_sop #1 | Day 1 投稿用に確定 (initial-values §3.2 Hook 配分 number 25%、§3.8 industry_sop) |

---

## 2. Day 1 (6/8) 手順

### 2.1 06:00 JST: 起床確認 (任意、cron が自動)

GitHub Trending 07:00 JST fetch を確認:
```bash
ls -lt raw/publishing/github-trending/ | head -3
# 当日 YYYY-MM-DD.json があれば cron OK
```

### 2.2 08:00 JST: Writer 起動 + Editor 通過

```bash
cd apps/x-account-system
IN_MEMORY_FALLBACK=false npm run pipeline:dryrun \
  -- --idea-id industry_sop_001
```

期待:
- Writer (Sonnet 4.6) が draft 生成
- Editor 6+5 ルール check (DLP + 業法 + Hook 配分 + 公開許諾 gate)
- `decision: "approved"` で `riskLevel: "low"`

### 2.3 09:00 JST: ofmeton への承認 LINE

Daily Digest または個別承認 LINE が ofmeton に届く:

```
[承認依頼 Day 1]

draft_id: draft_20260608_001
body (140 chars):
「経理担当のあなたが ChatGPT で月末締めの仕訳を 30 分→3 分にする SOP を貼っておきます。...」

✅ Editor: approved
🎯 PCR 予測: 0.X%
⏰ 投稿予定: 12:00 JST

承認: 返信「OK」
修正依頼: 返信「NG: <理由>」
全停止: 返信「!stop」
```

ofmeton が「OK」と返信 → Publisher 起動。

### 2.4 12:00 JST: Publisher 投稿

Publisher が承認済 draft を X API 経由で投稿:

```bash
# 実際は cron / webhook が trigger するが、手動 confirm 用
IN_MEMORY_FALLBACK=false LINE_DRY_RUN=false \
  npx tsx lib/publisher/x-publisher.ts --draft-id draft_20260608_001
```

期待:
- `status: "published"`, `tweetId: "1234567890..."`, `postedAt: "2026-06-08T12:00:00+09:00"`

### 2.5 12:01-21:00 JST: posted_records 集計

Publisher が `posted_records` テーブルに投稿結果を INSERT。`kpi-collector.ts` が impression / PCR / url_link_clicks を非同期に集計 (X API non_public_metrics、OAuth 2.0 PKCE User Context 必須)。

### 2.6 21:00 JST: Daily Digest 受信

cron で Daily Digest が自動起動。ofmeton に LINE 通知:

```
[Daily Digest 2026-06-08]

当日投稿: 1 件 (1/30 計画)
PCR: 0.X% (top 30%: ≥ Y%)
url_link_clicks: N (median: M)
インプ: K
budget: ¥X 消費 / ¥10,000 上限 (Z%)
brownout: ✅ 余裕

異常検知: なし
kill-switch: 平常
verified failure_story 月: 0/4
industry_sop 月: 1/6 投稿
first_hand 月比率: 100% (target ≥ 30%)

next: 6/9 朝 Writer → 承認 → 投稿
```

---

## 3. ガード装置 動作確認 (Day 1 で一度ずつ test)

### 3.1 kill-switch test (15:00 JST)

ofmeton が LINE に `!stop` 送信 → Publisher が 48 時間停止状態に移行:

```bash
# Supabase posted_records.publishing_enabled = false / 48h
# 確認:
IN_MEMORY_FALLBACK=false npx tsx -e "
import { isKillSwitchActive } from './lib/safety/kill-switch.ts';
console.log(await isKillSwitchActive());  // true
"

# 復帰 (test 用):
LINE で `!resume` 送信 OR
IN_MEMORY_FALLBACK=false npx tsx -e "
import { disableKillSwitch } from './lib/safety/kill-switch.ts';
await disableKillSwitch();
"
```

### 3.2 brownout test (16:00 JST)

`apps/x-account-system/.env.local` で一時的に `BUDGET_FAKE_USED_JPY=11600` を設定 → brownout 発動確認:

```bash
BUDGET_FAKE_USED_JPY=11600 npx tsx lib/safety/brownout-handler.ts --check
# 期待: { brownout: true, reason: "exceeded_threshold" }
```

復帰:
```bash
# .env.local から BUDGET_FAKE_USED_JPY を削除 → 平常
```

### 3.3 rollback monitor test (17:00 JST)

mock 用 SQL を Supabase に流す:
```sql
-- 過去 7 日の PCR を一時的に低く偽装 (test 用)
UPDATE posted_records SET pcr = pcr * 0.6 WHERE posted_at > now() - interval '7 days';
```

`rollback-monitor` を手動起動:
```bash
npx tsx lib/safety/rollback-monitor.ts --check
# 期待: { triggered: true, reason: "pcr_drop_30pct", action: "rollback_to_snapshot" }
```

復帰 (test 用):
```sql
UPDATE posted_records SET pcr = pcr / 0.6 WHERE posted_at > now() - interval '7 days';
```

### 3.4 Editor 6+5 fail-fast 確認

DLP / 業法 / Hook 配分 違反の draft を投入し reject されることを確認:

```bash
echo '{ "body": "田中様 ¥120,000 03-1234-5678 税理士法人と独占契約", "fmat": "short", ... }' | \
  npx tsx lib/editor/cli.ts
# 期待: { decision: "rejected", rejectReasons: ["X5_dlp_and_proper_noun"], ... }
```

---

## 4. 緊急時連絡フロー

### 4.1 投稿後の規約違反疑いを発見

1. LINE で `!stop` → 全停止 48h
2. 該当 tweet を X 上で手動削除 (Publisher は削除権限なし)
3. `posted_records.deletion_reason` を Supabase で手動更新
4. ofmeton + Claude で原因分析 → DLP / 業法 / Editor のいずれかを強化
5. fix 確認後 `!resume`

### 4.2 OAuth token expire / API rate limit

- Publisher が `refreshAccessToken` で自動 cycle (offline.access)
- rate limit 429: Publisher retry max 3 + exponential backoff、それでも fail なら LINE 通知
- 1 hour 以上停止が続いたら ofmeton が H-1 step を再確認

### 4.3 月予算 brownout 発動

- 投稿停止 + 計測継続 + Daily Digest 継続
- ofmeton が月初リセット待つか、手動復帰 (`!resume_budget` で月予算超過を許可)

### 4.4 verified failure_story 月 4 本超過警告

- Editor が 5 本目を自動 reject (X3_failure_story_verified)
- ofmeton には Daily Digest で「月 cap に到達」通知
- 翌月 1 日に自動リセット

---

## 5. Week 1 末 (6/14) 評価

### 5.1 E-46 計測

```bash
# 1 件あたりの Editor 処理時間
npx tsx lib/editor/cli.ts < .data/fixtures/sample-input.json | jq '.totalDurationMs'
# 7 件平均 < 10,000ms 目標
```

### 5.2 KPI 初期値

| 項目 | Day 7 計画 | 実測 |
|---|---|---|
| X 投稿数 | 7 件 | ? |
| PCR 中央値 | 0.X% | ? |
| インプ 中央値 | K | ? |
| url_link_clicks 合計 | N | ? |
| note 無料記事公開 | 1 件 | ? |
| LINE 友達数 | 30+ | ? |

### 5.3 E-47 verified failure_story 在庫

- 月 4 本上限の運用可能性 (Phase 1 Month 1-3 で評価)

### 5.4 Optimizer Phase 1 起動

```bash
npm run optimizer:test  # 全 14 test PASS 確認
# 30 投稿後 (~ 7/7) に posterior 初回更新
```

---

## 6. Day 2 以降の運用

- Writer → Editor → LINE 承認 → Publisher の人間承認モードを Day 30 まで継続
- Daily Digest 毎日 21:00 JST 受信
- 30 投稿後 (~ 7/7): Optimizer 初回 posterior 更新 → ロックバック発動なければ Hook 配分 / 時間帯 / format 比率を Thompson でサンプル
- 60 投稿後 (~ 8/6): winner/loser 確定、自動投稿モード移行判断

---

## 7. SSOT 参照

- `outputs/improvements/x-account-design-consolidated/launch-roadmap.md` (Phase 全体)
- `apps/x-account-system/HUMAN_TASKS.md` (H-1〜H-15 詳細)
- `outputs/improvements/x-account-design-consolidated/handson-h1-to-h10.md` (人間タスク手順書)
- `outputs/improvements/x-account-design-consolidated/initial-values-design.md` §8 (Phase 1 採用初期値)
- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §2.11 (Phase 進行計画)
- `apps/x-account-system/lib/editor/README.md` (Editor 6+5)
- `apps/x-account-system/lib/publisher/README.md` (Publisher X)
- `apps/x-account-system/lib/optimizer/README.md` (Optimizer Thompson)
- `apps/x-account-system/lib/dashboard/README.md` (Daily Digest)
- `apps/x-account-system/lib/safety/README.md` (kill-switch + brownout + rollback)

---

## 8. 改訂履歴

- 2026-05-27: v1.0 初版起案 (Phase 0.5 完了直後)
