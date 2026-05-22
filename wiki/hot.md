---
type: meta
title: "Hot Cache"
updated: 2026-05-22
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。LLM はセッション開始時に最優先でこれを読む。詳細仕様: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-05-22 — claude-obsidian 部分採用 spec（hot.md / Query Modes / manifest / defuddle）起票・Phase 0-3 まとめて main 反映予定

## Current Focus
- claude-obsidian の 4 機能採用作業中（本ブランチ task/260522-claude-obsidian-adoption）
- 発信ピボット Phase 4 進行中（X / Instagram / note の 3 媒体運用立ち上げ）
- terra-isshiki / minpaku-cleaning 個人案件は 2026-06 末完納に向けて稼働
- ai-radar の目的 pivot 検討中（raw/facts/situations/2026-05-22-ai-radar-purpose-pivot.md 参照）

## Recently Touched
- [[SCHEMA]] (2026-05-22 名義3ライン分離規約撤廃 → claude-obsidian 採用機能追記予定)
- [[index]] (発信戦略反映済、publishing クラスタ active)
- [[../CLAUDE]] (2026-05-22 §名義3ラインの切り分け 削除 + 事実関係表現に緩和)
- [[publishing/log]] (Phase 4 publishing クラスタ初期化済、ingest 履歴蓄積中)
- [[log]] (2026-05-22 名義3ライン撤廃イベント追記)

## Open Questions / Frontiers
- defuddle CLI のインストール経路（npm global / homebrew / 個別 binary）未確定 → spec §4 で `npm i -g defuddle-cli` を first try
- `.manifest.json` の初回バックフィル対象は publishing/inspirations の 5 件 + 過去 ingest 全件
- ai-radar の目的 pivot が確定したら wiki/domain/ai-industry/ai-radar-pointer の status を更新

## Conventions
- ファイルサイズ目安: 500 words 以内
- 文体: declarative present tense（「やる」「やった」明示）
- 更新タイミング: ingest 完了後 / 大きな query 合成完了後 / 戦略変更 commit 後 / セッション振り返り完了時
- 全置換更新（追記しない・古い項目は間引く）
