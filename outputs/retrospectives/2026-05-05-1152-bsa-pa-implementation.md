# BSA Proposal Automation Phase 1 実装セッション 振り返り

> 作成日時: 2026-05-05 11:52
> 対象セッション: BSA-PA Phase 1 (要件定義 → 4ドキュメント策定 → subagent-driven 33タスク実装 → E2E 修正 → UI redesign)
> 期間: 約 1 週間（2026-04-27 開始 → 2026-05-05 振り返り時点）

---

## サマリ

ブレインストーミング（質問攻め一気スタイル）で要件定義を高速完走 → 4 ドキュメント（要件・技調・設計・実装計画）→ subagent-driven で 33 タスク完走 → E2E で 8 件のバグを順次 fix → UI を Editorial Japanese × Operations Console で再構築。

**主要成果物**:
- `outputs/bsa/proposal-automation/` 配下に 4 ドキュメント + 完動システム
- 24+ commits on `feat/bsa-proposal-automation` ブランチ
- Python（collector + scorer）+ Node.js（generator + dashboard + notifier）+ shell scripts のマルチランタイム構成
- ダッシュボード（4 画面 + 4 API）が `localhost:3000` で動作
- E2E でデスクトップアイコン → 4件収集 → 3件提案文生成 → Gmail 送信 → ダッシュボード表示が成立

---

## 1. 良かった点

1. **「質問攻め・一気質問」要望に最初から応えた** — Q群A〜M をバッチで投げてブレストを高速完走。一問一答なら数倍の往復で済まなかった
2. **fixture を実取得 → 実セレクタを事前確認** — T6/T7 dispatch 前に grep + bs4 で `a.p-search-job-media__title` 等を実測したので、parser が一発で通った
3. **タイムゾーン問題を「数値で」特定** — `SELECT date(collected_at, 'localtime'), date('now','localtime')` を実 SQL で叩いて UTC/JST 境界ズレを5秒で確定 → fix にぶれなかった
4. **subagent dispatch を 4タスク以内のグループにまとめた** — M3 を 4 dispatch、M5 を 3 dispatch に分割。完全分離だと 17 dispatch、丸投げだと文脈過多。バランス良し
5. **UI redesign で明確な世界観（事務所の朝刊）を当てた** — フォント・配色・余白・アニメーションを連動。「色を整えました」止まりの AI slop を避けた

---

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | env.sh の `BSA_PA_BASE` が `scripts/` 止まり | `dirname/..` を 1階層しか上がっていなかった（env.sh は `scripts/lib/`） | dispatch 前に zsh で `source && echo BSA_PA_BASE` を verify | shell script のパス解決は dispatch 時に「source して確認」を必ず含める |
| 2 | Python heredoc で `input()` が EOFError | heredoc が stdin を食う Python 仕様 | Python `input()` × heredoc が動かないのは既知 | shell + Python の対話処理は最初から独立 .py ファイルで |
| 3 | `is_logged_in()` でセレクタ timeout | `.header__user` 等の DOM クラス推測 | fixture 取得時に header 構造も同時確認できた | DOM 依存判定は **URL ベース fallback を first try** に組み込む |
| 4 | `--bare + --mcp-config` で claude exit 1 | `${EXA_API_KEY}` env 未解決で MCP 起動失敗 | 02-tech-research に「user-scope MCP 認証済」と書いた直後に `--mcp-config` で上書きしてしまった矛盾 | 既存 user-scope MCP がある時は `--mcp-config` 省略をデフォルト |
| 5 | `--json-schema` で claude が空応答 | schema 強制ではなく hint。厳しい thinking モードで最終応答が空に | 公式ドキュメントの "validation" 表現を schema 強制と早合点 | 構造化出力は schema + プロンプト両建て + 抽出 fallback を最初から |
| 6 | Claude JSON が 2280 字で cut-off | 出力長制限到達 | プロンプトに「本文 1500-2000字目安」を入れていなかった | 構造化出力では長さ上限をプロンプト側で明示 |
| 7 | ダッシュボード「本日 0 件」 | UTC 保存 + JST フィルタの境界ズレ | 02-tech-research §3.1 で「UTC 保存」と認識していたのに表示で localtime 比較した | 「UTC 保存 + 直近 N 時間窓」を default パターンに |
| 8 | proposals.product_line NOT NULL 違反 | Claude が部分 JSON 返した時に fallback なしで insert | result の各フィールドに fallback (estimated / suggestedPrice) を最初から入れる | LLM 出力は常に Partial<T> 扱いで型設計 |

