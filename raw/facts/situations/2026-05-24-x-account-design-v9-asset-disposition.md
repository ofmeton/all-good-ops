---
date: 2026-05-24
category: situations
source: session
---

# x-account-design v9 既存資産の最終 disposition

B-1 棚卸し結果を受けた最終決定。

## 撤廃 (コード破棄、再実装も不要)

- **ai-radar**: コード撤廃 + **v9 で再実装も不要**。Anthropic 公式 / RSS / market_signal 取得機能は v9 では持たない。Supabase project `jzlhzfdvaculblgwlkxz` (81 articles) も x-account-design v9 では参照しない
- **x-buzz-radar**: コード撤廃。ただし以下のロジック資産は v9 起草の **設計参考素材** として活用 (コード再利用ではない、考え方の流用):
  - Supabase スキーマ 8 テーブル設計 (query_pool / x_buzz_tweets / prompt_variants / our_posts / post_engagement_snapshots / variant_weights / config / enrichment_drafts)
  - relevance + pattern 抽出プロンプト
  - 媒体派生プロンプト (X thread / note outline / IG carousel)
  - 2 軸自己改善ループ (Track A 検索 + Track B 生成、媒体別 z-score 正規化)

## データ取り込み (コード非統合)

- **publishing research REPORT.md** (別 worktree `all-good-ops-jp-publishers/` 内、commit de16523): v9 §7 Style Guide v1 主原料として参照。10 アカ × 928 tweets × Tier1/2/3 空白分類

## スタック制約

v8 §3.2 のスタック構成 (Cloudflare Workers Paid + Managed Agents + Supabase + GitHub Actions + LINE Messaging API + Codex MCP/OpenAI画像 + VOICEVOX + Remotion) を厳格に採用。スタック変更が必要になったら「x-buzz-radar 撤廃でゼロ build」を選んだ判断と整合しなくなるため、v9 起草で例外は出さない。

## v9 素材レイヤー (§3.1) スリム化

ai-radar 撤廃 + 再実装不要により、v9 素材レイヤーは次の 2 系統のみ:

1. twitterapi.io 海外バズ (v9 で新規実装、x-buzz-radar 設計を参考)
2. Claude Code 履歴 / Git commit / 案件メモ / 音声メモ (v9 で新規実装)

Anthropic 公式 / RSS / market_signal 系は素材レイヤーから削除。
