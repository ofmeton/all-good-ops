# Editor 6+5 Pipeline (PR-A)

x-account-system の Editor ルールエンジン。投稿 draft の品質を 11 ルールで
判定し、approved / rejected を返す。

SSoT: `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §11 v10.3

## 11 ルール

### Base 6

| # | Rule | Logic |
|---|---|---|
| R1 | 業務仕組み化テーマに繋がるか | LLM judge (Sonnet 4.6 tool_use, Phase 0.5 では heuristic stub) |
| R2 | 実体験要素 1 行 | regex `(私は|僕は).*?(した|思った|気付いた|やった)` |
| R3 | 対象は意見、敵は作らない | LLM judge (禁止語: 無能 / 情弱 等) |
| R4 | 対立構図フィルタ | hardcoded forbidden phrases (`時代遅れ`, `無能`, `情弱`, `養分`, `搾取`, `奴隷`) regex |
| R5 | 直近 2 週で類似投稿なし | embedding cos sim ≥ 0.85 → fail |
| R6 | 結論の断定性 | LLM judge: 末尾 200 字に `かも` `だと思います` `なのかな` がないか |

### Extension 5

| # | Rule | Logic |
|---|---|---|
| X1 | Hook 強度 ≥ 0.4 | classify.py の confidence ≥ 0.4 |
| X2 | ステマ表記 | hasAffiliateLink=true なら `#PR\|#広告\|アフィリエイト` regex 必須 |
| X3 | verified failure_story 月 ≤ 4 | failure_story の場合のみ厳格 gate (verified + 月次上限) |
| X4 | 読者像 1 行明示 | LLM judge (経営者 / 向け / あなた 等) |
| X5 | DLP redaction + 固有名詞 mask | redactStrict + containsHighRisk + LLM 補助 |

業法 risk (税理士・社労士・行政書士・司法書士・弁護士 独占業務キーワード) は
reject ではなく `riskLevel='high'` フラグへ昇格 (下流人間承認)。

## アーキテクチャ

```
Stage 0 (parallel, no LLM)
  redactStrict / containsHighRisk / classifyHook / checkBusinessLawRisk

Stage 1 (parallel I/O)
  embedText(body)
  fetchRecentPostBodies(14d)   ← R5
  getMonthlyFailureStoryPostCount(now)   ← X3 (failure_story only)
  getVerifiedMaterialIds(material_ids)    ← X3 (failure_story only)

Stage 2 (1 LLM call, Sonnet 4.6 tool_use bundled)
  R1 / R3 / R6 / X2 / X4 / X5 補助

Combine
  11 ルール EditorRuleResult を組み立て
  1 つでも fail → rejected
  riskLevel='high' は business_law / paid_route / hasNumbers / isClientDerived のいずれかで昇格
```

目標: E-46 (1 件処理 < 10 秒)。in-memory fallback では < 1 秒で完走。

## Phase 0.5 in-memory fallback

`IN_MEMORY_FALLBACK=true` 環境変数を設定すると以下を stub に切り替える:

| 対象 | Stub 挙動 |
|---|---|
| `getSupabase()` | null を返す |
| `getMonthlyFailureStoryPostCount` | 0 を返す |
| `getVerifiedMaterialIds` | 入力 ID 全部を verified 扱い |
| `fetchRecentPostBodies` | 空配列 |
| `embedText` | 384-zero vector (cos=0 → R5 always pass) |
| `runLlmJudge` | 文字列 heuristic で deterministic に 6 項目判定 |
| `classifyHook` (TS wrapper) | キーワード regex で deterministic に分類 |

PR-B+ で `IN_MEMORY_FALLBACK=false` に切り替え、実 API を有効化する。

## 使い方

### CLI

```bash
echo '{
  "traceId":"t-1","draftId":"d-1","coreIdeaId":"c-1",
  "platform":"x","body":"経営者向け業務の仕組み化。私は自動化した。30 分 → 3 分。",
  "fmat":"short","sourceMaterialIds":[],"hasAffiliateLink":false
}' | IN_MEMORY_FALLBACK=true npx tsx lib/editor/cli.ts
```

exit code 0 = approved / 1 = rejected / 2 = internal error。

### プログラム

```ts
import { runEditor } from "./lib/editor/pipeline.ts";
const out = await runEditor({
  traceId: "t-1", draftId: "d-1", coreIdeaId: "c-1",
  platform: "x", body: "...",
  fmat: "short", sourceMaterialIds: [], hasAffiliateLink: false,
});
```

### Test

```bash
npm run editor:test
```

15 fixture を __fixtures__/ から読み、各 fixture の expected を満たすか検証する。

## ファイル

```
lib/editor/
├── types.ts                 RuleId enum + EditorInput/Output/RuleResult
├── hook-quotas.ts           initial-values §3.2 配分 + VERIFIED_FAILURE_STORY_MONTHLY_CAP=4
├── db.ts                    Supabase 3 query (in-memory fallback 対応)
├── embedding.ts             Phase 0.5 stub (zero vector + cosineSim)
├── llm-judge.ts             Sonnet 4.6 tool_use bundled (Phase 0.5 stub)
├── rules/base.ts            R1〜R6
├── rules/extension.ts       X1〜X5
├── pipeline.ts              Stage 0 → 1 → 2 → 結合
├── cli.ts                   stdin/stdout CLI
├── pipeline.test.ts         15 fixture jest test
├── __mocks__/               db / embedding mock (state injection)
└── __fixtures__/            15 fixture JSON
```

## launch-roadmap との SSoT 不一致

launch-roadmap.md の「6+4」表記は SSoT 不一致 (main-design v10.3 では 6+5)。
PR #32 で同期予定 (2026-05-27 着手済)。
