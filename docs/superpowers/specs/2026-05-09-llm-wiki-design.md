# LLM Wiki 導入設計（all-good-ops）

- 起案日: 2026-05-09
- 起案者: 工藤陸（ofmeton）
- 元ネタ: Andrej Karpathy「LLM Wiki」 https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- ステータス: spec draft（ユーザーレビュー待ち）

## 背景・動機

all-good-ops は秘書を一次窓口とする半自律型エージェント体制で、`knowledge/context/` `memory/` `data/*.jsonl` `outputs/` などに知識・記録が分散している。RAG 的な「素材を都度検索する」運用は cross-reference が貯まらず、毎回ゼロから合成し直すコストが高い。

Karpathy の LLM Wiki パターンは「LLM が漸進的にメンテする markdown wiki」を中間層として置き、cross-reference・矛盾検出・合成成果の filing back を LLM が担うことで、知識を**累積する資産**に変える設計。BSA 期間（〜2026-08-22）中に提案文・案件反応・市場知見を蓄積していく今が導入適期。

過去に `knowledge/INDEX.md` を「メンテコストに対して効果が薄い」として廃止した経緯があるが、本 wiki の `index.md` は**人間ではなく LLM が読む内部インデックス**であり、ingest/lint で自動更新される点が異なる。

## ゴールと非ゴール

### ゴール
- BSA 案件運用に必要な知識（提案・反応・クライアント・LP 潮流）を wiki に累積し、提案/受注の質と速度を上げる
- 既存 `knowledge/context/` を段階的に wiki に取り込み、SSOT を一本化
- スキーマ・運用プロトコルは MVP から全領域対応で設計し、Phase 2 以降で他クラスタ（self/domain/ibasho 等）に展開できるようにする

### 非ゴール
- `memory/`（auto-memory）を wiki に統合する（性質が違うため別系統で維持）
- `data/*.jsonl` を wiki の log.md に統合する（grep 用構造化ログとして残す）
- 公開 wiki（社外向け）として運用する。当面は private repo 内に閉じる
- monetize-os 配下の persona（はぐりん）情報を本 wiki に持ち込む（名義分離原則）

## 用語

- **wiki**: LLM が新規作成・更新を担う markdown ページ群。本リポの `wiki/` 配下
- **raw source**: 不可侵の素材ファイル。記事・案件素材・気づきメモなど。本リポの `raw/` 配下
- **schema**: wiki の規約 SSOT。`wiki/SCHEMA.md`
- **ingest**: raw source を読み、wiki に取り込む操作
- **query**: wiki から合成回答を作る操作
- **lint**: wiki の健全性チェック（矛盾・古い記述・orphan 検出など）
- **filing back**: 価値ある query 結果を wiki に新規ページとして保存する操作
- **名義3ライン**: 工藤陸 / ofmeton / はぐりん の 3 名義分離原則（CLAUDE.md 既定）

## アーキテクチャ

3 層構造（Karpathy 流に準拠）:

```
raw/        (不可侵の素材) ──ingest──┐
                                     ↓
wiki/       (LLM が書く・更新する)
  SCHEMA.md (規約)
  index.md  (LLM 自動更新カタログ)
  log.md    (時系列イベント)
                                     ↑
                                   query / lint
                                     ↑
                                [user / 秘書]
```

### ディレクトリ構造

