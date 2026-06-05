# B-3: Managed Agents 最小サンプル実装計画 + 1 セッション実コスト測定 (起草)

担当: x-account-design v9 検証 B-3
ステータス: **起草完了・ユーザー実行承認待ち**
作成日: 2026-05-24
換算レート: 1 USD = 155 JPY (2026-05 想定)

---

## 1. 公式 docs から得た MA 仕様の整理

| 項目 | 確認結果 | 出典 |
|---|---|---|
| 公開状況 | 2026-04-08 public beta | claude.com/blog/claude-managed-agents |
| beta header | `anthropic-beta: managed-agents-2026-04-01` 必須 (SDK は自動付与) | platform.claude.com/docs/en/managed-agents/sessions |
| API 形態 | REST (`/v1/sessions`) + 全主要 SDK (Python/TS/Go/C#/Java/PHP/Ruby) + CLI `ant beta:sessions:*` | 同上 |
| Session 概念 | agent + environment を参照する instance。会話履歴を maintain。**2 段ライフサイクル**: create で container provision → user event 送信で実行開始 | 同上 |
| 課金単位 | **session-hour = wall-clock 時間ベースで $0.08/h** (Anthropic 公式 blog で "wall-clock 時間" と明記) | claude.com/blog |
| 中断/再開 | 切断後も進捗保持、自律的に数時間動作可。`idle` / `running` / `rescheduling` / `terminated` の 4 状態 | platform.claude.com |
| 終了処理 | `archive` で新 event 受信停止 (履歴保持) / `delete` で完全削除 (running 中は不可、interrupt 必要) | 同上 |
| token usage 取得 | `sessions.retrieve` の response `.usage` で取れる想定 (要実機確認) | docs では明示なし |
| その他 | MCP 認証は vault 経由、agent は versioned (version pin 可)、tool 設定は session 単位で update 可 | docs |

**重要前提**:
- session-hour は wall-clock = 「create から archive までの時間が課金対象」可能性が高い (要実測確認)
- → idle で放置すると課金されるリスクあり。**処理終了 → 即 archive** を徹底する設計が必須

---

## 2. 最小サンプル設計 (2 ケース)

### ケース A: Interviewer (Sonnet 4.6, 5 ターン会話)

- v9 §3.4 の Interviewer ユースケース simulate
- ユーザー発話 5 件を script で連続送信、各 turn で idle 待ち
- web search なし (素材 DB から context 取得想定)
- 想定 token: input 500×5=2,500 / output 200×5=1,000
- 想定 wall-clock: 5-10 分
- **派生**: `SLEEP_BEFORE_LAST=1` で 5 ターン目前に 30 秒 sleep を挟むモード → wall-clock 全期間課金 vs active runtime のみ課金 を判別

### ケース B: Optimizer Phase 2 (Opus 4.7, 約 30 分連続バッチ)

- v9 §3.4 の Optimizer 仮説検証 simulate
- ダミー analytics データ + 前週仮説 H1-H3 を 1 件の user.message で feed
- Opus 4.7 + extended thinking を活用させ仮説検証 + 反例 examine + 次週案提示
- 想定 token: input 3,000 / output 5,000 (thinking 含む)
- 想定 wall-clock: 30 分

詳細プロンプト・実装は `B3-ma-cost-script/` 配下:

| ファイル | 内容 |
|---|---|
| `interviewer-sample.ts` | ケース A 実装 (TypeScript + @anthropic-ai/sdk) |
| `optimizer-phase2-sample.ts` | ケース B 実装 |
| `run-and-measure.md` | 実行手順 + .env.local 仕様 + 記録テンプレ |
| `expected-cost.md` | 詳細試算 |

---

## 3. 期待 cost 試算 (詳細は `B3-ma-cost-script/expected-cost.md`)

### 単回想定

| ケース | token cost | session cost | 合計 USD | 合計 JPY |
|---|---|---|---|---|
| Interviewer (Sonnet 4.6, 5 turn, 7.5 分) | $0.0225 | $0.01 | **$0.0325** | **¥5.0** |
| Interviewer + 30s sleep | $0.0225 | $0.0107 | **$0.0332** | **¥5.1** |
| Optimizer Phase 2 (Opus 4.7, 30 分) | $0.42 | $0.04 | **$0.46** | **¥71** |

### 月間想定 (v9 のフル稼働モデル)

| 用途 | 頻度 | 月額 |
|---|---|---|
| Interviewer (日 2 回 × 30 日) | 60 回 | **$1.95 ≒ ¥302** |
| Optimizer Phase 2 (週 1) | 4 回 | **$1.84 ≒ ¥285** |
| **MA 関連 合計 / 月** | — | **$3.79 ≒ ¥587** |

→ 月予算 ¥10,000 の **約 5.9%** に収まる試算 (v9 採用判断の重要数字)

### 本検証 1 回ラン分

| ラン | 想定 cost |
|---|---|
| Interviewer 通常 | $0.0325 |
| Interviewer 30s sleep 版 | $0.0332 |
| Optimizer Phase 2 | $0.46 |
| **合計** | **$0.53 ≒ ¥82** |

セーフティ上限: **$2 (¥310)** で停止判断 (見積もりの 3.8 倍を超えたら anomaly)

---

## 4. 実装 script の場所と実行手順

**場所**: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost-script/`

**手順サマリ** (詳細は `run-and-measure.md`):

1. `.env.local` 準備 (`ANTHROPIC_API_KEY` / `MA_AGENT_ID` / `MA_AGENT_ID_OPUS` / `MA_ENVIRONMENT_ID`)
2. MA Agent を Console or `ant beta:agents create` で 2 つ作成 (Sonnet 4.6 用 / Opus 4.7 用)
3. `npm i @anthropic-ai/sdk dotenv` + `npm i -D typescript ts-node @types/node`
4. 実行:
   ```bash
   cd .../B3-ma-cost-script
   mkdir -p logs
   npx ts-node interviewer-sample.ts | tee logs/interviewer-$(date +%Y%m%dT%H%M%S).log
   SLEEP_BEFORE_LAST=1 npx ts-node interviewer-sample.ts | tee logs/interviewer-sleep-$(date +%Y%m%dT%H%M%S).log
   npx ts-node optimizer-phase2-sample.ts | tee logs/optimizer-$(date +%Y%m%dT%H%M%S).log
   ```
5. 結果を `B3-ma-cost-result.md` に転記 (run-and-measure.md にテンプレあり)
6. Console の usage dashboard で session-hour と token を cross-check

---

## 5. ユーザーへの実行承認のお願い

### 承認をお願いしたい内容

「`B3-ma-cost-script/` 配下の 2 スクリプトを実行して MA 実コストを測定すること」

### 推定コスト

**合計 $0.53 ≒ ¥82** (3 ラン: Interviewer 通常 + Interviewer 30s sleep + Optimizer Phase 2)

セーフティ上限 $2 (¥310) を超えたら即 archive + 結果報告で停止。

### 何が分かるか (このコストで得る情報)

1. **MA session-hour が wall-clock 全期間課金か active runtime のみか** ← v9 の MA 設計に直結 (idle 放置リスクの判断)
2. token usage を `sessions.retrieve` の `.usage` から取れるか (取れない場合は計測機構の作り直し必要)
3. Opus 4.7 + extended thinking の thinking token 量と output cost 寄与
4. SDK 経由実装のハマりどころ (beta header 自動付与の挙動など)
5. **月額 ¥587 想定が現実的かどうか — v9 全体導入判断の最重要数字**
6. Console の usage dashboard 上で session-hour と token の分離表示形式

### 事前準備 (ユーザー側)

- Anthropic Console で MA beta access が有効化済みか確認
- 上記の MA Agent 2 つを Console で作成 (3 分程度)
- `.env.local` に必要キーを記入

### 確認事項

- [ ] 推定 $0.53 (¥82) で実行承認しますか?
- [ ] セーフティ上限 $2 (¥310) で停止する運用に同意しますか?
- [ ] MA Agent 作成は (a) ユーザー手動で Console から行う / (b) `ant beta:agents create` の CLI 手順をスクリプト化して用意 — どちらを希望?

---

## 6. 留意点

- pricing (Sonnet/Opus の per-token 価格、session-hour 単価) は試算時点の値。実行直前に Anthropic 公式 pricing ページで再確認すること
- MA は public beta のため、SDK 型定義が `beta.sessions.*` で `@ts-expect-error` を付けている箇所あり。SDK バージョン更新で解消の見込み
- Claude Code subscription 内で完結する Anthropic API 利用は普段は変動費に計上しないが、本検証は **MA session-hour ($0.08/h) が subscription とは別建ての従量課金** なので、サブスク外の実コストとして扱う
- 本検証の結果次第で v9 §3.4 の Interviewer/Optimizer の MA 採用可否が変わる可能性あり。結果は `B3-ma-cost-result.md` に記録し、A (v9 起草) にフィードバック

✨ claude-smart rule applied: [外部 API のコスト見積もり同ターン提示](http://localhost:3001/rules/s3-14) | [自動化システムの月予算 ¥10,000 上限](http://localhost:3001/rules/p2-35d0)
