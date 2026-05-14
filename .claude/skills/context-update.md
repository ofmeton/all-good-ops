# 文脈更新（Context Update）

## 概要
`wiki/` 配下の SSOT ページを最新状態に保つためのスキル。デイリースキャンで得た情報をもとに、関連するページを更新する。

> **移行状況**（LLM Wiki Phase 3 完了 2026-05-15）:
> - `knowledge/context/` 配下は全て wiki に移行済み・ディレクトリは空。更新先は全て `wiki/` 配下の SSOT ページ

## 実行タイミング
- morning-routine.sh で daily-scan の直後
- セッション中に重要な情報変化があった場合

## トピックルーティング

新しい情報を以下のcontextファイルに振り分ける:

| トピック | 更新先 | 更新例 |
|---------|--------|--------|
| 収支、請求、入金、経費 | `wiki/self/streams.md`（収入源構成）/ 詳細収支は `data/cashflow/` | 新しい入金、経費の発生 |
| 居場所、社団法人、子ども | `wiki/ibasho/overview.md` | ミーティング結果、リサーチ進捗 |
| Shopify、案件、クライアント、発信 | `wiki/self/streams.md` ほか（クライアントは `wiki/people/clients/`、BSA は `wiki/business/bsa/`） | 新規案件、売上変動 |
| KPI、目標、進捗 | `wiki/self/goals.md` | KPI 数値の更新 |
| RICE CREAM 店舗 | `wiki/business/icecream/overview.md` | 売上・シフト・新メニュー・SNS |
| BSA 戦略・提案・実績 | `wiki/business/bsa/overview.md` ほか配下 5 ページ | Week KPI / 提案学び / 実績追加 |
| portfolio サンプル・URL | `wiki/business/portfolio/overview.md` | 新サンプル追加・clients/ 案件 |

---

## 3視点分析

contextファイルを更新する際、以下の3視点で情報を整理する:

### 1. 事実（Fact）
- 何が起きたか / 変わったか
- 数値データ、日時、関係者

### 2. 含意（Implication）
- この変化は何を意味するか
- KGI/KPIへの影響は？

### 3. アクション（Action）
- この情報に基づいて何をすべきか
- 誰に伝えるべきか

---

## contextファイルの書式

```markdown
# [トピック名] コンテキスト

最終更新: YYYY-MM-DD

## 現在の状況
（現在の状態を簡潔に記述）

## 直近の変化
- YYYY-MM-DD: [事実] → [含意] → [アクション候補]

## 注意事項
（特に気をつけるべきこと）

## 関連KPI
（このトピックに関連するKPIの現在値）
```

---

## 更新ルール

### DO
- 事実ベースで記述する
- 日付を必ず含める
- 既存の記述と矛盾する場合は上書きではなく追記（旧情報に取り消し線を使わず、「YYYY-MM-DD更新:」で最新情報を追加）

### DON'T
- 推測を事実として書かない（推測には「（推定）」と付記）
- 長文にしない（各contextファイルは200行以内を目安）
- 全てのcontextを毎回更新しない（変化があったものだけ）

---

## コスト管理
- 更新が不要なcontextファイルは開かない
- 更新は追記が基本（全体書き換えを避ける）
- 目標トークン数: 1,000以内
