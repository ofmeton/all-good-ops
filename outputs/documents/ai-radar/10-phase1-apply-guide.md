# ai-radar Phase 1 Apply Guide

**作成日**: 2026-05-22
**前提**:
- 09-pivot-plan.md (v2.1) 確定済
- ai-radar 側 task ブランチ `task/260522-pivot-v2-migration-draft` で Phase 1 コミット済 (1ed652b)
- ローカルビルド検証済 (npm run build ✓)

このガイドは「コード変更を本番に反映する手順」をまとめたもの。**各 Step は人間ゲートあり**。

---

## Step 0: 事前準備

### 0.1 Supabase Dashboard へのアクセス確認
- Project: `ai-radar`
- Dashboard: https://supabase.com/dashboard
- 使用機能: SQL Editor / Backups / Logs

### 0.2 Supabase MCP 再認証（任意）
`/mcp` コマンドで Supabase MCP を再認証すると Claude 側からも操作可能。**ただし本ガイドでは MCP 不要、すべて Dashboard 操作で完結**。

### 0.3 ローカル状況確認

```bash
cd /Users/rikukudo/Projects/ai-radar
git status                    # clean であること
git log --oneline -3          # 1ed652b が最新
git branch --show-current     # task/260522-pivot-v2-migration-draft
```

---

## Step 1: バックアップ（必須・破壊的操作の前）

### Option A: Supabase Dashboard
1. Dashboard → Project → Database → Backups
2. 「Create backup」or「Download backup」で最新バックアップを保存

### Option B: ローカルから supabase CLI
```bash
# Supabase CLI 導入済の場合
supabase db dump --project-id <project-id> > /tmp/ai-radar-backup-2026-05-22.sql
```

### Option C: SQL Editor で articles テーブルだけバックアップ
```sql
-- 重要データだけ別テーブルに保存
create table articles_backup_20260522 as select * from articles;
create table sources_backup_20260522 as select * from sources;
```

**人間ゲート**: バックアップが取れたか確認してから Step 2 へ進む。

---

## Step 2: 現状把握（Inspect）

Supabase Dashboard → SQL Editor で以下を順に実行:

```sql
-- 2.1 articles の pipeline 分布
select pipeline, count(*) from articles group by pipeline order by count(*) desc;

-- 2.2 articles の business_trigger_flag 分布
select business_trigger_flag, count(*) from articles group by business_trigger_flag order by count(*) desc;

-- 2.3 sources の pipeline 分布
select pipeline, count(*) from sources group by pipeline order by count(*) desc;

-- 2.4 sources 一覧（削除対象が含まれているか確認）
select name from sources order by name;
```

**期待値の例**:
- pipeline: `noise` が大半、`opportunity` / `business_defense` / `both` が少数
- business_trigger_flag: 大半 NULL、`R1_risk` / `vertical_surge` / `bm_shift` 等が散見
- sources: 25 件前後 (Day 1-5 で seed 済の場合)

**人間ゲート**: 数字を読んで「想定通りか」を確認してから Step 3 へ。

---

## Step 3: migration 0003 dry-run

migration 0003 (改訂後の最新) を BEGIN/ROLLBACK でラップして実行。

```sql
begin;

-- ここに migrations/0003_pivot_v2_market_signal.sql の Step 1-8 を全部貼る
-- (begin; / commit; は除外、外側で囲んでいるため)

-- 末尾で Verify
select pipeline, count(*) from articles group by pipeline;
select business_trigger_flag, count(*) from articles group by business_trigger_flag;
select pipeline, count(*) from sources group by pipeline;
select count(*) from sources;

rollback;
```

**確認ポイント**:
- pipeline は claude_tip / content_seed / market_signal / both / noise の 5 値のみ
- business_trigger_flag は vertical_surge / bm_shift / r1_risk / NULL のみ (`R1_risk` 残ってたら NG)
- sources は元の数 - 13 (削除対象) になる (例: 25 → 12)
- エラーが出ないこと

**人間ゲート**: dry-run が成功したら Step 4 へ。エラーが出たら計画書 §1.2 のデータ書換ルールを見直し。

---

## Step 4: migration 0003 apply

Step 3 と同じ SQL を BEGIN/COMMIT で実行。

```sql
-- /Users/rikukudo/Projects/ai-radar/supabase/migrations/0003_pivot_v2_market_signal.sql
-- を SQL Editor にそのまま貼り付けて実行
```

**所要時間**: 数秒〜数十秒（articles のレコード数次第）

---

## Step 5: seed.sql v2.1 apply

```sql
-- /Users/rikukudo/Projects/ai-radar/supabase/seed.sql
-- を SQL Editor にそのまま貼り付けて実行
```

ON CONFLICT (name) DO UPDATE なので冪等。62 ソースが upsert される。

**所要時間**: 数秒

---

## Step 6: Verify

```sql
-- 6.1 ソース数
select count(*) from sources;
-- 期待: 62

-- 6.2 グループ別件数
select pipeline, count(*) from sources group by pipeline order by count(*) desc;
-- 期待: claude_tip / content_seed / both / market_signal の組み合わせ
-- (グループ A=claude_tip 7+ both 1 / B=claude_tip 3 / C=content_seed 1 /
--  D=both 1+content_seed 2 / E=claude_tip 7+content_seed 4+both 2 /
--  F+G=mix)

-- 6.3 source_type 別件数
select source_type, count(*) from sources group by source_type order by count(*) desc;
-- 期待: rss 17 / scraping 3 / github_releases 4 / twitter_syndication 34 / api 0 前後

-- 6.4 articles 整合性確認
select pipeline, count(*) from articles group by pipeline;
select business_trigger_flag, count(*) from articles group by business_trigger_flag;
-- 期待: 新 check 制約に違反する値なし
```

