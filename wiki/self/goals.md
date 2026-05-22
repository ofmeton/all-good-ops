---
type: topic
created: 2026-05-10
updated: 2026-05-10
sources: [knowledge/context/context-goals.md (移行元・2026-04-06 初版)]
related: [[business/bsa/overview]], [[ibasho/overview]], [[streams]]
tags: [goals, kgi, kpi, self]
status: active
---

# KGI/KPI 進捗

CLAUDE.md「最上位ミッション」「戦略KGI」を漸進的に追跡する SSOT。
goal-tracker / career-strategist が起動時に必ず読む。

## 最上位 KGI（CLAUDE.md と同期）

> 月収26万円を安定確保しつつ、事務・意思決定の負荷を 30% 削減し、社会的ミッション（子どもの居場所づくり）を 2026 年上半期以内に具体化する。

## 戦略 KGI 進捗

| # | 戦略 KGI | ステータス | 備考 |
|---|---|---|---|
| 1 | **BSA戦略（2026-04-22〜08-22）の完走** | 🟡 稼働中 | Week1-16 KPI 達成、認定ランサー / Coconala プラチナ到達。詳細 [[business/bsa/overview|BSA overview]] |
| 2 | 月収 26 万円の安定達成 | ⏸ 凍結中 | **BSA 期間中は Week KPI を優先、月収目標は凍結**（CLAUDE.md 整合） |
| 3 | 子どもの居場所の具体化（2026 年以内）＋ 社団法人設立 | 🟡 準備中 | [[ibasho/overview|ibasho overview]] 参照 |
| 4 | 生活の安定と精神的余裕 | 🟡 安定化中 | 退職後フェーズ。失業手当は制約条件から外した（CLAUDE.md 整合） |

**変更履歴**: 旧戦略KGI #3「AIコスト月 5,000 円以内」は KGI から外した（実態に合わないため、2026-04-23 CLAUDE.md 体制刷新で削除）。

## 主要 KPI

| KPI | 現在値 | 目標 | 状態 |
|---|---|---|---|
| **BSA Week KPI（提案 / 受注 / 納品 / 評価）** | 週次レビュー出力参照 | [[business/bsa/overview|BSA overview]] の Week KPI 運用方針 | 🟡 |
| 月収合計 | 未計測 | 260,000 円（凍結中） | ⏸ |
| Shopify 月間売上 | 未計測 | 要設定 | ⚪ |
| RICE CREAM 月間報酬（業務委託マネージャー） | 未計測 | 要確認 | ⚪ |
| フリーランス月間売上（BSA 含む） | 未計測 | 要設定 | ⚪ |
| SNS・ブログ月間収益（はぐりん名義は monetize-os 側） | 0 円 | 50,000 円 | 🔴 |
| 居場所マイルストーン進捗率 | 0% | 100%（2026 年内） | 🔴 |
| Asana タスク完了率 | 未計測 | 要設定 | ⚪ |
| 未処理事務タスク滞留日数 | 未計測 | 2 日以内 | ⚪ |

## 凡例

- 🟢 順調 / 🟡 要注意 / 🔴 未達 / ⚪ 未計測 / ⏸ 凍結中

## 実値の参照先

- BSA Week KPI: `scripts/weekly-review.sh` 出力 + [[business/bsa/overview|BSA overview]] / `data/improvement-log.jsonl`
- 提案ログ: `outputs/bsa/proposal-automation/` 内 SQLite
- Asana タスク: Asana MCP 経由
- 収入源ポートフォリオ全体像（各業務委託の月額目安・稼働時間配分）: [[streams]]

## 更新履歴

| 日付 | 更新者 | 内容 |
|---|---|---|
| 2026-04-06 | 初期設定 | KGI/KPI テーブル骨格を整理 |
| 2026-05-10 | LLM Wiki Phase 3 | `knowledge/context/context-goals.md` → `wiki/self/goals.md` 移行。AIコスト KGI 削除、BSA Week KPI 連動・月収凍結中を反映、CLAUDE.md と同期 |
