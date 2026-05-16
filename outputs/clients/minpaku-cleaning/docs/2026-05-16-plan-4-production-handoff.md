# 民泊清掃管理アプリ Plan 4: 本番デプロイ・納品準備 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. **Plan 1-3 と性質が異なる点に注意:** ドキュメント作成タスクは controller 自身が執筆（context 一貫性のため）。デプロイ実行タスクは外部アカウント操作を含むため、各ステップでユーザー確認を挟む。

**Goal:** 民泊清掃管理アプリを本番（工藤陸所有の Vercel/Supabase/LINE/Resend アカウント）にデプロイし、クライアント（友人）が検収できる状態を整える。同時に納品ドキュメント（使い方ガイド3本・運用保守手順書）を完成させ、Google Drive 経由で共有する。将来のクライアントへの ownership 移管手順書も同梱する。

**Architecture:** Plan 1-3 の実装をそのまま本番環境へ。本番構成は: Supabase 本番プロジェクト（Postgres + Storage + Auth）/ Vercel 本番プロジェクト（GitHub 連携・自動デプロイ）/ LINE Messaging API 公式アカウント / Resend アカウント / Vercel Cron。環境変数はすべて Vercel ダッシュボードで管理（コードは Plan 1-3 時点で完成・追加実装なし）。

**Tech Stack:** Supabase（本番プロジェクト）/ Vercel（本番デプロイ + Cron + Env Vars）/ LINE Official Account + Messaging API / Resend / Google Drive（納品ドキュメント共有）

設計書: `outputs/clients/minpaku-cleaning/docs/2026-05-14-design.md`
Plan 1-3 計画書: 同 docs/ 配下
アプリのルート: `outputs/clients/minpaku-cleaning/app/`
ドキュメントの出力先: `outputs/clients/minpaku-cleaning/handoff/`（Plan 4 で新設・client-facing と internal の2サブフォルダ）

**運用主体・保守方針（Plan 4 時点で確定）:**
- アカウント所有: 当面 **工藤陸**（Vercel/Supabase/LINE/Resend すべて）
- ランニングコスト: 当面工藤陸負担（設計書 §1 の友人負担前提とは一旦不一致だが、移管後は変更可）
- 将来移管: 検収後、希望時にクライアントへ ownership 移管（手順書 同梱予定）
- LINE 通知ポリシー: `request_created` のみ実送信、それ以外メール（Plan 3 で確定）

**Plan 4 のスコープ外:**
- 設計書 §10「将来展望」（会計機能・OTA自動連携）— 別フェーズ
- カスタムドメイン取得・DNS 設定 — まずは Vercel preview URL（`*.vercel.app`）で運用開始、必要になったら別途
- 本番運用後のサポート・障害対応 — 本計画では「初回デプロイ＋検収準備」までを範囲とする

---

## Plan 1-3 からの前提（実装済み・変更しない）

- 全コードベース完成（Plan 3 完了時点）
- マイグレーション 0001〜0006 整備済み
- E2E スペック整備済み（local Supabase 前提だが、本番でも `playwright.config.ts` の baseURL を差し替えれば動作可能）
- `.env.local.example` に必要な環境変数キー（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_APP_URL / LINE_CHANNEL_ACCESS_TOKEN / RESEND_API_KEY / MINPAKU_FROM_EMAIL / CRON_SECRET）が記載済み

---

## ファイル構成（Plan 4 新規作成分）

```
outputs/clients/minpaku-cleaning/
  handoff/
    client-facing/                    クライアントに渡すドキュメント（Drive アップロード対象）
      01-admin-guide.md               管理者使い方ガイド
      02-staff-guide.md               スタッフ使い方ガイド（トークンURL運用含む）
      03-owner-guide.md               物件オーナー使い方ガイド
      04-acceptance-test.md           クライアント検収シナリオ
    internal/                         工藤陸の保守用・移管時にクライアントへ共有
      01-ops-guide.md                 環境構築・運用・モニタリング・障害対応手順
      02-transfer-ownership.md        将来クライアントへの ownership 移管手順
```

各ドキュメントの想定読者・分量目安はそれぞれのタスクに記載。

---

## 進め方の構造

Plan 4 は3フェーズに分かれる:

