---
date: 2026-05-23
category: situations
source: session
---

# money-bot Phase 1.5 実バズ取得 E2E 完走確認

## 完走の証拠

- runId: `wrun_01KSAGD10RC2KATWAGHZJ3ED5V`
- buzz_tweets テーブル初の実 entry:
  - tweet_id: `2057617265588052386`
  - author: `@shmidtqq` (海外 dev)
  - body: "Claude Code pays off BIG for devs who can manage ~10 lines of context instead of just spamming prompts..."
  - likes: 105
  - relevance_score: 82 (Haiku 4.5 判定)
  - category: tips
- LINE 通知: 2 通到達 (mock の SQL 系古い run + 「プロンプト連発は無駄」実バズ run)
- ユーザー確認: 「成功だね！」

## デバッグ過程で発見した bug 2 件

### bug 1: Vercel CLI agent mode で env が空に投入される

- `isAgent=true` (Claude Code 検知) で `vercel env add` がエージェント mode に切替
- `--value`, `printf | stdin`, heredoc 全て試したが production env に空文字 `""` が投入される
- 「Added Environment Variable」と CLI は返すが実体は空
- 解決: **Vercel REST API 直接呼び出し** (`https://api.vercel.com/v10/projects/{pid}/env`) で平文 POST

教訓: Vercel CLI を Claude Code 経由で env add するのは破壊的。memory feedback 化必要 (次セッションで)。

### bug 2: twitterapi.io advanced search のレスポンス field 名

- x-buzz-radar の元コード `lib/fetchers/twitterapi.ts` は `json.data` を見る interface 定義
- 実 API レスポンスは `{tweets: [...]}` 形式 (`data` field は存在しない)
- 私の `lib/buzz-source.ts` も x-buzz-radar の interface を踏襲してて MOCK_BUZZ_SIGNAL fallback ばかりだった
- 修正: `json.tweets ?? json.data ?? []` に変更

教訓: 外部 API のレスポンス形状は **WebFetch + 実 curl で必ず確認**してから interface を書く。x-buzz-radar の T1-T20 実装も同じ bug を抱えている可能性 (テストが pass している = mock fixture と実 API がズレている?)

## 残作業

- debug-env endpoint 削除済
- lib/buzz-source.ts の field 修正を commit + push 必要
- x-buzz-radar 側 (別ブランチ) の同じ bug を Phase 2 統合時に修正
- skill `kaitoInfra/twitterapi-io` の install は付加価値小、Phase 後送り

## Phase 1.5 DoD 達成

- ✅ 情報源 x-buzz-radar (twitterapi.io 直叩き) 実バズ取得確認
- ✅ Haiku 4.5 関連度判定動作確認 (score 82 / category tips)
- ✅ Sonnet / Haiku SNS 生成 (X / IG) 動作確認
- ✅ 承認 UI で FB 4 欄入力 + 蓄積動作確認
- ✅ Supabase buzz_tweets / publish_queue / approvals 整合性確認
- ⏳ 翌日 JST 14:00 自走確認 (1 日観察)
- ⏳ FB 蓄積が次サイクル prompt に inject される効果検証 (数サイクル後)
