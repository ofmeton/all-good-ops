# web-ui-bridge 複数選択 設計書（2026-06-14）

> overlay で複数要素を選び、1操作で「まとめてプロンプト／D&D移動／スタイル一括編集／複製・削除」を行えるようにする。
> 既存の単一選択フロー（PR#195–206）を壊さず拡張する。**全編集は決定的（Claude 不介在）**を維持し、
> 決定的にできない選択だけ安全側で「Claudeに頼む」経路へ自動ルーティングする。

## 1. 背景・目的

陸さんの要望（原文）:
> 複数選択できるようにできないかな・シーンとしては D&D でまとめて移動したいとか、まとめて選択してプロンプト書きたいとか

現状 overlay は単一選択（`selected` / `selectedEl` 1個）。複数要素を扱う手段が無く、同じ調整を N 個に当てる／まとめて並べ替える／まとめて Claude に投げる、ができない。

## 2. 確定要件（ブレスト合意）

| # | 決定事項 | 内容 |
|---|---|---|
| R1 | アクション4種 | ①まとめてプロンプト（Claude）②まとめて D&D 移動 ③まとめてスタイル一括編集 ④まとめて複製/削除 — **全て対象** |
| R2 | D&D 対象 | 隣接兄弟も散らばりも**両方ありうる** → 同一親なら決定的 AST、別親が混ざれば Claude 経路に**自動ルーティング** |
| R3 | 選択操作 | **修飾クリック**: 素クリック=単一選択（置換）、⌘ or Shift+クリック=選択へ追加/解除（トグル） |
| R4 | 値の不一致表示 | **ハイブリッド**: 不一致は空欄＋「—」表示。絶対値を打てば全要素へ一律適用／± ステッパなら各要素の現在値から相対増減。両立 |
| R5 | インスペクタ挙動 | 複数選択中は**共通操作のみ有効化**。不可操作はグレーアウト＋理由ツールチップ |
| 方針 | 適用機構 | **案B: アトミック・バッチ endpoint**（daemon が一括適用＝1操作=1 undo）。naive ループは undo 分裂・D&D 範囲ズレで不可 |

## 3. 既存実装の前提（グラウンド済み）

- **overlay.js**(817行): `let selected=null, selectedEl=null; sourceClass, liveClass, bp, state, tab; marginLocked, paddingLocked`。`collect(el)` が `{route, selector, text, classes, ...}` を返す。`post(endpoint, body)` がトークン付き POST。
- **クリック選択**(L791): `selectedEl=e.target; selected=collect(...); sourceClass=liveClass=selected.classes; state=""; locks=null`。
- **daemon**(server.mjs 389行): className **リテラル特定**で実ソース編集。`/apply-style`(route+oldClassName→newClassName)・`/reorder`(route+dragClass+targetClass+position)・`/delete` `/duplicate`(route+targetClass)・`/enqueue`(items[])・`/undo` `/redo`。書込は `recordedWrite` で**1書込=1履歴**。
- **reorder.mjs**(186行): `moveInSource`(同親=スロット入替/別親=reparent/祖先子孫=nested拒否)・`deleteInSource`・`duplicateInSource`。className で**ただ1つ**特定（0/複数=理由付き失敗）。
- **特定方式の含意**: 要素は className リテラルで一意特定。**複数選択でも各要素の className が一意なら個別に特定可能**。重複 className の要素が混ざれば従来通り ambiguous で Claude 経路。

## 4. 状態モデルの拡張

単一 `selected` を**選択配列**へ。後方互換のため「単一選択時は従来と同じ表示・挙動」を保つ。

```js
// 旧: let selected = null, selectedEl = null;
let selection = [];      // [{ el, payload, sourceClass, liveClass }]  ※選択順を保持
let primaryIdx = -1;     // 最後にクリックした要素=値表示の基準（mixed判定の代表）
```

- `bp` / `state` / `tab` / `marginLocked` / `paddingLocked` は**UI グローバル**のまま（全選択に同じ bp/state で適用）。
- 各要素ごとに `sourceClass`（ソース現値）と `liveClass`（編集中値）を**個別保持**（要素ごとに className が違うため）。
- 互換 getter: `const selected = selection[primaryIdx]?.payload ?? null` 相当のアクセスを噛ませ、単一前提のコードを最小改修。
- `closePanel()` は `selection=[]; primaryIdx=-1` にリセット。

## 5. 選択 UI（修飾クリック）

クリックハンドラ（capture）を分岐:

