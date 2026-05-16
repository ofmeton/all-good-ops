# 民泊清掃管理アプリ 運用・保守手順書（internal）

このドキュメントは保守担当（当面: 工藤陸）向けの内部用ガイドです。将来クライアントへ ownership 移管する際にも引き継ぎ資料として使います。

クライアント向け使い方ガイドは `handoff/client-facing/` 配下を参照。

> Phase B（デプロイ）実行時に本番リソースの ID・URL を追記する余白を残しています（`<本番Project URL>` 等のプレースホルダ）。

---

## 1. 本書について

**対象読者:**
- 工藤陸（当面の保守担当）
- 将来クライアントへ移管する場合の引き継ぎ先

**想定シーン:**
- 障害対応・問い合わせ対応
- マイグレーション追加・運用変更
- 月次の通知量・ストレージ容量モニタリング
- アクセス権の追加・削除

---

## 2. システム構成

```
[ ブラウザ ]                 [ Vercel Edge / Node.js ]            [ Supabase ]
 ┌─────────┐                ┌───────────────────────┐           ┌─────────────┐
 │ 管理者   │ ──HTTPS───►   │  Next.js App Router   │ ──SQL───► │  Postgres   │
 │ /admin   │                │  - Server Components  │           │  + 11 table │
 ├─────────┤                │  - API Routes (REST)  │           │  + 6 mig    │
 │ スタッフ │ ──HTTPS───►   │  - Vercel Cron 3本    │           ├─────────────┤
 │ /staff   │                │  - proxy.ts (auth)    │ ──API───► │  Storage    │
 ├─────────┤                │                       │           │  report-    │
 │ オーナー │ ──HTTPS───►   │                       │           │  photos     │
 │ /property│                │                       │           ├─────────────┤
 └─────────┘                │                       │ ──Auth──► │  auth.users │
                            └─────────┬─────────────┘           │  + email/pw │
                                      │                          └─────────────┘
                                      │
                          ┌───────────┴────────────┐
                          ▼                        ▼
                ┌──────────────────┐    ┌──────────────────┐
                │ LINE Messaging   │    │ Resend Email     │
                │ API (push only)  │    │ (transactional)  │
                │ - request_created│    │ - 他全部の通知   │
                └──────────────────┘    └──────────────────┘
```

**経路まとめ:**
- ユーザー → Vercel デプロイ URL（HTTPS）→ Next.js → Supabase（service role key で全DB操作）
- 通知: アプリ層 → LINE（依頼作成のみ）/ Resend（その他）
- 写真: スタッフブラウザ → Vercel → Supabase Storage（service role）/ 閲覧時は署名URL 経由
- Cron: Vercel Scheduler → 自前 API ルート（Bearer 認証）→ Supabase

---

## 3. 環境変数一覧

Vercel ダッシュボード Settings → Environment Variables で設定。すべて Production / Preview / Development 同一値で開始する。

| Key | 用途 | 取得元 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント露出可キー（Cookie認証用）| 同上 → Project API keys → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバ専用・全操作可。**漏えい厳禁** | 同上 → service_role secret |
| `NEXT_PUBLIC_APP_URL` | トークンURLの組み立てに使う本番URL | Vercel デプロイ後の URL |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API push 用 | LINE Developers Console → Channel → Messaging API → long-lived token |
| `RESEND_API_KEY` | Resend メール送信用 | Resend Dashboard → API Keys |
| `MINPAKU_FROM_EMAIL` | 送信元アドレス（既定 `onboarding@resend.dev`）| Resend のテスト送信元 or 検証済み独自ドメイン |
| `CRON_SECRET` | Vercel Cron 認証用シークレット | `openssl rand -hex 32` で生成 |
| `TZ` | サーバ側タイムゾーン | 固定値 `Asia/Tokyo` |

**本番デプロイ後にここへ実値を追記する欄（Plan 4 Task 6-9 で順次更新）:**

