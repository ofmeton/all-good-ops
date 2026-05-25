# B3 実測結果 (2026-05-24 実行)

> Managed Agents (beta) 最小サンプル 3 ラン実コスト測定の結果。換算 1 USD = 155 JPY。

## エグゼクティブサマリ

| 指標 | 値 |
|---|---|
| 実行 3 ラン合計 | **$0.39 ≒ ¥61** (上限 $2 / ¥310 の 20%) |
| 月間想定 (v9 全 MA シナリオ) | **$2.3 ≒ ¥357** (月予算 ¥10,000 の 3.6%) |
| v8 想定 ¥587 との差 | **¥230 安い** (39% 削減) |
| MA 採用判断 | **MA「全部入り」は cost 的に余裕** (要 Console billing 確認) |

## 詳細結果 (3 ラン)

### 1. Interviewer 通常 (Sonnet 4.6, 5 ターン)

| 項目 | 値 |
|---|---|
| session_id | sesn_01GjbqGdsY3BuEFBSadJEcKB |
| wall_clock (script) | 38.1 s |
| **server active_seconds** | **22.1 s** |
| **server duration_seconds** | **37.3 s** |
| final input_tokens | 825 |
| final output_tokens | 787 |
| token_cost | $0.0143 |
| session_cost (active 0.0061h × $0.08) | $0.0005 |
| session_cost (duration 0.0104h × $0.08) | $0.0008 |
| **TOTAL** | **~$0.015 ≒ ¥2.3** |

注: 各 turn 後の `session.usage` は **session 累計値**。turn ログを reduce で sum すると二重計上 (script 出力 $0.0470 は誤、正値は $0.015)。

### 2. Interviewer Sleep 版 (30s sleep before last turn)

| 項目 | 値 |
|---|---|
| session_id | sesn_017HQWqB7YJimNmDKmfeEAbG |
| wall_clock | 78.2 s |
| **server active_seconds** | **30.4 s** |
| **server duration_seconds** | **77.3 s** |
| final input/output | 825 / 1234 |
| token_cost | $0.0210 |
| session_cost (active 基準) | $0.0007 |
| session_cost (duration 基準) | $0.0017 |
| **TOTAL** | **~$0.023 ≒ ¥3.6** |

### 3. Optimizer Phase 2 (Opus 4.7)

| 項目 | 値 |
|---|---|
| session_id | sesn_017StiLxhbdPRBGHKZQXv9GB |
| wall_clock | 76.1 s |
| **server active_seconds** | **72.2 s** |
| **server duration_seconds** | **75.3 s** |
| input_tokens | 1,488 |
| output_tokens | 4,382 |
| cache_read_input_tokens | 0 |
| token_cost | $0.3510 |
| session_cost | $0.0017 |
| **TOTAL** | **$0.353 ≒ ¥54.7** |

**観測**:
- 想定 30 分 → 実 1.3 分 = **Opus 4.7 が extended thinking 無し** で即応答した
- v9 で extended thinking 有効化したい場合は別途設定要 (今回未指定)
- 設定すれば想定の 10-30 分の長時間バッチに伸びる + cost も比例して上昇

## 重大な技術発見 (3 つ)

### 発見 1: `active_seconds` と `duration_seconds` の乖離

| ラン | active | duration | 乖離 |
|---|---|---|---|
| Interviewer 通常 | 22 s | 37 s | 1.7× |
| Interviewer Sleep | 30 s | 77 s | 2.5× |
| Optimizer | 72 s | 75 s | 1.04× |
| 前セッション (中断) | 28 s | 178 s | 6.4× |

**結論**: `active_seconds` は **idle/sleep 中カウントしない**。`duration_seconds` は **create→終了の wall-clock 累計**。

→ **MA billing が active か duration かで月コスト最大 6 倍変動**。Anthropic Console の billing dashboard で確認必須 (人間タスク残)。

### 発見 2: `session.usage` は累計値、各 turn 後の retrieve で累計が増えるだけ

`session.usage.input_tokens` / `output_tokens` は **session 全体の累計**。各 turn でこの値を retrieve してログするのは OK だが、**reduce で sum すると二重計上**。

→ B-3 script の cost 計算は集計時に修正必要 (正しい cost は最終値のみ使う)。

### 発見 3: MA 内蔵 prompt cache が想像以上に効く

