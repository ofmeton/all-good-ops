# Phase 1 launch ハンズオン手順書 (H-1 〜 H-10)

> 起案: 2026-05-27
> 目的: ofmeton が 2-3 時間 (split sessions OK) で X+note Phase 1 soft launch (6/8) gate を全通過する
> 上流 SSOT:
> - `apps/x-account-system/HUMAN_TASKS.md` (H-1〜H-15 全量)
> - `outputs/improvements/x-account-design-consolidated/launch-roadmap.md` (段取り)
> - `apps/x-account-system/.env.example` (key 名一覧)

---

## 0. 全体スケジュール

| Day | Task | 所要 | 種別 |
|---|---|---|---|
| **Day A** (5/28-5/29) | H-1 + H-2 + H-3 (Anthropic コピー) + H-5 + H-10 | 集中 2-3h | X launch コア gate |
| **Day B** (5/30) | H-4 (or skip 判断) + H-7 (twitterapi.io コピー) | 30m | cron 基盤 + 海外バズ |
| **Day C** (〜6/3) | H-8 (note 購読 / domain / LINE 友達導線) | 2-3h | owned channel |
| **Day D** (〜6/4) | H-3 後半 (OpenAI 取得) | 30m | Visualizer (Phase 1 中盤で要) |
| **Day E** (〜6/20) | H-6 (Meta App Review、Phase 1 中盤) | 1-2h + 承認待ち 5-14 日 | IG launch gate (X とは独立) |

### 0.1 X launch (6/8) gate

H-1 + H-2 + H-3 (Anthropic 部分) + H-5 + H-8 + H-10 が ✅ で **Phase 1 X soft launch 可能**。
H-4 / H-7 は Phase 1 着手中、H-6 は Phase 1 中盤 IG 追加時、H-9 は new client 増えた時のみ。

### 0.2 既存資産流用 (再取得不要)

money-bot/.env.local に既存。Claude が H-N 完了時に **コピー操作のみ** 実施 (人間操作ゼロ)。

| key | 流用元 | 流用先 H-N |
|---|---|---|
| `ANTHROPIC_API_KEY` | money-bot/.env.local | H-3 前半 |
| `TWITTERAPI_IO_KEY` | money-bot/.env.local | H-7 |
| `LINE_CHANNEL_ACCESS_TOKEN` | money-bot/.env.local | H-5 (Phase 0.5 推奨) |
| `LINE_CHANNEL_SECRET` | money-bot/.env.local | H-5 (Phase 0.5 推奨) |
| `LINE_TO_USER_ID` (→ `LINE_USER_ID_OFMETON`) | money-bot/.env.local | H-5 (Phase 0.5 推奨) |

---

## 1. H-1: X Developer Console + OAuth 2.0 PKCE (60-90 分)

### 1.0 流用可否
- 既存資産流用: **なし**
- 完全新規取得。Premium Basic 加入 (¥1,000/月) も必須。

### 1.1 前提

- X 個人アカウント (@ofmeton) でログイン可能な状態
- 支払い手段 (クレカ等) 登録済み
- Premium Basic 未加入なら最初のステップで加入

### 1.2 手順

▶ Step 1: Premium Basic 加入確認
- https://x.com/i/premium_sign_up にアクセス
- 既加入なら skip。未加入なら **Basic ¥1,000/月** で加入 (¥980 表記の場合あり)
- ✅ Step 1 完了判定: x.com Settings → Premium に「Basic」と表示される

▶ Step 2: Developer Portal にログイン
- https://developer.x.com/ にアクセス
- 「Sign up」 or 「Log in」 で @ofmeton アカウントで入る
- 初回は Use Case 質問に answer (「Building tools for myself」推奨)
- ✅ Step 2 完了判定: Developer Portal の Dashboard 画面に到達

▶ Step 3: Project + App 作成
- Dashboard → 「Add Project」または既存 Default Project を使う
- Project 名: `ofmeton-x-account-system` (任意)
- App 名: `ofmeton-x-publisher` (任意、世界一意の必要あり)
- App type: **Web App, Automated App or Bot** を選択
- ✅ Step 3 完了判定: App の「Keys and tokens」タブが見える

▶ Step 4: User authentication settings
- App 詳細 → 「User authentication settings」→ 「Set up」
- OAuth 2.0: **ON**
- Type of App: **Confidential client** (推奨。Client Secret あり)
- App permissions: **Read and write**
- 📝 入力欄 (Callback URI / Redirect URL):
  ```
  http://localhost:3000/oauth/x/callback
  ```
- 📝 入力欄 (Website URL): `https://ofmeton.com` (未取得なら `https://x.com/ofmeton`)
- 📝 入力欄 (Scopes): 以下を全部 check
  - `tweet.read`
  - `tweet.write`
  - `users.read`
  - `offline.access` ← **必須**。外すと refresh token が返らない
- 「Save」をクリック
- ✅ Step 4 完了判定: settings save 完了後の確認画面で Client ID/Secret が表示される

▶ Step 5: Client ID + Client Secret を控える
- 表示されたら即座に password manager (1Password / macOS Keychain 等) に保存
- 📝 控える値:
  - `X_CLIENT_ID=` (例: `bXl...` で始まる短めの文字列)
  - `X_CLIENT_SECRET=` (英数記号 50 文字以上)
- ⚠️ Client Secret は **一度しか表示されない**。控え忘れたら regenerate 必要
- ✅ Step 5 完了判定: 上記 2 値が手元にある

