# @ofmeton/x-account-system

ofmeton AI 業務自動化発信システム (X / Instagram / note 3 媒体)、Phase 0 Week 0 実装。

設計書 SSOT: `outputs/improvements/x-account-design-v10-2.md` (Codex 重大 5 件 inline patch 反映済)

## 構成

```
apps/x-account-system/
├── README.md                — 本ファイル
├── HUMAN_TASKS.md           — 人間タスク一覧 (Phase 1 着手前必須)
├── package.json             — npm scripts (budget / oauth:test / fallback:dry-run / relabel)
├── tsconfig.json
├── .env.example             — 環境変数テンプレ (実値は .env.local、git に乗せない)
├── migrations/              — Supabase migration (CR-2)
│   ├── 0001_materials_store.sql
│   ├── 0002_posts_performance.sql
│   ├── 0003_rls_policies.sql
│   └── 0004_style_guide_optimizer.sql
├── lib/
│   ├── dlp/                 — CR-2 DLP redaction + lint
│   │   ├── redact.ts
│   │   └── lint.ts
│   ├── cost/                — CR-3 月予算 workload + シナリオ
│   │   ├── cost-model.csv
│   │   └── budget-calculator.ts
│   ├── hook-classifier/     — CR-5 primary_hook + devices
│   │   └── classify.py
│   ├── oauth/               — CR-4 X OAuth 2.0 PKCE test harness
│   │   ├── pkce-test.ts
│   │   └── oauth-test-checklist.md
│   └── fallback/            — CR-1 owned channel fallback trigger
│       └── trigger.ts
├── config/
│   └── fallback_channels.yaml   — owned channel 定義 + trigger 表
├── scripts/
│   └── relabel-tweets.py    — 既存 928 tweets を primary_hook で再分類
└── data/
    └── relabeled-928.json   — relabel 結果 (567 件 own-posts)
```

## クイックスタート

```bash
cd apps/x-account-system
npm install

# 月予算 expected / low / p95 シナリオを確認
npm run budget

# DLP redaction を試す
echo "田中様の請求書 ¥120,000 を 03-1234-5678 まで" | npm run dlp:lint

# Hook 分類器を 1 件試す
echo "30 分かかってた請求書作成が、Claude で 3 分になった。最初は失敗しまくったけど" | \
  python3 lib/hook-classifier/classify.py

# Fallback trigger を dry-run
npm run fallback:dry-run

# OAuth PKCE test harness Step 1 (要 X_CLIENT_ID 設定)
npm run oauth:test -- --step=authorize
```

## Phase 0 Week 0 着手前リスト (v10.2 §8)

CR-1〜CR-5 の Claude 側実装は **本 PR で完了**。残りは `HUMAN_TASKS.md` 参照:

| CR | Claude 実装 | 人間タスク (HUMAN_TASKS) |
|---|---|---|
| CR-1 | `config/fallback_channels.yaml` + `lib/fallback/trigger.ts` | H-8 (note 購読 50 / ドメイン取得 / LINE 30) |
| CR-2 | migrations 0001-0004 + `lib/dlp/*` | H-2 (Supabase project + migration apply) + H-9 (顧客同意) |
| CR-3 | `lib/cost/cost-model.csv` + `budget-calculator.ts` | H-10 (月予算 ¥10,000 同意 + brownout 理解) |
| CR-4 | `lib/oauth/pkce-test.ts` + `oauth-test-checklist.md` | H-1 (X Developer Console + Client ID/Secret) |
| CR-5 | `lib/hook-classifier/classify.py` + `scripts/relabel-tweets.py` | (なし、人間不要) |

## Phase 0 で確認できた数値 (CR-5 検証)

`scripts/relabel-tweets.py --posts-dir /tmp/phase0/posts` 実行結果 (国内 10 アカ 567 own-posts):

| primary_hook | % | 解釈 |
|---|---:|---|
| tips_enum | 75.8% | 国内発信者の最頻パターン |
| business_repro | 17.5% | 業務再現・SOP 解説 |
| critique | 3.5% | 業界批評 |
| **failure_story** | **3.2%** | **ofmeton の空白市場確証** (Phase 1 で 25-30% を打てば 8 倍差別化) |

→ v10.2 Style Guide v1 の Hook 配分仮説 (Phase 0 Report §6.2) の妥当性が数値で支えられた。

## v10 シリーズの位置付け

| 版 | PR | 役割 |
|---|---|---|
| v9 | #14 | 起源、13 章 + 付録 3 |
| v9.1 | #15 | note レイヤー詳述 |
| v9.2 | #16 | X / Instagram 詳述 |
| v10 | #17 | v9+v9.1+v9.2 統合完全版 (1,183 行) |
| v10.1 | #18 | Phase 0 反映 (M-1〜M-14) |
| **v10.2** | **#18** | **Codex 重大 5 件 inline patch** |

## Phase 1 着手の手順

1. `HUMAN_TASKS.md` H-1〜H-5 + H-8 + H-10 を完了
2. `npm run oauth:test -- --step=authorize` から始まる Step 1-5 を全て ✅
3. `npm run budget` で `expected ≤ ¥10,000` を確認
4. Cloudflare Workers 反映は `DEPLOY.md` 参照 (`wrangler.toml` + `src/worker.ts` scaffold 済。各 job の lib 配線は次フェーズ)
5. **人間承認つき 1 投稿/日** から開始 (Phase 1 KPI: note 月売上 3 万円 / X 500 / IG 300)

## 設計書参照

- 最新: `outputs/improvements/x-account-design-v10-2.md` (v10.2)
- Phase 0 知見: `outputs/improvements/x-account-design-v10-phase0/competitor-report.md`
- Codex 指摘: `outputs/improvements/x-account-design-v10-phase0/codex-cross-review.md`
