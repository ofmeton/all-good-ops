# LLM Wiki 導入 Phase 0-1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Karpathy LLM Wiki パターンの土台 (Phase 0) と BSA 領域 MVP (Phase 1) を all-good-ops に導入し、4 週間運用検証に入れる状態にする。

**Architecture:** 3 層構造 (raw/ + wiki/ + wiki/SCHEMA.md)。wiki/ は Obsidian vault root。MVP は BSA 案件運用に絞り、schema は全領域対応で書く。既存 `knowledge/context/` の BSA 関連 3 ファイルを Phase 1 で移行。

**Tech Stack:** Markdown + git。Obsidian (vault viewer)。Bash (grep/sed/git)。

**Source spec:** `docs/superpowers/specs/2026-05-09-llm-wiki-design.md`

**Out of scope (別計画):**
- Phase 2: business 拡張（context-business.md, context-finance.md 分解）
- Phase 3: 横展開（self/, ibasho/, 外部参照ページ）
- Phase 4: wiki-curator agent 抽出

---

## File Structure

### 新規作成（Phase 0）
- `wiki/SCHEMA.md` — wiki 規約 SSOT
- `wiki/index.md` — LLM が読む内部カタログ
- `wiki/log.md` — 時系列イベント
- `wiki/.obsidian/app.json` — Obsidian vault 設定（attachment folder 等）
- `wiki/_attachments/.gitkeep` — 画像置き場
- `raw/articles/.gitkeep`, `raw/deals/.gitkeep`, `raw/notes/.gitkeep`, `raw/transcripts/.gitkeep`, `raw/books/.gitkeep`

### 新規作成（Phase 1）
- `wiki/business/bsa/overview.md` — BSA 戦略全体像
- `wiki/business/bsa/clients/.gitkeep`
- `wiki/business/bsa/deals/.gitkeep`
- `wiki/business/bsa/proposals/templates.md` — 提案文テンプレ
- `wiki/business/bsa/lessons-proposal-patterns.md` — 横断学び（空骨子）
- `wiki/domain/lp-hp-design/.gitkeep`
- `wiki/people/clients/.gitkeep`

### 移動（Phase 1、git mv で履歴保持）
- `knowledge/context/pricing-catalog.md` → `wiki/business/bsa/pricing-catalog.md`
- `knowledge/context/proven-track-record.md` → `wiki/business/bsa/proven-track-record.md`
- `knowledge/context/motion-techniques-catalog.md` → `wiki/domain/lp-hp-design/motion-techniques.md`

### 修正
- `CLAUDE.md` — `## wiki 運用` セクション追加、ルーティング行追加、人間確認ルール強化、確認不要操作追加
- 移動した 3 ファイルへの参照を含む agent/skill md 群（grep で特定後、Phase 1 で個別 task）
- `memory/reference_pricing_catalog.md` — pointer 更新
- `memory/reference_motion_techniques_catalog.md` — pointer 更新
- `memory/reference_bsa_drafts.md` — 必要なら参照先追記

---

## Phase 0: 土台構築

### Task 1: 事前調査 - Obsidian インストール状況とリンク参照網

**Files:** なし（読み取りのみ）

- [ ] **Step 1: Obsidian インストール確認**

```bash
ls -la "/Applications/Obsidian.app" 2>&1 | head -3
brew list --cask 2>/dev/null | grep -i obsidian || echo "not via brew"
```

Expected: 存在すれば path が出る。なければ「No such file」。インストールされていなければユーザーに通知し、`brew install --cask obsidian` を案内（インストール自体は人間操作）。

- [ ] **Step 2: pricing-catalog.md 参照箇所の全列挙**

```bash
rg -n "knowledge/context/pricing-catalog" --type md --type sh --type ts --type tsx --type js --type json 2>&1 | tee /tmp/pricing-catalog-refs.txt
rg -n "pricing-catalog" .claude/ 2>&1 | tee -a /tmp/pricing-catalog-refs.txt
```

Expected: 参照ファイル一覧（CLAUDE.md, agent md, skill md, スクリプト等）。Phase 1 で全部張替える。

- [ ] **Step 3: proven-track-record.md 参照箇所の全列挙**

```bash
rg -n "proven-track-record" --type md --type sh --type ts --type tsx --type js --type json . 2>&1 | tee /tmp/proven-track-refs.txt
rg -n "proven-track-record" .claude/ 2>&1 | tee -a /tmp/proven-track-refs.txt
```

Expected: 参照箇所一覧。

- [ ] **Step 4: motion-techniques-catalog.md 参照箇所の全列挙**

```bash
rg -n "motion-techniques" --type md --type sh --type ts --type tsx --type js --type json . 2>&1 | tee /tmp/motion-techniques-refs.txt
rg -n "motion-techniques" .claude/ 2>&1 | tee -a /tmp/motion-techniques-refs.txt
```

Expected: 参照箇所一覧。

- [ ] **Step 5: 結果を一覧化してユーザーに提示**

3 ファイルの参照箇所をユーザーに見せ、Phase 1 着手前に「移動 OK / 移動見送り」を確認。**移動見送りの判断があればここでプラン中断**。

---

### Task 2: wiki/ 骨組みディレクトリ作成

**Files:**
- Create: `wiki/_attachments/.gitkeep`
- Create: `wiki/business/bsa/clients/.gitkeep`
- Create: `wiki/business/bsa/deals/.gitkeep`
- Create: `wiki/business/bsa/proposals/.gitkeep`
- Create: `wiki/domain/lp-hp-design/.gitkeep`
- Create: `wiki/people/clients/.gitkeep`

