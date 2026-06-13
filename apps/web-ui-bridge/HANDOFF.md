# web-ui-bridge — 引き継ぎ（2026-06-14 時点）

> 動いている実 Next.js+Tailwind サイト上に dev 限定 overlay を注入し、要素をクリック/ドラッグして
> **決定的に実コードを編集**（className literal 置換 / @babel/parser の AST 範囲入替）。複雑な構造・
> 文言は「Claudeに頼む」キュー経由で Claude Code に橋渡し。**コードが正（source of truth）**。
> UI は STUDIO（app.studio.design）を参照に寄せた**右ドック・ライトインスペクタ**。

## 現状: 主要機能は出荷済み（PR #195–204・全て main マージ済み）
- Phase 0: クリック→Claude プロンプト橋渡し（queue 経由）
- Phase B / B.2: 直接調整（余白/詰め/サイズ/揃え/色/className、bp 全/sm/md/lg/xl 別）
- Phase C: 構造編集（ドラッグ並べ替え / 別親移動 reparent / 複製 / 削除）— AST 決定的
- undo/redo: ↶↷ ボタン＋⌘Z/⌘⇧Z・Ctrl+Z/Ctrl+Y。**履歴とトークンを永続化**（daemon 再起動でも有効）
- STUDIO 風タブ式インスペクタ（テキスト/ボックス/変形/設定）＋実機 devtools 計測で**ライト配色**
- セキュリティ硬化（127.0.0.1 のみ・Origin+token・path traversal 防御・token 0o600）
- **STUDIO 95% パリティ詰め（2026-06-14・実機再計測）**:
  - マージン/パディングを STUDIO 型 **ボックスウィジェット**（ロックトグル＋単一/2×2の4辺入力・↑→↓←方向アイコン）に。STUDIO 実機は「ネスト矩形図」でなく **2×2グリッド＋方向アイコン＋ロックトグル**だった（計測で判明）。表示は className優先→computed フォールバックで実効px（`p-4`/`px-6 py-4` 等のスケール・軸クラスも正しく px 表示）、書込は px arbitrary で **4辺ロスレス再構成**（軸 strip 時に直交辺を保全）、不一致集約は warn toast
  - **条件スタイル＝状態（通常/ホバー）**: インスペクタ右上の状態セグメント。`PFX()=bp+state` 合成で全プロパティが `hover:`（bp併用 `md:hover:`）を読み書き。通常↔hover は相互破壊しない
  - 実機実測でピクセル合わせ込み（入力セル #f7f7f7・角丸8px・高32px / タブ14px/40px / color swatch 24px / section 左16px）
  - 実装は **Codex(gpt-5.5 high) 委任**＋Claude 設計/レビュー(code-reviewer・silent-failure-hunter)/実機 chrome-devtools 検証。全操作を実ブラウザで実操作確認済み（py-2→8px 読み・1辺編集の直交辺保全・hover分離・集約 warn）

## 構成
- **overlay** `apps/web-ui-bridge/overlay/overlay.js`: 自己完結 vanilla JS・Shadow DOM 隔離・SVG アイコン・daemon が origin/token を埋めて配信。
- **daemon** `apps/web-ui-bridge/daemon/server.mjs`: Node http(:7331)。`/overlay.js` `/enqueue` `/apply-style` `/reorder` `/delete` `/duplicate` `/undo` `/redo` `/health`。依存 `@babel/parser`（reorder.mjs の AST 用）。
- **reorder.mjs**: `moveInSource`/`deleteInSource`/`duplicateInSource`（決定的・整形保持・単体 `reorder.test.mjs` 17/17）。
- **skill** `.claude/skills/web-ui-bridge/SKILL.md`: queue を読み実ソースへ反映（「キュー処理して」）。
- **対象サイト**: `app/layout.tsx` の `</body>` 直前に dev 限定 `<script src="http://localhost:7331/overlay.js" async>` 1行。
- **永続ファイル（target 配下・gitignore 済）**: `.claude-ui-queue.jsonl` / `.web-ui-bridge-history.json` / `.web-ui-bridge-token`。

