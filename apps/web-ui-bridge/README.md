# web-ui-bridge

動いている自分のサイト上で**要素をクリック**して直接 UI をいじる開発ツール。コードが正（source of truth）。

2 つの編集経路:
- **直接調整（Phase B / B.2）**: 余白/詰め/フォントサイズ/揃え/文字色・背景色/className をその場でいじり、**Claude を介さず実ソースへ即書き戻し**（daemon `/apply-style`）。画面幅 bp（全/sm/md/lg/xl）を切替えると以降の調整がその breakpoint（`md:` 等）に効く。HMR で即確認。軽い見た目調整向け。
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
# 0) 初回のみ daemon の依存をインストール（reorder の AST 解析に @babel/parser を使う）
cd apps/web-ui-bridge/daemon && npm install && cd -

# 1) daemon を起動（対象サイトを --target で指定）
node apps/web-ui-bridge/daemon/server.mjs \
  --target outputs/clients/terra-isshiki/site
# → http://localhost:7331 で待受、queue は <target>/.claude-ui-queue.jsonl

# 2) 対象サイトの dev を起動（layout.tsx に dev 限定の注入1行が入っている）
cd outputs/clients/terra-isshiki/site && npm run dev
```

UI は **STUDIO に忠実な右ドック・ライトインスペクタ**（白 #fff・文字 #1a1a1a・ヘアライン罫線・アクセント #222・選択ハイライトのみ青／Shadow DOM 隔離・Inter・SVG アイコン）。STUDIO エディタは実機ではライトテーマ＝色も実機 devtools で抽出（機能カタログ＆再現可否 → [STUDIO-PARITY.md](./STUDIO-PARITY.md)）。上部ツールバー = 選択 / 移動(⇅) / 戻る / 進む / 閉じる ＋ 画面幅(全/sm/md/lg/xl)セグメント。閉じると右上ランチャーから再表示。

> **永続 undo/redo & 安定トークン**: 編集履歴とトークンを target 配下に永続化（`.web-ui-bridge-history.json` / `.web-ui-bridge-token`、gitignore 済）。daemon を再起動しても **戻る/進むが効き、開いたままのページも編集を続けられる**（in-memory 履歴消失・トークン失効による「undo できない/編集できない」を解消）。

- **選択**: 要素をクリックすると **タブ式インスペクタ**（STUDIO 同様）——
  - **テキスト**: 色・フォント・サイズ・太さ・行高・字間・整列・下線/斜体
  - **ボックス**: レイアウト(幅/高さ・マージン/パディング)・外観(背景色/角丸/不透明度/枠線/影)・ポジション(位置/重ね順/はみ出し)
  - **変形**: 回転・拡縮 / **設定**: className 直接編集・複製/削除・要素情報
  - 各コントロールは bp 対応の**決定的 Tailwind 編集**（ライブプレビュー→「適用」で実ソース／HMR 即時）。多義 prefix(text-/font-/border-/rounded-)は色/サイズ/方向/階調を取り違えない専用ストリップで分離。
  - **Claudeに頼む**: 複雑な構造/文言は「キューに追加」→「Claudeへ送る」→ Claude Code 側で「キュー処理して」。
- **移動(⇅)**: 要素をドラッグして別要素の上にドロップ → **兄弟順 or 別親への移動(reparent)を決定的に**確定。**ドラッグ中、表示端でカーソルを止めると自動スクロール**。
- **戻る/進む**: ツールバーの ↶ ↷、または **⌘Z / ⌘⇧Z（Ctrl+Z / Ctrl+Y）**。daemon が編集前後スナップショットで undo/redo。テキスト入力中は OS ネイティブ undo を優先。外部(Claude/手編集)で変わっていたら潰さず警告。

`/apply-style` `/reorder` `/delete` `/duplicate` `/undo` `/redo` はいずれも className 一意特定時のみの純コード操作（移動だけ移動先 1 行目のインデントを合わせる best-effort）。

`/apply-style`・`/reorder` はいずれも **className を一意特定できた時だけ決定的に書き換え**（複数一致/動的 class/兄弟でない 等は安全側で拒否 → Claude 経路へ誘導）。`/reorder` は @babel/parser で各要素の正確なソース範囲を取り、要素テキストを元の空白スロットに入れ替える純文字列操作（整形保持・LLM 不介在）。

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
- ~~Phase B.2: フォントサイズ/色ピッカー、レスポンシブ別（bp 切替で md: 等）の編集~~（済）
- ~~Phase C slice1: ドラッグで兄弟並べ替え（AST で決定的・Claude 不介在）~~（済）
- ~~Phase C 続き: 複製/削除/別親への移動(reparent) も決定的 AST 操作で（Claude 不介在）~~（済）
- ~~戻る/進む: daemon 編集履歴で undo/redo（↶↷ボタン・⌘Z/⌘⇧Z・Ctrl+Z/Ctrl+Y）~~（済）
- ~~UI を STUDIO 風（右ドック・ダーク・SVG アイコン・セクション分けインスペクタ）に~~（済）
- ~~D&D 中の自動スクロール（表示端で）~~（済）
- 構造編集はこれで一通り（並べ替え/reparent/複製/削除）。さらに要素の新規追加が要れば「Claudeに頼む」経路で（自由形のため非決定的でよい領域）
- Onlook 評価メモ: self-host は Supabase+Docker+CodeSandbox 必須・ローカル NodeFs は未配線・OSS は過渡期。「ローカル直編集 D&D」目的には重く不適合のため自作（決定的 reorder）を採用
- 既知の制限: フォントサイズ stepper は Tailwind 名前付きサイズ(text-lg 等)を対象。`text-[clamp(..)]` 等の arbitrary 値は className エディタで直接編集。色は arbitrary hex(`text-[#..]`)で付与（同 bp の既存色のみ除去）。