| 操作 | 挙動 |
|---|---|
| 素クリック | `selection=[新規]`（置換）・`primaryIdx=0` |
| ⌘ or Shift+クリック | 既に居れば**除去**、居なければ**追加**。`primaryIdx=新要素` |
| 既選択要素を素クリック | 単一化（その要素だけに絞る） |
| 空白/overlay 外クリック | 維持（誤解除しない） |

- **ハイライト**: 選択中の全要素に枠。primary は濃い青、他は半透明青。ホバーハイライトは従来通り別色。
- **インスペクタヘッダ**: `N 個選択中`（N≥2）。1個なら従来のタグ/class 表示。
- **解除**: ヘッダの各チップ「×」で個別解除、`Esc` で全解除。

## 6. アクション別ルーティング表（中核）

| アクション | 決定的に実行できる条件 | 決定的経路 | フォールバック |
|---|---|---|---|
| ③スタイル一括編集 | 各要素の className が一意特定可 | `/apply-style-batch`（後述）で**全要素を1書込で適用** | 一意特定不可の要素のみ警告。残りは適用、特定不可は Claude 経路の案内 |
| ④複製/削除 | 各要素の className が一意 | `/structure-batch`（kind=duplicate/delete を要素配列で・**範囲降順で適用**） | 同上 |
| ②D&D 移動 | **全選択が同一親**かつ非ネスト | `/reorder-group`（後述・グループを相対順保って移動） | 別親が混在 → 「まとめて Claude 移動」プロンプトを enqueue |
| ①まとめてプロンプト | 常に可（自由形） | — | `/enqueue` に**複数 payload を1アイテム**で送る（`payloads:[...]`） |

**R5 の有効/無効判定**（インスペクタが選択変化時に再計算）:
- 同一親判定 `allSameParent(selection)` が false → ⇅（決定移動）をグレーアウト、ツールチップ「親が異なるため決定移動不可。『まとめて Claude 移動』を使ってください」。
- いずれかの className が空/動的 → スタイル一括・複製削除ボタンに注記「一部は Claude 経路」。

## 7. daemon API（バッチ endpoint）

すべて**1書込=1履歴**（`recordedWrite` を1回だけ呼ぶ）で原子性と単一 undo を担保。各要素の編集は**同一ファイル内のソース範囲操作をまとめて適用**。

### 7.1 `/apply-style-batch`
```jsonc
// req
{ "route": "/", "edits": [ { "oldClassName": "...", "newClassName": "...", "selector": "...", "text": "..." }, ... ] }
// res
{ "ok": true, "file": "app/page.tsx", "applied": 3, "skipped": [ { "oldClassName": "...", "reason": "ambiguous" } ] }
```
- 各 edit を className リテラルで特定→置換。**全 edit を1回の文字列操作で適用**（範囲を集めて降順ソート→一括 splice。`reorder.mjs` の edits パターンに倣う）。
- 1個でも `ambiguous`/`not-found` の edit は**その edit だけ skip**し `skipped[]` に積む（他は適用）。全 skip なら `changed:false`。
- 同一 className が複数 edit に跨る/重なる場合は安全側で skip（誤爆防止）。

### 7.2 `/structure-batch`
```jsonc
{ "route": "/", "kind": "delete" | "duplicate", "targets": ["classA", "classB", ...] }
```
- `deleteInSource`/`duplicateInSource` の**範囲計算を全 target 分まとめて行い、ソース末尾側（offset 大）から順に適用**（前方の編集が後方範囲をズラさない）。
- delete は行ごと削除、duplicate は各々を直後に複製。1書込=1 undo。

### 7.3 `/reorder-group`
```jsonc
{ "route": "/", "dragClasses": ["a","b","c"], "targetClass": "dest", "position": "before"|"after" }
```
- `reorder.mjs` に新規 `moveGroupInSource(src, dragClasses, targetClass, position)`（§8）。
- 失敗理由: `not-same-parent`（呼び出し側で事前判定するが daemon でも防御）/ `nested` / `ambiguous` / `target-in-group`（移動先が選択内）。

### 7.4 `/enqueue` 拡張
- 既存 items の各要素に `payloads?: [...]`（複数 locator）を許可。skill 側は payload 単数/複数の両対応。
- overlay の `send()` は複数選択時 `{ ...primaryPayload, payloads: selection.map(s=>s.payload), prompt }` を送る。

## 8. reorder.mjs 拡張: `moveGroupInSource`

naive ループ不可の理由＝1要素移動で他要素の `start/end` が無効化。**グループを一度に**扱う:

