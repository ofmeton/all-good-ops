---
type: meta
title: "Hot Cache"
updated: 2026-06-11
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-11 — **BEAT ICE 労働保険 年度更新の e-Gov 電子申請を伴走**（実務支援）。申告書到着→業種=飲食小売0.3%確定（印字）→暫定精算 納付¥2,809→Mac向けe-Govハンズオン改訂→入力支援（住所エラーは連絡先欄のダッシュ）。冴希さんGビズIDプライムで申請。アクセスコード等は [[../memory/project_rice_cream_shop]] / raw `2026-06-11-beatice-labor-insurance-egov-filed`。
直前 — **xad キュレ/承認/投稿 7機能追加・本番反映完了**（PR#162）。設計=architect(Fable)→4並列system-engineer→pr-review-toolkit→migration0025-27 apply/worker deploy/dashboard deploy/DB層smoke。①執筆送信時に推薦自動選択 ②手動投稿済み化 ③承認済み破棄(論理) ④指示文つき修正依頼→即再執筆 ⑤修正依頼でformat/template再選+推薦 ⑥今すぐ投稿で全文表示 ⑦スレッド投稿(即時のみ・予約非対応)。`post_drafts.thread_bodies`+RPC3本(set_selection_status_items/discard_approved_drafts/request_draft_revision)。前段=optimizer自己改善ループ全段完成(Stage4・PR#153/154)。詳細 [[../memory/project_x_optimizer_redesign]]。

## Current Focus
- **xad 新機能の実UI確認**: dashboard はログイン後に7機能を一巡確認（SSO配下でCLIからは実画面検証不可・DB層は健全確証済）。
- **optimizer 運用フェーズ**: dashboard `/proposals` で accept → tier-T は worker、config/prompt は `npm run apply-code`(skill `x-optimizer-apply-code`)。可逆(`--rollback`)。
- **apply-code runner hardening（次回運用時）**: `mergePr --delete-branch` / 実行時 PATH 明示 / Docker sandbox。
- **X発信 段階1-1C（残）**: 定義編集UI→段階2承認/投稿UX→段階3。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で委譲先消失 → 名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/xad-dashboard/app/{curation,approval,publish}`・`app/api/{curation/select,drafts/revise,drafts/discard,drafts/update}`・`lib/{curation,drafts,publish}-queries.ts`・`app/components/{FmatTemplatePicker,useRecommendations}`・`lib/thread-logic.ts`
- `apps/x-account-system/lib/curation/{run-compose,compose-prompts,thread}.ts`・`scripts/{publish-now,plan-scheduled-publish}.ts`・`src/worker.ts`
- migration `0025_selection_per_material`/`0026_draft_lifecycle`/`0027_thread_support`（本番適用済）
- `.claude/skills/x-{immediate,scheduled}-publish/SKILL.md`（スレッド手順追記）
- [[../outputs/retrospectives/2026-06-11-1556-xad-curation-approval]]
- 労働保険: `outputs/clients/rice-cream/2026-06-09-労働保険-年度更新-記入ガイド.md`・Notion(説明ガイド+e-Govハンズオン)・[[../outputs/retrospectives/2026-06-11-1200-rice-cream-labor-insurance-egov]]

## Open Questions / Frontiers
- nested `claude -p` 起動は permission-mode acceptEdits + secret unset + PATH明示（memory [[headless-claude-subprocess]] / wiki 原則7）
- 外部CLI(claude/gh/wrangler)を含む経路は dry-run と別に単発 smoke を先に
- deploy系の連続 Bash は毎回 `cd <abs> && ...`（cwd reset hook・既存 [[bash-cwd-persistence]] 未適用で npm ci 空振り再発）
- `taskcreate-threshold` は retire（6連続open・ワークフロー不適合）。harness reminder 任せ
- 重い MA/opus は `timeoutMs` 明示／学習系は本番に燃料(実データ)があるか先に確認

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
