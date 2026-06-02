# Deploy 後フォローアップ ハンズオン（人間タスク 2 件）

> 作成: 2026-06-02 by Claude
> 前提: Worker は本番 deploy 済（`https://ofmeton-x-account.off-me-ton.workers.dev` / cron 稼働 / PHASE=1）
> このページの 2 件を済ませると、承認フロー（draft→LINE）と DB 永続化が動く

---

## タスク 1: LINE Webhook URL 設定（承認フロー有効化）

これで「投稿 draft が LINE に届き、approve/reject で公開判断」できるようになる。

### 手順

1. **LINE Developers Console** を開く → https://developers.line.biz/console/
2. 該当の **Provider** → 該当の **Messaging API チャネル**（公式アカウント）を選択
3. 上タブ **「Messaging API」** を開く
4. 下にスクロール → **「Webhook settings」** セクション
5. **「Webhook URL」** の **Edit** を押し、以下を貼り付けて **Update**:
   ```
   https://ofmeton-x-account.off-me-ton.workers.dev/line/webhook
   ```
6. **「Verify」** を押す → **Success** が出れば疎通 OK
7. **「Use webhook」** のトグルを **ON**
8. （同画面の「LINE Official Account features」側で）**「応答メッセージ」OFF / 「Webhook」ON** になっているか確認
   - 自動応答が ON だと bot 応答と干渉するため OFF 推奨

### ✅ 完了判定
- Verify が Success
- Use webhook = ON
- （疎通後）LINE に承認リクエストが届くことを Claude が live 検証

### 詰まったら
- Verify が失敗 → URL の末尾 `/line/webhook` を再確認。Worker は POST のみ受ける（GET でブラウザ直アクセスは 404 で正常）
- チャネルが複数ある場合は、`.env.local` の `LINE_CHANNEL_ACCESS_TOKEN` を発行したチャネルを選ぶこと

---

## タスク 2: Supabase で `xad` schema を公開（DB 永続化・最重要）

migration は `xad` schema にあるが、PostgREST（Supabase の REST API）はデフォルトで `public` しか公開しない。`xad` を公開しないと、`SUPABASE_SCHEMA=xad` を入れても DB 操作が空振りし、in-memory にフォールバック → **cron 跨ぎで状態が消える**（failure_story cap カウント / optimizer 学習 / attribution が壊れる）。

### 手順

1. **Supabase Dashboard** を開く（該当 project に直リンク）:
   ```
   https://supabase.com/dashboard/project/hofvvcvhjslevymhbcqj/settings/api
   ```
   （= Dashboard → project `ofmeton-apps` → Settings → **API**）
2. **「Data API Settings」**（または「API Settings」）セクションを探す
3. **「Exposed schemas」** という複数選択フィールドを見つける
   - デフォルトは `public`, `graphql_public` が入っている
4. ここに **`xad` を追加**（ドロップダウンから選ぶ or 入力）
5. （あれば）**「Extra search path」** にも `xad` を追加しておくと確実
6. **「Save」** を押す（反映に十数秒）

### ✅ 完了判定
- Exposed schemas に `xad` が表示されている
- 保存後、Claude が `xad.materials_store` 等への接続を live 再検証 → ✅ rows カウントが返る

### 詰まったら
- フィールドが見当たらない → Supabase UI 改版で名称が変わっている場合あり。「Exposed schemas」「schemas」で画面内検索
- 保存しても反映しない → 数十秒待つ or ページ再読込（PostgREST の再起動待ち）

---

## 2 件終わったら

Claude に「webhook と xad やった」と伝えてください。以下を live 検証します:
- `xad.*` テーブルへの接続（rows 取得）
- Daily Digest を手動トリガー → LINE 着信確認
- （任意）draft 生成 1 本 → LINE 承認リクエスト着信 → approve/reject 動作確認

参照: `raw/facts/situations/2026-06-02-xad-worker-deployed.md` / schema fix = PR #52
