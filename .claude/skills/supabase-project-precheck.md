# Supabase project 作成前提チェック

## 概要

Supabase MCP `create_project` を呼ぶ前に **list_organizations + list_projects + Free tier 制限消費** を確認し、ユーザーに「現在 N/2 (Free tier)」形式で先出しする。残り枠なしの場合は代替案 A〜E を即提示する。

- **誰が**: system-engineer / メインセッション
- **いつ**: 「Supabase の新 project 作って」「DB 用意して」等の依頼を受けた時
- **何のために**: Free tier 数量制限のエラー後に振り直す二度手間を防ぐ

## トリガー（自然文例）

- 「Supabase project 作成して」
- 「新しい DB を Supabase に」
- 「テーブル用意したい」

## 標準手順

### Step 1: 既存状況確認 (読み取りのみ)

```
MCP: list_organizations
MCP: list_projects
```

### Step 2: 制限消費を先出し

ユーザーへの応答に **N/2 形式** で必ず含める:

```
現在 active: 2 / 2 (Free tier の制限)
- minpaku-cleaning (cdqtypyasyhwbpuibhtb)
- ai-radar (jzlhzfdvaculblgwlkxz)
```

### Step 3: 枠ありの場合

通常フロー:
1. `get_cost` で project 作成コスト確認 ($0/月 が default)
2. ユーザーに cost + name + region + organization 提案して同意取得
3. `confirm_cost` → confirm_cost_id 取得
4. `create_project` (name, region, organization_id, confirm_cost_id)

### Step 4: 枠なしの場合 — 即代替案 A〜E を提示

| 案 | 内容 | コスト | 適性 |
|---|---|---|---|
| **A. 既存 project に schema 同居** | `create schema my_namespace; create table my_namespace.X;` 形式で名前空間分離 | $0 | spec で他 project との連携が想定されているならベスト |
| **B. 不要な既存 project を pause** | pause 中は DB 読み書き不可、復活可能 | $0 | 終了予定 / 一時休止案件があれば |
| **C. 既存 project を delete** | データ完全消失、復旧不可 | $0 | 完全に不要なら |
| **D. 新 organization を作成** | Free tier の 2 個制限は org 単位なので org 分離で回避 | $0 (運用やや複雑) | 中長期的に独立性を持たせたい時 |
| **E. Pro tier に upgrade** | 月 $25 / org、制限解除 | $25/月 | 月予算に余裕あり + 長期運用なら |

### Step 5: A 案を選んだ場合の SQL 書き方

```sql
-- schema 作成
create schema if not exists my_namespace;

-- テーブルは my_namespace.<name> で作成
create table if not exists my_namespace.publish_queue (...);

-- 関数も my_namespace 配下に閉じ込め
create or replace function my_namespace.tg_set_updated_at() ...;

-- 既存 schema (public) には一切触らない
```

`public` schema の汚染を絶対に起こさない。

## チェックリスト

- [ ] `list_organizations` 結果を提示した
- [ ] `list_projects` 結果を提示した
- [ ] 制限消費を「N/2 (Free tier)」形式で書いた
- [ ] 残り枠ありなら cost 確認 + 同意取得
- [ ] 残り枠なしなら代替案 A〜E を即提示
- [ ] A 案採用なら spec / 関連 doc を引いて「他 project との連携整合性」を説明

## 関連

- memory: `feedback_supabase_project_limit_check.md`
- Supabase MCP tool: `mcp__plugin_supabase_supabase__list_projects` / `get_cost` / `confirm_cost` / `create_project` / `apply_migration`
