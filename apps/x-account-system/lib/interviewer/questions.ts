/**
 * Question pattern library (PR-D)
 *
 * SSoT: main-design-all-versions.md §6.2.4 質問パターン 8 種類 + §6.2.5 LINE 完結方式
 *
 * 業種別キーワード注入 (v10.3 C-2) は industryKeywords で実現。
 * pattern_id は materials_store.meta.pattern_id 経由でログに残し、後で
 * Optimizer が pattern × 業種 × 成果 の対応関係を学習する想定。
 */
import type { Industry, PatternId, Question, StepName } from "./types.ts";

/**
 * 業種別キーワード辞書 (v10.3 C-2 反映)
 * 業種特有の "ささる" 用語を kickoff 質問に差し込む。
 */
export const industryKeywords: Record<Industry, string[]> = {
  rice_cream: ["在庫管理", "レジ締め", "シフト", "発注", "売上日報", "棚卸し"],
  tutoring: ["授業準備", "教材作成", "進捗管理", "保護者連絡", "テスト分析"],
  minpaku: ["清掃手配", "リネン在庫", "ゲスト対応", "鍵管理", "OTA 同期"],
  web_production: ["要件ヒアリング", "デザインレビュー", "コーディング", "納品物管理"],
  ai_automation: ["業務フロー", "プロンプト整備", "Claude 連携", "自動化スクリプト"],
  generic: ["業務効率化", "事務作業", "情報整理"],
};

/**
 * Step ごとの代表 pattern。
 * Step 1: kickoff = quick_recap (業種別ワード注入)
 * Step 2: dig_attempt = failure_recall / tool_drill (どちらか rotate)
 * Step 3: dig_metrics = metrics_quant / time_pressure (rotate)
 * Step 4: consent_gate = client_redact + consent_explicit
 * Step 5: closure = details_dig (投稿予定日確認)
 */
export function pickPattern(step: StepName, turn: number): PatternId {
  switch (step) {
    case "kickoff":
      return "quick_recap";
    case "dig_attempt":
      return turn % 2 === 0 ? "failure_recall" : "tool_drill";
    case "dig_metrics":
      return turn % 2 === 0 ? "metrics_quant" : "time_pressure";
    case "consent_gate":
      // turn=0 で client_redact 確認, turn>=1 で consent_explicit
      return turn === 0 ? "client_redact" : "consent_explicit";
    case "closure":
      return "details_dig";
  }
}

/**
 * pattern_id + industry + topic から LINE 送信用 text を生成。
 * Phase 0.5 では LLM 呼ばずテンプレ。Phase 1+ で Claude Sonnet 4.6 に bullet 提案。
 */
export function renderQuestion(
  step: StepName,
  pattern_id: PatternId,
  industry: Industry,
  topic: string,
): Question {
  const kw = industryKeywords[industry] ?? industryKeywords.generic;
  const kwHint = kw.slice(0, 3).join("・");

  const templates: Record<PatternId, () => { text: string; expects: Question["expects"] }> = {
    quick_recap: () => ({
      text: `📝 今日の振り返り、行きましょう。\n\nテーマ: 「${topic}」\nこの業務 (${kwHint} あたり) で、今週やってみたことを 2-3 行で教えてください。`,
      expects: "free_text",
    }),

    failure_recall: () => ({
      text: `その中で「うまくいかなかった」「想定外だった」シーンはありましたか？\n失敗談を 1 つだけ具体的に教えてください (時系列でも OK)。`,
      expects: "free_text",
    }),

    tool_drill: () => ({
      text: `そのとき、どのツール / プロンプトを試しましたか？\n(例: Claude / ChatGPT / Notion / 手作業 / etc)`,
      expects: "free_text",
    }),

    metrics_quant: () => ({
      text: `Before / After を数字で言うと、どうなりましたか？\n例: 「3 時間 → 30 分」「月 5 件 → 月 20 件」など、ざっくりで OK です。`,
      expects: "number_or_period",
    }),

    time_pressure: () => ({
      text: `この業務、これまで月にどれくらい時間使っていましたか？\n今は何時間 / 何分くらい？ (推定で OK)`,
      expects: "number_or_period",
    }),

    client_redact: () => ({
      text: `この話を投稿に使う場合、クライアント名 / 個人名は伏せても文脈伝わりますか？\n(伏せ字 OK / NG どちらか)`,
      expects: "yes_no",
    }),

    consent_explicit: () => ({
      text: `投稿として公開して問題ないか、最終確認です。\n「はい」「いいえ」で答えてください。\n(はい = 公開許諾、いいえ = 内部メモのみ)`,
      expects: "consent_yes_no",
    }),

    details_dig: () => ({
      text: `ありがとうございます。投稿予定日を決めましょう。\n例: 「明日朝」「今週金曜」「2026-06-01」などで返してください。`,
      expects: "free_text",
    }),
  };

  const tpl = templates[pattern_id]();
  return {
    step,
    pattern_id,
    text: tpl.text,
    expects: tpl.expects,
  };
}

/**
 * 公開許諾 yes/no parser (consent_explicit 専用).
 * 「はい」「OK」「yes」「公開して」等を granted、それ以外を denied 寄りに。
 * 曖昧表現は denied 側にフェイルセーフ。
 */
export function parseConsent(answerText: string): "granted" | "denied" {
  const yesRe = /^(はい|yes|y|ok|オーケー|公開|どうぞ|お願いします|問題ない|大丈夫)/i;
  const noRe = /(いいえ|no|n|ng|やめて|まだ|内部のみ|非公開|だめ|ダメ)/i;
  const t = answerText.trim();
  if (noRe.test(t)) return "denied";
  if (yesRe.test(t)) return "granted";
  // 曖昧時は denied (フェイルセーフ)
  return "denied";
}
