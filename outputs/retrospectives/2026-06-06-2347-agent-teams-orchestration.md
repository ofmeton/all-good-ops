# 振り返り 2026-06-06 23:47 — agent teams 開発オーケストレーション体制構築

対象セッション: note記事（Claude Code オーケストレーション）のファクトチェック → ウチでの再現相談 → agent teams 開発体制の設計・構築（PR#114 マージ）。

## 0. 事実情報の raw 保存漏れチェック
ユーザー発話に新規の人物/契約/状況事実なし（内容は①記事ファクトチェック依頼、②体制構築の依頼と設計判断、③環境バージョン報告）。体制構築は git/wiki/dev/・hot.md・log.md に記録済み。→ **漏れなし**。

## 1. 良かった点
- 記事を機械的に再現せず、質問を重ねて**真因（設計のブレ＝横断規約の不在）**を特定。記事の8人案でなくウチに合った最大4人構成に着地
- 設計前に並列3 Explore で流用候補・陳腐化・規約素材を先に把握
- worktree 隔離・Phase 別 commit・push 前 verify・finishing skill を規律通り通した
- 最後に architect の実ロード（agent type 認識・書込ツール無し）を検証できた

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 本来すべき動き |
|---|---|---|---|
| 1 | standards をスタック固定で書きユーザー指摘で A/B 再構成（手戻り1・commit 2本） | 既存素材が Next.js+Supabase 由来 → SSOT＝そのスタック前提と無意識に固定 | SSOT 設計の最初に「スタック非依存の原則」と「スタック固有規約」を分離する |
| 2 | system-engineer に存在しないエージェント参照（mcp-architect/quality-auditor）残存 | agent 定義の陳腐化検出網がない | 定期的に「存在しないエージェント参照」を検出 |
| 3 | squash merge で wt-done.sh 不可→手動 remove | wt-done が branch --merged 判定で squash 非対応 | （既知・実害なし、記録のみ） |

## 3. 自動化・効率化の余地
- agent 定義 lint（存在しないエージェント参照の検出）。3回未満のため新規スキル化は見送り、improvement-log で監視

## 4. 次回への改善提案
- 規約/SSOT 文書を新規作成する時は、冒頭で「技術非依存の原則」と「スタック固有規約」を分離する構造を先に決める
- squash merge 運用時は最初から手動 worktree remove を選ぶ（wt-done.sh は merge commit 用）

## 5. 反映先
- **memory（SAFE）**: `feedback_ssot_stack_agnostic_split` / `feedback_squash_merge_manual_worktree_remove` / `project_agent_teams_orchestration`（+ MEMORY.md index）
- **improvement-log（SAFE）**: agent 定義の陳腐化参照検出を監視項目に追加
- RISKY: なし（CLAUDE.md ルーティング・settings env は PR#114 で反映済み）
