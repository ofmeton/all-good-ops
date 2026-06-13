# 収集エージェント（Collector Agent）設計 — 2026-06-06

X 発信システム新アーキ（agent=脳 / code=道具＋配管 / 人間=最終ゲート）の**第1工程**。
全体整理は `~/.claude/plans/k-x-improvement-from-traces.md`。本 spec は収集Ag サブプロジェクトの設計。

## Context（なぜ作り直すか）

現 `buzz-ingest` は「固定28ソースを `from:handle -is:retweet` で機械巡回 → 純ルールベース `scoreBuzz` → 件数だけ保存」。実 trace 精査で判明した問題:

1. **取得後フィルタ皆無**で雑な素材混入（空 / リプ / 非日英 / スレ断片）。
2. **探索ゼロ**（固定ソースのみ。トレンド・キーワード・新ソース発見なし）。
3. **スコアがルール数式**で「ターゲット適合」を測れない。
4. **メディア / URL / reply / thread を wrapper が捨てている**（API は返しているのに interface で欠落）。

新方針（ユーザーレビュー確定）: 収集を **"エージェント＝判断 / コード＝道具・配管"** で作り直す。エージェントが探索的にネタを集めスコア＋理由を付け、**除外はせず全保存**。人間が UI（別工程）で選抜。

## 確定要件

- **探索自律度 = 広 / スコープ = フル**: 固定ソース＋キーワード/トレンド探索＋新ソース発見＋スレッド全文復元。
- **実行シェイプ**: 探索＝脳（agent判断）／ fetch・dedup ＝道具（決定的コード）／ scoring ＝脳（バッチ LLM）。**1ジョブ = 1 Collector セッション**（多ターン tool-use ループ、自前＝直 API、Managed Agents 不要）。
- **足切り = 全保存**: 何も落とさない。スコア＋理由を付与、除外/フィルタは人間 UI 側。雑素材は低スコア＋reason で沈める。
- **スコア = 3軸**: ①`freshness`(速報性・鮮度) ②`velocity`(バズ伸び) ③`target_fit`(ターゲット適合)。＋ `overall` ＋ `reason`。4軸目 `practical_impact`(差別化) は枠のみ、後日。
- **ターゲット定義（チャエン層コピー, 分析doc §9.1）**: 「AIを仕事・キャリアに活かしたい日本のビジネスパーソン全般」。`target_fit` の判定基準 = 「チャエンが投稿しそうか」。

## アーキテクチャ

Worker queue に `collect` ジョブを追加。

```
[Plan 脳]    収集戦略を決定: 固定ソース巡回 + 海外トレンド確認 + キーワードクエリ動的生成 + 必要なら新ソース探索
   ▼
[Fetch 道具]  コードが twitterapi.io を叩く（決定的・安価 $0.15/1000）→ dedup（materials_store と tweet_id 突合）
   ▼
[Score 脳]   候補を N件/バッチで 3軸スコア＋reason 付与（target定義は system prompt 1箇所）
   ▼
[Persist 配管] materials_store に全件保存（scores/reason/media/url/discovery/lang/is_reply）
   ▼
[Trace 横断]  ツール呼び出し境界を全 trace（cost_jpy 含む）。discovery(query)＋scores を改善ループの計測基盤として残す
   ▼
人間キュレーション UI（別工程）へ
```

## コンポーネント（コード側 = 道具＋配管）

`lib/ingest/twitterapi-client.ts` を拡張し、エージェントに渡すツール群:

1. `search_tweets(query, queryType)` — advanced_search フル構文（keyword / min_faves / lang / from: / since）。探索主力。
2. `get_trends(woeid)` — **海外トレンド取得**（worldwide=1 / US=23424977 をデフォルト）。海外で来てるネタを先取りして日本に最速輸入するのが価値の源泉（チャエンのモデル、分析doc §8.6）。日本適合は `target_fit` 軸で別途判定。
3. `search_users(keyword)` — 新ソース候補発見。
4. `get_user_followings(handle)` — 信頼ソースのフォロー先から新ソース発見。
5. `get_thread(conversationId)` — スレ全文復元（"3/4だけ"問題を解消）。
6. (内部) `dedup(tweets)` — 既存と tweet_id 突合で重複排除（冪等性）。
7. (内部) `save_materials(scored[])` — バッチ保存。

- **wrapper 拡張**: レスポンスから `isReply / lang / conversationId / media(type,url) / url / bookmark・quote・viewCount / isBlueVerified` を取りこぼさず構造化（現状これらを捨てている）。
- **固定ソース**: 現 `SEED_SOURCES`（28）を初期 watchlist 維持。
- **新ソース発見ガードレール**: 発見アカウントは即昇格せず `candidate_sources` プールへ（発見経路＋理由つき）。スコア or 人間承認で固定ソース昇格。暴走防止。

## スコアリング（ハイブリッド: 数値は道具・重み付け判断は脳）

- ツールが velocity / freshness の数値ヒント（age, (like+RT+bookmark)/h, エンゲージ率）を添える。
- Agent が target 定義（system prompt）に照らし 3軸を 0-100 で判断し `overall` ＋ `reason` を出す。
- velocity / freshness は数値を強く参照、`target_fit` は LLM 判断主体。

## ストレージ（materials_store 拡張）

追加（カラム or `meta` jsonb）:

