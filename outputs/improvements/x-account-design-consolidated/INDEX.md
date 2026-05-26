# x-account-design Consolidated Docs — INDEX

> 統合日: 2026-05-27
> 統合ブランチ: `task/260527-xad-consolidate`
> 統合者: Claude (sub-agent dispatch)
> 統合範囲: 改訂を重ねた **4 シリーズ / 16 ファイル / 7,675 行** を 1 シリーズ 1 ファイルに統合 (合計 4 ファイル / 3,424 行)

---

## 1. 統合方針 (4 ルール、全シリーズ共通)

1. **省略なし**: 全バージョンの全節を保持。最新版で削除された節も §3 で原文を残す
2. **バージョン来歴ヘッダー**: 各 `##` / `###` 節の冒頭に 1 行 `*Version History*: vX 導入 → vY 改訂 → vZ 確定`
3. **現行 SSOT 明示**: 最新確定値には `**Current (vX)**` マーカー、過去値は `(vA: X, vB: Y, vC: Z)` で履歴併記
4. **数値・分類・範囲は原値保持** ([Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 + §2.14 v1.3 → v1.4 差分まとめ の silent reduction 検出パターン / cs:s2-68 silent reduction 厳禁): range を下限のみに縮退させない / 単一値に丸めない / classification 軸の変更があれば旧軸も保持

## 2. 統合ファイル一覧

| # | シリーズ | 統合ファイル | 行数 | 元バージョン数 | 元合計行数 |
|---|---|---|---:|---:|---:|
| A | メイン設計書 | [`main-design-all-versions.md`](./main-design-all-versions.md) | 948 | 7 (v9 / v9.1 / v9.2 / v10 / v10.1 / v10.2 / v10.3) | 5,590 |
| B | Style Guide | [`style-guide-all-versions.md`](./style-guide-all-versions.md) | 741 | 4 (v1.1 / v1.2 / v1.3 / v1.4) | 735 |
| C | Competitor Report | [`competitor-report-all-versions.md`](./competitor-report-all-versions.md) | 1,118 | 3 (v1 / v2 / v3) | 940 |
| D | Query Design | [`query-design-all-versions.md`](./query-design-all-versions.md) | 617 | 2 (v1 / v2) | 410 |
| 計 | — | **4 統合ファイル** | **3,424** | **16 ファイル** | **7,675** |

統合により行数は約半分に圧縮されたが、これは「完全同一文章の重複排除」と「来歴注記でのまとめ」によるもの。情報量 (= 全節保持) は 100%。

## 3. 各統合ファイルの構造 (全シリーズ統一)

```
## 0. このドキュメントについて
## 1. バージョン進化年表
## 2. 統合本文 (節ごとに来歴ヘッダー)
## 3. Deprecated 節 (省略なし原文保持)
## 4. 数値・分類軸の進化マトリクス
## 5. 統合プロセスメモ
```

## 4. 現行 SSOT (最新確定版)

- **メイン設計書**: v10.3 (2026-05-26 全レビュー指摘オールクリア)
- **Style Guide**: v1.4 (2026-05-26 Cycle 2 退行修正)
- **Competitor Report**: v3 (2026-05-26 Cycle 1 オールクリア、Codex 4 ラウンド合格)
- **Query Design**: v2 (Phase 0 v3、publisher 5 + audience 5 = 10 query、seed hit 70%+)

## 5. 統合対象外 (理由付き)

| ファイル / ディレクトリ | 理由 |
|---|---|
| `fetch-phase0-v2.py` / `v3.py` | ドキュメントではなく実装スクリプト |
| `review-cycle-1-self.md` / `-codex.md` / `-final.md` | 3 視点並列の独立記録、改訂シリーズではない |
| `STYLE-GUIDE-CURRENT.md` | 単なるポインタ |
| `HUMAN_TASKS.md` / `inputs-manifest.json` | 単一の現行ドキュメント |
| `x-account-design-v9-verification/` | B-1〜B-3 検証ログ、独立成果物 |
| `outputs/retrospectives/2026-05-25-1021-x-account-v9-v10-series.md` | 振り返り記録 |
| `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md` | 上位 spec、改訂されていない単発ファイル |
| `raw/publishing/research/2026-05-26-jp-ai-publishers-v2/` | 生データ |

## 6. 旧バージョンファイルの扱い

- 旧バージョンファイル (v9.md / v10.md / style-guide-v1.1.md 等) は **削除しない**
- 統合ファイルは「読みやすい SSOT」、旧バージョンファイルは「歴史的記録」として併存
- 実装着手時は **統合ファイル** を読めば十分

## 7. セルフレビュー + クロスレビュー

統合と同時に以下のレビューを実施 (本 PR 内に含む):
1. **セルフレビュー** ([cs:s1-66](http://localhost:3001/rules/s1-66) 準拠): 4 ファイルから quantitative value + classification axis を抽出して比較表化。schema 衝突をゼロにする
2. **Codex クロスレビュー**: 比較表 + 4 統合ファイル + INDEX を Codex MCP に投入、fail 全解消まで実施

レビュー記録は `outputs/improvements/x-account-design-consolidated/review-consolidated-self.md` / `-codex.md` に格納予定。

## 8. 関連ドキュメント

- 旧バージョン (改訂前): `outputs/improvements/x-account-design-v9*.md` / `v10*.md`
- Phase 0 配下: `outputs/improvements/x-account-design-v10-phase0/` / `-phase0-v2/`
- 上位 spec: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
- レビューサイクル記録: `outputs/improvements/x-account-design-v10-phase0-v2/review-cycle-1-*.md`
- 振り返り: `outputs/retrospectives/2026-05-25-1021-x-account-v9-v10-series.md`
