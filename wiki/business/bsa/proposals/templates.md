---
type: concept
created: 2026-05-09
updated: 2026-05-09
sources: []
related: [[overview]], [[lessons-proposal-patterns]]
tags: [bsa, proposal, template]
status: draft
identity: 工藤陸
---

# 提案文テンプレ集

BSA 提案文の標準骨子と、案件タイプ別バリエーション。
パイロット ingest が回ってから、勝ち筋パターンを書き起こす。

## 関連素材（raw 扱い）

- `outputs/bsa/proposal-automation/src/generator/prompts/proposal.txt` — 自動生成プロンプト本体
- `outputs/bsa/proposal-templates.md` — 既存テンプレドラフト
- `outputs/bsa/` 配下の各種ドラフト

## 標準骨子（仮）

ランサーズ提案画面の 4 セクション構造に従う:

| セクション | DB カラム | 内容 | 推奨字数 |
|---|---|---|---|
| ① 自己PR・実績欄 | `description_md` | 案件理解・アプローチ・実績ハイライト・クロージング | 1,500〜2,000字 |
| ② 見積もりの詳細欄 | `estimate_md` | 工程別の金額内訳・スケジュール・含まれるもの | 500〜1,000字 |
| ③ 計画 / マイルストーン | `milestones_json` | 一括 1個（基本）or 分割。納期日・税抜き金額・説明 | - |
| ④ 追加オプション | `options_json` | 共通＋案件特化、3〜5個推奨、最大10個。税抜き金額 | 各 60〜150字 |

詳細は `.claude/agents/business-ops/rapid-hp-operator.md` フロー A.6 参照。

## 案件タイプ別バリエーション

### L1（Rapid Single LP）

（Phase 1 パイロット ingest で埋める）

### L2（Rapid Corporate 5P）

（Phase 1 パイロット ingest で埋める）

### L3（Rapid LP + 広告運用初月）

（広告運用要素を含む案件向け）

### L4（Express 修正・改修）

（短期間の修正案件向け）

## 学び

[[lessons-proposal-patterns]] に蓄積される横断学びを参照。
