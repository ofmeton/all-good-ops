// scripts/lib/rules.mjs — category_rules のマッチ・適用 純関数（テスト対象）。
// LLM の分類判断は category_rules に永続化され（SSOT=ルール）、
// transactions への反映はこのモジュールを使う apply-rules.mjs / reapplyRules() が機械的に行う。

/**
 * 単一ルールが description にマッチするか判定する。
 * - match_type 'exact'   : trim 後の完全一致
 * - match_type 'contains': 部分一致
 * - 上記以外の match_type / 空 pattern / 空 description は不一致
 * @param {{pattern: string, match_type: string}} rule
 * @param {string | null | undefined} description
 * @returns {boolean}
 */
export function matchRule(rule, description) {
  if (!rule || typeof rule.pattern !== 'string') return false;
  const pattern = rule.pattern.trim();
  if (pattern.length === 0) return false;
  if (typeof description !== 'string') return false;
  const desc = description.trim();
  if (desc.length === 0) return false;

  if (rule.match_type === 'exact') return desc === pattern;
  if (rule.match_type === 'contains') return desc.includes(pattern);
  return false;
}

/**
 * ルール集合を行集合へ適用した結果（id → 更新内容）を返す純関数。DB には触れない。
 * 先勝ち: rules の並び順（呼び出し側が created_at 順で渡す）で最初にマッチしたルールを採用。
 * @param {Array<{id?: number, pattern: string, match_type: string,
 *   classification: string | null, category_major: string | null, category_middle: string | null}>} rules
 * @param {Array<{id: string, description: string | null}>} rows
 * @returns {Map<string, {rule_id: number | undefined, classification: string | null,
 *   category_major: string | null, category_middle: string | null}>}
 */
export function applyRulesToRows(rules, rows) {
  const result = new Map();
  for (const row of rows) {
    for (const rule of rules) {
      if (matchRule(rule, row.description)) {
        result.set(row.id, {
          rule_id: rule.id,
          classification: rule.classification ?? null,
          category_major: rule.category_major ?? null,
          category_middle: rule.category_middle ?? null,
        });
        break; // 先勝ち
      }
    }
  }
  return result;
}