| Phase | タスク | 性質 | 実行者 |
|---|---|---|---|
| **A: ドキュメント作成** | 1-4 | Markdown 執筆 | controller（subagent ではなく本体）|
| **B: 本番デプロイ** | 5-10 | 外部アカウント操作・MCP コマンド | ユーザー操作中心。controller が手順案内・確認・補助 |
| **C: 検収準備・引き渡し** | 11-13 | ドキュメント仕上げ・Drive アップロード・案内文ドラフト | controller + ユーザー確認 |

**重要:** Phase B の各タスクは外部リソースを作成する。**各タスク開始前に必ずユーザーに「いま実行してよいか」確認** すること。Plan 1-3 のように subagent を投げっぱなしにしない。

---

## Task 1: 管理者使い方ガイド（client-facing）

**想定読者:** 納品先業者（清掃管理業者）の管理者ユーザー。スマホ・PC 両方で使う。技術知識ゼロ前提。
**分量目安:** A4 で 5-7 ページ相当（3,000-5,000 字）

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/client-facing/01-admin-guide.md`

- [ ] **Step 1: ファイル雛形と章立て**

以下のセクションを `01-admin-guide.md` に作成（控えめなトーン・指示形・スクリーンショットは現段階では省略可）:

1. **はじめに** — このガイドの読者、できることの概要、本アプリへのアクセスURL（後で Vercel デプロイ URL を埋める）
2. **ログイン・ログアウト** — `/admin/login` の使い方、パスワード忘れ時の対応（管理者が複数いれば相互リセット可、いなければ工藤陸へ連絡）
3. **物件・オーナー・スタッフを登録する** — Plan 1 で作った3画面の使い方。N:N 担当割当の説明含む
4. **トークンURLを発行・共有する** — オーナー/スタッフへの URL 配布方法、再発行・無効化のタイミング（退職・紛失）
5. **依頼を作成する** — `/admin/requests` でのフォーム入力、当日不可・チェックアウト > チェックインのルール
6. **依頼の流れを把握する** — ステータス遷移（unassigned → assigned → in_progress → reported → confirmed / cancelled）の意味
7. **スタッフ割当・キャンセル** — 手動割当、連続予約警告の見方、キャンセルの注意点
8. **完了報告を確認する** — チェックリスト・写真・確認済みにする手順
9. **備品補充依頼を確認する** — `/admin/supplies` の使い方
10. **通知について** — どの操作で誰に何が届くか、LINE と メールの違い、通知が届かない時の確認手順
11. **管理者を追加する** — `/admin/admins` の使い方
12. **困った時** — よくある質問（ログイン不可・通知届かない・写真が見えない 等）と、工藤陸への連絡先

- [ ] **Step 2: 各章の本文を執筆**

controller が直接書く（subagent に投げない・context 一貫性最優先）。各章 200-500 字。

実装側の注意:
- 用語は設計書と一致させる（依頼/物件/オーナー/スタッフ）
- 「管理画面」「URL」のような技術寄り用語は使うが、「Server Component」「API route」のような技術用語は使わない
- スクリーンショットの位置だけ `<!-- screenshot: ... -->` で示しておき、デプロイ後に補完する旨を冒頭に注記
- 「困った時」セクションは Resend/LINE の無料枠仕様も含めた現実的なトラブルシュート（通知が来ない → LINE 友だち追加されてるか確認 → メール迷惑メールフォルダ確認 → 管理画面の通知ログ確認）

- [ ] **Step 3: 仕上げ・整合性チェック**

書き終わったら、Plan 1-3 で実装された画面・API・通知仕様と齟齬がないか controller が自己レビュー。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/client-facing/01-admin-guide.md
git commit -m "docs(handoff): 管理者使い方ガイド（client-facing）"
```

---

## Task 2: スタッフ使い方ガイド（client-facing）

