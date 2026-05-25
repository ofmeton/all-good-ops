# X OAuth 2.0 PKCE 実機テスト チェックリスト (v10.2 §3.5 / CR-4)

Phase 1 着手前に **このリストを全項目 ✅ にする** こと。1 件でも fail したら Phase 1 X launch 不可。

---

## 前提準備 (人間タスク)

- [ ] X Developer Console (https://developer.x.com/) に登録
- [ ] Project + App 作成、User authentication settings で OAuth 2.0 を ON
- [ ] App type: **Web App, Automated App or Bot** (Public Client、PKCE)
  - Confidential Client (= client_secret 配布) を選んだ場合は基本認証ヘッダを Authorization に使う
- [ ] App permission: **Read and write**
- [ ] Callback URI に `http://localhost:3000/oauth/x/callback` を追加 (本番では本物の URL)
- [ ] Scopes: `tweet.read tweet.write users.read offline.access` を許可
- [ ] **Client ID + Client Secret** を取得 → `.env.local` の `X_CLIENT_ID` / `X_CLIENT_SECRET` にセット

---

## Step 1. 認可フロー (PKCE)

```bash
cd apps/x-account-system
npm install                 # 初回のみ
tsx lib/oauth/pkce-test.ts --step=authorize
```

- [ ] **stdout に `authorizeUrl` が出力される**
- [ ] URL をブラウザで開き、X アカウントでログイン後「Authorize app」をクリック
- [ ] callback URL に `?code=<authorization_code>&state=<state>` がついて redirect される (URL に code が現れれば OK、エラー画面ならアプリの redirect URI 設定確認)
- [ ] stdout に出力された **verifier (`code_verifier`)** をメモ (Step 2 で使う)

## Step 2. Token 取得 (offline.access scope 確認、CR-4 必須)

```bash
tsx lib/oauth/pkce-test.ts --step=token \
  --code=<authorization_code> \
  --verifier=<code_verifier>
```

- [ ] stdout で `"ok": true` が出る
- [ ] stdout で `"hasRefreshToken": true` が出る ← **NG なら offline.access scope 不在、Step 1 からやり直し**
- [ ] stdout で `"scopes"` に `offline.access` が含まれる
- [ ] `accessTokenPreview` / `refreshTokenPreview` が出力される
- [ ] `.env.local` に `X_ACCESS_TOKEN` / `X_REFRESH_TOKEN` をセット (PR には乗せない)

## Step 3. Refresh Token Rotation (2 回連続)

```bash
tsx lib/oauth/pkce-test.ts --step=refresh \
  --refresh-token=<refresh_token> \
  --rounds=2
```

- [ ] stdout で `"allOk": true`
- [ ] `trail` の各 round で `ok: true` かつ `newRefresh` が **毎回違う値** (rotation 確認)
- [ ] `finalRefreshTokenPreview` を `.env.local` に上書き保存

**fail 時の対処**:
- 401 → offline.access scope 未取得 (Step 1 やり直し)
- 400 invalid_grant → refresh_token が既に使われた (rotation 後の古い token は使えない)

## Step 4. non_public_metrics 取得 (PCR 算出に必須、p2-a567 反映)

```bash
# 自分の最近の投稿を 1 件用意 (X UI から ID をコピー)
tsx lib/oauth/pkce-test.ts --step=metrics \
  --access-token=<access_token> \
  --tweet-id=<tweet_id>
```

- [ ] stdout で `"ok": true`
- [ ] `sampleFields` に `user_profile_clicks` が `number` 型で含まれる
- [ ] `url_link_clicks` も number で取れる (URL 付き投稿の場合)

**fail 時の対処**:
- 403 → user context でない (Bearer Token 単体不可、必ず OAuth 2.0 PKCE 経由)
- 401 → access_token expired (Step 3 で refresh)

## Step 5. Auth Blocked 通知 path 確認

```bash
tsx lib/oauth/pkce-test.ts --step=auth-blocked-dry-run
```

- [ ] stdout で `"notify_via_line": true` の payload が出る
- [ ] 本番運用時はこの payload を LINE Messaging API で送る + Supabase `auth_blocked` フラグ更新 + 投稿 cron 停止

---

## 完了条件

- 上記 Step 1〜5 が **すべて ✅**
- `.env.local` に `X_CLIENT_ID` / `X_CLIENT_SECRET` / `X_ACCESS_TOKEN` / `X_REFRESH_TOKEN` がセット済
- `data/oauth-test-result.json` (任意) に Step 1〜5 のログを保存

完了したら Phase 1 X launch (人間承認つき 1 投稿/日) に進める。
