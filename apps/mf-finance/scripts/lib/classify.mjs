// scripts/lib/classify.mjs
const INTERNAL_MAJORS = new Set(['現金・カード']);
const FIXED_MAJORS = new Set(['住宅','通信費','保険']);

export function isInternalMove(r) {
  return INTERNAL_MAJORS.has(r.category_major);
}

export function deriveClassification(r) {
  if (r.is_transfer) return 'transfer';
  if (isInternalMove(r)) return 'internal';
  if (r.amount > 0) return 'income';
  if (FIXED_MAJORS.has(r.category_major)) return 'fixed';
  if (r.category_major && r.category_major !== '未分類') return 'variable';
  return 'unknown';
}

// rules: [{ accountIncludes?, descIncludes?, sourceType }]
export function inferSourceType(r, rules = []) {
  for (const rule of rules) {
    if (rule.accountIncludes && r.account?.includes(rule.accountIncludes)) return rule.sourceType;
    if (rule.descIncludes && r.description?.includes(rule.descIncludes)) return rule.sourceType;
  }
  return r.amount > 0 ? 'other' : 'personal';
}
