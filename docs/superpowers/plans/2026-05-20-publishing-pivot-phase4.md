# 発信ピボット Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 発信ピボット戦略の体制を実装する。新規エージェント 2 体（content-reviewer / visual-designer）・新規スキル 6 本・既存エージェント 3 体（brand-publisher / writer / conversion-designer）の拡張・wiki/publishing/ クラスタ初期化・raw/publishing/inspirations/ 作成・wiki/SCHEMA.md 例外規定追記、まで一気通貫で実装する。

**Architecture:**
6 サブフェーズに分割する（4A 〜 4F）。**4A（SCHEMA 改訂）は人間承認必須**のため最初に独立 commit。4B（wiki/raw 雛形）・4C（スキル 6 本）・4D（新規エージェント 2 体）・4E（既存エージェント拡張 3 体）は各々独立 commit で revert 容易。4F で検証と最終 commit / merge 判断。CLAUDE.md は Phase 1-3 で既に拡張済み（ルーティング表に content-reviewer / visual-designer / note-revenue-playbook 等の参照が入っている）ので、Phase 4 では「言及されている実体ファイル」を作るだけで整合する。

**Tech Stack:** markdown / yaml frontmatter / git / 既存スキル群（scqa-writing-framework / publishing-playbook 等）

**Related:**
- spec: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`（§5・§6.3 Phase 4・§7）
- 先行 plan: `docs/superpowers/plans/2026-05-20-publishing-pivot-phase1-3.md`
- branch: `task/260520-publishing-phase4`

---

## Files Touched Overview

**Phase 4A（SCHEMA 例外規定追記・人間承認必須）:**
- Modify: `wiki/SCHEMA.md`（§ingest プロトコルに例外規定追記）

**Phase 4B（wiki/publishing/ クラスタ + raw/publishing/inspirations/）:**
- Create: `wiki/publishing/index.md`
- Create: `wiki/publishing/log.md`
- Create: `wiki/publishing/buzz-patterns.md`
- Create: `wiki/publishing/by-media/x.md`
- Create: `wiki/publishing/by-media/note.md`
- Create: `wiki/publishing/by-media/instagram.md`
- Create: `wiki/publishing/by-theme/before-after.md`
- Create: `wiki/publishing/by-theme/prompt-collection.md`
- Create: `wiki/publishing/by-theme/hook-patterns.md`
- Create: `wiki/publishing/by-theme/visual-templates.md`
- Create: `wiki/publishing/inspirations/.gitkeep`
- Modify: `wiki/index.md`（publishing クラスタ追記）
- Modify: `wiki/log.md`（Phase 4 ingest entry append）
- Create: `raw/publishing/inspirations/README.md`
- Create: `raw/publishing/inspirations/.gitkeep`

**Phase 4C（新規スキル 6 本）:**
- Create: `.claude/skills/content-quality-rubric.md`
- Create: `.claude/skills/visual-design-system.md`
- Create: `.claude/skills/multi-platform-publishing.md`
- Create: `.claude/skills/non-engineer-translation.md`
- Create: `.claude/skills/note-revenue-playbook.md`
- Create: `.claude/skills/publishing-wiki-ingest.md`

**Phase 4D（新規エージェント 2 体）:**
- Create: `.claude/agents/content-reviewer.md`
- Create: `.claude/agents/visual-designer.md`

**Phase 4E（既存エージェント拡張）:**
- Modify: `.claude/agents/business-ops/brand-publisher.md`
- Modify: `.claude/agents/learning-creative/writer.md`
- Modify: `.claude/agents/conversion-designer.md`

**Phase 4F（検証 + 最終 commit / merge 判断）:**
- 検証コマンド一式（grep / ls / wc / yaml syntax）
- final commit（必要なら）
- session 終了処理（merge / PR / push 判断）

---

## Phase 4A: SCHEMA 例外規定追記（人間承認必須）

> **重要**: `wiki/SCHEMA.md` は人間承認必須事項。エージェントは Step 1-2 を完了したら**ユーザーに承認を取ってから** Step 3（commit）に進む。

### Task 4A.1: SCHEMA.md の改訂箇所を確認

- [ ] **Step 1: §ingest プロトコル現状を読む**

Run: `sed -n '52,70p' wiki/SCHEMA.md`
Expected: §ingest プロトコル 1-7 と「重要原則」が表示される

- [ ] **Step 2: 改訂内容のドラフトをユーザーに提示**

ユーザーに以下を提示して承認を取る:

> ```
> ## ingest プロトコル
>
> （既存 1-7 はそのまま）
>
> **例外: `raw/publishing/inspirations/` 配下の自動 ingest**
>
> このディレクトリに限り、ユーザーの明示指示なしにセッション開始時の自動スキャン + 一括確認による ingest を許可する。標準フロー（ユーザー指示 → ingest）から外れる根拠は、バズ投稿の参考素材を 5 秒で投げ込める運用設計上の必要性。
>
> ただし以下を遵守:
> - 一括取り込み実行前にユーザー Y/N 確認を必ず取る（自動 commit 禁止）
> - 既存ページとの矛盾検出時は「## 異論」併記で SCHEMA 標準フローを維持
> - 1 ingest = 1 commit を厳守
> - 自動スキャンで取り込み済み判定は `wiki/publishing/log.md` を SSOT とする
> - 対象は `raw/publishing/inspirations/` の直下ファイルのみ（サブディレクトリの再帰は適用外）
>
> 適用エージェント: `brand-publisher` / `secretary` がセッション開始時にスキャン実行可能。実行手順は `.claude/skills/publishing-wiki-ingest.md` を参照。
> ```

ユーザー承認待ち。「OK」「承認」等が返るまで Step 3 に進まない。

### Task 4A.2: SCHEMA.md を編集

- [ ] **Step 1: SCHEMA.md の「重要原則」の直後に例外規定を挿入**

Edit `wiki/SCHEMA.md`:

old_string:
```
**重要原則**:
- 一度に 1 件（複数の raw を一括処理しない）
- `index.md` を毎回起点にして重複ページ作成を防ぐ
- 既存ページに矛盾する情報が来たら、新情報側を残しつつ「## 異論」セクションで旧主張を保存（**消さない**）

## query プロトコル
```

new_string:
```
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
```

- [ ] **Step 2: 変更箇所を確認**

Run: `grep -n "raw/publishing/inspirations" wiki/SCHEMA.md`
Expected: 例外規定の見出し直後の本文に 3-4 件マッチ

### Task 4A.3: Phase 4A commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s wiki/SCHEMA.md`
Expected: ` M wiki/SCHEMA.md`

- [ ] **Step 2: diff 確認**

Run: `git diff wiki/SCHEMA.md | head -50`
Expected: §ingest プロトコル直後に例外規定が挿入されている diff

- [ ] **Step 3: stage + commit**

Run:
```bash
git add wiki/SCHEMA.md
git commit -m "$(cat <<'EOF'
docs(wiki): SCHEMA に raw/publishing/inspirations/ 自動 ingest 例外規定を追加

§ingest プロトコルに「例外: `raw/publishing/inspirations/` 配下の自動 ingest」セクションを追加。標準フロー（ユーザー指示 → ingest）から外れる根拠は、バズ投稿参考素材を 5 秒で投げ込める運用設計上の必要性（spec §7.4）。

遵守事項:
- 一括取り込み実行前にユーザー Y/N 確認必須
- 既存矛盾は「## 異論」併記
- 1 ingest = 1 commit
- 取り込み済み判定は wiki/publishing/log.md が SSOT
- 対象は raw/publishing/inspirations/ 直下のみ（再帰なし）

適用エージェント: brand-publisher / secretary
実行手順: .claude/skills/publishing-wiki-ingest.md

参照: spec docs/superpowers/specs/2026-05-20-publishing-pivot-design.md §7.7

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功

---

## Phase 4B: wiki/publishing/ クラスタ初期化 + raw/publishing/inspirations/

### Task 4B.1: ディレクトリ作成

- [ ] **Step 1: wiki / raw 双方のディレクトリを作成**

Run:
```bash
mkdir -p wiki/publishing/by-media
mkdir -p wiki/publishing/by-theme
mkdir -p wiki/publishing/inspirations
mkdir -p raw/publishing/inspirations
ls -la wiki/publishing/ raw/publishing/
```

Expected: 各ディレクトリが空で作成されている

### Task 4B.2: wiki/publishing/index.md 作成

- [ ] **Step 1: index.md を作成**

Write `wiki/publishing/index.md`:

```markdown
---
type: topic
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../index]]
tags: [publishing, ofmeton]
status: active
identity: ofmeton
---

# wiki/publishing/ Index

> ofmeton 名義の発信戦略（X / Instagram / note）の知識ベース。raw/publishing/inspirations/ からの ingest と lint で育てる。

## 全体

- [buzz-patterns](buzz-patterns.md) — 媒体横断のバズパターン SSOT（lint で育てる）
- [log](log.md) — ingest / lint 履歴（時系列 append-only）

## by-media（媒体特化の学び）

- [x](by-media/x.md) — X 特化（拡散・認知 → note 送客）
- [note](by-media/note.md) — note 特化（収益化・深掘り）
- [instagram](by-media/instagram.md) — Instagram 特化（ブランド構築・保存型認知）

## by-theme（テーマ特化の学び）

- [before-after](by-theme/before-after.md) — Before-After 型の学び
- [prompt-collection](by-theme/prompt-collection.md) — プロンプト集型の学び
- [hook-patterns](by-theme/hook-patterns.md) — フック 1 行目パターン集
- [visual-templates](by-theme/visual-templates.md) — 視覚デザインの参考集

## inspirations（個別バズ投稿の source 記録）

- 直下に `<media>-<YYYY-MM-DD>-<slug>.md` 形式で source 型ページ。
- raw/publishing/inspirations/ から ingest した個別投稿のスナップショット + 抽出された学び。
- 100 件超えたら二次的整理を検討（spec §7.8）。
```

- [ ] **Step 2: 内容確認**

Run: `head -30 wiki/publishing/index.md`
Expected: frontmatter と by-media / by-theme の見出しが表示される

### Task 4B.3: wiki/publishing/log.md 作成

- [ ] **Step 1: log.md を作成**

Write `wiki/publishing/log.md`:

```markdown
---
type: topic
created: 2026-05-20
updated: 2026-05-20
sources: []
related: [[index]]
tags: [publishing, log]
status: active
identity: ofmeton
---

# wiki/publishing/ Log