```
all-good-ops/
├── wiki/                          # Obsidian vault root
│   ├── SCHEMA.md                  # wiki 規約・ingest/lint プロトコル
│   ├── index.md                   # 全ページのカタログ（LLM 自動更新）
│   ├── log.md                     # 時系列イベント（LLM append-only）
│   ├── self/                      # 自己（健康・心理・スキル・キャリア）
│   ├── business/
│   │   ├── bsa/                   # ★MVP 起点★
│   │   │   ├── overview.md
│   │   │   ├── deals/             # 案件ごと（提案 → 反応 → 結果）
│   │   │   ├── clients/           # クライアント像
│   │   │   ├── proposals/         # 提案文の素材・テンプレ
│   │   │   ├── pricing-catalog.md # knowledge/context から移動（Phase 1）
│   │   │   ├── proven-track-record.md # 同上
│   │   │   └── lessons-proposal-patterns.md # 横断学び（lint で育てる）
│   │   ├── portfolio/             # Phase 2
│   │   ├── icecream/              # Phase 2
│   │   ├── shopify/               # Phase 2
│   │   └── finance/               # Phase 2
│   ├── ops/                       # 体制（agent・skill・運用）— Phase 3
│   ├── domain/                    # ドメイン知識
│   │   ├── lp-hp-design/
│   │   │   └── motion-techniques.md  # knowledge/context から移動（Phase 1）
│   │   ├── ad-ops/                # Phase 2
│   │   ├── ai-industry/           # ai-radar への外部参照のみ（Phase 3）
│   │   ├── claude-code/           # Phase 3
│   │   └── design-systems/        # Phase 3
│   ├── ibasho/                    # 子どもの居場所構想（Phase 3）
│   ├── people/                    # 関係者（クライアント・取引先）（Phase 1 から）
│   └── _attachments/              # 画像（Obsidian Web Clipper の DL 先）
│
├── raw/                           # ★新設★ 不可侵の素材
│   ├── articles/                  # Web 記事（Obsidian Clipper の出力先）
│   ├── transcripts/               # podcast/YouTube 文字起こし
│   ├── deals/                     # 案件素材（案件 ID 別）
│   │   └── <YYYY-MM-deal-id>/
│   ├── books/                     # 読書素材（PDF/抜粋）
│   └── notes/                     # 自分の手書きメモ・気づき
│
├── knowledge/
│   ├── context/                   # Phase 1 以降、段階的に空にする
│   └── archive/                   # 移行後の旧ファイル退避
│
├── data/                          # 既存通り（変更なし）
│   ├── usage-log.jsonl
│   └── improvement-log.jsonl
│
└── ...（既存）
```

### 設計上の境界

- `raw/` と `wiki/` は **書き手が分離**: raw は人間が置く、wiki は LLM が書く
- `raw/` は **immutable**: 削除・修正は人間承認必須（CLAUDE.md「人間確認ルール」に追記）
- `wiki/SCHEMA.md` は **CLAUDE.md とは独立**: wiki 操作の細則を集約し CLAUDE.md の肥大化を抑える
- `wiki/_attachments/` は Obsidian の attachment folder 設定先
- `raw/` は Obsidian vault の外（vault root は `wiki/` のみ）

## オペレーション

### Ingest

```
1. ユーザーが raw/ に素材を置く（記事・案件素材・気づき）
2. 秘書に「ingest <path>」と指示
3. 秘書が wiki/SCHEMA.md と wiki/index.md を読む
4. 素材を読み、ユーザーと要点を 1〜2 ターン対話
5. 秘書が wiki に：
   - 該当ページを新規作成 or 既存に統合
   - 関連 entity/concept ページを差分更新（5〜15 page 想定）
   - frontmatter の cross-reference を貼り直し
   - index.md にエントリ追加
   - log.md に「## [YYYY-MM-DD] ingest | <title>」append
6. git commit（1 ingest = 1 commit、rollback 容易）
7. ユーザーが Obsidian で結果を確認
```

**プロトコル原則**:
- 一度に 1 件（Karpathy 推奨）
- index.md を毎回起点にして重複ページ作成を防ぐ
- 既存ページに矛盾する情報が来たら、新情報側を残しつつ「## 異論」セクションで旧主張を保存（消さない）

### Query

```
1. ユーザーが秘書 or メインセッションに質問
2. wiki/index.md を読む → 関連クラスタ特定
3. 該当ページ群を読む → 合成して回答
4. 価値ある合成は wiki/<cluster>/<topic>.md として filing back（option）
   例: 「BSA で落札率高い提案文の共通点」を query した結果は
       business/bsa/lessons-proposal-patterns.md として保存
```

**filing back の判断基準**:
- 後で再利用しそう → filing
- その場限りの問い → filing しない（ノイズ防止）
- 判断は秘書がユーザーに 1 問確認

### Lint

頻度: 月 1（人間トリガー）。重いので自動化はしない。

チェック項目:
- 矛盾（A と B のページで食い違う主張）
- 古い記述（新しい source で superseded された主張）
- orphan page（inbound link 0）
- 言及されているが page 化されていない概念
- 不足 cross-reference
- data gap（Web 検索で補えそうな空白）
- 名義3ライン混在（クライアント情報の cross-link が異名義間にないか）

出力:
- log.md に「## [YYYY-MM-DD] lint | summary」append
- 修正提案リストを提示 → ユーザー承認 → 適用

## SCHEMA.md（wiki 規約）

`wiki/SCHEMA.md` は本 spec とは別ファイルとして Phase 0 で作成。主要セクション:

```yaml
ページ種別:
  - entity:  人・クライアント・組織・ツール（固有名詞）
  - concept: 用語・手法・パターン・型（普通名詞）
  - source:  ingest した記事・本・案件素材へのサマリ
  - topic:   横断テーマ・テーゼ（「BSA 提案で勝つコピーパターン」等）
  - log:     時系列イベント（ingest/query/lint）

命名:
  - ファイル名: kebab-case（terra-isshiki-minpaku.md）
  - entity 固有名詞は日本語そのままも可（テラ一色民泊HP.md）
  - 日付: YYYY-MM-DD

frontmatter（全 page 必須）:
  ---
  type: entity | concept | source | topic
  created: 2026-05-09
  updated: 2026-05-09
  sources: [raw/articles/xxx.md]   # 由来素材
  related: [[other-page]]           # cross-reference
  tags: [bsa, lp-design]
  status: draft | active | archived
  identity: 工藤陸 | ofmeton | n/a   # 名義（はぐりんは本リポ扱い外）
  ---

名義3ライン分離（必須）:
  - 工藤陸: business/bsa/ 配下のみ。frontmatter identity: 工藤陸
  - ofmeton: business/portfolio/ + brand-publisher 系。frontmatter identity: ofmeton
  - はぐりん: monetize-os 側 wiki に隔離。本 wiki の frontmatter には登場しない
  - クライアント情報は名義をまたいで cross-link しない

ingest プロトコル詳細（運用手順を細則化）
lint プロトコル詳細（チェックリスト化）

Obsidian 規約:
  - _attachments/ を attachment folder にする
  - frontmatter tags が Obsidian tag pane に出る
  - グラフビューで cluster ごとに color group 設定推奨
```

### INDEX 廃止前史への回答

| 過去の `knowledge/INDEX.md` | 今回の `wiki/index.md` |
|---|---|
| 人間 or 半手動メンテ | LLM が ingest/lint で自動更新 |
| 人が見るカタログが目的 | LLM が query 時の探索起点として読む |
| 規模小（数ファイル） | 規模拡張可能（数百 page） |
| 効果薄く廃止 | LLM のメンテで陳腐化しない |

人間が wiki を眺める用途は Obsidian の graph view が代替する。

## 既存資産との関係

| 既存資産 | 扱い |
|---|---|
| `knowledge/context/` | Phase 1〜3 で wiki に段階移行。最終的に空 → archive へ |
| `memory/` | 維持（auto-memory として性質が違う）。重複する `project_*` `reference_*` は wiki に該当ページがあれば pointer 化 |
| `data/usage-log.jsonl` `improvement-log.jsonl` | 維持（grep 用構造化ログ。wiki の log.md と並行） |
| `outputs/` | 制作物として維持。raw source として ingest 対象になる場合あり |
| `ai-radar/` | 別プロジェクトとして維持。wiki/domain/ai-industry/ で外部参照ページのみ持つ |
| `portfolio/` | 別プロジェクトとして維持。wiki/business/portfolio/ で外部参照 |
| `monetize-os/` | はぐりん側 wiki があればそちらに隔離。本 wiki では扱わない |

## 移行プラン（Phase 計画）

### Phase 0: 土台構築

```
作成:
  wiki/SCHEMA.md         # 初版（本 spec を元に書く）
  wiki/index.md          # 空テンプレ
  wiki/log.md            # 空テンプレ
  wiki/.obsidian/        # vault 設定
  raw/articles/          # 空
  raw/deals/             # 空
  raw/notes/             # 空

CLAUDE.md 追記:
  - 「## wiki 運用」セクション
  - ルーティングテーブルに wiki 関連キーワード行を追加
  - 「人間確認ルール」の「ファイル削除」行を強化（raw/ 配下を immutable と明記）
  - 「確認不要の操作」に wiki/ への ingest を追加

変更なし:
  knowledge/context/  # 全 8 ファイル温存
  memory/             # 維持
  data/               # 維持

事前チェック:
  - Obsidian 未インストール時はインストール
  - rg "knowledge/context/pricing-catalog" --type md --type sh --type ts で全参照箇所列挙
```

### Phase 1: MVP（BSA 領域）

