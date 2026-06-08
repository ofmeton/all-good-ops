---
type: concept
created: 2026-06-06
updated: 2026-06-06
sources: [raw/facts/situations/2026-06-04-xad-operational-and-money-bot-down.md]
related: [[self/engineering-principles]], [[dev/agent-teams-playbook]]
tags: [engineering, standards, design-process, agent-teams, ssot]
status: active
---

# 開発設計 SSOT

横断の設計作法を 1 本に束ねた正本。**案件をまたいで設計をブレさせない**ための地図。
`architect` エージェントは設計を出す前に本ページを必読する。

**技術スタックは案件ごとに柔軟に選定する**。本 SSOT は:
- **A. スタック非依存の設計規律** … 常に適用する設計の進め方・品質規律（主軸）
- **B. スタック別規約** … そのスタックを**採用した場合のみ**参照する付録（現状 Next.js+Supabase のみ）

スタック選定そのものは縛らない。architect が案件要件から判断し、採用したスタックの B 節を参照する。

役割分担:
- **本ページ（standards）= どう作るか**（実装チェックリストと参照先）
- [[self/engineering-principles]] **= なぜそうするか**（振り返り由来の高次原則 6 個）
- 詳細手順は各 skill が正本。本ページは**原文を持たず所在を指す**（トークン最小・drift 防止）

> 凡例: 各項目は「規約の要点 → 正本の所在」。`skill:` は `.claude/skills/<name>/`、`mem:` は auto memory の feedback。

---

# A. スタック非依存の設計規律（常に適用）

## A1. 命名・構造

- ファイル/slug は kebab-case、日付は `YYYY-MM-DD`（wiki と統一） → `wiki/SCHEMA.md`
- 1 ファイル = 1 責務。肥大は責務過多のサイン（分割を検討） → [[self/engineering-principles]] 原則6

## A2. 設計フェーズ（着手時）

- データ契約を**生成→整形→出力で単一契約に固定**してから実装に入る → 原則4
- 永続層のスキーマ変更は**実スキーマを先に Inspect**（既存構造・分布確認）してから設計 → `mem:feedback_db_migration_pre_inspect`
- ユーザーシナリオ（正常/例外/権限差/空状態/エラー/同時操作）を網羅し必要機能を洗い出す → architect 設計プロセス §2
- 改善シナリオ（拡張/スケール/仕様変更/障害）を見越し改善レバーを明確化 → architect 設計プロセス §4

## A3. テスト・本番検証

- **「テスト緑」≠「本番動作」**。新機能は本番 env で 1 回 end-to-end 実走 → 原則2 / `mem:feedback_tests_green_but_production_stub`
- queue/cron 等の不安定経路は lib をローカル tsx で prod 実行して診断 → `skill:prod-lib-diag` / 原則2
- 既知バグは deferred せず improvement-log 記録 + その場/次 PR で修正 → 原則3 / `mem:feedback_known_bug_no_defer`

## A4. エラーハンドリング・観測

- 外部 API / LLM 出力は**境界で検証 + 欠損は安全側デフォルト補完**してから内部へ → 原則1 / `mem:feedback_validate_llm_external_output`
- エラー調査は先頭 `[システム名]` で**発信元を最初に確定**してから着手 → 原則5 / `mem:feedback_error_source_first`
- **本番運用は観測可能に設計する**。主要工程・判断分岐・外部呼び出しを trace / 構造化ログで記録し、後の改善判断の前提を残す。記録対象と粒度は設計時に確定し、ログ過多・PII は避ける → 実績: `apps/xad-dashboard`（trace 計装 + registry + 観測 UI）

## A5. デプロイ・リリース（汎用）

- deploy 後 smoke で**全 secret 投入を verify**（署名系 secret 欠落は 401 でなく 500 で顕在化） → `mem:feedback_deploy_verify_all_secrets`
- **本番反映は人間確認必須**（CLAUDE.md 人間確認ルール）。agent teams はデプロイ手前まで → [[dev/agent-teams-playbook]]

---

# B. スタック別規約（採用時のみ参照）

> 採用したスタックの節だけ読む。新スタックを採用したら、この章に並列で節を追加する。

## B-1. Next.js + Supabase

### データ層（Supabase）
- Storage の SELECT RLS は `to anon` と `to authenticated` の**両ロール定義必須**（片方だと管理画面で 0 件） → `mem:feedback_supabase_storage_rls_both_roles`
- 日時は **Asia/Tokyo 固定 util** で解釈・表示（`new Date().toISOString()` の UTC 誤解釈回避） → `mem:feedback_datetime_local_fixed_tz`
- Free tier 制限（2 project/org）を着手前に確認し schema 分離で逃がす → `skill:supabase-project-precheck`

### フロントエンド（Next.js）
- mobile-first・`clamp()`・auto-fit grid・孤児改行禁止（日本語改行 3 層） → `skill:responsive-layout`
- 静的→SPA 化時は reveal を `usePathname` 依存で再初期化（再描画で演出が消える） → `mem:feedback_spa_reveal_reinit`
- Web/UI 実装は `ui-ux-pro-max` を常時併用（旧 frontend-design から 2026-06-08 置換）→ `mem:feedback_ui_design_skill_always_on`。UI 監査は `web-design-guidelines`、React 最適化は `vercel-react-best-practices`、構成設計は `vercel-composition-patterns`
- 定番ハマり（公開ページ anon client / revalidate 等）を設計時に織り込む → `skill:nextjs-supabase-site-gotchas`

### API / 認証 / Server
- `proxy.ts`/middleware ヘッダ前提の Server Component は production fallback 必須（Client + usePathname 代替） → `mem:feedback_proxy_dependent_runtime`
- `NEXT_PUBLIC_*` は build-time inline。env 投入タイミングに注意 → `skill:nextjs-supabase-site-gotchas`（デプロイ節）

### デプロイ（Vercel）
- Vercel team project は git author email 認可必須（不一致は silent ERROR で reject） → `skill:vercel-team-deploy-checklist`
- LP 軽量化は 3 段階を各 commit 分離（revert 可能に） → `skill:lp-optimization-playbook`
- portfolio へのサンプル統合は必須 9 工程 → `skill:sample-site-onboarding`

---

## architect の使い方

1. 起動時に本ページ全体を読む
2. **A 章（スタック非依存）は常に適用**。設計対象のフェーズの該当規約を織り込む
3. 採用スタックがあれば対応する **B 節**を参照。未確定なら案件要件からスタックを判断し、その節を見る
4. 規約に反する選択をする場合は理由を設計書に明記（暗黙の逸脱を禁止）
5. 詳細が要る項目は所在（skill/原則/feedback）を辿る。本ページは地図であり詳細の正本ではない
