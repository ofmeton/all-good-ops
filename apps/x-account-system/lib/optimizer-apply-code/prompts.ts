import { ALLOWED_SSOT_FILES } from "./allowlist.ts";
import type { ProposalRow } from "./types.ts";

const ALLOWLIST_TEXT = ALLOWED_SSOT_FILES.map((f) => `- ${f}`).join("\n");

const COMMON_RULES = `
## 編集してよいファイル（これ以外への変更は自動 reject される）
${ALLOWLIST_TEXT}
（上記と同ディレクトリの *.test.ts の更新も可。テストの削除・弱体化は理由がない限り禁止）

## 絶対禁止
- guards.ts / FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / lib/editor/** / lib/ma/bootstrap-core.ts / migrations/** に触れること
- git push / gh / deploy 系コマンド（merge 権限は外側の runner が持つ）
- 提案に書かれていない変更を混ぜること（YAGNI）

## 作業手順
1. 提案を読み、対象ファイルを特定して最小の変更を行う
2. 挙動が変わる場合は対応する *.test.ts も更新する
3. apps/x-account-system で IN_MEMORY_FALLBACK=true npx jest <関連パス> と npx tsc -p src/tsconfig.json --noEmit を緑にする
4. git add <変更ファイルのみ> && git commit -m "auto-apply: <要約>"（push はしない）
このセッションは headless 自動実行。質問はできない。判断に迷う場合は何も変更せず「SKIP: 理由」とだけ出力して終了する。CLAUDE.md のセッション儀式（raw保存・ブランチ確認等）は無視してこのタスクのみ行う。`;

export function buildImplementerPrompt(p: ProposalRow): string {
  return `あなたは X 発信システムの implementer。以下の「人間が accept 済みの改善提案」を、このリポジトリの TS SSOT に最小差分で実装せよ。

## 提案
- id: ${p.id}
- type: ${p.proposal_type} / scope: ${p.scope} / rank: ${p.rank ?? "-"}
- hypothesis: ${p.hypothesis}
- evidence: ${JSON.stringify(p.evidence)}
${COMMON_RULES}`;
}

export function buildFixerPrompt(p: ProposalRow, reasons: string[]): string {
  return `あなたは X 発信システムの implementer。直前の自動適用コミットがレビュー/ゲートで却下された。却下理由を解消する修正を行い、再度 commit せよ（push 禁止）。

## 元の提案
- scope: ${p.scope} / hypothesis: ${p.hypothesis}

## 却下理由（これを全て解消すること）
${reasons.map((r) => `- ${r}`).join("\n")}
${COMMON_RULES}`;
}

export function buildReviewerPrompt(p: ProposalRow, diffText: string): string {
  return `あなたは敵対的コードレビュアー。以下の diff が「人間が accept した提案」を過不足なく実装しているか審査せよ。read-only。コードは変更しない。

## 提案
- type: ${p.proposal_type} / scope: ${p.scope}
- hypothesis: ${p.hypothesis}
- evidence: ${JSON.stringify(p.evidence)}

## 審査観点（1つでも該当すれば REJECT）
- 提案に無い変更が混ざっている / 提案の意図を実装できていない
- 安全劣化: テストの削除・assertion 弱体化に正当な理由がない
- TARGET_DEFINITION 等の共有定義の変更が、提案 scope を超えて他工程へ波及する
- prompt の品質劣化（誤字・論理破綻・既存の掟との矛盾）

## diff
\`\`\`diff
${diffText}
\`\`\`

## 出力（最終行にこの JSON のみ。他の形式は不可）
{"verdict":"APPROVE"|"REJECT","reasons":["..."]}`;
}