- [ ] **Step 1: ディレクトリ一括作成**

```bash
mkdir -p wiki/_attachments wiki/business/bsa/clients wiki/business/bsa/deals wiki/business/bsa/proposals wiki/domain/lp-hp-design wiki/people/clients
touch wiki/_attachments/.gitkeep wiki/business/bsa/clients/.gitkeep wiki/business/bsa/deals/.gitkeep wiki/business/bsa/proposals/.gitkeep wiki/domain/lp-hp-design/.gitkeep wiki/people/clients/.gitkeep
ls wiki/
```

Expected: 6 サブディレクトリが作成される。

---

### Task 3: raw/ ディレクトリ作成

**Files:**
- Create: `raw/articles/.gitkeep`
- Create: `raw/deals/.gitkeep`
- Create: `raw/notes/.gitkeep`
- Create: `raw/transcripts/.gitkeep`
- Create: `raw/books/.gitkeep`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p raw/articles raw/deals raw/notes raw/transcripts raw/books
touch raw/articles/.gitkeep raw/deals/.gitkeep raw/notes/.gitkeep raw/transcripts/.gitkeep raw/books/.gitkeep
ls raw/
```

Expected: 5 サブディレクトリ。

---

### Task 4: wiki/SCHEMA.md 初版作成

**Files:**
- Create: `wiki/SCHEMA.md`

- [ ] **Step 1: SCHEMA.md を書く**

以下の内容で `wiki/SCHEMA.md` を新規作成:

```markdown
# wiki/SCHEMA.md — wiki 規約 SSOT

このファイルは wiki 操作の唯一の正本。wiki に触れる前に必ず読むこと。
変更は人間承認必須（CLAUDE.md「人間確認ルール」参照）。

## 3 層構造

- `raw/` — 不可侵の素材（記事・案件素材・気づき）。**immutable**: 削除・修正は人間承認必須
- `wiki/` — LLM が新規作成・更新を担う markdown ページ群
- `wiki/SCHEMA.md` — 本ファイル（規約）

## ページ種別

- **entity**: 人・クライアント・組織・ツール（固有名詞）
- **concept**: 用語・手法・パターン・型（普通名詞）
- **source**: ingest した記事・本・案件素材へのサマリ
- **topic**: 横断テーマ・テーゼ
- **log**: 時系列イベント（ingest/query/lint）

## 命名

- ファイル名: kebab-case（`terra-isshiki-minpaku.md`）
- entity 固有名詞は日本語そのままも可（`テラ一色民泊HP.md`）
- 日付: `YYYY-MM-DD`

## frontmatter（全 page 必須）

```yaml
---
type: entity | concept | source | topic
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [raw/articles/xxx.md]
related: [[other-page]]
tags: [bsa, lp-design]
status: draft | active | archived
identity: 工藤陸 | ofmeton | n/a
---
```

`identity` 値は名義3ライン分離（後述）に従う。`n/a` はクライアント名義に紐づかない概念ページ（concept 型等）に使う。

## 名義3ライン分離（必須）

- **工藤陸**: `wiki/business/bsa/` 配下のみ。frontmatter `identity: 工藤陸`
- **ofmeton**: `wiki/business/portfolio/` + ブランド発信系。frontmatter `identity: ofmeton`
- **はぐりん**: `monetize-os/` 側 wiki に隔離。**本 wiki の frontmatter には登場しない**
- クライアント情報は名義をまたいで cross-link しない（lint で検出）

## ingest プロトコル

1. ユーザーが `raw/` に素材を置く（記事・案件素材・気づき）
2. ユーザーが秘書に「ingest <path>」と指示
3. 秘書が `wiki/SCHEMA.md` と `wiki/index.md` を読む
4. 素材を読み、ユーザーと要点を 1〜2 ターン対話
5. 秘書が wiki に：
   - 該当ページを新規作成 or 既存に統合
   - 関連 entity/concept ページを差分更新（5〜15 page 想定）
   - frontmatter の `related` を貼り直し
   - `index.md` にエントリ追加
   - `log.md` に「## [YYYY-MM-DD] ingest | <title>」append
6. git commit（1 ingest = 1 commit、rollback 容易）
7. ユーザーが Obsidian で結果を確認

**重要原則**:
- 一度に 1 件（複数の raw を一括処理しない）
- `index.md` を毎回起点にして重複ページ作成を防ぐ
- 既存ページに矛盾する情報が来たら、新情報側を残しつつ「## 異論」セクションで旧主張を保存（**消さない**）

## query プロトコル

1. ユーザーが質問
2. `wiki/index.md` を読む → 関連クラスタ特定
3. 該当ページ群を読み、合成回答
4. 価値ある合成は filing back（option）。秘書がユーザーに 1 問確認:
   - 後で再利用しそう → `wiki/<cluster>/<topic>.md` として保存
   - その場限りの問い → 保存しない

## lint プロトコル

頻度: 月 1（人間トリガー）。重いので自動化しない。

チェック項目:
- 矛盾（A と B のページで食い違う主張）
- 古い記述（新しい source で superseded された主張）
- orphan page（inbound link 0）
- 言及されているが page 化されていない概念
- 不足 cross-reference
- data gap（Web 検索で補えそうな空白）
- 名義3ライン混在（クライアント情報の cross-link が異名義間にないか）

出力:
- `log.md` に「## [YYYY-MM-DD] lint | summary」append
- 修正提案リストを提示 → ユーザー承認 → 適用

## index.md 規約

