/**
 * 業法独占キーワード検査 (v10.3 §10.9 F-2 反映)
 *
 * 税理士 / 社労士 / 行政書士 / 司法書士 / 弁護士 の業務独占範囲に
 * 抵触するキーワードを検出。Editor +5 高リスク判定で使う。
 */

export type BusinessLawCategory =
  | "tax_accountant"
  | "labor_consultant"
  | "administrative_scrivener"
  | "judicial_scrivener"
  | "lawyer";

export type BusinessLawFinding = {
  category: BusinessLawCategory;
  keyword: string;
  matched: string;
  start: number;
};

/**
 * 業務独占キーワード (各士業の独占業務に関する核心語)
 * 注意: 「税理士」「税理士業務」自体は OK (語る対象として)、
 * 「税務相談」「確定申告 代行」等の "ofmeton が代わりに行う" 文脈が NG
 */
const PATTERNS: Array<{ category: BusinessLawCategory; keyword: RegExp }> = [
  // 税理士業務独占
  { category: "tax_accountant", keyword: /税務(相談|代理|書類作成)/g },
  { category: "tax_accountant", keyword: /確定申告\s?(を\s?)?(代行|代理|代わりに)/g },
  { category: "tax_accountant", keyword: /AI\s?(で|が|に)?\s?(税務|確定申告|決算)\s?(できる|やる|代替)/g },

  // 社労士業務独占
  { category: "labor_consultant", keyword: /労務(相談|代理|管理\s?を\s?代行)/g },
  { category: "labor_consultant", keyword: /社会保険\s?(手続き)?\s?(代行|代理)/g },
  { category: "labor_consultant", keyword: /AI\s?(で|が)?\s?労務\s?(できる|やる|代替)/g },

  // 行政書士業務独占
  { category: "administrative_scrivener", keyword: /(許認可|官公署提出)\s?書類\s?作成\s?代行/g },
  { category: "administrative_scrivener", keyword: /AI\s?(で|が)?\s?(行政書士業務|許認可申請)\s?(代替)/g },

  // 司法書士業務独占
  { category: "judicial_scrivener", keyword: /登記\s?(申請|手続き)?\s?代行/g },
  { category: "judicial_scrivener", keyword: /AI\s?(で|が)?\s?登記\s?(代替|やる)/g },

  // 弁護士業務独占
  { category: "lawyer", keyword: /法律(相談|代理)/g },
  { category: "lawyer", keyword: /訴訟\s?(代理|代行)/g },
  { category: "lawyer", keyword: /契約書\s?作成\s?代行/g },
  { category: "lawyer", keyword: /AI\s?(で|が|だけ)?\s?(訴訟|裁判)\s?(できる|代替)/g },
];

export type BusinessLawCheckResult = {
  hasRisk: boolean;
  findings: BusinessLawFinding[];
  categories: BusinessLawCategory[];
};

/**
 * 業法独占キーワードを検査 (高リスク判定)
 */
export function checkBusinessLawRisk(text: string): BusinessLawCheckResult {
  const findings: BusinessLawFinding[] = [];
  const categorySet = new Set<BusinessLawCategory>();

  for (const { category, keyword } of PATTERNS) {
    const localRegex = new RegExp(keyword.source, keyword.flags);
    const matches = Array.from(text.matchAll(localRegex));
    for (const m of matches) {
      if (m.index === undefined) continue;
      findings.push({
        category,
        keyword: keyword.source,
        matched: m[0],
        start: m.index,
      });
      categorySet.add(category);
    }
  }

  return {
    hasRisk: findings.length > 0,
    findings,
    categories: Array.from(categorySet),
  };
}

/**
 * v10.3 §4.6.4 高リスク承認モード判定用ヘルパー
 *
 * post_drafts.business_law_risk_flag = checkBusinessLawRisk(body).hasRisk
 */
export function getBusinessLawRiskFlag(text: string): {
  flag: boolean;
  keywords: string[];
} {
  const r = checkBusinessLawRisk(text);
  return {
    flag: r.hasRisk,
    keywords: r.findings.map((f) => f.matched),
  };
}
