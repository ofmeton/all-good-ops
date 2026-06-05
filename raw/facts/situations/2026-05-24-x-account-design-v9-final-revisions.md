---
date: 2026-05-24
category: situations
source: session
---

# x-account-design v9 ユーザー最終レビュー反映 (v9.0.2)

ユーザーが v9.0.1 に対して 2 点の追加修正を返し、最終反映済み。

## 1. Anthropic 公式 / RSS / market_signal の別実装不要、twitterapi.io でカバー

v9.0.1 で「Anthropic 公式 / RSS / market_signal を v9 内で新規実装、素材レイヤー 5 系統」としていたのを撤回。

新方針:
- **ai-radar のコード・機能とも完全撤廃・再実装不要**
- Anthropic 公式の情報は **twitterapi.io 上で @AnthropicAI / @ClaudeAI / @simonw / Anthropic Engineering 等のフォロー対象に追加** することで間接カバー
- 関連業界アカウント (Claude/AI 業務自動化発信者) も同様に twitterapi.io でカバー
- RSS / market_signal の別 fetcher は実装しない
- 素材レイヤーは v9 当初の 2 系統に確定 (twitterapi.io + Claude Code 履歴系)

## 2. gpt-image-2 を第一候補に変更 (API で使用可能想定)

- v9.0.1 で「gpt-image-1 第一候補、gpt-image-2 は ChatGPT 内蔵のみで API 未公開」としていたが、ユーザー認識では「gpt-image-2 は API で使用できるはず」
- 公式 docs 403 で確認できず、ユーザー認識を尊重して **gpt-image-2 第一候補に変更**
- 料金は実装着手時に公式 pricing で再確認、暫定 gpt-image-1 並と仮置き
- 利用不可だった場合 gpt-image-1 に fallback

## v9 確定バージョン

これで v9 はユーザー確認済みの **v9.0.2** として確定。次は git commit / PR 作成へ。
本格的な v9.1 は Phase 0 完了時に起こす (Style Guide v1 と一緒、note 詳述含む)。

## 次のアクション

- 新 task ブランチ `task/260524-x-account-design-v9` を切る (現 `task/260524-self-improve-it6` は self-improve 主題のため別ブランチ必須)
- x-account-design v9 関連の全ファイル (v9.md + B-1〜B-3 検証成果 + raw save 3 件 + B3-ma-cost-script/) を staging
- commit → push → PR 作成
- self-improve loop の差分は本セッションで触らない (別件として残置)
