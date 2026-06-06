// test/recurring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRecurring } from '../scripts/lib/recurring.mjs';

const tx = (date, amount, description) => ({ date, amount, description, is_transfer:false });

test('3ヶ月連続・同名・近似額を固定費候補に', () => {
  const txs = [
    tx('2026-03-11', -2520, 'アクサダイレクト 自動車保険 月次'),
    tx('2026-04-11', -2520, 'アクサダイレクト 自動車保険 月次'),
    tx('2026-05-11', -2530, 'アクサダイレクト 自動車保険 月次'),
  ];
  const c = detectRecurring(txs, { minMonths: 3, amountTolerance: 0.15 });
  assert.equal(c.length, 1);
  assert.equal(c[0].kind, 'expense');
  assert.equal(c[0].monthsSeen, 3);
  assert.equal(c[0].day, 11);
  assert.ok(Math.abs(c[0].amountAvg - (-2523)) < 2);
});

test('単発・月数不足は候補にしない / 収入はkind=income', () => {
  const txs = [
    tx('2026-05-27', -911, 'CLOUDFLARE'),
    tx('2026-03-25', 200000, '案件報酬'),
    tx('2026-04-25', 200000, '案件報酬'),
    tx('2026-05-25', 200000, '案件報酬'),
  ];
  const c = detectRecurring(txs, { minMonths: 3, amountTolerance: 0.15 });
  assert.equal(c.length, 1);
  assert.equal(c[0].kind, 'income');
  assert.equal(c[0].name, '案件報酬');
});
