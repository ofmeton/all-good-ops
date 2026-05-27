# Phase 1 Launch Roadmap — X + note 運用開始までの段取り

> SSOT for the operational launch plan starting from the completed design (main-design v10.3 / Style Guide v1.4 / initial-values-design.md Codex All Clear) toward Phase 1 X+note 1 投稿/日 + 月有料 note 1 本 体制までの段取り。
>
> 上流:
> - `main-design-all-versions.md` §2.11 Phase 進行計画
> - `style-guide-all-versions.md`
> - `initial-values-design.md` §8 Phase 1 採用初期値
> - `apps/x-account-system/HUMAN_TASKS.md` H-1〜H-15
>
> 起案日: 2026-05-27 / オーナー: ofmeton + Claude (brand-publisher × system-engineer)

---

## 0. 現状サマリ (2026-05-27 時点)

### 0.1 完了済み

| 項目 | 状態 | source |
|---|---|---|
| 設計 (v9〜v10.3) + Style Guide (v1〜v1.4) + Phase 0 v2/v3 競合調査 + 初期値設計 | ✅ All Clear (Codex MCP 4-5 ラウンドクロスレビュー) | `consolidated/` |
| Supabase migrations 0001-0005 | ✅ ローカル DDL 完成 | `apps/x-account-system/migrations/` |
| Editor 周辺 (DLP redact / 業法 lint / cost / fallback / OAuth PKCE test / hook-classifier) | ✅ 骨格実装済 | `apps/x-account-system/lib/` |
| GitHub Trending fetcher | ✅ 実装済 | `apps/x-account-system/scripts/fetch-github-trending.py` |
| Phase 0 競合分析 (34 アカ × 65 項目 + Sonnet 戦略読み) | ✅ data 永続化済 | `consolidated/initial-values/` |

### 0.2 未着手

| 領域 | 内容 |
|---|---|
| **Claude 実装** (apps/x-account-system) | Writer / Publisher / Optimizer / Interviewer / Daily Digest / Visualizer / UTM tracker / MA teardown |
| **人間タスク** | H-1〜H-5 + H-8 + H-10 (X launch gate) + H-6 (IG 独立 gate) + H-11/H-12/H-13/H-14 (Phase 1 並行) |
| **コンテンツ素材** | verified failure_story 4 本 / industry_sop 6 本 / pinned post / bio / note 有料記事 #1 |
| **監視** | Daily Digest / KPI ダッシュボード / brownout handler / kill-switch handler |

---

## 1. 段取り全体像 (4 フェーズ)

```
Phase 0.5 Pre-launch                      2026-05-28 〜 2026-06-07 (約 10 日)
   ├─ A: 人間トラック       H-1〜H-5 + H-8 + H-10
   ├─ B: Claude 実装         Editor pipeline + Writer X + Publisher + Optimizer + Interviewer + Daily Digest
   └─ C: コンテンツ          failure_story 4 / industry_sop 6 / pinned / bio / note 有料 #1

Phase 1 X+note Launch                     2026-06-08 〜 2026-07-31 (約 8 週)
   ├─ Week 1: Soft launch (人間承認モード)
   ├─ Week 2-4: 1 投稿/日 安定運用 + 30 投稿時点 Optimizer 初回 posterior 更新
   ├─ Week 5-8: 60 投稿時点で winner/loser 確定 + 異常検知ロールバック動作確認
   └─ note 無料 3-5 / 月 + 有料 1 / 月 (Month 1 末 7/31 までに有料 #1 公開)

Phase 1 中盤 IG 追加                       2026-06-20 〜 (H-6 承認後)
   └─ Meta App Review 通過後 IG Business + FB ページ + テスト投稿 → IG 本番 ON

Phase 1 評価 → Phase 2 選択                2026-07-31
   └─ A: 業種横断継続 / B: 業種特化 / C: 失敗談アグリゲーター の 3 択
```

---

## 2. Phase 0.5 Pre-launch (5/28〜6/7)

### 2.1 トラック A: 人間タスク (ofmeton)

#### 着手順序 (依存最小化)

