---
name: web-ui-bridge
description: 動いている自分のサイト上で要素をクリックして溜めた「UI 修正キュー」(.claude-ui-queue.jsonl) を処理する。overlay からの自然文プロンプトを、className/テキストを手がかりに実ソース(Next.js+Tailwind の app/**)へ最小編集で反映する。ユーザーが「UIキュー処理して」「ブリッジのキュー見て」「web-ui-bridge」「溜めた修正を反映して」「キュー処理」等と言ったとき起動する。
---

# web-ui-bridge — UI 修正キューの処理

ブラウザ上で要素をクリック→指示を溜めた `.claude-ui-queue.jsonl` を読み、実ソースへ反映する。

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
3. `prompt` の意図どおり**最小編集**（Tailwind クラス調整・文言変更・構造の微修正）。`wiki/dev/standards.md` 準拠（Tailwind 直書き）。複数エントリは同一ファイルにまとまることが多いので、関連をまとめて編集してよい。
4. 反映後、そのエントリの `status` を `"done"` に更新（ファイルを書き直す。`done` 行は残してログにする）。
5. 完了を 1 行報告（id・対象ファイル:行・何をしたか）。HMR でブラウザに即反映されるので、ユーザーは見て確認→また触れる。

## ガード
- 編集は対象サイトのソースのみ。**デプロイ・送信・migration・金銭は対象外**（硬ゲート維持）。
- 指示が曖昧で複数解釈できる時は、推測で広く書き換えず、最小解釈で 1 つ当てて報告（「こう解釈した。違えば再指示を」）。
- 特定できない（grep が複数 or ゼロ）時は、その id をスキップして「特定できず」と報告。勝手に当て推量で別箇所を編集しない。

## 監視モード（任意）
ユーザーが「監視して」「溜まったら処理して」と言う場合は `/loop` で本スキルを周期起動し、`pending` が出たら処理する。単発は「キュー処理して」で都度実行。