- **LLM が読む内部カタログ**。人間が見るのは Obsidian graph view
- LLM が ingest/lint で自動更新する
- 過去 `knowledge/INDEX.md` のような人間メンテはしない（人が触ったら lint 警告）
- 形式: クラスタごとに `- [ページタイトル](relative/path.md) — 1 行サマリ` の箇条書き

## log.md 規約

- 時系列 append-only
- 各エントリは `## [YYYY-MM-DD] <event> | <title>` で始める
- `<event>` は `ingest` | `query` | `lint` | `phase` のいずれか
- `grep "^## \[" log.md | tail -10` で直近 10 イベントが見える形式

## Obsidian 規約

- vault root: `wiki/`
- attachment folder: `wiki/_attachments/`
- frontmatter `tags` は Obsidian tag pane に出る
- グラフビューで cluster ごとに color group 設定推奨
```

- [ ] **Step 2: 内容確認**

```bash
wc -l wiki/SCHEMA.md
head -20 wiki/SCHEMA.md
```

Expected: 80〜120 行程度。

---

### Task 5: wiki/index.md 初版作成

**Files:**
- Create: `wiki/index.md`

- [ ] **Step 1: index.md を書く**

以下の内容で `wiki/index.md` を新規作成:

```markdown
# wiki Index

> **このファイルは LLM が ingest/lint で自動更新します。人間は触らないでください。**
> 人間が wiki を眺めるには Obsidian graph view を使ってください。

## business

### bsa
（Phase 1 で追加）

## domain

### lp-hp-design
（Phase 1 で追加）

## people
（Phase 1 で追加）

## self
（Phase 3）

## ibasho
（Phase 3）

## external
（Phase 3）

---

## 統計（lint で更新）
- 総ページ数: 0
- 最終 ingest: -
- 最終 lint: -
```

- [ ] **Step 2: 確認**

```bash
cat wiki/index.md
```

Expected: 上記内容が表示。

---

### Task 6: wiki/log.md 初版作成

**Files:**
- Create: `wiki/log.md`

- [ ] **Step 1: log.md を書く**

以下の内容で `wiki/log.md` を新規作成（最初の phase エントリだけ含む）:

```markdown
# wiki Log

> append-only。各エントリは `## [YYYY-MM-DD] <event> | <title>` で始める。
> `<event>` は `ingest` | `query` | `lint` | `phase`。
> `grep "^## \[" log.md | tail -10` で直近イベントが見える。

## [2026-05-09] phase | Phase 0 開始

LLM Wiki パターン導入の土台構築開始。
Spec: `docs/superpowers/specs/2026-05-09-llm-wiki-design.md`
```

- [ ] **Step 2: 確認**

```bash
cat wiki/log.md
```

Expected: 上記が表示。

---

### Task 7: Obsidian vault 設定（.obsidian/app.json）

**Files:**
- Create: `wiki/.obsidian/app.json`

- [ ] **Step 1: app.json を書く**

以下の内容で `wiki/.obsidian/app.json` を作成（attachment folder と新規ファイル配置の最小設定）:

```json
{
  "attachmentFolderPath": "_attachments",
  "newFileLocation": "current",
  "alwaysUpdateLinks": true,
  "useMarkdownLinks": false,
  "showLineNumber": true
}
```

- [ ] **Step 2: 確認**

```bash
cat wiki/.obsidian/app.json
ls -la wiki/.obsidian/
```

Expected: ファイルが存在。Obsidian で wiki/ を開いた時にこの設定が読み込まれる（実機検証は Task 13 で）。

---

### Task 8: CLAUDE.md に wiki 運用セクション追加

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md の現状確認**

```bash
grep -n "^## " CLAUDE.md | head -30
```

Expected: 章構成が見える。「## MCP連携」セクションの行番号を確認。

- [ ] **Step 2: 「## MCP連携」セクションの直後に「## wiki 運用」を追加**

`CLAUDE.md` の「## MCP連携」セクションの末尾（次の `---` または `## ` 直前）に以下を挿入:

