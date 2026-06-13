# wiki Index

> **このファイルは LLM が ingest/lint で自動更新します。人間は触らないでください。**
> 人間が wiki を眺めるには Obsidian graph view を使ってください。

## 起動時に最優先で読む

- [hot](hot.md) — ホットキャッシュ（~500 words の作業文脈サマリ）。詳細仕様: [SCHEMA](SCHEMA.md) §ホットキャッシュ

## business

- [freee-invoice](business/freee-invoice.md) — freee 請求書(invoice/iv API)運用 SSOT（company_id バグ・立替分類・POST 最小ペイロード）

### bsa
- [overview](business/bsa/overview.md) — BSA 戦略全体像（4 ヶ月タイムボックス）
- [pricing-catalog](business/bsa/pricing-catalog.md) — 商品ライン L1/L2/L3/L4 価格・納期・オプション SSOT
- [proven-track-record](business/bsa/proven-track-record.md) — 提案文に書ける実績 SSOT（Phase 2 で業種別分解検討）
- [proposals/templates](business/bsa/proposals/templates.md) — 提案文テンプレ集（パイロット ingest で育てる）
- [lessons-proposal-patterns](business/bsa/lessons-proposal-patterns.md) — 提案勝ち筋の横断学び（lint で育てる）
- [deals/index](business/bsa/deals/index.md) — BSA 受注台帳 INDEX（`sync_deals_to_wiki.py` 自動生成）

### icecream
- [overview](business/icecream/overview.md) — RICE CREAM 店舗 SSOT（業務委託マネージャー / @BEATICE0923）

### portfolio
- [overview](business/portfolio/overview.md) — ofmeton 名義 HP/LP カタログサイト（minato/hiyori/numata + clients/）

### personal
- [deals/2026-04-terra-isshiki](business/personal/deals/2026-04-terra-isshiki.md) — TERRA HAYAMA HP 制作（葉山・個人案件）

## domain

### lp-hp-design
- [motion-techniques](domain/lp-hp-design/motion-techniques.md) — LP/HP 演出技法カタログ（spade-co.jp 解析由来）
- [spade-motion-study](domain/lp-hp-design/spade-motion-study.md) — spade-co.jp モーション技法吸収の出所記録（2026-04-26 解析）
- [design-principles](domain/lp-hp-design/design-principles.md) — LP/HP 設計原則カタログ（mobile-first・改行制御・マーキー・コピー規定・Playwright）

### image-processing
- [techniques](domain/image-processing/techniques.md) — 画像処理ノウハウ（MPS タイル推論・グリッド切り出し・Playwright 状態観測）

### ai-industry
- [ai-radar-pointer](domain/ai-industry/ai-radar-pointer.md) — ~~ai-radar（外部スポーク）への外部参照ポインタ~~ **(archived 2026-05-27)** ai-radar 撤廃済み・履歴のため pointer は残置

## people

### clients
- [terra-hayama](people/clients/terra-hayama.md) — TERRA HAYAMA（葉山民泊・BEAT ICE 運営）

## self

- [goals](self/goals.md) — KGI/KPI 進捗 SSOT（CLAUDE.md と同期）
- [profile](self/profile.md) — 工藤陸 プロフィール・職歴・スキル SSOT（NDA 方針含む）
- [streams](self/streams.md) — 現在の収入源ポートフォリオ（BSA・RICE CREAM・Shopify・稼働時間）
- [engineering-principles](self/engineering-principles.md) — 振り返り由来のエンジニアリング/プロセス原則（連結学びノート・成長型）

## dev

- [standards](dev/standards.md) — 開発設計 SSOT（A:スタック非依存の設計規律 + B:スタック別規約[採用時のみ]・architect 必読）
- [agent-teams-playbook](dev/agent-teams-playbook.md) — agent teams 運用正本（チーム編成・ワークフロー・ガードレール・有効化手順）
- [external-api-ops](dev/external-api-ops.md) — 外部 API 運用 playbook（コスト先出し・料金 WebSearch・curl 事前確認・wrapper 1 ファイル化・社会 API first try・SDK deploy 検証）
- [vercel-deploy-gotchas](dev/vercel-deploy-gotchas.md) — Vercel デプロイ ハマり集（env REST API 投入・env pull 罠・deploy 切り分け・Hobby cron・team author email・monorepo cwd）
- [subagent-dispatch](dev/subagent-dispatch.md) — サブエージェント dispatch playbook（検証コマンド必須・固定制約・branch 報告・ts-jest CJS NG list・並列 shared file 直列化）

## ibasho

- [overview](ibasho/overview.md) — 子どもの居場所構想 SSOT（draft、ingest で育てる）

## external

- [monetize-os-pointer](external/monetize-os-pointer.md) — monetize-os（外部スポーク・はぐりん名義収益化）の存在記録ポインタ

---

## publishing

- [index](publishing/index.md) — ofmeton 名義の発信戦略（X / Instagram / note）目次
- [buzz-patterns](publishing/buzz-patterns.md) — 媒体横断のバズパターン SSOT（lint で育てる）
- [by-media/x](publishing/by-media/x.md) — X 特化の学び
- [by-media/note](publishing/by-media/note.md) — note 特化の学び
- [by-media/instagram](publishing/by-media/instagram.md) — Instagram 特化の学び
- [by-theme/before-after](publishing/by-theme/before-after.md) — Before-After 型の学び
- [by-theme/prompt-collection](publishing/by-theme/prompt-collection.md) — プロンプト集型の学び
- [by-theme/hook-patterns](publishing/by-theme/hook-patterns.md) — フック 1 行目パターン集
- [by-theme/visual-templates](publishing/by-theme/visual-templates.md) — 視覚デザインの参考集

---

## 統計（lint で更新）
- 総ページ数: 25（SCHEMA/index/log 3 + コンテンツ 22：bsa 6 + icecream 1 + portfolio 1 + personal 1 + lp-hp-design 3 + image-processing 1 + ai-industry 1 + people 1 + self 3 + dev 2 + ibasho 1 + external 1）
- 最終 ingest: 2026-05-10 (memory → raw 4本 → wiki 5ページ一括 ingest)
- 最終 lint: 2026-05-10 (Phase 3 区切り lint - orphan 4 件全解消・曖昧 wikilink 修正)
- 最終 phase: 2026-06-06 (agent-teams 体制 Phase 0-3 - dev クラスタ/standards/architect/system-engineer拡張/playbook)