> 時系列 append-only。`grep "^## \[" log.md | tail -10` で直近 10 イベントが見える形式。

## [2026-05-20] phase | Phase 4 初期化

- wiki/publishing/ クラスタ作成
- spec §3（リサーチ要点）を seed として buzz-patterns / by-media / by-theme に注入
- 以降の自動 ingest は raw/publishing/inspirations/ → 本 log にエントリ追加
```

### Task 4B.4: wiki/publishing/buzz-patterns.md 作成（spec §3 を seed として注入）

- [ ] **Step 1: buzz-patterns.md を作成**

Write `wiki/publishing/buzz-patterns.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[by-media/x]], [[by-media/note]], [[by-media/instagram]], [[by-theme/before-after]], [[by-theme/hook-patterns]]
tags: [publishing, buzz-patterns, ofmeton]
status: active
identity: ofmeton
---

# Buzz Patterns — 媒体横断バズパターン SSOT

> spec §3「リサーチ要点」を seed としてここに集約。以降は raw/publishing/inspirations/ からの ingest で育てる。

## パターン 1: 数字 + 業務名のフック

業務時間短縮や効率化の「数字」を 1 行目に置く。

例:
- 「請求書作成、3時間 → 5分にした」
- 「行政書士の見積書作成を Claude で 70% 圧縮した」

採用率: 高（X / Instagram カルーセル 1 枚目）

## パターン 2: Before-After 画像（左右 or 上下）

実物のスクショ・成果物の Before-After を画像で見せる。

要件:
- スクショは 8px 角丸 + ドロップシャドウ
- 矢印 or 「→」記号で視線誘導
- 数字（時間 / 文字数 / 工数）を必ず添える

採用媒体: X（1200×675）/ Instagram（1080×1350、カルーセル 1 枚目）

## パターン 3: プロンプト集型（コピペで即使える）

「コピペで使える Claude プロンプト 5 選」のような型。

要件:
- 即時実用性（読了後そのまま試せる）
- 各プロンプトに「想定アウトプット」を 1 行付ける
- 5-10 個のセット感

採用媒体: note / Instagram カルーセル / X スレッド

## パターン 4: 失敗談先行型

「最初こうやって失敗した → こう変えたら動いた」の構造。

要件:
- 失敗の具体性（コード or プロンプトの実物）
- 失敗 → 変更 → 改善後の 3 段構成
- 「同じ失敗を読者がしなくて済む」効用

採用媒体: note 本文 / X スレッド

## パターン 5: 業務 × ツール名の組み合わせ

「freee MCP + Claude で月次〆を自動化」のような、業務 × 具体ツール名の組み合わせ。

要件:
- 業務名は読者が自分事化できる粒度（中小工務店の見積書、行政書士の事業計画書 等）
- ツール名は固有名詞で具体（"AI" でなく "Claude" "freee MCP"）

採用媒体: 全媒体

## パターン 6: 視覚デザインのフォントワーク

太字（Noto Sans Heavy 等）+ アクセント色（黄色 #FFD400）の見出しで視線を奪う。

要件:
- 背景: 黒 #0A0A0A or 濃紺 #0B1B3A or 朱赤 #C23A2C
- フォント: Noto Sans Heavy
- アクセント: 黄色 #FFD400（ハイライト・矢印・強調のみ）

採用媒体: Instagram カルーセル / X サムネ

---

## 異論セクション

> 既存パターンと矛盾する観測が来たら、ここに「## 異論」サブセクションを追加して両論併記する（SCHEMA 準拠で消さない）。

（現在なし）
```

### Task 4B.5: wiki/publishing/by-media/ 3 ページ作成

- [ ] **Step 1: by-media/x.md を作成**

Write `wiki/publishing/by-media/x.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-theme/hook-patterns]]
tags: [publishing, x, ofmeton]
status: active
identity: ofmeton
---

# X — 拡散・認知 → note 送客

## 役割

- 拡散・認知ピボット。note への送客が主目的
- 単発投稿 + Before-After 画像 + 数値見出しの組み合わせ
- テキストのみの単発投稿はリプ用に限定（フォロワー獲得には画像必須）

## 勝ちパターン（seed: spec §3.2）

- フック 1 行目に「数字 / Before-After / 結論先出し / 【】記号 / 問いかけ」
- 画像比率 1200×675 or 1080×1080
- スレッドは 4-7 件、最終投稿に note へのリンク
- リプライ engagement 重視（48h 以内に反応に返信）

## 媒体特化の禁忌

- リンク貼って終わりの単発投稿（ALG 評価下がる）
- 引用 RT で煽る運用
- AI 表記の隠蔽（透明性 NG）

## KPI（Phase 別）

| Phase | 期間 | フォロワー | 月インプレッション目安 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 500 | 30,000 |
| Phase 2 | 〜2026-10末 | 2,000 | 200,000 |
| Phase 3 | 〜2027-02末 | 5,000 | 500,000 |
```

- [ ] **Step 2: by-media/note.md を作成**

Write `wiki/publishing/by-media/note.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-theme/prompt-collection]]
tags: [publishing, note, ofmeton]
status: active
identity: ofmeton
---

# note — 収益化・深掘り → 上位事業へのリード

## 役割

- 収益化ピボット。深掘り記事で読者を「上位事業（AI 自動化代行）」のリードに育てる
- 無料記事 3-5 本 + 有料記事 1 本/月（500-980 円）
- 画像リッチ度: 1 スクロール（≈600px）あたり最低 1 枚

## 勝ちパターン（seed: spec §3.1）

- SCQA + 失敗談先行型構造（「困りごと → 失敗 → 疑問 → 解決策」が冒頭 500 字以内）
- プロンプト集型（コピペ即使える）
- 業務 × ツール名の組み合わせタイトル
- 序盤無料 → 終盤有料（「なるほど」→「これで動ける」の境目で線引き）

## 媒体特化の禁忌

- AI っぽい定型表現（「〜について解説します」「重要なポイントは 3 つあります」等は content-quality-rubric で機械検出）
- 画像なし長文（テキストオンリーは読了率激落ち）
- 専門用語の濫用（LLM / RAG / Embedding 等は注釈付きで）

## 収益化モデル

詳細は `.claude/skills/note-revenue-playbook.md`。

## KPI（Phase 別）

| Phase | 期間 | 月売上 | 有料記事本数累積 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 3万円 | 3 |
| Phase 2 | 〜2026-10末 | 5万円 | 6 |
| Phase 3 | 〜2027-02末 | 10万円相当 | 10+ |
```

- [ ] **Step 3: by-media/instagram.md を作成**

Write `wiki/publishing/by-media/instagram.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-theme/visual-templates]]
tags: [publishing, instagram, ofmeton]
status: active
identity: ofmeton
---

# Instagram — ブランド構築・保存型認知 → note + プロフ送客

## 役割

- ブランド構築・保存型認知ピボット
- カルーセル 9 枚 / リール補助
- プロフィール → note への送客動線（リンクツリー or 直リンク）

## 勝ちパターン（seed: spec §3.3）

- カルーセル 1 枚目に「数字 + 業務名」の強フック
- 全枚に視覚要素必須（テキストオンリー枚 NG）
- 9 枚目に CTA（「保存」「プロフ → note」）
- 背景 3 色 + 黄色アクセント + Noto Sans Heavy のデザインシステム遵守

## 媒体特化の禁忌

- カルーセル枚数 5 枚以下（保存率落ちる）
- フォントの混在（Noto Sans Heavy 固定）
- アクセント色の濫用（黄色 #FFD400 はハイライトのみ）

## カルーセル比率

- 1080 × 1350px（縦長）
- 文字サイズ最小: タイトル 96px / 本文 56px（スマホ視認性）

## KPI（Phase 別）

| Phase | 期間 | フォロワー | 月リーチ目安 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 300 | 5,000 |
| Phase 2 | 〜2026-10末 | 1,000 | 30,000 |
| Phase 3 | 〜2027-02末 | 3,000 | 100,000 |
```

### Task 4B.6: wiki/publishing/by-theme/ 4 ページ作成

- [ ] **Step 1: by-theme/before-after.md**

Write `wiki/publishing/by-theme/before-after.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]]
tags: [publishing, before-after, ofmeton]
status: active
identity: ofmeton
---

# Before-After 型の学び

## 構造

- 左右 or 上下に並べ、視線誘導の矢印 or「→」記号
- 数字（時間 / 文字数 / 工数）を必ず添える
- 実物スクショ（8px 角丸 + ドロップシャドウ）

## 使い分け

| 媒体 | 形式 | 比率 |
|---|---|---|
| X | 単発画像 | 1200×675 横長 |
| Instagram カルーセル | 1 枚目 + 比較枚 | 1080×1350 縦長 |
| note | 記事冒頭の図解 | 横長 800×450 推奨 |

## チェックリスト

- [ ] Before と After が同一フレーミング（背景・角度・拡大率）
- [ ] 数字が大きく目立つ（タイトル並みのサイズ）
- [ ] 矢印 or「→」記号で視線誘導
- [ ] スクショの個人情報マスク
```

- [ ] **Step 2: by-theme/prompt-collection.md**

Write `wiki/publishing/by-theme/prompt-collection.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-media/note]]
tags: [publishing, prompt-collection, ofmeton]
status: active
identity: ofmeton
---

# プロンプト集型の学び

## 構造

- 5-10 個のセット感（「3 選」は弱い、「7 選」「10 選」が強い）
- 各プロンプトに「想定アウトプット」を 1 行付ける
- コピペ可能なコードブロック形式

## テンプレ

```
## プロンプト N: 〜を〜に変換する

**想定アウトプット**: （1 行で何ができるか）

\`\`\`
（プロンプト本文）
\`\`\`

**使い方**: （1-2 行）
```

## 媒体別の出し方

- note: 1 記事に 5-10 個まとめる（有料化候補）
- Instagram カルーセル: 1 枚 1 プロンプト
- X スレッド: 1 投稿 1 プロンプト、最終投稿に note リンク

## チェックリスト

- [ ] 即時実用性（読了後そのまま試せる）
- [ ] 想定アウトプットが明示されている
- [ ] 5 個以上のセット
- [ ] 業務名で索引できる（行政書士 / 中小工務店 / 飲食店 等）
```

- [ ] **Step 3: by-theme/hook-patterns.md**

Write `wiki/publishing/by-theme/hook-patterns.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-media/x]]
tags: [publishing, hook-patterns, ofmeton]
status: active
identity: ofmeton
---

