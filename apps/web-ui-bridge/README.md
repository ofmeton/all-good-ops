# web-ui-bridge

動いている自分のサイト上で**要素をクリック→自然文で指示**を書くと、`file:line` を毎回テキストで説明せずに **Claude Code に正確に伝わる**開発ツール（MVP / Phase 0）。

コードが正（source of truth）。ビジュアル編集は Claude が実ソースに反映 → HMR で即確認 → また触る、のループを回す。

## 構成（疎結合 3 部品 + キューファイル）

```
ブラウザ(自分のサイト :3000)        ローカル daemon(:7331)         Claude Code
  ① overlay.js を <script> で注入  →  ② /enqueue を受け追記      →  ④ skill: web-ui-bridge
     ホバー/クリックで要素選択           ③ .claude-ui-queue.jsonl       pending を読み実ソース編集
     プロンプトを書いて「送る」                                         status を done に
```

- **① overlay** (`overlay/overlay.js`): 自己完結 vanilla JS。Shadow DOM で隔離。daemon が origin を埋め込んで配信。
- **② daemon** (`daemon/server.mjs`): 依存ゼロの Node http サーバ。`/enqueue` `/overlay.js` `/health`。
- **③ queue** (`<target>/.claude-ui-queue.jsonl`): gitignore 済の dev 専用キュー。
- **④ skill** (`.claude/skills/web-ui-bridge/SKILL.md`): キューを読み実ソースへ反映。

## 使い方

```bash
# 1) daemon を起動（対象サイトを --target で指定）
node apps/web-ui-bridge/daemon/server.mjs \
  --target outputs/clients/terra-isshiki/site
# → http://localhost:7331 で待受、queue は <target>/.claude-ui-queue.jsonl

# 2) 対象サイトの dev を起動（layout.tsx に dev 限定の注入1行が入っている）
cd outputs/clients/terra-isshiki/site && npm run dev
```

ブラウザで開いて右下の 🎯 → 要素をホバー/クリックで選択 → 指示を書いて「キューに追加」→「Claudeへ送る」。
Claude Code 側で「キュー処理して」（or `/loop` で監視）→ 反映。

## 別サイトへ導入（Next.js + Tailwind）

`app/layout.tsx` の `</body>` 直前に dev 限定で 1 行:
```tsx
{process.env.NODE_ENV === "development" && (
  <script src="http://localhost:7331/overlay.js" async />
)}
```
`.gitignore` に `.claude-ui-queue.jsonl` を追加。本番ビルドには一切混入しない。

## 設計判断（Spike 0 実測）

- React 19 で fiber の `_debugSource`(file/line) は無い。App Router の **Server Component はクライアント fiber に名前が出ない**。
- よって `file:line`・component 名に**依存しない**。確実な locator = **className（ソース一致・grep 一発）+ text 部分一致 + route + DOM パス**。
- build 変換を入れない（`.babelrc` は next/font を壊す・Turbopack も維持）。

## スコープ外（将来）

- Phase B: プロパティ直接調整（余白/色/サイズをスライダーで実コードへ codemod）
- Phase C: D&D・レスポンシブ構造編集 → [Onlook](https://github.com/onlook-dev/onlook) 採用を再評価
