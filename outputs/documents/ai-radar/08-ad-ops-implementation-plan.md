# ai-radar 広告運用タブ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存 ai-radar ダッシュボードに第3パイプライン「広告運用」を追加し、媒体変化度/受注ネタ度/AI活用度/実務直結度のサブスコア4軸＋広告運用専用トリガーフラグ付きでMVP稼働させる。

**Architecture:** 既存 `pipeline-opportunity` / `pipeline-business_defense` と同居する第3の分岐として `pipeline.ts:processArticle` に広告運用ブランチを追加。articles テーブルの `pipeline` enum を拡張して多重所属を表現。UIは既存タブバーに挿入、API route は既存クエリパターンを踏襲。DBマイグレーション→型→プロンプト→パイプライン→UI→通知→エージェント定義の順で実装。

**Tech Stack:** Next.js 15 (App Router) / TypeScript / Tailwind / shadcn/ui / Supabase (Postgres) / Vercel Cron / Gemini 2.5 Flash / Claude Haiku 4.5 / Gmail API

**前提ドキュメント:**
- `./07-ad-ops-tab-design.md` — 本計画の上位仕様
- `./01-implementation-plan.md` — 既存 ai-radar 全体計画（参照元）
- `./05-schema.sql` — 既存 DB DDL

**作業リポジトリ:** `/Users/rikukudo/Projects/ai-radar/`（`main` ブランチから `feat/ad-ops-tab` ブランチを切る想定）
**エージェント定義更新:** `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/ai-radar.md`

---

## File Structure Plan

### 新規作成 (12ファイル)

| パス | 責務 |
|---|---|
| `supabase/migrations/0002_ad_ops.sql` | articles enum 拡張 + 列追加、sources boolean 3列化、インデックス |
| `src/lib/prompts/score-ad-ops.ts` | サブスコア4軸を Haiku で同時算出するプロンプト |
| `src/lib/prompts/tag-ad-ops.ts` | 媒体/テーマ/形式の3軸タグ付けを Gemini で実行するプロンプト |
| `src/lib/ad-ops-trigger.ts` | トリガーキーワード照合ロジック（商品設計直撃＋競合ポジション直撃） |
| `src/lib/ad-ops-seed-sources.ts` | 広告運用ソース初期30件の TypeScript 定義（後工程で seed.sql に流し込み） |
| `src/components/AdOpsArticleCard.tsx` | 広告運用記事カード（総合＋4サブスコア＋タグ＋深掘りボタン） |
| `src/components/AdOpsFilterChips.tsx` | 媒体/テーマ/形式のフィルタチップ |
| `src/components/AdOpsTriggerBanner.tsx` | `ad_ops_trigger_flag=true` 時の赤帯 |
| `src/components/AdOpsSortDropdown.tsx` | 6種の並び順切替ドロップダウン |
| `tests/lib/ad-ops-trigger.test.ts` | トリガー照合のユニットテスト |
| `tests/lib/scoring-ad-ops.test.ts` | `adOpsScore()` のユニットテスト |
| `supabase/seed-ad-ops.sql` | 広告運用ソース30件の INSERT（`ad-ops-seed-sources.ts` から生成） |

### 既存ファイル修正 (11ファイル)

| パス | 修正内容 |
|---|---|
| `src/types/article.ts` | `ArticlePipeline` 型に `'ad_ops'\|'opp_ad'\|'biz_ad'\|'all'` 追加、`Article` interface に広告運用8列追加 |
| `src/types/source.ts` | `Pipeline` 型廃止、`Source` interface を boolean 3列 (`in_opportunity`/`in_business_defense`/`in_ad_ops`) 化 |
| `src/lib/scoring.ts` | `adOpsScore()` 関数追加（均等重み合成） |
| `src/lib/prompts/classify-pipeline.ts` | Gemini プロンプトに「広告運用」パイプライン判定を追加し出力を配列 `['opportunity','business_defense','ad_ops']` から1つ以上選択する形式に変更 |
| `src/lib/pipeline.ts` | `processArticle()` に `runAdOps` 分岐追加、タグ・サブスコア・トリガー算出呼び出し、DB書き込みカラム追加 |
| `src/lib/sources.ts` | Source 型参照を新スキーマに合わせ、広告運用ソースを読み込む初期化に変更 |
| `src/lib/digest-builder.ts` | ダイジェストに「📣 広告運用」セクション追加（Top3） |
| `src/components/TabSwitcher.tsx` | TABS 配列に `advertising` 追加（事業防衛の直後に挿入） |
| `src/app/page.tsx` | `getArticles()` に `advertising` 分岐追加、広告運用タブ時は `AdOpsArticleCard` + `AdOpsFilterChips` + `AdOpsSortDropdown` を使用 |
| `src/app/api/articles/route.ts` | クエリに `view=advertising` / `sort=ad_ops_change\|ad_ops_sales\|ad_ops_ai\|ad_ops_practical\|ad_ops_total\|published_at` / `filter_media` / `filter_theme` / `filter_format` 対応 |
| `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/ai-radar.md` | 守備範囲・出力フォーマット・依頼例・起動時チェックに広告運用追加 |

---

## Task Breakdown

### Task 1: DBマイグレーション — articles テーブル拡張

**Files:**
- Create: `supabase/migrations/0002_ad_ops.sql`

- [ ] **Step 1: マイグレーション SQL 作成**

ファイル `supabase/migrations/0002_ad_ops.sql` を以下内容で作成：

```sql
-- ==================================
-- 0002_ad_ops.sql
-- 広告運用パイプラインのためのスキーマ拡張
-- ==================================

-- Step A: articles.pipeline enum 拡張
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_pipeline_check;
ALTER TABLE articles ADD CONSTRAINT articles_pipeline_check
  CHECK (pipeline IN (
    'opportunity', 'business_defense', 'both',
    'ad_ops', 'opp_ad', 'biz_ad', 'all',
    'noise'
  ));

-- Step B: articles に広告運用専用列を追加
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_change_score      smallint CHECK (ad_ops_change_score      BETWEEN 0 AND 100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_sales_angle_score smallint CHECK (ad_ops_sales_angle_score BETWEEN 0 AND 100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_ai_usage_score    smallint CHECK (ad_ops_ai_usage_score    BETWEEN 0 AND 100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_practical_score   smallint CHECK (ad_ops_practical_score   BETWEEN 0 AND 100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_total_score       smallint CHECK (ad_ops_total_score       BETWEEN 0 AND 100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_trigger_flag      boolean DEFAULT false NOT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_trigger_reason    text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS ad_ops_tags              jsonb;

-- Step C: articles 広告運用インデックス
CREATE INDEX IF NOT EXISTS idx_articles_ad_ops_total_score
  ON articles (ad_ops_total_score DESC, published_at DESC)
  WHERE pipeline IN ('ad_ops', 'opp_ad', 'biz_ad', 'all');

CREATE INDEX IF NOT EXISTS idx_articles_ad_ops_trigger
  ON articles (ad_ops_trigger_flag, published_at DESC)
  WHERE ad_ops_trigger_flag = true;

-- Step D: sources テーブル boolean 3列化
ALTER TABLE sources ADD COLUMN IF NOT EXISTS in_opportunity       boolean DEFAULT false NOT NULL;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS in_business_defense  boolean DEFAULT false NOT NULL;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS in_ad_ops            boolean DEFAULT false NOT NULL;

-- Step E: 既存データ移行
UPDATE sources SET in_opportunity       = true WHERE pipeline = 'opportunity';
UPDATE sources SET in_business_defense  = true WHERE pipeline = 'business_defense';
UPDATE sources SET in_opportunity       = true, in_business_defense = true WHERE pipeline = 'both';

-- Step F: 既存 pipeline カラム廃止
ALTER TABLE sources DROP COLUMN pipeline;
```

- [ ] **Step 2: ローカル検証（Supabase CLI）**

```bash
cd /Users/rikukudo/Projects/ai-radar
npx supabase db diff --schema public  # 既存スキーマとの差分を確認
npx supabase db reset                  # ローカル DB をリセットしてマイグレーション全適用
```

Expected: エラーなく完了。`0002_ad_ops.sql` が適用されること。

- [ ] **Step 3: Supabase MCP で本番スキーマ適用前の dry-run**

人間確認必須。`mcp__plugin_supabase_supabase__apply_migration` で dry-run 相当の計画を出し、ユーザー承認後に適用。

- [ ] **Step 4: Commit**

```bash
git checkout -b feat/ad-ops-tab
git add supabase/migrations/0002_ad_ops.sql
git commit -m "feat(db): add ad_ops pipeline schema (migration 0002)"
```

