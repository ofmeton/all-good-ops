# wiki Log

> append-only。各エントリは `## [YYYY-MM-DD] <event> | <title>` で始める。
> `<event>` は `ingest` | `query` | `lint` | `phase`。
> `grep "^## \[" log.md | tail -10` で直近イベントが見える。

## [2026-05-09] phase | Phase 0 開始

LLM Wiki パターン導入の土台構築開始。
Spec: `docs/superpowers/specs/2026-05-09-llm-wiki-design.md`
Plan: `docs/superpowers/plans/2026-05-09-llm-wiki-phase0-1.md`

## [2026-05-09] phase | Phase 1 開始 - pricing-catalog 移行

`knowledge/context/pricing-catalog.md` → `wiki/business/bsa/pricing-catalog.md` 移動。
14 ファイルのリンク張替え済み（残存ゼロ確認）。frontmatter 追加（type=source, identity=工藤陸）。

## [2026-05-10] ingest | spade-motion-study (motion-techniques orphan 解消)

raw/notes/2026-04-26-spade-motion-absorption.md から取り込み:
- wiki/domain/lp-hp-design/spade-motion-study.md (source) 新規作成
- 双方向 cross-link: [[motion-techniques]] ↔ [[spade-motion-study]]
- motion-techniques.md frontmatter に sources/related 追加

並行作業 (Task E):
- wiki/business/bsa/overview.md に「演出技法（モーション）」セクション追加
- L1〜L4 商品ライン別の必須/推奨/過剰技法を明示
- BSA → motion-techniques 参照経路を確立

orphan 状況:
- 旧 motion-techniques.md wikilink:0 → 現 wikilink:2 (spade-motion-study + overview)
- 4 週間検証指標の ingest 件数: 1/5

## [2026-05-10] lint | MVP 動作確認 (Task 18)

軽量 lint（orphan / 名義3ライン混在 / wikilink 整合）実行:

検出:
1. **motion-techniques.md (orphan)**: wiki 内部から `[[motion-techniques]]` 参照なし。外部 (`.claude/agents/`) からは参照あり。MVP 段階では許容、Phase 2 で BSA overview から参照追加検討
2. **overview.md:44 broken wikilink**: `[[テラ一色民泊HP]]` → `[[terra-hayama]]` に修正済み

合格:
- 名義3ライン混在なし（identity: 工藤陸 = 8 ページ全て BSA + personal + clients 配下、ofmeton = SCHEMA 例示のみ、n/a = motion-techniques のみ）
- proposals/templates.md は `[[proposals/templates]]` 形式で参照されているため non-orphan

lint script 学び: basename フィルタ正規表現に `/` プレフィクス必要（`(log)\.md$` だと `pricing-catalog.md` を誤除外）。

## [2026-05-10] ingest | TERRA HAYAMA HP 制作（パイロット ingest）

raw/deals/2026-04-terra-isshiki/ から 4 素材を取り込み:
- 01-confirmation-items.md (v0.1, 2026-05-01)
- 02-confirmation-items-v0.2.md (v0.2, 2026-05-07 — 依頼者回答反映、最新)
- 03-photo-mapping-v0.2.md
- 04-design-direction-v0.1.md

作成ページ:
- wiki/people/clients/terra-hayama.md (entity)
- wiki/business/personal/deals/2026-04-terra-isshiki.md (source)

cross-link: 双方向 [[terra-hayama]] ↔ [[2026-04-terra-isshiki]]

設計調整: SCHEMA.md「名義3ライン分離」を update。工藤陸名義は BSA 配下のみ → BSA + personal + 関連 clients。
新クラスタ: wiki/business/personal/ + wiki/people/clients/

## [2026-05-09] phase | BSA wiki 新規 3 ページ作成

- business/bsa/overview.md (topic 型)
- business/bsa/proposals/templates.md (concept 型)
- business/bsa/lessons-proposal-patterns.md (topic 型)
overview から pricing-catalog/proven-track-record/lessons へ cross-link。

## [2026-05-09] phase | motion-techniques 移行

`knowledge/context/motion-techniques-catalog.md` → `wiki/domain/lp-hp-design/motion-techniques.md` 移動。
4 ファイル（conversion-designer, design-director, system-engineer, rapid-hp-operator）のリンク更新。
frontmatter 追加（type=concept, identity=n/a）。