---

## 3. 自動化・効率化の余地

- **subagent dispatch prompt に「Self-Review に検証コマンド」を必須セクションとして追加** — 例: shell script は実 source、Playwright adapter は fixture で selector 検証、Python `input()` は独立スクリプト、構造化出力は Partial<T> + 全フィールド fallback、SQL クエリは実 DB で叩いて確認
- **`claude -p` ラッパーの standard pattern**（user-scope MCP に任せる / schema は hint 扱い / 抽出 fallback / stderr+stdout エラーログ）を memory feedback 化
- **タイムゾーン処理パターン**（UTC 保存 + 直近 N 時間窓）を memory feedback 化
- **DOM セレクタ依存判定の URL fallback パターン**を memory feedback 化

---

## 4. 次回への改善提案

1. **shell script の dispatch prompt に `zsh -c 'source X && echo $VAR' で variable resolve を verify` を Self-Review Checklist 必須化** — env.sh のような pathの `..` 数誤りを 0 にできる
2. **`claude -p` 呼び出しのテンプレ確立** — `--bare`/`--mcp-config`/`--json-schema` の罠を集約した「safe defaults」プロファイルを memory に置き、新規利用時に最初から参照する
3. **タイムゾーンクエリは「直近N時間窓」を default**、`localtime` 関数を使うのは原則禁止 → memory feedback 化済
4. **DOM セレクタロジックは複数候補 + URL fallback** を最初から書く → memory feedback 化済
5. **LLM 構造化出力は `Partial<T>` 型 + 全フィールド fallback** を最初から書く

---

## 5. 反映先

### SAFE（実施済）

| # | 反映先 | パス | 内容 |
|---|---|---|---|
| S1 | memory 新規 | `feedback_subagent_dispatch_verify.md` | dispatch prompt の Self-Review に検証コマンド5点を必須化 |
| S2 | memory 新規 | `feedback_claude_headless_json.md` | `claude -p` 呼び出しの safe defaults |
| S3 | memory 新規 | `feedback_sqlite_timezone_pattern.md` | UTC 保存 + 直近 N 時間窓パターン |
| S4 | memory 新規 | `feedback_dom_selector_url_fallback.md` | URL ベース判定 first try、DOM は補強 |
| S5 | improvement-log.jsonl | 3件追加 | Lancers `/ad` URL 調査 / `/web/lp` 4件問題 / Claude JSON cut-off 経過観察 |
| S6 | memory 既存追記 | `feedback_nvm_path_for_hooks.md` | `~/.local/bin` (Claude Code CLI) も同パターン適用 |

### RISKY（実施済）

| # | 反映先 | 内容 |
|---|---|---|
| R1 | CLAUDE.md MCP連携セクション末尾 | 「Claude Code CLI ヘッドレス呼び出し（`claude -p`）」サブセクション追加（memory `feedback_claude_headless_json.md` 参照誘導 + 採用例パス） |

### MEMORY.md インデックス更新（実施済）

S1-S4 の4件を Feedback セクション末尾に追加。

---

## 関連リンク

- ブランチ: `feat/bsa-proposal-automation`
- 主要ドキュメント:
  - `outputs/bsa/proposal-automation/01-requirements.md` (419 行)
  - `outputs/bsa/proposal-automation/02-tech-research.md` (477 行)
  - `outputs/bsa/proposal-automation/03-design.md` (1,059 行)
  - `outputs/bsa/proposal-automation/04-implementation-plan.md` (4,015 行)
- E2E 残件:
  - T31-T33 [HUMAN]: 完成度チェックリスト + 受注実績による KPI 検証（実運用）
  - FOLLOWUP: Lancers `/work/search/ad` 正規 URL 調査
