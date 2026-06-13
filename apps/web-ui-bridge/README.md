# web-ui-bridge

動いている自分のサイト上で**要素をクリック**して直接 UI をいじる開発ツール。コードが正（source of truth）。

2 つの編集経路:
- **直接調整（Phase B）**: 余白/詰め/揃え/className をその場でいじり、**Claude を介さず実ソースへ即書き戻し**（daemon `/apply-style`）。HMR で即確認。軽い見た目調整向け。
- **Claudeに頼む（Phase 0）**: `file:line` を毎回説明せず、要素文脈つきプロンプトを **Claude Code に正確に橋渡し**（queue 経由）。構造・文言・複雑な調整向け。

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

ブラウザで開いて右下の 🎯 → 要素をホバー/クリックで選択。パネルで:
- **直接調整**: 余白±/詰め±/揃え/className をいじる（ライブプレビュー）→「適用」で実ソースへ即反映（Claude 不要・HMR 即時）。
- **Claudeに頼む**: 指示を書いて「キューに追加」→「Claudeへ送る」→ Claude Code 側で「キュー処理して」（or `/loop` 監視）。

`/apply-style` は className の literal を一意に特定できた時だけ書き換える（複数一致/動的 class は安全側で拒否 → Claude 経路へ誘導）。

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

## セキュリティ（dev daemon だがソースを書き換える）

ブラウザから到達可能で実ファイルを書き換えるため、悪意あるサイトからの CSRF / パストラバーサルを防御:
- daemon は **127.0.0.1 のみ listen**（リモート到達不可）。
- 状態変更(POST `/enqueue` `/apply-style`)は **Origin が localhost/127.0.0.1 + 起動毎生成のトークン(`X-Bridge-Token`)** 必須。トークンは overlay.js に埋めて同一 daemon から配信し、`/overlay.js` は CORS 不可（クロスオリジン fetch で本文＝トークンを読めない／script タグ実行は CORS 不要）。
- 書き換えは `--target` 配下に限定（path 解決後 prefix 検証）、route は App Router パス文字のみ許可。
- `newClassName` は className literal を壊す文字（`" { } < > \` ; =`）を拒否＝JSX/JS ブレイクアウト防止。

## トラブルシュート

- **worktree で `next dev` が next/font の `@vercel/turbopack-next/internal/font/google/font` を解決できず 500**: worktree × Next16 Turbopack × next/font の既知問題。対象サイトで `rm -rf node_modules .next package-lock.json && npm install` のクリーン再インストールで解消（初回コンパイルは ~30s かかる）。`--webpack` は Next16 dev では効かない。
- overlay が出ない: daemon(:7331) 起動中か、対象サイトが dev(`NODE_ENV=development`) か確認。
- 「適用」が効かない（ambiguous/not-found）: 同じ className が複数箇所 or 動的生成。Claude経路（プロンプト）で頼む。

## 済み / 将来

- ~~Phase 0: クリック→Claude 橋渡し~~（済）
- ~~Phase B: プロパティ直接調整（余白/詰め/揃え/className を実コードへ即反映）~~（済）
- Phase B.2（任意）: 色/フォントサイズのピッカー、レスポンシブ別（md: 等）の編集
- Phase C: D&D・レスポンシブ構造編集 → [Onlook](https://github.com/onlook-dev/onlook) 採用を再評価
