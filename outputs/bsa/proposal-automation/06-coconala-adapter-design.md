# Coconala 公開依頼 adapter 実装設計

作成日: 2026-05-15 / 状態: ドラフト（実地調査済み）

## 調査で確定した事実

### 1. ページ構造（playwright headless で実地確認・cookie 不要で閲覧可）

| 対象 | URL | 備考 |
|---|---|---|
| カテゴリ一覧 | `https://coconala.com/requests/categories/<id>` | 1ページ 40件・`?page=N` ページネーション |
| 案件詳細 | `https://coconala.com/requests/<request_id>` | h1 にタイトル |
| 提案フォーム | `https://coconala.com/offers/add/<request_id>` | **未ログインで `/login` にリダイレクト** |

### 2. 一覧カードのセレクタ（`.c-searchItemWrapper` 内）

| 項目 | セレクタ | 例 |
|---|---|---|
| カテゴリ | `.c-itemInfo_category` | "ホームページ作成・サイト制作" |
| 説明（抜粋） | `.c-itemInfo_description` | "建設会社の新規ホームページの企画、設計…" |
| 予算 min/max | `.d-requestBudget_emphasis` ×2 | "5万" "8万"（「見積り希望」時は emphasis なし） |
| 予算区切り | `.d-requestBudget_between` | "〜" |
| 応募者数 | `.c-itemTileLine_emphasis`（"応募者数" caption の次） | 64 |
| 募集期限・日数 | `.c-itemTileLine_emphasis`（"募集期限" caption の次） | 6 |
| 募集期限・日付 | `.c-itemTileLine_remainingDate` | "（5月21日まで）" |
| 詳細リンク | `a.c-searchItem_detailLink[href]` | `https://coconala.com/requests/5030575` |
| 依頼者 | `a[href^='/users/']` | `/users/5404460` |

**注意**: タイトルはカード内に独立セレクタが見つからなかった。**詳細ページの `h1` から確実に取得**する（CW adapter と同じく一覧→詳細の2段取得）。

### 3. 提案フロー

- 提案ボタン: 詳細ページの `a.c-requestButtonPrimary_offer` → `href="/offers/add/<request_id>"`
- **提案にはログイン必須**（cookie 必要）。collector の閲覧は cookie 不要
- ログイン手段: Google / Yahoo / Facebook / Apple / メール
- **出品が必要かは未確定** — `/offers/add/<id>` はログイン後でないとフォームが見えないため

### 4. 母集団規模

- グループ全体（categories/22）で 33,720 件
- ホームページ作成（500）単体で 10,396 件
- 競合は 1案件あたり 29〜64名（LAN/CW より多め）

## 実装設計

### Phase A-1: collector adapter（cookie 不要・今すぐ実装可能）

**新規ファイル**: `src/collector/adapters/coconala.py`

- `base.py` の adapter インターフェースを実装
- 巡回 URL（platforms テーブル管理）: `categories/500`（HP）, `categories/503`（LP）, `categories/644`（修正）
- 各カテゴリ `?page=1` のみ巡回（CW/LAN と同じ 1ページ取得方針）
- カード40件 → 詳細リンク抽出 → 各詳細ページで h1 タイトル + 本文取得
- `job_id` 採番: `CN-YYYYMMDD-NNN`（既存 LAN/CW と同形式）
- 予算パース: 「5万」→ 50000、「見積り希望」→ budget_min/max とも NULL
- 締切パース: 「（5月21日まで）」→ `2026-05-21`（**前回の deadline parser バグに注意**: 掲載日と混同しない）

**DB 変更**:
```sql
INSERT INTO platforms(prefix, name, search_urls, enabled) VALUES (
  'CN', 'Coconala',
  '["https://coconala.com/requests/categories/500","https://coconala.com/requests/categories/503","https://coconala.com/requests/categories/644"]',
  1
);
```

→ これだけで Coconala 案件がダッシュボードに並び、generator が提案文を生成する状態になる。**提案投下だけ手動**。

### Phase A-2: form_fill 自動入力（cookie 必要）— ✅ 実装完了（2026-05-15）

**実地調査で確定した事実**:
- **出品不要** — `/offers/add/<id>` は出品ゲートなしで直接開く
- ログインは bot 検知が厳しく、Playwright バンドル Chromium だと「認証できませんでした」で弾かれる
  → **実 Google Chrome（`channel="chrome"`）+ 永続プロファイル**で駆動して回避
- フォーム要素（DOM 構造 SSOT は memory `reference-coconala-propose-dom`）:
  - 提案内容: `#OfferContent`（**200字以上必須**）
  - 提案金額: `#OfferPrice`（**税込**入力）
  - 納品希望日: `#OfferExpireDate`（pickadate.js・readonly）→ hidden `data[Offer][expire_date]`
  - 送信: `button.comp-submit-animate`（入力ページ「確認する」/ 確認画面「応募する」）
- **確認画面あり = LAN 型 2 段階**（確認する → 確認画面 → 応募する）

**完了した実装**:
- `scripts/lib/_coconala_login.py` — 実 Chrome + 永続プロファイル（`chrome-profile-cn/`）でログイン
- `scripts/relogin.sh` — `cn` ターゲット追加
- `scripts/setup.sh` — 初回 CN ログインを追加
- `scripts/lib/_coconala_form_fill.py` — 永続プロファイル再利用・pickadate 日付処理・2段階送信・
  `--no-auto-confirm` / `--no-auto-submit` 対応
- `src/dashboard/app/api/proposals/[jobId]/fill-form/route.ts` — `scriptByPrefix` に `CN` 追加
- `src/dashboard/components/ProposalEditor.tsx` — `isCW` 2way → LAN/CW/CN 3way（CN 用「① 提案内容欄」レイアウト）

**残: E2E テスト** — CN 案件の提案文を generator で生成 →
`_coconala_form_fill.py --job-id CN-... --no-auto-submit` で入力〜確認画面到達まで実機検証。
最終「応募する」送信パスのみ未検証（probe では意図的に押していない）。

## 実装順序とブロッカー

| ステップ | cookie | 工数 | ブロッカー |
|---|---|---|---|
| A-1: collector adapter + DB | 不要 | 半日 | なし — **今すぐ着手可** |
| 出品要否の確認 | 必要 | 5分 | ユーザーの Coconala ログイン |
| A-2: form_fill + 3way 化 | 必要 | 半日〜1日 | 上記 + フォーム構造調査 |

## 推奨

**Phase A-1 を先に実装**して Coconala 案件の収集・提案生成を動かす。並行してユーザーに「Coconala ログイン cookie の取得」と「出品要否の確認」を依頼。cookie が揃い次第 A-2 に進む。

A-1 だけでも「33,720件の母集団から fit の高い案件が毎日ダッシュボードに並ぶ」状態になり、手動投下でも母集団拡大の効果は得られる。

## 人間確認が必要な項目

- [ ] Phase A-1 の実装着手（collector adapter・コード追加のみ・承認不要だが規模大）
- [ ] Coconala ログイン cookie の取得（ユーザー作業）
- [ ] 出品要否の確認結果次第で「BSA 用サービス出品」の要否を再判断
