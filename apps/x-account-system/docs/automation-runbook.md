# automation runbook — X発信システムの停止/再開

X発信システム（Cloudflare Worker `ofmeton-x-account` + GitHub Actions）の自動発火を**止める/再開する**ための正本手順。
2026-06-03 以降は手動運用のため全停止中。再開は外部発火の再開＝**人間ゲート必須**（CLAUDE.md 人間確認ルール）。

## 現状（2026-06-08 確認）
- **Cloudflare cron schedules: `[]`（停止中）**。`wrangler.toml [triggers].crons` には 14 本の定義が**残置**（再開は schedules 再投入のみ）。
- **GitHub Actions `github-trending-daily`: `disabled_manually`（停止中）**。
- Worker 本体 / KV / Queue / LINE・OAuth webhook は残置（受動的・自動発火なし。cron 無ければ新規 enqueue は起きない）。

## 自動発火の経路は 2 つ
1. **Cloudflare Worker cron**（`wrangler.toml [triggers].crons`）→ `src/worker.ts` の `scheduled()` が cron 式を job 名に対応づけ Queue に enqueue。compose→check→compose の連鎖もここが起点。
2. **GitHub Actions `github-trending-daily`**（`.github/workflows/github-trending.yml`, 07:00 JST）→ GitHub trending を `raw/` に commit する素材収集。

## 接続情報
- CF account id: `54d47d061d117ab07871f3826c1d07ca`、script: `ofmeton-x-account`
- CF API トークン: `apps/x-account-system/.env.local` の `CLOUDFLARE_API_TOKEN`（**main repo 側**にのみ存在。worktree には無い）

---

## 停止手順

### 1. Cloudflare cron を止める（schedules を空に）
```bash
cd apps/x-account-system   # main repo 側（.env.local がある方）
CF_TOKEN=$(grep -E '^CLOUDFLARE_API_TOKEN=' .env.local | cut -d= -f2- | tr -d '"'\''')
ACCT=54d47d061d117ab07871f3826c1d07ca
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/ofmeton-x-account/schedules" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"schedules":[]}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('success'))"
```
- `wrangler.toml` の crons 定義は**消さない**（再開時の SSOT）。`wrangler deploy` すると crons が再投入されてしまう点に注意（deploy 後は再度 schedules を空にするか、再開を意図する）。

### 2. GitHub Actions を止める
```bash
gh workflow disable github-trending-daily
```

---

## 再開手順（①②の前提条件チェック後・人間判断）

> **⚠️ 前提条件チェックリスト（全て満たすまで再開しない）**
> - [ ] **① cost_ledger 計上が deploy 済**で、`lib/dashboard/kpi-collector.ts`→`brownout-handler` が**実コスト**を見る（cost_ledger が 0 のままだと暴走ブレーキが効かない）。compose を 1 回手動起動 → `xad.cost_ledger` に writer 行が入り `run_trace.cost_jpy` が非 null を確認。
> - [ ] **② CAS 競合確認 PASS**（`scripts/verify-cas-concurrency.ts` が本番 xad で二重生成/二重通知なし）。
> - [ ] **③ compose→check 連鎖が実 Supabase で 1 サイクル**通る（手動 enqueue で確認）。
> - [ ] `BUDGET_MONTHLY_LIMIT_JPY` 等 brownout 閾値が意図どおり。
> - [ ] LINE 承認フロー（pushApproval）の受信端末が稼働。投稿は人間承認ゲート。

### 1. Cloudflare cron を再投入
`wrangler.toml [triggers].crons` の 14 本を schedules に投入。`wrangler deploy`（crons 込みで再デプロイ）か、API で明示投入:
```bash
cd apps/x-account-system
CF_TOKEN=$(grep -E '^CLOUDFLARE_API_TOKEN=' .env.local | cut -d= -f2- | tr -d '"'\''')
ACCT=54d47d061d117ab07871f3826c1d07ca
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/ofmeton-x-account/schedules" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"schedules":[
    {"cron":"30 20 * * *"},{"cron":"0 21 * * *"},{"cron":"30 21 * * *"},
    {"cron":"0 22 * * *"},{"cron":"0 23 * * *"},{"cron":"0 3 * * *"},
    {"cron":"0 6 * * *"},{"cron":"0 8 * * *"},{"cron":"0 10 * * *"},
    {"cron":"0 12 * * *"},{"cron":"0 14 * * *"},{"cron":"0 */2 * * *"},
    {"cron":"0 0 * * 1"},{"cron":"0 15 1 * *"}
  ]}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('success'))"
```
- 投入後 `GET .../schedules` で 14 本入ったことを確認。

### 2. GitHub Actions を再開
```bash
gh workflow enable github-trending-daily
```

### 3. 段階再開（推奨）
いきなり全 cron を入れず、まず **collect のみ**（`30 20 * * *`）で 1 日様子見 → cost_ledger 計上・brownout・trace を確認 → 問題なければ残りを投入する方が安全。

---

## cron 一覧（JST / 役割）
| cron(UTC) | JST | job |
|---|---|---|
| `30 20 * * *` | 05:30 | collect（収集Ag・最初に） |
| `0 21 * * *` | 06:00 | buzz-ingest |
| `30 21 * * *` | 06:30 | ideation |
| `0 22 * * *` | 07:00 | post-morning（朝ピーク1） |
| `0 23 * * *` | 08:00 | post-morning2（朝ピーク2） |
| `0 3 * * *` | 12:00 | post-noon（昼ピーク） |
| `0 6 * * *` | 15:00 | post-afternoon（夕ピーク1） |
| `0 8 * * *` | 17:00 | post-afternoon2（夕ピーク2） |
| `0 10 * * *` | 19:00 | post-evening（note 送客） |
| `0 12 * * *` | 21:00 | daily-digest（LINE 配信） |
| `0 14 * * *` | 23:00 | optimizer-update |
| `0 */2 * * *` | 毎2h | rollback-monitor |
| `0 0 * * 1` | 月09:00 | inspirations-ingest（週次） |
| `0 15 1 * *` | 毎月1日 | rotation-notice（token rotation 通知） |

> 注: 上表の cron は `wrangler.toml [triggers].crons` が SSOT。変更時は wrangler.toml とこの表を同時更新する。
> 関連: memory `project_cron_automation_disabled` / `project_x_agentic_rearchitecture`。
