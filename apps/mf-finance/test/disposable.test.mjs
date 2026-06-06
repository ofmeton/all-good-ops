// test/disposable.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMonthlyDisposable } from '../scripts/lib/disposable.mjs';

const t = (date, amount, classification, description='') =>
  ({ date, amount, classification, description, is_transfer: classification==='transfer', is_internal_move: classification==='internal', included:true });

test('可処分とあと使えるを算出（定期収入見込＋スポット − 固定 − 変動実績）', () => {
  const txs = [
    t('2026-05-25', 200000, 'income', '案件報酬'),   // 定期収入に一致
    t('2026-05-10', 30000, 'income', '臨時'),         // スポット着金
    t('2026-05-11', -2520, 'fixed', 'アクサ保険'),     // 固定費(変動費から除外)
    t('2026-05-12', -5000, 'variable', '外食'),        // 変動費実績
    t('2026-05-13', -10000, 'internal', 'ATM引出'),    // 内部移動(除外)
    t('2026-05-14', -3000, 'transfer', '振替'),        // 振替(除外)
  ];
  const recurring = [
    { kind:'income', name:'案件報酬', amount:200000, active:true },
    { kind:'expense', name:'アクサ保険', amount:2520, active:true },
  ];
  const r = computeMonthlyDisposable(txs, recurring, { year:2026, month:5 });
  assert.equal(r.incomeRecurring, 200000);
  assert.equal(r.incomeSpot, 30000);
  assert.equal(r.incomeTotal, 230000);
  assert.equal(r.fixed, 2520);
  assert.equal(r.variableActual, 5000);
  assert.equal(r.disposableBudget, 227480); // 230000 - 2520
  assert.equal(r.remaining, 222480);         // 227480 - 5000
});
