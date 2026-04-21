# ai-radar プロンプトテンプレート

**用途**: 各記事に対してパイプラインが連鎖的に適用するプロンプト群
**実装ファイル**: `src/lib/prompts/*.ts`（本ドキュメントと同期させる）

---

## P1. 要約＆日本語化（Gemini 2.5 Flash）

**用途**: 記事タイトル・本文を受け取り、日本語タイトル・1行要約・3行要約・重要キーワードを返す

```
あなたはAIビジネスインテリジェンスのアナリストです。
以下の英語記事を日本語で構造化してください。

【記事タイトル（原文）】
{title_original}

【記事本文（最大3000字、切り詰め可）】
{body}

【ソース名】
{source_name}

【出力形式】JSON のみ。コメント禁止。
{
  "title_ja": "日本語タイトル（30字以内・キャッチーに・ネタバレせず）",
  "summary_1line": "1行要約（50字以内・事実のみ）",
  "summary_3line": "3行要約（各行60字以内）",
  "entities": ["関連企業名", "関連モデル名", "関連サービス名"],
  "primary_language": "en|ja|zh|ko|その他"
}
```

---

## P2. パイプライン判別（Gemini 2.5 Flash / 軽量）

**用途**: 記事が ①機会発見対象 ②事業防衛対象 ③両方 ④ノイズ のどれかを判別

```
あなたはAI業界のビジネスアナリストです。
以下の記事が、次の2つのパイプラインのどれに該当するか判定してください。

【パイプラインA: 機会発見】
AIエコシステム内の「新しい需要」「新しいプラットフォーム機会」を見つけるレーダー。
対象: Claude/AI Skills販売、AI利用者コミュニティ、AIワークフロー市場、AI周辺SaaS、
     AI消費者需要、AIインフラ・規制、エージェント取引所など。
非対象: AIモデル単体のベンチマーク発表、AI×他業界の適用事例（例: 医療×AI、金融×AI）。

【パイプラインB: 事業防衛】
ユーザーが進行中の「Claude Skills/ワークフロー販売マーケット事業」への影響を監視。
対象:
  Tier1-A: Anthropic 公式発表（TOS改訂、skills商用化、marketplace、plugin commerce等）
  Tier1-B: 主要競合（ClaudeSkills.ai / Skills4Agents / Agent37 / n8n Creator Hub / LangChain Hub / Vercel skills.sh 等）の価格改定、日本語化、資金調達、買収
  Tier2: 日本国内エンタープライズのClaude導入事例、日本の生成AI規制、J-SOX/個人情報保護法改正
  Tier3: ソロ起業家の収益パターン変化、Gumroad/Stripe手数料改定

【記事情報】
- 日本語タイトル: {title_ja}
- 3行要約: {summary_3line}
- 関連エンティティ: {entities}

【出力形式】JSON のみ。
{
  "pipeline": "opportunity|business_defense|both|noise",
  "reason": "判定理由（40字以内）"
}
```

---

## P3. 機会発見タグ分類（Claude Haiku 4.5）

**用途**: 機会発見対象記事に8種タグから1つ割り当て

```
以下の記事に、AIエコシステム内機会タグを1つ付けてください。

【タグ候補】
- Skills/Workflow市場: AI利用者向けにスキル・ワークフローを売る機会
- AI開発者ツール: 開発者向けインフラ・ライブラリ・SaaS
- AI利用者コミュニティ: コミュニティ形成・教育・会員制
- AIプロダクト（両面市場）: マーケットプレイス・取引所
- AI周辺SaaS: データラベリング・ファインチューニング代行等
- AI消費者需要: エンドユーザー向け新しい使い方
- AIインフラ・規制: 商機につながる地殻変動
- 無関係: ノイズ

【記事】
{title_ja}
{summary_3line}

JSON出力のみ。
{"tag": "Skills/Workflow市場", "confidence": 0.0-1.0}
```

---

## P4. 日本類似サービス検索（Gemini 2.5 Flash with Google Search Grounding）

**用途**: 「この海外サービスに相当する日本サービスが既にあるか」を実検索で判定

