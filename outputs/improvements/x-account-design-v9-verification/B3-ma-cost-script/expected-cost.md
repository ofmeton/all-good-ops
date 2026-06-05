# 期待 cost 試算 (実行前)

実行前に「どこまで使ったら異常」を decimal で固めるための事前試算。
実測値は `B3-ma-cost-result.md` に別途記録し、本ファイルと差分比較する。

換算レート: 1 USD = 155 JPY (2026-05 想定)

---

## 前提となる pricing (要 cross-check)

| モデル / 単位 | input ($/1M) | output ($/1M) | 出典 |
|---|---|---|---|
| Sonnet 4.6 | 3 | 15 | (要確認、2026 春想定) |
| Opus 4.7   | 15 | 75 | (要確認) |
| Haiku 4.5  | 1 | 5 | (要確認) |
| **MA session-hour** | **$0.08/h (wall-clock)** | — | claude.com/blog/claude-managed-agents |
| MA web search | $10 / 1,000 件 | — | (今回のサンプルでは使わない) |

注: 価格は公式ページで都度確認。Anthropic は半年単位で改定する。

---

## ケース 1: Interviewer 1 セッション (Sonnet 4.6, 5 ターン)

| 項目 | 値 |
|---|---|
| input tokens | 500 × 5 = **2,500** |
| output tokens | 200 × 5 = **1,000** |
| wall-clock 想定 | 5-10 分 → **0.125 h** (中央値) |
| **token cost** | 2,500/1M × $3 + 1,000/1M × $15 = $0.0075 + $0.015 = **$0.0225** |
| **session cost** | 0.125 × $0.08 = **$0.01** |
| **合計** | **$0.0325** ≒ **¥5.0** |

異常判定ライン: $0.10 (¥15) 超過 → wall-clock が想定外に長引いた / token usage 過大

---

## ケース 2: Optimizer Phase 2 1 回 (Opus 4.7, 約 30 分)

| 項目 | 値 |
|---|---|
| input tokens | 3,000 (analytics + 仮説) |
| output tokens (thinking 含む) | 5,000 |
| wall-clock | 30 分 → **0.5 h** |
| **token cost** | 3,000/1M × $15 + 5,000/1M × $75 = $0.045 + $0.375 = **$0.42** |
| **session cost** | 0.5 × $0.08 = **$0.04** |
| **合計** | **$0.46** ≒ **¥71** |

異常判定ライン: $1.50 (¥230) 超過 → extended thinking が暴走 / wall-clock 1h 超

備考: thinking budget は agent 側で 5,000 tok 程度に絞っておくと安全。`extended_thinking.budget_tokens` を agent 定義で設定。

---

## ケース 3: 月間想定 (v9 のフル稼働モデル)

| 用途 | 回数/月 | 1 回 cost | 月額 |
|---|---|---|---|
| Interviewer (日 2 回 × 30 日) | 60 | $0.0325 | **$1.95** ≒ **¥302** |
| Optimizer Phase 2 (週 1) | 4 | $0.46 | **$1.84** ≒ **¥285** |
| **MA 関連 合計/月** | — | — | **$3.79** ≒ **¥587** |

注: v9 の他コンポーネント (Content Generator, Posting Bot, Analytics Fetcher 等) は MA を使わない前提。MA は会話的タスク (Interviewer) と長時間バッチ (Optimizer) のみ。

---

## ケース 4: 中断/再開挙動の試算 (検証目的)

5 ターン目前に 30 秒 sleep を挟むと:

- 想定 wall-clock: 5-10 分 + 30 秒 = 約 6 分
- session cost 差分: 30 秒 / 3600 × $0.08 = **$0.00067**

→ 実測で session cost が `(5 ターン処理時間 / 3600) × $0.08` に近ければ「active runtime のみ課金」、`(5 ターン処理時間 + 30s) / 3600 × $0.08` に近ければ「wall-clock 全期間課金」と判定可能。
**現時点では公式 blog で "wall-clock 課金" 明記あり**、本検証は確証取り。

---

## 全体の今回ラン総コスト見積もり (1 回切り)

| ラン | 想定 cost |
|---|---|
| Interviewer 通常 | $0.0325 |
| Interviewer 30s sleep | $0.0335 |
| Optimizer Phase 2 | $0.46 |
| **本検証 1 回の合計** | **$0.53** ≒ **¥82** |

バッファ込みでも **$2 (¥310) 上限** で停止すれば十分に安全。

---

## 何が分かるか (このコストで得る情報)

1. MA session-hour が **wall-clock 全期間課金 vs active runtime のみ** か (重要)
2. SDK 経由 vs REST 直叩きでの差 (今回は SDK 使用)
3. token usage が retrieve API で取れるかどうか
4. Opus 4.7 + extended thinking の thinking token 量と output cost への寄与
5. 月額 ¥587 想定が現実的かどうか (v9 全体導入判断のキー数字)
6. Console の usage dashboard 上で session-hour と token が分離表示されるか