```markdown
---

## wiki 運用

LLM が漸進的にメンテする知識ベース。Karpathy LLM Wiki パターン準拠。詳細は `wiki/SCHEMA.md`。

### 構造
- `wiki/` — LLM 維持の知識ベース（Obsidian vault）
- `raw/` — 不可侵の素材（Web 記事・案件素材・気づき）
- 規約 SSOT: `wiki/SCHEMA.md`（**wiki に触れる前に必読**）

### 操作
- **ingest**: ユーザーが raw/ に素材を置き、秘書経由で wiki に取り込む
- **query**: メインセッション or 秘書経由で wiki から合成
- **lint**: 月 1（人間トリガー）。重いので自動化しない

### 担当
- MVP 段階: 秘書直接処理（標準分類）
- 将来: wiki-curator agent（人間承認後に新設）

### 既存資産との関係
- `knowledge/context/` 配下は段階的に wiki に移行（Phase 1〜3）
- `memory/` は維持（auto-memory として性質が違う）
- `data/*.jsonl` は維持（grep 用構造化ログ）

### 名義3ライン分離
- 工藤陸: `wiki/business/bsa/` 配下のみ
- ofmeton: `wiki/business/portfolio/` + ブランド発信系
- はぐりん: monetize-os 側 wiki に隔離（このリポでは扱わない）
- クライアント情報を異名義間で cross-link しない
```

- [ ] **Step 3: ルーティングテーブルに wiki 行を追加**

`CLAUDE.md` の「### Step 2: 部門・エージェントを選定」のキーワードテーブル末尾に以下を追加（最後の `| 工務店、HP 制作、...` 行の直後）:

```markdown
| wiki、ingest、知識ベース、Karpathy wiki、wiki 取り込み、wiki query、wiki lint | 横断 | secretary（標準分類。`wiki/SCHEMA.md` 必読） |
```

- [ ] **Step 4: 「確認不要の操作」に wiki/raw 操作を追加**

`CLAUDE.md` の「### 確認不要の操作」セクションの末尾に以下を追加:

```markdown
- wiki/ 配下への ingest（新規ページ作成・既存更新・index.md 更新・log.md append）
- raw/ 配下への素材追加（既存ファイルの上書き・削除はしない）
```

- [ ] **Step 5: 「人間確認ルール」のファイル削除行を強化**

`CLAUDE.md` の「| **ファイル削除** | knowledge/ 以外のファイルの削除・上書き |」行を以下に置換:

```markdown
| **ファイル削除** | knowledge/ 以外のファイルの削除・上書き。**特に raw/ 配下は immutable で、削除・修正は人間承認必須** |
```

- [ ] **Step 6: 変更確認**

```bash
grep -n "wiki" CLAUDE.md | head -20
grep -n "raw/ 配下" CLAUDE.md
```

Expected: 追加した文言が複数箇所にヒット。

---

### Task 9: Phase 0 完了 commit

- [ ] **Step 1: 差分確認**

```bash
git status
git diff --stat
```

Expected: `wiki/`, `raw/`, `CLAUDE.md` の変更が見える。

- [ ] **Step 2: 段階 commit（土台 + CLAUDE.md）**

```bash
git add wiki/ raw/
git commit -m "$(cat <<'EOF'
feat: wiki: Phase 0 土台構築 (raw/ + wiki/ + SCHEMA.md)

Karpathy LLM Wiki パターン Phase 0。空の vault と raw/ を用意。
- wiki/SCHEMA.md: 規約 SSOT
- wiki/index.md: LLM 内部カタログ（人間メンテ禁止）
- wiki/log.md: 時系列イベント append-only
- wiki/.obsidian/: vault 設定（attachment folder 等）
- raw/: 不可侵素材（articles/deals/notes/transcripts/books）

Spec: docs/superpowers/specs/2026-05-09-llm-wiki-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: CLAUDE.md: wiki 運用セクション追加 + ルーティング更新

- ## wiki 運用 セクション新設
- ルーティングテーブルに wiki キーワード行を追加
- 確認不要の操作に wiki/ ingest と raw/ 追加を明記
- 人間確認ルールの「ファイル削除」を強化（raw/ immutable）

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git log --oneline -3
```

Expected: 2 commit が積まれる。

---

## Phase 1: BSA 領域 MVP

Phase 0 完了後、ユーザー承認を得てから Phase 1 着手。Task 1 で集めた参照箇所リストを Task 10〜12 で使う。

### Task 10: pricing-catalog.md 移動 + リンク張替え

**Files:**
- Move: `knowledge/context/pricing-catalog.md` → `wiki/business/bsa/pricing-catalog.md`
- Modify: Task 1 Step 2 で列挙した全参照ファイル

- [ ] **Step 1: git mv で移動（履歴保持）**

```bash
git mv knowledge/context/pricing-catalog.md wiki/business/bsa/pricing-catalog.md
ls wiki/business/bsa/pricing-catalog.md
```

Expected: 移動成功。`git status` で rename として認識される。

- [ ] **Step 2: 移動後ファイルに frontmatter を追加**

`wiki/business/bsa/pricing-catalog.md` の冒頭に以下の frontmatter を挿入（既存の本文の前）:

```yaml
---
type: source
created: 2026-04-22
updated: 2026-05-09
sources: []
related: [[overview]]
tags: [bsa, pricing, ssot]
status: active
identity: 工藤陸
---

```

- [ ] **Step 3: 全参照箇所のリンク張替え**

Task 1 Step 2 の `/tmp/pricing-catalog-refs.txt` を見ながら、各参照ファイルで:

```bash
# 参照ファイルごとに：
sed -i '' 's|knowledge/context/pricing-catalog\.md|wiki/business/bsa/pricing-catalog.md|g' <参照ファイルパス>
```

または手動で Edit ツールで張替え。最後に再度 grep で残存ゼロを確認:

```bash
rg -n "knowledge/context/pricing-catalog" --type md --type sh --type ts --type tsx --type js --type json . 2>&1
rg -n "knowledge/context/pricing-catalog" .claude/ 2>&1
```

Expected: ヒット 0 件。

- [ ] **Step 4: 動作確認 - BSA 関連 agent / skill が読み込めるか**

```bash
grep -r "wiki/business/bsa/pricing-catalog" .claude/ CLAUDE.md | head -10
```

Expected: 新パスへの参照が複数ヒット（Task 1 で列挙した数と一致）。

- [ ] **Step 5: index.md と log.md 更新**

`wiki/index.md` の `### bsa` 直下に以下を追加:

```markdown
- [pricing-catalog](business/bsa/pricing-catalog.md) — 商品ライン L1/L2/L3/L4 価格・納期・オプション SSOT
```

`wiki/log.md` 末尾に以下を追加:

```markdown

## [2026-05-09] phase | Phase 1 開始 - pricing-catalog 移行

`knowledge/context/pricing-catalog.md` → `wiki/business/bsa/pricing-catalog.md` 移動。全参照リンク張替え済み。
```

- [ ] **Step 6: commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: wiki: pricing-catalog を BSA wiki に移行

knowledge/context/pricing-catalog.md → wiki/business/bsa/pricing-catalog.md
- frontmatter 追加（type=source, identity=工藤陸）
- 全参照ファイルのリンク張替え
- wiki/index.md, wiki/log.md 更新

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: proven-track-record.md 移動 + リンク張替え

**Files:**
- Move: `knowledge/context/proven-track-record.md` → `wiki/business/bsa/proven-track-record.md`
- Modify: Task 1 Step 3 で列挙した全参照ファイル

- [ ] **Step 1: git mv で移動**

```bash
git mv knowledge/context/proven-track-record.md wiki/business/bsa/proven-track-record.md
```

- [ ] **Step 2: frontmatter 追加**

`wiki/business/bsa/proven-track-record.md` 冒頭に挿入:

```yaml
---
type: source
created: 2026-04-22
updated: 2026-05-09
sources: []
related: [[overview]]
tags: [bsa, track-record]
status: active
identity: 工藤陸
---

```

注: BSA 以外の実績も含む可能性あり。Phase 2 で必要なら `wiki/business/<業種>/track-record.md` に分解する。

- [ ] **Step 3: リンク張替え**

```bash
# 参照ファイルごとに sed 置換 or Edit
# 全参照ファイルパスは /tmp/proven-track-refs.txt 参照

# 完了後の再 grep:
rg -n "knowledge/context/proven-track-record" --type md --type sh --type ts --type tsx --type js --type json . 2>&1
rg -n "knowledge/context/proven-track-record" .claude/ 2>&1
```

Expected: ヒット 0 件。

- [ ] **Step 4: index.md 更新**

`wiki/index.md` の `### bsa` 配下に以下を追加:

```markdown
- [proven-track-record](business/bsa/proven-track-record.md) — 実績一覧（Phase 2 で業種別分解検討）
```

- [ ] **Step 5: commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: wiki: proven-track-record を BSA wiki に移行

knowledge/context/proven-track-record.md → wiki/business/bsa/proven-track-record.md
- frontmatter 追加
- 全参照ファイルのリンク張替え
- Phase 2 で業種別分解する可能性あり（BSA 以外の実績も含むため）

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: motion-techniques-catalog.md 移動 + リンク張替え

**Files:**
- Move: `knowledge/context/motion-techniques-catalog.md` → `wiki/domain/lp-hp-design/motion-techniques.md`
- Modify: Task 1 Step 4 で列挙した全参照ファイル

- [ ] **Step 1: git mv で移動**

```bash
git mv knowledge/context/motion-techniques-catalog.md wiki/domain/lp-hp-design/motion-techniques.md
```

- [ ] **Step 2: frontmatter 追加**

`wiki/domain/lp-hp-design/motion-techniques.md` 冒頭に挿入:

```yaml
---
type: concept
created: 2026-04-22
updated: 2026-05-09
sources: []
related: []
tags: [lp-design, motion, technique-catalog]
status: active
identity: n/a
---

```

- [ ] **Step 3: リンク張替え**

```bash
# 参照ファイルごとに置換
# 全参照ファイルパスは /tmp/motion-techniques-refs.txt 参照

# 完了後の再 grep:
rg -n "motion-techniques-catalog" --type md --type sh --type ts --type tsx --type js --type json . 2>&1
rg -n "motion-techniques-catalog" .claude/ 2>&1
```

Expected: ヒット 0 件。

- [ ] **Step 4: index.md 更新**

`wiki/index.md` の `### lp-hp-design` 配下に以下を追加:

```markdown
- [motion-techniques](domain/lp-hp-design/motion-techniques.md) — LP/HP 演出技法カタログ（spade-co.jp 解析由来）
```

- [ ] **Step 5: commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: wiki: motion-techniques を domain/lp-hp-design に移行

knowledge/context/motion-techniques-catalog.md
  → wiki/domain/lp-hp-design/motion-techniques.md
- frontmatter 追加（type=concept）
- 全参照ファイルのリンク張替え

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Obsidian で vault を開いて検証

**Files:** なし（実機検証のみ）

- [ ] **Step 1: ユーザーに Obsidian で wiki/ を開くよう依頼**

ユーザーに以下を伝える:

> Obsidian を起動し、「Open vault」→「Open folder as vault」で `/Users/rikukudo/Projects/private-agents/all-good-ops/wiki` を選択してください。
> 確認したい点:
> 1. vault が開けるか
> 2. graph view（左サイドバーの三角アイコン）に既存 3 ページ + index/log/SCHEMA が出るか
> 3. attachment folder 設定が `_attachments` になっているか（Settings → Files & Links）
> 4. tag pane に `bsa` `lp-design` 等が出るか

- [ ] **Step 2: 検証結果をユーザーから受け取る**

OK なら次へ。問題があれば `wiki/.obsidian/app.json` を調整 or プラン中断してデバッグ。

---

### Task 14: wiki/business/bsa/overview.md 新規作成

**Files:**
- Create: `wiki/business/bsa/overview.md`

- [ ] **Step 1: overview.md を書く**

以下の内容で `wiki/business/bsa/overview.md` を作成:

```markdown
---
type: topic
created: 2026-05-09
updated: 2026-05-09
sources: []
related: [[pricing-catalog]], [[proven-track-record]], [[lessons-proposal-patterns]]
tags: [bsa, strategy]
status: active
identity: 工藤陸
---

# BSA 戦略全体像

2026-04-22〜2026-08-22 の 4 ヶ月タイムボックス型 HP 制作ブートストラップ戦略。
工藤陸（本名）名義で運用。

## 核ルール

- 名義: 提案文・契約書・請求書は必ず工藤陸（本名）
- AI 表記: 外部露出物では「AI 活用」のみ。「Claude」「Anthropic」等の固有名詞は出さない
- 価格 SSOT: [[pricing-catalog]]
- SLA: 納期超過時は料金の 20% 返金 または 翌日以内に無料修正
- 作業ディレクトリ: `outputs/bsa/`

## 商品ライン（詳細は [[pricing-catalog]]）

- L1: Rapid Single LP / 30,000 円 / 72 時間
- L2: Rapid Corporate 5P / 80,000 円 / 7 日
- L3: Rapid LP + 広告運用初月 / 100,000 円 / 96 時間
- L4: Express 修正・改修 / 10,000〜30,000 円 / 24 時間対応

## 担当エージェント

- rapid-hp-operator: BSA 運用統括（提案投下・KPI・SLA）
- 実制作: portfolio / system-engineer
- 案件スキャン: freelance-scout
- 文面推敲: message-crafter

## 関連ページ

- [[pricing-catalog]] — 価格 SSOT
- [[proven-track-record]] — 実績一覧
- [[lessons-proposal-patterns]] — 提案文の学び（lint で育てる）
- `clients/` — クライアント像（`[[テラ一色民泊HP]]` 等）
- `deals/` — 案件ごとの記録（提案 → 反応 → 結果）
- `proposals/templates.md` — 提案文テンプレ

## 外部参照

- 戦略詳細: `CLAUDE.md` の「## BSA戦略」セクション
- 関連 spec: `docs/superpowers/specs/2026-05-09-llm-wiki-design.md`
```

- [ ] **Step 2: index.md 更新**

`wiki/index.md` の `### bsa` 配下の先頭に以下を追加（先頭に置く）:

```markdown
- [overview](business/bsa/overview.md) — BSA 戦略全体像（4 ヶ月タイムボックス）
```

---

### Task 15: wiki/business/bsa/proposals/templates.md 新規作成

**Files:**
- Create: `wiki/business/bsa/proposals/templates.md`

- [ ] **Step 1: 既存テンプレ素材を確認**

```bash
ls outputs/bsa/proposal-automation/src/generator/prompts/
ls outputs/bsa/ 2>&1 | head -20
```

Expected: 既存の提案テンプレ素材が見える。

- [ ] **Step 2: templates.md を書く（既存素材へのポインタとして）**

以下の内容で `wiki/business/bsa/proposals/templates.md` を作成:

```markdown
---
type: concept
created: 2026-05-09
updated: 2026-05-09
sources: []
related: [[overview]], [[lessons-proposal-patterns]]
tags: [bsa, proposal, template]
status: draft
identity: 工藤陸
---

# 提案文テンプレ集

BSA 提案文の標準骨子と、案件タイプ別バリエーション。

## 関連素材（raw 扱い）

- `outputs/bsa/proposal-automation/src/generator/prompts/proposal.txt` — 自動生成プロンプト本体
- `outputs/bsa/` 配下の各種ドラフト

## 標準骨子（仮）

（パイロット ingest が回ってから、勝ち筋パターンを書き起こす）

## 案件タイプ別バリエーション

### L1（Rapid Single LP）

（Phase 1 パイロットで埋める）

### L2（Rapid Corporate 5P）

（Phase 1 パイロットで埋める）

### L3（Rapid LP + 広告運用初月）

（広告運用要素を含む案件向け）

### L4（Express 修正・改修）

（短期間の修正案件向け）

## 学び

- [[lessons-proposal-patterns]] に蓄積される横断学びを参照
```

- [ ] **Step 3: index.md 更新**

`wiki/index.md` の `### bsa` 配下に以下を追加:

```markdown
- [proposals/templates](business/bsa/proposals/templates.md) — 提案文テンプレ集（パイロット ingest で育てる）
```

---

### Task 16: wiki/business/bsa/lessons-proposal-patterns.md 新規作成

**Files:**
- Create: `wiki/business/bsa/lessons-proposal-patterns.md`

- [ ] **Step 1: lessons-proposal-patterns.md を書く（空骨子）**

```markdown
---
type: topic
created: 2026-05-09
updated: 2026-05-09
sources: []
related: [[overview]], [[proposals/templates]]
tags: [bsa, lessons, proposal]
status: draft
identity: 工藤陸
---

# BSA 提案文の勝ち筋パターン

ingest と lint で育てる横断学びページ。空状態でスタートし、案件ごとに反応・結果が貯まるたびに更新する。

## 勝ちパターン（仮説）

（案件 ingest が貯まってから書き起こす）

## 負けパターン

（同上）

## 価格帯別の傾向

### L1 帯

### L2 帯

### L3 帯

### L4 帯

## クライアント業種別の傾向

（案件 ingest 5 件超えてから書き起こす）

---

**更新ガイド**: 新案件を ingest した時、結果（受注/失注/反応）を踏まえて該当セクションに 1 行追加 or 既存記述を更新する。lint で矛盾検出があったら「## 異論」サブセクションで両論併記。
```

- [ ] **Step 2: index.md 更新**

`wiki/index.md` の `### bsa` 配下に以下を追加:

```markdown
- [lessons-proposal-patterns](business/bsa/lessons-proposal-patterns.md) — 提案勝ち筋の横断学び（lint で育てる）
```

---

### Task 17: パイロット ingest 1 件目（既存案件素材から）

**Files:**
- Create: `raw/deals/2026-05-terra-isshiki/`（既存案件素材を集める）
- Create: `wiki/business/bsa/deals/2026-05-terra-isshiki.md`
- Create: `wiki/people/clients/terra-isshiki-minpaku.md`
- Modify: `wiki/index.md`, `wiki/log.md`

注: テラ一色案件は memory に存在するが BSA 枠外の個人案件なので、deal_id プレフィクスは便宜上の例。実際にどの案件を使うかはユーザー確認の上で決定。

- [ ] **Step 1: ユーザーに ingest 対象案件を選んでもらう**

ユーザーに「Phase 1 パイロット ingest で扱う案件を 1 つ選んでください」と確認。候補:
- テラ一色民泊 HP（個人案件、memory に project あり）
- 既存 BSA 提案投下案件のうち反応が貯まっているもの
- その他

選定後、案件 ID（例: `2026-05-terra-isshiki`）を確定。

- [ ] **Step 2: raw/ に素材を集める**

```bash
mkdir -p raw/deals/<deal-id>/
# ユーザーが手元の素材（提案文・先方やりとり・要件メモ・URL 等）を raw/deals/<deal-id>/ に置く
ls raw/deals/<deal-id>/
```

Expected: 1〜数ファイル（提案文.md / メールログ.txt / ヒアリング.md 等）が置かれる。

- [ ] **Step 3: 秘書に ingest を依頼**

ユーザーがメインセッションで「ingest raw/deals/<deal-id>/」と指示。秘書が:
1. `wiki/SCHEMA.md` と `wiki/index.md` を読む
2. raw/deals/<deal-id>/ の素材を読む
3. ユーザーと要点を 1〜2 ターン対話
4. `wiki/business/bsa/deals/<deal-id>.md` を新規作成（frontmatter 付き）
5. クライアント entity ページが必要なら `wiki/people/clients/<client-name>.md` を作成
6. `wiki/business/bsa/lessons-proposal-patterns.md` の該当セクションに 1 行追加（あれば）
7. `wiki/index.md` を更新
8. `wiki/log.md` に append: `## [YYYY-MM-DD] ingest | <deal title>`

- [ ] **Step 4: 動作確認 - cross-reference の整合性**

```bash
# deals ページから client への [[link]] が貼られているか
grep -r "\[\[" wiki/business/bsa/deals/ 2>&1
grep -r "\[\[" wiki/people/clients/ 2>&1
```

Expected: 双方向リンクが貼られている。

- [ ] **Step 5: commit（秘書が ingest と同時に commit）**

```bash
git log --oneline -1
```

Expected: 直近 commit が `feat: wiki: ingest <deal title>` 系のメッセージになっている。

---

### Task 18: パイロット ingest 動作確認 - query / lint テスト

**Files:** なし（動作確認のみ）

- [ ] **Step 1: query テスト**

ユーザーがメインセッションで「wiki に基づいて、テラ一色案件で気をつける点を教えて」等の質問を投げる（実案件のクエリ）。

期待動作:
1. `wiki/index.md` を読む
2. `wiki/business/bsa/deals/<deal-id>.md` と `wiki/people/clients/<client>.md` を読む
3. 合成回答を返す
4. 「この合成を filing back しますか？」と 1 問確認

- [ ] **Step 2: filing back テスト（option）**

「この合成を filing back する」を選んだ場合、`wiki/business/bsa/<topic>.md` として保存され、index.md と log.md が更新されることを確認。

- [ ] **Step 3: lint テスト（軽量版）**

ユーザーがメインセッションで「wiki を lint してほしい。orphan ページと矛盾を中心に見て」と指示。

期待動作:
1. `wiki/SCHEMA.md` を読む
2. wiki/ 全体をスキャン
3. orphan page（inbound link 0）を列挙 — 多分 `pricing-catalog` や `proven-track-record` 等が orphan として出る
4. 名義3ライン混在チェック — このフェーズでは 1 案件のみなので問題なし
5. 結果を提示
6. `wiki/log.md` に `## [YYYY-MM-DD] lint | summary` を append

注: orphan が出るのは想定内（overview から各ページに `[[link]]` を貼っていれば解消）。

- [ ] **Step 4: 動作確認結果をユーザーと共有**

3 つの動作確認（ingest / query / lint）の結果を spec の「MVP 完了の定義」と照らし合わせ、Phase 1 完了判定を行う。

---

### Task 19: memory pointer 更新

**Files:**
- Modify: `memory/reference_pricing_catalog.md`
- Modify: `memory/reference_motion_techniques_catalog.md`
- Modify: `memory/reference_bsa_drafts.md`（必要なら）
- Modify: `memory/MEMORY.md`（pointer の hook 文言更新）

- [ ] **Step 1: reference_pricing_catalog.md 更新**

`/Users/rikukudo/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/reference_pricing_catalog.md` を Edit で開き、本文の `knowledge/context/pricing-catalog.md` を `wiki/business/bsa/pricing-catalog.md` に置換。

- [ ] **Step 2: reference_motion_techniques_catalog.md 更新**

`memory/reference_motion_techniques_catalog.md` の本文の `knowledge/context/motion-techniques-catalog.md` を `wiki/domain/lp-hp-design/motion-techniques.md` に置換。

- [ ] **Step 3: MEMORY.md の hook 文言更新**

`memory/MEMORY.md` の以下の行を更新:

```markdown
- [価格・サービス表記 正本カタログ](reference_pricing_catalog.md) — knowledge/context/pricing-catalog.md が SSOT。価格記述生成・変更時は必ず参照
```

を以下に置換:

```markdown
- [価格・サービス表記 正本カタログ](reference_pricing_catalog.md) — wiki/business/bsa/pricing-catalog.md が SSOT。価格記述生成・変更時は必ず参照
```

同様に motion-techniques 行も:

```markdown
- [Motion Techniques Catalog（LP/HP 演出引き出し）](reference_motion_techniques_catalog.md) — knowledge/context/motion-techniques-catalog.md が SSOT。spade-co.jp 解析で吸収した7+補助技法。LP/HP 実装時の標準語彙
```

を:

```markdown
- [Motion Techniques Catalog（LP/HP 演出引き出し）](reference_motion_techniques_catalog.md) — wiki/domain/lp-hp-design/motion-techniques.md が SSOT。spade-co.jp 解析で吸収した7+補助技法。LP/HP 実装時の標準語彙
```

に置換。

- [ ] **Step 4: 確認**

```bash
grep -n "knowledge/context" /Users/rikukudo/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/MEMORY.md
grep -rn "knowledge/context/pricing-catalog\|knowledge/context/motion-techniques-catalog\|knowledge/context/proven-track-record" /Users/rikukudo/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/
```

Expected: ヒット 0 件。

- [ ] **Step 5: memory はリポ外なので git commit 不要だが、内容確認だけ**

memory は別リポ管理なので all-good-ops の git には乗らない。手動更新したことをユーザーに報告。

---

### Task 20: Phase 1 完了 commit + ユーザー確認

- [ ] **Step 1: 全体差分確認**

```bash
git status
git log --oneline -10
```

Expected: Phase 0 (2 commits) + Phase 1 (5+ commits = 移動 3 + パイロット 1 + 動作確認 1) が積まれている。

- [ ] **Step 2: log.md に Phase 1 完了エントリ追加**

`wiki/log.md` の末尾に以下を追加:

```markdown

## [YYYY-MM-DD] phase | Phase 1 完了 - BSA MVP 動作確認

3 ファイル移行 + パイロット ingest 1 件 + query/lint 動作確認完了。
4 週間運用検証フェーズに入る。
- 検証指標: ingest 件数 ≥ 5、query 体感速度、lint コスト
- 撤退基準: ingest 0〜1 件 / 受注効果なし / メイン作業圧迫
```

- [ ] **Step 3: Phase 1 完了 commit**

```bash
git add wiki/log.md
git commit -m "$(cat <<'EOF'
feat: wiki: Phase 1 完了 (BSA MVP)

3 ファイル移行 + パイロット ingest 1 件 + query/lint 動作確認完了。
4 週間運用検証フェーズへ。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: ユーザーに Phase 1 完了を報告**

ユーザーに以下を伝える:
- Phase 1 完了
- これから 4 週間の運用検証（spec の「検証方針」参照）
- 4 週間後に Phase 2（business 拡張）着手判断
- ingest 件数が伸びない場合は撤退基準に従って巻き戻し

---

## Self-Review チェック

実装前に以下を確認:

### Spec coverage
- [x] アーキテクチャ 3 層 → Task 2/3/4 で raw + wiki + SCHEMA を作成
- [x] ingest プロトコル → Task 17 でパイロット実行、SCHEMA.md に明文化
- [x] query プロトコル → Task 18 で動作確認、SCHEMA.md に明文化
- [x] lint プロトコル → Task 18 で動作確認、SCHEMA.md に明文化
- [x] SCHEMA.md → Task 4
- [x] 名義3ライン分離 → SCHEMA.md と CLAUDE.md 両方で明文化（Task 4, 8）
- [x] INDEX 廃止前史への回答 → SCHEMA.md の「index.md 規約」で明示（Task 4）
- [x] CLAUDE.md 追記 → Task 8
- [x] 既存資産取り込み Phase 1 → Task 10/11/12
- [x] 検証方針 → Task 18
- [x] memory pointer 更新 → Task 19
- [ ] Obsidian Web Clipper 設定 → **未対応**。Phase 0 完了後に手動で実施（Task 13 で実機確認のみ）

→ Web Clipper の設定は本プランには含めない（Obsidian 拡張のインストール・設定は手動作業）。プラン外の手順としてユーザーに案内する。

### Placeholder scan
- Task 14/15/16 で「（Phase 1 パイロットで埋める）」等の空セクションがあるが、これは**意図的な空骨子**（lint と ingest で育てる）なのでプラン失敗ではない。spec の SCHEMA.md にも「lint で育てる」と書いてある
- Task 17 Step 2 の `<deal-id>` はユーザー選定によるプレースホルダなので Step 1 で確定する流れ
- 「TBD」「TODO」「適切な〜」等の禁忌表現はなし

### Type consistency
- pricing-catalog の frontmatter `type: source` が Task 10 で定義、これは Karpathy パターンの「source」種別と整合
- motion-techniques は `type: concept`、proven-track-record は `type: source` で使い分け（catalog 性質が強い前者を concept、実績ログ性質の後者を source）
- identity 値: `工藤陸 | ofmeton | n/a` の 3 値で一貫（はぐりんは出ない）
- `[[wikilink]]` 記法を Obsidian 互換で統一

### Scope check
- Phase 0 (Task 1-9) と Phase 1 (Task 10-20) のみ。Phase 2-4 は別計画として分離
- 単一実装計画として完結

問題なし。

---

## Out of Scope（Phase 2 以降の別計画）

このプランには含まれない以下の作業は別計画で実施:

- **Phase 2**: `context-business.md`, `context-finance.md`, `context-life.md`, `context-goals.md`, `context-ibasho.md` の wiki 分解移行
- **Phase 3**: ai-radar / monetize-os への外部参照ページ作成、persona 名義の隔離強化
- **Phase 4**: wiki-curator agent 抽出（人間承認必須）、lint 自動化検討
- Obsidian Web Clipper のセットアップ（拡張インストールは手動）
- gitignore 検討（クライアント機密の扱い）