```
本番 Supabase Project ID:  cdqtypyasyhwbpuibhtb（Tokyo / Free Tier / org: 個人用）
本番 Supabase Project URL: https://cdqtypyasyhwbpuibhtb.supabase.co
本番 Vercel URL: <Task 9 デプロイ後に追記>
LINE Channel ID: <Task 7 で追記>
LINE Official Account ID: <Task 7 で追記>
Resend From Email: <Task 7 で追記>
```

> **秘密情報の取り扱い:** Service Role Key / LINE Token / Resend API Key / CRON_SECRET は **本リポジトリには絶対コミットしない**。Vercel ダッシュボードと、必要なら個別のパスワードマネージャー（1Password等）で管理。

---

## 4. デプロイ手順

通常のコード変更デプロイ:

1. ローカルで実装・テスト（`npm test && npm run build`）
2. `git push origin main`（または対象ブランチ）
3. Vercel が自動で Preview デプロイ（PR 等の場合）→ main マージ後に Production デプロイ
4. Vercel Dashboard → Deployments で Build ログを確認
5. 本番 URL で動作確認（管理者ログイン → 何か1操作）

ロールバックが必要な場合:
- Vercel Dashboard → Deployments で過去の Production デプロイを開く
- 「Promote to Production」で即時切り戻し

---

## 5. マイグレーション運用

新規マイグレーション追加の手順:

1. ローカル: `app/supabase/migrations/0007_xxx.sql` を作成
2. ローカル DB 反映: `npx supabase db reset`（既存データは全消えするので注意・ローカルのみ）
3. テスト実行: `npm test` で 74+ テストが通ることを確認
4. 本番 DB 反映:
   - **方法A（推奨）**: Supabase Dashboard → SQL Editor で 0007 の中身を貼り付けて Run
   - **方法B**: `supabase login && supabase link --project-ref <ref> && supabase db push`（CLI 認証セットアップが必要）
5. 本番動作確認

> マイグレーションは **追加のみ** とする。既存マイグレーション（0001-0007）の改変は基本しない。スキーマ変更は新規マイグレーションで実現する。

### migration 一覧（2026-05-16 時点）

| # | 内容 | 追加フェーズ |
|---|---|---|
| 0001 | 初期スキーマ（11テーブル + enum + 索引）| Plan 1 |
| 0002 | cancelled status 追加・依頼整合性制約・access_tokens 部分unique | Plan 2 |
| 0003 | cleaning_reports.request_id UNIQUE | Plan 2 review |
| 0004 | Storage バケット report-photos | Plan 2 |
| 0005 | notifications_log status CHECK・索引 | Plan 3 |
| 0006 | submit_cleaning_report RPC | Plan 3 |
| 0007 | RLS all-deny（anon key 漏えい時の防御層）| Plan 4 本番デプロイ時追加 |

### migration 0007 補足

設計書 §4 「RLS 不使用・認可はアプリ層」を踏襲するが、本番では `NEXT_PUBLIC_SUPABASE_ANON_KEY` が公開される。anon/authenticated 経由の直接アクセスを完全遮断するため、全 public テーブルに RLS を有効化し policy は作成しない。アプリは service role 経由のため動作影響なし（service role は RLS をバイパス）。

ローカル開発で `supabase db reset` した時も 0007 が自動適用される。テストは service role 経由で全件アクセスするため影響なし。

---

## 6. Cron 監視

Vercel Dashboard → Project → Settings → Cron Jobs に3本登録済み:

| Path | Schedule (UTC) | JST 換算 | 目的 |
|---|---|---|---|
| `/api/cron/remind` | `0 8 * * *` | 17:00 | 翌日担当の前日リマインド |
| `/api/cron/unassigned-alerts` | `0 * * * *` | 毎時0分 | 24h未割当依頼の管理者・オーナーへのアラート |
| `/api/cron/cleanup-photos` | `0 18 * * *` | 翌03:00 | 期限切れ写真（90日経過）の削除 |

### 実行ログの確認

Vercel Dashboard → Project → Deployments → 任意のデプロイ → Functions → Cron Logs

