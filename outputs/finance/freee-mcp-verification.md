# freee MCP 動作確認チェックリスト

新セッション (Claude Code 再起動後) で以下を順に確認する。

## A. MCP ツール露出の確認
1. 新セッション開始
2. プロンプトで「freee MCP のツールが見えるか教えて」と質問
3. `mcp__freee__list_invoices` 等が一覧に出ていれば OK

## B. 参照系の最小コール (READ のみ・課金/外部送信なし)
1. 「`mcp__freee__list_invoices` を1件だけ取得して」と依頼
2. レスポンスに `id` / `partner_name` / `total_amount` 相当のフィールドが返ってくれば OK
3. エラー時 (401 等) は `npx -y freee-mcp configure` を再実行

## C. 取引先一覧の確認
1. 「`mcp__freee__list_partners` で先頭 5 件を取得して」と依頼
2. freee 画面で見える取引先と一致すれば OK

## D. Secret rotate (24h 以内)
1. freee アプリ画面 (https://app.secure.freee.co.jp/developers/) で対象アプリの Client Secret を「再発行」
2. ターミナル `Terminal.app` で `npx -y freee-mcp configure` を再実行
3. 新 Secret で OAuth フロー完了後、再度 A〜C を実施

## 完了判定
- A〜D 全て OK で本連携の運用開始
- 失敗時は `docs/superpowers/specs/2026-05-09-freee-invoice-mcp-design.md` の section 8 リスク表を参照