# フック 1 行目パターン集

## パターン群

| # | パターン | 例 |
|---|---|---|
| 1 | 数字 + 業務 | 「請求書作成、3 時間 → 5 分にした」 |
| 2 | Before-After 宣言 | 「Claude 導入前後で月次〆の工数が 70% 減った」 |
| 3 | 結論先出し | 「結論: 行政書士の見積書テンプレは Claude に作らせるが正解」 |
| 4 | 【】記号 | 「【保存版】中小工務店向け Claude プロンプト 10 選」 |
| 5 | 問いかけ | 「freee の仕訳、まだ手入力してる？」 |
| 6 | 業務 + ツール名 | 「freee MCP × Claude で月次〆が 1 コマンドになった」 |
| 7 | 失敗談先行 | 「Claude に丸投げしたら炎上した。原因と対策」 |

## 媒体別優先パターン

| 媒体 | 1st choice | 2nd choice |
|---|---|---|
| X 1 行目 | 1（数字 + 業務） | 5（問いかけ） |
| note タイトル | 4（【】記号） | 6（業務 + ツール名） |
| Instagram カルーセル 1 枚目 | 1（数字 + 業務） | 2（Before-After 宣言） |

## 禁忌

- 「いかがでしょうか」「ぜひお試しください」等の定型挨拶
- 「〜について解説します」「重要なポイントは 3 つあります」
- 自己アピール先行（「私が見つけた最強の〜」等）

## チェック

`content-quality-rubric.md` の「AI 感ゼロチェック」NG 表現リストを併用。
```

- [ ] **Step 4: by-theme/visual-templates.md**

Write `wiki/publishing/by-theme/visual-templates.md`:

```markdown
---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-media/instagram]]
tags: [publishing, visual-templates, ofmeton]
status: active
identity: ofmeton
---

# 視覚デザインの参考集

## デザインシステム（SSOT は `.claude/skills/visual-design-system.md`）

- フォント: Noto Sans Heavy
- 背景 3 色: 黒 #0A0A0A / 濃紺 #0B1B3A / 朱赤 #C23A2C
- アクセント: 黄色 #FFD400（ハイライト・矢印・強調のみ）
- スクショ装飾: 8px 角丸 + ドロップシャドウ

## 比率

| 用途 | 比率 |
|---|---|
| X 画像 | 1200×675 横長 or 1080×1080 正方形 |
| Instagram カルーセル | 1080×1350 縦長 |
| note 図解 | 800×450 横長 |
| note サムネ | 1280×670（note 公式推奨） |

## カルーセル 9 枚の標準構成

| 枚 | 役割 |
|---|---|
| 1 | 強フック（数字 + 業務 / Before-After 宣言） |
| 2-3 | 困りごと提示（失敗例や非効率の具体） |
| 4-7 | 解決策の段階展開（プロンプト・ステップ・図解） |
| 8 | Before-After 比較 or 結論まとめ |
| 9 | CTA（保存 / プロフ → note リンク） |

## 参考にしたい外部アカウント（ingest 候補）

- raw/publishing/inspirations/ に投げ込まれた素材を ingest 後、ここに採用テンプレを蓄積
- 参考事例の出所は `inspirations/<id>.md` への back-link で辿れるように
```

### Task 4B.7: wiki/publishing/inspirations/ プレースホルダ

- [ ] **Step 1: .gitkeep を作成**

Write `wiki/publishing/inspirations/.gitkeep`:

```
# wiki/publishing/inspirations/

個別バズ投稿の source 型ページの置き場。
ingest フロー: raw/publishing/inspirations/<file>.md → 本ディレクトリ <id>.md

frontmatter:
- type: source
- identity: ofmeton
- sources: [raw/publishing/inspirations/<file>.md]
```

### Task 4B.8: raw/publishing/inspirations/ + README

- [ ] **Step 1: raw 側 README を作成**

Write `raw/publishing/inspirations/README.md`:

```markdown
# raw/publishing/inspirations/

ユーザーが見つけたバズ投稿・参考にしたい投稿の置き場（5 秒で投げ込める設計）。

## ファイル名規約

`<media>-<YYYY-MM-DD>-<slug>.md`

例:
- `x-20260520-chaen-bazz-prompt-thread.md`
- `note-20260520-keito-claude-tips.md`
- `instagram-20260521-abe-carousel-fontwork.md`
- `meta-20260522-fladdict-fukuya-comment.md`（媒体不問の知見メモは media=meta）

## 中身の自由度

以下のいずれでも OK（フォーマット縛りは弱く、ingest 側で吸収する）:
- URL 1 行だけ
- 本文の貼り付け
- スクショ + 自分の気づきメモ
- 「これ参考にして」の一言

## ingest フロー

セッション開始時に brand-publisher / secretary が自動スキャン → 未取り込みあれば一括確認 → ユーザー Y で wiki/publishing/ に整理して反映。

詳細: `.claude/skills/publishing-wiki-ingest.md`
SCHEMA 例外規定: `wiki/SCHEMA.md` §ingest プロトコル
```

- [ ] **Step 2: .gitkeep**

Write `raw/publishing/inspirations/.gitkeep`:

```
（このディレクトリは raw 素材の置き場。.gitkeep は空ディレクトリ追跡用）
```

### Task 4B.9: wiki/index.md に publishing クラスタを追記

- [ ] **Step 1: wiki/index.md の現状を読む**

Run: `cat wiki/index.md`
Expected: business / domain 等の既存クラスタが表示される

- [ ] **Step 2: publishing クラスタセクションを追記**

Edit `wiki/index.md`:

末尾（最後のクラスタの後）に以下を append:

```markdown

## publishing

- [index](publishing/index.md) — ofmeton 名義の発信戦略（X / Instagram / note）目次
- [buzz-patterns](publishing/buzz-patterns.md) — 媒体横断のバズパターン SSOT（lint で育てる）
- [by-media/x](publishing/by-media/x.md) — X 特化の学び
- [by-media/note](publishing/by-media/note.md) — note 特化の学び
- [by-media/instagram](publishing/by-media/instagram.md) — Instagram 特化の学び
- [by-theme/before-after](publishing/by-theme/before-after.md) — Before-After 型の学び
- [by-theme/prompt-collection](publishing/by-theme/prompt-collection.md) — プロンプト集型の学び
- [by-theme/hook-patterns](publishing/by-theme/hook-patterns.md) — フック 1 行目パターン集
- [by-theme/visual-templates](publishing/by-theme/visual-templates.md) — 視覚デザインの参考集
```

挿入位置の選択は既存クラスタ並び（business / domain / external / ibasho / people / self の後）に合わせて末尾に置く。

- [ ] **Step 3: 追記後の確認**

Run: `grep -n "^## publishing" wiki/index.md`
Expected: 1 件マッチ

### Task 4B.10: wiki/log.md に Phase 4 entry を append

- [ ] **Step 1: 末尾追記**

`wiki/log.md` の末尾に以下を append:

```markdown

## [2026-05-20] phase | Phase 4 publishing クラスタ初期化

- 新規クラスタ wiki/publishing/ を作成（index / log / buzz-patterns / by-media×3 / by-theme×4 / inspirations プレースホルダ）
- spec §3 リサーチ要点を buzz-patterns / by-media / by-theme に seed として注入
- raw/publishing/inspirations/ ディレクトリと README を作成
- SCHEMA 例外規定（自動 ingest 許可）追記済み（前 commit）

参照: docs/superpowers/plans/2026-05-20-publishing-pivot-phase4.md Phase 4B
```

### Task 4B.11: Phase 4B commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s | grep -E "wiki/publishing|raw/publishing|wiki/index|wiki/log"`
Expected: 13-15 件（new ファイル + index/log の modified）

- [ ] **Step 2: stage**

Run:
```bash
git add wiki/publishing/ raw/publishing/ wiki/index.md wiki/log.md
git status -s | head -20
```

Expected: A（add）/ M（modify）行が確認できる

- [ ] **Step 3: commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(wiki): Phase 4B wiki/publishing/ クラスタ初期化 + raw/publishing/inspirations/

新規クラスタ wiki/publishing/:
- index / log / buzz-patterns
- by-media/{x,note,instagram}
- by-theme/{before-after,prompt-collection,hook-patterns,visual-templates}
- inspirations/ プレースホルダ

spec §3 リサーチ要点を buzz-patterns / by-media / by-theme に seed として注入。
全 frontmatter は identity: ofmeton で統一。

raw/publishing/inspirations/:
- README.md（投入ガイド：ファイル名規約・中身の自由度・ingest フロー）
- .gitkeep

wiki/index.md に publishing クラスタを追記、wiki/log.md に Phase 4 phase entry を append。

参照: docs/superpowers/specs/2026-05-20-publishing-pivot-design.md §7

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功

---

## Phase 4C: 新規スキル 6 本作成

### Task 4C.1: content-quality-rubric.md（content-reviewer の rubric SSOT）

- [ ] **Step 1: skill ファイル作成**

Write `.claude/skills/content-quality-rubric.md`:

```markdown
# content-quality-rubric — コンテンツ品質 rubric SSOT

## 用途

`content-reviewer` agent が X / Instagram / note の全コンテンツを公開前にチェックする際の rubric SSOT。

公開前必須レビューで、1 つでも NG が出たら差し戻し。

## rubric チェック項目（全 7 軸）

### 1. AI 感ゼロチェック

**NG 表現リスト**（機械検出）:
- 「〜について解説します」
- 「重要なポイントは 3 つあります」
- 「結論から言うと」
- 「いかがでしょうか」
- 「ご興味があれば」
- 「〜と言えるでしょう」
- 「ぜひお試しください」
- 「皆さんは〜したことはありますか」
- 「本記事では〜について」

判定: 1 つでも出たら NG → 差し戻し。

### 2. 画像リッチ度

| 媒体 | 最低基準 |
|---|---|
| note | 1 スクロール（≈600px）あたり最低 1 枚 |
| Instagram | カルーセル全枚に視覚要素必須（テキストオンリー枚 NG） |
| X | 投稿に画像 / 動画必須（テキストのみ単発はリプ用に留める） |

### 3. 専門用語密度

LLM / RAG / Embedding / API / LoRA / Fine-tuning 等の専門用語が**非注釈で 5 回以上**出たら NG。

修正方針: 出る場合は「（〜のことです）」で短く注釈を加える。

### 4. 構造（SCQA 準拠）

- Situation → Complication → Question → Answer の構造
- 「読者の困りごと → 失敗例 → 疑問 → 解決策」が**冒頭 500 字以内**に揃う

参照: `.claude/skills/scqa-writing-framework.md`

### 5. バズ要素

フック 1 行目に以下のいずれかが入っているか:
- 数字
- Before-After
- 結論先出し
- 【】記号
- 問いかけ

参照: `wiki/publishing/by-theme/hook-patterns.md`

### 6. ターゲット明示

業務名 + 対象職種が**冒頭 500 字に出る**か:
- 例: 「行政書士の見積書」「中小工務店の提案資料」「飲食店のシフト表」

抽象的な「ビジネスマン」「中小企業」だけだと NG。

### 7. AI 使用透明性

AI を使った箇所と手修正した箇所が明示されているか:
- 例: 「ここは Claude 生成、ここは加筆」「プロンプト本文を貼った下に『→ 出力後、自分で 30% 書き直し』」

隠蔽 NG、誇大 NG。自然な範囲で言及。

## レビュー出力フォーマット

```
## レビュー結果: <媒体> <タイトル>