Interviewer 5 turn で input が `813 → 816 → 819 → 822 → 825` と **+3 ずつしか伸びない**。これは MA 内部で過去 context を prompt cache に乗せて、新 user message 分 (~3 tokens) だけが「実 input」として課金される設計。

→ Sonnet 4.6 で長対話しても token cost が線形に膨らまない。**v9 Interviewer は 5 ターン → 10 ターンに伸ばしても cost 微増のみ**。

## SDK / Runtime のハマりどころ

### 1. ts-node は Node v24 で silent exit (EXIT=0、output 空)

`@anthropic-ai/sdk` v0.98 を `ts-node` で実行すると、TypeScript compile は通るのに何も実行されず EXIT=0 で終了。同じファイルを `tsx` で実行すると正常動作。

→ **Node v24+ では `tsx` を使う**。`ts-node` は install しない。

### 2. Agent 作成パラメータは `system`、`instructions` ではない

`client.beta.agents.create({ instructions: ... })` は TS error。正しくは `system:`。SDK の `.d.ts` で確認推奨。

### 3. Session 作成直後の status は `idle`、race 対策必須

`session.create()` 直後の status はすでに `idle`。`events.send()` 後に**すぐ retrieve すると古い idle を返してくる race** で turn が skip される。

→ `sendAndWaitIdle` で先に `running/rescheduling` への遷移を確認してから `idle` 待ち。

### 4. `archive` は running 中に呼ぶと 400

最後の send → 即 archive すると "cannot be archived while running" エラー。`idle` 確認してから archive。

→ 同時に `session.retrieve` で stats を取ってから archive (archive 後の stats 取得は不可)。

### 5. session が `running` のまま放置されると session-hour 課金が続く

エラーで中断した session を archive せず放置 → cleanup script で archive するまで課金継続 (発見 1 の 6.4× 乖離はこれ起因)。

→ 新規 session 作る前に過去 session の状態を audit + 必要なら archive。

## 月間想定再算定 (v9 全 MA シナリオ)

| 用途 | 頻度 | 1 ラン cost | 月額 |
|---|---|---|---|
| Interviewer (Sonnet 4.6, 1日2回×30) | 60 回 | $0.015 | **$0.9 ≒ ¥140** |
| Optimizer Phase 2 (Opus 4.7, 週1) | 4 回 | $0.353 | **$1.41 ≒ ¥219** |
| **MA 関連 計 / 月** | — | — | **$2.3 ≒ ¥357** |
| 月予算 ¥10,000 に対する比率 | — | — | **3.6%** |

v8 想定 ¥587 (5.9%) → 実測再算定 ¥357 (3.6%)。**¥230 余裕枠が増えた**。

ただし上方リスク要素:
- Opus extended thinking 有効化で Optimizer cost が 2-5 倍に
- Web search 使うと $10/1,000 回別途
- duration billing なら active billing の数倍 (発見 1)
- cache miss が増えると Interviewer cost も上昇

## v9 設計判断への反映 (A フェーズで反映)

1. **MA「全部入り」は cost 的に許容範囲** → v9 §3.4 は MA 採用継続
2. **Interviewer ターン数を 5 → 8-10 に拡張可能** (cache 効果で cost 微増)
3. **Optimizer Phase 2 は extended thinking 有効化前提で再見積もり** (今回は無効状態)
4. **brownout mode の議論で「処理終了 → 即 archive」のロジックを §5.3 で必須化** (発見 5)
5. **§3.3 コスト試算を実測値ベースで更新**
6. **B-3 script の token sum bug は v9 implementation のリファレンス時に修正**

## 残課題 (人間タスク or v9 起草後の Phase 0 ドライランで実施)

- [ ] Anthropic Console の billing dashboard で「session-hour 課金は active か duration か」確認
- [ ] Opus 4.7 extended thinking 有効化での実コスト測定 (本番運用前に 1 回測定)
- [ ] Cache hit rate の長期観測 (cache 効果が想定通り続くか)
- [ ] Web search 課金の実測 (Optimizer で web search を呼ぶケース)

## 全 session の archive 確認

- sesn_01Eo4gUGMQYLPvJbSrJ5DwBi: ✅ archived (cleanup-prev.ts)
- sesn_01GjbqGdsY3BuEFBSadJEcKB: ✅ script 内で archive
- sesn_017HQWqB7YJimNmDKmfeEAbG: ✅ script 内で archive
- sesn_017StiLxhbdPRBGHKZQXv9GB: ✅ script 内で archive

session-hour 課金リーク無し。
