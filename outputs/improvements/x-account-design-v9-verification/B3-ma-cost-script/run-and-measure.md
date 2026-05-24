# MA 実コスト測定 — 実行手順 + 記録テンプレ

## 0. 実行前チェックリスト (ユーザー承認後に上から順に)

- [ ] `.env.local` が `B3-ma-cost-script/` 直下に存在し、`ANTHROPIC_API_KEY` が設定済み
- [ ] 推定コスト $0.53 ≒ ¥82 (セーフティ上限 $2 ≒ ¥310) を承認済み (`./expected-cost.md` 参照)
- [ ] Anthropic Console で MA beta 有効化済み (`managed-agents-2026-04-01` access)
- [ ] **`create-agents.ts` 実行済**で、出力された MA_ENVIRONMENT_ID / MA_AGENT_ID / MA_AGENT_ID_OPUS を `.env.local` に追記済み

---

## 1. .env.local の必要キー一覧

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# MA リソース ID (事前に Console or `ant beta:agents create` で作成)
MA_AGENT_ID=ag_xxxxxxxx          # Sonnet 4.6 用 Interviewer agent
MA_AGENT_ID_OPUS=ag_yyyyyyyy     # Opus 4.7 用 Optimizer agent
MA_ENVIRONMENT_ID=env_zzzzzzzz   # default 環境で OK

# 任意: 中断/再開挙動の確認時のみ
# SLEEP_BEFORE_LAST=1
```

---

## 2. 事前準備 (1 回だけ)

### 2-1. 依存インストール

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/improvements/x-account-design-v9-verification/B3-ma-cost-script
npm init -y
npm i @anthropic-ai/sdk dotenv
npm i -D typescript ts-node @types/node
npx tsc --init
```

### 2-2. MA Agent + Environment 作成 (CLI スクリプトを推奨)

**スクリプト一発で 3 リソース (Environment 1 + Agent 2) を作成し、`.env.local` 用の環境変数を console 出力します。**

```bash
cd .../B3-ma-cost-script
npx ts-node create-agents.ts
```

出力例:
```
[OK] Environment 作成: env_abcd1234
[OK] Interviewer agent (Sonnet 4.6): ag_efgh5678
[OK] Optimizer agent (Opus 4.7): ag_ijkl9012

=== 以下 3 行を .env.local に追記してください ===
MA_ENVIRONMENT_ID=env_abcd1234
MA_AGENT_ID=ag_efgh5678
MA_AGENT_ID_OPUS=ag_ijkl9012
```

→ 出力された 3 行をコピーして `.env.local` に追記する。

**fallback (SDK が environments API 非対応だった場合)**: Console (https://console.anthropic.com/managed-agents/environments) で Environment を手動作成 → `MA_ENVIRONMENT_ID` だけ手動取得 → `create-agents.ts` を再実行 (Agent 2 つは作れる想定)

---

## 3. 実行

### 3-1. Interviewer (5 ターン、約 5-10 分)

```bash
cd .../B3-ma-cost-script
npx ts-node interviewer-sample.ts | tee logs/interviewer-$(date +%Y%m%dT%H%M%S).log
```

### 3-2. 中断/再開挙動の確認 (5 ターン目前に 30 秒 sleep)

```bash
SLEEP_BEFORE_LAST=1 npx ts-node interviewer-sample.ts | tee logs/interviewer-sleep-$(date +%Y%m%dT%H%M%S).log
```

→ 30 秒の sleep 中に session-hour が課金されるかを Console の usage で cross-check

### 3-3. Optimizer Phase 2 (約 30 分、Opus + extended thinking)

```bash
npx ts-node optimizer-phase2-sample.ts | tee logs/optimizer-$(date +%Y%m%dT%H%M%S).log
```

**警告**: Opus 4.7 は token cost が高い ($15/$75 per 1M)。30 分実行で $1.5-3 想定。

---

## 4. 記録テンプレート

実行後、以下を `outputs/improvements/x-account-design-v9-verification/B3-ma-cost-result.md` に記録:

```markdown
# B3 実測結果 (YYYY-MM-DD 実行)

## Interviewer (Sonnet 4.6, 5 turns)
- session_id: ses_xxxxx
- wall_clock_sec: <値>
- input_tokens (合計): <値>
- output_tokens (合計): <値>
- token_cost_usd: $<値>
- session_cost_usd: $<値> (= <h> × $0.08)
- TOTAL_USD: $<値>
- TOTAL_JPY: ¥<値>

## Interviewer with 30s sleep
- wall_clock_sec: <値> (sleep 込み)
- session_cost_usd: $<値>
- 観察: sleep 中も session-hour 課金された? Y/N
  → Y なら「wall-clock 全期間課金」確定 / N なら「active runtime のみ」

## Optimizer Phase 2 (Opus 4.7)
- session_id: ses_yyyyy
- wall_clock_sec: <値>
- input_tokens: <値>
- output_tokens (thinking 含む): <値>
- token_cost_usd: $<値>
- session_cost_usd: $<値>
- TOTAL_USD: $<値>
- TOTAL_JPY: ¥<値>

## 月間想定 (Interviewer 60 + Optimizer 4)
- Interviewer × 60: $<値> = ¥<値>
- Optimizer × 4:    $<値> = ¥<値>
- 合計/月: $<値> = ¥<値>

## 期待 cost (expected-cost.md) との差分
- Interviewer: 期待 $X vs 実測 $Y, 差 ±Z%
- Optimizer:   期待 $X vs 実測 $Y, 差 ±Z%
- 想定外コスト (環境 idle 課金 / poll API call 課金 など) があれば記載
```

---

## 5. 後片付け

```bash
# session が残っていないか確認
ant beta:sessions list --agent-id "$MA_AGENT_ID"
ant beta:sessions list --agent-id "$MA_AGENT_ID_OPUS"

# archive 漏れがあれば手動 archive
ant beta:sessions archive --session-id "$SESSION_ID"

# テスト agent を本番運用に流用しないなら削除
# (agent 自体は無料、残しても課金なし。誤実行防止のためなら削除)
ant beta:agents delete --agent-id "$MA_AGENT_ID"
ant beta:agents delete --agent-id "$MA_AGENT_ID_OPUS"
```

---

## 6. トラブル時

- `401 invalid beta header`: SDK バージョンが古い。`npm i @anthropic-ai/sdk@latest`
- `429 rate limit`: 5 分待ってリトライ
- `terminated` status: session log を Console で確認 (`ant beta:sessions retrieve` で usage は取れる)
- 想定の 2 倍以上コストが出た: 即 archive、Console で usage breakdown 確認、結果 md に記録
