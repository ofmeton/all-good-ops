---
name: nextjs-supabase-site-gotchas
description: "Next.js(App Router)+Supabase でのサイト/CMS 構築・移植で繰り返し踏むハマり（白紙・空一覧・予約ズレ・404・TZ ズレ）を着手/実装/デプロイ時のチェックリストに型化。Next.js+Supabase でサイトを作る・移植する・別クライアントへ複製する時に使う。"
---

# Next.js + Supabase サイト/CMS 構築 定番ハマりチェックリスト

## 概要
静的サイトの Next.js 化、または Next.js(App Router) + Supabase での CMS/サイト構築で**繰り返し踏むハマり**を、着手時・実装時・デプロイ時のチェックリストに型化したもの。hidamari-cms 構築（2026-06）で実際に踏んだ事象から抽出。**テーマ一元化（他クライアントへ嵌め込むラッピング工程）に組み込む**のが本命用途。

- **いつ**: Next.js + Supabase でサイト/CMS を作る・移植する・別クライアントへ複製する時
- **何のために**: 同じバグ（白紙・空一覧・予約ズレ・404）を二度踏まない

## 着手時（設計）
- [ ] **scroll-reveal 演出の扱い**: 移植元に GSAP/IO の reveal（CSS初期 `opacity:0`→JS表示）があるか。あるなら → ルート変更(`usePathname`依存)で再初期化 + クライアント再描画されるリスト(フィルタ/ページング)は **CSS自己完結アニメ**にして JS reveal に依存させない。`prefers-reduced-motion` で全要素即可視。([[feedback_spa_reveal_reinit]])
- [ ] **公開ページのレンダリング戦略**: 公開読取は **Cookie非依存の anon クライアント**で static/ISR 化（`cookies()` を使うと全動的化＝重い）。更新時は Server Action の `revalidatePath` で即時反映。予約公開を厳密にするなら revalidate 間隔 or Cron を決める。
- [ ] **タイムゾーン**: 日時入力(`datetime-local`)は**サイト固定TZ**(日本なら Asia/Tokyo +09:00)で parse/format する util を**先に**作る。UTCサーバでTZなし文字列を `new Date().toISOString()` すると +9h ズレ。([[feedback_datetime_local_fixed_tz]])

## 実装時
- [ ] **Storage RLS は両ロール**: バケットの SELECT ポリシーを `to anon` と `to authenticated` の**両方**定義。anon だけだと管理画面(authenticated)の `.list()` が空。([[feedback_supabase_storage_rls_both_roles]])
- [ ] **DDL前に実スキーマ Inspect**、migration適用は MCP `apply_migration`（人間確認）。([[feedback_db_migration_pre_inspect]])
- [ ] **管理UIのリンク href は実在ルートと突合**（`/[id]` と `/[id]/edit` の取り違えで404）。
- [ ] **React**: effect 内の同期 setState 禁止（`react-hooks/set-state-in-effect`）。公開画像は `next/image`。
- [ ] **本文HTML(Tiptap等)は sanitize-html** を通して `dangerouslySetInnerHTML`。

## デプロイ時
- [ ] env を Vercel に投入（NEXT_PUBLIC_* は build時インライン）。`vercel env add` の agent mode 破壊バグに注意（新規projectなら安全）。([[feedback_vercel_cli_agent_env_bug]])
- [ ] migration + seed + 管理者アカウント作成（auth.users へ SQL or ダッシュボード）。
- [ ] **デプロイ後は Playwright `browser_evaluate` でDOM/opacity/classを直接検証**（MCPスクショは非永続で往復しがち）。公開ルートの200・実データ反映・認証ガード(307)を smoke。

## サブエージェント駆動で回す時
- 実装者プロンプトに固定制約を埋める（current branch厳守 / build・test・tsc・eslint verify / set-state-in-effect回避 / next-image / commit SHA報告）。([[feedback_subagent_dispatch_verify]])

## 関連
- 案件記録: [[project_hidamari_cms]] / Supabase運用方針: [[project_supabase_consolidation_strategy]]
