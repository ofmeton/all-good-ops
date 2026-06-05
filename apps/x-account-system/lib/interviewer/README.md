# Interviewer (PR-D)

LINE 完結 5 ステップ Interviewer。投稿原料 (素材) を ofmeton 自身から短時間で
引き出し、`materials_store` に `publication_consent='granted'` で INSERT する。

SSoT: `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §6.2

## 5 ステップ

| Step | 役割 | 代表 pattern_id |
|---|---|---|
| 1 kickoff      | 業種別キーワード注入 + 業務トピック提示 (v10.3 C-2) | `quick_recap` |
| 2 dig_attempt  | 試行錯誤・失敗談の引き出し | `failure_recall` / `tool_drill` |
| 3 dig_metrics  | Before-After / 時間圧縮 数値引き出し | `metrics_quant` / `time_pressure` |
| 4 consent_gate | 公開許諾 gate (`client_redact` + `consent_explicit`) | `client_redact` → `consent_explicit` |
| 5 closure      | 投稿予定日確定 + thank-you | `details_dig` |

## 質問パターン 8 種類

`quick_recap` / `details_dig` / `metrics_quant` / `failure_recall` /
`tool_drill` / `time_pressure` / `client_redact` / `consent_explicit`

業種 (Industry) は `rice_cream` / `tutoring` / `minpaku` / `web_production` /
`ai_automation` / `generic` の 6 種。kickoff 質問にキーワード差し込み (v10.3 C-2)。

## 公開許諾 gate

`consent_explicit` ターンで `parseConsent()` が `granted` を返した時のみ
`materials_store` に INSERT する (フェイルセーフ: 曖昧表現は `denied`)。

`denied` 時:
- `materials_store` には書かない
- session は `finalized=true` で即終了 (closure 飛ばし)
- 集めた答えは内部メモのみ (再利用は別途人間判断)

## Phase 0.5 fallback

| env | 挙動 |
|---|---|
| `IN_MEMORY_FALLBACK=true` | Supabase 呼ばず in-memory Map のみ。`material_id` は `mat_<session>_<ts>` |
| `LINE_DRY_RUN=true` | LINE 送信を `console.log('[LINE DRY-RUN] ...')` に切替 |

Phase 1 launch 前に `LINE_DRY_RUN=false` + `LINE_CHANNEL_ACCESS_TOKEN` 設定。

## API

```ts
const session = createSession({
  id: "sess_xxx",
  line_user_id: "U_ofmeton",
  industry: "rice_cream",
  topic: "レジ締め自動化",
});

const q = await nextQuestion(session);
await sendLineMessage(session.line_user_id, q!.text);

// LINE webhook で答えが返ってきたら
await recordAnswer(session, {
  step: q!.step,
  pattern_id: q!.pattern_id,
  question_text: q!.text,
  answer_text: "Claude にレジ締めをお願いした",
  received_at: new Date().toISOString(),
});

// 全 5 step 完走後
const draft = await finalizeSession(session);
// → materials_store INSERT 済 (granted の場合) + MaterialDraft
```

## Phase 1+ TODO

- LLM (Sonnet 4.6) で kickoff 質問を industry × topic から動的生成
- consent denied 時のフォローアップフロー (LINE で「内部メモ化しますね」通知)
- 投稿予定日の自然言語 parse (「明日朝」「今週金曜」)
- materials_store INSERT 失敗時の retry / DLQ
- pattern_id × industry × 投稿成果の対応関係 Optimizer 学習