▶ Step 6: (任意) Bearer Token / Access Token / Refresh Token は **取得不要**
- Phase 0.5 では `lib/oauth/pkce-test.ts` (Claude 実装済) が PKCE flow で取得する
- Step 5 までで H-1 の人間タスクは完結

### 1.3 取得値の Claude への引き渡し

```
[H-1 完了]
X_CLIENT_ID=<Step 5 で控えた Client ID>
X_CLIENT_SECRET=<Step 5 で控えた Client Secret>
```

Claude が `.env.local` に投入 → `npm run oauth:test -- --step=authorize` で PKCE flow 動作確認まで自動。

### 1.4 詰まった場合のトラブルシューティング

- **「App permissions が Read only から変更できない」** → User authentication settings を一度「Save」した後、再度開き直す。それでもダメなら新しい App を作り直す方が早い
- **「Callback URI が saved されない」** → URI 末尾の `/` を消す。`localhost:3000/oauth/x/callback` に `/` 末尾なしで再入力
- **「Premium Basic 加入が反映されない」** → 加入後 5-10 分待つ。それでもダメなら x.com で一度ログアウト・再ログイン
- **「Free tier で OK では？」** → ❌ NG。Free tier は API write access なし。Basic (¥1,000/月) で `POST /2/tweets` 100 投稿/月の枠が解放される

### 1.5 想定外 / リスク

- ⚠️ **Premium Basic は post API 100/月制限**。Phase 1 は 1 投稿/日 = 30 投稿/月で収まるが、月末重複や retry で接近する可能性あり。Daily Digest で残量監視する
- ⚠️ **App suspended になる** ケースあり (自動投稿は規約準拠でも誤検知あり)。新規 App では最初の 1 週間は手動 dry-run で投稿パターンを馴染ませる方針

---

## 2. H-2: Supabase project 作成 + migration apply (60-90 分)

### 2.0 流用可否
- 既存資産流用: **なし** (民泊清掃 cdqtypyasyhwbpuibhtb は別用途、共用 NG)
- ⚠️ Free tier 同時 2 project まで。現在 1/2 使用中

### 2.1 前提

- Supabase 既存アカウント (民泊清掃で作成済の はず)
- 現在 Free tier project 数を要確認 (list_projects 結果で 1/2 想定)

### 2.2 手順

▶ Step 1: 既存 project 数の確認
- https://supabase.com/dashboard にログイン
- 左サイドバー上部の組織名クリック → All projects
- ✅ Step 1 完了判定: project 数が 1 (民泊清掃のみ) であることを確認
- ⚠️ 既に 2 つあるなら → 代替案へ (§2.5 参照)

▶ Step 2: 新規 project 作成
- 「New project」をクリック
- 📝 入力欄:
  - Name: `ofmeton-x-account`
  - Database Password: ランダム強パスワード生成 → password manager 保存
  - Region: **Tokyo (ap-northeast-1)** (lowest latency)
  - Pricing Plan: **Free**
- 「Create new project」クリック → 数分待つ
- ✅ Step 2 完了判定: Dashboard top が「Setting up your project...」から table editor が見える状態に変わる

▶ Step 3: pgvector extension Enable
- 左サイドバー: Database → Extensions
- 検索欄に `vector` と入力
- `vector` (pgvector) の右側トグルを ON
- ✅ Step 3 完了判定: vector extension の status が「enabled」表示

▶ Step 4: API keys 取得
- 左サイドバー: Project Settings → API
- 📝 控える値 3 つ:
  - `SUPABASE_URL` (例: `https://abcdefghij.supabase.co`)
  - `SUPABASE_ANON_KEY` (anon public key、`eyJ...` で始まる JWT)
  - `SUPABASE_SERVICE_ROLE_KEY` (service_role key、同じく JWT、`secret` ラベルつき)
- ⚠️ service_role key は **絶対に公開しない** (RLS bypass 可能、漏れたら DB 全 access)
- ✅ Step 4 完了判定: 3 値が手元にある

▶ Step 5: Database password を控える
- Step 2 で生成したパスワードを password manager に保存済みであることを確認
- ✅ Step 5 完了判定: password が再現可能

▶ Step 6: migration 0001-0005 apply
- 左サイドバー: SQL Editor → 「New query」
- ⚠️ migrations は Claude 側で apply するため、**人間タスクは Step 5 まで**。
- Claude が `migrations/0001_materials_store.sql` 〜 `0005_*.sql` を順次 apply する
- 📝 (Claude 側で実施) Roles 作成: `human_admin` / `writer_agent` / `editor_agent` / `publisher_agent`
- ✅ Step 6 完了判定: Claude から「migrations 0001-0005 apply 完了」報告を受領

### 2.3 取得値の Claude への引き渡し

```
[H-2 完了]
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<eyJ... の JWT>
SUPABASE_SERVICE_ROLE_KEY=<eyJ... の JWT (secret)>
SUPABASE_DB_PASSWORD=<Step 2 で生成したパスワード>
```

Claude が `.env.local` 投入 → migration 0001-0005 apply → roles 作成 → 接続テスト まで自動。

### 2.4 詰まった場合のトラブルシューティング

- **「Region に Tokyo が出ない」** → Free tier 利用者の region 制限。Singapore (ap-southeast-1) で代替。latency +30ms 程度
- **「project creation で stuck」** → 5 分待っても進まなければ tab 閉じて再ログイン。Dashboard に project が出来てる可能性あり
- **「pgvector enable が grey out」** → Free tier でも使えるはず。一度 sign out → 再 sign in
- **「migration apply で permission denied」** → SQL Editor は service_role で動くため通常 OK。`set role human_admin;` 等を仕込んでいる migration がエラーになるなら roles 先作成が必要

