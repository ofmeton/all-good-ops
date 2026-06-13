---
type: concept
created: 2026-06-06
updated: 2026-06-11
related: [[dev/standards]], [[self/engineering-principles]]
tags: [agent-teams, orchestration, workflow, dev, ssot]
status: active
---

# agent teams 運用 playbook

開発を「設計→実装→レビュー」の並列チームで回すための運用正本。
**1 案件 = 1 worktree = 1 チーム**。品質を保ったまま速度を上げ、設計のブレを防ぐのが狙い。

前提（実行時に確認）: Claude Code v2.1.32+（`/status`）、`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。

## いつ team を組むか

- 設計→実装→レビューが絡む**まとまった開発**（新機能・サブシステム・複数観点レビューが要る改修）
- 単発の小修正・調査はチームを組まず通常の単独セッション or サブエージェントで足りる（トークン無駄を避ける）

## feature-factory モード（逐次パイプライン）

**まとまった機能のフル工程実装**は、並列 team でなく逐次の「ソフトウェア工場」で回す（`skill:feature-factory`）。並列 team は「観点別レビューを同時に走らせる」時に使い、factory は「定義→設計→実装→検証→照合を1本の連鎖で通す」時に使う。

連鎖と人間チェックポイント（**CPは3点だけ**）:

1. **story-writer** が受け入れ基準つきユーザーストーリーを作る → ⏸ **CP① ストーリー承認**
2. **architect** が技術ブリーフを作る → ⏸ **CP② ブリーフ承認**（既存 plan approval）
3. **system-engineer** が BE→FE を逐次実装
4. **test-verifier** が受け入れテストを書いて実走（基準別合否）
5. **spec-validator** が実装を story/brief と照合しギャップを深刻度分類で報告
6. 失敗/Critical は正しい担当へ差し戻し → 再検証クリーンまで回す → ⏸ **CP③ PR承認**

各工程は専用クリーンコンテキストで、前工程のサマリのみ受け取る（ドリフト防止）。Step0 調査は architect 起動手順か `feature-dev:code-explorer` を流用（専任新設なし）。

## Codex-as-implementer レーン（実装委任が既定）

実装・テストフェーズは最もトークンを食う。これを **Codex(gpt-5.5 high・定額サブスク)** に逃がし、Claude は設計(architect)とレビュー(pr-review/spec-validator)を握る**半委任**が既定。Codex turn は ChatGPT/Codex の定額枠（Claude サブスク／API 課金の外）で動くため、Claude 側トークンが激減し品質は保たれる。配線の正本は `skill:codex-implement`。

- **いつ system-engineer(Claude) でなく Codex か**: 標準以上の実装は既定で Codex。Claude implementer は「Codex に出しづらい超密結合な小改修」「レビュー往復より直書きが速い軽微修正」など例外時のみ。
- **起動**: `mcp__codex__codex` を `cwd=<案件 worktree 絶対パス>` / `sandbox=workspace-write` / `approval-policy=never` で呼ぶ。`prompt` に architect ブループリント全文を埋め込む（Codex は worktree root の `AGENTS.md` を自動で読むが、規約要点はブループリントにも再掲）。差し戻しは `mcp__codex__codex-reply`（`threadId`）。
- **受け渡し**: Codex はビルダーサマリ（追加/編集ファイル・契約差分・テスト結果・逸脱・人間ゲート該当）を返す。lead はサマリ + `git diff` を pr-review-toolkit / spec-validator に渡す。
- **並列**: 並列案件は Codex も**別 worktree**（1 案件=1 worktree 維持）。同一 worktree で複数 Codex を同時 commit させない（`.git/index.lock` 競合）。
- **人間ゲート**: 人間承認・PR 承認は不要・**デプロイまで自走**（`feedback_deploy_no_confirm`）。ただし migration 本番適用 / 外部送信 / 金銭の硬ゲートは据え置き（Codex は実行せず Claude→人間にエスカレーション）。

## チーム編成（最大 4・スポット運用）

| 役割 | 担当 | tools | 備考 |
|---|---|---|---|
| **lead** | セッション本体 | — | 指揮 + 人間への報告窓口。teammate を生成し統合 |
| **architect** | `dev-automation/architect` | 読み取り専用 | 設計のみ。plan approval 必須。SSOT 必読 |
| **implementer** | `dev-automation/system-engineer` **または Codex**（下記レーン） | 書込可 | 1〜2 名（FE/BE 等ファイル領域が割れる時のみ 2 名）。**実装は Codex 委任が既定**（トークン節約） |
| **reviewer** | `pr-review-toolkit:*` | 読み取り専用 | 下記レシピで 2〜3 観点 |

**人数は最大 4 に固定**（記事の 8 人案は採らない）。トークンは人数比例で増えるため、ルーティン作業に多人数を当てない（「3 人の集中 > 5 人の散漫」）。

### reviewer レシピ

- **必須 2 観点**: `code-reviewer`（総合品質・バグ）+ `silent-failure-hunter`（エラーハンドリング・サイレント失敗。ウチの教訓が最も多い領域）
- **案件で追加**: `type-design-analyzer`（型設計が要の時）/ `pr-test-analyzer`（テスト網羅が要の時）
- **別モデル観点（任意）**: Codex レビュー（`mcp__codex__codex`）。重要・複雑な変更でセカンドオピニオンが欲しい時に回す。Claude 系レビュアー同士は盲点が共通しがちなので、別モデルが異なる指摘傾向で見落としを拾える。Codex MCP は導入済
- **feature-factory での検証**: `dev-automation/spec-validator`（承認済み story/brief との照合・ギャップ報告）を主とし、複雑case のみ上記 pr-review-toolkit を追加。spec-validator は「仕様照合」、pr-review-toolkit は「一般品質・バグ」で役割が分かれる

## ワークフロー

1. lead が `wt-new.sh <topic>` で worktree を切り、その中で team を起動
2. **architect** が standards 準拠で設計（ユーザーシナリオ網羅→機能洗い出し、改善レバー+観測設計）→ plan approval で提出
3. lead/人間が設計を承認（「ユーザーシナリオと standards 準拠を含む計画のみ承認」）
4. **implementer** が承認済みブループリントを standards 準拠で実装
5. **reviewer** が多観点レビュー → implementer が指摘修正
6. lead が PR 作成・smoke 準備まで
7. **本番反映は人間ゲート**（下記）

## ガードレール

- **worktree 衝突**: 1 案件 1 worktree 内で implementer は**ファイル領域を分担**。`package.json` 等共有ファイルは 1 人に集約 → `mem:feedback_subagent_package_json_concurrency`。素朴な並列は 2 名まで。**厳密なファイル排他 + 下記 tactic を満たせば 4 名まで可**（2026-06-11 xad 7機能で 4 並列実証）
- **並列実装の運用tactic**（4 並列を安全に回す条件・2026-06-11 実証）:
  - **共有基盤は先行直列フェーズに切る**: migration・共通 component・共有ヘルパー・型拡張は Phase 0 として 1 名が先行実装しコミット。並列フェーズはこれを read/import だけで依存させる（並列同士が共有ファイルを編集しない分解を architect に作らせる）
  - **並列 implementer は commit させず lead が集約**: 同一 worktree で複数 agent が同時 commit すると `.git/index.lock` が競合する。各 agent は担当ファイル編集 + 報告のみ → lead が統合検証後に workstream 別 commit
  - **検証はスコープ + フルbuildは統合で1回**: 各 agent の検証は自分の担当テスト + `tsc --noEmit` に限定（複数 agent の `next build` 同時実行は `.next` 競合・遅延）。フル build は統合フェーズで lead が 1 回。worktree の Next.js は Turbopack が symlink node_modules で panic → `next build --webpack`（`mem:feedback_worktree_next16_turbopack_symlink`）
  - **統合フェーズで lead がフル検証**: 各 agent はスコープ検証なので、統合後に全テスト + 型 + build + 差分レビュー（pr-review-toolkit）を lead が回し、継ぎ目（RPC↔呼び出し契約・共有ヘルパーの drift・import alias）を重点確認
- **git 規律**: lead は `wt-new.sh` で切った task ブランチ内で起動。main 直 commit・別ブランチ checkout は既存 hook が block（脱出口 `ALLOW_*`）
- **トークン上限**: teammate 最大 4・スポット運用（常時稼働しない）
- **権限の伝播**: teammate は lead の権限を継承する。lead を `--dangerously-skip-permissions` で動かさない（事故が並列に広がる）
- **デプロイ人間ゲート**: チームはデプロイ手前（PR・smoke 準備）まで。**本番反映・migration・課金/送信系は人間確認必須**（CLAUDE.md 人間確認ルール）

## 表示モード

- まず **in-process**（同一ターミナル、Shift+Down で teammate 巡回）から始める
- 慣れたら split panes（tmux / iTerm2）

## 将来の拡張（後回し）

- 「テスト緑じゃないと完了させない」を `TaskCompleted` hook で機械強制（現状未実装。人間ゲート運用で効果を見てから追加）