**想定読者:** 清掃スタッフ。スマホ運用前提。技術知識ゼロ・LINE は使い慣れている前提。
**分量目安:** A4 で 3-4 ページ相当（2,000-3,000 字）

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/client-facing/02-staff-guide.md`

- [ ] **Step 1: ファイル雛形と章立て**

章立て:

1. **このガイドについて** — 読者（清掃スタッフ）・できることの概要
2. **専用URLを開く** — トークンURLの保存方法（スマホのホーム画面追加推奨）、URLが無効と出た時の対応
3. **依頼を受ける（承認する）** — 「未割当」依頼の見方、「この依頼を承認する」ボタンの動作（早い者勝ち）、承認した後の流れ
4. **清掃を開始する** — 「割当済み」状態の依頼を開き、「清掃を開始する」を押すタイミング
5. **完了報告を提出する** — チェックリストの記入、写真のアップロード（複数可）、提出後の表示
6. **備品補充を依頼する** — 「不足している備品」欄の書き方、依頼後の管理者への伝わり方
7. **通知について** — LINE通知（依頼作成時に届く・友だち追加が必要）、メール通知（リマインド・確認系）
8. **困った時** — URL が開けない・写真が送れない・通知が来ない 等の対応、管理者への連絡

- [ ] **Step 2: 各章の本文を執筆**

controller が直接書く。各章 200-300 字。

注意:
- スマホ操作前提の表現（「タップ」「画面を下にスクロール」）
- LINE 友だち追加の手順（QR コードまたは LINE ID）は具体的に。LINE 公式アカウント開設時の URL/ID を Phase B で埋める前提でプレースホルダ
- 「写真は自動的に縮小されます」(Plan 3 sharp 圧縮の説明)

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/client-facing/02-staff-guide.md
git commit -m "docs(handoff): スタッフ使い方ガイド（client-facing）"
```

---

## Task 3: 物件オーナー使い方ガイド（client-facing）

**想定読者:** 物件オーナー。閲覧専用なので簡潔に。
**分量目安:** A4 で 2 ページ相当（1,000-1,500 字）

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/client-facing/03-owner-guide.md`

- [ ] **Step 1: 章立てと執筆**

章立て:

1. **このガイドについて** — 読者（物件オーナー）、できること（閲覧のみ）
2. **専用URLを開く** — トークンURL の保存方法、無効URL の対応
3. **見られる情報** — 清掃履歴一覧、各依頼のステータス、完了写真とチェックリスト、備品補充依頼の履歴
4. **通知について** — 確認完了時のメール通知、備品補充依頼時のメール通知
5. **困った時** — URL が開けない・写真が見えない・通知が来ない 等

controller が直接執筆。

- [ ] **Step 2: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/client-facing/03-owner-guide.md
git commit -m "docs(handoff): 物件オーナー使い方ガイド（client-facing）"
```

---

## Task 4: 運用・保守手順書（internal）

**想定読者:** 工藤陸（保守責任者）。将来クライアントへ ownership 移管時にも引き継ぐ。
**分量目安:** A4 で 8-12 ページ相当（5,000-8,000 字）

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/internal/01-ops-guide.md`

- [ ] **Step 1: 章立てと執筆**

章立て:

1. **本書について** — 読者（保守担当）、想定シーン
2. **システム構成図** — Next.js (Vercel) / Postgres (Supabase) / Storage (Supabase) / LINE / Resend / Vercel Cron の関係性（Mermaid または ASCII）
3. **環境変数一覧** — 各キーの意味・取得元・設定場所（Vercel ダッシュボード Path）
4. **デプロイ手順** — GitHub push → Vercel 自動デプロイの流れ、preview と production の関係
5. **マイグレーション運用** — 新規マイグレーションを書いて適用するまでの手順（ローカルで `supabase db reset` 確認 → 本番 Supabase ダッシュボードの SQL Editor で実行 or `supabase db push`）
6. **Cron 監視** — Vercel ダッシュボード Cron Logs の見方、3本それぞれの正常時 / 異常時の判定
7. **通知量モニタリング** — `notifications_log` テーブルの月次集計 SQL、LINE 200通閾値の意味、ライトプラン契約タイミング
8. **写真ストレージ容量モニタ** — Supabase ダッシュボード Storage タブの確認、孤立ファイル手動掃除手順
9. **障害対応プレイブック** — よくある障害と対応:
   - 通知が届かない（LINE/メール）→ `notifications_log` で status='failed' 確認、API キー有効性、recipient 形式
   - Cron が動かない → CRON_SECRET 一致確認、Vercel Cron Logs、手動トリガで切り分け
   - DB に繋がらない → Supabase 側の障害確認、env vars 確認
   - 依頼が二重作成された → DB で重複削除、原因（多重 submit）の切り分け
10. **DB バックアップ・リストア** — Supabase 自動バックアップの設定確認、手動エクスポート手順（`supabase db dump`）
11. **アクセス管理** — Vercel/Supabase/LINE/Resend それぞれの Team Member 管理画面 Path

controller が直接執筆。各章の分量は内容次第。

- [ ] **Step 2: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/internal/01-ops-guide.md
git commit -m "docs(handoff): 運用・保守手順書（internal）"
```

