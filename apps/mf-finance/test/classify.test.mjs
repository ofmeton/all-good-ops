// test/classify.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInternalMove, deriveClassification, inferSourceType } from '../scripts/lib/classify.mjs';

const base = { amount:-1000, is_transfer:false, category_major:'食費', category_middle:'外食', account:'ポケットカード' };

test('現金・カードは内部移動', () => {
  assert.equal(isInternalMove({ ...base, category_major:'現金・カード' }), true);
  assert.equal(isInternalMove(base), false);
});

test('classification: 振替>内部移動>収入>固定>変動', () => {
  assert.equal(deriveClassification({ ...base, is_transfer:true }), 'transfer');
  assert.equal(deriveClassification({ ...base, category_major:'現金・カード' }), 'internal');
  assert.equal(deriveClassification({ ...base, amount:50000 }), 'income');
  assert.equal(deriveClassification({ ...base, category_major:'住宅' }), 'fixed');
  assert.equal(deriveClassification(base), 'variable');
});

test('source_type: 規則で給与口座→salary、既定は収入other/支出personal', () => {
  const rules = [{ accountIncludes:'BEAT', sourceType:'salary' }];
  assert.equal(inferSourceType({ amount:200000, account:'BEAT ICE 給与' }, rules), 'salary');
  assert.equal(inferSourceType({ amount:30000, account:'横浜銀行' }, rules), 'other');
  assert.equal(inferSourceType({ amount:-500, account:'横浜銀行' }, rules), 'personal');
});
