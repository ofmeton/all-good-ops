---
type: topic
created: 2026-05-09
updated: 2026-05-20
sources: []
related: [[pricing-catalog]], [[proven-track-record]], [[lessons-proposal-patterns]], [[archive-notice]]
tags: [bsa, strategy]
status: archived
---

# BSA 戦略全体像

> **⚠ ARCHIVED 2026-05-20**: BSA 戦略は完全撤退しました。
> 撤退記録: [[archive-notice]]
> 後継戦略: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`

2026-04-22〜2026-08-22 の 4 ヶ月タイムボックス型 HP 制作ブートストラップ戦略。
工藤陸（本名）名義で運用。

## 核ルール

- 名義: 提案文・契約書・請求書は必ず工藤陸（本名）
- AI 表記: 外部露出物では「AI 活用」のみ。「Claude」「Anthropic」等の固有名詞は出さない
- 価格 SSOT: [[pricing-catalog]]
- SLA: 納期超過時は料金の 20% 返金 または 翌日以内に無料修正
- 作業ディレクトリ: `outputs/bsa/`

## 商品ライン（詳細は [[pricing-catalog]]）

- L1: Rapid Single LP / 30,000 円 / 72 時間
- L2: Rapid Corporate 5P / 80,000 円 / 7 日
- L3: Rapid LP + 広告運用初月 / 100,000 円 / 96 時間
- L4: Express 修正・改修 / 10,000〜30,000 円 / 24 時間対応

## 担当エージェント

- rapid-hp-operator: BSA 運用統括（提案投下・KPI・SLA）
- 実制作: portfolio / system-engineer
- 案件スキャン: freelance-scout
- 文面推敲: message-crafter

## 演出技法（モーション）

商品ライン別の動き提案・実装で参照する標準語彙。

- [[motion-techniques]] — LP/HP 演出技法カタログ（技法 1〜7+ 補助）。早見表で L1/L2/L3 の必須・推奨・過剰を即決
- [[spade-motion-study]] — 技法 1〜7 の出所（spade-co.jp 観測駆動解析）

商品ライン別の使い分け（カタログ §案件タイプ別早見表 を参照）:
- L1 Single LP: 必須は技法 1（文字フェード）、推奨は技法 5（パララックス）
- L2 Corporate 5P: 必須は 1, 5、推奨は 4（slide-in）。技法 7（WebGL）は過剰
- L3 LP+広告運用: 必須は 1, 5、CTA 周辺で技法 6（SVG モーフ）が映える
- L4 Express: 既存サイトに馴染ませる前提で、新規モーション追加は控える

## Week KPI 運用方針

Week 単位で「提案投下」「受注」「納品」「評価」を計測する。具体的な実値は wiki に書かない（古化を避けるため）。

### テンプレ（毎週この粒度で見る）

| 指標 | 目安 |
|---|---|
| 提案投下 | 15〜25 件/週 |
| 受注 | 1〜3 件/週 |
| 納品 | 1〜3 件/週 |
| 評価 | ★5（★4 以下が出たら原因分析） |

### 中止判定ライン（Week ごと）

- 返信率が連続 2 週で 5% 未満 → テンプレ・価格・プロフィールの根本見直し
- 受注 0 件が連続 2 週 → 商品ライン・価格の見直し（最低 L1 1件は確保すべき）

### 実値の参照先

- 週次レビュー出力: `scripts/weekly-review.sh` の生成物
- 改善履歴: `data/improvement-log.jsonl`
- 提案ログ: `outputs/bsa/proposal-automation/` 内 DB（Sqlite）

## BSA 脱出後の本命戦略

BSA は 4 ヶ月タイムボックスの踏み台。タイムボックス満了時、または途中で次フェーズへ移行可能になった時点で以下に展開:

- **D1**: 既存領域（Shopify / D2C 広告運用）の直営業 — 認定ランサー / Coconala プラチナの肩書を活用
- **D3**: monetize-os（はぐりん名義）との連携で発信からのインバウンド — BSA は実装力の証明として機能
- **L3 継続化**: 広告運用（広告費原価の 20% / 月）の継続契約を BSA 期間で 2〜3 件確保 → Month5+ の安定収益源化

## 営業プラットフォーム

| 媒体 | 役割 | プロフィール / 出品 |
|---|---|---|
| Lancers | メインの提案投下先 | プロフィール: `https://www.lancers.jp/mypage/ofmeton`（刷新済み） |
| Coconala | 待ちチャネル（出品から流入） | L1/L4 先行 → 全 4 商品展開予定 |
| CrowdWorks | スキャン対象（即時提案） | 通知ベース |
| Indeed | フリーランス検索 | 補助 |

提案投下の自動化システムは `outputs/bsa/proposal-automation/` 配下（収集 → 生成 → ダッシュボード → 自動入力の一気通貫）。

## 実績露出ルール

提案文に載せる実績の出し分け基準:

- **CPA 84% 削減（D2C 寝具）**: 毎提案で出して OK（業種問わず汎用的に効く）
- **D2C マットレス 3000 万 PoC** 等: 小出し（一気に全部は出さない、業種マッチ時に強調）
- **ポートフォリオ 3 本（minato / hiyori / numata）**: 全面公開 OK。URL は `https://portfolio-fawn-eight-63.vercel.app/`

詳細は [[proven-track-record]] 参照。

## 関連ページ

- [[pricing-catalog]] — 価格 SSOT
- [[proven-track-record]] — 提案文に書ける実績 SSOT
- [[lessons-proposal-patterns]] — 提案文の学び（lint で育てる）
- `clients/` — BSA クライアント像（Phase 2 以降の ingest で増える。BSA 枠外個人案件は [[terra-hayama]] のように `wiki/people/clients/` 側）
- [[deals/index]] — BSA 受注台帳 INDEX（`sync_deals_to_wiki.py` 自動生成。案件ごとの記録は配下の個別ページ）
- `proposals/templates.md` — 提案文テンプレ

## 外部参照

- 戦略詳細: `CLAUDE.md` の「## BSA戦略」セクション
- 関連 spec: `docs/superpowers/specs/2026-05-09-llm-wiki-design.md`
- 関連 plan: `docs/superpowers/plans/2026-05-09-llm-wiki-phase0-1.md`
