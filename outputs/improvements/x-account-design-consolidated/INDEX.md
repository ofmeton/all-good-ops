# x-account-design Consolidated Docs — INDEX

> 統合: 2026-05-27 初版 (PR #27) / 同日 網羅性監査 + 補完 (PR #28、本ブランチ)
> 統合ブランチ: `task/260527-xad-completeness-audit` (補完前は `task/260527-xad-consolidate`)
> 統合者: Claude (audit sub-agent + backfill sub-agent dispatch)
> 統合範囲: 改訂を重ねた **4 シリーズ / 16 ファイル / 7,675 行** を 1 シリーズ 1 ファイルに統合 + 抜け漏れ 54 件補完 (合計 4 統合 + INDEX + checklist + audit + selfreview = **8 ファイル / 約 5,800 行**)

---

## 1. 統合方針 (4 ルール、全シリーズ共通)

1. **省略なし**: 全バージョンの全節を保持。最新版で削除された節も §3 で原文を残す。**進化マトリクス / Deprecated 注記 / SSOT 要約で本文を置換する compression 禁止** ([cs:s1-74](http://localhost:3001/rules/s1-74) / [cs:s3-74](http://localhost:3001/rules/s3-74))
2. **バージョン来歴ヘッダー**: 各 `##` / `###` 節の冒頭に 1 行 `*Version History*: vX 導入 → vY 改訂 → vZ 確定`
3. **現行 SSOT 明示**: 最新確定値には `**Current (vX)**` マーカー、過去値は `(vA: X, vB: Y, vC: Z)` で履歴併記
4. **数値・分類・範囲は原値保持** ([Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 + §2.14 v1.3 → v1.4 差分まとめ の silent reduction 検出パターン / cs:s2-68 silent reduction 厳禁): range を下限のみに縮退させない / 単一値に丸めない / classification 軸の変更があれば旧軸も保持

**追加ルール (cs:s1-72 / cs:s3-72 推定排除)**: 「○○のため」と理由を書く時は原典 verify 必須。明記なしの場合は **`(原典に明示なし、Phase 1 で要検証)`** と注記。推定を documented fact のように埋め込まない。

## 2. 統合ファイル一覧 (補完後 = 2026-05-27 PR #28 時点)

| # | シリーズ | 統合ファイル | 行数 | 元バージョン数 | 元合計行数 |
|---|---|---|---:|---:|---:|
| A | メイン設計書 | [`main-design-all-versions.md`](./main-design-all-versions.md) | **2,533+** (PR #27: 948 → PR #28: +1,580 行補完) | 7 (v9 / v9.1 / v9.2 / v10 / v10.1 / v10.2 / v10.3) | 5,590 |
| B | Style Guide | [`style-guide-all-versions.md`](./style-guide-all-versions.md) | 741 (audit §5 で良好確認、補完不要) | 4 (v1.1 / v1.2 / v1.3 / v1.4) | 735 |
| C | Competitor Report | [`competitor-report-all-versions.md`](./competitor-report-all-versions.md) | 1,118 (audit §5 で良好確認、補完不要) | 3 (v1 / v2 / v3) | 940 |
| D | Query Design | [`query-design-all-versions.md`](./query-design-all-versions.md) | 617 (audit §5 で良好確認、補完不要) | 2 (v1 / v2) | 410 |
| 計 | — | **4 統合ファイル** | **約 5,000 行** | **16 ファイル** | **7,675** |

### 関連ドキュメント (本ディレクトリ内に同居)

| ファイル | 行数 | 役割 |
|---|---:|---|
| [`INDEX.md`](./INDEX.md) | 約 110 | 本ファイル、4 統合への入口 + 統合ルール SSOT |
| [`CONSOLIDATION-CHECKLIST.md`](./CONSOLIDATION-CHECKLIST.md) | 約 290 | **新規 PR #28** バージョン更新時の Step 1-7 + CL-1〜CL-5 抜け漏れ防止チェック |
| [`completeness-audit-report.md`](./completeness-audit-report.md) | 352 | **新規 PR #28** 54 件抜け漏れ詳細 + 補完計画 F-1〜F-24 |
| [`review-consolidated-self.md`](./review-consolidated-self.md) | 168 | PR #27 セルフレビュー (10 軸 cross-doc 比較表) |

## 3. 各統合ファイルの構造

### シリーズ B/C/D (統一構造)

```
## 0. このドキュメントについて
## 1. バージョン進化年表
## 2. 統合本文 (節ごとに来歴ヘッダー)
## 3. Deprecated 節 (省略なし原文保持)
## 4. 数値・分類軸の進化マトリクス
## 5. 統合プロセスメモ
```

### シリーズ A (main-design-all-versions.md、補完後拡張構造)

```
## 0. このドキュメントについて
## 1. 元バージョン進化年表
## 2. 統合本文 (§2.1〜§2.12 各章)
## 3. Deprecated 節 (§3.1〜§3.9)
## 4. 数値・分類軸の進化マトリクス
## 5. 統合プロセスメモ + §5.1 cs:s3-72 違反箇所の修正記録

# 以下、PR #28 で補完済 (audit 54 件のうち重大 18 + 詳細 24 + 軽微 12)
## 6. 各エージェント・モジュールのロジック詳述 (A-3〜A-7 / B-1〜B-7)
   - §6.1 素材レイヤー 2 系統 (A-2)
   - §6.2 Interviewer (A-5) / §6.3 選別 (A-6) / §6.4 Writer (A-3) / §6.5 Hook Analyzer (A-4) / §6.6 Visualizer (A-7)
   - §6.7 Optimizer 改善対象 3 区分 + 競合分析駆動初期値 (A-8 + A-9)
## 7. 監視 / レビュー連携 (A-11 / A-12)
   - §7.1 LINE Daily Digest / Weekly Brief / §7.2 競合調査 50 項目 A〜H 分類
## 8. 安全装置 + 法務章細目 + 公開許諾 gate + OAuth PKCE (A-13 / A-14 / B-6 / B-7)
   - §8.1 安全装置 5 種 / §8.2 §10.4-§10.6 法務細目 / §8.3 公開許諾 gate Schema / **§8.4 OAuth 2.0 PKCE 実装 gate (B-6 独立節)**
## 9. データフロー + observability (A-17)
## 10. コスト試算詳細 (A-18)
## 11. クロスレビュー観点 全 50 件 (A-15)
## 12. 議論経過 + レビュアー依頼履歴 (A-16)
## 13. 付録 A/B/C/D (B-9 / C-1〜C-12)
```

## 4. 現行 SSOT (最新確定版)

- **メイン設計書**: v10.3 (2026-05-26 全レビュー指摘オールクリア、PR #28 で補完 54 件追記済)
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

## 7. レビュー履歴

### PR #27 (2026-05-27 初版 merge)
1. **セルフレビュー** ([cs:s1-66](http://localhost:3001/rules/s1-66)): 10 軸 cross-doc 比較表で schema 衝突ゼロ確認
2. **Codex クロスレビュー** (gpt-5.2): 5 ラウンドで All Clear

### PR #28 (本ブランチ、網羅性 + 補完)
1. **網羅性監査** ([completeness-audit-report.md](./completeness-audit-report.md)): 54 件抜け漏れ検出 (重大 18 / 詳細 24 / 軽微 12)
2. **補完作業** (backfill sub-agent): main-design 953 → 2,533 行 (+1,580 行)、全 54 件統合版に追記
3. **再発防止策** ([CONSOLIDATION-CHECKLIST.md](./CONSOLIDATION-CHECKLIST.md)): Step 1-7 + CL-1〜CL-5 抜け漏れ防止チェック明文化
4. **Codex 全網羅レビュー** (Round 1-N): consistency + **completeness** 2 観点で再判定

## 8. 関連ドキュメント

- 旧バージョン (改訂前): `outputs/improvements/x-account-design-v9*.md` / `v10*.md`
- Phase 0 配下: `outputs/improvements/x-account-design-v10-phase0/` / `-phase0-v2/`
- 上位 spec: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
- レビューサイクル記録: `outputs/improvements/x-account-design-v10-phase0-v2/review-cycle-1-*.md`
- 振り返り: `outputs/retrospectives/2026-05-25-1021-x-account-v9-v10-series.md`
- 運用ルール: [`CONSOLIDATION-CHECKLIST.md`](./CONSOLIDATION-CHECKLIST.md) (今後のバージョン更新で必須実行)
