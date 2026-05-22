# publishing-wiki-ingest — raw/publishing/inspirations/ → wiki/publishing/ 半自動 ingest

## 用途

`brand-publisher` / `secretary` がセッション開始時に raw/publishing/inspirations/ をスキャンし、未取り込みファイルを wiki/publishing/ に整理して反映する半自動 ingest 手順 SSOT。

## SCHEMA 例外規定

このフローは標準 ingest プロトコル（ユーザー指示 → ingest）の例外として `wiki/SCHEMA.md` §ingest プロトコルで承認済み。遵守事項:

- 一括取り込み実行前にユーザー Y/N 確認必須（自動 commit 禁止）
- 既存矛盾は「## 異論」併記で SCHEMA 標準維持
- 1 ingest = 1 commit
- 取り込み済み判定は `wiki/publishing/log.md` を SSOT とする
- 対象は raw/publishing/inspirations/ 直下のみ（再帰なし）

## フロー

### Step 1: セッション開始時の自動スキャン

```bash
# raw 側ファイル一覧
ls raw/publishing/inspirations/*.md 2>/dev/null | grep -v README.md

# 取り込み済み一覧（wiki/publishing/log.md から）
grep "^## \[" wiki/publishing/log.md | grep "ingest"
```

突合して未取り込みファイルを抽出。

### Step 2: ユーザー通知 + Y/N 確認

未取り込みが 0 件 → スキップ。

未取り込みが 1 件以上ある場合:

```
未 ingest が N 件あります:
- raw/publishing/inspirations/<file1>.md
- raw/publishing/inspirations/<file2>.md
- ...

まとめて取り込みますか？（Y / N / 個別選択）
```

ユーザー Y → Step 3 へ。N → スキップ。個別選択 → 選ばれたファイルのみ Step 3。

### Step 3: 各ファイルの ingest 処理

各 raw ファイルについて以下を実行:

#### 3-1. 内容取得

- raw ファイル本文を Read
- URL のみなら WebFetch で本文取得
- スクショ単体なら手動確認をユーザーに依頼（処理スキップ）

#### 3-2. wiki/publishing/inspirations/<id>.md を作成

ファイル名: raw のファイル名と同じ slug を使用（拡張子 .md）

frontmatter:
```yaml
---
type: source
created: <ingest date>
updated: <ingest date>
sources: [raw/publishing/inspirations/<file>.md]
related: [[../buzz-patterns]]
tags: [publishing, <media>, ofmeton]
status: active
---
```

本文構成:
- 元投稿の要点（4-8 行）
- 観察された勝ちパターン（buzz-patterns との対応）
- 自分の発信に応用するなら？（短い提案 2-4 行）

#### 3-3. buzz-patterns.md / by-media / by-theme への反映

| パターン判定 | 操作 |
|---|---|
| 既存パターンと一致 | 該当ページに「## 観測 [YYYY-MM-DD]」セクション追加 |
| 新規パターン | 新規概念ページ作成 or 既存に「## パターン N」追加 |
| 既存と矛盾 | 「## 異論」セクションで両論併記（消さない） |

#### 3-4. wiki/publishing/index.md 更新

新規 source ページ作成時のみ、index の「## inspirations」セクションにエントリ追加（10 件超えたら直近のみリスト化する運用に切り替え検討）。

#### 3-5. wiki/publishing/log.md に entry append

```markdown
## [YYYY-MM-DD] ingest | <title>

- raw: raw/publishing/inspirations/<file>.md
- wiki: wiki/publishing/inspirations/<id>.md
- 反映先: buzz-patterns.md（既存パターン X 観測）/ by-media/<media>.md
- 抽出された学び: 1-2 行
```

### Step 4: 各 ingest を 1 commit にして保存

```bash
git add wiki/publishing/inspirations/<id>.md wiki/publishing/{buzz-patterns,by-media/...,by-theme/...,index,log}.md
git commit -m "ingest(publishing): <title> (<media>)"
```

複数ファイル一括取り込みの場合も、ファイル単位で commit を分割（rollback 容易）。

### Step 5: 完了報告

```
N 件取り込みました:
- buzz-patterns.md に新パターン M 件追加
- 既存パターン K 件に観測追加
- by-media/<media>.md 更新 L 件
```

## 矛盾検出時の扱い

既存ページの主張と矛盾する観測が来た場合:

1. **消さない**（SCHEMA 原則）
2. 既存主張の直下に「## 異論 [YYYY-MM-DD]」サブセクション追加
3. 両論併記し、判断保留
4. lint プロトコルで月次レビュー時にユーザーが採否判断

## エスカレーション

- WebFetch が 5 件以上連続失敗 → 一旦中断、ユーザーに報告
- raw 側のファイル数が 20 件超 → 一括取り込みでなく日付古い順に 5 件ずつに分割提案
- buzz-patterns.md が 20 パターン超 → 二次整理（クラスタリング）をユーザーに提案

## 参照する SCHEMA

- `wiki/SCHEMA.md` §ingest プロトコル §例外規定

## 参照する他スキル

- `.claude/skills/content-quality-rubric.md` — 反映後の rubric 更新候補判定
