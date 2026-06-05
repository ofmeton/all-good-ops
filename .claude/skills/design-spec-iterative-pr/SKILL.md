---
name: design-spec-iterative-pr
description: "大規模設計書を複数の独立 PR として反復起草し最終統合版を作るフロー。v8→v9 のように base 版から設計書を作り直し、章ごとの追加詰めが想定される改訂時に使う。"
---

# Design Spec Iterative PR Skill

## 概要

大規模設計書を **複数の独立 PR (差分文書) として反復起草 → 最終統合版を作る** フロー。v9 → v9.1 → v9.2 → v10 で 4 サイクル繰り返した型をスキル化。

- **誰が**: メインセッション or system-engineer / org-designer
- **いつ**: v8 → v9 のような大規模設計書改訂 + 章ごとの追加詰めが想定されるケース
- **何のために**: 1 つの巨大 PR にせず、章ごと独立 PR にしてレビュー粒度を保ちつつ、最終的に統合版 (v10) で main 設計書化

## 適用条件

以下の **全てを満たす** ケースで起動:
- 1 つの設計書を v8 → v9 のように **base 版から作り直す** 必要
- v9 では時間がないので「叩き台」レベルで起こす章がある (X だけ詰めて IG/note は薄い等)
- 章ごとの追加詰めが想定される (v9.1 / v9.2)
- 最終的に 1 ファイルに統合する想定 (v10)

## フロー (4 サイクル)

### サイクル 1: base 版 (v_n)

- 旧版の構造 (章立て) を継承
- 全章を埋めるが、一部章は「叩き台」と明記
- 検証 (B-1/B-2/B-3 等) の成果を反映
- 独立 worktree → commit → PR (#A)

### サイクル 2-N: 増分版 (v_n.x)

- 叩き台章を 1 章ずつ詰める (例: v9.1 = note 章だけ詰める)
- 競合調査 / 実測データ追加
- v_n を変更しない (新規ファイル v_n.x.md として独立)
- 独立 worktree → commit → PR (#B, #C, ...)
- v9 PR (#A) merge 後に v9.x PR を順次レビュー (依存順)

### 最終サイクル: 統合版 (v_{n+1})

- v_n + v_n.1 + v_n.2 + ... を **1 ファイル** に統合
- v_n の章立てを継承、v_n.x の内容を該当章に折り込み
- v_n / v_n.x は履歴として残置 (削除しない)
- 独立 worktree → commit → PR (#D)
- merge 後 v_{n+1} が new main 設計書

## 命名規約

| 文書 | ファイル名 |
|---|---|
| base | `outputs/improvements/<topic>-v9.md` |
| 増分 1 | `outputs/improvements/<topic>-v9-1.md` |
| 増分 2 | `outputs/improvements/<topic>-v9-2.md` |
| 統合 | `outputs/improvements/<topic>-v10.md` |

branch 名: `task/YYMMDD-<topic>-v9-N` の 4 連続。

## v10 統合のテンプレ

```markdown
# <Topic> 設計書 v10 — 統合完全版

> v9 (N行) + v9.1 (N行) + v9.2 (N行) = 計 N行 を 1 つに統合した完全版設計書。
> v10 が new main 設計書として位置付けられ、v9 / v9.1 / v9.2 の独立 file は履歴として残置。

## 0. このドキュメントの読み方

### 0.1 目的
### 0.2 v9 → v9.1 → v9.2 → v10 の経緯 (table)
### 0.3 v10 の構成原則 (どの章にどの増分を折り込んだか)

## 1〜N. (v9 の章を継承、増分を該当章に折り込み)

## 付録 A: v9 / v9.1 / v9.2 との関係 (履歴位置付け)
## 付録 B: 検証成果へのリンク
## 付録 C: 次バージョン以降の改善候補
```

## 注意点 (避けたい detour)

- v9.x の差分を main の v9 に直接 commit しない (PR が縦長くなる、レビュー粒度が落ちる)
- 統合版 (v10) を v9 と同 PR にしない (review 単位が混ざる)
- worktree 規律遵守 (各サイクルで新 worktree 必須、s1-36 ルール)
- v9.x の独立 file を v10 起草時に削除しない (履歴保持)

## コスト試算

- 各サイクル: 起草 (Anthropic API サブスク内) + commit + PR (gh 無料)
- 4 サイクル: 数時間〜半日

## 関連リソース

- v9 / v9.1 / v9.2 / v10 起草の実例: `outputs/improvements/x-account-design-v9*.md` + `x-account-design-v10.md`
- worktree 規律: CLAUDE.md §GitHub運用ルール + PR #13
- memory: [[feedback_iterative_pr_pattern]] (将来)