**人間ゲート**: 数字が想定通りか確認してから Step 7 へ。

---

## Step 7: Vercel デプロイ

### 7.1 task ブランチを push

```bash
cd /Users/rikukudo/Projects/ai-radar
git log --oneline @{u}..HEAD 2>/dev/null || git log --oneline main..HEAD  # 乗せる commit 確認
git push -u origin task/260522-pivot-v2-migration-draft
```

memory `feedback_git_push_log_verify.md` 準拠: push 直前に commit リスト目視確認。

### 7.2 Vercel Preview Deploy 確認

push 後 Vercel が自動で Preview Deploy を作成。
- Dashboard: https://vercel.com/<team>/ai-radar
- Preview URL でダッシュボードを開いて目視確認:
  - 5 タブ (全件 / Claude Tips / 発信ネタ / 市況 / 深掘り済) が表示される
  - KPI 4 種 (Claude Tips / 発信ネタ / 市況シグナル / 登録ソース) が表示される
  - ソース 62 件がソース一覧に表示される
  - 既存 articles がある場合、新 pipeline 値で正しく振り分けられている

memory `feedback_vercel_git_author_authorization.md` 準拠: 失敗時は `git config user.email` と Vercel project の authorized email を一致させる。

### 7.3 main マージ → 本番 Deploy

Preview で問題なければ:
```bash
gh pr create --base main --head task/260522-pivot-v2-migration-draft \
  --title "feat(v2): ai-radar Phase 1 ピボット (撤廃 + スタブ化)" \
  --body "$(cat <<'EOF'
## Summary
ai-radar を「機会発見 + 事業防衛」→「Claude 活用ネタ + 発信ネタ + 市況シグナル」にピボット (v2.1)。

Phase 1 は破壊的撤廃 + ビルド通る最小 stub。本実装は Phase 2 で。

## 主要変更
- 撤廃 6 ファイル / スタブ化 4 ファイル / 型刷新 / UI 5 タブ化
- DB migration 0003 (19 カラム drop + 3 新規 + check 制約変更 + 旧ソース 13 件 delete)
- seed.sql v2.1 (62 ソース: Anthropic 公式 8 + Claude RSS 3 + ITmedia 1 + HN/PH 3 + Reddit 13 + X 海外 24 + X 日本 10)

## Test plan
- [ ] DB migration 0003 apply 済
- [ ] seed.sql v2.1 apply 済
- [ ] Preview deploy で 5 タブ / KPI / ソース一覧の表示確認
- [ ] cron 翌朝の動作確認 (ダイジェスト届く / Tier1 セクションが「市況シグナル」になる)

## 詳細
- 計画書: all-good-ops/outputs/documents/ai-radar/09-pivot-plan.md
- Apply Guide: all-good-ops/outputs/documents/ai-radar/10-phase1-apply-guide.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR レビュー後 main にマージ → 本番 Deploy 自動実行。

---

## Step 8: 動作確認

### 8.1 ダッシュボード本番確認
- https://ai-radar-taupe.vercel.app/ を開く
- 5 タブ動作確認
- ソース 62 件表示確認

### 8.2 cron 翌朝動作確認

朝 08:00 JST (cron `0 23 * * *` UTC) に `/api/cron/tier1-hourly` が走る。
- Gmail で digest が届くか確認
- digest の冒頭が「市況シグナル」セクションになっているか確認
- 「Claude 活用 Tips Top 3」「発信ネタ Top 3」セクション表示確認

### 8.3 noise 率の観察

Phase 1 では `classify-pipeline.ts` が **noise 固定**なので、新規記事はすべて `noise` で insert される。
これは想定通り。Phase 2 で本実装が入るまで、新 5 分類の判別は機能しない。

過去 articles (migration 0003 で書き換えた分) は claude_tip / content_seed / market_signal / both のいずれかになるため、ダッシュボードの 5 タブには過去データが分類済で表示される。

---

## 緊急停止 / ロールバック

### コード側ロールバック
```bash
cd /Users/rikukudo/Projects/ai-radar
git revert 1ed652b 0a822d2  # Phase 1 + migration 0003 ドラフト
git push
```

### DB ロールバック (apply 済の場合)
Step 1 で取ったバックアップから復元。

### Codex worker 停止 (コスト懸念)
```bash
launchctl unload ~/Library/LaunchAgents/jp.ofmeton.ai-radar-codex.plist
```

---

## 次フェーズ (Phase 2 着手前にやること)

Phase 1 が安定したら Phase 2 へ:
- 新プロンプト 5 種 (classify-pipeline-v2 本実装 / extract-claude-tip / extract-content-seed /
  score-claude-tip / score-content-seed / score-market-signal)
- migration 0004 (新スコアカラム追加)
- pipeline.ts 本実装 (3 系統分岐)
- digest-builder.ts のスコア順ソート切替

Phase 2 着手の人間ゲートは別途。