## [2026-05-09] phase | proven-track-record 移行

`knowledge/context/proven-track-record.md` → `wiki/business/bsa/proven-track-record.md` 移動。
- prompt-builder.ts の readFileSync パス更新（実行時に新パスを参照）
- rapid-hp-operator.md のリンク更新
- frontmatter 追加（type=source, identity=工藤陸）
- パス解決動作確認済み（node -e existsSync=true）

## [2026-05-10] phase | memory ↔ wiki 重複整理（Phase 1 残務）

auto-memory と wiki の重複を解消し、SSOT を wiki に一本化:

- `wiki/business/bsa/overview.md` 補強:
  - Week KPI 運用方針（テンプレ + 中止判定ライン + 実値参照先）
  - BSA 脱出後の本命戦略（D1/D3/L3 継続化）
  - 営業プラットフォーム（Lancers/Coconala/CW/Indeed）
  - 実績露出ルール（CPA84%削減 = 毎提案 / 3000万 PoC = 小出し / portfolio = 全面公開）
- `memory/project_bsa_strategy.md` を pointer 化（17日前の Week1 KPI 過去化を解消）
- `memory/project_terra_isshiki.md` を pointer 化（古情報「最大6名前後」「中断状態」削除、wiki 8名確定と整合）
- `memory/MEMORY.md` の説明文を pointer 中心に更新

整理後の状態:
- BSA 戦略の SSOT: wiki/business/bsa/ 配下 5 ページ
- TERRA HAYAMA の SSOT: wiki/people/clients/terra-hayama.md + wiki/business/personal/deals/2026-04-terra-isshiki.md
- memory はキーワード入口の pointer 役に専念

orphan / 名義3ライン混在は導入なし（lint 不要）。

## [2026-05-10] phase | Phase 2 開始 - icecream 移行 + business 整理

spec の正規 Phase 2 に着手（B 推奨アプローチ: 実体重視で段階移行）。

新規作成:
- `wiki/business/icecream/overview.md` (entity, identity=工藤陸)

移行:
- `knowledge/context/context-rice-cream.md` (109 行) → `wiki/business/icecream/overview.md` 移行 + 旧ファイル削除
- 「業務委託先（オーナー）」は memory 側に残し wiki に書かない（守秘）

参照張替え:
- `.claude/agents/business-ops/rice-cream-ops.md` の 2 箇所を新パスに更新

context-business.md 整理:
- 77 行 → 30 行に圧縮
- BSA 詳細セクション（Week1 KPI / 商品ライン / 営業プラットフォーム / 関連ドラフト）削除（wiki と重複・古化）
- 業務委託一覧テーブルを SSOT カラム付きに刷新（wiki ページへのポインタ化）
- 移行履歴セクション追加

保留:
- portfolio / shopify / finance クラスタ: 素材薄いため未作成（次回 ingest で素材が貯まったら）
- context-finance.md: 28 行で実体ほぼなしのため今回触らない
- context-goals/ibasho/life: spec 上 Phase 3

## [2026-05-10] phase | Phase 2 続き - portfolio クラスタ作成

ofmeton 名義の HP/LP 制作物カタログサイト用のクラスタを新設。

新規作成:
- `wiki/business/portfolio/overview.md` (entity, identity=ofmeton)

集約内容:
- portfolio リポ位置・公開 URL（portfolio-fawn-eight-63.vercel.app）
- 名義位置づけ: portfolio 本体は ofmeton 名義、BSA（工藤陸）でも実績露出 OK の運用ルール明記
- 主要サンプル 3 本（minato/hiyori/numata）のコンセプト要約
- src/pages/ サンプル一覧（10 本）
- clients/ 配下の納品物テーブル（totonoeru-hayama / hayama-tanada-biyori、後者は名義要確認）
- 関連リソース（design/outline/research/sample_descriptions.md）への pointer
- 運用ルール: 新サンプル追加プロトコル / Vercel team 認可 / cwd 切替

memory pointer 更新:
- `reference_portfolio_url.md` を wiki への pointer 化（旧: URL 単独 → 新: 名義位置づけ含む pointer）
- `MEMORY.md` の説明文更新

cross-link: [[overview|BSA overview]] / [[2026-04-terra-isshiki]] / [[terra-hayama]] / [[motion-techniques]]

