# セッション振り返り — STORM 導入（方法論を課金ゼロで skill 化）

- 日時: 2026-06-24 00:10
- 対象: `stanford-oval/storm` の導入依頼 → 調査 → 方針ピボット → PoC → `storm-research` skill 新設（PR#266 merge）
- 成果物: `.claude/skills/storm-research/SKILL.md`（新規）/ `CLAUDE.md` 起動マップ1行 / PoC `outputs/research/2026-06-23-juku-revenue-feasibility-engawa.md`（塾収益化4視点吟味・引用42本・¥0）

## §0 raw 保存漏れ
漏れなし。「塾を収益事業化する構想」は既存 `raw/facts/situations/2026-06-09-engawa-mtg-content-direction.md` ＋ `project_tutoring_business.md` の再言及かつ構想（仮説）段階で新規確定事実なし → 保存対象外。

## §0.5 前回フォローアップ
前回（2026-06-18 retro）open_item「worktree-bg-isolation: bg副産物が shared checkout で弾かれる→worktree隔離」が**再発**。今回は outputs/ への Write でも guard 対象だと気づかず1回 reject を食らった（前回学習が未定着＝2回連続）。§4 で根本対応。

## §1 良かった点
1. 要件を鵜呑みにせず実現可能性と照合 — 「課金しない」を STORM の技術事実（litellm=API従量課金前提）と即突き合わせ、plan mode 内で「ソフト導入→方法論だけ課金ゼロ再現」へ素早くピボット。
2. PoC を実テーマ（塾収益化吟味）で回し、検証＋実用調査を両立。既存内部分析（8団体）を Explore で先に集約し重複調査を回避。
3. STORM 論文メソッドを並列サブエージェント4視点（批判視点を独立で立てた）で忠実再現、引用42本の高品質。
4. plan mode で用途／スコープ／コスト／方式を AskUserQuestion で段階合意してから着手。

## §2 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回り | 本来の動き |
|---|---|---|---|---|
| 1 | `outputs/research` への Write が bg分離guardで reject | PoC を「outputs新規＝確認不要」と捉え read-only 気分で worktree 未作成。bg guard は全 file edit 対象 | 前回 retro で既出なのに再発 | bg session は最初の file edit 前に EnterWorktree（成果物 Write 含む） |
| 2 | CLAUDE.md Edit が "not read yet" で reject | worktree 切替後の再Read漏れ（既出 feedback） | 同上 | worktree 切替直後に対象を Read |

## §4 根本原因（#1 が2回連続）
「bg session ＝ コードを書く時だけ worktree」という認識が残り、outputs/成果物 Write を read-only の延長と誤認していた。bg isolation guard は editor 系ツール全般が対象。→ **「bg session で Write/Edit を1回でも使うなら、最初に EnterWorktree」を判断の既定にする**。

## §5 レンズ
- ⚡ Claude機能: plan mode 活用◎。一方 background worktree を初手で張れず2度手間（前回学習が定着していない）。
- 🪙 トークン: PoC は researcher 4本で約210k＝重め。品質目的で妥当だが quick depth なら半減可だった。

## §6 反映（SAFE のみ・RISKY なし）
- (a) `data/improvement-log.jsonl` に今回 retro エントリ（status付き）
- (b) `wiki/self/engineering-principles.md` に1行連結（外部OSS導入は制約照合→方法論再現も第一級の選択肢）
- (c) `wiki/hot.md` 更新

保存関門で新規 memory は却下（bg-isolation＝既出 / storm-research＝repo記録済 / 原則は wiki へ連結が適切）。
