# セッション振り返り — hermes 文脈共有→Phase A→整理→タスクフロー再設計 (2026-06-22〜23)

対象: hermes を「使うほど育つ・文脈を知るパートナー」へ。Phase B(memory/wiki→USER_PROFILE投影注入)・Phase A(学習ループ土台)・沈殿worktree整理・**タスクフロー再設計(6要素ブリーフ自走パートナー S1-S5)** を1セッションで実装。

## §0 raw 保存漏れ
本日(2026-06-23)の新規 raw/facts 事実なし。今セッションは設計・実装・preference で、人物/契約/状況の新事実発話なし（preference は feedback memory へ）。

## §0.5 前回フォローアップ
improvement-log 直近5件（2026-06-21/22 retro）すべて `applied`・open 再発なし＝ループ健全。

## §1 良かった点
- **go-live 前に grill-me を挟み設計欠陥を出荷前に捕捉**（triage欠如のコスト/通知洪水）→ triage 追加で実改善。破壊試験が設計を1段強くした。
- **Codex 二段レビュー（自己レビュー→Claude最終）が各ステージで silent-failure を捕捉**（intake の patch/通知順序・breakdown の重複作成 dedup）。
- **実看板 dry-run 検証**（実 Notion・書込ゼロ）で go-live 前にエンジンの実挙動を確認。triage が軽4枚を各3秒で正しく裁いた。
- S1-S5 を PR 分割し main 常時グリーン維持。

## §2 詰まった / 二度手間
| # | 事象 | 原因 | 本来すべき |
|---|---|---|---|
| 1 | Notion 自己関連が4プロパティ重複生成 | DUAL の ADD COLUMN を両側分書いた | 片側のみ `ADD COLUMN RELATION(ds, DUAL 'reverse' 'id')`（逆は自動生成） |
| 2 | squash-merge 後の同一 worktree 再利用で push reject/divergence **5回反復** | squash後ブランチ乖離・同名 remote 衝突 | 各ステージ前に `reset --hard origin/main` + 新ブランチ名 |
| 3 | EnterWorktree が wt-new.sh sibling に入れず stray 生成 | pinned中は `.claude/worktrees/` 配下のみ | pinned中の新worktreeは `EnterWorktree(name)` |

## §3 自動化・効率化の余地
- §2-2 の reset+新ブランチが5回の定型反復。順次ステージ運用の型として固定。

## §4 次回への改善提案（actionable）
- Notion MCP 自己関連: ADD COLUMN は片側のみ。
- 順次 squash-merge ステージ: 着手前に `git reset --hard origin/main` → `git push HEAD:<新ブランチ名>`。

## §5 レンズ
- 🪙 トークン: 超大型セッション。grill/interview は価値大だったが go-live を跨ぐ複数フェーズを1セッションに詰めた。フェーズ境界でもっと早く区切る判断もあり得た（今回がその学習）。
- ⚡ Claude機能: Codex委任・plan mode・grill-me・dry-run検証を活用。

## §6 反映（SAFE 即反映済）
- `memory/reference_notion_mcp_id_and_sharing.md` += 自己関連は ADD COLUMN 片側のみ（§4 新設）
- `memory/feedback_squash_merge_manual_worktree_remove.md` += 順次squash-mergeは reset+新ブランチ
- `memory/feedback_communication_style.md` += 委任時は自己調査して低確信のみ聞く・6要素の構造化共通認識を好む
- `memory/project_hermes_todo_partner.md` += タスクフロー再設計 S1-S5 実装状態（前段で反映済）
- `data/improvement-log.jsonl` += 本retro エントリ（status=applied）

## go-live 残（次セッション）
新 script(intake_enrich/breakdown_apply)+plist を Mac/VM `~/.hermes/` 配備＋launchdロード、kill switch を1、VM `config.yaml` hint 調整（最小捕捉＋Telegram分解承認で ApproveBreakdown）＋Phase A学習インボックスhint。本番化＝実カード書込+Telegram質問開始のため腰据えて。