## [2026-05-10] phase | Phase 3 部分着手 - self/goals + ibasho/overview 移行

spec の Phase 3 のうち、context-goals.md / context-ibasho.md を wiki 化（context-life.md は古化・参照ゼロのため保留）。

新規作成:
- `wiki/self/goals.md` (topic, identity=工藤陸)
  - **CLAUDE.md と同期**: 旧戦略KGI #3「AIコスト月 5,000 円以内」削除（CLAUDE.md で外された）
  - 戦略KGI を BSA #1 / 月収凍結 / 居場所 / 生活 の 4 本に再編
  - BSA Week KPI 連動を反映、実値参照先を明示
- `wiki/ibasho/overview.md` (topic, identity=工藤陸, status=draft)
  - 薄いまま移行（ingest で育てる前提）
  - BSA 期間中は副次の旨を追記

移行:
- `knowledge/context/context-goals.md` (35 行) → `wiki/self/goals.md` 移行 + 旧ファイル削除
- `knowledge/context/context-ibasho.md` (26 行) → `wiki/ibasho/overview.md` 移行 + 旧ファイル削除

参照張替え:
- `.claude/agents/life-planning/goal-tracker.md`
- `.claude/agents/life-planning/career-strategist.md`
- `.claude/agents/kodomo-ibasho/ibasho-designer.md`
- `.claude/agents/kodomo-ibasho/nonprofit-advisor.md`
- `.claude/skills/context-update.md` のトピックルーティングテーブルを wiki パスに更新（rice-cream / BSA / portfolio 行も追加）

保留:
- `context-life.md`: 古化（失業手当が CLAUDE.md で制約から外れた）、参照ゼロ。次回判断
- `context-business.md` / `context-finance.md`: 軽い情報集約として残す



## [2026-05-10] ingest | memory → raw 4本 → wiki 5ページ 一括投入

Claude auto-memory（user_* / project_* / feedback_*）を raw に素材化し、wiki の空クラスタを展開。

**raw 新規作成（4本）**:
- `raw/self/profile.md` — user_* 3件合成（職歴・スキル・NDA方針）
- `raw/notes/streams-2026-05.md` — project_current_streams + rice_cream 合成（収入源ポートフォリオ）
- `raw/notes/lp-design-learnings.md` — feedback LP系 7件合成（mobile-first・改行制御・マーキー・コピー・Playwright）
- `raw/notes/image-processing-learnings.md` — feedback 画像処理系 4件合成（MPS タイル・グリッド・Playwright）

**wiki 新規作成（5ページ）**:
- `wiki/self/profile.md` (entity, identity=工藤陸) — プロフィール・職歴・スキル SSOT
- `wiki/self/streams.md` (topic, identity=工藤陸) — 収入源ポートフォリオ全体像
- `wiki/domain/lp-hp-design/design-principles.md` (concept, identity=n/a) — LP/HP設計原則7項目
- `wiki/domain/image-processing/techniques.md` (concept, identity=n/a) — 画像処理ノウハウ（新クラスタ）

**index.md 更新**: self クラスタ 3ページ / domain に image-processing クラスタ追加 / 統計更新

## [2026-05-10] phase | Phase 3 完了 - context-life 削除

`context-life.md` を git rm（古化: 失業手当が CLAUDE.md で制約から外れた / 参照ゼロ）。
`context-update.md` skill のトピックルーティングテーブルから「予定、体調、手続き」行を削除、移行状況コメントを更新。

knowledge/context/ の残存: context-business.md / context-finance.md（薄い情報集約として維持）。

## [2026-05-10] lint | Phase 3 区切り lint（wiki 17 ページ）

並行セッションの一括 ingest（memory → raw 4本 → wiki 5ページ）を含む 17 ページに対して軽量 lint 実行。

検出 → 修正:
1. **orphan 4 件 → 全解消**:
   - `design-principles.md` ← `motion-techniques.md` の related に追加
   - `image-processing/techniques.md` ← `design-principles.md` の related に追加
   - `streams.md` ← `goals.md` の related + 本文「実値の参照先」に追加
   - `ibasho/overview.md` ← `goals.md` の `[[ibasho/overview|...]]` 明示化で inbound 成立
