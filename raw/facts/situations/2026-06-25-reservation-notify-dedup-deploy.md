# 民泊アクティビティ予約通知GAS 同一r=重複抑制を本番反映 (2026-06-25)

## 確定事実
- アクティビティ予約通知GASに「**同一 `r=`（dedup_id）の重複メールを1通に抑制**」する変更を本番反映。
- **本番GASは既に「1メール=1通・即時」で稼働していた**＝リポジトリ側の「2分集約」コードは本番未反映の旧版だった（本番は手編集で先行）。今回リポジトリを本番準拠に再同期し、`sent`(dedup_id)シート＋`isSent`/`markSent`＋ingestの重複ゲートのみ最小追加。
- 検証: ビルド出力を本番 pull コードと diff し、差分が意図3点（sentシート/重複ゲート/ui_clearProcessed拡張）のみ＝通知文面・parse・運用関数デグレ無しを確認後 push。

## 運用上の罠・要点（次回GASを触る時）
- **本番 scriptId = `1rDh20SLybIOwRYT_4L1ACgRA03ETCLP9aKVFI-RO3izLGEC_K_OGjN0K`**（beatice0923 所有）。
- ローカル repo の `.clasp.json` は **`1OWxDR4njVNqIPpHKqfL5fAB6Bj7AfM1lysCBOMVx1U6JC72ojrZQ1cIa`（破棄プロジェクト）を指したまま**だった＝push先誤りの罠。`.clasp.json` は gitignore のため、デプロイ毎に本番 scriptId を設定する。
- clasp 操作は **beatice0923 で `clasp login` 必須**（off.me.ton では別アカウント＝対象外）。さらに **beatice0923 で Apps Script API を有効化**要（https://script.google.com/home/usersettings）。pull は通っても push は API 有効化が必要。
- 本番は esbuild バンドル(IIFE) + **top-level の `ui_pollInbox`/`ui_setupTrigger`/`ui_clearProcessed`/`ui_diag`**（GASエディタの実行/トリガーUI用）。リポジトリでは `ui-wrappers.js` を esbuild footer で付与して再現。
- 再テスト時は GASエディタで **`ui_clearProcessed`** 実行で `processed`+`sent` シートをクリア。
- **実メール件名は「【Roopt】アクティビティ予約のご確認」**（[[2026-06-21-reservation-line-notify-deployed]] の「[Roopt] 新しいアクティビティ予約: …」は誤記）。

## 未了
- コードは worktree ブランチ `worktree-reservation-notify-per-activity` にコミット済み・main 未マージ（PR 推奨）。
- 本番反映後の「実テスト予約を1件流して LINE 着信目視」は本人タイミングで未実施（指示によりその直前で停止）。
