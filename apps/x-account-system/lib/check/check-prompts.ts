/**
 * lib/check/check-prompts.ts — チェックAg(MA checker) の判断系レバー。
 * 点検の rubric（重複＋ファクト）と submit_check の出力契約はここを編集する。
 *
 * 方針（ユーザー明確化・完全 soft）:
 *   - block しない＝必ず人間に渡る前提で、問題を日本語で簡潔に flag するだけ。
 *   - 重複: ネタ（主題/具体内容）の重複のみ flag（言い回し違いは許容）。
 *   - ファクト: 完全な嘘・明らかにおかしい数字のみ flag。誇張は許容・出典不要。
 *     調べても不明なら『要確認』flag を付けて通す（弾かない）。
 */

/** submit_check tool（checker の出力契約）。最後に必ず呼ばせる。 */
export const SUBMIT_CHECK_TOOL = {
  type: "custom" as const,
  name: "submit_check",
  description:
    "点検結果を提出する。重複・ファクトの判定と、人間が一目で分かる日本語の flag を渡すこと。これを呼んだら作業終了。",
  input_schema: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["ok", "flag"],
        description: "総合判定。問題が1つでもあれば flag、無ければ ok。",
      },
      risk_level: {
        type: "string",
        enum: ["low", "high"],
        description: "人間が注意して見るべき度合い。重複疑い・嘘疑いがあれば high。",
      },
      duplicate: {
        type: "string",
        enum: ["ok", "similar"],
        description: "直近投稿との重複。ネタ（主題/具体内容）が被れば similar。",
      },
      factcheck: {
        type: "string",
        enum: ["ok", "suspicious", "unverifiable"],
        description: "ファクト判定。完全な嘘/明らかに変な数字=suspicious、調べても不明=unverifiable、妥当=ok。",
      },
      flags: {
        type: "array",
        items: { type: "string" },
        description: "人間向けの日本語・簡潔な指摘。問題なければ空配列。",
      },
    },
    required: ["verdict", "risk_level", "duplicate", "factcheck"],
    additionalProperties: false,
  },
};

/** 点検 system prompt（重複＋ファクトの嘘フィルタ・完全 soft）。 */
export function buildCheckSystemPrompt(): string {
  return `あなたは X 投稿ドラフトの「チェックエージェント」です。1 本のドラフトについて、**重複**と**ファクト**だけを点検します。

## 大原則（必ず守る）
- **何も block しません**。あなたの判定後、ドラフトは必ず人間の承認に回ります。あなたの役割は、人間が一目で気づけるよう問題を日本語で簡潔に flag するだけです。
- 迷ったら通す（flag を付けて通す）。弾かない。

## ① 重複チェック
- 渡された『直近の投稿』と、ドラフトの**主題/具体内容**が被っていれば flag（duplicate=similar）。
- **言い回しの違いは許容**。ネタ（同じトピック・同じ切り口）の重複のみを見る。
- 例: 「直近投稿と内容が重複気味（同じ〇〇の話）」。

## ② ファクトチェック（＝嘘フィルタ）
- web_search / web_fetch で、本文の主要な事実・固有名詞・数字を確認する。
- **flag するのは「完全な嘘」「明らかにおかしい数字」だけ**（factcheck=suspicious）。例:「『〇〇が無料化』は事実と異なる可能性」。
- **誇張は許容。数字の出典は不要**。妥当そうなら ok。
- **調べても確認できない数字/主張は『要確認』flag を付けて通す**（factcheck=unverifiable、弾かない）。例:「『導入社数1万社』を確認できず（要確認）」。

## 出力
- flags は日本語・簡潔・人間が一目で分かる粒度。
- 問題が無ければ flags は空配列、verdict=ok、duplicate=ok、factcheck=ok。
- 問題があれば verdict=flag とし、該当する flag を入れる。重複疑い・嘘疑いがあれば risk_level=high。
- 最後に **必ず submit_check を呼んで**提出する。`;
}
