// lib/optimizer/detect.mjs — Optimizer 下層シグナルの純関数（DB 非依存・副作用なし）。
// テスト対象（test/optimizer-detect.test.mjs）。DB アクセスは signals.ts が担い、
// ここには「行の配列 → 検出結果の配列」の決定的ロジックのみ置く。
import { matchRule } from '../../scripts/lib/rules.mjs';

/**
 * 2 つの日付（'YYYY-MM-DD'）が ±N 日以内かを判定する。
 * @param {string} d1
 * @param {string} d2
 * @param {number} maxDays
 * @returns {boolean}
 */
function withinDays(d1, d2, maxDays) {
  const t1 = Date.parse(`${d1}T00:00:00Z`);
  const t2 = Date.parse(`${d2}T00:00:00Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return false;
  const diffDays = Math.abs(t1 - t2) / 86_400_000;
  return diffDays <= maxDays;
}

/**
 * 振替ペア候補を検出する。
 * 条件: 同日 ±1 日 / 反対符号 / 絶対値同額（≠0）/ 別 account /
 *       どちらも classification !== 'transfer'。
 * 1 取引は最大 1 ペアまで（貪欲・date→id の決定的順で先勝ち）。
 * @param {Array<{id: string, date: string, amount: number, account: string|null, classification: string|null}>} rows
 * @returns {Array<{a_id: string, b_id: string, amount: number, date: string}>}
 *   amount は絶対値、date は a 側の日付。
 */
export function pairTransfers(rows) {
  // 決定的な走査順を作る（date 昇順 → id 昇順）。入力配列は破壊しない。
  const ordered = [...rows].sort((x, y) =>
    x.date === y.date ? String(x.id).localeCompare(String(y.id)) : x.date < y.date ? -1 : 1,
  );
  const used = new Set();
  const pairs = [];

  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    if (used.has(a.id)) continue;
    if (a.classification === 'transfer') continue;
    if (typeof a.amount !== 'number' || a.amount === 0) continue;

    for (let j = i + 1; j < ordered.length; j++) {
      const b = ordered[j];
      if (used.has(b.id)) continue;
      if (b.classification === 'transfer') continue;
      if (a.account === b.account) continue; // 別 account 必須
      if (a.amount !== -b.amount) continue; // 反対符号 かつ 絶対値同額
      if (!withinDays(a.date, b.date, 1)) continue;

      pairs.push({ a_id: a.id, b_id: b.id, amount: Math.abs(a.amount), date: a.date });
      used.add(a.id);
      used.add(b.id);
      break; // a は 1 ペアで確定（貪欲）
    }
  }
  return pairs;
}

/**
 * 多数決の分類を返す（null/空は票に含めない）。タイは分類名の昇順で決定的に決める。
 * @param {Array<string|null|undefined>} classifications
 * @returns {{ majority: string|null, total: number }}
 *   total は有効票数。majority は最頻分類（有効票が無ければ null）。
 */
function majorityClassification(classifications) {
  const counts = new Map();
  let total = 0;
  for (const c of classifications) {
    if (typeof c !== 'string') continue;
    const v = c.trim();
    if (v.length === 0) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
    total += 1;
  }
  let majority = null;
  let best = -1;
  for (const [cls, n] of counts) {
    if (n > best || (n === best && (majority === null || cls < majority))) {
      best = n;
      majority = cls;
    }
  }
  return { majority, total };
}

/**
 * ルールと実データの分類が多数決で食い違うものを検出する。
 * 各ルールについて pattern 一致する取引群の実 classification の多数決を取り、
 * ルールの classification と異なれば矛盾として返す。
 * @param {Array<{id: number, pattern: string, match_type: string, classification: string|null}>} rules
 * @param {Array<{description: string|null, classification: string|null}>} rows
 * @returns {Array<{rule_id: number, expected: string|null, actual_majority: string, sample_count: number}>}
 */
export function ruleConflicts(rules, rows) {
  const conflicts = [];
  for (const rule of rules) {
    const matched = rows.filter((r) => matchRule(rule, r.description));
    if (matched.length === 0) continue;
    const { majority, total } = majorityClassification(matched.map((r) => r.classification));
    if (majority === null) continue; // 有効票なし＝矛盾と断定しない
    const expected = typeof rule.classification === 'string' ? rule.classification : null;
    if (majority !== expected) {
      conflicts.push({
        rule_id: rule.id,
        expected,
        actual_majority: majority,
        sample_count: total,
      });
    }
  }
  return conflicts;
}

/**
 * 同一 description（trim）が複数の classification にまたがる group を検出する。
 * null/空の description・null/空の classification は票に含めない。
 * @param {Array<{description: string|null, classification: string|null}>} rows
 * @returns {Array<{description: string, classifications: string[], counts: Record<string, number>}>}
 *   classifications は昇順・distinct。counts は分類→件数。
 */
export function labelInconsistencies(rows) {
  /** @type {Map<string, Map<string, number>>} */
  const byDesc = new Map();
  for (const r of rows) {
    if (typeof r.description !== 'string') continue;
    const desc = r.description.trim();
    if (desc.length === 0) continue;
    if (typeof r.classification !== 'string') continue;
    const cls = r.classification.trim();
    if (cls.length === 0) continue;

    let m = byDesc.get(desc);
    if (!m) {
      m = new Map();
      byDesc.set(desc, m);
    }
    m.set(cls, (m.get(cls) ?? 0) + 1);
  }

  const result = [];
  for (const [description, m] of byDesc) {
    if (m.size < 2) continue; // 単一分類は一貫＝対象外
    const classifications = [...m.keys()].sort((a, b) => a.localeCompare(b));
    /** @type {Record<string, number>} */
    const counts = {};
    for (const cls of classifications) counts[cls] = m.get(cls);
    result.push({ description, classifications, counts });
  }
  // 件数の多い順 → description 昇順 で決定的に並べる。
  result.sort((a, b) => {
    const sa = Object.values(a.counts).reduce((s, n) => s + n, 0);
    const sb = Object.values(b.counts).reduce((s, n) => s + n, 0);
    return sb - sa || a.description.localeCompare(b.description);
  });
  return result;
}
