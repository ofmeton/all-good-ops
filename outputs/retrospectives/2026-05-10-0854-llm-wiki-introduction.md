# セッション振り返り — Karpathy LLM Wiki パターン導入（Phase 0-1 + 派生作業）

- 日時: 2026-05-10 08:54 JST
- 対象: 本セッション全体（gist 取得 → brainstorming → spec → plan → execution → 派生作業）
- 主な成果物:
  - `docs/superpowers/specs/2026-05-09-llm-wiki-design.md` (452 行)
  - `docs/superpowers/plans/2026-05-09-llm-wiki-phase0-1.md` (1262 行)
  - `wiki/` (Obsidian vault root, 12 ページ: SCHEMA + index + log + bsa 5 + lp-hp-design 2 + people 1 + personal 1)
  - `raw/` (不可侵素材ディレクトリ + パイロット ingest 4 ファイル + spade-motion 1 ファイル)
  - CLAUDE.md に「## wiki 運用」セクション追加 + ルーティング行 + 確認不要操作追記
  - `outputs/bsa/proposal-automation/src/generator/src/prompt-builder.ts` の path 更新 + frontmatter strip
- commit 数: 11（plan を含む）

---

## 1. 良かった点

1. **brainstorming → spec → plan → execution の skill chain を完走**: 議論を spec ファイル化、spec を plan に変換、plan を実装まで通した。各段階で明示的に承認を取って進めた
2. **prompt-builder.ts のハードコードパスを早期検出 → 実機テストまで到達**: Task 1 grep で `readFileSync` 発見 → ファイル移動でコード壊れることを予見 → `existsSync=true` 検証 → vitest → 実機 prompt 生成 → frontmatter strip まで一気通貫
3. **MVP 検証中の設計矛盾を躊躇なく修正**: テラ一色が「BSA 枠外」と判明した時点で SCHEMA.md 名義3ライン分離を「工藤陸 = BSA 配下のみ」→「BSA + personal + 関連 clients」に緩和。実装途中の設計改修を恐れず実施
4. **lint の自己実行で script のバグを検出**: `(SCHEMA|index|log)\.md$` フィルタが `pricing-catalog.md` を誤除外しているのを実行結果から自己発見、即修正
5. **既存資産との部分統合方針を Section 4 で early に固めた**: knowledge/context は wiki 移行 / memory は維持 / data は並行 を設計段階で確定、重複・矛盾を未然防止

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | lint script の filter で `pricing-catalog.md` が誤除外（末尾 `log.md` が `(log)\.md$` にマッチ） | 正規表現の境界条件を考えずに quick&dirty で書いた | `/<name>\.md$` の `/` プレフィクス必須 | 類似 basename を持つファイルの存在を default 検証 |
| 2 | Task 17 で「BSA 枠外」判明 → SCHEMA.md/spec の名義3ライン分離を後付け緩和 | brainstorming で memory `project_terra_isshiki.md` の「BSA枠外」記述を読まず 1 件想定で書き始めた | 設計時に memory を読んで personal クラスタを最初から想定 | spec/SCHEMA は MVP 具体ケース 2 件以上想定してから書く |
| 3 | Phase 0 commit 時に他作業の untracked（terra-isshiki/site/, retrospectives/freee）が git status に大量に出て混乱 | セッション開始時の git status を最初に読まなかった | 開始時の git status 一読、自分の scope 切り分け | wiki commit は `git add -A` 厳禁、ファイル単位指定 |
| 4 | spec/plan の MVP 想定（BSA 案件）と現実の素材（テラ一色は分かりやすいが BSA 枠外）がズレ | spec 起案時に「最初の ingest 素材として何があるか」を確認しなかった | 計画段階で素材棚卸しを 1 ステップ入れる | spec 内に「最初の動作確認に使う具体素材候補」を明記 |
| 5 | 文中で `[[proposals/templates]]` を使ったが lint script が basename `templates` でしか検索 → 誤って orphan 認定 | wikilink にサブパス形式（`[[group/name]]`）も存在することを設計時に考慮していなかった | サブパス wikilink 形式を SCHEMA.md に明記 | lint script は basename と full-relative path 両方で検索 |