---

## Task 5: ownership 移管手順書（internal）

**想定読者:** 工藤陸＋将来の移管時にクライアントへ共有。
**分量目安:** A4 で 3-4 ページ相当（2,000-3,000 字）

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/internal/02-transfer-ownership.md`

- [ ] **Step 1: 章立てと執筆**

章立て:

1. **本書の目的** — 工藤陸所有から、クライアント所有へ移管する手順
2. **事前合意事項** — 移管後の保守責任、ランニングコスト負担、サポート範囲
3. **Supabase Project Transfer** — Supabase ダッシュボードの Transfer ownership 機能、必要なクライアントの Supabase 組織 ID
4. **Vercel Project Transfer** — Vercel ダッシュボードの Transfer Project 機能、必要なクライアントの Vercel Team
5. **LINE Messaging API Channel Transfer** — LINE Developers Console での Provider 移管手順
6. **Resend** — Resend は Team Transfer なし → クライアント側で新規アカウント作成 + API キー再発行 + Vercel Env Vars 更新
7. **GitHub Repository** — リポジトリのオーナー移管 or Fork（工藤側で監視継続するなら Fork）
8. **環境変数の引き継ぎ** — クライアント側 Vercel に環境変数を再設定する手順
9. **ドメイン・DNS** — もしカスタムドメイン使用なら、DNS 設定の移管手順
10. **移管チェックリスト** — 全項目チェック後の最終確認（本番に管理者ログイン・cron 動作・通知配信 が問題ないことを移管後に確認）

- [ ] **Step 2: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/internal/02-transfer-ownership.md
git commit -m "docs(handoff): ownership 移管手順書（internal）"
```

---

## Task 6: Supabase 本番プロジェクト作成

**実行者:** ユーザー（工藤陸）が Supabase ダッシュボードで操作。controller は手順案内 + 接続情報受領後の処理。

- [ ] **Step 1: Supabase ダッシュボードでプロジェクト作成**

ユーザー操作:
1. https://supabase.com/dashboard へログイン（既存アカウントがあればそれを使用、なければ作成）
2. New Project → Name: `minpaku-cleaning` / Region: `Northeast Asia (Tokyo)` / Plan: Free（規模的に十分）
3. Database Password を生成・保管（パスワードマネージャ等へ）
4. 数分で作成完了 → 接続情報を取得:
   - Project URL（`https://xxx.supabase.co`）
   - Anon (public) key
   - Service Role key
5. ダッシュボード → Settings → API で上記3つを copy

controller は完了報告と接続情報の共有を待つ。**注: Service Role key は秘密情報。チャットには貼らず、Vercel 環境変数登録時に直接コピペで扱う方が安全。**

- [ ] **Step 2: 本番マイグレーション適用**

ユーザー操作 → controller 確認:
1. Supabase ダッシュボード → SQL Editor を開く
2. `app/supabase/migrations/0001_initial_schema.sql` 〜 `0006_submit_report_rpc.sql` の中身を順に貼り付けて Run（または Supabase CLI で `supabase db push`、ただし CLI 認証セットアップが必要）
3. 各 migration の成功を確認
4. テーブル一覧と RPC `submit_cleaning_report` の存在を確認

controller は SQL Editor 経由実行の手順を案内（CLI セットアップは追加学習コスト）。

- [ ] **Step 3: Storage バケット作成確認**

migration 0004 で `report-photos` バケット作成済みだが、本番 Supabase の SQL Editor 経由で `insert into storage.buckets` が動かない可能性あり（storage スキーマへの直接書き込みが Free プランで制限される場合）。
→ 動かなければ Supabase ダッシュボード → Storage → New bucket で `report-photos`（private）を手動作成。

