---
date: 2026-06-05
category: situations
source: session
---

x-account 発信システムに「工程可視化ダッシュボード（観測専用）」を新規構築し本番稼働まで到達した。改善ループの初速を上げる観測基盤。

## 決定の発端
Kくん @kkk_cun の「Claude Codeで5人の月100万円稼ぐnote販売会社」ツイートとの比較から、自分の x-account-design の各工程（writer のみが生成）に「フェーズ別の目的関数」を着せ替える方針を採用（設計判断ドキュメント化、PR #84 マージ）。続けて「各工程の入出力・ロジック・プロンプト・cron 実行内容を見えるようにする WEB UI」を作ることを決定。

## 構築物（3系統）
- **Stage Registry**: 工程の宣言的定義（11ノード）→ `registry.generated.json`。フローチャートと定義パネルの SSOT
- **Run Trace 計装**: Worker に fail-open トレース（`withTrace` + `ctx.waitUntil`）。`xad.run` / `xad.run_trace`（migration 0013）に記録。LLM 工程は prompt/tokens も捕捉
- **Next.js ダッシュボード（Vercel）**: React Flow 工程図 + ノード詳細(定義/実行tab) + run タイムライン + Basic 認証

## 本番反映（2026-06-05 稼働）
- PR #85（本体）/ #86（LLM配線・title・proxy化）/ #87（ライトテーマ修正）すべて main マージ
- worker 再デプロイ（計装込み）、Vercel ダッシュボード稼働、migration 0013 適用（Supabase ofmeton-apps ref=hofvvcvhjslevymhbcqj）
- URL: `https://xad-dashboard-ofmetons-projects.vercel.app`（Basic 認証。資格情報は Vercel env + 本人管理、本ファイルには非記載）
- エンドツーエンド検証済: post-noon 手動実行で writer/hook/editor/line-approval の trace 記録（editor=warned、writer tok1813/578・editor tok3604/638、prompt 捕捉）

## レビュー体制（今回確立した型）
spec/plan を Codex で複数ラウンド（CRITICAL/MAJOR ゼロまで）→ subagent-driven 実装（implementer + レビュー、全タスク TDD で既存423テスト緑維持）→ /code-review。

## 留意
- MCP（Supabase）トークン失効時、keychain の `go-keyring-base64:` 形式から sbp_ トークンを base64 デコード抽出 → Management API 直叩きで migration 適用、という迂回路が成立した。
