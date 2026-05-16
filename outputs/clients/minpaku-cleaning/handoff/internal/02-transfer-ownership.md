# 民泊清掃管理アプリ ownership 移管手順書（internal）

工藤陸所有の本番リソース一式を、クライアント（清掃管理業者）所有へ移管するための手順書です。

検収完了後、クライアントが「自社で完全運用したい」となったタイミングで実施します。

---

## 1. 本書の目的

- 工藤陸が保有する Vercel / Supabase / LINE / Resend / GitHub のリソース所有権をクライアントへ移管する
- 移管後の保守体制を明確にする
- 移管中・移管後のダウンタイムを最小化する

---

## 2. 事前合意事項

クライアントへ移管する前に、以下を書面で合意しておきます。

### 2.1 保守責任の所在

| 項目 | 移管前 | 移管後 |
|---|---|---|
| アカウント所有 | 工藤陸 | クライアント |
| 障害対応一次窓口 | 工藤陸 | クライアント（または別業者）|
| 障害対応エスカレーション | — | 工藤陸（契約による）|
| コード改修依頼 | 工藤陸 | 別途契約による |
| ランニングコスト負担 | 工藤陸 | クライアント |

### 2.2 移管対象リソース

- Supabase Project（DB + Storage + Auth）
- Vercel Project（デプロイ環境 + Cron + Env Vars）
- LINE Messaging API Channel + 公式アカウント
- Resend Account（または新規作成）
- GitHub リポジトリ（または Fork で工藤側に履歴残し）

### 2.3 ダウンタイム想定

最大数十分（DNS切り替えやキー再発行による）。事前に通知してから実施推奨。

### 2.4 ドキュメント引き継ぎ

`handoff/internal/01-ops-guide.md`（運用・保守手順書）一式を本書と同時にクライアントへ譲渡。

---

## 3. Supabase Project Transfer

Supabase は組織間プロジェクト譲渡機能（Transfer Project）あり。

### 手順

1. クライアントが Supabase 組織を作成（既存があればそれを使用）し、組織 ID を共有
2. 工藤側 Supabase Dashboard → Project Settings → General → Transfer project
3. 移管先組織 ID を入力 → 確認 → 実行
4. クライアント側で受け入れ承認（メールが届く）
5. 完了後、クライアント側で **DB Password を再発行**（前所有者がパスワードを知っているため）
6. Service Role Key も再発行（クライアント側のセキュリティ確保）

> **DB Password / Service Role Key の再発行後、Vercel の環境変数も更新必要。**

---

## 4. Vercel Project Transfer

Vercel は Team Project の Transfer 機能あり。

### 手順

1. クライアントが Vercel Team を作成（個人アカウントでも可）
2. 工藤側 Vercel Dashboard → Project → Settings → Advanced → Transfer Project
3. 移管先 Team を選択 → 実行
4. クライアント側で承認
5. 完了後、**Vercel Project の環境変数を全て確認**（前所有者がアクセス権を持っていたため、必要なら再発行・再設定）
6. **Cron Jobs の自動移管確認**（Project ごと移管されるが、念のため Cron Logs を確認）

> **CRON_SECRET も再発行推奨**（クライアント側で `openssl rand -hex 32` で新規生成 → Vercel 環境変数更新 → Redeploy）

---

## 5. LINE Messaging API Channel Transfer

LINE は Channel を Provider 間で移管できる。

### 手順

1. クライアントが LINE Developers Console で Provider を作成（既存があればそれ）
2. 工藤側 LINE Developers Console → 該当 Channel → Settings → Move Channel
3. 移管先 Provider を選択 → 実行
4. クライアント側で承認

> Channel Access Token は移管時に **無効化** される可能性が高い → 移管直後にクライアント側で再発行 → Vercel 環境変数更新 → Redeploy

### LINE Official Account の管理者

LINE Official Account Manager → 設定 → 権限管理 で、クライアントを管理者として追加してから工藤を削除する流れ。