| Day | タスク | 目安所要 | 詳細 |
|---|---|---|---|
| **5/28-5/29** | H-1: X Developer Console | 2h | OAuth 2.0 PKCE + Confidential client + Callback URI + offline.access scope。**Premium Basic 加入必須** |
| **5/29** | H-2: Supabase project + pgvector + migrations 0001-0005 apply | 2h | Free tier 同時 2 project 上限注意 (現在民泊清掃 1 つ使用中) |
| **5/29** | H-3: Anthropic + OpenAI API key + 月予算 cap | 30m | 両 key で月 ¥10,000 内に収まる usage limit を Console で設定 |
| **5/30** | H-4: Cloudflare Workers Paid ($5/月) + API Token | 30m | D1 / KV / Cron 操作権限つき token。または mac launchd で代替 (後述) |
| **5/30** | H-5: LINE Messaging API + 個人 user ID | 1h | 公式アカウント作成 → friend 追加 → Webhook で user ID 取得 |
| **5/30** | H-10: budget-calculator 実行 + brownout 同意 | 15m | `npm run budget` で expected/p95 シナリオ確認 |
| **6/3 まで** | H-8: note 購読 / ofmeton.com 取得 / LINE 友達 30 件導線 | 2-3h | bio 反映と並行。ドメインは Cloudflare Registrar 推奨 ¥1,500/年 |
| **6/5 まで** | H-7 + H-14: twitterapi.io key (money-bot から copy) + GitHub Trending 日次 cron | 1h | cron は launchd or Cloudflare Workers |

#### Phase 1 中に対応 (gate ではない)

- **H-6** (Meta App Review): 6/20 申請 → 5-14 日承認待ち → 7/10 目安で IG launch
- **H-9** (consent 記録): 新規 client 追加時のみ
- **H-11** (Node v24+ + Python 3.10+ + npm install): 開発機セットアップ
- **H-12** (note 特商法 / 返金 / ML opt-out): **note 有料 #1 公開前 = 7/31 まで必須**
- **H-13** (業法ガード初動): 2026-11 以降 (士業フォーカス開始時)
- **H-15** (Phase 0 v4): 素材不足 trigger 時のみ

### 2.2 トラック B: Claude 実装 (5 PR に分割)

PR 単位で main に merge、各 PR 完了時に Codex MCP クロスレビュー必須。

| PR | 範囲 | 想定 path | 想定セッション | クリティカル度 |
|---|---|---|---|---|
| **PR-A** | Editor 6+4 pipeline 統合 (DLP redact + 業法 lint + 失敗談月 ≤ 4 上限 + Hook 配分 check + 公開許諾 gate) | `lib/editor/pipeline.ts` + integration tests | 1 セッション | ★★★★★ (P0、blocker for PR-B) |
| **PR-B** | Publisher X (OAuth token store + tweet 投稿 + retry + dry-run) + Writer X (1 投稿/日 generator + initial-values §3 採用 + Anthropic system prompt) + E2E dry-run | `lib/publisher/x-publisher.ts` + `lib/writer/writer-x.ts` | 1 セッション | ★★★★★ (P0、X launch のコア) |
| **PR-C** | Optimizer Thompson Sampling + 8 パラメータ state persistence + §8.3 死守ガード | `lib/optimizer/thompson.ts` + `lib/optimizer/state-store.ts` | 1 セッション | ★★★★ (Phase 1 Day 30+ で必要) |
| **PR-D** | Interviewer (LINE 5 ステップ質問) + Daily Digest + kill-switch `!stop` + brownout handler | `lib/interviewer/line-flow.ts` + `lib/dashboard/digest.ts` + `lib/safety/kill-switch.ts` | 1 セッション | ★★★★ (Phase 1 Day 1 で必要) |
| **PR-E** | Visualizer (Codex MCP gpt-image-2) + Writer note + Writer IG (Phase 1 中盤) + UTM tracker + MA teardown | `lib/visualizer/codex-image.ts` + `lib/writer/writer-note.ts` + `lib/writer/writer-ig.ts` + `lib/attribution/utm-tracker.ts` + `lib/ma/teardown.ts` | 1-2 セッション | ★★★ (Phase 1 中盤までで OK) |

**ペース目安**: 1 PR / 2 日。5/28〜6/7 で PR-A〜PR-D 完了、PR-E は Phase 1 並行。

### 2.3 トラック C: コンテンツ素材 (ofmeton + Claude 共同)