---

### Task 2: 型定義更新 — article.ts

**Files:**
- Modify: `src/types/article.ts`

- [ ] **Step 1: `ArticlePipeline` 型拡張**

`src/types/article.ts` を以下に更新（既存部分を残しつつ追記）：

```typescript
export type ArticlePipeline =
  | 'opportunity'
  | 'business_defense'
  | 'both'
  | 'ad_ops'
  | 'opp_ad'
  | 'biz_ad'
  | 'all'
  | 'noise';
```

- [ ] **Step 2: `Article` interface に広告運用フィールド追加**

既存 `Article` interface の最後（published_at や trust_score の近く、opportunity/business 系フィールドと並列に）に以下を追加：

```typescript
  // === 広告運用パイプライン ===
  ad_ops_change_score: number | null;       // 媒体変化度 0-100
  ad_ops_sales_angle_score: number | null;  // 受注ネタ度 0-100
  ad_ops_ai_usage_score: number | null;     // AI活用度 0-100
  ad_ops_practical_score: number | null;    // 実務直結度 0-100
  ad_ops_total_score: number | null;        // 総合スコア 0-100
  ad_ops_trigger_flag: boolean;
  ad_ops_trigger_reason: string | null;
  ad_ops_tags: AdOpsTags | null;
```

ファイル末尾に以下の型を追加：

```typescript
export type AdOpsMediaTag =
  | 'Google' | 'Meta' | 'TikTok' | 'LinkedIn' | 'X' | 'Yahoo'
  | 'LINE' | 'Amazon' | 'Microsoft' | 'Criteo' | '複数' | '媒体横断';

export type AdOpsThemeTag =
  | '新機能' | 'UI変更' | 'ポリシー変更' | 'サ終/廃止'
  | '入札/アルゴリズム' | '計測/アトリビューション' | 'クリエイティブ'
  | 'B2B' | 'EC' | 'ローカル' | 'ブランド'
  | 'AI活用' | 'ケーススタディ' | 'ベンチマーク';

export type AdOpsFormatTag =
  | '公式発表' | '業界ニュース' | '事例/数字' | '解説/How-to'
  | '個人見解' | 'コミュニティ議論' | 'ツールリリース';

export interface AdOpsTags {
  media: AdOpsMediaTag[];
  theme: AdOpsThemeTag[];
  format: AdOpsFormatTag[];
}
```

- [ ] **Step 3: TypeScript 型チェック**

```bash
cd /Users/rikukudo/Projects/ai-radar && npx tsc --noEmit
```

Expected: 既存コードから `Article` 参照箇所で新フィールド未設定エラーが出る場合は、一旦 `null` デフォルト想定で後続タスクでカバーするため、このタスク単独ではエラーOK（コミットはする）。

- [ ] **Step 4: Commit**

```bash
git add src/types/article.ts
git commit -m "feat(types): add ad_ops pipeline types to Article"
```

---

### Task 3: 型定義更新 — source.ts

**Files:**
- Modify: `src/types/source.ts`

- [ ] **Step 1: `Pipeline` 型廃止と boolean 3列化**

`src/types/source.ts` を以下に変更：

```typescript
// OLD: export type Pipeline = 'opportunity' | 'business_defense' | 'both';
// 廃止

export interface Source {
  id: string;
  name: string;
  url: string;
  method: 'rss' | 'github_releases' | 'scrape';
  tier: 1 | 2 | 3;
  trust_score: number;             // 0-10
  in_opportunity: boolean;
  in_business_defense: boolean;
  in_ad_ops: boolean;
  // 既存の他プロパティ（active, last_crawled_at, etc.）はそのまま
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/source.ts
git commit -m "feat(types): refactor Source to boolean 3-pipeline membership"
```

---

### Task 4: classify-pipeline プロンプト拡張

**Files:**
- Modify: `src/lib/prompts/classify-pipeline.ts`

既存ファイル（2パイプライン判定）を3パイプライン＋多重所属対応に書き換える。

- [ ] **Step 1: 既存ファイル構造確認**

既存のシグネチャを把握する：

```bash
cat src/lib/prompts/classify-pipeline.ts
```

- [ ] **Step 2: プロンプトを以下に書き換え**

```typescript
export interface ClassifyPipelineInput {
  title_en: string;
  title_ja: string;
  summary_3line: string;
  entities: string[];
}

export type PipelineClassification =
  | 'opportunity' | 'business_defense' | 'ad_ops' | 'noise';

export interface ClassifyPipelineOutput {
  pipelines: PipelineClassification[];  // 多重所属可、'noise' なら単独で返す
  reasoning: string;                    // 80字以内
}

export function buildClassifyPipelinePrompt(input: ClassifyPipelineInput): string {
  return `あなたはAI技術動向と広告運用業界の両方に詳しいアナリストです。

以下の記事を読み、どのパイプラインに分類すべきかを判定してください。多重所属可能です。

# 3つのパイプライン定義

## opportunity（機会発見）
- AIエコシステム内の新規需要・プラットフォーム機会
- ソロ起業家・インディーハッカー動向
- 新しい収益モデル・ツール・ビジネスパターン

## business_defense（事業防衛）
- Anthropic・競合のSkills/プラグイン/マーケットプレイス関連の公式発表
- 日本企業のAI導入・エンタープライズ市場の動き
- R1リスク・D機会・Vertical急増・BMシフト のいずれかに該当

## ad_ops（広告運用）
- Google/Meta/TikTok/LinkedIn/X/Yahoo/LINE/Amazon/Microsoft/Criteo の広告プロダクト動向
- 広告業界メディアのニュース・事例・ベンチマーク
- 生成AIを使った広告運用・クリエイティブ自動化
- 広告代理店業・運用代行ビジネスに影響する動き

## noise
- 上記いずれにも該当しない

# 入力

タイトル(英): ${input.title_en}
タイトル(日): ${input.title_ja}
3行要約:
${input.summary_3line}
エンティティ: ${input.entities.join(', ')}

# 出力（JSON）

{
  "pipelines": ["opportunity" | "business_defense" | "ad_ops" | "noise"],
  "reasoning": "80字以内で判定理由"
}

ルール:
- 明確に該当しないものは ["noise"] を返す
- 多重所属の場合は配列で複数返す（例: ["ad_ops", "opportunity"]）
- "noise" は単独でのみ有効（他パイプラインと同時指定しない）

JSONのみ返してください。`;
}
```

- [ ] **Step 3: 既存の `classify.pipeline` 参照箇所を特定**

出力形式が `pipeline: string` から `pipelines: string[]` に変わるため、参照元を全て洗い出す：

```bash
cd /Users/rikukudo/Projects/ai-radar
grep -rn "classify\.pipeline" src/ --include="*.ts" --include="*.tsx"
grep -rn "ClassifyPipelineOutput" src/ --include="*.ts" --include="*.tsx"
```

該当箇所のリストを出力（Task 9 の pipeline.ts 変更でまとめて対応）。

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts/classify-pipeline.ts
git commit -m "feat(prompts): extend classify-pipeline to 3 pipelines with multi-membership"
```

---

### Task 5: 広告運用タグ付けプロンプト

**Files:**
- Create: `src/lib/prompts/tag-ad-ops.ts`

- [ ] **Step 1: ファイル作成**

```typescript
import type { AdOpsMediaTag, AdOpsThemeTag, AdOpsFormatTag, AdOpsTags } from '@/types/article';

export interface TagAdOpsInput {
  title_ja: string;
  summary_3line: string;
  entities: string[];
  source_name: string;
}

export interface TagAdOpsOutput extends AdOpsTags {
  reasoning: string;
}

