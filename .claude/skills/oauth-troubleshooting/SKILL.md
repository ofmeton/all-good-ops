---
name: oauth-troubleshooting
description: "OAuth プロバイダ（Meta/Google Cloud/Stripe/Vercel/Supabase 等）の認証エラー・TOPページ表示エラーの定型対処。「アクセス権がありません」「ログインできない」「TOP が開かない」等のエラーが報告された時に使う。"
---

# OAuth トラブルシューティング

## 概要

OAuth プロバイダ (Meta Developers, Google Cloud Console, Stripe Dashboard, Vercel, Supabase 等) で認証エラー / TOP ページ表示エラーが報告された時の **定型対処** を提供する。

- **誰が**: メインセッション / system-engineer / secretary
- **いつ**: 「アクセス権がありません」「ログインできない」「TOP が開かない」「この機能はまだ利用できません」等のエラーが報告された時
- **何のために**: 原因切り分けに 3 ターン消費するパターンを 1 ターンで終わらせる

## トリガー（自然文例）

- 「Meta Developers にアクセスできない」
- 「Vercel Dashboard でログインできない」
- 「Google Cloud Console でエラーが出る」
- 「アクセス権がありません と表示される」
- OAuth プロバイダ名 + 「開かない」「エラー」

## 三段構え（最初の応答で全部出す）

### 第 1 段: シークレットウィンドウで切り分け

```
同じ URL をシークレットウィンドウ (Chrome: ⌘+Shift+N / Safari: ⌘+Shift+N) で開いてみてください。
```

**目的**: 拡張機能・キャッシュ・Cookie の影響を切り分け。シークレットで通れば「2 か 3 が原因」と確定 → 第 2 段へ。

### 第 2 段: 対象ドメインの Cookie 削除

シークレットで通った場合の本命対処。ブラウザ別:

#### Chrome / Arc / Edge / Brave (Chromium 系)
```
chrome://settings/cookies/detail?site=<DOMAIN>
```
を URL バーに直接入力 → 「すべて削除」or ゴミ箱アイコン

ドメインが複数の場合は個別に: 例 Meta Developers なら `facebook.com` + `developers.facebook.com` 両方

#### Safari
1. メニューバー Safari → 設定 (⌘,)
2. プライバシー → 「Web サイトデータを管理…」
3. 検索ボックスに対象ドメイン → ヒット全件選択 → 削除

#### Firefox
1. URL バーに `about:preferences#privacy` を入力
2. Cookie とサイトデータ → 「データを管理…」
3. 検索 → 削除

削除後は **ブラウザ完全終了** (⌘Q) → 再起動 → 対象ドメイン再ログイン。

### 第 3 段: 拡張機能を 1 つずつ OFF

Cookie 削除でも改善しなければ:

優先順位 (上から OFF してみる):
1. uBlock Origin
2. Privacy Badger
3. AdGuard
4. Ghostery
5. EasyPrivacy / EasyList 系
6. ScriptSafe / NoScript

トラッキング系拡張は OAuth の internal redirect (auth → callback → redirect) を切ることがある。

## 補足

- VPN 利用中なら一旦 OFF (VPN 経由の地域制限ヒットが原因のこともある)
- 古い Facebook / Meta アカウントは「Soak Period」(冷却期間、新規アカウント数日間制限) あり、その場合は 1-2 日待ち
- 二段階認証 (2FA) が要求される系 (Google / Meta) は 2FA セット必須

## 関連

- memory: `feedback_oauth_browser_isolation.md`
