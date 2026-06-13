# X発信システム 後回しバックログ

> 作成: 2026-06-09 / 横断スイープ（コードマーカー・spec・引き継ぎ raw/facts・runbook・memory）から「**完了済を除いた“本当に後回し中”の項目**」を集約。
> 使い方: 次の一手を選ぶ起点。各項目に `規模(小/中/大)` `出典` `依存・ブロッカー`。着手したら ✅ にして該当 spec/PR を追記。

関連: [自動化 runbook](./automation-runbook.md) / memory `project_x_agentic_rearchitecture` / spec `docs/superpowers/specs/2026-06-06-collector-agent-design.md`

---

## 0. 🟢 いま対応中（2026-06-09 セッション）

3チーム並列で実装＋レビュー済み。**まとめて1回の deploy ゲートで本番反映**する方針。

- [ ] **T-A 承認UIメディア添付** — 写真=DL→chrome添付 / 動画=`/video/1` deep-link 本文追記。migration 0019。
- [ ] **T-B テンプレ5拡充** — case_calm / value_deepdive / reaction_light / contrarian_news / offer_savings。
- [ ] **T-C LLMレコメンド** — キュレ画面の「🤖おすすめ」（フォーマット/テンプレ推薦・Haiku）。
- [ ] **本番反映ゲート（束ねて1回）** — migration **0018**（前回 T3 分・未 apply）＋ **0019** apply → dashboard `vercel deploy --prod` → worker `npm ci`→`wrangler deploy` → smoke / 人間 E2E。**規模: 中**。※ PR#134–136 と今回3チームの本番反映がここで一括解消。

---

## 1. 🔴 次の本命 — 改善ループ・計測整備

> 計測ログは取れる状態。次は「回す」。**現改修完了後に「計測整備→改善ループ設計」として着手**（ユーザー合意済 2026-06-09）。

- [ ] **改善ループの自動化** — `計測→分析→仮説→施策(レバー操作)→再計測` のループ本体が未実装。出典: `collector-agent-design.md:119`「ループ自動化は後日」。**規模: 大**。依存: 計測SQL＋panel＋施策ロジック。
- [ ] **改善レバー L1〜L10 の計測SQL＋dashboardパネル化** — 現状 `curation-analysis.sql` は L1/L3/L5 のみ。残レバー（クエリ戦略 / scoring rubric / target定義 / woeid / batch・budget 等）が未可視化。出典: spec L100-120。**規模: 大**。
- [ ] **「収集→投稿→反応」貫通計測** — 選抜と実エンゲージ（like/RT）の linkage 未接続（spec で deferred 明記）。今は collection→selection の歩留まりまで。出典: spec L116。**規模: 大**。依存: 投稿結果ログ拡張。

---

## 2. 🟠 旧コード cleanup・データ

- [ ] **X API 直投（publishToX / draftForX）の完全撤去** — PR#128 で旧 pipeline は削除も本体＋test依存で残置。「別 cleanup PR」と明記。出典: spec `2026-06-08-xaccount-templates-approval-check-design.md` §非スコープ / `lib/publisher/x-publisher.ts`。**規模: 中**。依存: test 修正。
- [ ] **旧素材 x_inspirations 891件が `selection_status=null` でUI非表示** — 旧 buzz-ingest 由来を新アーキで使うか捨てるか未判断（非スコープ明示）。**規模: 大/要件判断**。
- [ ] **孤立ライブラリの段階的削除** — `lib/interviewer` / `lib/editor/{editor,llm-judge}` / `lib/writer` 等が line-event・check 依存で残置。段階撤去計画は次段スプリント候補。**規模: 中**。

---

## 3. 🟡 収集の性能・品質

- [ ] **collect が 5.5分**（scoring 7バッチ逐次）— レバー L7(Haiku化)/L8(batch拡大)/並列化で短縮。出典: memory。**規模: 中**。依存: ベンチ＋コスト影響評価。
- [ ] **4軸目スコア `practical_impact`** — 枠のみ・初版スコープ外。出典: spec L22/L126。**規模: 大**。
- [ ] **`get_article`（長文本文取得）** — 高コストで見送り、RoI評価後に採否。出典: spec L126。**規模: 中**。
- [ ] **scoring rubric の template×tone 細分化** — 現状 generic 設定。**規模: 中**。

---

## 4. ⚪ 堅牢性（障害時に効く・今は穴）

- [ ] **claim の TTL / GC 無し** — hanged claim で素材が再 queue されず stall する恐れ。**規模: 中**。
- [ ] **compose/check 連鎖の enqueue 失敗時 retry / DLQ 無し** — collect 単発失敗で後段が hang。**規模: 中**。
- [ ] **registry `compose.upstream` topology がメタ近似** — dependency graph 精緻化。**規模: 小**。
- [ ] **scoring weight 変更の段階ロールアウト（canary / A/B）無し** — rubric/weight 変更が全 scoring に波及。**規模: 中**。

---

## 5. 🔵 運用・整備（小粒・doc化）

- [ ] **旧 worktree 2本（`task/260606-collector-agent` / `task/260606-mf-finance`）の整理** — 開きっぱなし。**規模: 小**。
- [ ] **runbook 未記載 ops の doc化** — Supabase MCP 失効時の Management API 迂回 / Vercel CLI bug 回避（REST API）/ cron 段階再開フロー。**規模: 小**。
- [ ] **web_search のサーバ費が cost_ledger 計上漏れ** — token課金外でコスト最適化の盲点（月次 Admin API cost_report で別捕捉）。**規模: 小**。
- [ ] **新テンプレ互換性マトリクス / e2e** — compose/check/publish が全 fmat × 全テンプレで動くかの全テスト未整備。**規模: 小**。

---

### 優先度の見立て
1. **0. 本番反映ゲート**（作ったものを動かす・最大リターン）
2. **1. 改善ループ・計測**（次のまとまった一手の本命）
3. **2〜4** は中粒の継続改善、**5** は隙間時間で。