```
以下の海外事象に対して、**2026年4月時点**の日本市場に類似サービス／競合が存在するかを
Google検索して確認してください。

【対象】
{title_ja}
{summary_3line}

【調べ方】
1. 日本語で「{entities} 日本」「似たサービス 日本」「{core_concept} 日本語」等を検索
2. 見つかった類似サービスを最大3つ、サービス名・URL・簡単な比較コメントでリストアップ
3. 該当サービスが1つも見つからなければ空配列

【出力】JSON のみ。
{
  "similar_jp_services": [
    {"name": "サービス名", "url": "https://...", "note": "どこが類似・どこが違うか（30字）"}
  ],
  "similar_count": 0-3+,
  "search_queries_used": ["query1", "query2", "query3"]
}
```

**重要**: Gemini 側で `tools: [googleSearch: {}]` を有効化してこのプロンプトを投げる。

---

## P5. 機会度スコア中間指標算出（Claude Haiku 4.5）

**用途**: 5つの中間指標を算出し、それを機会度総合スコアに集約

```
あなたはプラットフォーム事業の投資家です。
以下のAIエコシステム機会を5つの観点で評価してください。

【記事】
日本語タイトル: {title_ja}
3行要約: {summary_3line}
関連エンティティ: {entities}
日本類似サービス数: {similar_jp_services_count}
日本類似サービス: {similar_jp_services}

【評価観点】
1. 両面市場適性 (marketplace_fit, 0-10): 売り手・買い手が明確で、ネットワーク効果が効く構造か
2. Japan Entry Fit (japan_entry_fit, 0-10): 日本進出可能性。言語障壁・規制・商習慣・類似サービス数を考慮
3. Wedge明確度 (wedge, 0-10): 最初に刺せる顧客セグメントの具体性
4. TAM粗推定 (tam_size, 'Small'/'Mid'/'Large'): 海外での先行規模感から推定
5. 参入障壁 (entry_barrier, 'Low'/'Mid'/'High'): ソロ／小規模チームで勝負できるか（Lowほど有利）

加えて:
6. 新規性 (novelty, 0-10): 既視感少なく新しい事象か
7. エンゲージメント (engagement, 0-10): 海外での話題性・熱量

JSON出力のみ。
{
  "score_marketplace_fit": 0-10,
  "score_japan_entry_fit": 0-10,
  "score_wedge": 0-10,
  "tam_size": "Small|Mid|Large",
  "entry_barrier": "Low|Mid|High",
  "novelty_score": 0-10,
  "engagement_hint": 0-10,
  "reasoning": "総合評価コメント（80字以内）"
}
```

### 総合スコアの計算（コード側で実施、LLM不要）

```typescript
function opportunityScore(x) {
  const tamMap = { Small: 3, Mid: 6, Large: 10 };
  const barrierMap = { Low: 10, Mid: 6, High: 2 };

  return Math.round(
    x.score_japan_entry_fit * 3.0      // 30%
    + x.score_marketplace_fit * 1.5    // 15%
    + tamMap[x.tam_size] * 1.5         // 15%
    + x.score_wedge * 1.0              // 10%
    + barrierMap[x.entry_barrier] * 1.0 // 10%
    + x.novelty_score * 1.0            // 10%
    + x.engagement_hint * 0.5          // 5%
    + sourceTrust(source) * 0.5        // 5%
  );
}
```

---

## P6. 事業影響判定（Claude Haiku 4.5）

**用途**: 事業防衛パイプライン対象の記事に対して Tier判定＋方向転換トリガー検知

