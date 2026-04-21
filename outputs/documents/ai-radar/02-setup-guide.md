# ai-radar セットアップ手順書

**対象**: ユーザー（off.me.ton@gmail.com）
**所要時間**: 合計 60〜90分（ただし各ステップは並列可）
**事前条件**: ChatGPT Plus 契約済み・Codex CLI 利用可能

順に進めて、取得した値を最後に `.env.local` にまとめる。**Step 1〜3 は並列可能**。

---

## Step 1. Gemini API キー取得（所要 5分・無料）

1. https://aistudio.google.com/app/apikey にアクセス
2. Google アカウント（off.me.ton@gmail.com）でログイン
3. 「Create API key」→ 新規プロジェクトを作って発行
4. 発行されたキーをコピー

**無料枠**: Gemini 2.5 Flash は毎分15リクエスト・1日1500リクエストまで無料。ai-radar の想定使用量（1日100-150リクエスト）は完全に無料枠内。

**保存先（後で使う）**:
```
GEMINI_API_KEY=AIza...（コピーしたキー）
```

※ 実際の値は `/Users/rikukudo/Projects/ai-radar/.env.local` に保管済み（2026-04-21 Day1）

---

## Step 2. Anthropic API キー取得（所要 10分・クレカ必要）

1. https://console.anthropic.com/ にアクセス → サインアップ
2. メール認証
3. 左サイドバー → **Billing** → クレジットカード登録＆初期チャージ（最小 $5 から可）
4. 左サイドバー → **API Keys** → **Create Key** → 名前「ai-radar」で発行
5. キーをコピー（二度と表示されないので注意）

**初期チャージ推奨**: **$10**（月1000円想定の約3か月分）

**保存先**:
```
ANTHROPIC_API_KEY=sk-ant-...
```

※ 実際の値は `.env.local` に保管済み

---

## Step 3. Supabase プロジェクト作成（所要 10分・無料）

1. https://supabase.com/ → Sign up with GitHub
2. 「New project」
   - Name: `ai-radar`
   - Database Password: 適当に強いやつ（パスマネに保存）
   - Region: **Tokyo (ap-northeast-1)**
   - Plan: **Free**
3. プロジェクト作成（数分待つ）
4. 左サイドバー → **SQL Editor** → **New query**
5. `./05-schema.sql` の内容を全部貼って → **RUN**
6. エラーがなければ `articles` `sources` 等のテーブルが作成される
7. 左サイドバー → **Project Settings** → **API**:
   - `Project URL` をコピー
   - `anon public` キーをコピー
   - `service_role secret` キーをコピー（**公開厳禁**）

**保存先**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...（バックエンドCronのみ使用）
```

※ 実際の値は `.env.local` に保管済み

**無料枠**: Database 500MB、月Egress 5GB、月APIリクエスト無制限。ai-radar の想定データ量なら1年以上余裕。

---

## Step 4. GitHub リポジトリ作成（所要 3分）

1. https://github.com/new
2. Repository name: **`ai-radar`**
3. Visibility: **Private**（推奨）
4. Initialize: 何もチェックしない（Claudeがローカルから初回プッシュする）
5. **Create repository**
6. 表示されたURL（`git@github.com:ofmeton/ai-radar.git` 等）をメモ

＊表示されたURL
https://github.com/ofmeton/ai-radar.git

---

## Step 5. Vercel プロジェクト作成（所要 5分・無料）

1. https://vercel.com/ → GitHubでログイン
2. 「Add New Project」
3. まだリポジトリが空なので、**Import を一旦スキップ**してOK
4. Day 1 でローカル初期化＆GitHub pushが終わった後に、改めてVercelでImportする

**Day 1 で使う情報**:
- Vercel Account（GitHub連携済み）

---

## Step 6. Gmail API（OAuth2）セットアップ（所要 15-25分・一番面倒）

ai-radar が off.me.ton@gmail.com 宛に通知メールを送るための OAuth2 認証。

### 6-1. Google Cloud プロジェクト作成
1. https://console.cloud.google.com/ → プロジェクト選択 → **新しいプロジェクト**
2. Name: `ai-radar`
3. 作成

### 6-2. Gmail API 有効化
1. 左メニュー → **APIとサービス** → **ライブラリ**
2. 「Gmail API」検索 → **有効にする**

### 6-3. OAuth 同意画面
1. 左メニュー → **APIとサービス** → **OAuth同意画面**
2. User Type: **External** → 作成
3. アプリ情報:
   - アプリ名: `ai-radar`
   - ユーザーサポートメール: off.me.ton@gmail.com
   - デベロッパー連絡先: off.me.ton@gmail.com
4. スコープ:
   - 「スコープを追加」 → `https://www.googleapis.com/auth/gmail.send` を追加
5. テストユーザー: off.me.ton@gmail.com を追加
6. 保存

### 6-4. OAuth クライアントID作成
1. 左メニュー → **APIとサービス** → **認証情報**
2. **認証情報を作成** → **OAuthクライアントID**
3. Application type: **Webアプリケーション**
4. Name: `ai-radar-web`
5. 承認済みリダイレクトURI: `https://developers.google.com/oauthplayground`
6. 作成 → **Client ID** と **Client secret** をコピー

### 6-5. Refresh Token 取得
1. https://developers.google.com/oauthplayground/ にアクセス
2. 右上の歯車 → **Use your own OAuth credentials** チェック → Client ID / Client secret 貼付
3. 左の Scopes に `https://www.googleapis.com/auth/gmail.send` を手入力して **Authorize APIs**
4. off.me.ton@gmail.com で許可
5. **Exchange authorization code for tokens** → `refresh_token` が表示される
6. コピー

**保存先**:
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REFRESH_TOKEN=1//xxxxx
GMAIL_FROM=off.me.ton@gmail.com
GMAIL_TO=off.me.ton@gmail.com
```

※ 実際の値は `.env.local` に保管済み

---

## Step 7. `.env.local` 作成（Day 1 で Claude が生成する）

最終的に以下の形になる。Day 1 に Claude がテンプレート作成→ユーザーが値を埋める:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM APIs
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# Gmail
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GMAIL_FROM=off.me.ton@gmail.com
GMAIL_TO=off.me.ton@gmail.com

# Cron Protection
CRON_SECRET=<Day1でランダム生成してくれる>

# Vercel自動設定
# VERCEL_URL= （自動）
```

Vercel 側の環境変数も Day 1 で同じ値を設定する。

---

## Step 8. Codex worker ローカル常駐（Day 5 で Claude が設定）

ユーザー事前準備:
- `codex` コマンドがターミナルから打てる状態か確認: `which codex`
- 打てない場合: https://github.com/openai/codex → install 手順（ChatGPT Plus ログイン済みなら簡単）

Day 5 に Claude が:
- `scripts/codex-worker.ts` を実装
- `launchd/jp.ofmeton.ai-radar-codex.plist` を配置
- `launchctl load` で常駐化

---

## チェックリスト（ユーザー作業進捗）

- [ ] Step 1: Gemini API キー取得
- [ ] Step 2: Anthropic API キー取得＋$10チャージ
- [ ] Step 3: Supabase プロジェクト作成＋DDL実行
- [ ] Step 4: GitHub リポジトリ作成（Private `ai-radar`）
- [ ] Step 5: Vercel アカウント確認（Import は後で）
- [ ] Step 6: Gmail OAuth2 設定＋Refresh Token取得
- [ ] Step 7: 取得した値をまとめた状態で Day 1 着手を Claude に依頼

全部できたらユーザーから「セットアップ完了」と声をかければ、Day 1 〜 Day 5 を順に実装していく。