### 2.5 想定外 / リスク + 代替案

- ⚠️ 既に Free tier 2 project 使用中の場合の代替案:
  - **A**: 民泊清掃を Hobby tier ($25/月) に昇格、x-account-system は Free
  - **B**: x-account-system だけ Hobby ($25/月)、民泊清掃は Free 据え置き
  - **C**: Phase 0.5 は in-memory fallback で動かし、Phase 1 launch 直前 (6/7) に provision (推奨。$25/月を 1 ヶ月遅らせられる)
- ⚠️ Free tier は 1 週間 inactive で auto-pause → 月 1 で必ず投稿 or 起動が必要 (Phase 1 = 毎日投稿なので問題なし)
- ⚠️ Free tier は DB 容量 500MB、ストレージ 1GB。Phase 1 month-2 で残量チェック

---

## 3. H-3: API keys (Anthropic + OpenAI) (15 分 + 30 分)

### 3.0 流用可否
- **Anthropic: 既存資産流用あり** (money-bot/.env.local から Claude が cp 操作のみ)
- **OpenAI: 新規取得必要** (Phase 0.5 後半 6/4 までで OK)

### 3.1 前提

- money-bot/.env.local に `ANTHROPIC_API_KEY` が存在することを Claude が確認済
- OpenAI 個人アカウント (off.me.ton@gmail.com) でログイン可能

### 3.2 手順 (Anthropic 部分)

▶ Step 1: Claude に流用依頼
- ofmeton から「H-3 前半 (Anthropic) Claude で流用して」と一言
- Claude が以下を自動実行:
  1. `cat ~/Projects/private-agents/money-bot/.env.local | grep ANTHROPIC_API_KEY` で値取得
  2. `apps/x-account-system/.env.local` に同じ値を投入
  3. 月予算 cap の現在値を Anthropic Console で確認 (これは人間操作必要、Step 2 へ)
- ✅ Step 1 完了判定: Claude から「ANTHROPIC_API_KEY 流用完了」報告

▶ Step 2: Anthropic Console で月予算 cap 確認・設定
- https://console.anthropic.com/ にログイン
- Settings → Limits → Monthly spend limit
- 📝 現在値を確認、未設定なら **¥10,000 (≒ $65 USD)** で設定
- ⚠️ 月予算 ¥10,000 は x-account-system 専用なら超えうる (money-bot と共用なので余裕大)。¥10,000 はあくまで x-account-system 内の cost-model 基準で、Console 側の monthly limit は ¥30,000 程度に設定しておく方が安全
- ✅ Step 2 完了判定: monthly limit が設定されている

### 3.3 手順 (OpenAI 部分、Phase 0.5 後半 6/4 まで OK)

▶ Step 3: OpenAI Platform にログイン
- https://platform.openai.com/ にアクセス
- 個人アカウントでログイン
- ✅ Step 3 完了判定: Dashboard に到達

▶ Step 4: 支払い方法登録
- Settings → Billing → Payment methods
- クレカ登録 (未登録なら)
- 📝 入金: $10-20 USD を pre-paid credit として入金 (Visualizer 1 ヶ月分相当)
- ✅ Step 4 完了判定: Credit balance が $10+ 表示

▶ Step 5: API key 作成
- Settings → API keys → 「Create new secret key」
- 📝 入力欄:
  - Name: `ofmeton-x-account-visualizer`
  - Project: Default project (任意)
  - Permissions: **All**
- 「Create secret key」クリック
- 📝 控える値: `OPENAI_API_KEY=sk-proj-...` (一度しか表示されない)
- ✅ Step 5 完了判定: sk-proj- で始まる key が手元にある

▶ Step 6: gpt-image-2 利用可否確認
- Playground → Images → Model dropdown で `gpt-image-2` が選べるか確認
- 選べない場合: Phase 0.5 では `OPENAI_IMAGE_MODEL=gpt-image-1` に fallback
- ✅ Step 6 完了判定: 利用可能 model 名を確認

▶ Step 7: Usage limit 設定
- Settings → Limits → Usage limits
- Monthly budget: **$30 USD** (¥4,500、Visualizer 用)
- Notification threshold: **$15 USD** (50%)
- ✅ Step 7 完了判定: limit 設定済

### 3.4 取得値の Claude への引き渡し

```
[H-3 完了]
ANTHROPIC_API_KEY=<money-bot 流用済、Claude が cp 操作>
OPENAI_API_KEY=sk-proj-<取得した値>
OPENAI_IMAGE_MODEL=gpt-image-2  (or gpt-image-1 if not available)
```

Claude が `.env.local` 投入 + Visualizer から軽い generation test (¥3 程度) で動作確認まで自動。

### 3.5 詰まった場合のトラブルシューティング

- **「Anthropic monthly limit が反映されない」** → Console UI bug。Org settings → Plan で確認。設定値が見えていれば OK
- **「OpenAI key 作成で organization 選択が出る」** → Personal で OK
- **「gpt-image-2 が dropdown に出ない」** → 2026-05 時点で全 user に rolled out していない可能性。`gpt-image-1` 使用、Phase 1 中盤に再確認

### 3.6 想定外 / リスク

