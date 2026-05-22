---
type: meta
title: "Hot Cache"
updated: 2026-05-22
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。LLM はセッション開始時に最優先でこれを読む。詳細仕様: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-05-22 14:25 — Remotion 動画生成環境 (`outputs/publishing/remotion/`) を構築・push、brand-publisher / visual-designer / CLAUDE.md に周知反映。並列セッション衝突を 1 セッション内で 2 回踏み、memory + improvement-log に再発防止策を反映済。

## Current Focus
- **Remotion 環境稼働中** (Remotion 4 + React 19 + Tailwind v4 + TS)。担当 = visual-designer、SSOT = `outputs/publishing/remotion/README.md`。X / IG リール / note 内動画を Claude コード生成で量産可能
- claude-obsidian 採用は Phase 0-3 完了。Phase 4（defuddle CLI 実物インストール）はユーザー手動 `npm i -g defuddle-cli` 待ち
- 発信ピボット Phase 4 進行中（X / Instagram / note 3 媒体運用立ち上げ）。動画は新たな弾になった
- terra-isshiki / minpaku-cleaning 個人案件は 2026-06 末完納に向けて稼働
- ai-radar の目的 pivot 検討中（[[publishing/log]] 経由参照）
- 事業計画書（さとしさん打診向け）の起草準備が前ブランチで進行、ドラフト本体は未着手

## Recently Touched
- [[../outputs/publishing/remotion/README]] (2026-05-22 SSOT 化 + サンプルレシピ 3 種追加)
- [[../.claude/agents/business-ops/brand-publisher]] (2026-05-22 動画コンテンツ守備範囲追加)
- [[../.claude/agents/visual-designer]] (2026-05-22 Remotion 制作セクション新設)
- [[../CLAUDE]] (2026-05-22 発信戦略 §核ルールに動画生成環境 1 行追加)
- [[SCHEMA]] (2026-05-22 §3層構造 manifest 例外 / §ingest manifest check / §query 3 Modes / §ホットキャッシュ 追記)
- [[hot]] (2026-05-22 振り返り後の自己更新 2 回目)
- [[publishing/log]] (Phase 4 publishing クラスタ稼働中)

## Open Questions / Frontiers
- **並列セッション運用の標準化**: 同日 task ブランチ 3+ あれば worktree 隔離必須を Step 0 に組み込めるか（既存 memory `feedback_one_session_one_branch` に追記済、hook 実装は未検討）
- **stash@{0} の処遇**: 別セッションが `raw/facts/*` 10 件を A 状態にしていた状態が私の stash に巻き込まれ保持中。別セッションが index 復元したい時は `git stash apply` で戻せる
- defuddle CLI のインストール経路（npm global / homebrew / 個別 binary）。SCHEMA §4 で `npm i -g defuddle-cli` を first try と記載
- ai-radar の目的 pivot が確定したら wiki/domain/ai-industry/ai-radar-pointer の status を更新
- 事業計画書ドラフト本体（さとしさん打診用、消費者金融 80 万円肩代わり打診の経緯あり）は raw/facts/people/ + situations/ に下準備済、本体起草は未着手

## Conventions
- ファイルサイズ目安: 500 words 以内
- 文体: declarative present tense（「やる」「やった」明示）
- 更新タイミング: ingest 完了後 / 大きな query 合成完了後 / 戦略変更 commit 後 / セッション振り返り完了時
- 全置換更新（追記しない・古い項目は間引く）
