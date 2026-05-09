# セッション振り返り: madoguchi.inc 解析→Hidamari Lab. LP→portfolio 組込み

**日時**: 2026-04-30 10:30 頃終了
**対象**: madoguchi.inc の表現技法解析 → Hidamari Lab. サンプル LP 実装 → portfolio に実績1番目で組込み → 「← INDEX」サンプルバー追加 → sample-site-onboarding.md スキル化

## 1. 良かった点

- **解析→解説→実装の三段構え**: madoguchi.inc を Playwright で DOM/CSS/JS まで観察し、12 技法に分解してユーザーに先に提示してから、自分のサンプルに落とし込んだ。「何が起きてるか教えて」要望に対する応答順序が機能した。
- **修正前の選択肢提示が機能**: FV2「左寄りすぎ」に対して修正案を 4 つ番号付きで提示 → ユーザーが「3 で」と即決。FV3 もジグザグ→階段の 2 ターンで合意形成。
- **スキル化への即時昇格**: INDEX ボタン忘れがユーザー指摘で発覚した瞬間、`sample-site-onboarding.md` 作成 + CLAUDE.md ルーティング追加 + system-engineer 参照スキル表反映まで同セッション内で完結。
- **memory 既存ルールを最初から踏襲**: frontend-design 起動・mobile-first・実機 3 breakpoint 確認・孤児改行禁止・visual diff、これらを後付けではなく最初から計画に組み込んだ。

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | Playwright `Browser is already in use` | 古い playwright-mcp プロセス 2 個 + Chrome SingletonLock 残留 | セッション冒頭で `pgrep playwright-mcp` 確認 | 起動失敗時は ps/ロックを 1 回で同時調査（私は close → resize で 2 回失敗してから整理した） |
| 2 | ScrollTrigger pin で sv が scrollY 836 に来てレイアウト崩壊 | `.hero { height: 100vh }` を CSS 固定したため pin spacer が潰れた | `pinSpacing: true` の場合、trigger 要素に高さを書かない | catalog 8 のハマりどころに記録済 → 次回再発防止済 |
| 3 | `.sv__head > *` SVG 巻き込みで余白積算 | `> *` に `position: relative` を当てたら背景装飾 SVG（`position: absolute; height: 100%`）が上書きされ normal flow に乗った | `> *` に副作用ある宣言を当てる時に「子に SVG/pseudo がいるか」を確認 | ユーザー指摘まで気付けず（CSS 詳細度の罠を見落とし） |
| 4 | FV1 コピーが初回スクショで「見えない」 | フォントロード前 + reveal 進行中 = FOIT で視覚的に空白 | アニメ付き LP は `document.fonts.ready` + 3s 以上 wait をデフォルト化 | reveal アニメが絡むなら state evaluate で is-on を確認してから再撮影 |
| 5 | INDEX ボタン忘れ（portfolio 組込み時） | 静的サンプル ≠ React Router page の戻り導線差を意識せず | 過去前例（Linear.jsx の `Link to="/"`）を「同等機能を静的でも実装する」要件として最初から拾うべき | 解決済（スキル化）✓ |
| 6 | scene1 が scene 2/3 でも消えない | `.hero__scene--1 { opacity: 1 }` を CSS で固定 | 「シーン切替は JS 一元管理」と決めたら CSS 側に同等の固定値を書かない | catalog 8 のハマりどころに記録済 ✓ |

## 3. 自動化・効率化の余地

- **Playwright reveal 待ちヘルパー**: `fonts.ready + 3s wait + 確認用 evaluate で is-on 取得` を 1 コマンドで撮るテンプレ。
- **`> *` セレクタの罠**: lint 化は難しいが、CSS 書き始め時のヘッダ確認チェックリストに入れる。
- **Chrome SingletonLock 残留掃除**: セッション開始時の `pgrep -af mcp-chrome` ワンライナー検討。

## 4. 次回への改善提案

1. **`> *` セレクタ + SVG/pseudo 同居 → 即 `:not(svg):not(::before):not(::after)` 化**を CSS 書き始め時の自動チェックリスト項目に。
2. **アニメ付きLP のスクショ前は fonts.ready + 3s 待機 → state evaluate** のテンプレ化。
3. **portfolio 組込みは新スキル `sample-site-onboarding.md` を最初に Read** することを system-engineer の参照スキル表に明記（実装済み）。
4. **Playwright session 開始時のゴミ掃除**: `pgrep -af "mcp-chrome|playwright-mcp"` で残骸検出 → 事前 kill。

## 5. 反映実装（全件 SAFE+RISKY 承認済）

| 種別 | 反映先 | 内容 |
|---|---|---|
| memory | `feedback_css_descendant_svg.md`（新規） | `> *` セレクタは SVG / pseudo を巻き込む。`:not(svg)` を最初から |
| memory | `feedback_playwright_animation_screenshot.md`（新規） | reveal 含む LP は fonts.ready + 3s + state evaluate で確認してから撮影 |
| memory index | `MEMORY.md` | 上記 2 件のリンク追加 |
| improvement-log | `data/improvement-log.jsonl` | 本セッションのレコード 1 件追加 |
| CLAUDE.md | スキル一覧 #26 + ルーティング表 | 既に sample-site-onboarding 追加済（前段で実装） |
| エージェント定義 | `.claude/agents/dev-automation/system-engineer.md` | 参照スキル表に `lp-optimization-playbook` / `vercel-team-deploy-checklist` / `sample-site-onboarding` を必須参照として追加 |
| 新規スキル | `.claude/skills/sample-site-onboarding.md` | 9 ステップの portfolio 組込みプロトコル（前段で実装済） |
| 参考実装 | `outputs/lp-experiments/madoguchi-study/` | Hidamari Lab. LP（INDEX バー前後の両形式が portfolio 側に） |
| 公開 | `portfolio/public/hidamari/` + `WORK_DETAILS` | push 済（d3ad631 + 2f27362） |

## 関連 commit

- portfolio `d3ad631`: works: Hidamari Lab. サンプルLP を実績1番目に追加
- portfolio `2f27362`: hidamari: 左上に「← INDEX」サンプルバー追加