```
あなたはユーザーの「Claude Skills/ワークフロー販売マーケット事業」（2026年内月収100万円目標、
ソロ運営・日本語圏特化）の戦略アドバイザーです。

【事業のコンテキスト】
- 現状: Stage 0（汎用ワークフロー販売で「作れる・売れる」を証明中）
- 最大リスク: R1 = Anthropicが公式有料マーケットプレイスを発表すること
- 最大機会: D = エンタープライズ共同創業者候補・大企業コンタクト出現
- 主要競合: ClaudeSkills.ai / Skills4Agents / Agent37 / SkillsMP / tech-leads-club / n8n Creator Hub / LangChain Hub / Vercel skills.sh 等
- BMミックス: M2（ワークフロー販売）+ M6（情報商材）+ M7（導入コンサル）

【記事】
{title_ja}
{summary_3line}
エンティティ: {entities}
ソース: {source_name}

【判定項目】
1. axis（どの観測軸か）:
   - "anthropic_official": Anthropic公式情報
   - "competitor": 主要競合の動向
   - "jp_enterprise_ai": 日本エンタープライズAI導入
   - "vertical": 特定職種向けAI事例
   - "solo_creator": ソロ起業家の収益パターン
   - "other": 上記以外

2. tier:
   - 1: 即時対応必要（Anthropic公式・競合の日本語化/資金調達/買収）
   - 2: 数週で判断材料化（日本エンタープライズ事例・Vertical熱）
   - 3: 月次で構造把握（ソロ起業家パターン）

3. trigger_flag（戦略変更トリガー該当の有無）:
   - "R1_risk": Anthropic公式が有料マーケット/Skillsの商業化を発表
   - "D_opportunity": エンタープライズ共同創業者候補・大企業契約シグナル
   - "vertical_surge": 特定職種でAI導入事例が急増（Stage 2早期化トリガー）
   - "bm_shift": ソロ起業家の成功パターンが大きく変化（BMミックス見直し）
   - null: 該当なし

4. impact（事業への影響方向）:
   - "headwind" | "tailwind" | "neutral"

5. recommended_action: 60字以内の推奨アクション

6. confidence: 0.0-1.0

【出力】JSON のみ。
{
  "axis": "...",
  "tier": 1|2|3,
  "trigger_flag": "R1_risk|D_opportunity|vertical_surge|bm_shift|null",
  "impact": "headwind|tailwind|neutral",
  "impact_strength": 0-10,
  "recommended_action": "...",
  "confidence": 0.0-1.0,
  "reasoning": "判定理由（80字以内）"
}
```

### 事業影響スコア計算

```typescript
function businessImpactScore(x, source) {
  const triggerHit = x.trigger_flag ? 40 : 0;
  const tierHit = x.tier === 1 ? 20 : x.tier === 2 ? 15 : 10;
  const impactMag = x.impact_strength;  // 0-10 → 最大10
  return Math.round(
    triggerHit              // 40%
    + tierHit               // 10-20%（Tier1で20, Tier2で15, Tier3で10）
    + impactMag * 1.0       // 10%
    + sourceTrust(source) * 0.5  // 5%
  );
}
```

---

## P7. Tier1即時通知文生成（Claude Haiku 4.5）

**用途**: Tier1ヒット時、Gmail件名＋本文を生成

```
Tier1即時アラートのメール文を生成してください。

【記事】
{title_ja}
{summary_3line}

【判定結果】
axis: {axis}
trigger_flag: {trigger_flag}
impact: {impact}
recommended_action: {recommended_action}

【生成対象】
1. 件名（60字以内）: `[🚨Tier1][{axis_label}] 見出し要約`
2. 本文:
   - 何が起きた: 1文
   - なぜ重要か: 2文以内
   - 推奨アクション: 1文
   - ソースURL
   - 補足情報

フォーマット厳守。マークダウンOK。
```

---

## P8. 週次サマリー生成（Claude Haiku 4.5）

**用途**: 毎週日曜8時、過去7日分の記事から3つの最重要シグナルを抽出

```
ai-radarの週次サマリーメールを作成してください。

【過去7日の記事ダイジェスト】
{top_20_articles_by_combined_score}

【生成要件】
- A4 1枚に収まる分量
- 構成:
  ## 今週の最重要シグナル（3つ）
  1. [Tier or 機会タグ] 見出し（100字以内）
     → 推奨アクション（30字以内）
  2. ...
  3. ...

  ## 観察継続案件
  - [ ] 見出しのみ列挙（リンク付き）

  ## 意思決定フラグ
  - trigger_flag が立った記事があれば強調表示

マークダウンで出力。
```

---

## 実装時の注意

- 各プロンプトは `src/lib/prompts/*.ts` に `buildPrompt(args) => string` 関数として切り出す
- Gemini 用と Claude 用で API 呼び出しコードを分離（`src/lib/gemini.ts` / `src/lib/anthropic.ts`）
- レスポンスJSONをそのままパースしてDBに書き込む
- **JSONパースエラー時の fallback**: 失敗した記事は `pipeline='noise'` でフラグ、翌日の月次レポートでリトライ候補とする
- プロンプトの改訂履歴は git commit で追跡（`src/lib/prompts/*` の変更）