- [ ] **Step 4: Commit（接続情報メモを内部 OPS_GUIDE に追記。Service Role key は記載しない）**

```bash
cd outputs/clients/minpaku-cleaning
# OPS_GUIDE.md の 環境変数一覧 セクションに、本番 Project URL / Region / Bucket 名 を埋める
git add handoff/internal/01-ops-guide.md
git commit -m "docs(handoff): OPS_GUIDE に本番 Supabase 接続情報を追記（key は除く）"
```

---

## Task 7: LINE Messaging API + Resend アカウント準備

**実行者:** ユーザー（工藤陸）が LINE Developers Console と Resend で操作。controller は手順案内。

- [ ] **Step 1: LINE Messaging API Channel 作成**

ユーザー操作:
1. https://developers.line.biz/console/ にログイン（LINE アカウントで）
2. Provider 作成（既存があれば再利用）→ 名前: `minpaku-cleaning` 等
3. Provider 内に Messaging API Channel 作成:
   - Channel name: `民泊清掃管理アプリ通知`
   - Channel description: 任意
   - Category: ライフスタイル
   - Subcategory: 適切なもの
4. Channel access token (long-lived) を発行 → copy
5. LINE Official Account Manager で:
   - 友だち追加 URL / QR コードを取得（スタッフへ配布用）
   - 「あいさつメッセージ」「応答メッセージ」をオフ（通知のみで使うため）
6. Webhook 設定: 本計画では Webhook 不要（push のみ・受信なし）。設定はオフのまま。

- [ ] **Step 2: スタッフが LINE で受信するための userId 取得方針**

LINE Messaging API の push に必要なのは `lineUserId`（U で始まる文字列）。これは「友だち追加した時点で取得可能」だが、追加直後に webhook で受信して保存するか、別途取得手段が必要。

本計画のシンプル対応:
- スタッフが友だち追加 → 公式アカウントから「あいさつメッセージ」で「あなたの ID」を返す簡易 Webhook を Plan 4 では実装しない（スコープ外）
- 代わりに、**管理者が手動でスタッフの `lineUserId` を取得 → スタッフ管理画面の `line_user_id` 欄に入力** する運用にする
- 取得方法: LINE Official Account Manager の「メッセージ受信履歴」または「ユーザー」一覧で確認可能（要 LINE 仕様確認）

→ この運用は OPS_GUIDE.md に追記する（Task 4 で書いたガイドを更新）。

- [ ] **Step 3: Resend アカウント作成**

ユーザー操作:
1. https://resend.com にサインアップ（GitHub/Google ログイン可）
2. Domains → Add Domain は当面スキップ（送信元は `onboarding@resend.dev` で OK・Free プラン）
3. API Keys → Create API Key → Permission: Full access、Domain: All
4. API キーを copy（一度きり表示）

