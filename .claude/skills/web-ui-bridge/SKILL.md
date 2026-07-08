---
name: web-ui-bridge
description: 動いている自分のサイト上で要素をクリックして溜めた「UI 修正キュー」(.claude-ui-queue.jsonl) を処理する。daemon/overlay が未起動のサイトへの立ち上げも扱う。overlay からの自然文プロンプトを、className/テキストを手がかりに実ソース(Next.js+Tailwind の app/**)へ最小編集で反映する。ユーザーが「UIキュー処理して」「ブリッジのキュー見て」「web-ui-bridge立ち上げて」「web-ui-bridge」「溜めた修正を反映して」「キュー処理」等と言ったとき起動する。
---

# web-ui-bridge — UI 修正キューの処理

ブラウザ上で要素をクリック→指示を溜めた `.claude-ui-queue.jsonl` を読み、実ソースへ反映する。

## 起動（daemon + overlay の立ち上げ）

対象サイトでまだ daemon が動いていない時、または新しいサイトに初めて導入する時の手順。

1. **daemon 依存インストール**（初回のみ、daemon 自体の node_modules が無ければ）:
   ```bash
   cd /Users/rikukudo/Projects/private-agents/all-good-ops/apps/web-ui-bridge/daemon && npm install
   ```
2. **daemon 起動**（`--target` は対象サイトの絶対パス。all-good-ops 内は相対パスでも可だが、**別リポジトリが対象なら絶対パス必須**）:
   ```bash
   node /Users/rikukudo/Projects/private-agents/all-good-ops/apps/web-ui-bridge/daemon/server.mjs \
     --target <対象サイトの絶対パス（例: .../apps/web）>
   ```
   → `curl http://localhost:7331/health` で `{"ok":true,"target":...}` を確認。
3. **対象サイトへの overlay 注入**（初回のみ、`app/layout.tsx` の `</body>` 直前、dev 限定）:
   ```tsx
   {process.env.NODE_ENV === 'development' && (
     <script src="http://localhost:7331/overlay.js" async />
   )}
   ```
   本番ビルドには混入しない。SRI(integrity)は不要（127.0.0.1のみlistenのdev daemon、外部CDNではない）。
4. **`.gitignore` に追加**（初回のみ）: `.claude-ui-queue.jsonl` / `.web-ui-bridge-history.json` / `.web-ui-bridge-token`
5. **対象サイトの dev server を（再）起動**。overlay 注入直後は HMR で拾われないことがあるため、確実性を優先するなら再起動する。
6. ブラウザで開き、右上に STUDIO 風ドックが出ることを確認（出なければ daemon 起動中か、`NODE_ENV=development` か確認）。

一度立ち上げれば、以降は下記「キューファイルの場所」以降の処理フローに入る。詳細（トラブルシュート・セキュリティ設計等）は `apps/web-ui-bridge/README.md` 参照。

## キューファイルの場所
対象サイト直下の `.claude-ui-queue.jsonl`（gitignore 済・1 行 1 JSON）。
- パイロット = TERRA葉山: `outputs/clients/terra-isshiki/site/.claude-ui-queue.jsonl`
- どのサイトか不明なら、最近触ったサイト or ユーザーに確認。daemon 起動時の `--target` がそのサイト。

各エントリの形:
```json
{"id":"a1b2c3d4","ts":"...","status":"pending","route":"/","tag":"h1",
 "component":null,"classes":"fade-up font-serif ... tracking-[0.02em] text-(--color-base-light)",
 "text":"ゆっくり流れる、葉山時間。","ownText":null,"textSnippets":["ゆっくり流れる","葉山時間"],
 "domPath":"section > div > h1","selector":"...","prompt":"2行に分けて余白を広く"}
```

## 手順
1. キューファイルを Read。`status:"pending"` のエントリだけ対象（`done` は無視）。
2. 各エントリで**対象ソースを特定**（優先順）:
   - **① `classes` 文字列を grep**（最強・ソースと一致する。例 `grep -rn 'tracking-\[0.02em\]' app/`）。Tailwind の arbitrary 値/CSS 変数構文 `text-(--color-base-light)` もそのまま grep 可。
   - **② `textSnippets` / `text` を部分一致 grep**（テキストは複数 span に分割され合成されることがあるので**完全一致しない**。必ず substring/トークンで）。
   - **③ `route`(=ページ) と `domPath` で曖昧さを解消**。`route:"/"` は `app/page.tsx`、`/rooms` は `app/rooms/page.tsx`、共通要素は `app/_components/*.tsx` や `app/layout.tsx`。
   - `component` が非 null なら追加ヒント（ただし null が普通＝Server Component。依存しない）。
3. `prompt` の意図どおり**最小編集**（Tailwind クラス調整・文言変更・構造の微修正）。`~/brain/2-atoms/standards.md` 準拠（Tailwind 直書き）。複数エントリは同一ファイルにまとまることが多いので、関連をまとめて編集してよい。
4. 反映後、そのエントリの `status` を `"done"` に更新（ファイルを書き直す。`done` 行は残してログにする）。
5. 完了を 1 行報告（id・対象ファイル:行・何をしたか）。HMR でブラウザに即反映されるので、ユーザーは見て確認→また触れる。

## ガード
- 編集は対象サイトのソースのみ。**デプロイ・送信・migration・金銭は対象外**（硬ゲート維持）。
- 指示が曖昧で複数解釈できる時は、推測で広く書き換えず、最小解釈で 1 つ当てて報告（「こう解釈した。違えば再指示を」）。
- 特定できない（grep が複数 or ゼロ）時は、その id をスキップして「特定できず」と報告。勝手に当て推量で別箇所を編集しない。
- **「立ち上げて」と言われて手順を省略しない** — daemon が起動していなければ overlay 自体が出ず、キューも作られない。まず上記「起動」セクションを実行する。

## 監視モード（任意）
ユーザーが「監視して」「溜まったら処理して」と言う場合は `/loop` で本スキルを周期起動し、`pending` が出たら処理する。単発は「キュー処理して」で都度実行。
