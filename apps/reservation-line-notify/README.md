# reservation-line-notify

宿のGmailに届くアクティビティ予約通知を、1予約=1通に集約してLINEグループへ通知するGASアプリ。

設計: `../../docs/superpowers/specs/2026-06-18-minpaku-reservation-line-notify-design.md`

## 開発
```bash
npm install
npm test        # core純関数のテスト
npm run build   # dist/Code.js を生成
```

## 初期セットアップ（1回・宿のGoogleアカウントで）
1. LINE Developers で Messaging API チャネル（公式アカウント）を作成。チャネルアクセストークン（長期）を発行。
2. 公式アカウントを通知先 LINE グループに招待。
3. groupId 取得: Webhook を一時的に GAS WebApp（`doPost`）に向け、グループで1回発言→ログの `source.groupId` を控える。取得後 Webhook は不要。
4. 通知履歴用スプレッドシートを新規作成し、その ID を控える。
5. GASプロジェクト作成→ `clasp create` 後 `.clasp.json.example` を `.clasp.json` にコピーし scriptId 記入。
6. ScriptProperties を設定（GASエディタ or `clasp`）:
   - `LINE_TOKEN` = チャネルアクセストークン
   - `LINE_GROUP_ID` = 手順3のgroupId
   - `SHEET_ID` = 手順4のシートID
   - `GMAIL_QUERY` = 実物メールに合わせる。例:
     `from:(roopt) subject:(アクティビティ予約) newer_than:7d`
7. `npm run push` で dist を反映。
8. GASエディタで `setupTrigger` を1回実行 → 1分毎トリガー登録。
9. `pollInbox` を手動実行し権限承認＆動作確認。

## 運用
- **アクティビティ（メール）1件 = LINE 1通**。集約はせず、検知次第その場で即送信（毎分ポーリングのため実質最大1分以内）。
- 1予約で複数アクティビティをリクエストすると、リクエスト数ぶん（最大3通）のメールが届き、**それぞれ別々に通知**される。
- **まったく同じ重複メール（同一 `r=` 値）は1通だけ通知**（送信済み `dedup_id` で冪等排除）。
- 整形できないメールは生本文がそのままLINEに流れる。送信に失敗した場合は未処理のまま残り、次回再試行される。
- 状態シート: `processed`（取り込み済み message_id）/ `sent`（送信済み dedup_id）。再テスト時は GASエディタで `ui_clearProcessed` を実行すると両シートをクリアできる。
- LINE無料枠は月200通。アクティビティ単位の通知になるため、複数リクエストの多い月は通数が増える点に注意。