- [ ] **Step 4: 取得した値を OPS_GUIDE に追記（キー本体は除く）**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/internal/01-ops-guide.md
git commit -m "docs(handoff): OPS_GUIDE に LINE Channel・Resend アカウント情報を追記"
```

---

## Task 8: Vercel プロジェクト + GitHub 連携 + 環境変数

**実行者:** ユーザー（工藤陸）が Vercel ダッシュボードで操作。controller は手順案内 + 環境変数リスト提供。

- [ ] **Step 1: GitHub リポジトリの準備**

`all-good-ops` リポジトリは monorepo であり、minpaku-cleaning アプリは `outputs/clients/minpaku-cleaning/app/` サブディレクトリ。Vercel は monorepo の subdirectory deploy をサポート（Root Directory 設定）。

確認事項:
- リポジトリは GitHub 上にあるか（`all-good-ops` の remote 確認 → なければ private repo として上げる必要あり。クライアント納品物だが工藤陸所有なのでクライアントへは公開しない）
- 既存の remote があるかは `git remote -v` で確認

controller がユーザーに案内・確認。

- [ ] **Step 2: Vercel ダッシュボードでプロジェクト作成**

ユーザー操作:
1. https://vercel.com/dashboard へログイン
2. Add New → Project → GitHub から `all-good-ops`（または該当リポ）を Import
3. Configure Project:
   - Project Name: `minpaku-cleaning`
   - Framework Preset: Next.js
   - **Root Directory**: `outputs/clients/minpaku-cleaning/app`
   - Build Command: デフォルト（`npm run build`）
   - Output Directory: デフォルト（`.next`）
4. Environment Variables（後述 Step 3 で個別に設定するため、ここでは未入力で Deploy ボタンを押さない）
5. Deploy 前に Step 3 を完了してから Deploy

- [ ] **Step 3: 環境変数を設定**

Vercel Project Settings → Environment Variables で以下を設定（Production / Preview / Development すべてに同じ値を入れる、または Production だけでも可）:

| Key | Value | 取得元 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | Task 6 Step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJxxx... | Task 6 Step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJxxx... | Task 6 Step 1 |
| `NEXT_PUBLIC_APP_URL` | https://minpaku-cleaning.vercel.app | Vercel デプロイ後の URL（初回 deploy 後に再設定）|
| `LINE_CHANNEL_ACCESS_TOKEN` | (long token) | Task 7 Step 1 |
| `RESEND_API_KEY` | re_xxx | Task 7 Step 3 |
| `MINPAKU_FROM_EMAIL` | onboarding@resend.dev | デフォルト維持 |
| `CRON_SECRET` | (openssl rand -hex 32 で生成) | ユーザーが生成 |
| `TZ` | Asia/Tokyo | Plan 3 review 持ち越し |

> 注: `NEXT_PUBLIC_APP_URL` は初回 deploy 後に Vercel が割り当てる URL を確認してから設定する（Task 9 で更新）。最初は空 or placeholder のまま Deploy。

controller はこの表を提示し、ユーザーが値を埋めるのを待つ。

- [ ] **Step 4: Commit（特に成果物はないが、進捗 commit）**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/internal/01-ops-guide.md
git commit -m "docs(handoff): OPS_GUIDE に Vercel プロジェクト設定を追記"
```

---

## Task 9: Vercel 初回デプロイ + URL 確定

- [ ] **Step 1: 初回 Deploy**

ユーザー操作:
1. Vercel ダッシュボードで Project → Deployments → Redeploy（初回デプロイ）
2. Build 成功を確認（数分）
3. 割り当てられた URL（例: `minpaku-cleaning.vercel.app`）を確認

- [ ] **Step 2: `NEXT_PUBLIC_APP_URL` を本番 URL に更新**

ユーザー操作:
1. Vercel → Settings → Environment Variables → `NEXT_PUBLIC_APP_URL` を `https://minpaku-cleaning.vercel.app` に設定
2. Redeploy（環境変数変更を反映）

- [ ] **Step 3: 本番 URL 動作確認**

ブラウザで `https://minpaku-cleaning.vercel.app/admin/login` にアクセス → ログイン画面が表示されることを確認（まだ管理者は未作成なのでログインは不可）。

- [ ] **Step 4: Commit**

```bash
cd outputs/clients/minpaku-cleaning
# OPS_GUIDE と admin-guide / staff-guide / owner-guide の URL placeholder を本番 URL に置換
git add handoff/
git commit -m "docs(handoff): 全ガイドの URL placeholder を本番 URL に置換"
```

---

## Task 10: 初期管理者 seed + 本番スモークテスト

- [ ] **Step 1: 初期管理者を本番 DB に seed**

ユーザー操作:
1. Supabase ダッシュボード → Authentication → Users → Add user で初期管理者を作成（メール + パスワード設定）
2. Supabase ダッシュボード → SQL Editor で以下を実行（user_id は前ステップで作成された UUID）:
   ```sql
   insert into admins (id, email, name, role_level)
   values ('<上記UUID>', '<管理者メール>', '<管理者名>', 1);
   ```

- [ ] **Step 2: 本番スモークテスト（管理者操作）**

