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
- 通知は「最初のメール検知から2分後」に1通。
- 重複・複数リクエストは自動で1通に集約。
- 整形できないメールは生本文がそのままLINEに流れる。送信に失敗した場合は未処理のまま残り、次回再試行される。
- 状態シートが予約履歴ログを兼ねる。`status=failed` 行は送信が10回失敗した予約（要手動対応）。
- LINE無料枠は月200通。超過しそうなら有料プラン検討。