2. **曖昧 wikilink → 修正**: `goals.md` の `[[overview]]` 単独参照 5 箇所を `[[business/bsa/overview|BSA overview]]` / `[[ibasho/overview|...]]` に明示パス化

合格:
- 名義3ライン混在なし（工藤陸 13 / ofmeton 1 / n/a 4）
- portfolio (ofmeton) → BSA overview (工藤陸) の参照は URL 露出運用ルールの説明であり、クライアント情報の cross-link ではない（SCHEMA 違反なし）

lint 学び: basename での inbound カウントは同名 `overview.md` が複数あると誤検出する。厳密チェックは `[[<相対パス>]]` 形式で行う。

## [2026-05-15] phase | housekeeping - deals/index 登録・.obsidian 整理

session 4211b802 の続き。Phase 3 仕上げ前の wiki housekeeping。

- `wiki/business/bsa/deals/index.md`（並行セッションの `sync_deals_to_wiki.py` 生成物）を index.md の bsa クラスタに登録。`overview.md` の関連ページに `[[deals/index]]` を張り inbound 成立（orphan 解消）。
- `.obsidian/` の追跡不整合を整理: 揮発する `workspace.json` を `.gitignore` に追加。共有設定（app/appearance/core-plugins/graph）は追跡継続。
- `index.md` 統計行を内部不整合（「18（…= 21 を含む）」）から「21（3 + コンテンツ 18）」に修正。

## [2026-05-15] phase | Phase 3 真の完了 - context-business / context-finance 削除

`knowledge/context/` 配下の最後の 2 ファイルを削除。ディレクトリが空になり、context → wiki 移行が完了。

削除:
- `context-business.md`（業務委託一覧・注意事項は `wiki/self/streams.md` + CLAUDE.md に既出。実体は既にポインタ集）
- `context-finance.md`（古化: 最終更新 2026-04-06、失業手当が CLAUDE.md で制約から外れた。収入源は `wiki/self/streams.md` が SSOT）

参照張替え（10 箇所）:
- `CLAUDE.md` セッション開始動作: `knowledge/context/` 起点 → `wiki/index.md` 起点（削除済み `context-goals.md` への dangling 参照も同時解消）
- `.claude/skills/context-update.md`: 概要・移行状況コメント・ルーティングテーブル 2 行を wiki パスへ
- `.claude/skills/daily-scan.md`: 出力例を wiki パスへ
- エージェント 7 本（rice-cream-ops / brand-publisher / freelance-scout / shopify-operator / client-manager / cashflow-tracker / message-crafter）の「起動時に必ず行うこと」を wiki SSOT 参照に変更

注: `docs/superpowers/{specs,plans}/` の移行 spec/plan は当時の計画記録として残置（dangling 参照ではない）。

## [2026-05-15] phase | external クラスタ作成（spec Phase 3 残）

spec の Phase 3「外部参照ページ作成」を実施。これで spec Phase 3 が完了。

新規作成（2 ページ、ともに type=entity / identity=n/a）:
- `wiki/domain/ai-industry/ai-radar-pointer.md` — ai-radar（外部スポーク）への外部参照ポインタ
- `wiki/external/monetize-os-pointer.md` — monetize-os の存在記録のみ（はぐりん名義のため
  名義3ライン分離に従い詳細・persona 情報は持ち込まない）

index.md 更新: domain に ai-industry クラスタ追加 / external セクションを「（Phase 3 残）」から
monetize-os エントリに / 統計 21 → 23 ページ。

orphan 解消: `wiki/self/streams.md` に「関連: 外部スポーク」セクション追加し
`[[ai-radar-pointer]]` / `[[monetize-os-pointer]]` の inbound を成立。frontmatter related も更新。

## [2026-05-20] phase | Phase 4 publishing クラスタ初期化

- 新規クラスタ wiki/publishing/ を作成（index / log / buzz-patterns / by-media×3 / by-theme×4 / inspirations プレースホルダ）
- spec §3 リサーチ要点を buzz-patterns / by-media / by-theme に seed として注入
- raw/publishing/inspirations/ ディレクトリと README を作成
- SCHEMA 例外規定（自動 ingest 許可）追記済み（前 commit）

参照: docs/superpowers/plans/2026-05-20-publishing-pivot-phase4.md Phase 4B