### 7 軸チェック
| # | 軸 | 判定 | 指摘 |
|---|---|---|---|
| 1 | AI 感ゼロ | ✅ / ❌ | （NG 表現あれば該当箇所） |
| 2 | 画像リッチ度 | ✅ / ❌ | （不足箇所） |
| 3 | 専門用語密度 | ✅ / ❌ | （該当用語と回数） |
| 4 | 構造（SCQA） | ✅ / ❌ | （崩れている段） |
| 5 | バズ要素 | ✅ / ❌ | （フック 1 行目の評価） |
| 6 | ターゲット明示 | ✅ / ❌ | （業務名 + 職種の有無） |
| 7 | AI 透明性 | ✅ / ❌ | （該当箇所） |

### 総合判定
- ✅ 全 7 軸クリア → 公開可
- ❌ 1 つでも NG → 差し戻し（修正点を箇条書きで返す）

### 修正提案
（NG ある場合のみ、具体的な書き換え案）
```

## 参照する wiki

- `wiki/publishing/buzz-patterns.md` — rubric の根拠
- `wiki/publishing/by-media/*` — 媒体別の禁忌・KPI
- `wiki/publishing/by-theme/hook-patterns.md` — フックパターン

## rubric 更新ルール

buzz-patterns.md の蓄積で新パターンが安定したら、`content-reviewer` がユーザーに「rubric に追加する？」を月次提案。承認後、本ファイルを更新。
```

### Task 4C.2: visual-design-system.md

- [ ] **Step 1: skill ファイル作成**

Write `.claude/skills/visual-design-system.md`:

```markdown
# visual-design-system — 発信用ビジュアルデザインシステム SSOT

## 用途

`visual-designer` agent が note 図解 / Instagram カルーセル / X サムネを一貫設計する際のデザインシステム SSOT。

## カラー

| 用途 | 色 | hex |
|---|---|---|
| 背景 1 | 黒 | #0A0A0A |
| 背景 2 | 濃紺 | #0B1B3A |
| 背景 3 | 朱赤 | #C23A2C |
| 文字（背景 1/2 上） | 白 | #FFFFFF |
| 文字（背景 3 上） | 白 or 黒 | コントラスト次第 |
| アクセント | 黄色 | #FFD400（ハイライト・矢印・強調のみ） |

**禁忌**: アクセント色を「本文の通常文字」に使わない。視線誘導でしか使わない。

## フォント

- Noto Sans Heavy（日本語見出し）
- 英数字は same family の Heavy
- 混在 NG（他フォントを足さない）

## 比率

| 用途 | 比率 |
|---|---|
| Instagram カルーセル | 1080 × 1350px（縦長） |
| Instagram 正方形 | 1080 × 1080px |
| X 画像 | 1200 × 675px（横長） |
| X 正方形 | 1080 × 1080px |
| note 図解 | 800 × 450px（横長） |
| note サムネ | 1280 × 670px |

## スクショの装飾

- 角丸: 8px
- ドロップシャドウ: 0 8px 24px rgba(0,0,0,0.25)
- 個人情報マスク必須

## カルーセル 9 枚の標準構成

| 枚 | 役割 | デザイン要件 |
|---|---|---|
| 1 | 強フック | 数字 / Before-After 宣言。背景 1 or 2。タイトル文字最大 |
| 2-3 | 困りごと | 失敗例の具体スクショ + 短文 |
| 4-7 | 解決策段階展開 | プロンプト・ステップ・図解 |
| 8 | Before-After 比較 or まとめ | 数字を大きく |
| 9 | CTA | 「保存」「プロフ → note リンク」 |

## 文字サイズ最小値（スマホ視認性）

| 要素 | 最小サイズ |
|---|---|
| タイトル | 96px |
| 本文 | 56px |
| 注釈 | 40px |

## 生成手順

1. **素材生成**: Codex MCP の gpt-image-2 で素材生成 or Figma テンプレ
   - プロンプトは「要件定義粒度」（feedback_image_prompt_granularity 準拠）
   - ピクセル指定・装飾語彙は含めない
2. **配置調整**: Figma で配置調整（テンプレ化済みファイル使用）
3. **書き出し**: PNG / WebP（媒体推奨形式に従う）

## チェックリスト

- [ ] カラー 4 色以外を使っていないか
- [ ] Noto Sans Heavy 以外のフォントを混ぜていないか
- [ ] アクセント色を本文文字に使っていないか
- [ ] 比率が媒体推奨と一致しているか
- [ ] 文字サイズが最小値を下回っていないか
- [ ] スクショの個人情報マスクが入っているか

## 参照する wiki

- `wiki/publishing/by-theme/visual-templates.md` — 参考事例の蓄積

## 参照する他スキル

- `frontend-design:frontend-design`（プラグイン）— Web UI 制作時の共通参照
```

### Task 4C.3: multi-platform-publishing.md

- [ ] **Step 1: skill ファイル作成**

Write `.claude/skills/multi-platform-publishing.md`:

```markdown
# multi-platform-publishing — 3 媒体役割分担・連動運用手順

## 用途

`brand-publisher` agent が X / Instagram / note の 3 媒体を統括運用する際の連動手順 SSOT。

## 3 媒体の役割分担

| 媒体 | 役割 | 主要フォーマット |
|---|---|---|
| **X** | 拡散・認知 → note 送客 | 単発投稿 + Before-After 画像 + 数値見出し |
| **Instagram** | ブランド構築・保存型認知 → note + プロフ送客 | カルーセル 9 枚 / リール補助 |
| **note** | 収益化・深掘り → 上位事業へのリード | 無料 3-5 本/月 + 有料 1 本/月（500-980 円） |

## 1 トピックの 3 媒体展開フロー

```
[トピック決定]
   業務名 + ツール名（例: 行政書士の見積書 × Claude）
        ↓
[note 本記事執筆]
   SCQA 構造、3000-5000 字、画像 5-8 枚、コードブロック 3-5 個
   writer agent + scqa-writing-framework
        ↓
[Instagram カルーセル化]
   note 本記事 → 9 枚カルーセルに圧縮
   visual-designer + visual-design-system
        ↓
[X 単発化 + スレッド化]
   - 単発: カルーセル 1 枚目を 1200×675 に変換
   - スレッド: note の節を 4-7 投稿に圧縮、最終投稿で note リンク
        ↓
[投稿スケジューリング]
   X 即日 → Instagram 翌日 → note 翌々日 の順、もしくは note 公開後に X / IG で告知
        ↓
[content-reviewer レビュー]
   3 媒体全てで rubric 通過
        ↓
[公開]
   人間確認必須（spec §4.2）
```

## 媒体間のリンク設計

- X → note: スレッド最終投稿でリンク（短縮 URL NG、生 URL）
- Instagram → note: プロフィール固定リンク or リンクツリー
- note 本記事 → 別 note: 関連記事リンク（読者の回遊）

## 投稿頻度（Phase 別目標）

| Phase | X | Instagram | note 無料 | note 有料 |
|---|---|---|---|---|
| Phase 1 | 週 5 投稿 | 週 2 カルーセル | 月 3 本 | 月 1 本 |
| Phase 2 | 週 7 投稿 | 週 3 カルーセル | 月 4 本 | 月 1 本 |
| Phase 3 | 週 10 投稿 | 週 4 カルーセル | 月 5 本 | 月 1-2 本 |

## 名義の徹底

- 全媒体で **ofmeton** 名義固定
- 本名（工藤陸）・ペルソナ（はぐりん）は本媒体に登場させない
- 「BSA 工藤陸」名義は archived

## エスカレーション条件

- KPI が Phase 計画の 50% を下回って 2 ヶ月連続 → strategic-advisor に相談
- 媒体間の整合性破綻（同じトピックで矛盾発言）→ 即修正

## 参照する wiki

- `wiki/publishing/by-media/*` — 媒体別の勝ちパターン
- `wiki/publishing/by-theme/*` — テーマ別の構造
- `wiki/publishing/buzz-patterns.md` — 横断パターン

## 参照する他スキル

- `.claude/skills/publishing-playbook.md` — 既存の発信プレイブック
- `.claude/skills/content-quality-rubric.md` — 公開前レビュー
- `.claude/skills/visual-design-system.md` — ビジュアル設計
- `.claude/skills/note-revenue-playbook.md` — note 収益化
```

### Task 4C.4: non-engineer-translation.md

- [ ] **Step 1: skill ファイル作成**

Write `.claude/skills/non-engineer-translation.md`:

```markdown
# non-engineer-translation — 非エンジニア向け翻訳の言語ルール

## 用途

`writer` agent が「非エンジニア向け Claude 活用記事」を執筆する際の言語ルール SSOT。

エンジニア用語をそのまま使わず、非エンジニア（中小事業者・士業・コンサル）が「自分の業務」に紐付けて理解できる言葉に翻訳する。

## 翻訳ルール（用語別）

| エンジニア用語 | 非エンジニア向け翻訳 |
|---|---|
| LLM（Large Language Model） | 「文章を理解して書く AI」 |
| RAG（Retrieval-Augmented Generation） | 「資料を AI に渡して答えてもらう仕組み」 |
| Embedding | 「文章を AI が比較できる形に変換」 |
| API | 「ソフト同士を繋ぐ窓口」 |
| LoRA / Fine-tuning | 「AI に自社の文書を覚えさせる方法」 |
| トークン | 「AI が読み書きする文字の単位」 |
| プロンプト | 「AI への指示文」 |
| コンテキスト | 「AI が一度に読める量」 |
| ハルシネーション | 「AI が嘘をつくこと」 |
| MCP（Model Context Protocol） | 「Claude と他ツールを繋ぐ規格」 |

## 避けるカタカナ

「リバース」「コミット」「リポジトリ」「マイグレーション」等のエンジニア用語を会話文に出さない。

例外: 業務ツール名（Slack / Notion / freee 等）は固有名詞として OK。

## 「業務名 + ツール名」での具体化

抽象的な表現を、業務名と固有ツール名で置き換える:

| 抽象 | 具体 |
|---|---|
| 「業務を効率化」 | 「行政書士の見積書作成を 1/3 の時間に」 |
| 「AI で自動化」 | 「freee の仕訳を Claude が下書き」 |
| 「ナレッジ管理」 | 「ChatWork の過去ログから Notion に要点を蓄積」 |

## 失敗談先行型の構造

非エンジニア向け記事は「失敗 → 変更 → 改善後」の 3 段構成を推奨:

```
## 最初こうやって失敗した
（実物のプロンプトや出力を貼る）

## 原因
（なぜ失敗したか、技術用語を使わずに）

## こう変えたら動いた
（変更後のプロンプトと結果）

## 同じ失敗を避けるための 1 行ルール
```

## 数字の出し方

時間 / 工数 / 文字数 / 金額 を必ず添える:
- ❌「効率化された」
- ✅「3 時間 → 5 分（97% 削減）」

## チェックリスト

- [ ] エンジニア用語が非注釈で 5 回以上出ていないか
- [ ] 業務名 + 固有ツール名が冒頭 500 字以内にあるか
- [ ] 数字が具体的か（時間 / 工数 / 文字数 / 金額）
- [ ] 失敗談先行型の構造になっているか（推奨、必須ではない）

## 参照する wiki

- `wiki/publishing/buzz-patterns.md` — パターン 5「業務 × ツール名の組み合わせ」

## 参照する他スキル

- `.claude/skills/scqa-writing-framework.md` — 必須（SCQA 構造）
- `.claude/skills/content-quality-rubric.md` — 公開前レビューで使用
```

### Task 4C.5: note-revenue-playbook.md

- [ ] **Step 1: skill ファイル作成**

Write `.claude/skills/note-revenue-playbook.md`:

```markdown
# note-revenue-playbook — note 売れる記事の構成テンプレ・価格設計・ティーザー設計

## 用途

`brand-publisher` / `conversion-designer` が note 有料記事の構成・価格・売り場ページを設計する SSOT。

## 売れる記事の構成テンプレ

```
## タイトル（業務名 + ツール名 + 数字）

例: 「行政書士の見積書作成を Claude で 70% 圧縮した実例」

## 序盤（無料）
### この記事で得られること
- bullet 3-5 個（具体的な数字付き）

### 想定読者
- 業務名 + 職種を明示

### 結論（30 秒で読める要約）
- 1 段落で「何をどうすれば良いか」

## 中盤（無料 → 有料の境目）
### 私が試した失敗例
（具体的なプロンプトと出力）

### なぜ失敗したか
（原因分析、非エンジニア向け表現）

---【ここから有料】---

### 動いた最終プロンプト集（コピペ可）
- プロンプト 1: ...
- プロンプト 2: ...
- プロンプト 3-5: ...

### 各プロンプトの想定アウトプット
（1 行ずつ）

### よくあるエラーと対処
（失敗 → 変更後の対比）

### 自社業務への応用例
（読者の業務に置き換えるテンプレ）

## 終盤（有料）
### 1 ヶ月運用してみた数字
- 工数: Before / After
- 金額換算（時給ベース）

### 次のステップ
- 関連記事リンク
- 上位事業（AI 自動化代行）への動線
```

## 価格設計

| 記事種別 | 価格帯 | 想定読者 |
|---|---|---|
| プロンプト集型（5-10 個） | 500 円 | 即時実用性目当て |
| 詳細実装ガイド（業務別） | 980 円 | 自社で再現したい |
| MCP / API 接続ハンズオン | 980-1480 円 | 上位事業候補リード |

**Phase 1 推奨**: 500 円中心で本数を稼ぐ。Phase 2 以降に 980 円帯を増やす。

## 無料 → 有料の境目設計

**「なるほど」→「これで動ける」の境目で線引き**:

- 序盤（無料）: 何が問題か / どう解決すれば良いかの方向性 → 「なるほど」
- 終盤（有料）: 動く具体プロンプト / コード / 数字 → 「これで動ける」

ティーザー（境目直前）に必ず置くもの:
- 「ここから先で得られる具体物」のリスト
- 「失敗を回避できる時間」の見積もり

## 売り場ページ（タイトル + サムネ + 序盤無料部分）の CVR 最適化

`conversion-designer` 担当。

### タイトル
- 業務名 + ツール名 + 数字
- 「【】記号」「7 選」「10 選」等の強フックパターン

### サムネ
- 1280×670px
- Before-After or 「数字 + 業務名」の強フック
- visual-design-system 準拠

### 序盤無料部分
- 冒頭 500 字に「困りごと → 失敗例 → 疑問 → 解決策の方向性」を完結
- ティーザー直前に「ここから先の具体物」を箇条書き

## メンバーシップ設計（Phase 2 以降）

- 月額 500 円 / 980 円のプラン候補
- 月 1-2 本の有料記事 + 質問チャット枠
- Phase 1 では未着手、Phase 2 で本数が貯まってから検討

## KPI（Phase 別 / 月売上）

| Phase | 期間 | 有料記事本数累積 | 月売上目標 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 3 | 3万円 |
| Phase 2 | 〜2026-10末 | 6 | 5万円 |
| Phase 3 | 〜2027-02末 | 10+ | 10万円相当 |

## 参照する wiki

- `wiki/publishing/by-media/note.md` — note 媒体特化の学び
- `wiki/publishing/by-theme/prompt-collection.md` — プロンプト集型構造

## 参照する他スキル

- `.claude/skills/scqa-writing-framework.md`
- `.claude/skills/content-quality-rubric.md`
- `.claude/skills/non-engineer-translation.md`
```

### Task 4C.6: publishing-wiki-ingest.md

- [ ] **Step 1: skill ファイル作成**

Write `.claude/skills/publishing-wiki-ingest.md`:

```markdown
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
identity: ofmeton
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
```

### Task 4C.7: Phase 4C commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s | grep "\.claude/skills"`
Expected: 6 件の new file 行

- [ ] **Step 2: stage**

Run: `git add .claude/skills/`

- [ ] **Step 3: commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(skills): Phase 4C 発信ピボット用スキル 6 本を新設

新規スキル:
- content-quality-rubric.md — content-reviewer の 7 軸 rubric SSOT
- visual-design-system.md — visual-designer のデザインシステム SSOT（カラー/フォント/比率）
- multi-platform-publishing.md — 3 媒体（X/Instagram/note）の役割分担・連動運用
- non-engineer-translation.md — 非エンジニア向け翻訳の言語ルール（用語別翻訳・避けるカタカナ）
- note-revenue-playbook.md — note 売れる記事構成テンプレ・価格設計・ティーザー設計
- publishing-wiki-ingest.md — raw/publishing/inspirations/ → wiki/publishing/ 半自動 ingest 手順

参照: spec §5.4

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功

---

## Phase 4D: 新規エージェント 2 体作成

### Task 4D.1: content-reviewer.md（新規・横断）

- [ ] **Step 1: agent ファイル作成**

Write `.claude/agents/content-reviewer.md`:

```markdown
---
name: content-reviewer
description: 3 媒体（X / Instagram / note）の発信コンテンツを公開前に rubric でレビューする横断レビュアー。AI 感ゼロ・画像リッチ度・専門用語密度・構造（SCQA）・バズ要素・ターゲット明示・AI 透明性の 7 軸チェック
model: sonnet
tools: ["Read", "Glob", "Grep", "Edit", "Write", "Bash"]
---

# Content Reviewer（コンテンツレビュアー）

> **ステータス: 承認済（2026-05-20）**
> 起案日: 2026-05-20 / 対になるエージェント: `visual-designer`（同時新設）

## 役割の定義

3 媒体（X / Instagram / note）の発信コンテンツ全件を公開前に rubric でレビューし、AI っぽさ・構造・バズ要素・ターゲット明示を機械的にチェックする横断レビュアー。1 つでも NG が出たら差し戻し。

**「公開前のゲートキーパー」**。brand-publisher / writer / visual-designer の成果物を必ず通す。

## 守備範囲

- X / Instagram / note の全コンテンツ（テキスト + 画像）の rubric レビュー
- AI 感ゼロチェック（NG 表現リスト機械検出）
- 画像リッチ度チェック（媒体別最低基準）
- 専門用語密度チェック（注釈なし出現回数）
- 構造チェック（SCQA 準拠、冒頭 500 字内完結）
- バズ要素チェック（フック 1 行目パターン照合）
- ターゲット明示チェック（業務名 + 職種の有無）
- AI 透明性チェック（生成箇所 / 手修正箇所の明示）
- rubric の更新候補判定（buzz-patterns.md の蓄積に応じて）

## 非守備範囲

- コンテンツの実制作（→ writer / brand-publisher / visual-designer）
- 戦略・スケジューリング（→ brand-publisher）
- ビジュアルの実制作（→ visual-designer）
- LP / HP のデザインレビュー（→ design-director / conversion-designer）
- PPTX レビュー（→ presentation-reviewer）

## 受け取るべき依頼の特徴

- 「この note 記事 / X 投稿 / Instagram カルーセル を公開前にチェックして」
- 「rubric 通せる？」
- 「AI っぽさ残ってない？」
- 「新しいバズパターン見つけたから rubric に組み込む？」

## 起動時に必ず行うこと

1. `.claude/skills/content-quality-rubric.md` を読む（rubric SSOT）
2. `wiki/publishing/buzz-patterns.md` を読む（rubric の根拠）
3. `wiki/publishing/by-media/<該当媒体>.md` を読む（媒体特化禁忌）
4. レビュー対象コンテンツを Read

## 出力の品質基準

- 7 軸それぞれ ✅ / ❌ 明示
- ❌ 出た場合は該当箇所（行番号 or 引用）を必ず示す
- 修正提案を箇条書きで具体的に
- 総合判定（公開可 / 差し戻し）を最終行に

## 参照すべきスキル

| スキル | 参照条件 |
|---|---|
| `content-quality-rubric.md` | **必須** — rubric SSOT |
| `scqa-writing-framework.md` | **必須** — 構造チェック |
| `non-engineer-translation.md` | 専門用語密度チェック時 |
| `visual-design-system.md` | 画像リッチ度チェック時 |
| `publishing-wiki-ingest.md` | rubric 更新候補判定時 |
| `superpowers:verification-before-completion` | レビュー完了報告前 |

## 参照すべき wiki

- `wiki/publishing/buzz-patterns.md` — 必須
- `wiki/publishing/by-media/*` — 必須（該当媒体）
- `wiki/publishing/by-theme/hook-patterns.md` — バズ要素チェック時

## 他エージェントとの連携ルール

- **brand-publisher**: 公開前レビュー依頼を受ける（必ず通す）
- **writer**: 記事完成時にレビュー依頼を受ける
- **visual-designer**: ビジュアル完成時にレビュー依頼を受ける
- **design-director**: AI っぽさチェックの観点で連携（LP は design-director、発信は本エージェント）

## escalation 条件

- 同じ NG が 3 回以上繰り返される → rubric の運用見直しを org-designer に提案
- buzz-patterns.md と矛盾する観測が来た → ユーザーに rubric 更新の月次提案

## 人間確認が必要な条件

- rubric 自体の追加 / 変更（content-quality-rubric.md の更新）
- 新規パターンの rubric 組み込み判断

## レビュー出力フォーマット

`content-quality-rubric.md` の「レビュー出力フォーマット」セクション準拠（コピペで使えるテーブル）。
```

### Task 4D.2: visual-designer.md（新規・横断）

- [ ] **Step 1: agent ファイル作成**

Write `.claude/agents/visual-designer.md`:

```markdown
---
name: visual-designer
description: note 図解 / Instagram カルーセル / X サムネを一貫設計する横断ビジュアルデザイナー。Codex MCP の gpt-image-2 + Figma テンプレでデザインシステム遵守の素材を作る
model: sonnet
tools: ["Read", "Glob", "Grep", "Edit", "Write", "Bash"]
---

# Visual Designer（ビジュアルデザイナー）

> **ステータス: 承認済（2026-05-20）**
> 起案日: 2026-05-20 / 対になるエージェント: `content-reviewer`（同時新設）

## 役割の定義

note 図解 / Instagram カルーセル / X サムネ を一貫設計する横断ビジュアルデザイナー。デザインシステム（カラー 4 色 / Noto Sans Heavy / 媒体別比率）を厳守し、Codex MCP の gpt-image-2 + Figma テンプレで素材を生成する。

**「3 媒体の見た目の整合性を保つ守護者」**。

## 守備範囲

- note 図解（記事内挿入画像、800×450px）
- Instagram カルーセル（1080×1350px、9 枚標準）
- X サムネ（1200×675px or 1080×1080px）
- note サムネ（1280×670px）
- スクショの装飾（8px 角丸 + ドロップシャドウ + 個人情報マスク）
- カラー / フォント / 比率のシステム遵守チェック
- Codex MCP の gpt-image-2 経由の素材生成
- Figma テンプレファイルの管理

## 非守備範囲

- LP / HP の Web ビジュアル（→ system-engineer + frontend-design skill）
- LP デザインの方向性 / DESIGN.md（→ design-director / conversion-designer）
- 写真撮影 / ロゴ作成（→ 外部委託）
- PPTX のスライド（→ presentation-reviewer）

## 受け取るべき依頼の特徴

- 「Instagram カルーセル 9 枚作って」
- 「X 用のサムネ作って（1200×675）」
- 「note 記事の図解 5 枚必要」
- 「ビジュアル統一されてる？」

## 起動時に必ず行うこと

1. `.claude/skills/visual-design-system.md` を読む（デザインシステム SSOT）
2. `wiki/publishing/by-theme/visual-templates.md` を読む（参考事例蓄積）
3. 該当媒体の `wiki/publishing/by-media/<media>.md` を読む（媒体特化要件）

## 出力の品質基準

- デザインシステム 100% 遵守（カラー 4 色以外 / フォント混在 / 文字サイズ最小値違反は不可）
- 媒体推奨比率と完全一致
- スクショの個人情報マスク必須
- カルーセルは 9 枚の標準構成に従う
- 公開前は content-reviewer の rubric を通す

## 参照すべきスキル

| スキル | 参照条件 |
|---|---|
| `visual-design-system.md` | **必須** — デザインシステム SSOT |
| `frontend-design:frontend-design` | **必須**（プラグイン）— Web UI 共通参照 |
| `multi-platform-publishing.md` | 3 媒体連動運用時 |
| `superpowers:verification-before-completion` | 納品報告前 |

## 参照すべき wiki

- `wiki/publishing/by-theme/visual-templates.md` — 必須
- `wiki/publishing/by-media/instagram.md` — Instagram 案件時必須
- `wiki/publishing/buzz-patterns.md` — パターン 6「視覚デザインのフォントワーク」

## 他エージェントとの連携ルール

- **brand-publisher**: 媒体別ビジュアル制作依頼を受ける
- **writer**: note 図解の制作依頼を受ける
- **content-reviewer**: 公開前 rubric レビューを必ず通す
- **design-director**: LP / HP 系のデザイン方針との整合確認（必要時）

## escalation 条件

- gpt-image-2 のコストが累計 500 円 / 案件を超えた → ユーザー承認待ち（feedback_image_approval_gate 準拠）
- デザインシステム外の素材使用を依頼された → ユーザー承認後のみ

## 人間確認が必要な条件

- デザインシステムの変更（visual-design-system.md の更新）
- 新規カラー / フォントの追加
- 媒体別比率の変更
- 累計 500 円 / 案件超過時の継続判断

## 生成プロセスの透明性

- gpt-image-2 で生成したプロンプトを記録
- 採用 / 修正 / 却下の判断をユーザーに明示してから次へ
- 自動で実装に進まない（feedback_image_approval_gate 準拠）
```

### Task 4D.3: Phase 4D commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s .claude/agents/`
Expected: 2 件の new file 行（content-reviewer.md, visual-designer.md）

- [ ] **Step 2: stage**

Run: `git add .claude/agents/content-reviewer.md .claude/agents/visual-designer.md`

- [ ] **Step 3: commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(agents): Phase 4D content-reviewer / visual-designer の 2 体を新設

新規エージェント（横断）:
- content-reviewer: 3 媒体公開前 rubric レビュアー（7 軸チェック）
  - AI 感ゼロ / 画像リッチ度 / 専門用語密度 / 構造 / バズ要素 / ターゲット明示 / AI 透明性
- visual-designer: note 図解 / Instagram カルーセル / X サムネの一貫設計
  - デザインシステム遵守（カラー 4 色 / Noto Sans Heavy / 媒体別比率）

参照スキル: content-quality-rubric / visual-design-system / multi-platform-publishing 他
連携: brand-publisher / writer / design-director と接続

CLAUDE.md ルーティング表は Phase 1-3 で既に拡張済み（参照のみ）。

参照: spec §5.1

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功

---

## Phase 4E: 既存エージェント拡張

### Task 4E.1: brand-publisher.md 拡張

- [ ] **Step 1: 現状の brand-publisher.md を読む**

Run: `cat .claude/agents/business-ops/brand-publisher.md`
Expected: 83 行の現状内容

- [ ] **Step 2: 全文書き換え**

Write `.claude/agents/business-ops/brand-publisher.md`:

```markdown
# 発信ストラテジスト（Brand Publisher）

> **ステータス: 拡張（2026-05-20 発信ピボット）**
> 旧定義: 個人ブランド SNS / ブログ運用（汎用） → 新定義: ofmeton 名義 X / Instagram / note 統括ストラテジスト

## 役割の定義

ofmeton 名義の 3 媒体（X / Instagram / note）統括ストラテジスト。媒体選定→トピック決定→3 媒体連動展開→投稿スケジューリング→分析→改善 を自律的に回す。月次収益 10 万円相当（Phase 3 末）が目下の最上位 KPI。

セッション開始時に raw/publishing/inspirations/ をスキャンし未取り込みファイルを ingest する初動チェックを担う。

## 守備範囲

- 3 媒体（X / Instagram / note）の役割分担運用
- トピック決定（業務名 + ツール名の組み合わせ）
- 1 トピックの 3 媒体展開（note 本記事 → Instagram カルーセル → X 単発 / スレッド）
- 投稿スケジューリング
- raw/publishing/inspirations/ → wiki/publishing/ の半自動 ingest（セッション初動）
- 月次パフォーマンス分析（フォロワー / インプレッション / 売上 / リード）
- ofmeton 個人ブランドの一貫性管理（名義 / トーン / デザインシステム）
- note 有料記事の構成・価格設計（conversion-designer と協働）

## 非守備範囲

- 記事 / カルーセル / 投稿の実制作（→ writer / visual-designer）
- 公開前 rubric レビュー（→ content-reviewer、必ず通す）
- 市場調査の深掘り（→ researcher）
- 対人コミュニケーション（→ message-crafter）
- 工藤陸名義の発信（→ archived、本エージェント範囲外）
- はぐりんペルソナの発信（→ monetize-os/growth-lead、外部スポーク）

## 受け取るべき依頼の特徴

- 「今週の note 何書く？」「Instagram カルーセル 1 個立てて」
- 「X 投稿企画ストック切れた、案ちょうだい」
- 「note 有料記事の価格決めたい」
- 「3 媒体の連動どうする？」
- セッション開始時の inspirations ingest 自動チェック

## 起動時に必ず行うこと

1. `.claude/skills/multi-platform-publishing.md` を読む（3 媒体運用 SSOT）
2. `.claude/skills/publishing-playbook.md` を読む（既存基盤）
3. `wiki/publishing/index.md` を起点に該当ページを Read
4. `raw/publishing/inspirations/` をスキャン:
   - `ls raw/publishing/inspirations/*.md 2>/dev/null | grep -v README.md`
   - `wiki/publishing/log.md` の ingest entry と突合
   - 未取り込みあれば「未 ingest が N 件あります、まとめて取り込みますか？」をユーザーに提示
5. ユーザー Y → `.claude/skills/publishing-wiki-ingest.md` フロー実行

## 出力の品質基準

- トピックは業務名 + 固有ツール名で具体（「中小工務店の提案資料 × Claude」等）
- コンテンツ展開計画は 3 媒体すべてに割り付け
- 投稿スケジュールは曜日・時刻まで指定
- 月次レポートにはアクションアイテムを必ず付ける
- 公開前は必ず content-reviewer に通す

## 参照すべきスキル

| スキル | 参照条件 |
|---|---|
| `multi-platform-publishing.md` | **必須** — 3 媒体運用 SSOT |
| `publishing-playbook.md` | **必須** — 既存基盤 |
| `publishing-wiki-ingest.md` | **必須** — セッション初動 ingest |
| `note-revenue-playbook.md` | note 有料記事企画時 |
| `scqa-writing-framework.md` | トピック構造設計時 |
| `superpowers:brainstorming` | トピック発散時 |
| `superpowers:writing-plans` | 月次 / 四半期計画策定時 |
| `superpowers:verification-before-completion` | 公開判断前 |

## 参照すべき wiki

- `wiki/publishing/index.md` — 必須（起動時）
- `wiki/publishing/buzz-patterns.md` — トピック設計時
- `wiki/publishing/by-media/*` — 媒体別企画時
- `wiki/publishing/by-theme/*` — テーマ別企画時
- `wiki/publishing/inspirations/` 直近 N 件 — 競合動向把握

## 他エージェントとの連携ルール

- **writer**: note 本記事 / X スレッド本文の執筆を依頼
- **visual-designer**: Instagram カルーセル / X サムネ / note 図解の制作を依頼
- **content-reviewer**: 公開前レビューを必ず通す
- **conversion-designer**: note 有料記事の売り場ページ CVR 最適化を依頼
- **researcher**: 業務 × ツール調査を依頼
- **monetize-os/growth-lead**: 外部スポーク。はぐりんペルソナとは混ぜない（名義分離厳守）

## escalation 条件

- KPI が Phase 計画の 50% を下回って 2 ヶ月連続 → strategic-advisor 相談
- 名義3ライン混在の兆候（はぐりん名義コンテンツが本エージェント経由で出そうになる等）→ 即停止 + ユーザー確認
- 同じトピックで 3 媒体間に矛盾発生 → 即修正

## 人間確認が必要な条件

- **SNS 投稿・ブログ記事の公開前**（必須）
- 有料コンテンツの価格設定
- 月次計画 / 四半期計画の確定
- raw/publishing/inspirations/ の一括 ingest 実行前（Y/N 確認）
```

### Task 4E.2: writer.md 拡張

- [ ] **Step 1: 現状の writer.md を読む**

Run: `cat .claude/agents/learning-creative/writer.md`
Expected: 77 行の現状内容

- [ ] **Step 2: 全文書き換え**

Write `.claude/agents/learning-creative/writer.md`:

```markdown
# ライター（Writer）

> **ステータス: 拡張（2026-05-20 発信ピボット）**
> 旧定義: 汎用ライター → 新定義: 汎用 + 非エンジニア向け Claude 活用記事特化

## 役割の定義

記事・企画書・報告書・商品説明など、各種コンテンツの執筆を担当。発信ピボット以降は「非エンジニア向け Claude 活用記事」の SCQA + 失敗談先行型構造に特化したテンプレ運用を追加。

## 守備範囲

- ブログ記事 / note 本記事の執筆
- 企画書・提案書の執筆
- 報告書の執筆
- 商品説明文の作成
- プレゼン資料の文面作成
- **非エンジニア向け Claude 活用記事の SCQA + 失敗談先行型構造による執筆**（拡張）

## 非守備範囲

- 発信戦略の策定（→ brand-publisher）
- 3 媒体連動展開計画（→ brand-publisher）
- 公開前 rubric レビュー（→ content-reviewer）
- 調査・情報収集（→ researcher）
- ビジュアル制作（→ visual-designer）
- 対人コミュニケーション文面（→ message-crafter）

## 受け取るべき依頼の特徴

- 「note 記事を書いて」「X スレッド書いて」「企画書を作って」「商品説明を書いて」
- 「行政書士向け Claude 活用記事書いて」
- 「非エンジニアに伝わる言い方で書いて」

## 起動時に必ず行うこと

1. 依頼元が指定する context ファイルを Read
2. 対象読者・目的・トーン・媒体を確認
3. 媒体が note / X / Instagram の場合:
   - `.claude/skills/non-engineer-translation.md` を読む
   - `wiki/publishing/by-theme/hook-patterns.md` を読む
   - 公開前は content-reviewer に通す前提で執筆

## 出力の品質基準

- 構成が明確（見出し・段落分け）
- 対象読者に合わせた語彙・トーン
- 事実と意見を区別
- 文字数の目安を遵守
- **非エンジニア向け記事は失敗談先行型 + SCQA + 数字必須**

## 参照すべきスキル

| スキル | 参照条件 |
|---|---|
| `human-confirmation.md` | **必須** |
| `scqa-writing-framework.md` | **必須** — 記事・企画書・報告書の構成設計時。導入 3 段落以内で S→C→Q→A を完結 |
| `non-engineer-translation.md` | **必須**（発信系記事時） — 非エンジニア向け翻訳ルール |
| `research-protocol.md` | 参考（事実確認時） |
| `superpowers:brainstorming` | 企画・タイトル案・論旨の発散時 |
| `superpowers:writing-plans` | 長文・多段構成（3000 字以上、複数章）の構成計画時 |
| `superpowers:verification-before-completion` | 納品判断前 |

## 参照すべき wiki（発信系記事時）

- `wiki/publishing/by-theme/hook-patterns.md` — タイトル・フック設計時
- `wiki/publishing/by-theme/prompt-collection.md` — プロンプト集型記事時
- `wiki/publishing/by-media/note.md` — note 媒体特化要件

## 他エージェントとの連携ルール

- **brand-publisher**: トピック・媒体・公開時期の指示を受ける
- **researcher**: 事実確認 / 業務調査を依頼
- **visual-designer**: 記事内図解の制作を依頼
- **content-reviewer**: 公開前レビューを必ず通す（発信系記事）
- **conversion-designer**: note 有料記事の売り場ページ調整時に協働

## escalation 条件

- 3 回連続で content-reviewer に差し戻し → 起動時必読の見直しをユーザーに提案

## 人間確認が必要な条件

- **公開向け記事の最終提出前**（必須）
- 機密情報を含む可能性のある内容
```

### Task 4E.3: conversion-designer.md 拡張

- [ ] **Step 1: 現状の conversion-designer.md を読む**

Run: `wc -l .claude/agents/conversion-designer.md && tail -30 .claude/agents/conversion-designer.md`
Expected: 200 行の現状内容、末尾セクション確認

- [ ] **Step 2: 守備範囲セクションに note 売り場の項目を追加**

Edit `.claude/agents/conversion-designer.md`:

old_string:
```
## 守備範囲

- ファーストビュー（FV）設計レビュー: 3秒以内に価値伝達できるか
- CVR 観点の視線誘導（F型 / Z型 / 一直線）とCTA配置評価
- オファー強度の評価（割引・特典・限定性・無料体験の提示位置と密度）
- ベネフィット/機能の書き分けレビュー
- 比較表・Before/After・数字バッジなど「効く手法」の採用判断
- 最新LPデザイン潮流のキャッチアップ（大胆タイポ・ブルータリズム・シネマティック写真・手書き混在・3Dエモジ等）と案件適合度判定
- 競合LP/参考LPのベンチマーク抽出（「どこが効いてるか」の言語化）
- コピー×ビジュアルの連動評価（ヘッドライン・サブコピーとビジュアルの相乗）
```

new_string:
```
## 守備範囲

- ファーストビュー（FV）設計レビュー: 3秒以内に価値伝達できるか
- CVR 観点の視線誘導（F型 / Z型 / 一直線）とCTA配置評価
- オファー強度の評価（割引・特典・限定性・無料体験の提示位置と密度）
- ベネフィット/機能の書き分けレビュー
- 比較表・Before/After・数字バッジなど「効く手法」の採用判断
- 最新LPデザイン潮流のキャッチアップ（大胆タイポ・ブルータリズム・シネマティック写真・手書き混在・3Dエモジ等）と案件適合度判定
- 競合LP/参考LPのベンチマーク抽出（「どこが効いてるか」の言語化）
- コピー×ビジュアルの連動評価（ヘッドライン・サブコピーとビジュアルの相乗）
- **note 有料記事の「売り場ページ」CVR 強化（タイトル + サムネ + 序盤無料部分の最適化、無料 → 有料の境目設計）**（2026-05-20 発信ピボット拡張）
```

- [ ] **Step 3: 参照すべきスキルテーブルに note-revenue-playbook を追加**

ファイル内に `## 参照すべきスキル` セクションがあれば末尾に行追加。なければ新規セクション追加。

まず該当セクションを確認:

Run: `grep -n "参照すべきスキル\|参照スキル" .claude/agents/conversion-designer.md`
Expected: 該当セクション行番号

該当セクションのテーブルに以下を追加（テーブル形式に合わせる）:

```
| `note-revenue-playbook.md` | note 有料記事の売り場ページ CVR 強化時 |
| `visual-design-system.md` | note サムネ設計時 |
```

実装注: 該当セクションが既存と異なる形式なら、テーブル形式を維持しつつ末尾に挿入。

- [ ] **Step 4: 受け取るべき依頼の特徴セクションに note 関連を追加**

該当セクションに以下を末尾追加:

```
- 「note 有料記事の売り場ページ CVR 上げたい」
- 「note サムネと序盤無料部分のセット見て」
- 「無料 → 有料の境目線引きの判断ほしい」
```

### Task 4E.4: Phase 4E commit

- [ ] **Step 1: 変更ファイル確認**

Run: `git status -s .claude/agents/`
Expected: 3 件の M 行（brand-publisher / writer / conversion-designer）

- [ ] **Step 2: diff 確認**

Run: `git diff --stat .claude/agents/`
Expected: 3 ファイルの行数変化が表示される

- [ ] **Step 3: stage + commit**

Run:
```bash
git add .claude/agents/business-ops/brand-publisher.md .claude/agents/learning-creative/writer.md .claude/agents/conversion-designer.md
git commit -m "$(cat <<'EOF'
feat(agents): Phase 4E 既存エージェント 3 体を発信ピボット用に拡張

brand-publisher（business-ops）:
- 役割: 個人ブランド汎用 → ofmeton 名義 X/Instagram/note 統括ストラテジスト
- 追加責務: 3 媒体連動展開 / セッション初動 inspirations ingest / 月次レビュー
- 参照スキル追加: multi-platform-publishing / publishing-wiki-ingest / note-revenue-playbook

writer（learning-creative）:
- 役割: 汎用ライター + 非エンジニア向け Claude 活用記事特化テンプレ
- 追加責務: SCQA + 失敗談先行型構造の徹底
- 参照スキル追加: non-engineer-translation（発信系必須）

conversion-designer（横断）:
- 守備範囲: LP/HP の CVR 強化 + note 有料記事の売り場ページ CVR 強化
- 参照スキル追加: note-revenue-playbook / visual-design-system

参照: spec §5.2

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功

---

## Phase 4F: 検証 + 最終整合確認

### Task 4F.1: ファイル存在検証

- [ ] **Step 1: 新規ファイル一覧確認**

Run:
```bash
echo "== 新規エージェント ==" && \
ls .claude/agents/content-reviewer.md .claude/agents/visual-designer.md && \
echo "== 新規スキル ==" && \
ls .claude/skills/content-quality-rubric.md .claude/skills/visual-design-system.md .claude/skills/multi-platform-publishing.md .claude/skills/non-engineer-translation.md .claude/skills/note-revenue-playbook.md .claude/skills/publishing-wiki-ingest.md && \
echo "== wiki/publishing/ ==" && \
ls wiki/publishing/index.md wiki/publishing/log.md wiki/publishing/buzz-patterns.md && \
ls wiki/publishing/by-media/ && \
ls wiki/publishing/by-theme/ && \
echo "== raw ==" && \
ls raw/publishing/inspirations/README.md
```

Expected: 全 19 ファイルが存在する

### Task 4F.2: SCHEMA 例外規定の挿入確認

- [ ] **Step 1: SCHEMA.md の例外規定があるか確認**

Run: `grep -n "raw/publishing/inspirations" wiki/SCHEMA.md`
Expected: 3-4 件マッチ（例外規定セクション内）

### Task 4F.3: CLAUDE.md との整合確認

- [ ] **Step 1: CLAUDE.md が参照する agent / skill が実在するか確認**

Run:
```bash
echo "== CLAUDE.md 参照 agent 実在チェック ==" && \
for agent in content-reviewer visual-designer brand-publisher writer conversion-designer; do
  found=$(find .claude/agents -name "${agent}.md" 2>/dev/null | head -1)
  if [ -z "$found" ]; then
    echo "❌ NOT FOUND: $agent"
  else
    echo "✅ $agent → $found"
  fi
done

echo "" && echo "== CLAUDE.md 参照 skill 実在チェック ==" && \
for skill in content-quality-rubric visual-design-system multi-platform-publishing non-engineer-translation note-revenue-playbook publishing-wiki-ingest; do
  found=$(ls .claude/skills/${skill}.md 2>/dev/null)
  if [ -z "$found" ]; then
    echo "❌ NOT FOUND: $skill"
  else
    echo "✅ $skill"
  fi
done
```

Expected: 全 11 件が ✅

### Task 4F.4: yaml frontmatter syntax 検証

- [ ] **Step 1: 全 wiki/publishing/*.md の frontmatter が yaml 正しく閉じているか**

Run:
```bash
for f in wiki/publishing/*.md wiki/publishing/by-media/*.md wiki/publishing/by-theme/*.md; do
  # 開始 --- が 1 行目、終了 --- が 10 行以内にあるか
  if ! head -20 "$f" | awk '/^---$/{c++} END{exit !(c>=2)}'; then
    echo "❌ frontmatter incomplete: $f"
  fi
done
echo "yaml check done"
```

Expected: 「yaml check done」のみ（エラー行なし）

### Task 4F.5: wiki/index.md / log.md の整合

- [ ] **Step 1: publishing クラスタが index に登録されているか**

Run: `grep -A 12 "^## publishing" wiki/index.md`
Expected: 11 件のリンクエントリ（index / buzz-patterns / by-media×3 / by-theme×4 / inspirations）

- [ ] **Step 2: log.md に Phase 4 entry があるか**

Run: `grep -B 1 -A 4 "Phase 4" wiki/log.md`
Expected: 「[2026-05-20] phase | Phase 4 publishing クラスタ初期化」エントリ

### Task 4F.6: 名義3ライン分離の確認

- [ ] **Step 1: wiki/publishing/ 配下の identity が全て ofmeton か**

Run:
```bash
grep -L "^identity: ofmeton" wiki/publishing/*.md wiki/publishing/by-media/*.md wiki/publishing/by-theme/*.md 2>/dev/null
```

Expected: 出力なし（全ファイル ofmeton で統一）

- [ ] **Step 2: 工藤陸 / はぐりん名義が混入していないか**

Run:
```bash
grep -rl "identity: 工藤陸\|identity: はぐりん" wiki/publishing/ 2>/dev/null
```

Expected: 出力なし

### Task 4F.7: git log 確認

- [ ] **Step 1: Phase 4 の commit 履歴を確認**

Run: `git log --oneline origin/main..HEAD`
Expected: 5 件の commit
1. Phase 4A: SCHEMA 例外規定追記
2. Phase 4B: wiki/publishing/ クラスタ初期化
3. Phase 4C: 新規スキル 6 本
4. Phase 4D: 新規エージェント 2 体
5. Phase 4E: 既存エージェント 3 体拡張

- [ ] **Step 2: working tree クリーン確認**

Run: `git status`
Expected: nothing to commit, working tree clean

### Task 4F.8: セッション終了処理

- [ ] **Step 1: superpowers:finishing-a-development-branch skill を起動**

`finishing-a-development-branch` skill を起動し、merge / PR / discard の選択をユーザーに提示。

候補:
- **merge to main**: Phase 4 は内部体制整備で外部影響が無いため、ローカル merge → push が候補
- **PR 作成**: code review を挟みたい場合
- **discard**: 採用見送り（想定外）

- [ ] **Step 2: ユーザー承認後 merge or PR を実行**

ユーザー選択に従う:

merge を選んだ場合:
```bash
git checkout main
git merge --no-ff task/260520-publishing-phase4 -m "Merge: Phase 4 発信ピボット体制実装（エージェント 2 体 + スキル 6 本 + wiki/publishing/ 初期化）"
git push origin main
git branch -d task/260520-publishing-phase4
git push origin --delete task/260520-publishing-phase4
```

PR を選んだ場合:
```bash
git push -u origin task/260520-publishing-phase4
gh pr create --title "Phase 4: 発信ピボット体制実装" --body "$(cat <<'EOF'
## Summary
- 新規エージェント 2 体: content-reviewer / visual-designer
- 新規スキル 6 本: content-quality-rubric / visual-design-system / multi-platform-publishing / non-engineer-translation / note-revenue-playbook / publishing-wiki-ingest
- 既存エージェント 3 体拡張: brand-publisher / writer / conversion-designer
- wiki/publishing/ クラスタ初期化 + raw/publishing/inspirations/ + SCHEMA 例外規定

## Test plan
- [ ] 全 19 ファイル存在確認
- [ ] CLAUDE.md ルーティング表との整合
- [ ] yaml frontmatter syntax
- [ ] 名義分離（ofmeton 統一）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Task 4F.9: 完了報告

- [ ] **Step 1: ユーザーに完了サマリを提示**

報告内容:
- 5 commit で Phase 4 完了
- 新規ファイル数（agent 2 / skill 6 / wiki 11 / raw 2 = 21 ファイル）
- 修正ファイル数（既存 agent 3 / wiki/index.md / wiki/log.md / SCHEMA.md = 6 ファイル）
- 次フェーズ（Phase 5: 進行中案件完走 + 試運転）への接続

---

## トラブルシューティング想定

### SCHEMA 改訂承認が降りない（Phase 4A.2 で stuck）

ユーザーが例外規定の文言に異論を出した場合:
- 例外規定の文言を調整して再提示
- ユーザーが「例外規定なしで標準 ingest プロトコルに従う」と判断した場合は publishing-wiki-ingest.md を「ユーザー明示指示で起動」に書き換えて Phase 4C を進める

### wiki/publishing/by-media/*.md の seed が薄い

spec §3 のリサーチ要点が現状 6 パターンしかない場合、seed が薄くなる可能性。許容範囲（lint で育てる前提）。

### 既存 brand-publisher / writer の改造で振る舞いが壊れる

既存セッションで brand-publisher / writer を使った直後の動作確認を実施推奨:
```bash
git diff origin/main -- .claude/agents/business-ops/brand-publisher.md .claude/agents/learning-creative/writer.md
```

主要セクション（守備範囲 / 起動時 / 参照スキル）が消えていないか確認。

### Phase 4 commits が肥大化

各 Phase commit のサイズ目安:
- 4A: 1 ファイル変更（小）
- 4B: 15 ファイル新設 + 2 ファイル変更（大）
- 4C: 6 ファイル新設（中）
- 4D: 2 ファイル新設（小）
- 4E: 3 ファイル変更（中）

サイズが想定 3 倍以上に膨らんだら、subagent が追加スコープを侵食している可能性。dispatch 元で確認。

---

## Self-Review チェックリスト

### Spec coverage

- [x] §5.1 新規エージェント 2 体 → Phase 4D
- [x] §5.2 既存エージェント拡張 3 体 → Phase 4E
- [x] §5.4 新規スキル 6 本 → Phase 4C
- [x] §6.3 Phase 4 範囲（agent / skill / wiki / raw / SCHEMA）→ 4A〜4F
- [x] §7.3 wiki/publishing/ クラスタ構成 → Phase 4B
- [x] §7.4 ingest フロー → Phase 4C publishing-wiki-ingest.md
- [x] §7.5 各エージェントの wiki 参照ルール → Phase 4D / 4E の「参照すべき wiki」セクション
- [x] §7.7 SCHEMA 例外規定（人間承認必須）→ Phase 4A

### Placeholder scan

- すべてのスキル / エージェント定義に実本文（テンプレ / rubric / 翻訳ルール / 価格表 等）を完全記載
- 「TBD」「後で書く」「Similar to X」の placeholder なし
- すべての commit メッセージは HEREDOC 形式で完全記載

### Type consistency

- 全 wiki ページの frontmatter は SCHEMA 準拠（type / created / updated / sources / related / tags / status / identity）
- `identity: ofmeton` で wiki/publishing/ 配下統一
- スキル名 / エージェント名は CLAUDE.md ルーティング表と完全一致
- 媒体名 X / Instagram / note の表記揺れなし