- `scores`: `{freshness, velocity, target_fit, overall}`
- `score_reason`: text
- `media`: `[{type: photo|video|gif, url}]`
- `tweet_url`, `lang`, `is_reply`, `conversation_id`
- `discovery`: `{via: fixed|keyword|trend|user_search|following, query}` ← キュレーション条件（いつ何で見つけたか）
- `collected_at`, `source_handle`
- `selection_status`: `collected | selected | rejected`（人間 UI が後で更新）

## エラー処理 / 配管不変条件

- twitterapi 失敗は fail-open（候補スキップ、ジョブ継続）。
- dedup で重複保存防止（冪等性）。
- budget: 1ジョブの API 取得件数上限＋スコア token 上限。超過で打ち切り＋log（Workers / コスト制約）。
- 除外しない方針 → 雑素材は低スコア＋reason で UI 側に委ねる。

## テスト戦略（出力一致 → 挙動＋不変条件）

- ツール（wrapper / dedup / save）はユニットテスト（決定的）。
- Agent 判断はフィクスチャで不変条件を検証: 「全候補に3軸スコアが付く／除外されない／全保存／trace がツール境界で出る／dedup が効く」。
- 実 Worker `/admin/enqueue?job=collect` で1回流し、materials_store に scores/media/discovery 付きで入る＋trace 確認。

## 改善レバー / 改善シナリオ（改善しやすさの設計＝最重要）

方針: **収集Ag をいじる場所＝改善レバーを1箇所に集約し、各レバーに「動かす対象・改善シナリオ・効果を測る数字」を 1:1 で対応づける**。散在禁止。Kくん Objective Function 思想の実体。

### レバー集約場所
- `lib/ingest/collector-config.ts`（**数値・設定系レバーの SSOT**）: watchlist / trend woeid / scoring weights / batch・budget上限 / dedup ウィンドウ / scoring モデル / cron スロット。
- `lib/ingest/collector-prompts.ts`（**判断系レバー**）: target 定義（target_fit 基準）/ 探索クエリ戦略 / scoring rubric。編集しやすい単一ファイル。

### 改善レバー一覧

| # | レバー | 場所 | 改善シナリオ | 計測指標（ログ由来） |
|---|---|---|---|---|
| L1 | watchlist（固定ソース増減） | config | 良質ソース追加 / 低品質除去 | **ソース別 採用率** = selected/collected |
| L2 | 新ソース昇格基準 | config | 発見が当たる/外れる | 昇格ソースのその後の採用率 |
| L3 | 探索クエリ戦略 | prompts | クエリが良ネタを引くか | discovery.via/query 別 採用率・スコア分布 |
| L4 | トレンド地域 woeid（海外/US/worldwide） | config | どの地域が価値ネタを生むか | trend 由来素材の採用率 |
| L5 | **scoring rubric / 3軸の重み** | config+prompts | スコアが人間選抜と一致するか | **スコア vs selection の相関**（高スコアなのに rejected / 低スコアなのに selected を検出） ← 最重要 |
| L6 | target 定義（target_fit 基準文） | prompts | ターゲット像の調整 | target_fit スコア vs 実エンゲージ（後工程接続後） |
| L7 | scoring モデル（Haiku/Sonnet） | config | コスト vs 質 | cost_jpy vs スコア質 |
| L8 | バッチサイズ / budget上限 | config | コスト/網羅バランス | cost_jpy vs 収集件数 vs 採用数 |
| L9 | dedup ウィンドウ | config | 重複/再収集の制御 | dedup 除外率 |
| L10 | 収集頻度 / 時間帯（cron） | config | いつ集めると鮮度高いか | 鮮度スコア分布 × 時間帯 |

### 計測基盤（改善を測るためのログ＝今回必ず仕込む）
- 各素材に `discovery{via,query}` + `scores` + `collected_at` を保存。
- 後工程で `selection_status`（人間が選んだか）を更新 → **「収集→選抜」歩留まりが source別/query別/score別に分析可能**（L1-L5 の効果が見える）。
- さらに後工程の投稿実績（エンゲージ）と `source_material_id` を将来接続 → 「収集→投稿→反応」貫通（改善ループ完成形、deferred）。
- 各レバーに対応する**計測 SQL / dashboard パネルを1つずつ用意**。

### 改善ループとの接続（本体は全工程実装後）
ログ記録(済)→計測→分析→仮説→施策(レバー操作)→アクション→再計測。今回は**上表の計測指標が全部ログから取れる状態**にするところまで（ループ自動化は後日）。

## スコープ / YAGNI

- 今回 = 収集Ag ＋ ツール拡張 ＋ スコアリング ＋ materials_store 拡張 ＋ trace まで。
- UI（ステージ2）は別サブプロジェクト。
- 4軸目（差別化）・`get_article`（高コスト長文）は枠のみ、初版スコープ外。
- 改善ループ本体は全工程実装後に別途。今回は「計測可能なログ（discovery / scores / 後の selection）を残す」だけ担保。

## 検証（E2E）

1. `npm run worker:typecheck` / `npm test`（`IN_MEMORY_FALLBACK=true`）/ `npm run build:registry` 緑。
2. 実 Worker `/admin/enqueue?job=collect` → materials_store に全保存＆3軸スコア＆メディア＆discovery、trace がツール境界で出ること。
3. budget 上限・dedup 冪等性・fail-open を確認。
4. push 前 `git log --oneline main..HEAD`。1セッション = 1 task ブランチ、worktree 隔離。
