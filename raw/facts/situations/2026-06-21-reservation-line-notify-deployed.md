# 民泊予約メール→LINEグループ集約通知 GAS 本番稼働 (2026-06-21)

## 確定事実
- **運用Googleアカウント = beatice0923@gmail.com**（"BEAT ICE"）。Roopt予約メール（送信元 info@roopt.jp / 件名「[Roopt] 新しいアクティビティ予約: …」）はここに届く。
  - 前回セッションで ricetera2410@gmail.com に作りかけたが、それは陸さんが現用していない別アカウントで取り違え。破棄して beatice0923 で作り直した。
- **GAS プロジェクト**（beatice0923所有）scriptId = `1rDh20SLybIOwRYT_4L1ACgRA03ETCLP9aKVFI-RO3izLGEC_K_OGjN0K`
  - エディタ: https://script.google.com/u/5/home/projects/1rDh20SLybIOwRYT_4L1ACgRA03ETCLP9aKVFI-RO3izLGEC_K_OGjN0K/edit
  - 毎分トリガー pollInbox 稼働。Gmail(GMAIL_QUERY)→2分集約→LINE push。
- **通知ログ用スプレッドシート** `reservation-line-notify-log` id = `1JEVBrcWRMU-5dbyHIBoYeqvqRuSEBAy_rkZd7PpMH3Y`
- **LINE公式アカウント**「アクティビティ予約通知」ベーシックID **@287kncst** / Messaging APIチャネル Channel ID 2010459384 / provider=all-good-studio
- 通知先グループの groupId は GASスクリプトプロパティ LINE_GROUP_ID に保持（C で始まる32hex）。長期トークンも LINE_TOKEN に保持。repo には複製しない。
- 動作確認済: トークン+groupId でグループへテスト通知 push 成功(HTTP200)。pollInbox 手動実行エラーなし。

## ハマり/学び
- 新規 Messaging API チャネルは Developers コンソールから直接作成不可（仕様変更）。entry.line.biz で公式アカウント登録→OA Managerで Messaging API有効化が必須。
- グループ通知には OA Manager「グループ・複数人トークへの参加を許可」=有効 が必要。
- **GAS web app の doPost は esbuild バンドルの IIFE 内本体を使う。後付けの `globalThis.doPost = override` は GAS が拾わない** → IIFE 内の doPost 本体を直接書き換える必要があった。
- groupId は webhook(join/message イベント)経由でしか取れない＝Bot招待+グループ発言が物理的に必要。取得後 webhook は OFF（通知フローは trigger+Gmail+push のみで webhook不要・最小権限）。
- GASエディタの実行/トリガーUIは IIFE内+globalThis露出の関数を選択肢に出さない → トップレベル ui_setupTrigger/ui_pollInbox ラッパーを追加した。
- 実行ログUIは console.log 内容をDOMに描画せず読めない → ScriptProperty 経由で値を確認した。