export function buildTagAdOpsPrompt(input: TagAdOpsInput): string {
  return `あなたは広告運用業界のアナリストです。以下の記事に広告運用タブ用のタグを付けてください。

# タグ定義

## 媒体
Google, Meta, TikTok, LinkedIn, X, Yahoo, LINE, Amazon, Microsoft, Criteo
（特定媒体なし=複数、業界横断=媒体横断）

## テーマ
新機能, UI変更, ポリシー変更, サ終/廃止, 入札/アルゴリズム,
計測/アトリビューション, クリエイティブ, B2B, EC, ローカル, ブランド,
AI活用, ケーススタディ, ベンチマーク

## 形式
公式発表, 業界ニュース, 事例/数字, 解説/How-to, 個人見解,
コミュニティ議論, ツールリリース

# 入力
タイトル: ${input.title_ja}
ソース: ${input.source_name}
3行要約:
${input.summary_3line}
エンティティ: ${input.entities.join(', ')}

# 出力（JSON）
{
  "media": ["Google", "Meta"],
  "theme": ["新機能", "AI活用"],
  "format": ["公式発表"],
  "reasoning": "80字以内でタグ選定理由"
}

ルール:
- media/theme/format はそれぞれ1-3個まで（多くつけすぎない）
- 該当しない場合は空配列 []
- 必ず上記リスト内の値のみ使用（新規タグ創作禁止）

JSONのみ返してください。`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompts/tag-ad-ops.ts
git commit -m "feat(prompts): add tag-ad-ops prompt for media/theme/format tagging"
```

---

### Task 6: 広告運用サブスコア4軸プロンプト

**Files:**
- Create: `src/lib/prompts/score-ad-ops.ts`

- [ ] **Step 1: ファイル作成**

```typescript
export interface ScoreAdOpsInput {
  title_ja: string;
  summary_3line: string;
  entities: string[];
  source_name: string;
  trust_score: number;
  tags_media: string[];
  tags_theme: string[];
  tags_format: string[];
}

export interface ScoreAdOpsOutput {
  change_score: number;        // 媒体変化度 0-100
  sales_angle_score: number;   // 受注ネタ度 0-100
  ai_usage_score: number;      // AI活用度 0-100
  practical_score: number;     // 実務直結度 0-100
  reasoning: string;           // 100字以内
}

export function buildScoreAdOpsPrompt(input: ScoreAdOpsInput): string {
  return `あなたは日本の広告運用代行事業を運営するフリーランス（Google/Meta中心・運用歴5年）のアナリストです。
以下の記事について、広告運用タブで表示するサブスコア4軸を同時に算出してください。

# 4軸の定義

## 1. 媒体変化度（0-100）
媒体の仕様/UI/ポリシー/商品設計がどれだけ大きく動いたかを評価。
- 100: サ終・機能廃止・ビジネスモデル破壊的変更
- 80-90: 主要機能の大型リリース・入札ロジック変更
- 50-70: 中規模の機能追加・UI変更
- 20-40: マイナーUI調整
- 0-20: 既報の焼き直し・変化なし

## 2. 受注ネタ度（0-100）
提案・商談で使える具体数字・事例・ベンチマークの濃度。
- 80-100: 「CPA○円→○円」「CV○倍」等の数値事例、業種別ベンチマーク、実名事例
- 50-80: 定性的な事例・傾向データ
- 20-50: 抽象的なケーススタディ・業界総論
- 0-20: 抽象論・思想・ポエム

## 3. AI活用度（0-100）
生成AI/機械学習の広告運用への実装度・新規性。
- 80-100: AI入札の新機能、クリエイティブ自動生成の実装事例、運用AIエージェント動向
- 50-80: AI機能の部分採用・AI活用提案
- 20-50: AIに関する言及あり
- 0-20: AI要素なし

## 4. 実務直結度（0-100）
日本の Google/Meta 中心運用で明日使えるか。
- 80-100: 日本でGAされてる機能、具体手順、既存アカウントで再現可能
- 50-80: 日本でも近く展開されそう・要点は今すぐ応用可能
- 20-50: US先行だが参考になる
- 0-20: 海外限定プレビュー、研究段階、米国小売特化

# 入力

タイトル: ${input.title_ja}
ソース: ${input.source_name}（信頼度: ${input.trust_score}/10）
3行要約:
${input.summary_3line}
エンティティ: ${input.entities.join(', ')}
媒体タグ: ${input.tags_media.join(', ')}
テーマタグ: ${input.tags_theme.join(', ')}
形式タグ: ${input.tags_format.join(', ')}

# 出力（JSON）

{
  "change_score": 0-100の整数,
  "sales_angle_score": 0-100の整数,
  "ai_usage_score": 0-100の整数,
  "practical_score": 0-100の整数,
  "reasoning": "各軸を80-100字で総括した判定理由"
}

JSONのみ返してください。`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompts/score-ad-ops.ts
git commit -m "feat(prompts): add score-ad-ops 4-subscore prompt"
```

---

### Task 7: scoring.ts に adOpsScore() 追加

**Files:**
- Modify: `src/lib/scoring.ts`
- Create: `tests/lib/scoring-ad-ops.test.ts`

- [ ] **Step 1: テストを先に書く**

`tests/lib/scoring-ad-ops.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'; // 既存テスト基盤に合わせる
import { adOpsScore } from '@/lib/scoring';
import type { ScoreAdOpsOutput } from '@/lib/prompts/score-ad-ops';

describe('adOpsScore', () => {
  it('均等重み 0.25 × 4 で合成', () => {
    const input: ScoreAdOpsOutput = {
      change_score: 100,
      sales_angle_score: 0,
      ai_usage_score: 100,
      practical_score: 0,
      reasoning: 'test',
    };
    expect(adOpsScore(input)).toBe(50);
  });

  it('全軸100で100', () => {
    const input: ScoreAdOpsOutput = {
      change_score: 100,
      sales_angle_score: 100,
      ai_usage_score: 100,
      practical_score: 100,
      reasoning: 'test',
    };
    expect(adOpsScore(input)).toBe(100);
  });

  it('全軸0で0', () => {
    const input: ScoreAdOpsOutput = {
      change_score: 0,
      sales_angle_score: 0,
      ai_usage_score: 0,
      practical_score: 0,
      reasoning: 'test',
    };
    expect(adOpsScore(input)).toBe(0);
  });

  it('丸めは四捨五入', () => {
    const input: ScoreAdOpsOutput = {
      change_score: 83,
      sales_angle_score: 67,
      ai_usage_score: 55,
      practical_score: 42,
      reasoning: 'test',
    };
    // (83 + 67 + 55 + 42) / 4 = 61.75 → 62
    expect(adOpsScore(input)).toBe(62);
  });
});
```

- [ ] **Step 2: テストを実行して失敗確認**

```bash
cd /Users/rikukudo/Projects/ai-radar && npx vitest run tests/lib/scoring-ad-ops.test.ts
```

Expected: `adOpsScore is not a function` でFAIL

- [ ] **Step 3: `src/lib/scoring.ts` に `adOpsScore()` 追加**

ファイル末尾に追記：

```typescript
import type { ScoreAdOpsOutput } from './prompts/score-ad-ops';

/**
 * 広告運用総合スコア（0-100）
 * 均等重み 0.25 × 4 の合成、四捨五入整数
 */
export function adOpsScore(x: ScoreAdOpsOutput): number {
  const raw =
    0.25 * x.change_score +
    0.25 * x.sales_angle_score +
    0.25 * x.ai_usage_score +
    0.25 * x.practical_score;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
```

- [ ] **Step 4: テスト通過確認**

```bash
npx vitest run tests/lib/scoring-ad-ops.test.ts
```

Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts tests/lib/scoring-ad-ops.test.ts
git commit -m "feat(scoring): add adOpsScore() with equal weight composition"
```

---

### Task 8: ad-ops-trigger.ts — トリガーキーワード照合

**Files:**
- Create: `src/lib/ad-ops-trigger.ts`
- Create: `tests/lib/ad-ops-trigger.test.ts`

- [ ] **Step 1: テストを先に書く**

`tests/lib/ad-ops-trigger.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectAdOpsTrigger } from '@/lib/ad-ops-trigger';

describe('detectAdOpsTrigger', () => {
  it('商品設計直撃キーワード検出（日本語）', () => {
    const text = 'Google Ads が運用代行 認定 制度を変更する';
    const r = detectAdOpsTrigger(text);
    expect(r.flag).toBe(true);
    expect(r.reason).toContain('運用代行 認定');
  });

  it('競合ポジション直撃キーワード検出（英語）', () => {
    const text = 'New AI ad ops agency launches autonomous bidding';
    const r = detectAdOpsTrigger(text);
    expect(r.flag).toBe(true);
    expect(r.reason).toContain('AI ad ops agency');
  });

  it('複数ヒットは全部理由に列挙', () => {
    const text = '代理店手数料 と 月次運用費 の両方が変更';
    const r = detectAdOpsTrigger(text);
    expect(r.flag).toBe(true);
    expect(r.reason).toContain('代理店手数料');
    expect(r.reason).toContain('月次運用費');
  });

  it('ノーヒットで false', () => {
    const text = '普通の広告業界ニュース';
    const r = detectAdOpsTrigger(text);
    expect(r.flag).toBe(false);
    expect(r.reason).toBeNull();
  });
});
```

- [ ] **Step 2: テスト実行して FAIL 確認**

```bash
npx vitest run tests/lib/ad-ops-trigger.test.ts
```

- [ ] **Step 3: 実装**

`src/lib/ad-ops-trigger.ts`:

```typescript
/**
 * 広告運用トリガーキーワード
 * spec §5.4 に準拠。2カテゴリ: 商品設計直撃 / 競合ポジション直撃
 */

const PRODUCT_THREAT_KEYWORDS = [
  // 英語
  'agency restriction', 'agency certification', 'Performance Max deprecation',
  'Advantage+ pricing', 'platform management fee', 'ad agency regulation',
  'minimum spend change', 'ad platform fee change',
  // 日本語
  '運用代行 認定', '運用代行 規制', '月次運用費', '最低出稿額',
  '媒体社 手数料変更', '代理店手数料', '運用代行 禁止',
];

const COMPETITOR_THREAT_KEYWORDS = [
  // 英語
  'AI ad ops agency', 'AI marketing agent', 'autonomous ad ops',
  'AI bidding agency', 'generative ad agency',
  'ClaudeSkills ads', 'n8n ads plugin',
  // 日本語
  'AI広告運用代行', 'AIエージェント広告', '自動運用AI',
  'AI入札代行', '生成AI広告代理店',
];

const ALL_KEYWORDS = [...PRODUCT_THREAT_KEYWORDS, ...COMPETITOR_THREAT_KEYWORDS];

export interface AdOpsTriggerResult {
  flag: boolean;
  reason: string | null;  // ヒットしたキーワードをカンマ区切り。ヒットなしはnull
}

export function detectAdOpsTrigger(text: string): AdOpsTriggerResult {
  const lowered = text.toLowerCase();
  const hits = ALL_KEYWORDS.filter(kw => lowered.includes(kw.toLowerCase()));
  if (hits.length === 0) {
    return { flag: false, reason: null };
  }
  return { flag: true, reason: hits.join(', ') };
}
```

- [ ] **Step 4: テスト通過確認**

```bash
npx vitest run tests/lib/ad-ops-trigger.test.ts
```

Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ad-ops-trigger.ts tests/lib/ad-ops-trigger.test.ts
git commit -m "feat(pipeline): add ad-ops trigger keyword detection"
```

---

### Task 9: pipeline.ts に広告運用分岐追加

**Files:**
- Modify: `src/lib/pipeline.ts`

既存 `processArticle()` に `runAdOps` 分岐を追加。既存 `runOpportunity` / `runBusiness` のパターンを踏襲。

- [ ] **Step 1: 既存ファイル構造確認**

```bash
cat src/lib/pipeline.ts | head -200
```

既存の `runOpportunity` / `runBusiness` 条件判定箇所を把握する。

- [ ] **Step 2: classify 結果の受け取り形式変更**

`classify-pipeline.ts` が配列 `pipelines: PipelineClassification[]` を返すようになったので、pipeline.ts 側の受け取りも変更：

```typescript
// OLD:
// const runOpportunity = classify.pipeline === 'opportunity' || classify.pipeline === 'both';
// const runBusiness = classify.pipeline === 'business_defense' || classify.pipeline === 'both';

// NEW:
const runOpportunity = classify.pipelines.includes('opportunity');
const runBusiness = classify.pipelines.includes('business_defense');
const runAdOps = classify.pipelines.includes('ad_ops');
const isNoise = classify.pipelines.includes('noise') ||
                (!runOpportunity && !runBusiness && !runAdOps);
```

- [ ] **Step 3: pipeline enum 計算ロジック追加**

`processArticle()` 内で DB 書き込み前に `pipeline` enum 値を計算：

```typescript
function computePipelineEnum(opp: boolean, biz: boolean, ad: boolean, noise: boolean): ArticlePipeline {
  if (noise) return 'noise';
  if (opp && biz && ad) return 'all';
  if (opp && ad) return 'opp_ad';
  if (biz && ad) return 'biz_ad';
  if (opp && biz) return 'both';
  if (ad) return 'ad_ops';
  if (biz) return 'business_defense';
  if (opp) return 'opportunity';
  return 'noise';
}
```

- [ ] **Step 4: 広告運用ブロック追加**

既存の `if (runOpportunity) { ... }` / `if (runBusiness) { ... }` の直後に追加：

```typescript
// === 広告運用パイプライン ===
let adOpsTags: TagAdOpsOutput | null = null;
let adOpsScoreOutput: ScoreAdOpsOutput | null = null;
let adOpsTotal: number | null = null;
let adOpsTrigger: AdOpsTriggerResult = { flag: false, reason: null };

if (runAdOps) {
  try {
    adOpsTags = await geminiJson<TagAdOpsOutput>(
      buildTagAdOpsPrompt({
        title_ja: summary.title_ja,
        summary_3line: summary.summary_3line,
        entities: summary.entities,
        source_name: source.name,
      })
    );
    adOpsScoreOutput = await claudeJson<ScoreAdOpsOutput>(
      buildScoreAdOpsPrompt({
        title_ja: summary.title_ja,
        summary_3line: summary.summary_3line,
        entities: summary.entities,
        source_name: source.name,
        trust_score: source.trust_score,
        tags_media: adOpsTags?.media ?? [],
        tags_theme: adOpsTags?.theme ?? [],
        tags_format: adOpsTags?.format ?? [],
      })
    );
    adOpsTotal = adOpsScore(adOpsScoreOutput);
    const triggerText = `${summary.title_ja}\n${summary.summary_3line}`;
    adOpsTrigger = detectAdOpsTrigger(triggerText);
  } catch (e) {
    console.warn(`ad_ops pipeline partial error: ${(e as Error).message}`);
  }
}
```

- [ ] **Step 5: DB書き込みカラム追加**

既存の insert 文（`supabase.from('articles').insert({...})`）に以下を追加：

```typescript
  // 広告運用
  ad_ops_change_score: adOpsScoreOutput?.change_score ?? null,
  ad_ops_sales_angle_score: adOpsScoreOutput?.sales_angle_score ?? null,
  ad_ops_ai_usage_score: adOpsScoreOutput?.ai_usage_score ?? null,
  ad_ops_practical_score: adOpsScoreOutput?.practical_score ?? null,
  ad_ops_total_score: adOpsTotal,
  ad_ops_trigger_flag: adOpsTrigger.flag,
  ad_ops_trigger_reason: adOpsTrigger.reason,
  ad_ops_tags: adOpsTags ? {
    media: adOpsTags.media,
    theme: adOpsTags.theme,
    format: adOpsTags.format,
  } : null,
  pipeline: computePipelineEnum(runOpportunity, runBusiness, runAdOps, isNoise),
```

`pipeline` の既存設定行は削除（`computePipelineEnum` で計算するため）。

- [ ] **Step 6: import 追加**

ファイル先頭に：

```typescript
import { buildTagAdOpsPrompt, type TagAdOpsOutput } from './prompts/tag-ad-ops';
import { buildScoreAdOpsPrompt, type ScoreAdOpsOutput } from './prompts/score-ad-ops';
import { adOpsScore } from './scoring';
import { detectAdOpsTrigger, type AdOpsTriggerResult } from './ad-ops-trigger';
```

- [ ] **Step 7: 型チェック通過確認**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/pipeline.ts
git commit -m "feat(pipeline): add ad_ops pipeline branch to processArticle"
```

---

### Task 10: sources.ts と広告運用ソース初期定義

**Files:**
- Modify: `src/lib/sources.ts`
- Create: `src/lib/ad-ops-seed-sources.ts`

- [ ] **Step 1: 既存 `sources.ts` の改修**

`Source` 型が boolean 3列化したので、既存のソース定義にも `in_opportunity` / `in_business_defense` / `in_ad_ops` フィールドを付与する。OLD の `pipeline` フィールドは削除。

既存定義の変換例（パターンのみ記載、既存25ソース分を同様に変換）：

```typescript
// OLD:
// { id: 'anthropic-news', pipeline: 'business_defense', ... }

// NEW:
{
  id: 'anthropic-news',
  in_opportunity: false,
  in_business_defense: true,
  in_ad_ops: false,
  ...
}
```

- [ ] **Step 2: 広告運用ソース定義ファイル作成**

`src/lib/ad-ops-seed-sources.ts`:

```typescript
import type { Source } from '@/types/source';

/**
 * 広告運用パイプライン初期ソース（MVP: 30件、Tier1-2）
 * spec §6 準拠。各ソースの具体URL・RSSエンドポイントは実運用で検証後調整。
 */
export const AD_OPS_SEED_SOURCES: Omit<Source, 'last_crawled_at'>[] = [
  // === Tier 1（毎時） ===
  { id: 'google-ads-blog',   name: 'Google Ads & Commerce Blog', url: 'https://blog.google/products/ads-commerce/rss/',        method: 'rss',    tier: 1, trust_score: 10, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'meta-business',     name: 'Meta for Business News',     url: 'https://www.facebook.com/business/news/rss',              method: 'scrape', tier: 1, trust_score: 10, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'tiktok-business',   name: 'TikTok Business Blog',       url: 'https://www.tiktok.com/business/ja/blog',                 method: 'scrape', tier: 1, trust_score: 10, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'linkedin-marketing',name: 'LinkedIn Marketing Solutions Blog', url: 'https://www.linkedin.com/business/marketing/blog/feed', method: 'rss', tier: 1, trust_score: 10, in_opportunity: false, in_business_defense: false, in_ad_ops: true },

  // === Tier 2（朝夜） その他媒体公式 ===
  { id: 'yahoo-ads-jp',      name: 'Yahoo!広告公式',             url: 'https://ads-promo.yahoo.co.jp/feed/news.xml',              method: 'rss',    tier: 2, trust_score: 9,  in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'line-for-business', name: 'LINE for Business',          url: 'https://www.linebiz.com/jp/news/rss/',                     method: 'rss',    tier: 2, trust_score: 9,  in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'amazon-ads',        name: 'Amazon Ads',                  url: 'https://advertising.amazon.com/blog/rss',                  method: 'rss',    tier: 2, trust_score: 9,  in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'microsoft-ads',     name: 'Microsoft Advertising Blog', url: 'https://about.ads.microsoft.com/en-us/blog/rss',           method: 'rss',    tier: 2, trust_score: 9,  in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'criteo-blog',       name: 'Criteo Blog',                 url: 'https://www.criteo.com/blog/feed/',                        method: 'rss',    tier: 2, trust_score: 8,  in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'x-business',        name: 'X Business',                  url: 'https://business.x.com/en/blog.rss',                        method: 'rss',    tier: 2, trust_score: 8,  in_opportunity: false, in_business_defense: false, in_ad_ops: true },

  // === Tier 2 海外業界メディア ===
  { id: 'search-engine-land',    name: 'Search Engine Land',         url: 'https://searchengineland.com/feed',         method: 'rss', tier: 2, trust_score: 8, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'search-engine-roundtable', name: 'Search Engine Roundtable', url: 'https://www.seroundtable.com/feed.xml',   method: 'rss', tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'martech',               name: 'MarTech',                      url: 'https://martech.org/feed/',                 method: 'rss', tier: 2, trust_score: 8, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'digiday',               name: 'Digiday',                      url: 'https://digiday.com/feed/',                 method: 'rss', tier: 2, trust_score: 8, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'adage',                 name: 'AdAge',                         url: 'https://adage.com/rss.xml',                 method: 'rss', tier: 2, trust_score: 8, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'adexchanger',           name: 'AdExchanger',                  url: 'https://adexchanger.com/feed/',             method: 'rss', tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'marketing-land',        name: 'Marketing Land',               url: 'https://marketingland.com/feed',            method: 'rss', tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'the-drum',              name: 'The Drum',                     url: 'https://www.thedrum.com/feed',              method: 'rss', tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },

  // === Tier 2 日本業界メディア ===
  { id: 'markezine',     name: 'MarkeZine',         url: 'https://markezine.jp/rss/new/20/index.xml',  method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'digiday-jp',    name: 'DIGIDAY JP',         url: 'https://digiday.jp/feed/',                    method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'exchangewire-jp', name: 'Exchangewire JP', url: 'https://www.exchangewire.jp/feed/',           method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'dentsu-ho',     name: '電通報',              url: 'https://dentsu-ho.com/rss.xml',                method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'sendenkaigi',   name: '宣伝会議 AdverTimes', url: 'https://www.advertimes.com/feed/',             method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'web-tan',       name: 'Web担当者Forum',      url: 'https://webtan.impress.co.jp/rss/articles.rdf', method: 'rss',   tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'itmedia-mkt',   name: 'ITmedia マーケティング', url: 'https://rss.itmedia.co.jp/rss/2.0/marketing.xml', method: 'rss', tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },

  // === Tier 2 AI×広告特化 ===
  { id: 'adcreative-ai',   name: 'AdCreative.ai Blog', url: 'https://www.adcreative.ai/blog/rss.xml',    method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'pencil-ai',       name: 'Pencil Blog',         url: 'https://www.trypencil.com/blog/rss',        method: 'scrape', tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'smartly-io',      name: 'Smartly.io Blog',     url: 'https://www.smartly.io/blog/rss.xml',       method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'hubspot-ai',      name: 'HubSpot AI Blog',     url: 'https://blog.hubspot.com/marketing/rss.xml',method: 'rss',    tier: 2, trust_score: 7, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
  { id: 'zapier-ai',       name: 'Zapier AI Blog',      url: 'https://zapier.com/blog/feeds/latest/',     method: 'rss',    tier: 2, trust_score: 6, in_opportunity: false, in_business_defense: false, in_ad_ops: true },
];
```

※ 各ソースURLは実装時に curl で疎通確認し、RSS非提供サイトは scrape にフォールバック。疎通NGソースはコメントアウトして後続タスクで置換。

- [ ] **Step 3: sources.ts から初期化時に広告運用ソースも読み込む**

既存の sources 初期化関数（`loadSources()` or 同等）に広告運用ソースをマージ：

```typescript
import { AD_OPS_SEED_SOURCES } from './ad-ops-seed-sources';

export function loadAllSources(): Source[] {
  return [
    ...EXISTING_SOURCES,   // 既存の opportunity/business_defense 用
    ...AD_OPS_SEED_SOURCES,
  ];
}
```

- [ ] **Step 4: 型チェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources.ts src/lib/ad-ops-seed-sources.ts
git commit -m "feat(sources): add 30 ad_ops seed sources and refactor Source interface"
```

---

### Task 11: seed-ad-ops.sql 生成

**Files:**
- Create: `supabase/seed-ad-ops.sql`

- [ ] **Step 1: `ad-ops-seed-sources.ts` から SQL INSERT 自動生成**

TypeScript スクリプトで SQL を生成し、手動コピペ作業を省く：

```bash
cd /Users/rikukudo/Projects/ai-radar
npx tsx -e "
import { AD_OPS_SEED_SOURCES } from './src/lib/ad-ops-seed-sources';
const rows = AD_OPS_SEED_SOURCES.map(s =>
  \`  ('\${s.id}', '\${s.name.replace(/'/g, \"''\")}', '\${s.url}', '\${s.method}', \${s.tier}, \${s.trust_score}, \${s.in_opportunity}, \${s.in_business_defense}, \${s.in_ad_ops})\`
).join(',\n');
console.log(\`-- ==================================
-- seed-ad-ops.sql
-- 広告運用パイプライン 初期ソース（自動生成: \${AD_OPS_SEED_SOURCES.length}件）
-- ==================================

INSERT INTO sources (id, name, url, method, tier, trust_score, in_opportunity, in_business_defense, in_ad_ops) VALUES
\${rows}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  method = EXCLUDED.method,
  tier = EXCLUDED.tier,
  trust_score = EXCLUDED.trust_score,
  in_ad_ops = EXCLUDED.in_ad_ops;
\`);
" > supabase/seed-ad-ops.sql
```

生成された `supabase/seed-ad-ops.sql` を目視確認し、エスケープや値がおかしい行があれば手動修正。

- [ ] **Step 2: Supabase に適用**

人間確認必須。`mcp__plugin_supabase_supabase__execute_sql` でユーザー承認後適用。

- [ ] **Step 3: 疎通確認**

```sql
SELECT count(*) FROM sources WHERE in_ad_ops = true;
-- Expected: 30
```

- [ ] **Step 4: Commit**

```bash
git add supabase/seed-ad-ops.sql
git commit -m "feat(seed): insert 30 ad_ops sources"
```

---

### Task 12: digest-builder.ts に広告運用セクション追加

**Files:**
- Modify: `src/lib/digest-builder.ts`

- [ ] **Step 1: 既存 digest-builder 構造確認**

```bash
cat src/lib/digest-builder.ts
```

既存の「機会発見 Top3」「事業防衛 Top3」セクション生成部分を把握。

- [ ] **Step 2: 広告運用セクション追加**

既存 tier1 / opportunities / defenses 変数に加えて：

```typescript
const adOps = articles
  .filter(a =>
    ['ad_ops', 'opp_ad', 'biz_ad', 'all'].includes(a.pipeline)
  )
  .sort((a, b) =>
    (b.ad_ops_total_score ?? 0) - (a.ad_ops_total_score ?? 0) ||
    (b.ad_ops_change_score ?? 0) - (a.ad_ops_change_score ?? 0)
  )
  .slice(0, 3);
```

既存 `buildDigestMarkdown()` の本文組み立てに以下セクションを追加（「事業防衛 Top3」の直後）：

```typescript
if (adOps.length > 0) {
  md += `\n## 📣 広告運用 Top3\n\n`;
  for (const a of adOps) {
    md += `### ${a.title_ja}\n`;
    md += `総合: ${a.ad_ops_total_score}/100 ｜変化:${a.ad_ops_change_score} 受注:${a.ad_ops_sales_angle_score} AI:${a.ad_ops_ai_usage_score} 実務:${a.ad_ops_practical_score}\n`;
    md += `${a.summary_3line}\n`;
    if (a.ad_ops_trigger_flag) {
      md += `\n🚨 トリガー発火: ${a.ad_ops_trigger_reason}\n`;
    }
    md += `[記事リンク](${a.url})\n\n`;
  }
}
```

トリガー即時通知用の専用ビルダー関数も追加：

```typescript
export function buildAdOpsTriggerEmail(article: Article): { subject: string; body: string } {
  return {
    subject: `🚨 [ai-radar] 広告運用トリガー: ${article.title_ja}`,
    body: `
広告運用パイプラインでトリガーキーワードがヒットしました。

## 記事
${article.title_ja}
ソース: ${article.source_name ?? 'unknown'}
URL: ${article.url}

## 要約
${article.summary_3line}

## トリガー
発火キーワード: ${article.ad_ops_trigger_reason}

## スコア
総合: ${article.ad_ops_total_score}/100
変化度: ${article.ad_ops_change_score}
受注ネタ度: ${article.ad_ops_sales_angle_score}
AI活用度: ${article.ad_ops_ai_usage_score}
実務直結度: ${article.ad_ops_practical_score}

ダッシュボード: ${process.env.NEXT_PUBLIC_APP_URL}/?view=advertising
    `.trim(),
  };
}
```

- [ ] **Step 3: cron route 側でトリガー発火時の即時通知を呼ぶ**

まず既存の `business_trigger_flag` 即時通知がどの route にあるか特定：

```bash
grep -rn "business_trigger_flag" src/app/api/cron/ --include="*.ts"
```

該当 route ファイル（`src/app/api/cron/tier1-hourly/route.ts` と想定、grep 結果で確定）に以下を追加。既存の business 通知ループの直後に置く：

```typescript
for (const article of newlyInsertedArticles) {
  if (article.ad_ops_trigger_flag) {
    const { subject, body } = buildAdOpsTriggerEmail(article);
    await sendGmail(subject, body);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/digest-builder.ts src/app/api/cron/tier1-hourly/route.ts
git commit -m "feat(digest): add ad_ops section and trigger email builder"
```

---

### Task 13: TabSwitcher.tsx に広告運用タブ追加

**Files:**
- Modify: `src/components/TabSwitcher.tsx`

- [ ] **Step 1: TABS 配列に追加**

既存の TABS 配列（5タブ想定）を以下のように更新：

```typescript
const TABS: Array<{ key: TabKey; label: string; mono: string }> = [
  { key: 'all',           label: '全件',       mono: 'ALL' },
  { key: 'opportunity',   label: '機会発見',    mono: 'OPP' },
  { key: 'business',      label: '事業防衛',    mono: 'DEF' },
  { key: 'advertising',   label: '広告運用',    mono: 'ADV' },  // ← 新規、事業防衛の直後
  { key: 'tier1',         label: 'Tier1',      mono: 'T1' },
];
```

- [ ] **Step 2: TabKey 型更新**

同ファイル内（or 型定義ファイル）：

```typescript
export type TabKey = 'all' | 'opportunity' | 'business' | 'advertising' | 'tier1';
```

- [ ] **Step 3: 型チェック**

```bash
npx tsc --noEmit
```

他の参照箇所（`page.tsx`, `api/articles/route.ts` 等）でエラーが出る場合、後続タスクで対応予定。

- [ ] **Step 4: Commit**

```bash
git add src/components/TabSwitcher.tsx
git commit -m "feat(ui): add advertising tab to TabSwitcher"
```

---

### Task 14: API route /api/articles 更新

**Files:**
- Modify: `src/app/api/articles/route.ts`

- [ ] **Step 1: クエリパラメータ対応拡張**

既存クエリパラメータに以下を追加：

- `view=advertising` → `pipeline IN ('ad_ops', 'opp_ad', 'biz_ad', 'all')`
- `sort=ad_ops_total|ad_ops_change|ad_ops_sales|ad_ops_ai|ad_ops_practical|published_at`
- `filter_media=Meta,Google` → `ad_ops_tags->media @> '["Meta"]'::jsonb AND ad_ops_tags->media @> '["Google"]'::jsonb`（AND条件）
- `filter_theme=...`
- `filter_format=...`

実装例：

```typescript
const view = searchParams.get('view') as TabKey | null;
const sort = searchParams.get('sort') ?? (view === 'advertising' ? 'ad_ops_change' : 'published_at');
const filterMedia = searchParams.get('filter_media')?.split(',').filter(Boolean) ?? [];
const filterTheme = searchParams.get('filter_theme')?.split(',').filter(Boolean) ?? [];
const filterFormat = searchParams.get('filter_format')?.split(',').filter(Boolean) ?? [];

let q = supabase.from('articles').select('*');

// View フィルタ
if (view === 'opportunity') {
  q = q.in('pipeline', ['opportunity', 'both', 'opp_ad', 'all']);
} else if (view === 'business') {
  q = q.in('pipeline', ['business_defense', 'both', 'biz_ad', 'all']);
} else if (view === 'advertising') {
  q = q.in('pipeline', ['ad_ops', 'opp_ad', 'biz_ad', 'all']);
} else if (view === 'tier1') {
  q = q.eq('source_tier', 1);
}

// タグフィルタ（広告運用タブのみ）
if (view === 'advertising') {
  for (const m of filterMedia) {
    q = q.contains('ad_ops_tags->media', JSON.stringify([m]));
  }
  for (const t of filterTheme) {
    q = q.contains('ad_ops_tags->theme', JSON.stringify([t]));
  }
  for (const f of filterFormat) {
    q = q.contains('ad_ops_tags->format', JSON.stringify([f]));
  }
}

// ソート
const sortMap: Record<string, string> = {
  'ad_ops_total': 'ad_ops_total_score',
  'ad_ops_change': 'ad_ops_change_score',
  'ad_ops_sales': 'ad_ops_sales_angle_score',
  'ad_ops_ai': 'ad_ops_ai_usage_score',
  'ad_ops_practical': 'ad_ops_practical_score',
  'published_at': 'published_at',
};
const sortColumn = sortMap[sort] ?? 'published_at';
q = q.order(sortColumn, { ascending: false, nullsFirst: false });
```

- [ ] **Step 2: 型チェック**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/articles/route.ts
git commit -m "feat(api): support ad_ops filters and sorts in /api/articles"
```

---

### Task 15: AdOpsTriggerBanner.tsx（赤帯）

**Files:**
- Create: `src/components/AdOpsTriggerBanner.tsx`

- [ ] **Step 1: コンポーネント作成**

```tsx
import type { Article } from '@/types/article';

interface Props {
  articles: Article[];
}

export function AdOpsTriggerBanner({ articles }: Props) {
  const triggered = articles.filter(a => a.ad_ops_trigger_flag);
  if (triggered.length === 0) return null;

  return (
    <div className="bg-red-900/40 border border-red-500 rounded-lg p-4 mb-4">
      <div className="text-red-300 font-bold text-sm mb-2">
        🚨 広告運用トリガー発火 ({triggered.length}件)
      </div>
      <ul className="space-y-2">
        {triggered.map(a => (
          <li key={a.id} className="text-sm">
            <a href={a.url} target="_blank" rel="noopener" className="text-red-200 hover:underline">
              {a.title_ja}
            </a>
            <div className="text-red-400 text-xs mt-1">
              発火キーワード: {a.ad_ops_trigger_reason}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdOpsTriggerBanner.tsx
git commit -m "feat(ui): add AdOpsTriggerBanner for trigger alerts"
```

---

### Task 16: AdOpsFilterChips.tsx（フィルタチップ）

**Files:**
- Create: `src/components/AdOpsFilterChips.tsx`

- [ ] **Step 1: コンポーネント作成**

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const MEDIA_OPTIONS = ['Google','Meta','TikTok','LinkedIn','X','Yahoo','LINE','Amazon','Microsoft','Criteo'];
const THEME_OPTIONS = ['新機能','UI変更','ポリシー変更','サ終/廃止','入札/アルゴリズム','計測/アトリビューション','クリエイティブ','B2B','EC','ローカル','ブランド','AI活用','ケーススタディ','ベンチマーク'];
const FORMAT_OPTIONS = ['公式発表','業界ニュース','事例/数字','解説/How-to','個人見解','コミュニティ議論','ツールリリース'];

export function AdOpsFilterChips() {
  const router = useRouter();
  const params = useSearchParams();
  const currentMedia = params.get('filter_media')?.split(',').filter(Boolean) ?? [];
  const currentTheme = params.get('filter_theme')?.split(',').filter(Boolean) ?? [];
  const currentFormat = params.get('filter_format')?.split(',').filter(Boolean) ?? [];

  function toggleFilter(key: 'filter_media' | 'filter_theme' | 'filter_format', value: string) {
    const current = params.get(key)?.split(',').filter(Boolean) ?? [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    const newParams = new URLSearchParams(params.toString());
    if (next.length === 0) newParams.delete(key);
    else newParams.set(key, next.join(','));
    router.push(`?${newParams.toString()}`);
  }

  return (
    <div className="space-y-3 mb-4">
      <ChipGroup label="媒体" options={MEDIA_OPTIONS} current={currentMedia}
                 onToggle={v => toggleFilter('filter_media', v)} />
      <ChipGroup label="テーマ" options={THEME_OPTIONS} current={currentTheme}
                 onToggle={v => toggleFilter('filter_theme', v)} />
      <ChipGroup label="形式" options={FORMAT_OPTIONS} current={currentFormat}
                 onToggle={v => toggleFilter('filter_format', v)} />
    </div>
  );
}

function ChipGroup({ label, options, current, onToggle }: {
  label: string;
  options: string[];
  current: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono text-neutral-400 w-12">{label}:</span>
      {options.map(opt => {
        const active = current.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`text-xs px-2 py-1 rounded ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdOpsFilterChips.tsx
git commit -m "feat(ui): add AdOpsFilterChips for media/theme/format filters"
```

---

### Task 17: AdOpsSortDropdown.tsx（並び順切替）

**Files:**
- Create: `src/components/AdOpsSortDropdown.tsx`

- [ ] **Step 1: コンポーネント作成**

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'ad_ops_change',    label: '媒体変化度（デフォルト）' },
  { value: 'ad_ops_sales',     label: '受注ネタ度' },
  { value: 'ad_ops_ai',        label: 'AI活用度' },
  { value: 'ad_ops_practical', label: '実務直結度' },
  { value: 'ad_ops_total',     label: '総合スコア' },
  { value: 'published_at',     label: '新着順' },
];

export function AdOpsSortDropdown() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('sort') ?? 'ad_ops_change';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newParams = new URLSearchParams(params.toString());
    newParams.set('sort', e.target.value);
    router.push(`?${newParams.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xs font-mono text-neutral-400">並び順:</span>
      <select
        value={current}
        onChange={handleChange}
        className="bg-neutral-800 text-neutral-200 text-xs px-2 py-1 rounded border border-neutral-700"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdOpsSortDropdown.tsx
git commit -m "feat(ui): add AdOpsSortDropdown for 6 sort options"
```

---

### Task 18: AdOpsArticleCard.tsx（記事カード）

**Files:**
- Create: `src/components/AdOpsArticleCard.tsx`

- [ ] **Step 1: コンポーネント作成**

```tsx
import type { Article } from '@/types/article';
import Link from 'next/link';

interface Props {
  article: Article;
}

export function AdOpsArticleCard({ article }: Props) {
  const mediaTags = article.ad_ops_tags?.media ?? [];
  const themeTags = article.ad_ops_tags?.theme ?? [];
  const formatTags = article.ad_ops_tags?.format ?? [];

  return (
    <article className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition">
      {/* 媒体バッジ + タイトル */}
      <div className="flex items-start gap-2 mb-2">
        {mediaTags.length > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200">
            {mediaTags.join('/')}
          </span>
        )}
        <h3 className="text-sm font-semibold text-neutral-100 flex-1">
          <a href={article.url} target="_blank" rel="noopener" className="hover:underline">
            {article.title_ja}
          </a>
        </h3>
      </div>

      {/* サブスコア行 */}
      <div className="text-xs font-mono text-neutral-400 mb-2">
        総合 <span className="text-white">{article.ad_ops_total_score ?? '-'}</span>
        <span className="mx-2">｜</span>
        変化 <span className="text-white">{article.ad_ops_change_score ?? '-'}</span>
        <span className="mx-1"> </span>
        受注 <span className="text-white">{article.ad_ops_sales_angle_score ?? '-'}</span>
        <span className="mx-1"> </span>
        AI <span className="text-white">{article.ad_ops_ai_usage_score ?? '-'}</span>
        <span className="mx-1"> </span>
        実務 <span className="text-white">{article.ad_ops_practical_score ?? '-'}</span>
      </div>

      {/* 3行要約 */}
      <p className="text-sm text-neutral-300 mb-3 whitespace-pre-line">
        {article.summary_3line}
      </p>

      {/* テーマ・形式タグ */}
      <div className="flex gap-1 flex-wrap text-xs text-neutral-500 mb-3">
        {themeTags.map(t => <span key={t}>#{t}</span>)}
        {formatTags.map(f => <span key={f}>#{f}</span>)}
      </div>

      {/* ソース・時刻・深掘り */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500 font-mono">
          {article.source_name} · {new Date(article.published_at).toLocaleString('ja-JP')}
        </span>
        <Link href={`/article/${article.id}`} className="text-blue-400 hover:text-blue-300">
          深掘り依頼 →
        </Link>
      </div>

      {/* トリガー発火 */}
      {article.ad_ops_trigger_flag && (
        <div className="mt-2 text-xs text-red-300 bg-red-900/30 rounded px-2 py-1">
          🚨 {article.ad_ops_trigger_reason}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdOpsArticleCard.tsx
git commit -m "feat(ui): add AdOpsArticleCard with 4-subscore display"
```

---

### Task 19: page.tsx 広告運用タブ切替

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: `getArticles()` に広告運用分岐追加**

既存の `getArticles()` を以下のように拡張：

```typescript
async function getArticles(
  view: TabKey,
  sort: string,
  filters: { media?: string[]; theme?: string[]; format?: string[] },
  limit = 30
): Promise<Article[]> {
  let q = supabase.from('articles').select('*');

  if (view === 'opportunity') {
    q = q.in('pipeline', ['opportunity', 'both', 'opp_ad', 'all']);
  } else if (view === 'business') {
    q = q.in('pipeline', ['business_defense', 'both', 'biz_ad', 'all']);
  } else if (view === 'advertising') {
    q = q.in('pipeline', ['ad_ops', 'opp_ad', 'biz_ad', 'all']);
  } else if (view === 'tier1') {
    q = q.eq('source_tier', 1);
  }

  // 広告運用タブ時のフィルタ
  if (view === 'advertising') {
    for (const m of filters.media ?? []) q = q.contains('ad_ops_tags->media', JSON.stringify([m]));
    for (const t of filters.theme ?? []) q = q.contains('ad_ops_tags->theme', JSON.stringify([t]));
    for (const f of filters.format ?? []) q = q.contains('ad_ops_tags->format', JSON.stringify([f]));
  }

  // ソート
  const sortColumn = resolveSortColumn(sort, view);
  q = q.order(sortColumn, { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  return data as Article[];
}

function resolveSortColumn(sort: string, view: TabKey): string {
  if (view === 'advertising') {
    return {
      'ad_ops_total':     'ad_ops_total_score',
      'ad_ops_change':    'ad_ops_change_score',
      'ad_ops_sales':     'ad_ops_sales_angle_score',
      'ad_ops_ai':        'ad_ops_ai_usage_score',
      'ad_ops_practical': 'ad_ops_practical_score',
      'published_at':     'published_at',
    }[sort] ?? 'ad_ops_change_score';
  }
  return 'published_at';
}
```

- [ ] **Step 2: 広告運用タブの描画分岐**

`Page` コンポーネントで、`view === 'advertising'` の時：

```tsx
import { AdOpsArticleCard } from '@/components/AdOpsArticleCard';
import { AdOpsFilterChips } from '@/components/AdOpsFilterChips';
import { AdOpsSortDropdown } from '@/components/AdOpsSortDropdown';
import { AdOpsTriggerBanner } from '@/components/AdOpsTriggerBanner';

// searchParams を URL から取得
const view = (searchParams.view as TabKey) ?? 'all';
const sort = (searchParams.sort as string) ?? (view === 'advertising' ? 'ad_ops_change' : 'published_at');
const filters = {
  media: searchParams.filter_media?.split(',').filter(Boolean) ?? [],
  theme: searchParams.filter_theme?.split(',').filter(Boolean) ?? [],
  format: searchParams.filter_format?.split(',').filter(Boolean) ?? [],
};

const articles = await getArticles(view, sort, filters);

// ... 既存のタブヘッダ描画

{view === 'advertising' && (
  <>
    <AdOpsTriggerBanner articles={articles} />
    <AdOpsFilterChips />
    <AdOpsSortDropdown />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {articles.map(a => <AdOpsArticleCard key={a.id} article={a} />)}
    </div>
  </>
)}

{view !== 'advertising' && (
  // 既存の ArticleCard 描画
)}
```

- [ ] **Step 3: 動作確認（ローカル）**

```bash
npx next dev
```

ブラウザで `http://localhost:3000/?view=advertising` にアクセスし、以下を確認：
- 広告運用タブが表示される
- フィルタチップでタグ絞り込み可
- 並び順切替が機能する
- 記事カードにサブスコアが表示される
- トリガー発火記事がある場合は赤帯が出る

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ui): wire up advertising tab with filters/sort/cards"
```

---

### Task 20: ai-radar エージェント定義更新

**Files:**
- Modify: `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/ai-radar.md`

- [ ] **Step 1: 守備範囲セクションに追加**

既存の「## 守備範囲」セクションの箇条書きに以下を追加：

```markdown
- 広告運用の媒体情報・トレンド・業界知識キャッチアップ支援
- 広告運用 × AI活用情報の解釈と優先度判定
- 広告運用トリガーフラグ発火時の即時解釈と推奨アクション提示
```

- [ ] **Step 2: 受け取るべき依頼の特徴に追加**

```markdown
- 「広告運用の最新トレンドどう？」「Google Ads の新機能ウォッチして」
- 「Meta Advantage+ の動きある？」「L3商品に影響ありそうな動きある？」
```

- [ ] **Step 3: 起動時に必ず行うこと に追加**

既存の「4. deep_dive_queue の滞留を確認」の後に：

```markdown
5. Supabase から `ad_ops_trigger_flag = true` の直近24時間の記事を確認。発火があれば最優先報告
```

- [ ] **Step 4: 出力フォーマット（状況報告型）に追加**

既存の「## 📊 事業影響 Top 3」の後に：

```markdown
## 📣 広告運用 Top 3
1. [媒体] 日本語タイトル（総合: xx/100｜変化:xx 受注:xx AI:xx 実務:xx）
   - Why this matters: 1行
   - L3商品への示唆 or 運用アクション: 1行
```

- [ ] **Step 5: 出力の品質基準に追加**

```markdown
- 広告運用の記事解釈は「BSA L3商品（LP+広告運用10万）への影響」を必ず1行で付ける
- 広告運用トリガー発火記事は、どのキーワードでヒットしたか・商品設計直撃 or 競合ポジション直撃 のどちらかを明記
```

- [ ] **Step 6: Commit（all-good-ops リポジトリ側）**

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops
git add .claude/agents/ai-radar.md
git commit -m "feat(agent): extend ai-radar scope to ad_ops pipeline"
```

---

### Task 21: 初回バックフィル実行

**Files:** なし（実行のみ）

- [ ] **Step 1: 広告運用ソースのバックフィル**

```bash
cd /Users/rikukudo/Projects/ai-radar
npx tsx scripts/backfill.ts --pipeline=ad_ops --hours=48
```

※ 既存 `backfill.ts` がパイプライン指定オプションに対応していない場合は、Task 22（スクリプト拡張）として分離する。

Expected: 約30ソースから直近48時間分の記事を取得し、パイプライン処理して DB に書き込み。進捗ログが出る。

- [ ] **Step 2: Supabase で結果確認**

```sql
SELECT pipeline, count(*)
FROM articles
WHERE created_at > now() - interval '1 hour'
GROUP BY pipeline;
```

Expected: `ad_ops` / `opp_ad` / `biz_ad` / `all` いずれかに該当する記事が出現。

- [ ] **Step 3: ダッシュボードで目視確認**

```bash
npx next dev
```

`http://localhost:3000/?view=advertising` にアクセスし、記事が表示されることを確認。

---

### Task 22: Vercel デプロイと本番検証

**Files:** なし（デプロイのみ）

- [ ] **Step 1: 最終QA（型・lint・test 全通過確認）**

```bash
cd /Users/rikukudo/Projects/ai-radar
npx tsc --noEmit                    # 型エラーなし
npx next lint                        # lint エラーなし
npx vitest run                       # 全テスト PASS
```

Expected: 全コマンドが exit 0。1つでも失敗したらデプロイ不可。

- [ ] **Step 2: feat ブランチ push**

```bash
git push origin feat/ad-ops-tab
```

- [ ] **Step 3: Vercel プレビューデプロイ確認**

Vercel が自動でプレビュー URL を生成するので、そこでダッシュボードの広告運用タブ動作確認。

※ 本番デプロイ（`main` へのマージ）は人間確認必須。

- [ ] **Step 4: 本番マイグレーション確認**

Supabase 本番に `0002_ad_ops.sql` が適用されているかを確認：

```bash
npx supabase db diff --linked
```

Expected: 差分なし（適用済み）。

- [ ] **Step 5: Cron 動作確認**

次回の tier1-hourly cron 実行後、Supabase ログで広告運用ソースもクロールされていることを確認：

```sql
SELECT id, last_crawled_at FROM sources WHERE in_ad_ops = true ORDER BY last_crawled_at DESC;
```

Expected: 広告運用ソース全てが最近クロールされている。

- [ ] **Step 6: Gmail 通知の到達確認**

次の朝8時 / 夜20時 ダイジェストで「📣 広告運用」セクションが含まれるか確認。

---

## Self-Review Notes

**Spec coverage check:**
- §3 UI → Task 13, 15, 16, 17, 18, 19 ✓
- §4 パイプライン → Task 9 ✓
- §5 スコアリング → Task 6, 7 ✓
- §5.4 トリガー → Task 8, 12 ✓
- §6 情報源 → Task 10, 11 ✓
- §7 タグ体系 → Task 5, 16 ✓
- §8 通知 → Task 12 ✓
- §9 月次レポート → Task 20（エージェント起動時チェック + 月次プロンプト） — **月次レポートテンプレートの具体化は Phase 2 に分離**
- §10 エージェント拡張 → Task 20 ✓
- §11 データモデル → Task 1, 2, 3 ✓

**Placeholder scan:** なし（全ステップに具体コード or コマンド記載）

**Type consistency:** 
- `ArticlePipeline` 型は Task 2 で定義、Task 9 / 12 / 14 / 19 で参照。一致
- `AdOpsTags` 型は Task 2 で定義、Task 5 / 12 / 16 / 18 で参照。一致
- `ScoreAdOpsOutput` 型は Task 6 で定義、Task 7 / 9 で参照。一致
- `adOpsScore()` 関数名は Task 7 で定義、Task 9 で呼び出し。一致
- `detectAdOpsTrigger()` 関数名は Task 8 で定義、Task 9 で呼び出し。一致

---

## 実行時の注意

1. **人間確認必須ポイント**:
   - Task 1 Step 3: Supabase MCP での本番マイグレーション適用
   - Task 11 Step 2: seed-ad-ops.sql の本番適用
   - Task 22: Vercel 本番デプロイ
   - `mcp__plugin_vercel_vercel__deploy_to_vercel` は人間確認必須

2. **ソースURL疎通**:
   Task 10 の30ソースは実装時に curl で疎通確認必要。反応しないソースはコメントアウトして「Phase 2 で差し替え」のTODOコメント付きで残す。

3. **テスト基盤**:
   vitest 前提で書いているが、既存ai-radarが別基盤（jest等）なら先頭 `import` を差し替え。

4. **rollback 手順**:
   - DBマイグレーションロールバックは `0003_rollback_ad_ops.sql` を別途用意することを推奨（既存 pipeline enum 復帰 + 広告運用列の DROP）
   - feat ブランチは `main` マージ前に revert 容易

---

## 参考: 実装後の Phase 2 候補

- Tier 3 ソース追加（Reddit / 日本個人発信 / ニュースレター）
- YouTube/Podcast 文字起こしパイプライン
- 月次レポート広告運用セクションテンプレート精緻化
- サブスコア重み再設計（3ヶ月運用実績ベース）
- モバイル UI 最適化