| # | 素材 | 在庫目標 (Month 1) | 担当 | 完了目標 |
|---|---|---|---|---|
| C-1 | **verified failure_story** (本人事業 4 種 + 案件 client、固有名詞 redact 済) | 4 本 (Month 1 上限) | ofmeton 起案 → Claude redact + 構造化 | **6/3** |
| C-2 | **industry_sop** (経理 / 業務効率化横断、ChatGPT/Claude 活用 SOP) | 6 本 (月 20% = 6 投稿) | Claude 下書き → ofmeton review | **6/5** |
| C-3 | **pinned post** (initial-values §5.5.3、type 推奨: hybrid_lead) | 1 本 | Claude 下書き 3 案 → ofmeton 選択 | **6/6** |
| C-4 | **bio** (initial-values §5.6.3、URL = note 推奨) | 1 本 | Claude 起案 → ofmeton 微調整 | **6/6** |
| C-5 | **note 有料記事 #1** (Month 1 末、500 or 980 円、ティーザー含む 3,000-5,000 字) | 1 本 | Claude ドラフト → content-reviewer rubric → ofmeton 確定 | **7/20** (公開 7/31) |
| C-6 | **Hook 配分シード** (initial-values §3.2 number 25 / question 10 / emotion 15...) | template 8 系統 | Claude (writer-x プロンプトに固定要素として埋め込む) | PR-B 内で完了 |

---

## 3. Phase 1 X+note Launch (6/8〜7/31)

### 3.1 Day 1-7 (6/8〜6/14): Soft launch

- 1 投稿/日 (X) を **人間承認モード** で開始
  - Flow: Writer → Editor → LINE 通知 → ofmeton 承認 → Publisher
- Daily Digest 21:00 JST 受信
- Week 1 末で **E-46 (Editor 6+4 ルール 1 件処理 < 10 秒)** 実測

### 3.2 Day 8-30 (6/15〜7/7): 安定運用 + posterior 蓄積

- 1 投稿/日 継続 (合計 30 投稿)
- note 無料 3 本 + 有料 #1 投入準備
- **30 投稿後 (~7/7)** Optimizer 初回 posterior 更新
- 死守パラメータ: failure_story ≤ 4 本 / first_hand ≥ 30% / industry_sop 月 6 本 / hashtag 0
- 自由パラメータ: 時間帯 / Hook / format / Visualizer は Thompson 進捗に従う

### 3.3 Day 31-60 (7/8〜8/6): Optimizer 第 1 反映

- 60 投稿時点で各パラメータ winner/loser 確定
- 異常検知: PCR -30% / インプ -50% で自動ロールバック
- **E-52** (Optimizer Phase 2 Opus weekly + thinking ¥702/月 ±30%) 実測

### 3.4 Day 61-Month 2 末 (7/31): Phase 1 評価

KPI 評価 (CLAUDE.md Phase 1 SSOT):

- note 月売上 3 万円
- X 500 フォロワー
- IG 300 フォロワー
- qualified_lead 試算

Phase 2 業種横断 (A) / 業種特化 (B) / アグリゲーター (C) 判断。

---

## 4. Phase 1 中盤 IG 追加 (独立 gate)

```
H-6 Meta App Review 申請 (6/20)
   ↓ 承認待ち 5-14 日
6/25〜7/4 承認
   ↓
IG Business アカウント + FB ページ連携
   ↓
60 日 token refresh 動作確認 + テスト投稿 1 件
   ↓
PR-E (Writer/IG + Visualizer) 本番 ON
   ↓
IG カルーセル 週 2 + リール 週 1 (initial-values §4.2)
```

X launch 中は IG 投稿停止が default。**目安 7/10 IG launch**。

---

## 5. 監視・ガード装置 (Phase 1 全期間)

| 装置 | 発動条件 | 実装 path |
|---|---|---|
| **brownout mode** | 月予算 ¥10,000 → ¥11,500 到達 | `lib/cost/budget-calculator.ts` + publisher 連動 |
| **kill-switch** | LINE `!stop` | `lib/safety/kill-switch.ts` |
| **自動ロールバック** | PCR -30% / インプ -50% / 7 日窓 | `lib/optimizer/posterior-monitor.ts` |
| **MA session teardown** | session 完了時固定 order | `lib/ma/teardown.ts` (feedback_ma_session_teardown 準拠) |
| **Daily Digest** | 21:00 JST 毎日 | `lib/dashboard/digest.ts` |

---

## 6. クリティカルパス (最短経路)

```
Day 1-3 (5/28-5/30):
  人間: H-1 + H-2 + H-3 + H-4 + H-5 + H-10 を 1-2 日集中で完了
  Claude: PR-A (Editor pipeline) 着手 → merge
  Content: C-1 ヒアリング開始

Day 4-7 (5/31-6/3):
  Claude: PR-B (Publisher + Writer X) → merge → dry-run 1 件成功
  人間: H-8 着手 (note 購読 / domain / LINE 友達)
  Content: C-1 4 本確定 + C-2 着手

Day 8-10 (6/4-6/7):
  Claude: PR-C (Optimizer) + PR-D (Interviewer + Digest) 並列 → merge
  人間: H-7 + H-14 完了
  Content: C-2 6 本確定 + C-3/C-4 確定 + C-5 アウトライン

Day 11 (6/8):
  Soft launch ✅ (1 投稿/日、人間承認モード)
```

