---
type: concept
created: 2026-06-07
updated: 2026-06-07
related: [[dev/standards]], [[dev/agent-teams-playbook]], [[self/engineering-principles]]
tags: [subagent, dispatch, testing, jest, git, dev]
status: active
---

# サブエージェント dispatch playbook

実装系サブエージェント（`superpowers:subagent-driven-development` 等）に dispatch する時の prompt 設計・並列順序・検証の正本。
「DONE と報告したのに動かない」「rebase 連鎖」「混入事故」を dispatch 段階で潰すための型。
チーム運用の全体像は [[dev/agent-teams-playbook]]。

## 1. Self-Review Checklist に実行可能な検証コマンドを必ず含める

dispatch prompt の `Self-Review Checklist` に **実行可能な検証コマンドを 1 つ以上必須化**する。pytest だけ通って統合動作未確認、という「DONE だが動かない」パターンを防ぐ。

標準テンプレ 5 項目（該当しない時のみ削る運用）:

1. **shell script 系** → `zsh -c 'source <script> && echo $VAR_NAME'` で環境変数の値が想定通りか verify
2. **Playwright adapter / DOM 依存ロジック** → 既存 fixture HTML に bs4/grep でセレクタが見つかることを実測
3. **Python + shell の対話処理** → heredoc でなく**独立 .py ファイル**にして `python script.py` で呼ぶ（`input()` は heredoc では `EOFError`）
4. **構造化出力（LLM）** → `Partial<T>` 型 + 全フィールド fallback 経路を用意（schema 強制を信用しない）
5. **タイムゾーン依存クエリ** → SQL を実 DB で叩いて結果を verify

教訓: 2026-05-05 BSA Proposal Automation で subagent が「DONE」と報告したのに動かない事象が 3 件（env.sh の階層数間違い / Python heredoc の `input()` EOFError / Lancers DOM セレクタ推測 timeout）。いずれも検証コマンド欠落。

## 2. 実装者プロンプトの固定制約（毎回手書きせず埋め込む）

多タスクをサブエージェント駆動で回す時、以下を**固定で埋める**:

- 「**commit on the CURRENT branch（`<branch>`）。新ブランチを作るな**」（専用リポでも実装者が勝手に feature ブランチを切る事故が起きた）
- 「**`npm run build` / `npm test` / `npx tsc --noEmit` / `npx eslint .` を verify してから commit**」
- React 案件: 「**effect 内の同期 setState 禁止（`react-hooks/set-state-in-effect`）**。async IIFE で await 後に setState / event handler / useMemo を使う」
- Next.js: 「**公開画像は `next/image`**、`<img>` 直書きは lint error」
- 報告に **commit SHA** と各 verify 結果を必ず含めさせる

## 3. report に「現ブランチ / staged 残ファイル」を毎回入れさせる

git commit を伴う実装系 subagent の Report Format に、commit SHA だけでなく以下を必須化する。親側で複数 subagent を順次走らせると、いつブランチが切り替わったか・どこに staged 残があるかが見えなくなり、混入事故の予兆を見逃す。

```
- **Current branch:** `git branch --show-current` の出力
- **Staged remaining:** `git diff --cached --stat` の出力（空なら "(none)"）
```

## 4. ts-jest CommonJS NG list を constraints に固定埋込

package.json に `"type": "module"` を採用した TypeScript + jest + ts-jest プロジェクトでは、subagent が ESM patterns を持ち込むと jest が compile error で fail する。実装 prompt の Constraints に必ず固定埋込:

```
## Constraints (CommonJS / jest 互換)
- `import.meta.*` 禁止 → CLI 起動判定は `require.main === module`
- test ファイルで `__dirname` を再定義しない (既存 global を利用)
- `jest.config.js` ではなく **`jest.config.cjs`** を最初から作る (`module.exports = ...`)
- `ts-node` 使わない、`tsx` を使う
```

詳細:
- `import.meta.url` → `SyntaxError: Cannot use 'import.meta' outside a module`。CLI 起動判定は `typeof require !== "undefined" && typeof module !== "undefined" && require.main === module`
- `const __dirname = dirname(fileURLToPath(import.meta.url))` → CJS では `__dirname` が既に global、再定義で `Identifier '__dirname' has already been declared`。そのまま `__dirname` を使う
- `jest.config.js` → `"type": "module"` 下では ESM 扱いで `module is not defined in ES module scope`。`jest.config.cjs` で `module.exports = { preset: 'ts-jest', testEnvironment: 'node', testMatch: ['**/*.test.ts'] }`
- `ts-node` → Node v24+ で silent exit=0 で破綻。`tsx` を使う

教訓: PR-D 実装で subagent が `import.meta.url` と `__dirname` 再定義を test に書き、test suite 2 件が compile error。main session が手作業で fix。

## 5. 並列 dispatch は shared file 変更を直列化（rebase 連鎖回避）

複数 subagent を並列 bg dispatch する場合、各々が同じ shared file（典型: `apps/<app>/package.json` の scripts、`package-lock.json`）を変更すると merge 順序次第で rebase conflict が必ず発生する。

判断 framework — 実装計画時に各 PR が touch する file を予測:
```bash
grep -l "package.json" <sub-agent-prompts>
```
2 個以上が package.json 変更計画なら**直列（or Option A）**、1 個以下なら**並列 OK**。

対応オプション:
- **A（推奨）**: 最初の同 file 変更 PR を main merge → 残りを並列 dispatch
- **B**: file 分離（各 PR が独自 file に scripts entry。現実的にはやりすぎ）
- **C**: 集約 PR（jest 設定 + 全 scripts entry を最初に merge → 個別実装 PR は package.json を触らない）

worktree チーム運用では implementer 最大 2 名・**ファイル領域を分担**し、`package.json` 等共有ファイルは 1 人に集約 → [[dev/agent-teams-playbook]]。

教訓: 2026-05-27 Phase 0.5 で PR-A〜PR-E を 5 並列 dispatch、全部 package.json scripts 追加 → PR-C/PR-D で rebase conflict 連鎖（PR-C 約 5 分 detour）。