```
移動:
  knowledge/context/pricing-catalog.md
    → wiki/business/bsa/pricing-catalog.md
  knowledge/context/proven-track-record.md
    → wiki/business/bsa/proven-track-record.md
    （注: BSA 以外の実績も含む可能性あり。Phase 2 で必要に応じて
      wiki/business/<業種>/track-record.md に分解検討）
  knowledge/context/motion-techniques-catalog.md
    → wiki/domain/lp-hp-design/motion-techniques.md

新規作成:
  wiki/business/bsa/overview.md           # BSA 戦略全体像
  wiki/business/bsa/deals/<deal-id>/      # 案件 1〜2 件パイロット
  wiki/business/bsa/clients/              # 既存 + 新規クライアント
  wiki/business/bsa/proposals/templates.md
  wiki/business/bsa/lessons-proposal-patterns.md

リンク張替え:
  CLAUDE.md / agent 定義 / skill 内の旧パス参照を新パスへ

memory/ 整理:
  project_bsa_strategy.md → wiki/business/bsa/overview.md と相互参照
  reference_pricing_catalog.md → wiki/business/bsa/pricing-catalog.md にポインタ更新
  reference_bsa_drafts.md → wiki/business/bsa/proposals/ にポインタ更新
```

**重要**: pricing-catalog.md は CLAUDE.md で「価格 SSOT」として参照されているため、移動後はリンク張替えを徹底。BSA 運用が壊れる最大リスク。

### Phase 2: business 拡張（MVP が 4 週間運用できたら）

```
分解移行:
  knowledge/context/context-business.md
    → wiki/business/portfolio/, /icecream/, /shopify/ に分解
  knowledge/context/context-finance.md
    → wiki/business/finance/ に分解

ingest 開始: portfolio 案件・Shopify 売上分析・財務月次
```

### Phase 3: 横展開（Phase 2 が安定したら）

```
分解移行:
  context-life.md    → wiki/self/
  context-goals.md   → wiki/self/goals.md
  context-ibasho.md  → wiki/ibasho/

外部参照ページ作成（Phase 3 でディレクトリ新設）:
  wiki/domain/ai-industry/ai-radar-pointer.md   # ai-radar への外部参照
  wiki/external/monetize-os-pointer.md          # monetize-os の存在のみ記録（情報は持ち込まない）
```

### Phase 4: 成熟期

```
- wiki-curator agent を抽出（人間承認必須）
- lint を月次 cron 化検討
- knowledge/context/ を空に → knowledge/archive/ へ退避 or knowledge/ 廃止
```

## CLAUDE.md への追記内容

### 追加位置: 「## MCP連携」の後ろに新セクション「## wiki 運用」