**クリティカルパス**: H-1 (X Developer apply) + PR-A→PR-B の直列。**最短 11 日**で X launch 到達可能。

---

## 7. ガード / 撤退条件

| シナリオ | 対応 |
|---|---|
| H-1 (X Developer) で apply rejected | Premium Basic 加入確認 + 申請文 review → 再申請 (最大 3 日 lag) |
| Phase 0 v4 trigger (素材不足、H-15) | Phase 1 Month 1 末で判定 → Claude に「Phase 0 v4 着手」依頼 (¥40 + Sonnet ¥80) |
| 月予算超過 (brownout) | 自動投稿停止 + 計測継続 + 通知継続。投稿再開は人間判断 |
| OAuth token expire | refresh token 自動 cycle (offline.access 取得済) |
| Codex Round で fail | inline fix → Round 重ね、3 ラウンド超なら戦略相談 |
| Cloudflare $5/月 を払いたくない | H-4 を skip → mac launchd で cron 代替 (Phase 1 evaluation 後に判断) |

---

## 8. 進捗確認の単位

- **日次**: Daily Digest (LINE)
- **週次**: KPI ダッシュボード (Supabase Edge function or 簡易 Vercel)
- **月次**: Phase 1 KPI 評価 + Optimizer review (org-designer 起動)

---

## 9. 人間タスク発生時のハンズオン運用ルール

ユーザー (ofmeton) のターンになった時、Claude は以下の手順で対応する:

### 9.1 ローカル先行確認 (Claude 側で自動)

人間タスク発火時、まず Claude が以下を確認:

1. **既存 secret / credential 確認**: `apps/x-account-system/.env.local` / `money-bot/.env.local` / `~/.zshenv` / memory `reference_*` を grep して、既に取得済みの値が再利用できないか
2. **既存 raw 確認**: `raw/facts/people/` / `raw/facts/contracts/` / `raw/facts/situations/` を grep して、関連情報がないか
3. **既存 wiki 確認**: `wiki/business/` / `wiki/publishing/` で同種設定の事例がないか
4. **既存ツール capability 確認**: MCP `ToolSearch` / plugin で API 経由代替できないか (例: gh CLI / vercel CLI / freee MCP)

これらをユーザーに振る前に Claude 側で完結する。

### 9.2 振る時のフォーマット

ローカルで完結できなかった場合、以下のテンプレで ofmeton に振る:

```
[H-N] <タスク名>

📍 完了目標: YYYY-MM-DD
⏱  目安所要: <h>

▶ Step 1: <具体的アクション> (例: https://developer.x.com にログイン)
▶ Step 2: <具体的アクション>
   📝 入力欄に貼る値: <Claude が生成済の値、or "後述">
▶ Step 3: <具体的アクション>

✅ 完了報告フォーマット:
  - 取得値 1: ___
  - 取得値 2: ___
  (これを返してくれれば Claude が .env.local 更新 + 動作確認まで実施)

🆘 詰まったら: "[H-N] step Y で <エラー内容>" と教えて
```

### 9.3 並列化原則

- 人間タスクは可能な限り 1 セッションでまとめて振る (X Console + Supabase + Anthropic + LINE を Day 2 で一気に)
- Claude 側の実装 PR は人間タスクの完了を待たず先行できる範囲で着手 (dry-run mode を実装に組み込む)

---

## 10. 関連 SSOT

| ファイル | 役割 |
|---|---|
| `main-design-all-versions.md` | 全体設計 (v9〜v10.3 統合) |
| `style-guide-all-versions.md` | DLP / Editor / 業法 / Style |
| `competitor-report-all-versions.md` | Phase 0 競合調査 |
| `query-design-all-versions.md` | データ取得 query 設計 |
| `initial-values-design.md` | Phase 1 採用初期値 (本書の数値根拠) |
| `apps/x-account-system/HUMAN_TASKS.md` | H-1〜H-15 詳細 |
| `apps/x-account-system/README.md` | システム実装 README |
| `CONSOLIDATION-CHECKLIST.md` | ドキュメント統合時の網羅性チェック |

---

## 11. 改訂履歴

- 2026-05-27: v1.0 初版起案 (brand-publisher × system-engineer 統合)
