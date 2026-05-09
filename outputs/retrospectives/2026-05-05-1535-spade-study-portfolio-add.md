# Retrospective — spade-study 日本語化 → portfolio 統合

- 日時: 2026-05-05 15:35 JST
- 対象セッション: spade-study (outputs/lp-experiments/spade-study/) の日本語化、ポートフォリオへの組み込み（2番目）、INDEX バー追加、push までの一連
- 関連 commit: portfolio `73f0727` works: MERIDIAN ... 追加 / `7fed9e7` spade-study: ← INDEX バー追加

## セッション概要

1. ポートフォリオに載せられそうな自作サイトの棚卸し（メモリ＋portfolio リポジトリ調査）
2. spade-study を選定 → 日本語化を依頼される
3. 日本語化を3ターン繰り返し（直訳調 → 気取った再設計 → 具体性優先）でユーザー意図に着地
4. 訴求軸を「動きのあるWebデザインができる」に振り直し、Capabilities 4分類を Web 表現語彙に再構成
5. 「ちゃんと」NG / 「賢そう・信頼感」基準は撤回、で再修正
6. CTA タイトルが超ワイドで折り返し → font-size + nowrap で対応
7. portfolio に組み込み（2番目に挿入、CSS w5 span2→3、.thumb.f 追加、サムネ生成）
8. モーダルにサムネ出ない（ファイル名不一致）+ vite dev SPA fallback で `/spade-study/` 空白、を順次解決
9. 2560px で hero タイトル改行 → nowrap+mobile normal の3段構え
10. cap グリッド左寄り + モバイル CTA ボタン見切れ → margin-inline auto + mobile media
11. push 完了
12. INDEX バー漏れ指摘 → 追加 push

## 1. 良かった点

- メモリ「Vercel team は認可外 git author email」を事前確認し、`work.ofmeton@gmail.com` 一致を確認してから push、無事に通った
- portfolio 既存構造（WORK_DETAILS / w0..w5 / thumbClass / vercel.json rewrites）を grep で網羅的に把握してからリナンバー＋CSS整合を実施し、レイアウト崩れを起こさなかった
- vite dev の `/spade-study/` 空白問題で curl による切り分け（HTML中身=React HMR 挿入済 → SPA fallback）→ `/index.html` 明示+判定ロジック拡張、を素早く確定できた
- INDEX バー追加時に hidamari の `.sb` 系CSSを参照し、フォント変数（`--f-en` / `--f-jp`）が spade 側に存在しないことを見抜いて具体フォント名に置換した

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | 日本語化で 3 ターン消費（直訳→気取った→具体性） | 最初の翻訳は英語直訳調＋抽象詩的に振り、ユーザーの「平易さ・具体性」期待値を把握しないまま提出 | 「日本語化」と聞いた時点で複数トーン案を並列提示できた | 最初に「直訳/再設計/平易」3案を並べ、トーン選択を1ターンで確定 |
| 2 | 「ちゃんと」を採用→ NG | 「気取らない」指示の反動で口語に振りすぎ。**現在 conversion-designer.md にコピー文体規定が無い**ため判断基準が場当たり的 | 文体規定の所在を毎回最初に確認 | conversion-designer.md にコピー文体規定を入れて恒久化（→ 今回反映） |
| 3 | サムネファイル名不一致（spade.jpg vs spade-study.jpg） | WorkModal が `/samples/${workId}.jpg` 規約。workId='spade' に対し `spade-study.jpg` で保存 | サムネ保存前に既存命名規則を grep するべき | スクショ命名は `${workId}.jpg` 固定で確定してから撮る（→ sample-site-onboarding.md に追記） |
| 4 | `/spade-study/` で空白（vite dev） | vite dev が trailing-slash サブディレクトリを SPA fallback。本番Vercelとは挙動差 | ファイル配置直後に `curl /spade-study/` で 200+本物配信を確認すべき | 配置完了 → 手元 curl 検証 → 結果ユーザーに渡す（→ sample-site-onboarding.md に追記） |
| 5 | INDEX バー漏れ | hidamari の直近 commit `2f27362 hidamari: 左上に「← INDEX」サンプルバー追加` を git log で見ていたのに、spade 配置時に組み込み忘れ。**sample-site-onboarding.md スキル本体にも明記済だったが、そもそもスキルを Read していなかった** | git log 直近コミットを ToDo 化、かつスキル本体を Read してから着手 | 関連リポジトリの直近 commit から「型化された付帯要素」をチェックリスト化 |
| 6 | cap グリッド左寄り | `max-width: 1280px` 入れたが `margin-inline: auto` 忘れ | max-width 追加時の定型ペアを徹底 | `max-width` を書いたら自動で `margin-inline: auto` をセットで書く規約 |
| 7 | モバイル CTA ボタン見切れ | hero タイトルでやった「nowrap+mobile normal」3段構えを CTA ボタンラベルにも適用すべきだった | 大型見出し系を一括チェック | 日本語見出しは hero/section/CTA 全部位を初回に同時設計 |

