---
date: 2026-05-22
category: situations
source: session
---

# ai-radar の目的ピボット

ai-radar の目的を以下のとおり転換する（ユーザー発話による）。

## 撤廃
- AI エコシステム機会発見 + Skills 事業防衛シグナル検知のダッシュボード（旧定義）

## 新目的
1. 自分自身（ユーザー）の Claude 活用のための情報源
2. 最新情報発信（X / Instagram / note の 3 媒体）のためのネタ集め

## 開発方針
Codex MCP をタッグで活用してリサーチ・コード生成を併走させ、Claude のトークン消費を抑えながら ai-radar をアップデートしていく。

## 波及
- CLAUDE.md の ai-radar 関連記述（外部スポーク説明 / ルーティングキーワード / agent 役割）の見直しが必要
- memory の関連エントリ（あれば）の見直しが必要
- ai-radar 側 CLAUDE.md / 実装方針ドキュメントの見直しが必要
- 発信ピボット戦略（2026-05-20）との整合性は高い（ネタ集めの自動化として位置づけ）

## v2 改訂 (2026-05-22 同日)
全面撤廃ではなくハイブリッド構成を採用。**「事業防衛」というラベルは捨て、市況シグナル監視機能を縮小形で残す**ことが決定。

### 残す市況シグナル 3 種
- `vertical_surge`: 発信ターゲット業界 (税理士 / 行政書士 / 工務店 / 介護 等) の AI 化動向
- `bm_shift`: 収益化プラットフォーム動向 (note / Stripe Japan / Stan Store / Gumroad / Brain)
- `r1_risk`: Anthropic Skills/Workflow 公式商品化 (Skills Marketplace 構想の早期警報)

### 撤廃するシグナル
- `D_opportunity` (エンタープライズ): 当面参入予定なし
- 競合プラットフォーム直接競合視点 (n8n Creator Hub / LangChain Hub): 販売側に回らない判断
- Tier1 即時 Gmail 通知: 即動かないと事業が崩れる前提が失効

### 新 pipeline 分類
旧: opportunity / business_defense / both / noise (4)
新 v2: **claude_tip / content_seed / market_signal / both / noise** (5)

詳細計画: `outputs/documents/ai-radar/09-pivot-plan.md` (v2)