- ⚠️ **ZDR (Zero Data Retention) 契約**: v10.2 §10.7.4 でレビュー対象だが、Phase 1 では顧客素材を投入しない方針 (本人事業 + 許諾済 client のみ) なので **未契約で開始 OK**。Phase 2 で新規 client 増えたら再評価
- ⚠️ OpenAI は **gpt-image-2 が高い** (¥6/枚目安)。Visualizer 月 30 枚で ¥180。問題ないが想定外な spike (refusal で retry 連発) に備え usage limit を必ず設定

---

## 4. H-4: Cloudflare Workers Paid プラン (30 分 or skip)

### 4.0 流用可否
- 既存資産流用: **なし**
- ⚠️ **判断分岐**: 払う ($5/月) OR mac launchd で代替 (¥0)

### 4.1 前提

- ofmeton が常時稼働 mac (Mac mini / MacBook) を持っている
- 民泊清掃や ai-radar で既に launchd を使った経験がある

### 4.2 判断フロー

```
Q1: 月 $5 を払う価値があるか?
├─ Yes → §4.3 Cloudflare 手順へ
└─ No  → §4.4 mac launchd 代替へ
```

**推奨**: **mac launchd 代替** を Phase 0.5 で先行採用。理由:
- $5/月 × 12 = ¥9,000/年 を節約できる
- mac 起動中限定だが、ofmeton は日中起動が default
- Phase 1 で運用負荷を見て Cloudflare に移行検討

### 4.3 Cloudflare Workers Paid 手順 (¥5/月払う場合)

▶ Step 1: https://dash.cloudflare.com/ にログイン
▶ Step 2: 左サイドバー: Workers & Pages → 「Plans」
▶ Step 3: 「Paid plan」 → $5/月で契約 (クレカ登録)
▶ Step 4: 左サイドバー: Manage Account → Account API Tokens → 「Create Token」
▶ Step 5: Template: 「Custom token」 (Workers + D1 + KV 操作権限)
- 📝 Permissions:
  - Account: Workers Scripts:Edit
  - Account: Workers KV Storage:Edit
  - Account: D1:Edit
  - Account: Cloudflare Workers:Edit
- 「Create Token」 → token を控える (一度しか表示されない)
▶ Step 6: Account ID は Dashboard 右サイドバー or URL の `dash.cloudflare.com/<account-id>/...` で確認

### 4.4 mac launchd 代替手順 (推奨)

▶ Step 1: ofmeton から「H-4 は launchd で行く」と一言
▶ Step 2: Claude が以下を自動実行:
- `~/Library/LaunchAgents/com.ofmeton.x-account.cron.plist` 作成
- 内容: `apps/x-account-system/scripts/cron-daily.sh` を 07:00 JST 起動
- `launchctl load ~/Library/LaunchAgents/com.ofmeton.x-account.cron.plist`
- `launchctl list | grep ofmeton.x-account` で起動確認
▶ Step 3: ✅ 完了判定: 翌日 07:00 にログ (`apps/x-account-system/logs/cron-YYYY-MM-DD.log`) が生成されている

### 4.5 取得値の Claude への引き渡し

**Cloudflare 契約した場合のみ**:
```
[H-4 完了 (Cloudflare)]
CLOUDFLARE_ACCOUNT_ID=<32 文字 hex>
CLOUDFLARE_API_TOKEN=<生成した token>
```

**launchd 代替の場合**:
```
[H-4 完了 (launchd)]
代替採用、Claude が plist 配置済
```

### 4.6 詰まった場合のトラブルシューティング

- **「launchd で 07:00 にログが出ない」** → mac が sleep していた可能性。System Settings → Battery → Wake for network access を ON
- **「Cloudflare で D1 binding できない」** → Paid plan 反映に 5-10 分。1 時間待っても駄目なら support

### 4.7 想定外 / リスク

- ⚠️ launchd は **mac sleep 中は動かない**。深夜 cron (例: 03:00 fetch) が必要なら Cloudflare 必須
- ⚠️ ofmeton が長期出張等で mac 停止 → 投稿停止。Phase 1 では Daily Digest で気づける

---

## 5. H-5: LINE Messaging API (30 分 or 流用)