### 手動トリガ（動作確認）

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://minpaku-cleaning.vercel.app/api/cron/unassigned-alerts
curl -H "Authorization: Bearer $CRON_SECRET" https://minpaku-cleaning.vercel.app/api/cron/remind
curl -H "Authorization: Bearer $CRON_SECRET" https://minpaku-cleaning.vercel.app/api/cron/cleanup-photos
```

正常時のレスポンス例:
```json
{"ok": true, "processed": 0, "sent": 0}
{"ok": true, "candidates": 5, "storageDeleted": 5, "dbDeleted": 5}
```

### 失敗判定

- Vercel Cron Logs で 401 が出ている → `CRON_SECRET` の値が Vercel 環境変数と Cron 設定で一致していない
- 500 が出ている → アプリ側のエラー。Vercel Function Logs を確認
- レスポンス来ているのに通知届かない → `notifications_log` で `status='failed'` を確認

---

## 7. 通知量モニタリング

LINE は無料枠 200通/月、Resend は無料枠 3,000通/月。

### 月次集計 SQL

Supabase SQL Editor で実行:

```sql
-- 当月の通知配信量を kind / channel / status 別に集計
select
  date_trunc('month', sent_at) as month,
  kind,
  channel,
  status,
  count(*) as cnt
from notifications_log
where sent_at >= date_trunc('month', now())
group by 1, 2, 3, 4
order by 1 desc, 2, 3, 4;
```

```sql
-- LINE 送信のみの月次合計（200通の閾値判断用）
select
  date_trunc('month', sent_at) as month,
  count(*) filter (where status = 'sent') as line_sent,
  count(*) filter (where status = 'failed') as line_failed,
  count(*) filter (where status = 'skipped') as line_skipped
from notifications_log
where channel = 'line'
  and sent_at >= now() - interval '6 months'
