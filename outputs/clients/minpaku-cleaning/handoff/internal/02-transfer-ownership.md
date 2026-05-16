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
- Resend Account（または新規作成）
- GitHub リポジトリ（または Fork で工藤側に履歴残し）

**移管対象外（最初からクライアント名義）:**
- LINE Messaging API Channel + 公式アカウント — LINE Channel は別 Provider/別 LINE アカウントへの移動が公式仕様で不可（"Once you create a channel, you can't move the channel to another provider later." [LINE Developers Docs](https://developers.line.biz/en/docs/messaging-api/)）。Plan 4 セットアップ時点でクライアント名義の LINE Developer Account / Provider / Channel を開設し、Channel Access Token のみを工藤側 Vercel へ預ける運用とする。移管時は LINE 側で工藤への共有設定を解除するだけで完了する。

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

## 5. LINE Messaging API Channel（移管不要）

LINE Channel は最初からクライアント名義で開設しているため、ownership 移管時に Channel を移動する作業は発生しない。

### 背景（公式仕様）

LINE Developers の Channel は、開設後に別 Provider／別 LINE アカウントへ移動することができない（公式: "Once you create a channel, you can't move the channel to another provider later." [LINE Developers Docs](https://developers.line.biz/en/docs/messaging-api/)）。仮に工藤側で Channel を作っていた場合、後からクライアントへ Channel ごと譲ることはできない。

### Plan 4 セットアップ時の方針

- LINE Developer Account / Provider / Channel はクライアント名義で開設
- 工藤は Channel Access Token のみを Vercel 環境変数 `LINE_CHANNEL_ACCESS_TOKEN` に登録（運用代行）
- LINE Official Account の管理者にも、初期から「クライアント（オーナー）」+「工藤（管理権限）」の2名を登録

### 移管時の手順

1. クライアント側 LINE Developers Console → 該当 Channel → Channel Access Token を **再発行**（工藤が知っている古いトークンを無効化）
2. クライアントから新しい Channel Access Token を受領（チャットには貼らず、Vercel 環境変数登録の段階で直接入力）
3. Vercel 環境変数 `LINE_CHANNEL_ACCESS_TOKEN` を新しい値で更新 → Redeploy
4. LINE Official Account Manager → 設定 → 権限管理 → 工藤の管理者権限を削除
5. クライアント側で「依頼作成 → スタッフへ LINE 通知」のスモークテストを実施

> Channel 自体は移動不要なので、本セクションでの作業はトークン再発行 + 工藤の権限削除のみで完了する。

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
- [ ] LINE Channel Access Token を再発行し、Vercel 環境変数を更新済み（Channel 自体は最初からクライアント名義のため移動不要）
- [ ] LINE Official Account Manager から工藤の管理者権限を削除済み
- [ ] Resend が新アカウントで API キー発行済み
- [ ] GitHub リポジトリの所有が移行 or Fork されている
- [ ] Vercel の GitHub 連携が再設定されている（リポ移管の場合）
- [ ] 本番 URL で管理者ログインができる
- [ ] 本番 URL で依頼作成 → 通知配信 → 完了報告 が動作する
- [ ] Cron 3本を手動 curl で動作確認した
- [ ] `01-ops-guide.md` の本番リソース情報をクライアント側で更新済み
- [ ] 工藤の旧アカウントから本番リソース（Supabase / Vercel / Resend / GitHub）へのアクセス権を削除済み

---

## 11. 移管後の継続関係

ケース別に明文化推奨:

- **完全分離**: 工藤側からは一切アクセス不可。保守も含めて関与終了
- **緊急時サポート**: 工藤側に閲覧権限のみ残し、緊急時のみ協力
- **保守継続契約**: 工藤側に運用権限を残し、別途契約金額で保守

合意内容は別途書面化。
