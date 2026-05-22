# wiki/SCHEMA.md — wiki 規約 SSOT

このファイルは wiki 操作の唯一の正本。wiki に触れる前に必ず読むこと。
変更は人間承認必須（CLAUDE.md「人間確認ルール」参照）。

## 3 層構造

- `raw/` — 不可侵の素材（記事・案件素材・気づき）。**immutable**: 削除・修正は人間承認必須
  - 例外: `raw/.manifest.json` は LLM 管轄のメタファイル（ingest delta tracking 用）。immutable 規則から除外
- `wiki/` — LLM が新規作成・更新を担う markdown ページ群
  - `wiki/hot.md` — ホットキャッシュ（~500 words の作業文脈サマリ。セッション開始時に最優先で読む）
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
---
```

## ingest プロトコル

1. ユーザーが `raw/` に素材を置く（記事・案件素材・気づき）
2. ユーザーが秘書に「ingest <path>」と指示
3. 秘書が `wiki/SCHEMA.md` / `wiki/hot.md` / `wiki/index.md` を読む
4. **manifest check**: `raw/.manifest.json` を読み、対象ファイルの md5 ハッシュ（`md5 -q <path>` macOS）と比較
   - ハッシュ一致 → 「ingest 済（変更なし）」を報告してスキップ。`force ingest` 指示時のみ続行
   - ハッシュ不一致 or 未記録 → 続行
5. 素材を読み、ユーザーと要点を 1〜2 ターン対話
6. 秘書が wiki に：
   - 該当ページを新規作成 or 既存に統合
   - 関連 entity/concept ページを差分更新（5〜15 page 想定）
   - frontmatter の `related` を貼り直し
   - `index.md` にエントリ追加
   - `log.md` に「## [YYYY-MM-DD] ingest | <title>」append
7. `raw/.manifest.json` を更新（hash / ingested_at / pages_created / pages_updated）
8. `wiki/hot.md` を更新（Recently Touched に反映）
9. git commit（1 ingest = 1 commit、rollback 容易）
10. ユーザーが Obsidian で結果を確認

### URL ingest の defuddle 前処理（任意）

`raw/` に直接素材を置く代わりに URL を渡された場合:

1. `which defuddle 2>/dev/null` で CLI 存在確認
2. ある: `defuddle <url> > raw/articles/<slug>-<YYYY-MM-DD>.md`（広告・nav 剥がし、token 40-60% 削減）
3. ない: WebFetch fallback で取得し同パスに保存
4. 以降は通常 ingest フロー（手順 3-）に合流

詳細: `.claude/skills/defuddle-usage.md`

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

3 つの mode を使い分ける。token 予算を明示してから開始する。

| モード | トリガー | 読む対象 | token 目安 | 用途 |
|---|---|---|---|---|
| **quick** | 「クイック」「短く」 / 単発事実問い合わせ | `wiki/hot.md` のみ | ~500 | 「最近何やった?」「あの案件のステータスは?」 |
| **standard** | デフォルト（明示なし） | `hot.md` + `index.md` + 3-5 ページ | ~3,000 | 大半の質問・依頼 |
| **deep** | 「深く調べて」「全体俯瞰」「synthesis」 | `hot.md` + `index.md` + 関連ページ全部（+ Web 補完） | ~8,000+ | 戦略合成、複数領域横断分析、月次レビュー |

### 手順
1. ユーザーが質問
2. モード判定（明示なければ standard）
3. **quick**: `wiki/hot.md` のみ読む → 答えが取れれば即返答。取れなければ「standard に昇格します」を明示
4. **standard**: `hot.md` → `index.md` → 関連 3-5 ページを読み合成
5. **deep**: 関連ページ全部 + Web 補完。事前に「deep で進めます（コスト大）」と宣言
6. 価値ある合成は filing back（option）。秘書がユーザーに 1 問確認:
   - 後で再利用しそう → `wiki/questions/<topic>.md` として保存（type: topic）
   - その場限りの問い → 保存しない
7. 合成 / filing back 完了後は `wiki/hot.md` を更新（Recently Touched / Open Questions に反映）

### filing back の規約

- 保存先: `wiki/questions/<title>.md`（このディレクトリは初期は空、初回 query filing で自動作成）
- ページ種別: `topic`（既存 4 種に統一、新規 question 種別は作らない）
- 雑談・即時的なやりとりは保存しない（事実情報の自動 raw 保存ルールと同じ哲学）

## ホットキャッシュ（wiki/hot.md）

`wiki/hot.md` は ~500 words の作業文脈サマリ。セッション開始時に LLM が最優先で読む（`index.md` より前）。

### 目的
- セッション間のコンテキスト保持
- 新規セッションが `wiki/index.md` 全読み + 個別ページ巡回をしなくて済む
- token コスト最適化（query quick モードは hot.md だけで完結）

### フォーマット

frontmatter:
```yaml
---
type: meta
title: "Hot Cache"
updated: YYYY-MM-DD
---
```

セクション:
- `## Last Updated` — 日付 + 一行サマリ
- `## Current Focus` — 進行中テーマ 1-3 件
- `## Recently Touched` — 直近 7 件まで（`[[page-name]] (YYYY-MM-DD <更新内容>)`）
- `## Open Questions / Frontiers` — 未解決テーマ
- `## Conventions` — 自己参照（メタ、固定）

### 更新タイミング（必須）
- ingest 完了後（publishing/inspirations の自動 ingest 含む）
- 大きな query 合成完了後
- 戦略変更 commit 後（CLAUDE.md / SCHEMA 改定 等）
- セッション振り返り完了時（`session-retrospective.md` フローに組込）

### 更新ルール
- 500 words 以内厳守。超過したら古い項目を間引く
- 全置換（追記でなく書き換え）
- 文体: declarative present tense

## lint プロトコル

頻度: 月 1（人間トリガー）。重いので自動化しない。

チェック項目:
- 矛盾（A と B のページで食い違う主張）
- 古い記述（新しい source で superseded された主張）
- orphan page（inbound link 0）
- 言及されているが page 化されていない概念
- 不足 cross-reference
- data gap（Web 検索で補えそうな空白）

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
