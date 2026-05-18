# Retrospective: tutor-coach 新設 + つかさ初回授業

- **日時**: 2026-05-18 23:18
- **対象セッション**: tutor-coach エージェント新設 → つかさ初回授業準備 → 初回授業レポ受領 → カルテ整備 → 七里ガ浜高校リサーチ → お礼メッセージドラフト

## セッション要約

家庭教師業務の新規生徒（つかさ・中2男子・そうま紹介ライン）の初回授業を当日に控えた状態でスタート。tutor-coach エージェントを新設し、CLAUDE.md 3点同期 + agent-ranks.json + git commit まで完了。続けて初回授業準備（タイムライン・持ち物・接し方メモ）、教科書写真20枚（HEIC）からの問題ピックアップ（単細胞・多細胞 案→6月テスト対策ど真ん中 案へ方針変更）を実行。授業終了後、レポを受領して生徒カルテ・授業ログ・memory pointer を整備。お礼メッセージドラフトを提示し、つかさが自発的に挙げた「七里ヶ浜高校」の情報をリサーチして tutor-coach 視点で意味付け（校風「自学自習・自主自律」が父プレッシャー型と対比的）。

## 1. 良かった点

1. **`agent-onboarding.md` を最初に Read してプロトコル準拠で進めた** — 重複確認 → 3点同期 → git commit を順序通り実行。CLAUDE.md ヘッダー総数の更新漏れも防げた
2. **tutor-coach の人格定義で「できた！の連鎖がKPI」「点数より先」を明示した** — その後の授業タイムライン設計・接し方メモが一貫し、初回 KPI 達成（「最初解けなかった→図描く→解けた」）に貢献
3. **テスト写真20枚を並列 Read で一気に把握した** — HEIC 変換を sips 並列で先回りし、ピックアップ提示まで時間ロスなし
4. **父プレッシャー問題を「長期テーマ扱い・即効薬NG」と明示した** — カルテに接し方戦略として構造化記録。「やる/やらない」表で判定境界を可視化
5. **七里ガ浜高校の校風「自学自習・自主自律」が父プレッシャー型と対比的、という意味付けを加えた** — 単なる情報羅列でなく、tutor-coach 視点でつかさの「気になる」の解像度を上げた

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | 初回授業のメインを「単細胞・多細胞」に置いたが、ユーザーから「とらわれず」と方針変更 | 初回授業の目的軸を「学校進度合わせ」と単独で仮置きした | 「学校進度合わせ vs テスト対策ど真ん中」軸を最初に提示すべきだった | AskUserQuestion で目的軸選択 or 両プラン並列提示 |
| 2 | 場所（対面授業の物理場所）の確認漏れ。カルテに「未確認」と記録 | 確認項目テンプレに「対面の場合の場所」が抜けた | 「対面」と聞いた時点で「自宅/カフェ/その他」を即聞く | tutor-coach.md にチェックリスト追記 |
| 3 | `agent-ranks.json` の `"icecream-ops"` が実ファイル `rice-cream-ops.md` と不整合と判明 | 過去の命名変更時の同期漏れ。本件スコープ外 | 検出時点で improvement-log に記録 | 後日 fix（別 commit） |
| 4 | そうまカルテを後回しにした（仮作成は実施したが情報空欄多数） | 「既存生徒の情報も今日整理する」発想がなかった | 「既存生徒のカルテも揃えませんか」と提案できた | tutor-coach 初期セットアップ時に既存生徒分も棚卸し |

## 3. 自動化・効率化の余地

1. **HEIC→JPG 変換コマンドの memory リファレンス化** — iPhone 写真もらうたびに sips 並列が必要。コマンド1行残せば次回探さない
2. **tutor-coach 新規生徒受け入れチェックリスト** — 場所/教材/月謝/紹介経路/親要望/本人志望感/性格情報/初回授業の目的軸 を必須確認項目化
3. **scripts の不整合検出**（参考レベル） — `agent-ranks.json` のキー vs 実ファイル名の一致を `monthly-audit.sh` でチェック追加余地

## 4. 次回への改善提案

1. `tutor-coach.md` の「起動時に必ず行うこと」に「新規生徒の場合の追加確認チェックリスト」を明記する
2. memory に `reference_heic_conversion.md` を新設して、sips 並列変換コマンドの1ライナーを残す
3. improvement-log に「初回授業準備で目的軸確認漏れ」を記録
4. improvement-log に「`agent-ranks.json` icecream-ops 命名不整合」を記録（別 fix commit 候補）

## 5. 反映結果（実装済）

### SAFE 4件・全て applied

| # | カテゴリ | 反映先 | 内容 | 結果 |
|---|---|---|---|---|
| 1 | memory/reference | `memory/reference_heic_conversion.md` + `memory/MEMORY.md` | sips 並列変換コマンドのリファレンス + インデックス1行追加 | applied |
| 2 | エージェント定義 | `.claude/agents/business-ops/tutor-coach.md` の「起動時に必ず行うこと」 | 新規生徒チェックリスト9項目を追記。「初回授業の目的軸」を明示確認項目に | applied |
| 3 | improvement-log | `data/improvement-log.jsonl` | 「初回授業準備で目的軸確認漏れ」を記録 (proposal_id: 2026-05-18-retro-tutor-onboarding-axis) | applied |
| 4 | improvement-log | `data/improvement-log.jsonl` | 「agent-ranks.json icecream-ops 命名不整合」を記録 (proposal_id: 2026-05-18-retro-agent-ranks-naming-drift) | deferred（fix は別 commit） |

### RISKY: なし

新規スキル化・permissions変更・エージェント新規追加（本件の tutor-coach 新設は別フローで実施済み）なし。

## 反映先チェックリスト判定（学びの置き場所）

| 学び | エージェント特定？ | 横断ルール？ | スキル化（5+手順 / 再利用3回+）？ | 反映先 |
|---|---|---|---|---|
| 新規生徒の確認漏れ | はい（tutor-coach のみ） | × | × | エージェント定義のみ |
| HEIC変換 | × | × | × (3行で済む) | memory のみ |
| 目的軸の確認漏れ | はい + memory feedback化も◎ | × | × | improvement-log + tutor-coach.md |
| ranks 命名不整合 | × | △（命名整合ルール扱いなら） | × | improvement-log のみ |

## 残課題（次セッション以降）

- そうまカルテの情報補強（次回そうま授業前に壁打ち）
- `agent-ranks.json` icecream-ops → rice-cream-ops の rename fix
- お母さんへのお礼メッセージ送信完了確認（人間アクション）
- 次回つかさ授業（道管/師管/呼吸光合成/BTB）の準備