## 3. 自動化・効率化の余地

- **lint script の skill 化**: orphan / 名義3ライン / broken wikilink / サブパス wikilink 検出を `.claude/skills/wiki-lint.md` に標準化（保留 — Phase 2 で再評価）
- **frontmatter テンプレ生成 helper**: type 別（source/concept/entity/topic/log）の skeleton を skill 化、ingest 時の手作業削減
- **rg で参照箇所列挙の standard pattern**: `--type` フィルタ + `.claude/` 別指定の 2 段を memory feedback に固定化（実施済み）

## 4. 次回への改善提案

a. **wiki 関連 commit では `git add` を必ずファイル単位で指定**（feedback memory 反映済み）
b. **rg で全参照箇所列挙時は `--type` + `.claude/` 別指定の 2 段実行**（feedback memory 反映済み）
c. **設計起案時は具体ケースを 2 件以上想定**（feedback memory 反映済み）
d. **lint script の basename フィルタ正規表現は `/<name>\.md$` プレフィクス**（feedback memory 反映済み）
e. **wikilink は basename + サブパス両形式の検索を default**（lint skill 化時に必須）

## 5. 反映先と実装

### 実装済み（SAFE 1-4）

| カテゴリ | 反映先 | 内容 |
|---|---|---|
| memory feedback | `feedback_wiki_ingest_git_add.md` | wiki/raw/spec commit は git add ファイル単位指定 |
| memory feedback | `feedback_grep_reference_listing.md` | rg 全参照列挙は --type + .claude/ 2 段 |
| memory feedback | `feedback_design_two_cases.md` | spec/SCHEMA 起案時は具体ケース 2 件以上想定 |
| memory feedback | `feedback_lint_filter_regex.md` | basename フィルタ正規表現は /<name>.md$ プレフィクス |
| memory MEMORY.md | index 行 4 件追加 | 上記 4 file への hook |

### 保留（ユーザー判断）

- improvement-log.jsonl / wiki/log.md 追記
- SCHEMA.md にサブパス wikilink 明記
- wiki-lint / wiki-ingest スキル新設

---

## 関連 commit（本セッション）

```
bf814dc feat: wiki: spade-motion-study ingest + motion-techniques orphan 解消 (D+E)
3aa3970 fix: generator: proven-track-record.md の frontmatter を strip
210cc8f feat: wiki: Phase 1 完了 - MVP 動作確認 (Task 18 + 20)
425f486 feat: wiki: パイロット ingest TERRA HAYAMA HP 制作 (Task 17)
73dd216 feat: wiki: BSA 領域に新規ページ 3 件作成 (Task 14-16)
fd9c1c8 feat: wiki: motion-techniques を domain/lp-hp-design に移行
0679e27 feat: wiki: proven-track-record を BSA wiki に移行
44615c8 feat: wiki: pricing-catalog を BSA wiki に移行
4887387 docs: CLAUDE.md: wiki 運用セクション追加 + ルーティング更新
6eb3854 feat: wiki: Phase 0 土台構築 (raw/ + wiki/ + SCHEMA.md)
6ab9d56 docs: plan for LLM Wiki Phase 0-1 (土台 + BSA MVP)
```

## 4 週間運用検証フェーズへの引き継ぎ

- 検証指標: ingest 件数 ≥ 5（現在 1/5、TERRA HAYAMA + spade-motion で 2 ↗）
- query 体感速度
- lint コスト
- 撤退基準: ingest 0〜1 件 / 受注効果なし / メイン作業圧迫
- Phase 2 着手前検討事項: lint script skill 化、wikilink サブパス対応、context-business / context-finance の wiki 分解計画