## 3. 自動化・効率化の余地

- **portfolio に新サンプル追加する手順**は完全に型化済（sample-site-onboarding.md）。**今回の真の問題はスキルを Read しなかったこと**。スキル参照そのものを徹底する仕組みが欲しい
- **vite dev の SPA fallback 検出**: ファイル配置→curl で 200 + Content-Type=text/html だが中身が SPA、を即座に弾く検証スクリプト
- **コピー文体規定の不在**: 「具体性優先、抽象は最小限」を conversion-designer.md にメモ書きしておく → 今回反映

## 4. 次回への改善提案

1. **portfolio に新サンプル追加する時**: `.claude/skills/sample-site-onboarding.md` を Read すること、を最初の工程として明示。チェックリスト化
2. **サムネ生成は `/samples/${workId}.jpg` 規約で命名固定**。スクショ保存先パスを決める前に WorkModal の img src 構造を確認
3. **vite dev で `/spade-study/` 配置直後**、ユーザーに渡す前に `curl http://localhost:5173/<subdir>/ | head -3` で先頭が `<!doctype html>` の後に何が来るか確認（SPAなら `@react-refresh` が見える）
4. **CSS `max-width` を新規追加した瞬間に `margin-inline: auto` をセットで書く**規約を内面化
5. **日本語大型見出し（hero / section title / CTA タイトル / CTA ボタンラベル）**は、初回設計時に4箇所まとめて nowrap+mobile normal を適用

## 5. 反映実装ログ

### memory
- `feedback_sample_onboarding_checklist.md` 新規（workId命名 / curl検証 / hidamari直近commit確認 / max-width+margin-inline セット）
- `feedback_jp_copy_concrete_first.md` 新規（具体性優先・抽象は最小限・「賢そう・信頼感」基準は撤回）
- `feedback_vite_dev_spa_fallback.md` 新規（vite dev の SPA fallback 罠と /<subdir>/index.html 明示パターン）
- `MEMORY.md` インデックス3行追加

### improvement-log
- `data/improvement-log.jsonl` に4件追記（サムネ命名漏れ / vite dev curl 不足 / INDEX バー漏れ / 日本語コピー直訳ターン消費）

### スキル
- `.claude/skills/sample-site-onboarding.md`:
  - サムネ命名は `${workId}.jpg` 完全一致を強調
  - vite dev SPA fallback の curl 検証手順と、href を `/<slug>/index.html` 明示する対策を追記

### エージェント定義
- `.claude/agents/conversion-designer.md`:
  - 「日本語コピー文体規定（クライアント露出物全般）」セクション新設
  - 具体性優先・抽象最小限・直訳NG・気取った詩的表現NG・口語幼語NG・「賢そう信頼感」基準は撤回、を明記
