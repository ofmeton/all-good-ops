/**
 * DLP (Data Loss Prevention) redaction utility
 *
 * v10.2 §10.7 公開許諾 gate の DLP redaction を実装。
 * 顧客名 / 社名 / メール / 電話 / 契約金額 / 契約日 等の PII / 機密情報を検出 → 置換。
 *
 * 使い方:
 *   import { redact, REDACTION_PATTERNS } from "./redact.ts";
 *   const { redactedText, findings } = redact(rawText);
 *
 * 設計方針 (Codex 10-1 反映):
 * - 規則ベース判定をベース、LLM judge は補助 (誤検知を減らす)
 * - 検出 → mask token に置換 ("__EMAIL_01__" "__PHONE_01__" "__MONEY_01__")
 * - findings 配列で「どこで何を redact したか」を返す
 */

export type RedactionCategory =
  | "email"
  | "phone"
  | "url"
  | "money_jpy"
  | "money_usd"
  | "date_iso"
  | "credit_card"
  | "japanese_address"
  | "client_name_signal"
  | "person_name_jp"
  | "company_name_jp"
  | "api_key_like"
  | "long_alphanum_id";

export type RedactionFinding = {
  category: RedactionCategory;
  matched: string;
  start: number;
  end: number;
  replacement: string;
  confidence: number;
};

export type RedactionResult = {
  redactedText: string;
  findings: RedactionFinding[];
  highRiskHits: number; // pii / client_confidential を示唆する hit 数
};

/**
 * パターン辞書 (正規表現ベース)
 * confidence: 0.5-1.0、信頼度低いものは LLM judge 後段で再評価
 */
export const REDACTION_PATTERNS: Array<{
  category: RedactionCategory;
  regex: RegExp;
  confidence: number;
  highRisk: boolean;
}> = [
  // email
  {
    category: "email",
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    confidence: 0.95,
    highRisk: true,
  },
  // 電話 (日本国内、形式: 03-1234-5678 / 090-1234-5678 / +81-90-...)
  {
    category: "phone",
    regex: /(?:\+81[-\s]?|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g,
    confidence: 0.85,
    highRisk: true,
  },
  // URL
  {
    category: "url",
    regex: /https?:\/\/[^\s)]+/g,
    confidence: 0.95,
    highRisk: false,
  },
  // 円金額 (3 桁区切り or 数字 + 円/万円/千万円)
  {
    category: "money_jpy",
    regex:
      /(¥|￥)?[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?(?:\s?(?:円|万円|千万円))?|\d{1,3}\s?(?:万円|千万円|億円)/g,
    confidence: 0.75,
    highRisk: true,
  },
  // ドル金額
  {
    category: "money_usd",
    regex: /\$\s?\d{1,3}(?:,?\d{3})*(?:\.\d+)?(?:\s?[kKmM])?/g,
    confidence: 0.8,
    highRisk: true,
  },
  // ISO 日付
  {
    category: "date_iso",
    regex: /\b(20\d{2})[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])\b/g,
    confidence: 0.6,
    highRisk: false,
  },
  // クレジットカード番号 (Luhn 検証はしない簡易版)
  {
    category: "credit_card",
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    confidence: 0.5,
    highRisk: true,
  },
  // 日本の住所 (都道府県 + 市区町村 + 番地まで)
  {
    category: "japanese_address",
    regex:
      /(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)[一-龯぀-ゟ゠-ヿ々\s0-9-]{2,40}/g,
    confidence: 0.85,
    highRisk: true,
  },
  // 「〇〇様」「〇〇さん」「〇〇社」「〇〇代表」など、固有名詞シグナル
  {
    category: "client_name_signal",
    regex: /[一-龯゠-ヿ][一-龯぀-ゟ゠-ヿ々]{1,8}\s?(?:様|さん|社|代表|社長|店長|オーナー|事務所|院長)/g,
    confidence: 0.7,
    highRisk: true,
  },
  // API key 風長い英数字 (32 文字以上)
  {
    category: "api_key_like",
    regex: /\b[a-zA-Z0-9_-]{32,}\b/g,
    confidence: 0.7,
    highRisk: true,
  },
  // 長い英数字 ID (Stripe sk_xxx 等、上の規則と重複する場合は ordering で吸収)
  {
    category: "long_alphanum_id",
    regex: /\b(?:sk|pk|api|token|key)_[a-zA-Z0-9_-]{12,}\b/g,
    confidence: 0.95,
    highRisk: true,
  },
];

/**
 * redact: テキストから PII / 機密情報を検出し、placeholder に置換
 */
export function redact(text: string): RedactionResult {
  const findings: RedactionFinding[] = [];
  const counters: Record<RedactionCategory, number> = {} as Record<RedactionCategory, number>;
  let redacted = text;
  let highRiskHits = 0;

  for (const { category, regex, confidence, highRisk } of REDACTION_PATTERNS) {
    const localRegex = new RegExp(regex.source, regex.flags);
    const matches = Array.from(text.matchAll(localRegex));
    for (const m of matches) {
      if (m.index === undefined) continue;
      counters[category] = (counters[category] ?? 0) + 1;
      const idx = counters[category];
      const replacement = `__${category.toUpperCase()}_${String(idx).padStart(2, "0")}__`;
      findings.push({
        category,
        matched: m[0],
        start: m.index,
        end: m.index + m[0].length,
        replacement,
        confidence,
      });
      if (highRisk) highRiskHits++;
    }
  }

  // ソート: end desc → 後方から replace
  findings.sort((a, b) => b.end - a.end);

  for (const f of findings) {
    redacted = redacted.slice(0, f.start) + f.replacement + redacted.slice(f.end);
  }

  return {
    redactedText: redacted,
    findings: findings.sort((a, b) => a.start - b.start),
    highRiskHits,
  };
}

/**
 * redactStrict: 高リスク (pii / client_confidential) hit が見つかった時、
 * "needs_consent" フラグを返す。Editor +5 ルールで使う。
 */
export function redactStrict(text: string): RedactionResult & { needsConsent: boolean } {
  const result = redact(text);
  return {
    ...result,
    needsConsent: result.highRiskHits > 0,
  };
}

/**
 * containsHighRisk: redacted_text に PII / 機密が "まだ残っているか" を検査。
 * Editor +5 で「DLP 通過後の draft」を最終確認するために使う。
 */
export function containsHighRisk(redactedText: string): boolean {
  for (const { regex, highRisk } of REDACTION_PATTERNS) {
    if (!highRisk) continue;
    const localRegex = new RegExp(regex.source, regex.flags);
    if (localRegex.test(redactedText)) return true;
  }
  return false;
}
