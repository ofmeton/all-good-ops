# セッション振り返り — Anthropic 公式リサーチ → all-good-ops 反映

- 日時: 2026-06-05 21:47
- 対象: Anthropic 公式情報のディープリサーチ → リポジトリ反映（Track A 横断22スキルの SKILL.md 化 / Track B 公式原則畳み込み / Track C2 pre-commit ガード復旧 / Track C1 plugin化の先送り決定）。PR #94 merged。
- 関連: [[../../wiki/self/engineering-principles]] 原則6 / memory feedback_local_skill_invocation 更新 / project_skill_plugin_token_deferral 新規。

## 0. 事実情報の raw 保存漏れチェック
セッション中のユーザー発話は作業指示・方針選択・メタ判断が中心。新たに「**monetize-os・ai-radar 廃止**」の状況事実が出たため `raw/facts/situations/2026-06-05-monetize-os-airadar-discontinued.md` に保存（振り返り時補完）。他に保存対象なし。

## 1. 良かった点
- **照合してから動いた**: 公式一次情報を並列取得し Explore で現状棚卸し → 「乖離は実質1点」と的を絞った。やみくもに変えなかった。
- **観察を証拠化**: 「frontmatter があっても flat .md はスキル一覧に出ない」を“ディレクトリ形式必須”の決定的証拠に使った（推測でなく実測）。
- **assert 前に evidence**: マージ後に system-reminder へ22個が出現したのをライブ検証してから「成功」と言った。
- **迎合せず矛盾を指摘**: 「目的=トークン節約」に対し plugin 共有案がむしろトークン増になる矛盾を指摘して方針転換。
- **制約に気づいた**: 予約語（name に claude/anthropic 不可）で2スキルを変換対象から除外。

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | perl 一括置換が2回 no-op | double-quote の perl `-pe "...$ENV{ALT}..."` でシェルが `$ENV` を展開し正規表現が空に | 一括適用→確認で2回空振り | 複数ファイル置換は最初に1ファイル試験→diff確認してから全適用（3回目でやっと実施） |
| 2 | 最初の perl にsyntax error の捨て行が混入し無音 | 使い捨てワンライナーに `2>/dev/null` を付けエラーを握り潰した | エラーが出ていれば即気づけた | 使い捨てでも `2>/dev/null` でエラー握り潰さない |
| 3 | plugin化の計画が前提崩れ | spoke repo の path 実在を計画時に未確認（monetize-os/ai-radar 不在） | 実装直前の探索で発覚 | 外部 path 前提の計画は執筆前に実在確認 |
| 4 | git mv 後の陳腐化参照を後追い修正 | 移動時に参照更新をセットで考えていなかった | 多数の `<name>.md` 参照が残存 | mv と同時に repo 全 grep で参照修正を同一作業に含める |

## 3. 自動化・効率化の余地
- 「bash で複数ファイル正規表現置換」を3回以上実施 → 「1ファイル試験→diff→全適用」＋ perl env 展開の罠を型化（memory feedback で十分、skill 化は過剰）。
- ファイル移動時の参照追従（grep→修正）も同型の定石。

## 4. 次回への改善提案
1. 次回 sed/perl で複数ファイル一括置換する時は、まず1ファイルで実行し diff を確認してから全適用する。
2. 使い捨てワンライナーでも `2>/dev/null` を付けない（syntax error が無音化した）。
3. 外部リポ path を前提に計画を書く時は、計画執筆前に `ls`/`git -C` で実在確認する。
4. `git mv` 後は移動前パスへの参照を repo 全 grep して同一作業内で修正する。

## 5. 反映先（本振り返りで実施）
SAFE:
- memory 新規: `feedback_bash_bulk_replace_one_file_first` / `feedback_git_mv_update_references`
- memory 更新: `feedback_session_retrospective`（「先に Read」→ スキル発動）/ MEMORY.md index
- improvement-log 追記
RISKY（承認済）:
- CLAUDE.md 外部スポークから monetize-os・ai-radar 除去（廃止）/ はぐりん委譲先を「保留」に修正
- 未解決: はぐりん persona の収益化運用方針（monetize-os 廃止で委譲先消失）→ 戦略再判断は別途。
