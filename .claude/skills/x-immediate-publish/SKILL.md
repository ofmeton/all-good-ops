---
name: x-immediate-publish
description: X発信システム(apps/x-account-system)の承認済みストック(xad.post_drafts: human_approval_status='approved' かつ scheduled_for IS NULL かつ published_at IS NULL)を、ログイン済みChromeをchrome-devtools MCPで操作して「今すぐ」公開する半自動の即時投稿フロー。X公式の予約UIではなく通常投稿コンポーザで「ポストする」即時公開し、scheduled_for は使わず published_at のみ記録する。X API直投はしない(source=本人クライアント維持)。ユーザーが「今すぐ投稿して」「これを今ポストして」「即時で出して」「予約じゃなく今出して」等と依頼したとき起動する。翌日以降へ予約する場合は x-scheduled-publish を使う。
---

# x-immediate-publish — 承認済みストックの半自動「今すぐ投稿」

承認済みストックを予約せず今すぐ公開する即時モード。Claude が chrome-devtools で通常投稿コンポーザを操作し「ポストする」で即時公開、source=本人クライアントを保つ。X API直投はしない。予約（翌日以降ピーク帯）は x-scheduled-publish スキル。違い: chrome手順=通常コンポーザ「ポストする」/ 記録=published_at のみ(markPublished)。

## 前提（接続）
chrome接続前提は x-scheduled-publish と同一（個人Chromeアタッチ・remote debugging 有効化・作業後無効化、memory reference_chrome_devtools_mcp.md）。接続不可なら依頼して中断。

## 手順
1. 対象選択（read-only）: `cd apps/x-account-system && npx tsx scripts/publish-now.ts`（一覧）/ `--id <id>`（ハンドオフ）。dashboard なら /publish の「今すぐ投稿」。DBへ書かない。
2. 人間ゲート（必須）: 即時投稿=取り消せない公開。本文/メディア/riskを提示し1件ずつOKを取る。
3. chrome即時投稿（予約UI不使用）: new_page で x.com/compose/post →（写真は先に fetch-draft-media.ts でDL→upload_file）→ 空textboxに type_text で本文（fill不可）→ button「ポストする」（「予約設定」は押さない）→ 一時ファイル cleanup。
   - **スレッド draft（🧵）の場合**（`publish-now.ts --id` 出力に「🧵スレッドN本」が出る／`thread_bodies` あり）: 連続ツイートで投稿する。①空textboxに type_text で **1本目**（フック）を入力 → ②「ポストを追加」(+) ボタンで次のツイート枠を増やす → ③**追加された空エディタ**に type_text で次のツイート（**空エディタ必須**・fill不可・既存テキスト混在は文字化け＝Draft.js注意は単発と同様） → ④残り本数ぶん ②③を繰り返す → ⑤button「すべてポストする」で一括即時投稿。写真は基本1本目に添付。`publish-now.ts --id <id>` のハンドオフが各ツイート全文（番号付き）と手順を出すのでそれに従う。
4. published_at 確定: dashboard /publish の「投稿済みにする」（markPublished・published_at IS NULL 冪等・二重押下no-op）。scheduled_for は書かない。スレッドも親ツイートの公開で1 draft=1 published 扱い。

> dashboard /publish と publish-now.ts は整形・ハンドオフ・published_at記録のみ。X API は一切叩かない（実投稿は chrome=本人クライアント。x-publisher.ts Gate 5.5 直投封印・X_DIRECT_API_ENABLED 不変更）。

## 関連
- 予約モード: x-scheduled-publish / dashboard: apps/xad-dashboard/app/publish/ / CLI: scripts/publish-now.ts / 写真DL: scripts/fetch-draft-media.ts
