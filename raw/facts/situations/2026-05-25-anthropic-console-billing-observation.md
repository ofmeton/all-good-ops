---
date: 2026-05-25
category: situations
source: session
---

# Anthropic Console billing 観測結果

B-3 残課題の Console billing dashboard 確認 (人間タスク) でユーザーがスクショ提供。

## 観測値 (今月累計、2026-05-24 終了時点)

- **トークンの合計コスト**: USD 2.04 (Sonnet 4.6 + Opus 4.7 + Haiku 4.5、他作業含む)
- **ウェブ検索の合計コスト**: USD 0.00
- **コード実行の合計コスト**: USD 0.00
- **セッション実行の合計コスト**: USD 0.02

## 解釈

B-3 で実行した 4 session 分の session-hour 課金合計が **$0.02 ≒ ¥3**。月予算 ¥10,000 の 0.03% で誤差レベル。

session-hour 単価試算:
- active_seconds 合計 152.7s × $0.08/h = $0.0034 (実測の 17%)
- duration_seconds 合計 367.9s × $0.08/h = $0.0082 (実測の 41%)
- duration_seconds × $0.20/h = $0.0204 (実測とほぼ一致)

→ session-hour の **実単価は $0.20/h 前後の duration 基準** の可能性が高い。ただし small sample で確証なし。

## v9 設計への影響

session-hour 月想定 ¥217 (v9 §3.3) → **¥3-15/月** に下方修正可能。MA 全部入りは cost 的にますます安心。

セッション別の per-session breakdown は Console UI から取れず (ユーザー確認)、深掘りは打ち切り。「セッション実行コスト合計」がトークンコストとは別 line item で見えることを確認できたのが今回の収穫。