### 5.0 流用可否
- 既存資産流用: **あり** (money-bot/.env.local の `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `LINE_TO_USER_ID`)
- ⚠️ **判断分岐**: money-bot 流用 OR 新規 "ofmeton 業務通知" 作成

### 5.1 前提

- ofmeton 個人 LINE で money-bot の公式アカウントを既に友だち追加済
- money-bot で承認通知を受信したことがある (動作確認済)

### 5.2 判断フロー

```
Q1: money-bot 通知と x-account-system 通知を同じ channel で受けて混乱しないか?
├─ 混乱しない (Phase 0.5 中はテスト多めで OK) → §5.3 流用パス
└─ 分離したい → §5.4 新規パス
```

**推奨**: **Phase 0.5 は money-bot 流用、Phase 1 で運用負荷を見て分離判断**。理由:
- Phase 0.5 中の承認 UI 統合確認が早い
- 新規 channel 作成は 30 分で済むので後追いコスト低い
- 通知混在は LINE 側の rich menu / quick reply で識別可能

### 5.3 money-bot 流用手順

▶ Step 1: ofmeton から「H-5 は money-bot 流用」と一言
▶ Step 2: Claude が自動実行:
- `cat ~/Projects/private-agents/money-bot/.env.local | grep -E 'LINE_'` で値取得
- 以下 mapping で `apps/x-account-system/.env.local` に投入:
  - `LINE_CHANNEL_ACCESS_TOKEN` → 同名
  - `LINE_CHANNEL_SECRET` → 同名
  - `LINE_TO_USER_ID` → **`LINE_USER_ID_OFMETON`** (key 名差異あり)
▶ Step 3: Claude が `curl -X POST https://api.line.me/v2/bot/message/push ...` で test push
▶ Step 4: ✅ 完了判定: ofmeton 個人 LINE に「x-account-system 接続テスト」通知が届く

### 5.4 新規 channel 作成手順 (Phase 1 中盤で分離する時)

▶ Step 1: https://developers.line.biz/console/ にログイン (LINE Business ID)
▶ Step 2: Provider 「ofmeton」 (既存) → 「Create new channel」
▶ Step 3: Channel type: **Messaging API**
- 📝 入力欄:
  - Channel name: `ofmeton 業務通知`
  - Channel description: AI 業務自動化発信システムの承認・通知用
  - Category: 個人 / その他
  - Subcategory: 任意
▶ Step 4: 作成完了後 → 「Messaging API」タブ
- 📝 控える値:
  - `LINE_CHANNEL_ACCESS_TOKEN` (「Issue」ボタンで生成)
  - `LINE_CHANNEL_SECRET` (「Basic settings」タブにあり)
▶ Step 5: 個人 LINE で QR コードを読み取り、友だち追加
▶ Step 6: webhook 経由で user ID 取得 (Claude 自動)
- Webhook URL: `https://x-account.ofmeton.com/webhook/line` (Phase 1 後半)
- Phase 0.5 では Claude が ngrok or supabase edge function で一時取得
- 📝 控える値: `LINE_USER_ID_OFMETON=U<33 文字>`

### 5.5 取得値の Claude への引き渡し

**流用パス**:
```
[H-5 完了 (流用)]
money-bot から自動コピー済、user_id は LINE_TO_USER_ID → LINE_USER_ID_OFMETON にリネーム
```

**新規パス**:
```
[H-5 完了 (新規)]
LINE_CHANNEL_ACCESS_TOKEN=<token>
LINE_CHANNEL_SECRET=<secret>
LINE_USER_ID_OFMETON=U<33 文字>
```

### 5.6 詰まった場合のトラブルシューティング

- **「test push で 401 Unauthorized」** → ACCESS_TOKEN が 30 日で期限切れる long-lived token を使用、または re-issue
- **「test push で 400 Invalid user ID」** → user ID が `U` で始まる 33 文字 (旧 `Uxxxx...`) であることを確認
- **「友だち追加しても webhook 発火しない」** → channel settings → Webhook → 「Use webhook」を ON

### 5.7 想定外 / リスク

- ⚠️ LINE Messaging API は **無料枠 push 200/月**。Phase 1 は 1 投稿/日 × 承認 = 30/月、Daily Digest 30/月 = 計 60/月。問題なし
- ⚠️ Phase 2 で 5 投稿/日 + Daily Digest = 月 150 push → 無料枠ギリギリ。有料枠 ¥5,000/月 で 60,000 push に拡張可

---

## 6. H-6: Meta (Instagram Graph API) (60-90 分 + App Review 5-14 日)

### 6.0 流用可否
- 既存資産流用: **なし**
- ⚠️ Phase 1 中盤 (6/20 申請、〜7/4 承認、〜7/10 IG launch) で OK

### 6.1 前提

- Instagram 個人アカウント @ofmeton (or 別名) を持っている、または新設可能
- Facebook 個人アカウント (off.me.ton@gmail.com で登録) を持っている

### 6.2 手順

▶ Step 1: Instagram Business アカウント設定
- Instagram モバイルアプリ → Settings → Account → Switch to Professional Account
- Business を選択 → カテゴリ「Personal Blog」or「Content Creator」
- ✅ Step 1 完了判定: プロフィールに「Business」表示

▶ Step 2: Facebook ページ作成
- https://facebook.com/pages/create にアクセス
- ページ名: `ofmeton` (任意)
- カテゴリ: Personal Blog
- ✅ Step 2 完了判定: ページが作成され、admin 権限あり

▶ Step 3: IG と FB ページ連携
- Facebook ページ → Settings → Linked Accounts → Instagram → Connect
- IG アカウント @ofmeton を選択 → 認証
- ✅ Step 3 完了判定: FB ページ Settings に IG account が紐付き表示

▶ Step 4: Meta App 作成
- https://developers.facebook.com/ にログイン (FB 個人アカウントで)
- My Apps → Create App → Use Case「Other」→ Type「Business」
- 📝 入力欄:
  - App display name: `ofmeton-x-account-system`
  - App contact email: off.me.ton@gmail.com
- ✅ Step 4 完了判定: App Dashboard に到達

▶ Step 5: Instagram Graph API 追加
- App Dashboard → Add products → Instagram Graph API → 「Set up」
- ✅ Step 5 完了判定: 左サイドバーに「Instagram」が追加

▶ Step 6: App Review 申請 (重い、5-14 日待ち)
- App Review → Permissions and Features
- 📝 申請する permission:
  - `instagram_basic` (read profile)
  - `instagram_content_publish` (post)
- 各 permission ごとに:
  - Use case description (例: 「Phase 1 で 1 アカウントの IG carousel を自動投稿、人間承認 gate あり」)
  - Screencast (5 分以内、demo 動画): App から IG への投稿フローを Loom で録画
  - Step-by-step instructions for reviewer
- ⚠️ ここが最も時間かかる。reviewer に「自社アカウント 1 つだけの自動投稿」を明示
- ✅ Step 6 完了判定: 「Submitted for review」status

▶ Step 7: 承認後の token 取得
- App Review approved 通知が来たら (5-14 日後)
- App Dashboard → Instagram → Long-lived access token 生成 (60 日有効)
- 📝 控える値:
  - `META_APP_ID` (App Dashboard に表示)
  - `META_APP_SECRET` (Settings → Basic)
  - `IG_BUSINESS_ACCOUNT_ID` (Graph API Explorer で `me?fields=instagram_business_account` 実行)
  - `IG_ACCESS_TOKEN` (long-lived、60 日)
- ✅ Step 7 完了判定: 4 値全部手元にある

### 6.3 取得値の Claude への引き渡し

```
[H-6 完了]
META_APP_ID=<App ID>
META_APP_SECRET=<App Secret>
IG_BUSINESS_ACCOUNT_ID=<17 桁の ID>
IG_ACCESS_TOKEN=<EAAxxxxxxx... の long-lived token>
```

Claude が `.env.local` 投入 → token refresh cron 設定 (60 日毎) → IG test 投稿 1 件 (dry-run) まで自動。

### 6.4 詰まった場合のトラブルシューティング

- **「App Review reject される」** → 大抵は use case 説明不足。「Personal account, 1 IG account, manual approval before each post」を明示して再提出
- **「IG_BUSINESS_ACCOUNT_ID が取れない」** → FB Page と IG の連携が切れている。FB Page Settings で再 link
- **「token が 1 時間で expire」** → short-lived token を取った。long-lived (60 日) 生成 API を叩く必要あり (Claude 側で対応)

### 6.5 想定外 / リスク

- ⚠️ **App Review 期間**: 申請 6/20 → 早い場合 6/22 (2 日)、遅い場合 7/4 (14 日)。 launch-roadmap の **7/10 IG launch は遅い場合の想定値**
- ⚠️ App Review が **reject** されたら最大 +14 日。最悪 7/24 IG launch を視野に
- ⚠️ token 60 日 refresh 失敗で投稿停止。Daily Digest で残日数監視

---

## 7. H-7: twitterapi.io (流用済、5 分)

### 7.0 流用可否
- 既存資産流用: **あり** (money-bot/.env.local の `TWITTERAPI_IO_KEY`)
- 人間操作ほぼゼロ

### 7.1 前提

- money-bot で twitterapi.io を既に使用、credit 残量あり

### 7.2 手順

▶ Step 1: ofmeton から「H-7 流用して」と一言
▶ Step 2: Claude が自動実行:
- `cat ~/Projects/private-agents/money-bot/.env.local | grep TWITTERAPI_IO_KEY` で値取得
- `apps/x-account-system/.env.local` に投入
- `curl -H "X-API-Key: ..." https://api.twitterapi.io/twitter/user/by-username?username=anthropic` で接続確認
▶ Step 3: ✅ 完了判定: Claude から「twitterapi.io 流用完了、anthropic user 取得成功」報告

### 7.3 (Phase 1 着手時に追加) twitterapi.io credit 残量確認

▶ Step 1: https://twitterapi.io/ にログイン (購入時のメール)
▶ Step 2: Dashboard で credit 残量を確認
- Phase 1 で必要な credit: 海外 17 アカ + 国内業種別 7 アカ × 週次取得 × 1 ヶ月
  = 24 アカ × 4 週 × ~50 tweets/週 × ~5 credit/tweet ≒ 24,000 credit/月
- ✅ 完了判定: 残量が 24,000+ あれば追加購入不要、不足なら $20-50 追加購入

### 7.4 取得値の Claude への引き渡し

```
[H-7 完了 (流用)]
TWITTERAPI_IO_KEY=<money-bot から copy>
```

### 7.5 詰まった場合のトラブルシューティング

- **「money-bot/.env.local が見つからない」** → `~/Projects/private-agents/money-bot/.env.local` のフルパス指定
- **「接続テスト 401」** → key が古い可能性。twitterapi.io Dashboard で再発行

### 7.6 想定外 / リスク

- ⚠️ twitterapi.io は **従量課金 $0.0001-0.001/call**。Phase 1 で月 ¥500-1,500 想定。budget-calculator の cost-model.csv に反映済
- ⚠️ rate limit あり (詳細 `~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory/reference_twitterapi_io_endpoints.md` 参照)。bulk fetch 時は wrapper 内 pacing 必須

---

## 8. H-8: note 購読 + ofmeton.com + LINE 友達 (2-3 時間)

### 8.0 流用可否
- 既存資産流用: **なし** (全 3 つ新規導線)
- ⚠️ Phase 1 month-1 中に target 達成 (50 購読 / 30 LINE 友達)

### 8.1 前提

- note 個人アカウント @ofmeton (or 既存名義) を持っている
- Cloudflare 個人アカウントを持っている (持っていない場合は新規作成)

### 8.2 手順 8A: note 購読導線 (target 50 件)

▶ Step 1: note Form Builder 有効化
- https://note.com/notes (自分のページ) → 設定 → メンバーシップ機能 (or プロフィール設定)
- 📝 メール購読 form を有効化 (利用可能なら)
- ⚠️ note の機能制約で Form Builder が無い場合 → 代替: Substack / Beehiiv / 自社サイト + Formspree
- ✅ Step 1 完了判定: 購読 URL が手元にある

▶ Step 2: X bio に追加 (X launch 後、Phase 1 Day 1)
- X 設定 → プロフィール → Bio
- 「note → <購読 URL>」を追加 (短縮 URL 推奨)
- ✅ Step 2 完了判定: Bio に link がある

▶ Step 3: note プロフィールに目立つ位置で配置
- note プロフィール → 自己紹介の冒頭 or 各記事末尾に「→ 購読リンク」
- ✅ Step 3 完了判定: 最新 3 記事に link あり

### 8.3 手順 8B: ofmeton.com ドメイン取得 (年 ¥1,500)

▶ Step 1: Cloudflare Registrar にログイン
- https://dash.cloudflare.com/ → Domain Registration → Register Domain
▶ Step 2: ofmeton.com を検索
- 📝 入力欄: `ofmeton.com`
- 既に取得済なら skip。available なら次へ
▶ Step 3: 購入
- 1 年 ¥1,500 前後 (.com は約 $10-12/年)
- クレカ登録 → 購入
▶ Step 4: WHOIS privacy ON (default)
▶ Step 5: ⏸ DNS 設定は Phase 1 後半 (Astro static blog を Vercel deploy 時) で実施
- Phase 0.5 では取得のみで OK
- ✅ Step 5 完了判定: Cloudflare Dashboard に ofmeton.com が表示

### 8.4 手順 8C: LINE 友達 30 件導線

▶ Step 1: LINE 公式アカウント友達追加 URL を取得
- https://manager.line.biz/account/<channel-id>/setting/url で QR コード + 友だち追加 URL
- 📝 控える値: `https://line.me/R/ti/p/@<basic-id>`
▶ Step 2: X bio / note プロフィール / portfolio site に link 配置
▶ Step 3: 公開許諾 gate (Supabase `materials_store.publication_consent`) を Claude が実装
- 投稿 reach 経由で「LINE で詳細聞きたい」誘導 → 友達追加 → consent_granted 自動記録
▶ Step 4: ✅ 完了判定: Phase 1 Day 1 までに導線設置完了

### 8.5 取得値の Claude への引き渡し

```
[H-8 完了]
NOTE_SUBSCRIBE_URL=<note 購読 URL or Substack/Beehiiv URL>
OFMETON_DOMAIN=ofmeton.com (取得済、DNS 後追い)
LINE_FRIEND_ADD_URL=https://line.me/R/ti/p/@<basic-id>
```

Claude が X bio / pinned post / note プロフィール用 copy 案を 3 案ずつ起案、ofmeton 選択。

### 8.6 詰まった場合のトラブルシューティング

- **「ofmeton.com が既に取得されている」** → `ofmeton.dev` / `ofmeton.io` / `ofmeton.jp` で代替。`.jp` は年 ¥3,000 程度で高め
- **「note Form Builder が UI に無い」** → 2026 年時点で note 標準機能ではない可能性。Substack / Beehiiv / 自社サイト + Formspree (¥0/月、無料枠 50 form/月) で代替
- **「LINE 友達追加 URL が分からない」** → manager.line.biz → Account → Profile → 「Friends」セクション内

### 8.7 想定外 / リスク

- ⚠️ note 購読 50 件 / LINE 友達 30 件は **Phase 1 month-1 末 (7/31) の target**。Phase 0.5 完了時点では「導線設置完了」が ✅ 判定 (件数達成は launch 後)
- ⚠️ ofmeton.com の DNS 設定で Cloudflare nameserver を使うと、後から Vercel deploy が楽。Phase 1 後半で Claude が設定

---

## 9. H-10: budget-calculator + brownout 同意 (15 分)

### 9.0 流用可否
- 取得作業なし。**実行 + 理解 + 同意** のみ。

### 9.1 前提

- H-3 (Anthropic API key) が ✅ 済 (cost-model に必要)
- ローカル `apps/x-account-system/` で `npm install` 完了

### 9.2 手順

▶ Step 1: budget-calculator 実行
```bash
cd ~/Projects/private-agents/all-good-ops/apps/x-account-system
npm run budget
```
- ✅ Step 1 完了判定: ターミナルに expected / low / p95 シナリオの月額 ¥ 表示

▶ Step 2: 出力の理解
- 表示される 3 シナリオ:
  - **expected** (中央値): 月 ¥6,000-8,000 想定
  - **low** (低稼働、retry 少): 月 ¥3,000-5,000
  - **p95** (高稼働、retry / 異常検知 / 緊急対応多): 月 ¥10,000-11,500
- 📝 ¥10,000 = `BUDGET_MONTHLY_LIMIT_JPY`、¥11,500 = `BUDGET_BROWNOUT_THRESHOLD_JPY`
- ✅ Step 2 完了判定: 3 シナリオの数値を画面で確認

▶ Step 3: brownout 挙動の理解
- brownout = ¥11,500 到達時、以下が自動発動:
  - **投稿停止** (Publisher が API call 拒否)
  - **計測継続** (twitterapi.io fetch / posts_performance 集計は OK)
  - **Daily Digest 継続** (LINE 通知で残量 / 復旧目処 通知)
  - **kill-switch 同時**: LINE `!stop` で即時停止 (brownout より強い)
- ✅ Step 3 完了判定: 上記 4 点を理解

▶ Step 4: .env.local の 2 値を確認
```bash
grep -E 'BUDGET_(MONTHLY_LIMIT|BROWNOUT)' apps/x-account-system/.env.local
```
- ✅ Step 4 完了判定: 2 行表示、値が ¥10,000 / ¥11,500

▶ Step 5: 同意意思表示
- ofmeton から「H-10 同意」と一言
- Claude が `data/usage-log.jsonl` に同意 record を append
- ✅ Step 5 完了判定: log に append された

### 9.3 取得値の Claude への引き渡し

```
[H-10 完了]
brownout 仕様同意済 (¥10,000 / ¥11,500)
3 シナリオ確認済 (expected / low / p95)
```

### 9.4 詰まった場合のトラブルシューティング

- **「npm run budget で error」** → `npm install` 未実施 / cost-model.csv 欠損。Claude に diagnosis 依頼
- **「数値が想像と違う」** → cost-model.csv の workload (投稿数 / Visualizer 数 / 海外バズ fetch 頻度) を確認。Claude が assumption を画面表示

### 9.5 想定外 / リスク

- ⚠️ p95 が ¥11,500 を超える場合 → cost-model 見直し or BROWNOUT_THRESHOLD 引き上げ (人間判断必要)
- ⚠️ 月予算は **Anthropic + OpenAI 合算**。Anthropic 単体予算 (¥10,000) を超えても OpenAI 込みでは余裕の可能性あり。Claude が分割 reporting

---

## 10. 完了報告フォーマット

各 H-N 完了時、ofmeton が Claude に以下フォーマットで投げる:

```
[H-N 完了]
KEY_1=<value>
KEY_2=<value>
...
```

例:
```
[H-1 完了]
X_CLIENT_ID=bXl...abc
X_CLIENT_SECRET=defGhi...XyZ123

[H-3 完了]
OPENAI_API_KEY=sk-proj-abc...xyz
OPENAI_IMAGE_MODEL=gpt-image-2
(Anthropic 部分は money-bot から流用 Claude で自動 cp)
```

Claude は受領後:
1. `.env.local` に投入
2. 動作確認 (該当する場合)
3. 完了 ✅ 報告 + 次の推奨 H-N を提示

---

## 11. 詰まった時の連絡経路

| 困りごと | 連絡先 |
|---|---|
| 手順の意味が分からない | Claude に「[H-N] step X 解説して」 |
| 想定外のエラー画面が出た | Claude に「[H-N] step X で <エラー文面> が出た」、screenshot 添付 OK |
| 流用するか新規取得するか迷う | Claude に「[H-N] 流用 / 新規どっち推奨?」 |
| 申請の文面が分からない (H-6 App Review 等) | Claude に「[H-6] App Review use case 文面 3 案出して」 |
| 全体の進捗・優先順位を整理したい | Claude に「H-N の進捗整理して」 |

---

## 12. Phase 1 launch 着手前 gate チェックリスト

X soft launch (6/8) gate:

- [ ] H-1: X Developer Console + OAuth 2.0 PKCE (Client ID/Secret 取得)
- [ ] H-2: Supabase project + pgvector + migrations 0001-0005 + roles
- [ ] H-3 (Anthropic 部分): ANTHROPIC_API_KEY 流用 + monthly limit 設定
- [ ] H-5: LINE Messaging API (流用 or 新規、push 動作確認)
- [ ] H-8: note 購読 / ofmeton.com / LINE 友達 30 件 **導線設置完了** (件数達成は launch 後 OK)
- [ ] H-10: budget-calculator 実行 + brownout 同意

X launch 中に並行で OK:

- [ ] H-3 (OpenAI 部分): Phase 0.5 後半 6/4 まで
- [ ] H-4: Cloudflare Workers Paid (or launchd 代替)
- [ ] H-7: twitterapi.io 流用 (Phase 1 cron 着手時)
- [ ] H-9: 新規 client 増えた時のみ
- [ ] H-11: Node v24+ / Python 3.10+ / npm install
- [ ] H-12: note 特商法 / 返金 / ML opt-out (note 有料 #1 公開前 = 7/31 まで)
- [ ] H-13: 業法ガード (2026-11 以降の士業フォーカス時)
- [ ] H-14: GitHub Trending 日次 cron (Phase 1 Day 1 までに)

IG launch (7/10 目標) gate:

- [ ] H-6: Meta App Review approved + IG Business + FB Page + token 取得

---

## 13. 付録: Claude への引き渡し全体テンプレ

全 H-N 完了時、ofmeton から Claude に一気に渡す場合の template:

```
[X-Account Phase 0.5 Pre-launch 完了報告]

## H-1 (X)
X_CLIENT_ID=
X_CLIENT_SECRET=

## H-2 (Supabase)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=

## H-3 (Anthropic 流用済 / OpenAI)
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=

## H-4 (launchd 採用 or Cloudflare)
CLOUDFLARE_ACCOUNT_ID=  # 採用時のみ
CLOUDFLARE_API_TOKEN=   # 採用時のみ

## H-5 (LINE 流用済 or 新規)
LINE_CHANNEL_ACCESS_TOKEN=  # 新規時のみ
LINE_CHANNEL_SECRET=        # 新規時のみ
LINE_USER_ID_OFMETON=       # 新規時のみ

## H-7 (twitterapi.io 流用済)
(Claude 自動 cp)

## H-8 (owned channel 導線)
NOTE_SUBSCRIBE_URL=
OFMETON_DOMAIN=ofmeton.com
LINE_FRIEND_ADD_URL=

## H-10
brownout 同意済
```

Claude が一括で `.env.local` 投入 → 全動作確認 → Phase 1 launch gate チェックリストを ✅ で返す。

---

**最終更新**: 2026-05-27 起案
**所要時間目安 (合計)**: 集中 2-3 時間 + 待ち時間 (Meta App Review 5-14 日、ドメイン伝播数時間)
**次のステップ**: H-1 着手 → Day A の他タスク並列 → Day B-E 順次