## 起動手順
```bash
# 初回のみ daemon 依存
cd apps/web-ui-bridge/daemon && npm install && cd -
# daemon（対象サイトを --target）
node apps/web-ui-bridge/daemon/server.mjs --target outputs/clients/terra-isshiki/site
# 対象サイト dev（注入1行は導入済み）
cd outputs/clients/terra-isshiki/site && npm run dev   # → localhost:3001（3000 使用中なら 3001）
```
ブラウザで開く → 右ドックのインスペクタ。選択=カーソル / 移動=⇅ / 戻る進む=↶↷。

パイロット = **terra葉山 HP**（`outputs/clients/terra-isshiki/site/` Next16+React19+Tailwind v4）。

## 設計の要点（壊さないこと）
- **全編集は決定的（Claude 不介在）**。className を一意特定できた時だけ実行し、複数一致/動的class/兄弟でない等は**安全側で拒否して「Claudeに頼む」経路へ誘導**。陸さんは非決定的（プロンプト→Claude）を嫌う。
- 多義 prefix（`text-`/`font-`/`border-`/`rounded-`）は色/サイズ/方向別/階調を取り違えない**専用ストリップ**。`VAL` のバレア値はハイフン無し（`border-red-500` 等の巻き込み防止）。
- Spike0: React19 は fiber に file:line 無・App Router の Server Component は名前が出ない → **file:line/component に依存しない**。
- 色は STUDIO 実機（ライト）: 白#fff / 文字#1a1a1a / 罫線 rgba(34,34,34,.1)・#e5e5e5 / アクセント#222 / 選択ハイライトのみ青。

## 残作業（次セッション）
- 旧残作業①②④は 2026-06-14 に完了（上記「現状」参照）。①の「4辺＋図」は実機計測の結果「2×2グリッド＋方向アイコン＋ロックトグル」が正だった。
- ③ 下部中央 bp バー位置・AI(✨) は **別物として再現しない**（我々は右ドック overlay＝キャンバスが実サイトそのもの。bp は右ドックのセグメントで足り、✨AI は Claude 経路が担う）。bp セグメントの配色/高さの微調整のみ実施済み。
- **hover 以外の状態**（アニメーション/出現時/スクロール）は STUDIO にあるが当面スコープ外（必要時に state を拡張可能な作りにはなっている）。
- 既存課題（このセッションでは未対応）: 幅/高さ/角丸/枠線の数値も `numOf(readUtil)` で **スケールクラスを px と誤読**する（spacing と同じ問題が pre-existing で残存）。spacing と同様の className優先→computed ハイブリッド読みに揃えると一貫する。
- 要素の**新規追加**（STUDIO の追加パレット相当）は自由形＝「Claudeに頼む」経路で。
- arbitrary 値（`pt-[20px]` 等）の **live プレビューは Tailwind dev が未生成のため即時反映されない**（commit→HMR で反映）。入力値表示は className 優先読みで保持されるので消えはしない。

## 検証の作法（必須）
ユーザーが取りうる操作は**全て実機ブラウザで実操作＋スクショ目視**で検証（D&D の実ドラッグ・別親移動・オートスクロール・再起動後 undo・壊れた後の復帰まで）。dispatch 成功や DOM count では不足。`reorder.test.mjs` も緑に保つ。

## 運用上の注意
- **同一機能の反復改善は worktree を使い回す**（増分ごとに新 worktree を切らない／merge 後 `git pull origin main` で同期）。今回 9 worktree＋terra 6回 reinstall の重複コストの反省。
- worktree×Next16 Turbopack×next/font で dev が 500（font 解決不可）になったら、対象サイトで `rm -rf node_modules .next package-lock.json && npm install`。
- daemon 再起動でトークンは同一（永続）なので開いたままのページも編集継続可。

## 参照
- 機能カタログ＆STUDIO 再現可否: [`STUDIO-PARITY.md`](./STUDIO-PARITY.md)
- 使い方詳細: [`README.md`](./README.md)
- recall: memory `project_web_ui_bridge` / 振り返り: `outputs/retrospectives/2026-06-14-web-ui-bridge-studio.md`
