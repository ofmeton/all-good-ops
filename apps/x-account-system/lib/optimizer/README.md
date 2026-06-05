# Optimizer (Thompson Sampling) — PR-C

x-account-system の Optimizer 層。Writer の生成パラメータ 8 系統を Thompson Sampling で改善し、Editor 通過後の投稿に対する PCR / url_link_clicks をもとに posterior を更新する。

## SSoT

- `outputs/improvements/x-account-design-consolidated/initial-values-design.md` §3 / §8
- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §2.6, §7.2
- `outputs/improvements/x-account-design-consolidated/style-guide-all-versions.md` (Hook / 4 排他軸 / Visualizer)

## 8 Optimizer 対象パラメータ

1. **投稿時間帯** (`postingTime`): 5 band Beta (empirical Bayes)
2. **Hook 配分** (`hookDistribution`): 7 軸 Beta + verified failure_story 月 ≤ 4 cap (Thompson 適用外)
3. **publishing_lag** (`publishingLag`): 4 軸 Discrete
4. **4 排他軸** (`contentAxis`): Dirichlet α=(1,2,3,4) → translation 10% / paraphrase 20% / opinion 30% / first_hand 40%
5. **citation_explicit_rate** (`citationExplicitRate`): Beta(13, 7) → mean 65%
6. **X format 比率** (`xFormatRatio`): Current SSOT v10.3 短文 50% / 中文 25% / 長文 10% / スレッド 10-15% (Beta(2,8) 弱 prior、合計 95-100% 弾性)
7. **Visualizer モード** (`visualizerMode`): Dirichlet α=(7, 1.5, 1.5) → image 70% / video 15% / text 15%
8. **industry_sop 投稿率** (`industrySopRate`): Beta(4, 16) → mean 20%

## §8.3 死守 (Optimizer が動かしてはいけない)

| パラメータ | 制約 | guards.ts での実装 |
|---|---|---|
| verified failure_story 月 ≤ 4 | monthly cap | `clipFailureStoryMonthlyCount` + `thompsonExempt` |
| first_hand ≥ 30% | lowerBound | Dirichlet 比率を 30% / 70% で再正規化 |
| industry_sop 月 ≥ 5 投稿 (target 6) | lowerBound = 5/30 | Beta posterior の mean を clip |
| hashtag 0 個 | fixedValue 0 | (Publisher 層が文字列で固定) |
| AI 生成画像 ≤ 10% | upperBound 0.1 | `visualizerImageAiGen` の mean を clip |

## §8.4 自由 (Optimizer が optimize する)

| パラメータ | レンジ | 合計制約 |
|---|---|---|
| 時間帯比率 | 各 band 5-40% | 100% |
| Hook 配分 (failure_story 除外) | 各 5-30% | 100% |
| X format 比率 | 短文 30-60% / 中文 15-35% / 長文 5-20% / スレッド 5-20% | 95-100% (スレッド 5% 弾性) |
| Visualizer 比率 | image 50-80% / video 5-25% / text 10-20% | 100% |

## ファイル構成

```
lib/optimizer/
├── types.ts              型定義 (OptimizerState / ParameterPosterior / SuccessSignal / GuardRule)
├── thompson.ts           Sampler (Beta / Dirichlet / Discrete) + posterior 更新
├── state-store.ts        Supabase optimizer_state + in-memory fallback + buildInitialState
├── reward-extractor.ts   posts_performance → SuccessSignal (PCR top 30% OR url_link_clicks > median)
├── update-loop.ts        runOptimizerUpdate (loop / anomaly rollback / guard apply)
├── guards.ts             §8.3 死守 + §8.4 自由 範囲 clip
├── README.md             本ドキュメント
├── __mocks__/            jest mock (state-store / reward-extractor)
├── __fixtures__/         5 scenario fixture (01-05)
└── optimizer.test.ts     Jest test (5 シナリオ + sampler 単体)
```

## Phase 0.5 (in-memory fallback)

`IN_MEMORY_FALLBACK=true` で:

- `state-store.ts`: process 内 Map に state + snapshot を保持
- `reward-extractor.ts`: 事前 inject した observations 配列を返す
- 全 test/dry-run はネットワーク非依存で動く

Phase 1 で:

- `optimizer_state` テーブル (migration `0006_optimizer_state.sql` 追加予定) に切替
- `posts_performance` join → 実際の PCR / url_link_clicks 抽出
- Supabase rollback は snapshot_id を `optimizer_state.snapshot_history` に持たせて UNDO

## test 実行

```bash
cd apps/x-account-system
IN_MEMORY_FALLBACK=true npx jest lib/optimizer
# or
npm run optimizer:test
```

## 既知 limitations / TODO

- verified failure_story Hook は Thompson 適用外 (上限 cap のみ) — initial-values §3.2 (c) SSOT
- empirical Bayes prior は competitor 24 アカ集計 (3.1 / 3.2) を反映済みだが、N<5 の Hook は Beta(1,1) ではなく弱 prior (α×20 形式) を採用 (= 観測 5 件未満時の posterior 動作差は実運用で再検討)
- publishing_lag の `first_hand` は固定値なし (initial-values §3.3 SSOT) — Optimizer は posterior 更新するが推奨値を持たない
- Phase 1 で `update-loop.ts` を cron 化する際は monthly_audit.sh に loop hook を追加すること
