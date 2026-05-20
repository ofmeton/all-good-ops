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

- **工藤陸**: `wiki/business/bsa/` + `wiki/business/personal/` + 関連 `wiki/people/clients/`（BSA 提案・受注・契約・個人案件すべて）。frontmatter `identity: 工藤陸`
- **ofmeton**: `wiki/business/portfolio/` + ブランド発信系。frontmatter `identity: ofmeton`
- **はぐりん**: `monetize-os/` 側 wiki に隔離。**本 wiki の frontmatter には登場しない**
- クライアント情報は名義をまたいで cross-link しない（lint で検出）

注: `business/personal/` は BSA 枠外の個人案件（テラ一色民泊 HP 等）を扱う。BSA 提案の Week KPI には含めず、運用上は分離する。

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

### 例外: `raw/publishing/inspirations/` 配下の自動 ingest

このディレクトリに限り、ユーザーの明示指示なしにセッション開始時の自動スキャン + 一括確認による ingest を許可する。標準フロー（ユーザー指示 → ingest）から外れる根拠は、バズ投稿の参考素材を 5 秒で投げ込める運用設計上の必要性（spec §7.4）。

ただし以下を遵守:
- 一括取り込み実行前にユーザー Y/N 確認を必ず取る（自動 commit 禁止）
- 既存ページとの矛盾検出時は「## 異論」併記で SCHEMA 標準フローを維持
- 1 ingest = 1 commit を厳守
- 自動スキャンで取り込み済み判定は `wiki/publishing/log.md` を SSOT とする
- 対象は `raw/publishing/inspirations/` の直下ファイルのみ（サブディレクトリの再帰は適用外）

適用エージェント: `brand-publisher` / `secretary` がセッション開始時にスキャン実行可能。実行手順は `.claude/skills/publishing-wiki-ingest.md` を参照。

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
