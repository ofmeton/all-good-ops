# セッション振り返り — Digital Marketing Catch-Up 245p PPTX 制作

- **日時**: 2026-04-26 00:49
- **対象セッション**: 2026-04-25 〜 2026-04-26 / Digital Marketing Catch-Up 2023→2026 245p PPTX 制作
- **成果物**: `outputs/documents/marketing-catchup-2023-2026/deck.pdf` (245p, 6.8MB) / `deck.pptx` (701KB)

## セッション概要

ユーザーから「過去2.5年分のデジタルマーケティング業界 catch-up 用のパワポ100p程度で」の依頼を受け、ブレインストーミング → 設計 → Part 別ビルド → 結合 のフローで 245p の PPTX を制作完遂。

- 8 Part 構成 (Part 1: 10p / Part 2: 20p / Part 3: 110p (5媒体グループ) / Part 4: 25p / Part 5: 40p / Part 6: 15p / Part 7: 10p / Part 8: 15p)
- python-pptx + 共通ライブラリ + LibreOffice PDF 変換で実装
- ファクトチェックを各 Part 前に web 検索で実施

## 1. 良かった点

- **共通ライブラリ抽出を Part 2 で実行** — `_deck_lib.py` 抽出により Part 3-8 の生産性が約30%向上
- **ファクトチェックを段階的に web 検索で実施** — 推測ではなく一次ソース確認 (電通 / Google公式 / Meta Engineering / TikTok公式)
- **Privacy Sandbox 終了 (2025/10/17) を Part 2 リサーチで発見し、Part 1 P06 まで遡って訂正** — 整合性を最後まで保った
- **Part 単位でビルド → PDF/PNG プレビュー → 即修正のサイクル徹底** — レイアウト不具合をユーザー確認前に潰せた
- **全結合 + PDF 化を `merge_decks.py` で自動化** — 後追い修正時の再結合工数を最小化

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | テキストボックス overflow による下部切れを 各 Part で都度修正 (P08, P191, P195, P199-P202, P176, P230 など) | テキストの縦サイズと box height の関係を経験則で書いてから初めて崩れに気付く | 「フォントサイズ × line_spacing × 行数 ≤ box height」の試算を最初に行う | `_deck_lib.py` に `fit_text_in_box()` ヘルパーを最初から用意 |
| 2 | `add_text` に存在しない `italic` パラメータを使ってビルドエラー (Part 3-B / 3-C で各1回) | 共通ライブラリの公開シグネチャを把握しないまま使った | 関数定義を最初に grep で確認 | _deck_lib.py 先頭に「サポート kwargs 一覧」コメント追加 |
| 3 | `add_rect(s, y=y, left=...)` のように kwarg を勝手に使ってビルドエラー (Part 8) | 引数が positional だったが推測で kwargs にした | 同上 | 同上 + add_rect/add_text の正しい呼び出し例を docstring に明示 |
| 4 | 大きい数字 (10,000x / +8% / 80% / UP 等) が枠外オーバーフロー (Part 3-B P62, Part 3-C P84) | 大型フォント単独配置 + center align 忘れ | 大型数字専用ヘルパーを作っておく | `add_big_stat(value, label, box_w, box_h)` を `_deck_lib.py` に追加 |
| 5 | Hub & Spoke 図 (Part 3-A P03, Part 6 P208) で Spoke 配置と Bottom 注釈が重なった | Spoke の Y 位置を hard-code、ボトムボックスとの干渉を未検証 | Hub中心 + 4 spoke の自動配置ヘルパーを用意 | `add_hub_spoke(hub_text, spokes_list)` ヘルパー化 |
| 6 | TaskUpdate の頻度が一定せず、in_progress のまま長く放置 → system reminder 多数発火 | 各 Part 完了の即時 TaskUpdate ルールを最初に決めなかった | 「Part 完成 = TaskUpdate completed + 次 Part TaskCreate」を機械的に実行 | これ自体を `large-pptx-generation` スキルの手順に組込 |
| 7 | プロンプトテンプレ4枚を一括 sed で font/line_spacing 縮小 | 縦長テキストブロックは 11pt × 1.6 で大半 overflow すると最初に学習できなかった | テキストブロック用の標準サイズ (10pt × 1.4) を最初から固定 | `add_text_block(...)` 専用ヘルパー化 |

## 3. 自動化・効率化の余地

- **レイアウト崩れの早期検出**: PDF→PNG化 → footer 領域 / 隣接 box への重なり判定を自動化できれば、ユーザー確認前に潰せる
- **Part 単位スケルトン (divider → TL;DR → topics → playbook → pitfalls) の標準化**: 8 Part 中 6 Part で同型を踏襲 → テンプレ関数化可能
- **`_deck_lib.py` のヘルパー追加**: `add_big_stat`, `add_hub_spoke`, `add_timeline`, `add_text_block`, `fit_text_in_box`
- **大型 PPTX 制作の標準フロー化**: 設計 → ライブラリ → Part別 build → preview → 修正 → 結合 の手順をスキル化

## 4. 次回への改善提案

1. **`large-pptx-generation` スキルを新設** — python-pptx + 共通ライブラリ + Part別ビルド + PDF 結合の標準フロー手順書
2. **`_deck_lib.py` を再利用可能なテンプレートとして保存** — `outputs/templates/pptx-deck-lib.py`
3. **ヘルパー関数の追加**: 上記6種を `_deck_lib.py` に追加し、`large-pptx-generation` 利用時に必須参照とする
4. **共通ライブラリ使用前の確認ルール**: 関数シグネチャを必ず grep で確認してから使う (memory feedback 化)
5. **TaskUpdate 即時化ルール**: Part 完了/開始時の TaskUpdate を機械的に実行する手順を明文化

## 5. 反映済みアクション (2026-04-26 ユーザー全承認)

### SAFE
- [memory] `feedback_pptx_generation.md` 新規作成 + MEMORY.md 索引追加
- [improvement-log] `data/improvement-log.jsonl` に本セッション記録追記
- [エージェント定義] `system-engineer.md` に `large-pptx-generation` スキル参照追加
- [CLAUDE.md] ルーティングに「大型PPTX生成 (50p以上)」行を追加 (system-engineer 委譲)

### RISKY
1. [新規スキル化] `.claude/skills/large-pptx-generation.md` 新規作成 (6ステップ標準フロー + ヘルパー仕様 + レイアウト崩れの定石)
2. [新規テンプレート保存] `outputs/templates/pptx-deck-lib.py` として `_deck_lib.py` を保存

## 関連ファイル

- 成果物: `outputs/documents/marketing-catchup-2023-2026/deck.pdf` `deck.pptx`
- 設計書: `outputs/documents/marketing-catchup-2023-2026/SPEC.md`
- 共通ライブラリ: `outputs/documents/marketing-catchup-2023-2026/scripts/_deck_lib.py`
- 新スキル: `.claude/skills/large-pptx-generation.md`
- テンプレ: `outputs/templates/pptx-deck-lib.py`
- 新memory: `feedback_pptx_generation.md`