```markdown
## wiki 運用

LLM が漸進的にメンテする知識ベース。Karpathy LLM Wiki パターン準拠。

### 構造
- `wiki/` — LLM 維持の知識ベース（Obsidian vault）
- `raw/` — 不可侵の素材（Web 記事・案件素材・気づき）
- 規約 SSOT: `wiki/SCHEMA.md`（**wiki に触れる前に必読**）

### 操作
- **ingest**: ユーザーが raw/ に素材を置き、秘書経由で wiki に取り込む
- **query**: メインセッション or 秘書経由で wiki から合成
- **lint**: 月 1（人間トリガー）。重いので自動化しない

### 担当
- MVP 段階: 秘書直接処理（軽量〜標準分類）
- 将来: wiki-curator agent（人間承認後に新設）

### 既存資産との関係
- `knowledge/context/` 配下は段階的に wiki に移行（Phase 1〜3）
- `memory/` は維持（auto-memory として性質が違う）
- `data/*.jsonl` は維持（grep 用構造化ログ）

### 名義3ライン分離
- 工藤陸: `wiki/business/bsa/` 配下のみ
- ofmeton: `wiki/business/portfolio/` ＋ ブランド発信系
- はぐりん: monetize-os 側 wiki に隔離（このリポでは扱わない）
- クライアント情報を異名義間で cross-link しない
```

### ルーティングテーブルへの追加

「### Step 2: 部門・エージェントを選定」のキーワードテーブルに 1 行追加:

```markdown
| wiki、ingest、知識ベース、Karpathy wiki、wiki 取り込み、wiki query、wiki lint | 横断 | secretary（軽量〜標準。wiki/SCHEMA.md 必読） |
```

### 確認不要の操作への追加

```markdown
- wiki/ 配下への ingest（新規ページ作成・既存更新・index.md 更新・log.md append）
- raw/ 配下への素材追加（ユーザーが直接置く想定だが秘書代理も可）
```

### 人間確認ルールの強化

「ファイル削除」行を以下に置換:

```markdown
| **ファイル削除** | knowledge/ 以外のファイルの削除・上書き。**特に raw/ 配下は immutable で、削除・修正は人間承認必須** |
```

## エラー処理・運用上の注意

1. **ingest 時の重複ページ作成防止**: 必ず `wiki/index.md` をまず読み、既存ページがあれば update。命名衝突時はサフィックス（-v2 等）でなく既存ページに統合
2. **名義3ライン混在防止**: クライアント情報を持つページに名義を frontmatter で明示。lint 時に「異名義ページ間の cross-link」を検出
3. **機密管理**: クライアント情報・契約情報は `wiki/business/clients/` にまとめ、必要なら gitignore（後で検討）。当面は private repo 前提で全部 commit
4. **失敗時の rollback**: ingest は git commit を 1 単位とする（rollback 容易）。lint で大規模変更を提案された場合は人間承認

## 検証方針

### MVP 完了の定義（Phase 1 終了判定）

3 つの動作確認をクリアしたら Phase 2 に進む:

1. **ingest 動作**: BSA 案件 1 件分（提案文 + 反応 + 結果）を `raw/deals/<deal-id>/` に置き、秘書が `wiki/business/bsa/deals/<deal-id>/` 配下に新規ページ + index.md 更新 + log.md append できる
2. **query 動作**: 「BSA 提案で勝った理由」をユーザーが質問し、秘書が wiki から合成回答できる
3. **lint 動作**: 意図的に矛盾を 1 件入れ、lint で検出 + 修正提案できる

### 運用検証（4 週間）

| 指標 | 目標 | 不達時の対応 |
|---|---|---|
| ingest 件数 | 5 件以上 | < 5 → 素材源が枯れている可能性。ingest トリガーを daily-scan / morning-routine に組み込む等の運用設計見直し |
| query が context-update より速い | 体感 OK | 遅い → index.md の検索性能が悪い。クラスタ細分化 |
| lint コスト | メイン作業の枠を圧迫しない | 圧迫 → 月 1 → 四半期 1 に頻度ダウン、Sonnet 化 |

## 撤退基準

以下のいずれかを満たしたら Phase 2 に進めず撤退、`knowledge/context/` 巻き戻し:
- 4 週間で ingest が 0〜1 件（運用が回らない）
- BSA 提案/受注に効果がない（query しても context-update と差がない）
- 秘書の wiki 操作で BSA 業務の優先順位が下がる感覚がある

## コスト・モデル選択

Claude Code サブスク内で動かす想定で**追加課金は発生しない**。Opus 4.7 の使用量制限がメイン作業（BSA 実装等）の枠を食うリスクが主な制約。

| 操作 | モデル | 頻度 | 備考 |
|---|---|---|---|
| ingest | Opus 4.7 | 都度（週 5 件想定） | 差分更新なのでサブスク負荷小 |
| lint | Opus 4.7 | 月 1 のみ | 全 wiki スキャンで重い。頻度制限 |
| query | メインセッション | 都度 | 通常の対話と同じ |

将来 Opus が枠を食いすぎる兆候が出たら、ingest を Sonnet 4.6 に切り替える（差分更新だけなら Sonnet で十分）。

## 初期スクリーニング項目

| リスク | 検証方法 | タイミング |
|---|---|---|
| Obsidian 未インストール → vault 化が機能しない | `brew list --cask` で確認 | Phase 0 開始時 |
| pricing-catalog.md 移動でリンク切れが BSA 運用を壊す | `rg "knowledge/context/pricing-catalog" --type md --type sh --type ts` で全参照箇所列挙してから移動 | Phase 1 着手時 |
| `wiki/index.md` の人間メンテ復活 | LLM 自動更新を SCHEMA.md で厳格化、人が触ったら lint 警告 | SCHEMA.md 設計時 |
| Obsidian Web Clipper のローカル保存先と raw/articles/ の同期 | Obsidian の attachment folder 設定 + clipper extension のテスト | Phase 0 |
| 名義3ライン混在の事故 | frontmatter `identity:` + lint チェック項目に追加 | SCHEMA.md 設計時 |

## オープンクエスチョン

- `wiki/_attachments/` を Obsidian の attachment folder にする運用と、`raw/articles/` の Obsidian Clipper 出力先運用の両立方法（どちらかに寄せるか、両方使うか）→ Phase 0 で実機検証
- `wiki/people/clients/` を gitignore するか否か（守秘 vs 履歴管理のトレードオフ）→ クライアント情報を実際に書き出す前に決定
- Phase 4 の wiki-curator agent の責務範囲（lint 専任か、ingest も担当か）→ Phase 3 終盤に判断
