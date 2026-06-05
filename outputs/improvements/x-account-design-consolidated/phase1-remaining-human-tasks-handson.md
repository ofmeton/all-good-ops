# Phase 1 残タスク ハンズオン（人間向け）

> 作成: 2026-06-02 by Claude（pre-launch 検証つき）
> 対象: 2026-06-08 soft launch（X+note / 1 投稿・日・人間承認モード）
> 名義: **はぐりん**（note=`hagurin__`） / 関連: `content-drafts/h8-owned-channel-copy.md §7`

---

## 0. システム検証結果（2026-06-02 実施）

| 項目 | 結果 |
|---|---|
| 全テストスイート | ✅ **148 passed / 17 suites**（Editor 6+5 / Publisher / Optimizer / Interviewer / E2E dry-run / safety / brownout 含む） |
| npm install | ✅ 375 packages / 0 vulnerabilities |
| Supabase 接続 | ⚠️ **要対応**（§3-1 参照。schema 不一致を発見） |
| LINE digest 見出し名義 | ⚠️ 軽微（コード文字列が `ofmeton Daily Digest` のまま。§3-2） |

→ **コアロジックは全て健全**。残るのは「外部接続 2 件の対応」と「人間の運用アクション」のみ。

---

## 1. ★必須タスク（6/8 当日まで）

### 1-1. X 固定ポストを投稿（launch 当日 6/8）

1. X にログイン（はぐりん運用アカウント）
2. 以下（採用＝案A）をそのまま投稿:
   ```
   はぐりんです。
   非エンジニアの経営者が、Claude Code や Codex で「一人でも生産を爆上げする」ための実例を、毎日1投稿で残していきます。

   業務自動化を5年（Python / GAS / VBA）。
   今は Claude Code で、HP制作・飲食店マネージャー業務の自動化・WEB広告まわり・アプリ開発を、コードを一から書かずに回しています。

   その手順を、失敗込みで note にまとめています。
   👇
   https://note.com/hagurin__
   ```
3. 投稿後 → その投稿を**プロフィールに固定**（ポスト右上「…」→「プロフィールに固定する」）
4. ✅ 完了判定: プロフィール最上部に固定表示

### 1-2. 各投稿の人間承認（運用開始後ずっと）

- Phase 1 は「1 投稿・日・**人間承認モード**」。LINE に届く承認リクエストに対し approve/reject するだけ（自動投稿はしない）。
- ✅ 準備: LINE 友達追加済（`https://lin.ee/QQWV0yD`）。承認導線は §2-2 の Webhook 接続後に有効化。

---

## 2. ◎推奨タスク（cron 自動化用 / 初投稿は無くても可）

### 2-1. Cloudflare `wrangler login`（対話・ブラウザ認証）

> Daily Digest（21:00）・GitHub Trending（07:00）・Interviewer の自動化に必要。

1. プロンプトに以下を貼って実行（`!` 接頭辞でこのセッションに出力が返る）:
   ```
   ! cd /Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system && npx wrangler login
   ```
2. ブラウザで Cloudflare 認証 → 「Allow」
3. ✅ 完了判定: `npx wrangler whoami` でアカウント表示
4. → **この後の secret 投入・deploy・cron 登録は Claude が実行**（`DEPLOY.md` §2-4）

### 2-2. LINE Webhook URL 設定（deploy 後）

1. deploy 完了後、Claude が `https://ofmeton-x-account.<account>.workers.dev/line/webhook` を提示
2. LINE Developers Console → 該当チャネル → Messaging API → Webhook URL に貼付け → 「検証」→ ON
3. ✅ 完了判定: 検証 success + 承認リクエストが LINE に届く

---

## 3. ⚠️要対応（システム連携・launch までに）

### 3-1. Supabase `xad` schema を本番で使えるようにする

**発見した問題**: migration は `xad` schema にテーブル作成済だが、(a) アプリの Supabase クライアントが schema 未指定で `public` を見ている（コードバグ）、(b) PostgREST の Exposed schemas に `xad` が無い可能性。このままだと本番 DB が空振りし in-memory fallback に落ちる（cron 跨ぎで状態消失）。

**あなたのタスク（dashboard 設定・5 分）**:
1. Supabase Dashboard → 該当 project（`ofmeton-apps` / `hofvvcvhjslevymhbcqj`）
2. Settings → API → **Exposed schemas** に `xad` を追加して保存
3. ✅ 完了判定: 設定後 Claude が接続再検証

**Claude 側タスク（別途実施）**: `createClient` に `{ db: { schema: process.env.SUPABASE_SCHEMA } }` を渡す修正（kill-switch / kpi-collector / line-flow / editor-db ほか）。→ 次のセッションで PR 化。

### 3-2. LINE digest 見出しの名義（軽微）

- `lib/dashboard/digest.ts` の `ofmeton Daily Digest` 文字列が旧名義のまま。表示のみ・動作影響なし。→ Claude が §3-1 の修正とまとめて対応。

---

## 4. 任意・後回し

| タスク | 状態 |
|---|---|
| ドメイン（hagurin 系） | ⏸ 後回し（必須でない。`hagurin.dev`/`.blog`/`.me` を Cloudflare で空き確認 → 取得） |
| Instagram（H-6: Business 化 + Meta App Review） | ⏸ X とは独立。IG を回すタイミングで着手 |
| note メンバーシップ公開 | ⏸ 無料ストック 2-3 本溜まってから 非公開→公開 |

---

## まとめ（あなたが今やること）

- **今すぐ不要**: 何もしなくても §1-1 の固定ポストを 6/8 に投稿すれば soft launch は成立
- **launch までに**: §3-1（Supabase Exposed schemas に `xad` 追加・5分）
- **自動化したいなら**: §2-1（`wrangler login`）→ 残りは Claude が deploy
