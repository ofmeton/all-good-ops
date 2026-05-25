---
date: 2026-05-24
category: situations
source: session
---

# x-account-design v9 体制決定

x-account-design（発信自動化システム）v9 設計に関する決定事項。x-account-design v9 は CLAUDE.md の発信戦略（ofmeton 3 媒体）の **上位プロジェクト** として位置づけ、既存の体制を取り込み・改変・撤廃する。

## 既存エージェント・スキルの撤廃

以下は v9 設計書 §3.1〜§4.8 の新設エージェント（Writer / Visualizer / Videographer / Hook Analyzer / Editor / Optimizer 等）に置き換える。

- brand-publisher（business-ops）
- visual-designer（横断）
- visual-design-system skill
- content-reviewer（横断）
- content-quality-rubric skill

## 統合する既存資産

- ai-radar v2 → 素材レイヤー（§3.1）に吸収
- x-buzz-radar → 翻案候補（§4.2 選別レイヤー）の入力に統合。twitterapi.io 直叩きの重複は撤廃
- outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md → Style Guide v1 の主原料に取り込み

## その他主要決定

- **インタビュー UX**: LINE 完結（ターミナル起動を必須としない）。LINE 通数超過コスト +¥700/月は ¥10,000 月予算枠内の誤差として許容
- **X 集客導線 3 パターン**を Optimizer の改善対象に追加:
  1. プロフィール常時 note リンク + X 投稿は URL 無し（URL 料金回避型）
  2. たまに note 送客ツイートを直投、それを引用 RT 派生で再露出
  3. 投稿末尾に「→ プロフィール参照」CTA
- **Phase 0 競合分析は計画通り実行**。既存収集済みツイート群（ai-radar / x-buzz-radar）も分析対象に加える
- **Shorts / Threads** は設計のみ、実装は次フェーズ持ち越し
- 失業手当ガード章は v9 から除外
- Managed Agents は「全部入り（仮）」で v9 起草。検証フェーズで MA 最小サンプル実装の実コスト測定後に最終確定