ブラウザで本番URL を開いて以下を順に実施:
1. `/admin/login` → ログイン成功
2. `/admin/properties` → ダミー物件1件作成
3. `/admin/owners` → ダミーオーナー1件作成（line_user_id 空・email 工藤陸用）
4. `/admin/staff` → ダミースタッフ1件作成（line_user_id は手動取得後・email 工藤陸用）
5. `/admin/staff` → スタッフトークン発行
6. `/admin/properties` → 物件にオーナートークン発行・物件にスタッフ担当割当
7. `/admin/requests` → ダミー依頼1件作成 → スタッフへの通知（LINE+メール）が送信されることを確認
8. スタッフトークンURL を開いて承認 → 「開始」→ 簡易チェックリスト + ダミー写真1枚アップロード → 提出
9. `/admin/requests/[id]` で完了報告閲覧 → 「内容を確認済みにする」
10. オーナートークンURL を開いて履歴閲覧確認

各ステップで成功確認、失敗時は OPS_GUIDE の障害対応セクションを参照。

- [ ] **Step 3: 通知配信確認**

Supabase ダッシュボード SQL Editor で:
```sql
select kind, channel, status, recipient, sent_at
from notifications_log
order by sent_at desc
limit 20;
```
依頼作成・完了報告・確認完了 の通知が `status='sent'` で記録されていることを確認。`failed` があれば対応。

---

## Task 11: Cron 動作確認

- [ ] **Step 1: 3つの Cron が Vercel ダッシュボードに登録されているか確認**

Vercel ダッシュボード → Project → Settings → Cron Jobs で以下が表示されることを確認:
- `/api/cron/remind` — `0 8 * * *`
- `/api/cron/unassigned-alerts` — `0 * * * *`
- `/api/cron/cleanup-photos` — `0 18 * * *`

- [ ] **Step 2: 手動トリガで動作確認**

ローカルから本番 Cron エンドポイントを叩く（CRON_SECRET 必須）:
```bash
curl -H "Authorization: Bearer ${CRON_SECRET}" https://minpaku-cleaning.vercel.app/api/cron/unassigned-alerts
```
レスポンス `{"ok":true,"processed":0}`（または該当件数）を確認。Vercel Logs にエラーが出ていないことも確認。

3つすべてで動作確認。

---

## Task 12: クライアント検収シナリオ作成（client-facing）

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/client-facing/04-acceptance-test.md`

- [ ] **Step 1: 章立てと執筆**

章立て:

1. **検収の目的・進め方** — クライアントが触って動作を確認するシナリオ
2. **準備するもの** — 管理者用ログイン情報、スタッフ用テスト LINE 友だち追加、テスト用メールアドレス
3. **シナリオA: 管理者として一周** — ログイン → 物件登録 → スタッフ登録 → トークン発行 → 依頼作成 → 完了報告確認 → 内容確認済み（10ステップ程度・各ステップの期待結果明示）
4. **シナリオB: スタッフとして一周** — トークンURL → 承認 → 開始 → 完了報告提出
5. **シナリオC: オーナーとして閲覧** — トークンURL → 履歴・写真確認
6. **シナリオD: 通知の確認** — LINE/メール受信状況
7. **検収判定** — 各シナリオ OK/NG、NG の場合の連絡方法

controller が直接執筆。

- [ ] **Step 2: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/client-facing/04-acceptance-test.md
git commit -m "docs(handoff): クライアント検収シナリオ（client-facing）"
```

---

## Task 13: ドキュメント Google Drive アップロード

**Files:**
- 既存: `handoff/client-facing/01-04` の Markdown ファイル群

- [ ] **Step 1: Drive フォルダ確認**

メモリ `feedback_drive_deliverable_upload.md` に従い、Drive の「民泊清掃管理アプリ」フォルダ（`1DsQr8MvFW4Dyrm4XINNa2mwYBB8lIYrG`）に client-facing ドキュメント 4 本をアップロードする。internal ドキュメントは対象外。

- [ ] **Step 2: Drive MCP で create_file**

controller が Drive MCP の `create_file` を使い、4つの Markdown を順次アップロード:
- `01-admin-guide.md`
- `02-staff-guide.md`
- `03-owner-guide.md`
- `04-acceptance-test.md`

各ファイルは `parentId: "1DsQr8MvFW4Dyrm4XINNa2mwYBB8lIYrG"`、`contentMimeType: "text/markdown"`、`disableConversionToGoogleType: true`（Markdown のまま保持）or false（Google Doc 変換、クライアントが読みやすい）— **クライアント検収の見やすさ優先で false（Google Doc 変換）採用**。