group by 1
order by 1 desc;
```

### 閾値判断

- LINE 月 150通 を超え始めた → 翌月超過リスクあり。ライトプラン契約（5,000円/月・5,000通枠）を準備
- 月 200通 超過した日 → 当該月の残り日はメールフォールバック（既存 fallback ロジックが自動的に動作）

### LINE ライトプラン契約手順

1. LINE Official Account Manager（または LINE Developers Console）にログイン
2. 該当アカウントの「設定」→「料金プラン」
3. ライトプランへ変更
4. 翌月の請求から適用

---

## 8. 写真ストレージ容量モニタ

### 現状確認

Supabase Dashboard → Project → Storage → Buckets → `report-photos`
- Size / File Count を月1回確認

### 自動削除運用

- `report_photos.expires_at`（提出から 90日後）が経過した行は、`/api/cron/cleanup-photos`（毎日UTC 18:00）で自動削除
- Storage 削除エラーがあると DB 行だけ削除されて Storage 上に孤立ファイルが残る場合あり

### 孤立ファイル手動掃除（年1回程度想定）

1. Supabase Dashboard → Storage → `report-photos` → ファイル一覧
2. 一覧をスクロールし、`notifications_log` や `report_photos` に対応する記録のない古いフォルダを目視で削除
3. または SQL で報告との突き合わせ:
   ```sql
   -- DB に残存している storage_path 一覧
   select storage_path from report_photos;
   ```
   この一覧に含まれていない Storage ファイルが孤立ファイル

---

## 9. 障害対応プレイブック

### 通知が届かない（LINE / メール共通）

1. **対象通知の log を確認**
   ```sql
   select * from notifications_log
   where kind = '<該当kind>'
     and sent_at >= now() - interval '1 day'
   order by sent_at desc;
   ```
2. status を見る:
   - `sent` → 配信は成功している。ユーザー側（受信箱・LINE 友だち追加）の問題
   - `failed` → payload.error を見て原因切り分け
   - `skipped` → payload.skipped_reason を確認（dedupe / no_contact）

3. **LINE failed の原因別対応:**
   - `rate limit` → LINE 無料枠 200通超過の可能性。`notifications_log` で月次集計
   - `Invalid signature` 等 → LINE_CHANNEL_ACCESS_TOKEN を再発行・Vercel 環境変数更新
   - `User not found` 等 → recipient（line_user_id）が無効化されている

4. **メール failed の原因別対応:**
   - `Resend send failed` → RESEND_API_KEY 有効性確認、Resend ダッシュボードでアカウント状態確認
   - 5xx エラー連発 → Resend 側障害の可能性、Status Page 確認

### Cron が動かない

1. Vercel Dashboard → Cron Jobs で登録状態確認
2. 直近の Cron Logs を確認
3. 手動 curl で動作確認（§6 参照）
4. CRON_SECRET 不一致なら Vercel 環境変数を更新 → Redeploy

### DB に繋がらない（500 連発）

1. Supabase Dashboard → Project Status を確認（メンテナンス中の可能性）
2. Vercel 環境変数の Supabase URL / Key を確認
3. Supabase Free プランは一定期間アクセスがないと一時停止される → ダッシュボードで Restart

### 依頼が二重作成された / DB データが壊れた

1. 影響範囲を `cleaning_requests` の `created_at` で特定
2. ユーザー操作で意図的でない場合は SQL Editor で重複行を削除
3. 同時多重 submit の場合は OPS_GUIDE に追記して将来対応（client-side dedupe button disable 等）

### `submit_cleaning_report` RPC エラー

1. Supabase SQL Editor で関数定義確認:
   ```sql
   \df+ submit_cleaning_report
   ```
2. なければ migration 0006 が適用されていない → 適用
3. 引数型不一致なら関数を再作成（0006 のSQL を再実行）

---

## 10. DB バックアップ・リストア

### 自動バックアップ

Supabase Free プランは 7 日間の自動バックアップが標準で有効。
Supabase Dashboard → Project → Database → Backups で確認。

### 手動エクスポート（月次推奨）

```bash
# Supabase CLI 認証済み前提
supabase db dump --linked --data-only > backup_$(date +%Y%m%d).sql
```

または Supabase Dashboard → Database → Backups → Download。

### リストア

緊急時:
1. Supabase Dashboard → Database → Backups → 該当バックアップ → Restore
2. 直近の Vercel デプロイで動作確認

> Restore は破壊的操作のため、必ず別プロジェクト or 別 schema にリストアしてから確認推奨。

---

## 11. アクセス管理

| 場所 | 管理画面 |
|---|---|
| Vercel Team Members | Vercel Dashboard → Team Settings → Members |
| Supabase Organization Members | Supabase Dashboard → Organization → Members |
| LINE Official Account 管理者 | LINE Official Account Manager → 設定 → 権限管理 |
| Resend Team | Resend Dashboard → Team |
| GitHub Repository | GitHub → リポジトリ → Settings → Collaborators |

ownership 移管時の手順は `02-transfer-ownership.md` を参照。

---

## 12. スタッフの LINE userId 取得運用

LINE Messaging API push にはスタッフの `lineUserId`（`U` から始まる文字列）が必要。本納品の範囲では自動取得 webhook は実装していないため、以下の手動運用となる。

### 手順

1. スタッフが LINE 公式アカウントを **友だち追加**
2. 工藤陸（または管理者）が LINE Official Account Manager にログイン
3. メニュー → 「チャット」または「ユーザー」を開く
4. 友だち追加したユーザーの ID（プロフィール詳細から）を取得
   - 表示されない場合は、スタッフからアカウントに何かメッセージを1通送ってもらうと、チャット履歴からユーザー特定が可能
5. 管理画面（アプリ `/admin/staff`）で該当スタッフの編集（現状 UI からは編集できないため、SQL Editor で直接更新）:
   ```sql
   update staff set line_user_id = 'U<取得したID>' where id = '<staff UUID>';
   ```

### 将来の自動化（Plan 4 スコープ外）

LINE 公式アカウントの Webhook を実装し、友だち追加イベントで userId を自動受信する。新規スタッフ追加時の管理者作業を削減できる。

---

## 13. メンテナンス・更新ログ（運用中に追記）

| 日付 | 内容 | 担当 |
|---|---|---|
| <デプロイ日> | 初回本番デプロイ | 工藤陸 |
| | | |