---

## 6. Resend Transfer

Resend には Team Transfer 機能がない。

### 手順

1. クライアントが Resend で新規アカウント作成
2. クライアント側で API キーを新規発行
3. Vercel 環境変数の `RESEND_API_KEY` を新しい値に更新 → Redeploy
4. 動作確認（管理者から完了報告 → 自分のメールに届くか）
5. 工藤側 Resend アカウントは削除（任意・残しても害なし）

> Resend の利用履歴は工藤側アカウントに残るが、クライアント側で新規開始するので運用上は問題なし。

---

## 7. GitHub Repository

選択肢が2つあります。

### Option A: リポジトリオーナーシップ移管

GitHub の Repository Transfer 機能で、クライアントの GitHub アカウント / Organization へ移管。

- メリット: コミット履歴・Issue 等が全て引き継がれる
- 注意: Vercel との連携が一旦切れるため、移管後に Vercel Dashboard で連携先 Repository を再設定する必要あり

### Option B: クライアント側へ Fork（履歴は工藤側に残す）

クライアントが Fork を作成 → 以降の改修はそちらで行う方式。

- メリット: 工藤側に Original が残る（保守継続契約等の場合に便利）
- 注意: 以降のコミットが2拠点に分散しがちなので、運用ルールを明確にしておく

通常は **Option A（リポジトリ移管）** を推奨。

---

## 8. 環境変数の引き継ぎ

移管後、Vercel 環境変数を以下の手順で確認・更新:

1. `01-ops-guide.md` §3「環境変数一覧」を参照
2. 移管によって変わった値（DB Password、Service Role Key、LINE Access Token、Resend API Key、CRON_SECRET）を更新
3. 不変の値（NEXT_PUBLIC_APP_URL、TZ、MINPAKU_FROM_EMAIL）は維持
4. Redeploy

---

## 9. ドメイン・DNS

カスタムドメインを使用していない場合: Vercel の自動URL（`*.vercel.app`）が引き続き使えるが、URL自体が `<新Team名>.vercel.app` に変わる可能性あり。
- 変わった場合: 全ガイドの URL を更新・スタッフ・オーナーへ新URL案内が必要（トークンURLは変わらず継続使用可能）

カスタムドメインを使用している場合: DNS の管理者と移管先で再設定。

---

## 10. 移管完了チェックリスト

すべて ✓ で確認後に移管完了とする。

- [ ] Supabase Project が移管先組織に表示される
- [ ] Supabase DB Password / Service Role Key を再発行済み
- [ ] Vercel Project が移管先 Team に表示される
- [ ] Vercel Cron Jobs 3本が引き続き登録されている
- [ ] Vercel 環境変数 9 個が新しい値で設定されている
- [ ] LINE Channel が移管先 Provider に表示される
- [ ] LINE Channel Access Token が新しい値に更新済み
- [ ] LINE Official Account の管理者にクライアントが追加されている
- [ ] Resend が新アカウントで API キー発行済み
- [ ] GitHub リポジトリの所有が移行 or Fork されている
- [ ] Vercel の GitHub 連携が再設定されている（リポ移管の場合）
- [ ] 本番 URL で管理者ログインができる
- [ ] 本番 URL で依頼作成 → 通知配信 → 完了報告 が動作する
- [ ] Cron 3本を手動 curl で動作確認した
- [ ] `01-ops-guide.md` の本番リソース情報をクライアント側で更新済み
- [ ] 工藤の旧アカウントから本番リソースへのアクセス権を削除済み

---

## 11. 移管後の継続関係

ケース別に明文化推奨:

- **完全分離**: 工藤側からは一切アクセス不可。保守も含めて関与終了
- **緊急時サポート**: 工藤側に閲覧権限のみ残し、緊急時のみ協力
- **保守継続契約**: 工藤側に運用権限を残し、別途契約金額で保守

合意内容は別途書面化。