- [ ] **Step 3: アップロード結果を controller がユーザーへ報告**

各ファイルの Drive リンクをユーザーに共有。クライアントへ案内する URL リストとして使う。

---

## Task 14: クライアント案内文ドラフト

**Files:**
- Create: `outputs/clients/minpaku-cleaning/handoff/client-facing/05-client-announcement-draft.md`（クライアント送付用テキスト下書き、外部共有しない controller 内部成果物）

- [ ] **Step 1: 案内文の章立てと執筆**

メール本文ドラフト:
- 件名: 「【お知らせ】民泊清掃管理アプリの検収準備が整いました」
- 本文:
  - お礼・スコープ完了の報告
  - 検収URL（Vercel 本番URL）
  - 管理者ログイン情報（初期メール・パスワード）の伝達方法（このメールには載せず、別経路推奨）
  - ガイド3本＋検収シナリオへの Drive リンク
  - 検収期間の目安・連絡先
  - LINE 公式アカウントへの友だち追加 QR/URL（スタッフへ展開してもらう用）
  - 運用フェーズへの移行（テスト運用 2026-06-中旬予定）

controller が直接執筆。

- [ ] **Step 2: 人間確認**

このドラフトは **送信前に必ずユーザー確認**。CLAUDE.md の「外部送信」カテゴリに該当。controller は文面を提示し、ユーザーが調整・承認・送信する。送信は controller では行わない。

- [ ] **Step 3: Commit**

```bash
cd outputs/clients/minpaku-cleaning
git add handoff/client-facing/05-client-announcement-draft.md
git commit -m "docs(handoff): クライアント案内文ドラフト（送信前にユーザー確認必須）"
```

---

## 完了条件（Plan 4）

- [ ] 納品ドキュメント 4 本（admin-guide / staff-guide / owner-guide / acceptance-test）が `handoff/client-facing/` に揃う
- [ ] 内部ドキュメント 2 本（ops-guide / transfer-ownership）が `handoff/internal/` に揃う
- [ ] Supabase 本番プロジェクトが作成され、migrations 0001-0006 が適用されている
- [ ] Storage バケット `report-photos` が本番に存在する
- [ ] LINE Messaging Channel と Resend アカウントが作成され、API キーが取得できている
- [ ] Vercel 本番プロジェクトが GitHub と連携され、環境変数が9個すべて設定されている
- [ ] 本番 URL でログイン画面が表示される
- [ ] 初期管理者が作成され、本番スモーク（管理者・スタッフ・オーナー1周）が成功している
- [ ] 通知（LINE・メール）が本番で配信されている（`notifications_log` で確認）
- [ ] Vercel Cron 3本が登録され、手動トリガで動作確認済み
- [ ] client-facing 4本が Google Drive にアップロードされている
- [ ] クライアント案内文ドラフトが完成し、ユーザーが確認待ち（送信は別途）

## Plan 4 持ち越し（次フェーズ向け）

- **クライアント検収フィードバック対応**: 検収中の修正リクエストは別タスクとして都度対応。検収完了をもって本納品終了。
- **LINE userId 自動取得 webhook**: 現状は手動取得運用。将来必要なら別タスクで webhook 実装（Plan 5+ 想定）。
- **カスタムドメイン**: 必要なタイミングで別タスク。
- **DB バックアップ自動化**: Supabase 自動バックアップで十分か、別途定期 dump が必要かは運用開始後に判断。
- **Vercel Cron 監視 + アラート**: 通知が長期間途絶えた場合のメタ通知（管理者へ「Cron 失敗しました」を別経路で）は将来検討。
- **ownership 移管の実行**: 検収後、クライアントが希望したタイミングで Task 5 の手順書に従って移管。

## 設計書 §1 「テスト運用 2026年6月中旬」 への接続

- 検収完了がテスト運用開始の前提
- 検収開始想定: Plan 4 完了直後（本計画着手から1〜2週間程度）
- テスト運用開始想定: 2026-06-中旬
- テスト運用中に出た不具合・要望は別フェーズで対応