```
moveGroupInSource(src, dragClasses[], targetClass, position):
  - load(src) で all/parentOf
  - 各 dragClass を unique() 特定（1個でも失敗→ {ok:false, reason}）
  - target を unique() 特定
  - 検証: target が dragClasses に含まれない / 全 dragEl が同一親 / target も同じ親（同親移動）
          もしくは全 dragEl が同一親 X かつ target は別親 Y（=グループ reparent）
          いずれでもなければ {ok:false, reason:"not-same-parent"} → 呼び出し側で Claude 経路
  - 非ネスト検証（target が group 要素の子孫/祖先でない）
  - 同親移動: children の JSXElement 順序配列から dragEls を抜き、target の before/after に
              **選択順(dragClasses の順)を保って挿入** → 既存 moveInSource と同じ「空白スロット保持の region 再構成」
  - 別親 reparent: 各 dragEl の lineRange を集め降順削除、target 位置へ
              選択順に indent 付きで連結挿入（既存 reparent ロジックの複数版）
  - 決定的・同入力同出力
```

`moveInSource`（単数）は `moveGroupInSource(src,[drag],...)` のラッパへ寄せられるが、**既存17テストを壊さないため単数実装は据え置き**、group は別関数で追加（共有ヘルパ `lineRange/indentBefore/unique/isAncestor` は再利用）。

## 9. 値の不一致表示（R4 ハイブリッド）

スタイル各コントロールの値読みを「選択横断」に:
```
readAcross(prop): 各要素の現値(px/enum)を readSpacingPx 等で集める
  → 全一致なら その値を表示
  → 不一致なら "" + placeholder "—"（mixed フラグ）
```
- **絶対入力**（数値セルに打って Enter / picker 確定）: 全要素へその絶対値を `/apply-style-batch` で一律適用。
- **± ステッパ**: 各要素の**現値から相対増減**（mixed を保ったまま全体を ±step）。各要素で新 className を計算しバッチ送信。
- enum 系（揃え/位置/フォント等）も同様: 不一致は「—」、選ぶと全要素へ適用。
- spacing は既存の「className優先→computed フォールバック」読みを要素ごとに使う。

## 10. テスト計画

- **reorder.test.mjs に追加**（既存17は不変）:
  - group 同親移動: 3要素を相対順保って target before/after へ。整形保持。再 parse 可能。
  - group reparent: 別親へ3要素、順序保持、構文妥当。
  - 異常系: not-same-parent / nested / target-in-group / ambiguous それぞれ `ok:false`。
- **batch endpoint 単体**（daemon に最小テスト or tsx 手動）: apply-style-batch の部分 skip、structure-batch の降順適用で範囲不整合が出ないこと。
- **実機ブラウザ検証（必須・feedback_browser_test_all_user_ops）**: terra 葉山で
  ⌘/Shift 選択の追加解除・ハイライト → 一括 spacing（mixed→揃え／±相対）→ まとめて複製/削除 → 同親 D&D group 移動 → 別親混在で Claude 経路フォールバック → まとめてプロンプト送信 → **各操作後 undo 1回で完全復帰**。スクショ目視。

## 11. 非スコープ / リスク

- **非スコープ**: 異なるルート（ページ）跨ぎの複数選択（同一 route 前提）。グループの入れ子並べ替え。選択の保存/名前付け。
- **リスク**:
  - 同一 className が複数要素に存在する選択 → 個別特定不可。既存の ambiguous 挙動で安全に Claude 経路へ（誤爆させない）。
  - バッチ部分失敗の UX: `skipped[]` を toast で明示（「3件中1件は Claude 経路」）。サイレント脱落を作らない（feedback_validate_llm_external_output / known_bug_no_defer）。
  - undo 原子性: 必ず `recordedWrite` 1回。途中例外時は書込前に全範囲計算を完了してから一括適用（部分適用を残さない）。

## 12. フェーズ分割（実装＝Codex 委任、Claude 設計/レビュー/実機検証）

1. **状態モデル＆選択 UI**: selection 配列化・修飾クリック・複数ハイライト・ヘッダ・有効/無効判定。単一選択の回帰なし。
2. **①まとめてプロンプト**: `/enqueue` payloads 拡張＋skill 複数対応。最小で価値が出る。
3. **④複製/削除バッチ**: `/structure-batch`＋降順適用。
4. **③スタイル一括＋mixed 表示**: `/apply-style-batch`＋readAcross＋絶対/相対。
5. **②D&D group 移動**: `moveGroupInSource`＋`/reorder-group`＋同一親ルーティング＋Claude フォールバック。
6. **検証**: reorder.test 追加・実機全操作・undo 1回復帰。STUDIO-PARITY.md / HANDOFF.md / memory 更新。

各フェーズで `reorder.test.mjs` を緑に保ち、実機ブラウザ＋スクショで検証してからマージ。
