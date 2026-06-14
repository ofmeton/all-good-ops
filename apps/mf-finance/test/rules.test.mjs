// test/rules.test.mjs — scripts/lib/rules.mjs（マッチ・適用 純関数）のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRule, applyRulesToRows } from '../scripts/lib/rules.mjs';

test('matchRule: exact は trim 後の完全一致のみ', () => {
  const rule = { pattern: 'セブン－イレブン', match_type: 'exact' };
  assert.equal(matchRule(rule, 'セブン－イレブン'), true);
  assert.equal(matchRule(rule, '  セブン－イレブン  '), true); // 両側 trim
  assert.equal(matchRule(rule, 'セブン－イレブン 横浜店'), false); // 部分一致は不可
  assert.equal(matchRule(rule, 'ローソン'), false);
});

test('matchRule: contains は部分一致', () => {
  const rule = { pattern: 'ETC', match_type: 'contains' };
  assert.equal(matchRule(rule, 'ETC 関東支社'), true);
  assert.equal(matchRule(rule, '首都高 ETC利用分'), true);
  assert.equal(matchRule(rule, 'ガソリン'), false);
});

test('matchRule: 不正入力は不一致（空 pattern / null description / 未知 match_type）', () => {
  assert.equal(matchRule({ pattern: '', match_type: 'exact' }, 'なにか'), false);
  assert.equal(matchRule({ pattern: '  ', match_type: 'contains' }, 'なにか'), false);
  assert.equal(matchRule({ pattern: 'X', match_type: 'exact' }, null), false);
  assert.equal(matchRule({ pattern: 'X', match_type: 'exact' }, undefined), false);
  assert.equal(matchRule({ pattern: 'X', match_type: 'regex' }, 'X'), false);
  assert.equal(matchRule(null, 'X'), false);
});

test('applyRulesToRows: 先勝ち（最初にマッチしたルールを採用）', () => {
  const rules = [
    { id: 1, pattern: 'ファミリーマート', match_type: 'contains', classification: 'variable', category_major: '食費', category_middle: '食料品' },
    { id: 2, pattern: 'ファミリーマート 元町店', match_type: 'exact', classification: 'variable', category_major: '日用品', category_middle: '日用品' },
  ];
  const rows = [{ id: 'tx1', description: 'ファミリーマート 元町店' }];
  const result = applyRulesToRows(rules, rows);
  assert.equal(result.get('tx1').rule_id, 1); // 後段の exact より先頭の contains が勝つ
  assert.equal(result.get('tx1').category_major, '食費');
});

test('applyRulesToRows: 不一致行は結果に含まれない・欠損カテゴリは null 補完', () => {
  const rules = [
    { id: 1, pattern: '横浜銀行', match_type: 'exact', classification: 'internal' }, // category 無し
  ];
  const rows = [
    { id: 'a', description: '横浜銀行' },
    { id: 'b', description: 'まったく別の明細' },
    { id: 'c', description: null },
  ];
  const result = applyRulesToRows(rules, rows);
  assert.equal(result.size, 1);
  assert.deepEqual(result.get('a'), {
    rule_id: 1,
    classification: 'internal',
    category_major: null,
    category_middle: null,
  });
  assert.equal(result.has('b'), false);
  assert.equal(result.has('c'), false);
});
